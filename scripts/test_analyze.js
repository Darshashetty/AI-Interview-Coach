// Quick local test harness that mirrors the heuristic logic in api/analyze.ts
function analyzeTranscriptHeuristics(transcript, duration){
  const clean = (transcript || '').replace(/[\n\r]+/g, ' ').trim();
  const words = clean.length === 0 ? [] : clean.split(/\s+/);
  const totalWords = words.length;
  const durSeconds = typeof duration === 'number' && duration > 0 ? duration : Math.max(1, Math.round((words.length / 150) * 60));
  const wordsPerMinute = durSeconds > 0 ? Math.round((totalWords / durSeconds) * 60) : 0;

  const fillerList = ['um','uh','like','you know','so','actually','basically','right','i mean'];
  const lower = clean.toLowerCase();
  const fillerCounts = {};
  fillerList.forEach(f => { fillerCounts[f] = 0 });
  fillerList.forEach(f => {
    const re = new RegExp(`\\b${f.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    const matches = (lower.match(re) || []);
    fillerCounts[f] = matches.length;
  });
  const fillerWords = Object.keys(fillerCounts).filter(k => fillerCounts[k] > 0).map(k => ({ word: k, count: fillerCounts[k] }));
  const totalFillerCount = Object.values(fillerCounts).reduce((a,b) => a + b, 0);

  const uniqueWords = new Set(words.map(w => (w||'').toLowerCase().replace(/[^a-zA-Z']/g, ''))).size;
  const vocabularyRichness = totalWords > 0 ? Math.round((uniqueWords / totalWords) * 100) : 0;

  const sentences = clean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const averageSentenceLength = sentences.length ? +(totalWords / sentences.length).toFixed(1) : totalWords;

  const freq = {};
  words.forEach(w => {
    const key = (w||'').toLowerCase().replace(/[^a-zA-Z']/g, '');
    if (!key) return;
    freq[key] = (freq[key] || 0) + 1;
  });
  const wordRepetitions = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([word,count])=>({word,count}));

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
    clarityScore: Math.round((vocabularyRichness / 100) * 100),
    confidenceScore: 0.5,
    wordRepetitions,
    averageSentenceLength,
    pacingTimeline: [],
  };

  return baseResult;
}

// Example usage
const sample = "This is a short test transcript. I spoke clearly but said um and like a few times. Overall I think it went well.";
const out = analyzeTranscriptHeuristics(sample, 30);
console.log(JSON.stringify(out, null, 2));
