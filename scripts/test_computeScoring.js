// Simple unit test for computeScoring logic (node script)
const assert = require('assert');

// copy of computeScoring from api/analyze.ts simplified for test
function computeScoring(out) {
  const wpm = typeof out.wordsPerMinute === 'number' ? out.wordsPerMinute : 0
  const totalFiller = typeof out.totalFillerCount === 'number' ? out.totalFillerCount : 0
  const vocab = typeof out.vocabularyRichness === 'number' ? out.vocabularyRichness : 0
  const clarity = typeof out.clarityScore === 'number' ? out.clarityScore : Math.min(1, vocab / 100)
  const confidence = typeof out.confidenceScore === 'number' ? out.confidenceScore : 0.5
  const avgSentLen = typeof out.averageSentenceLength === 'number' ? out.averageSentenceLength : 0

  const wpmScore = Math.max(0, 1 - Math.min(1, Math.abs(wpm - 130) / 60)) * 100
  const fillerScore = Math.max(0, 1 - Math.min(1, totalFiller / 10)) * 100
  const vocabScore = Math.max(0, Math.min(100, vocab))
  const clarityScore = Math.max(0, Math.min(100, clarity * 100))
  const confidenceScore = Math.max(0, Math.min(100, confidence * 100))
  const sentencePenalty = Math.max(0, (avgSentLen - 25) / 25)

  const overall = Math.round(
    wpmScore * 0.25 +
    fillerScore * 0.2 +
    vocabScore * 0.2 +
    clarityScore * 0.2 +
    confidenceScore * 0.15 -
    Math.min(10, sentencePenalty * 10)
  )

  const suggestions = []
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

  return out
}

// Test case 1: transcript from earlier (expected overall 61)
const sample = {
  transcript: 'This is a test transcript to exercise heuristics. I said um and like a couple times.',
  wordsPerMinute: 32,
  totalFillerCount: 2,
  vocabularyRichness: 94,
  uniqueWords: 15,
  totalWords: 16,
  sentimentScore: 0,
  sentimentLabel: 'Neutral',
  duration: 30,
  clarityScore: 0.94,
  confidenceScore: 0.5,
  averageSentenceLength: 8,
}

const result = computeScoring(Object.assign({}, sample))
console.log('computeScoring result overallScore:', result.overallScore)
assert.strictEqual(result.overallScore, 61, `Expected overallScore 61 but got ${result.overallScore}`)
console.log('Test passed ✅')
