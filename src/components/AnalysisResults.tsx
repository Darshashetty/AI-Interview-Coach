import { AnalysisData } from '../App';
import { motion } from 'framer-motion';
import * as React from 'react';
import type { HTMLMotionProps } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, MessageSquare, BookOpen, Heart, Shield, Zap, Repeat, FileText } from 'lucide-react';
import { 
  getWPMFeedback, 
  getFillerWordFeedback, 
  getVocabularyFeedback,
  getSentimentFeedback,
  getClarityFeedback,
  getConfidenceFeedback 
} from '../utils/speechAnalysis';
type DivMotionProps = HTMLMotionProps<'div'>;
// Use a loose typing for motion card to avoid strict prop mismatch in TSX
const MotionCard: any = motion.div;

interface AnalysisResultsProps {
  data: AnalysisData;
}

export function AnalysisResults({ data }: AnalysisResultsProps) {
  const wpmFeedback = getWPMFeedback(data.wordsPerMinute);
  const fillerPercentage = data.totalWords > 0 ? (data.totalFillerCount / data.totalWords) * 100 : 0;
  const fillerFeedback = getFillerWordFeedback(fillerPercentage);
  const vocabularyFeedback = getVocabularyFeedback(data.vocabularyRichness);
  const sentimentFeedback = getSentimentFeedback(data.sentimentScore, data.sentimentLabel);
  const clarityFeedback = getClarityFeedback(data.clarityScore);
  const confidenceFeedback = getConfidenceFeedback(data.confidenceScore);

  // Prepare data for filler words chart
  const topFillerWords = data.fillerWords.slice(0, 5).map(item => ({
    word: item.word,
    count: item.count
  }));

  const overall = typeof (data as any).overallScore === 'number' ? (data as any).overallScore : null
  const breakdown = (data as any).scoringBreakdown || null
  const suggestions: string[] = Array.isArray((data as any).suggestions) ? (data as any).suggestions : []

  return (
  <div className="space-y-6 dark:text-white">
      {/* Overall Score */}
      {overall !== null && (
  <MotionCard whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-gray-700 dark:text-gray-300">Overall Performance</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Aggregated score (0 - 100)</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">{overall}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Higher is better</div>
            </div>
          </div>
        </MotionCard>
      )}
      {/* Primary Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Speaking Pace */}
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-blue-900 dark:text-white">Speaking Pace</h3>
              <p className={`text-xs ${wpmFeedback.color}`}>{wpmFeedback.label}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-blue-900 dark:text-white">{data.wordsPerMinute}</span>
            <span className="text-sm text-blue-700 dark:text-gray-300">WPM</span>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-slate-700">
            <p className="text-xs text-blue-800 dark:text-gray-300">Target: 120-160 WPM</p>
          </div>
        </div>

        {/* Filler Words */}
  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-purple-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-purple-900 dark:text-white">Filler Words</h3>
              <p className={`text-xs ${fillerFeedback.color}`}>{fillerFeedback.label}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-purple-900 dark:text-white">{data.totalFillerCount}</span>
            <span className="text-sm text-purple-700 dark:text-gray-300">instances</span>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-200 dark:border-slate-700">
            <p className="text-xs text-purple-800 dark:text-gray-300">{fillerPercentage.toFixed(1)}% of total words</p>
          </div>
        </div>

        {/* Vocabulary Richness */}
  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-green-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-green-900 dark:text-white">Vocabulary Variety</h3>
              <p className={`text-xs ${vocabularyFeedback.color}`}>{vocabularyFeedback.label}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-green-900 dark:text-white">{data.vocabularyRichness}%</span>
            <span className="text-sm text-green-700 dark:text-gray-300">richness</span>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200 dark:border-slate-700">
            <p className="text-xs text-green-800 dark:text-gray-300">{data.uniqueWords} unique words / {data.totalWords} total</p>
          </div>
        </div>

        {/* Sentiment */}
  <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-pink-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-pink-600 p-2 rounded-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-pink-900 dark:text-white">Tone / Sentiment</h3>
              <p className={`text-xs ${sentimentFeedback.color}`}>{data.sentimentLabel}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-pink-900 dark:text-white">{data.sentimentScore > 0 ? '+' : ''}{data.sentimentScore}</span>
            <span className="text-sm text-pink-700 dark:text-gray-300">score</span>
          </div>
          <div className="mt-3 pt-3 border-t border-pink-200 dark:border-slate-700">
            <p className="text-xs text-pink-800 dark:text-gray-300">Range: -1.0 (negative) to +1.0 (positive)</p>
          </div>
        </div>

        {/* Clarity Score */}
  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-cyan-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-cyan-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-cyan-900 dark:text-white">Clarity Score</h3>
              <p className={`text-xs ${clarityFeedback.color}`}>{clarityFeedback.label}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-cyan-900 dark:text-white">{breakdown?.clarityScore ?? Math.round((data.clarityScore ?? 0) * 100)}</span>
            <span className="text-sm text-cyan-700 dark:text-gray-300">/100</span>
          </div>
          <div className="mt-3 pt-3 border-t border-cyan-200 dark:border-slate-700">
            <p className="text-xs text-cyan-800 dark:text-gray-300">Avg sentence: {data.averageSentenceLength} words</p>
          </div>
        </div>

        {/* Confidence Score */}
  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-amber-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-amber-900 dark:text-white">Confidence Score</h3>
              <p className={`text-xs ${confidenceFeedback.color}`}>{confidenceFeedback.label}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-amber-900 dark:text-white">{breakdown?.confidenceScore ?? Math.round((data.confidenceScore ?? 0) * 100)}</span>
            <span className="text-sm text-amber-700 dark:text-gray-300">/100</span>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-slate-700">
            <p className="text-xs text-amber-800 dark:text-gray-300">Based on pace, vocabulary & tone</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Filler Words Chart */}
        {topFillerWords.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <h3 className="text-sm mb-4 text-gray-900 dark:text-white">Top Filler Words Used</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topFillerWords}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="word" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {topFillerWords.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${270 - index * 20}, 70%, 60%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Word Repetitions */}
        {data.wordRepetitions && data.wordRepetitions.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Repeat className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm text-gray-900 dark:text-white">Most Repeated Words</h3>
            </div>
            <div className="space-y-2">
              {data.wordRepetitions.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.word}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                        style={{ width: `${Math.min(100, (item.count / data.totalWords) * 100 * 20)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{item.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transcript */}
  <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm text-gray-900 dark:text-white">Full Transcript</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-gray-700 dark:text-gray-100 whitespace-pre-wrap">{data.transcript}</p>
        </div>
      </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <h3 className="text-sm mb-3 text-gray-900 dark:text-white">Suggestions</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
  );
}