import { useState, useEffect } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { AnalysisResults } from './components/AnalysisResults';
import { FeedbackPanel } from './components/FeedbackPanel';
import { SessionHistory } from './components/SessionHistory';
import { PracticeQuestions } from './components/PracticeQuestions';
import { Mic, Brain, TrendingUp, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { jsPDF } from 'jspdf';

export interface AnalysisData {
  transcript: string;
  wordsPerMinute: number;
  fillerWords: { word: string; count: number }[];
  totalFillerCount: number;
  vocabularyRichness: number;
  uniqueWords: number;
  totalWords: number;
  sentimentScore: number;
  sentimentLabel: string;
  duration: number;
  clarityScore: number;
  confidenceScore: number;
  wordRepetitions: { word: string; count: number }[];
  averageSentenceLength: number;
  pacingTimeline?: { time: number; wpm: number }[];
  // optional fields added by analysis endpoint
  overallScore?: number;
  scoringBreakdown?: Record<string, number>;
  suggestions?: string[];
  // optional recorded audio (base64) to allow playback from session history
  audioBase64?: string;
  audioMime?: string;
}

export interface SessionRecord extends AnalysisData {
  id: string;
  timestamp: number;
  question?: string;
}

export default function App() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('practice');
  const [mobileView, setMobileView] = useState<boolean>(false);
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    const saved = localStorage.getItem('interview-sessions');
    return saved ? JSON.parse(saved) : [];
  });

  // Apply saved theme on mount (and respect system preference if none saved)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // ignore
    }
    // apply saved mobile simulation
    try {
      const m = localStorage.getItem('simulate-mobile');
      if (m === '1') setMobileView(true);
    } catch (e) {}
    // apply saved full-black preference
    try {
      const t = localStorage.getItem('theme');
      if (t === 'dark') {
        document.documentElement.classList.add('full-black');
      }
    } catch (e) {}
  }, []);

  const handleAnalysisComplete = (data: AnalysisData) => {
    // debug: log whether audioBase64 was attached
    try {
      // eslint-disable-next-line no-console
      console.debug('handleAnalysisComplete - audioBase64 present?', typeof (data as any).audioBase64 === 'string', 'length=', (data as any).audioBase64 ? (data as any).audioBase64.length : 0);
    } catch (e) {}
    setAnalysis(data);
    
    // Save to history
    const newSession: SessionRecord = {
      ...data,
      id: Date.now().toString(),
      timestamp: Date.now(),
      question: selectedQuestion || undefined
    };
    
    const updatedSessions = [newSession, ...sessions].slice(0, 20); // Keep last 20
    setSessions(updatedSessions);
    localStorage.setItem('interview-sessions', JSON.stringify(updatedSessions));
  };

  const handleLoadSession = (session: SessionRecord) => {
    setAnalysis(session);
  };

  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    localStorage.setItem('interview-sessions', JSON.stringify(updatedSessions));
  };

  // keep documentElement in sync with mobileView so CSS simulation works even
  // for logic that relies on classes at the root element
  useEffect(() => {
    try {
      const el = document.documentElement;
      if (mobileView) {
        el.classList.add('simulate-mobile');
        localStorage.setItem('simulate-mobile', '1');
      } else {
        el.classList.remove('simulate-mobile');
        localStorage.setItem('simulate-mobile', '0');
      }
    } catch (e) {}
  }, [mobileView]);

  return (
    <div className={(() => {
      const bgClass = activeTab === 'practice'
        ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800'
  : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800';
      const mobileClass = mobileView ? ' simulate-mobile' : '';
      return `min-h-screen ${bgClass} transition-colors duration-300 overflow-x-hidden${mobileClass}`;
    })()}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Interview Coach
            </h1>
          </div>
          <div className="flex justify-center gap-4 mb-4">
            <button
              className="px-3 py-1 bg-white text-gray-900 font-semibold rounded border border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700 transition-colors duration-200"
              onClick={() => {
                try {
                  const el = document.documentElement;
                  if (el.classList.contains('dark')) {
                    el.classList.remove('dark');
                    el.classList.remove('full-black');
                    localStorage.setItem('theme', 'light');
                  } else {
                    el.classList.add('dark');
                    // also enable full-black visual treatment for maximum contrast
                    el.classList.add('full-black');
                    localStorage.setItem('theme', 'dark');
                  }
                } catch (e) {
                  // ignore
                }
              }}
            >
              Toggle Theme
            </button>
            <button
              className={`px-3 py-1 font-semibold rounded border transition-colors duration-200 ${mobileView ? 'bg-white text-gray-900 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700' : 'bg-transparent text-gray-700 dark:text-gray-300 border border-transparent'}`}
              onClick={() => {
                const next = !mobileView;
                setMobileView(next);
                try {
                  if (next) {
                    document.documentElement.classList.add('simulate-mobile');
                    localStorage.setItem('simulate-mobile', '1');
                  } else {
                    document.documentElement.classList.remove('simulate-mobile');
                    localStorage.setItem('simulate-mobile', '0');
                  }
                } catch (e) {
                  // ignore
                }
              }}
              title="Toggle mobile view simulation"
            >
              Mobile View
            </button>
            {analysis && (
              <button
                className="px-3 py-1 bg-white text-gray-900 font-semibold rounded border border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                onClick={() => {
                  const doc = new jsPDF();
                  let y = 20;
                  doc.setFontSize(16);
                  doc.text('AI Interview Coach - Analysis Report', 10, y);
                  y += 10;
                  doc.setFontSize(12);
                  doc.text('Transcript:', 10, y);
                  y += 6;
                  const transcriptLines = doc.splitTextToSize(analysis.transcript, 180);
                  doc.text(transcriptLines, 10, y);
                  y += transcriptLines.length * 6 + 4;

                  doc.text(`Overall Score: ${(analysis as any).overallScore ?? 'N/A'}`, 10, y);
                  y += 8;

                  const breakdown = (analysis as any).scoringBreakdown || {};
                  doc.text('Scoring Breakdown:', 10, y);
                  y += 6;
                  const keys = Object.keys(breakdown);
                  if (keys.length) {
                    keys.forEach((k: string) => {
                      const val = (breakdown as any)[k];
                      doc.text(`- ${k}: ${val}`, 12, y);
                      y += 6;
                    })
                  } else {
                    doc.text('- Not available', 12, y);
                    y += 6;
                  }

                  y += 4;
                  doc.text('Suggestions:', 10, y);
                  y += 6;
                  const suggestions: string[] = Array.isArray((analysis as any).suggestions) ? (analysis as any).suggestions : [];
                  if (suggestions.length) {
                    suggestions.forEach((s, i) => {
                      const lines = doc.splitTextToSize(`${i+1}. ${s}`, 170);
                      doc.text(lines, 12, y);
                      y += lines.length * 6;
                    })
                  } else {
                    doc.text('- None', 12, y);
                    y += 6;
                  }

                  doc.save('analysis-report.pdf');
                }}
              >
                Download Report
              </button>
            )}
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Advanced AI-powered interview preparation with real-time speech analysis, 
            practice questions, and performance tracking.
          </p>
        </div>

  <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v)} defaultValue="practice" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History ({sessions.length})
            </TabsTrigger>
          </TabsList>

          {/* Practice Tab */}
          <TabsContent value="practice" className="space-y-6 min-h-screen">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recording Section */}
              <div className="lg:col-span-1 space-y-6">
                <PracticeQuestions 
                  selectedQuestion={selectedQuestion}
                  onSelectQuestion={setSelectedQuestion}
                />
                
                <div className="bg-white dark:bg-slate-900 dark:text-white rounded-2xl shadow-lg p-6 sticky top-8">
                  <div className="flex items-center gap-2 mb-6">
                    <Mic className="w-5 h-5 text-blue-600" />
                    <h2>Record Your Answer</h2>
                  </div>
                  
                  <AudioRecorder 
                    onAnalysisComplete={handleAnalysisComplete}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                  />

                  {/* Tips */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm mb-3 text-gray-700">💡 Quick Tips</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Speak clearly and at a natural pace</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Aim for 120-150 words per minute</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Minimize filler words like "um" and "uh"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Use varied vocabulary</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-2 space-y-6">
                {analysis ? (
                  <>
                    <div className="bg-white dark:bg-slate-900 dark:text-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <h2>Analysis Results</h2>
                      </div>
                      <AnalysisResults data={analysis} />
                    </div>

                    <div className="mt-6">
                      <FeedbackPanel data={analysis} sessions={sessions} />
                    </div>
                  </>
                ) : (
                  <div className="bg-white dark:bg-slate-900 dark:text-white rounded-2xl shadow-lg p-12 text-center">
                    <div className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mic className="w-10 h-10 text-gray-400 dark:text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 dark:text-white mb-2">Ready to Practice?</h3>
                    <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                      Select a practice question or create your own, then click the microphone button 
                      to start recording. You'll receive detailed AI-powered feedback.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <SessionHistory 
              sessions={sessions}
              onLoadSession={handleLoadSession}
              onDeleteSession={handleDeleteSession}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}