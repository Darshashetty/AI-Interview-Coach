import type { VercelRequest, VercelResponse } from '@vercel/node'
import fetch from 'node-fetch'

// Vercel serverless function to analyze transcript using OpenAI (or local heuristics)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { transcript, duration } = (req as any).body || {}
  if (!transcript) return res.status(400).json({ error: 'transcript required' })

  // Basic local heuristics to compute core metrics so we can return a well-formed object
  const clean = transcript.replace(/[\n\r]+/g, ' ').trim()
  const words: string[] = clean.length === 0 ? [] : clean.split(/\s+/)
  const totalWords = words.length
  const durSeconds = typeof duration === 'number' && duration > 0 ? duration : Math.max(1, Math.round((words.length / 150) * 60))
  const wordsPerMinute = durSeconds > 0 ? Math.round((totalWords / durSeconds) * 60) : 0

  const fillerList = ['um','uh','like','you know','so','actually','basically','right','i mean']
  const lower = clean.toLowerCase()
  const fillerCounts: Record<string, number> = {}
  fillerList.forEach(f => { fillerCounts[f] = 0 })
  fillerList.forEach(f => {
    const re = new RegExp(`\\b${f.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi')
    const matches = (lower.match(re) || [])
    fillerCounts[f] = matches.length
  })
  const fillerWords = Object.keys(fillerCounts).filter(k => fillerCounts[k] > 0).map(k => ({ word: k, count: fillerCounts[k] }))
  const totalFillerCount = Object.values(fillerCounts).reduce((a,b) => a + b, 0)

  const uniqueWords = new Set(words.map((w: string) => w.toLowerCase().replace(/[^a-zA-Z']/g, ''))).size
  const vocabularyRichness = totalWords > 0 ? Math.round((uniqueWords / totalWords) * 100) : 0

  const sentences = clean.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean)
  const averageSentenceLength = sentences.length ? +(totalWords / sentences.length).toFixed(1) : totalWords

  // simple repetition detection
  const freq: Record<string, number> = {}
  words.forEach((w: string) => {
    const key = w.toLowerCase().replace(/[^a-zA-Z']/g, '')
    if (!key) return
    freq[key] = (freq[key] || 0) + 1
  })
  const wordRepetitions = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,10).map(([word,count]) => ({ word, count }))

  // baseline object
  const baseResult = {
    transcript: clean,
    wordsPerMinute,
    fillerWords,
    totalFillerCount,
    vocabularyRichness,
    uniqueWords,
    totalWords,
    sentimentScore: 0,
    sentimentLabel: 'Neutral',
    duration: durSeconds,
    // normalized 0..1
    clarityScore: Math.min(1, vocabularyRichness / 100),
    // normalized 0..1
    confidenceScore: 0.5,
    wordRepetitions,
    averageSentenceLength,
    pacingTimeline: [] as any[],
    // scoring fields
    scoringBreakdown: {} as any,
    overallScore: 0,
    suggestions: [] as string[],
  }

  const apiKey = process.env.OPENAI_API_KEY
  try {
    if (apiKey) {
      // Ask OpenAI for richer sentiment/tone and suggestions, but always return the baseline merged result
      const prompt = `You are an assistant that analyzes a transcript. Given the transcript below, return a JSON object (only JSON) with keys: sentimentScore (number -1..1), sentimentLabel (Very Positive/Positive/Neutral/Slightly Negative/Negative), tone (short phrase), suggestions (array of short improvement tips), clarityScore (0..1), confidenceScore (0..1). Transcript:\n\n${clean}`

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
      })

      if (resp.ok) {
        const data = await resp.json()
        const content = data.choices?.[0]?.message?.content || ''
        try {
          const first = content.indexOf('{')
          const jsonText = first >= 0 ? content.slice(first) : content
          const parsed = JSON.parse(jsonText)

          // Map parsed fields into our result shape
          // merge OpenAI augmentation but keep our computed scoring if present
          const merged = {
            ...baseResult,
            sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : baseResult.sentimentScore,
            sentimentLabel: parsed.sentimentLabel || baseResult.sentimentLabel,
            clarityScore: typeof parsed.clarityScore === 'number' ? parsed.clarityScore : baseResult.clarityScore,
            confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : baseResult.confidenceScore,
            suggestions: parsed.suggestions || parsed.tips || baseResult.suggestions,
            tone: parsed.tone || null,
          }

          // Compute final overall score and breakdown (allow OpenAI to influence suggestions but keep numeric scoring)
          const final = computeScoring(merged)
          return res.status(200).json(final)
        } catch (e) {
          // If OpenAI response couldn't be parsed, return baseline
          console.warn('openai parse failed, returning baseline', e)
          const scored = computeScoring(baseResult)
          return res.status(200).json(scored)
        }
      } else {
        const txt = await resp.text()
        console.error('openai analyze failed', resp.status, txt)
        // return baseline with scoring
        const scored = computeScoring(baseResult)
        return res.status(200).json(scored)
      }
    } else {
      // No API key — return baseline heuristic result with scoring
      const scored = computeScoring(baseResult)
      return res.status(200).json(scored)
    }
  } catch (err: any) {
    console.error('analyze error', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

// scoring utility: compute sub-scores and weighted overall score (0..100)
function computeScoring(result: any) {
  const out = { ...result }

  const wpm = typeof out.wordsPerMinute === 'number' ? out.wordsPerMinute : 0
  const totalFiller = typeof out.totalFillerCount === 'number' ? out.totalFillerCount : 0
  const vocab = typeof out.vocabularyRichness === 'number' ? out.vocabularyRichness : 0 // 0..100
  const clarity = typeof out.clarityScore === 'number' ? out.clarityScore : Math.min(1, vocab / 100)
  const confidence = typeof out.confidenceScore === 'number' ? out.confidenceScore : 0.5
  const avgSentLen = typeof out.averageSentenceLength === 'number' ? out.averageSentenceLength : 0
  const totalWords = typeof out.totalWords === 'number' && out.totalWords > 0 ? out.totalWords : 1

  // WPM score: ideal around 130 wpm (range 100-160)
  const wpmScore = Math.max(0, 1 - Math.min(1, Math.abs(wpm - 130) / 60)) * 100

  // filler score: 0 filler -> 100, >10 fillers -> 0
  const fillerScore = Math.max(0, 1 - Math.min(1, totalFiller / 10)) * 100

  // vocab score uses vocabularyRichness directly (0..100)
  const vocabScore = Math.max(0, Math.min(100, vocab))

  // clarityScore is normalized 0..1 -> convert to 0..100
  const clarityScore = Math.max(0, Math.min(100, clarity * 100))

  // confidenceScore normalized 0..1 -> 0..100
  const confidenceScore = Math.max(0, Math.min(100, confidence * 100))

  // small penalty for very long sentences
  const sentencePenalty = Math.max(0, (avgSentLen - 25) / 25) // 0..inf

  // weighted overall: wpm 25%, filler 20%, vocab 20%, clarity 20%, confidence 15%
  const overall = Math.round(
    wpmScore * 0.25 +
    fillerScore * 0.2 +
    vocabScore * 0.2 +
    clarityScore * 0.2 +
    confidenceScore * 0.15 -
    Math.min(10, sentencePenalty * 10) // small subtraction up to 10 points
  )

  const suggestions = Array.isArray(out.suggestions) ? [...out.suggestions] : []
  // heuristic suggestions
  if (totalFiller > 2) suggestions.push(`Reduce filler words — heard ${totalFiller} times.`)
  if (wpm < 100) suggestions.push(`Try increasing pace: current ${wpm} WPM; aim for 110-160 WPM.`)
  if (wpm > 170) suggestions.push(`Try slowing down a bit: current ${wpm} WPM.`)
  if (vocab < 40) suggestions.push('Work on varied vocabulary to improve richness.')
  if (avgSentLen > 25) suggestions.push('Use shorter sentences to improve clarity.')

  out.scoringBreakdown = {
    wpmScore: Math.round(wpmScore),
    fillerScore: Math.round(fillerScore),
    vocabScore: Math.round(vocabScore),
    clarityScore: Math.round(clarityScore),
    confidenceScore: Math.round(confidenceScore),
  }
  out.overallScore = Math.max(0, Math.min(100, overall))
  out.suggestions = suggestions
  out.clarityScore = Math.min(1, clarity)
  out.confidenceScore = Math.min(1, confidence)

  // ensure sentiment label exists
  if (!out.sentimentLabel) {
    if (typeof out.sentimentScore === 'number') {
      const s = out.sentimentScore
      out.sentimentLabel = s >= 0.6 ? 'Very Positive' : s >= 0.2 ? 'Positive' : s > -0.2 ? 'Neutral' : s > -0.6 ? 'Negative' : 'Very Negative'
    } else {
      out.sentimentLabel = 'Neutral'
    }
  }

  return out
}
