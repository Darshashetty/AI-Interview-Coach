import { useState } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { AnalysisResults } from './components/AnalysisResults';
import { FeedbackPanel } from './components/FeedbackPanel';
import { SessionHistory } from './components/SessionHistory';
import { PracticeQuestions } from './components/PracticeQuestions';
import { Mic, Brain, TrendingUp, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

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
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    const saved = localStorage.getItem('interview-sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const handleAnalysisComplete = (data: AnalysisData) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
          <p className="text-gray-600 max-w-2xl mx-auto">
            Advanced AI-powered interview preparation with real-time speech analysis, 
            practice questions, and performance tracking.
          </p>
        </div>

        <Tabs defaultValue="practice" className="space-y-6">
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
          <TabsContent value="practice" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recording Section */}
              <div className="lg:col-span-1 space-y-6">
                <PracticeQuestions 
                  selectedQuestion={selectedQuestion}
                  onSelectQuestion={setSelectedQuestion}
                />
                
                <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
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
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <h2>Analysis Results</h2>
                      </div>
                      <AnalysisResults data={analysis} />
                    </div>

                    <FeedbackPanel data={analysis} sessions={sessions} />
                  </>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mic className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 mb-2">Ready to Practice?</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
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