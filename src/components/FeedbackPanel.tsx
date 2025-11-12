import { AnalysisData, SessionRecord } from '../App';
import { motion } from 'framer-motion';
const MPanel: any = motion.div;
import { 
  getWPMFeedback, 
  getFillerWordFeedback, 
  getVocabularyFeedback,
  getSentimentFeedback,
  getClarityFeedback,
  getConfidenceFeedback 
} from '../utils/speechAnalysis';
import { CheckCircle2, AlertCircle, Info, Lightbulb, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { Button } from './ui/button';

interface FeedbackPanelProps {
  data: AnalysisData;
  sessions: SessionRecord[];
}

export function FeedbackPanel({ data, sessions }: FeedbackPanelProps) {
  const wpmFeedback = getWPMFeedback(data.wordsPerMinute);
  const fillerPercentage = data.totalWords > 0 ? (data.totalFillerCount / data.totalWords) * 100 : 0;
  const fillerFeedback = getFillerWordFeedback(fillerPercentage);
  const vocabularyFeedback = getVocabularyFeedback(data.vocabularyRichness);
  const sentimentFeedback = getSentimentFeedback(data.sentimentScore, data.sentimentLabel);
  const clarityFeedback = getClarityFeedback(data.clarityScore);
  const confidenceFeedback = getConfidenceFeedback(data.confidenceScore);

  // Calculate overall score
  let overallScore = 0;
  let maxScore = 6;

  // WPM scoring
  if (data.wordsPerMinute >= 100 && data.wordsPerMinute <= 160) {
    overallScore += 1;
  } else if (data.wordsPerMinute > 80 && data.wordsPerMinute < 180) {
    overallScore += 0.5;
  }

  // Filler words scoring
  if (fillerPercentage <= 2) {
    overallScore += 1;
  } else if (fillerPercentage <= 5) {
    overallScore += 0.75;
  } else if (fillerPercentage <= 8) {
    overallScore += 0.5;
  }

  // Vocabulary scoring
  if (data.vocabularyRichness >= 60) {
    overallScore += 1;
  } else if (data.vocabularyRichness >= 45) {
    overallScore += 0.75;
  } else if (data.vocabularyRichness >= 30) {
    overallScore += 0.5;
  }

  // Sentiment scoring
  if (data.sentimentScore > 0.1) {
    overallScore += 1;
  } else if (data.sentimentScore >= -0.1) {
    overallScore += 0.5;
  }

  // Clarity scoring
  if (data.clarityScore > 0.8) {
    overallScore += 1;
  } else if (data.clarityScore > 0.6) {
    overallScore += 0.75;
  } else if (data.clarityScore > 0.4) {
    overallScore += 0.5;
  }

  // Confidence scoring
  if (data.confidenceScore > 0.8) {
    overallScore += 1;
  } else if (data.confidenceScore > 0.6) {
    overallScore += 0.75;
  } else if (data.confidenceScore > 0.4) {
    overallScore += 0.5;
  }

  const overallPercentage = Math.round((overallScore / maxScore) * 100);

  const getOverallRating = (percentage: number) => {
    if (percentage >= 90) return { label: 'Excellent', color: 'text-green-600', icon: CheckCircle2 };
    if (percentage >= 75) return { label: 'Very Good', color: 'text-blue-600', icon: CheckCircle2 };
    if (percentage >= 60) return { label: 'Good', color: 'text-yellow-600', icon: Info };
    if (percentage >= 40) return { label: 'Fair', color: 'text-orange-600', icon: AlertCircle };
    return { label: 'Needs Improvement', color: 'text-red-600', icon: AlertCircle };
  };

  const rating = getOverallRating(overallPercentage);
  const RatingIcon = rating.icon;

  return (
  <div className="bg-white dark:bg-slate-900 dark:text-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-600" />
        <h2>Personalized Feedback</h2>
      </div>

      {/* Overall Score */}
  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-blue-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-gray-900 dark:text-white mb-1">Overall Performance</h3>
            <p className={`flex items-center gap-2 ${rating.color}`}>
              <RatingIcon className="w-5 h-5" />
              <span>{rating.label}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {overallPercentage}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Score</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 rounded-full"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Detailed Feedback */}
  <div className="space-y-4">
  <h3 className="text-sm text-gray-900 dark:text-white">Detailed Recommendations</h3>

        {/* Speaking Pace Feedback */}
  <div className="bg-blue-50 dark:bg-slate-700 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${wpmFeedback.color}`}>
              {wpmFeedback.label === 'Excellent' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-white mb-1">Speaking Pace</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{wpmFeedback.advice}</p>
            </div>
          </div>
        </div>

        {/* Filler Words Feedback */}
  <div className="bg-purple-50 dark:bg-slate-700 rounded-lg p-4 border border-purple-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${fillerFeedback.color}`}>
              {fillerFeedback.label === 'Excellent' || fillerFeedback.label === 'Good' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-white mb-1">Filler Words</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{fillerFeedback.advice}</p>
              {data.fillerWords.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Most used: {data.fillerWords.slice(0, 3).map(f => `"${f.word}"`).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Vocabulary Feedback */}
  <div className="bg-green-50 dark:bg-slate-700 rounded-lg p-4 border border-green-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${vocabularyFeedback.color}`}>
              {vocabularyFeedback.label === 'Excellent' || vocabularyFeedback.label === 'Good' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-white mb-1">Vocabulary Variety</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{vocabularyFeedback.advice}</p>
            </div>
          </div>
        </div>

        {/* Sentiment Feedback */}
  <div className="bg-pink-50 dark:bg-slate-700 rounded-lg p-4 border border-pink-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${sentimentFeedback.color}`}>
              {data.sentimentScore > 0.1 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-white mb-1">Tone & Sentiment</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{sentimentFeedback.advice}</p>
            </div>
          </div>
        </div>

        {/* Clarity Feedback */}
  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${clarityFeedback.color}`}>
              {data.clarityScore > 0.8 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-white mb-1">Clarity</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{clarityFeedback.advice}</p>
            </div>
          </div>
        </div>

        {/* Confidence Feedback */}
  <div className="bg-orange-50 dark:bg-slate-700 rounded-lg p-4 border border-orange-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className={`mt-1 ${confidenceFeedback.color}`}>
              {data.confidenceScore > 0.8 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-white mb-1">Confidence</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{confidenceFeedback.advice}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border border-yellow-200 dark:border-slate-700">
        <h3 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-600" />
          Key Takeaways
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {data.wordsPerMinute < 100 || data.wordsPerMinute > 160 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Adjust your speaking pace to the ideal range of 120-160 words per minute</span>
            </li>
          ) : null}
          {fillerPercentage > 5 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Practice pausing thoughtfully instead of using filler words</span>
            </li>
          ) : null}
          {data.vocabularyRichness < 45 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Expand your vocabulary and avoid repetitive language</span>
            </li>
          ) : null}
          {data.sentimentScore < 0 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Frame your answers more positively to create a better impression</span>
            </li>
          ) : null}
          {data.clarityScore < 0.6 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Work on making your speech clearer and more understandable</span>
            </li>
          ) : null}
          {data.confidenceScore < 0.6 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Practice projecting your voice and speaking with more confidence</span>
            </li>
          ) : null}
          {overallPercentage >= 75 ? (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Great work! Keep practicing to maintain this level of performance</span>
            </li>
          ) : null}
        </ul>
      </div>

      {/* Download Button */}
      <div className="text-right">
        <Button
          className="bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ data, sessions }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'feedback_report.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>
    </div>
  );
}