import { AnalysisData } from '../App';

// Common filler words to detect
const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 
  'literally', 'just', 'really', 'very', 'kind of', 'sort of'
];

// Positive and negative word lists for sentiment analysis
const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love',
  'happy', 'excited', 'passionate', 'enjoy', 'succeed', 'success', 'achieve',
  'accomplishment', 'proud', 'confident', 'best', 'better', 'improve', 'growth',
  'opportunity', 'innovative', 'creative', 'effective', 'efficient', 'skilled',
  'experienced', 'capable', 'qualified', 'professional', 'dedicated', 'motivated'
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'poor', 'fail',
  'failure', 'difficult', 'problem', 'issue', 'struggle', 'worry', 'concerned',
  'unfortunate', 'disappointed', 'frustrated', 'hard', 'weak', 'unable', 'cannot',
  'never', 'boring', 'tired', 'stressed', 'anxious', 'nervous', 'scared'
];

export function analyzeTranscript(transcript: string, durationInSeconds: number): AnalysisData {
  const text = transcript.toLowerCase().trim();
  
  // Split into words
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const totalWords = words.length;
  
  // Calculate words per minute
  const durationInMinutes = durationInSeconds / 60;
  const wordsPerMinute = durationInMinutes > 0 ? Math.round(totalWords / durationInMinutes) : 0;
  
  // Detect filler words
  const fillerWordCounts: { [key: string]: number } = {};
  let totalFillerCount = 0;
  
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = transcript.match(regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      fillerWordCounts[filler] = count;
      totalFillerCount += count;
    }
  });
  
  const fillerWords = Object.entries(fillerWordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
  
  // Calculate vocabulary richness (unique words / total words)
  const uniqueWords = new Set(words.filter(word => word.length > 3)).size;
  const vocabularyRichness = totalWords > 0 ? Math.round((uniqueWords / totalWords) * 100) : 0;
  
  // Detect word repetitions
  const wordCounts: { [key: string]: number } = {};
  words.filter(word => word.length > 4).forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  const wordRepetitions = Object.entries(wordCounts)
    .filter(([_, count]) => count > 2)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Calculate average sentence length
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const averageSentenceLength = sentences.length > 0 
    ? Math.round(totalWords / sentences.length) 
    : 0;
  
  // Sentiment analysis
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (POSITIVE_WORDS.includes(word)) positiveCount++;
    if (NEGATIVE_WORDS.includes(word)) negativeCount++;
  });
  
  // Calculate sentiment score (-1 to 1)
  const totalSentimentWords = positiveCount + negativeCount;
  let sentimentScore = 0;
  let sentimentLabel = 'Neutral';
  
  if (totalSentimentWords > 0) {
    sentimentScore = (positiveCount - negativeCount) / totalWords;
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore * 10)); // Scale and clamp
    
    if (sentimentScore > 0.3) {
      sentimentLabel = 'Very Positive';
    } else if (sentimentScore > 0.1) {
      sentimentLabel = 'Positive';
    } else if (sentimentScore < -0.3) {
      sentimentLabel = 'Negative';
    } else if (sentimentScore < -0.1) {
      sentimentLabel = 'Slightly Negative';
    } else {
      sentimentLabel = 'Neutral';
    }
  }
  
  // Calculate clarity score (based on sentence structure and filler words)
  const fillerPercentage = totalWords > 0 ? (totalFillerCount / totalWords) * 100 : 0;
  let clarityScore = 100;
  clarityScore -= fillerPercentage * 10; // Penalize for filler words
  if (averageSentenceLength > 30) clarityScore -= 10; // Penalize for too long sentences
  if (averageSentenceLength < 10) clarityScore -= 10; // Penalize for too short sentences
  clarityScore = Math.max(0, Math.min(100, Math.round(clarityScore)));
  
  // Calculate confidence score (based on pace, vocabulary, and sentiment)
  let confidenceScore = 50;
  if (wordsPerMinute >= 100 && wordsPerMinute <= 160) confidenceScore += 25;
  else if (wordsPerMinute >= 80 && wordsPerMinute <= 180) confidenceScore += 15;
  
  if (vocabularyRichness >= 50) confidenceScore += 15;
  else if (vocabularyRichness >= 35) confidenceScore += 10;
  
  if (sentimentScore > 0) confidenceScore += 10;
  
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));
  
  return {
    transcript,
    wordsPerMinute,
    fillerWords,
    totalFillerCount,
    vocabularyRichness,
    uniqueWords,
    totalWords,
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    sentimentLabel,
    duration: durationInSeconds,
    clarityScore,
    confidenceScore,
    wordRepetitions,
    averageSentenceLength,
  };
}

export function getWPMFeedback(wpm: number): { label: string; color: string; advice: string } {
  if (wpm < 100) {
    return {
      label: 'Too Slow',
      color: 'text-orange-600',
      advice: 'Your pace is slower than ideal. Try to speak a bit faster to maintain engagement.'
    };
  } else if (wpm >= 100 && wpm <= 160) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'Perfect speaking pace! You\'re maintaining an engaging and clear delivery.'
    };
  } else if (wpm > 160 && wpm <= 180) {
    return {
      label: 'Slightly Fast',
      color: 'text-yellow-600',
      advice: 'You\'re speaking a bit quickly. Try to slow down slightly for better clarity.'
    };
  } else {
    return {
      label: 'Too Fast',
      color: 'text-red-600',
      advice: 'Slow down! Speaking too fast can make you harder to understand and seem nervous.'
    };
  }
}

export function getFillerWordFeedback(percentage: number): { label: string; color: string; advice: string } {
  if (percentage <= 2) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'Great job! You\'re using very few filler words.'
    };
  } else if (percentage <= 5) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      advice: 'You\'re doing well, but try to reduce filler words even more.'
    };
  } else if (percentage <= 8) {
    return {
      label: 'Needs Improvement',
      color: 'text-yellow-600',
      advice: 'Focus on reducing filler words. Pause instead of saying "um" or "like".'
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600',
      advice: 'Too many filler words! Practice pausing and thinking before speaking.'
    };
  }
}

export function getVocabularyFeedback(richness: number): { label: string; color: string; advice: string } {
  if (richness >= 60) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'Outstanding vocabulary variety! You\'re using diverse and rich language.'
    };
  } else if (richness >= 45) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      advice: 'Good vocabulary usage. Consider using more varied terms to sound more professional.'
    };
  } else if (richness >= 30) {
    return {
      label: 'Fair',
      color: 'text-yellow-600',
      advice: 'Try to use more varied vocabulary. Avoid repeating the same words frequently.'
    };
  } else {
    return {
      label: 'Limited',
      color: 'text-red-600',
      advice: 'Expand your vocabulary! Using more diverse words will make your answers more engaging.'
    };
  }
}

export function getSentimentFeedback(score: number, label: string): { color: string; advice: string } {
  if (label === 'Very Positive') {
    return {
      color: 'text-green-600',
      advice: 'Great positive energy! Your enthusiasm comes through clearly.'
    };
  } else if (label === 'Positive') {
    return {
      color: 'text-blue-600',
      advice: 'Good positive tone. This helps create a favorable impression.'
    };
  } else if (label === 'Neutral') {
    return {
      color: 'text-gray-600',
      advice: 'Neutral tone. Consider adding more enthusiasm to show your passion for the role.'
    };
  } else if (label === 'Slightly Negative') {
    return {
      color: 'text-yellow-600',
      advice: 'Try to frame things more positively, even when discussing challenges.'
    };
  } else {
    return {
      color: 'text-red-600',
      advice: 'Reframe negative language. Focus on solutions and learning rather than problems.'
    };
  }
}

export function getClarityFeedback(score: number): { label: string; color: string; advice: string } {
  if (score >= 80) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'Your speech is clear and easy to follow. Keep it up!'
    };
  } else if (score >= 60) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      advice: 'Your speech is mostly clear. Try to reduce filler words and improve sentence structure.'
    };
  } else if (score >= 40) {
    return {
      label: 'Needs Improvement',
      color: 'text-yellow-600',
      advice: 'Your speech is a bit unclear. Focus on reducing filler words and improving sentence structure.'
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600',
      advice: 'Your speech is unclear. Practice reducing filler words and improving sentence structure.'
    };
  }
}

export function getConfidenceFeedback(score: number): { label: string; color: string; advice: string } {
  if (score >= 80) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'Your confidence is high. Keep it up!'
    };
  } else if (score >= 60) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      advice: 'Your confidence is good. Try to speak a bit faster and use more varied vocabulary.'
    };
  } else if (score >= 40) {
    return {
      label: 'Needs Improvement',
      color: 'text-yellow-600',
      advice: 'Your confidence is a bit low. Focus on speaking faster, using varied vocabulary, and maintaining a positive tone.'
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600',
      advice: 'Your confidence is low. Practice speaking faster, using varied vocabulary, and maintaining a positive tone.'
    };
  }
}

export function getWordRepetitionFeedback(repetitions: { word: string; count: number }[]): { label: string; color: string; advice: string } {
  if (repetitions.length === 0) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'You\'re using a variety of words. Great job!'
    };
  } else if (repetitions.length <= 2) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      advice: 'You\'re using a variety of words. Consider using even more varied terms.'
    };
  } else if (repetitions.length <= 4) {
    return {
      label: 'Needs Improvement',
      color: 'text-yellow-600',
      advice: 'You\'re repeating some words. Try to use more varied vocabulary.'
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600',
      advice: 'You\'re repeating words frequently. Practice using more varied vocabulary.'
    };
  }
}

export function getSentenceLengthFeedback(length: number): { label: string; color: string; advice: string } {
  if (length >= 10 && length <= 30) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      advice: 'Your sentences are well-structured and easy to follow. Keep it up!'
    };
  } else if (length >= 8 && length <= 32) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      advice: 'Your sentences are mostly well-structured. Try to keep them within 10-30 words.'
    };
  } else if (length >= 6 && length <= 34) {
    return {
      label: 'Needs Improvement',
      color: 'text-yellow-600',
      advice: 'Your sentences are a bit long or short. Try to keep them within 10-30 words.'
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600',
      advice: 'Your sentences are too long or short. Practice keeping them within 10-30 words.'
    };
  }
}