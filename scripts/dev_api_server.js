// dev_api_server.js
// Lightweight local API server that exposes /api/analyze for development/testing.
const http = require('http');

function analyze(transcript, duration) {
  const clean = transcript.replace(/[\n\r]+/g, ' ').trim();
  const words = clean.length === 0 ? [] : clean.split(/\s+/);
  const totalWords = words.length;
  const durSeconds = typeof duration === 'number' && duration > 0 ? duration : Math.max(1, Math.round((words.length / 150) * 60));
  const wordsPerMinute = durSeconds > 0 ? Math.round((totalWords / durSeconds) * 60) : 0;

  const fillerList = ['um','uh','like','you know','so','actually','basically','right','i mean'];
  const lower = clean.toLowerCase();
  const fillerCounts = {};
  fillerList.forEach(f => { fillerCounts[f] = 0; });
  fillerList.forEach(f => {
    const re = new RegExp(`\\b${f.replace(/[\\-\\/\\\\\\^\\$\\*\\+\\?\\.\\(\\)\\|[\]{}]/g, '\\$&')}\\b`, 'gi');
    const matches = (lower.match(re) || []);
    fillerCounts[f] = matches.length;
  });
  const fillerWords = Object.keys(fillerCounts).filter(k => fillerCounts[k] > 0).map(k => ({ word: k, count: fillerCounts[k] }));
  const totalFillerCount = Object.values(fillerCounts).reduce((a,b) => a + b, 0);

  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-zA-Z']/g, ''))).size;
  const vocabularyRichness = totalWords > 0 ? Math.round((uniqueWords / totalWords) * 100) : 0;

  const sentences = clean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const averageSentenceLength = sentences.length ? +(totalWords / sentences.length).toFixed(1) : totalWords;

  const freq = {};
  words.forEach(w => {
    const key = w.toLowerCase().replace(/[^a-zA-Z']/g, '');
    if (!key) return;
    freq[key] = (freq[key] || 0) + 1;
  });
  const wordRepetitions = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,10).map(([word,count]) => ({ word, count }));

  const base = {
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
    clarityScore: Math.min(1, vocabularyRichness / 100),
    confidenceScore: 0.5,
    wordRepetitions,
    averageSentenceLength,
    pacingTimeline: [],
    scoringBreakdown: {},
    overallScore: 0,
    suggestions: [],
  };

  return computeScoring(base);
}

function computeScoring(out) {
  const wpm = typeof out.wordsPerMinute === 'number' ? out.wordsPerMinute : 0;
  const totalFiller = typeof out.totalFillerCount === 'number' ? out.totalFillerCount : 0;
  const vocab = typeof out.vocabularyRichness === 'number' ? out.vocabularyRichness : 0;
  const clarity = typeof out.clarityScore === 'number' ? out.clarityScore : Math.min(1, vocab / 100);
  const confidence = typeof out.confidenceScore === 'number' ? out.confidenceScore : 0.5;
  const avgSentLen = typeof out.averageSentenceLength === 'number' ? out.averageSentenceLength : 0;

  const wpmScore = Math.max(0, 1 - Math.min(1, Math.abs(wpm - 130) / 60)) * 100;
  const fillerScore = Math.max(0, 1 - Math.min(1, totalFiller / 10)) * 100;
  const vocabScore = Math.max(0, Math.min(100, vocab));
  const clarityScore = Math.max(0, Math.min(100, clarity * 100));
  const confidenceScore = Math.max(0, Math.min(100, confidence * 100));
  const sentencePenalty = Math.max(0, (avgSentLen - 25) / 25);

  const overall = Math.round(
    wpmScore * 0.25 +
    fillerScore * 0.2 +
    vocabScore * 0.2 +
    clarityScore * 0.2 +
    confidenceScore * 0.15 -
    Math.min(10, sentencePenalty * 10)
  );

  const suggestions = [];
  if (totalFiller > 2) suggestions.push(`Reduce filler words — heard ${totalFiller} times.`);
  if (wpm < 100) suggestions.push(`Try increasing pace: current ${wpm} WPM; aim for 110-160 WPM.`);
  if (wpm > 170) suggestions.push(`Try slowing down a bit: current ${wpm} WPM.`);
  if (vocab < 40) suggestions.push('Work on varied vocabulary to improve richness.');
  if (avgSentLen > 25) suggestions.push('Use shorter sentences to improve clarity.');

  out.scoringBreakdown = {
    wpmScore: Math.round(wpmScore),
    fillerScore: Math.round(fillerScore),
    vocabScore: Math.round(vocabScore),
    clarityScore: Math.round(clarityScore),
    confidenceScore: Math.round(confidenceScore),
  };
  out.overallScore = Math.max(0, Math.min(100, overall));
  out.suggestions = suggestions;
  out.clarityScore = Math.min(1, clarity);
  out.confidenceScore = Math.min(1, confidence);

  if (!out.sentimentLabel) {
    if (typeof out.sentimentScore === 'number') {
      const s = out.sentimentScore;
      out.sentimentLabel = s >= 0.6 ? 'Very Positive' : s >= 0.2 ? 'Positive' : s > -0.2 ? 'Neutral' : s > -0.6 ? 'Negative' : 'Very Negative';
    } else {
      out.sentimentLabel = 'Neutral';
    }
  }

  return out;
}

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const transcript = parsed.transcript || '';
        const duration = parsed.duration || parsed.d || 0;
        const out = analyze(transcript, duration);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
