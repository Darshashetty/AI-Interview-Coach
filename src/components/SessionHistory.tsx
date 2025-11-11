import { SessionRecord } from '../App';
import { Play, Trash2, TrendingUp, Clock, Calendar, Award } from 'lucide-react';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SessionHistoryProps {
  sessions: SessionRecord[];
  onLoadSession: (session: SessionRecord) => void;
  onDeleteSession: (id: string) => void;
}

export function SessionHistory({ sessions, onLoadSession, onDeleteSession }: SessionHistoryProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const calculateOverallScore = (session: SessionRecord) => {
    let score = 0;
    if (session.wordsPerMinute >= 100 && session.wordsPerMinute <= 160) score += 25;
    else if (session.wordsPerMinute > 80 && session.wordsPerMinute < 180) score += 15;
    
    const fillerPercentage = (session.totalFillerCount / session.totalWords) * 100;
    if (fillerPercentage <= 2) score += 25;
    else if (fillerPercentage <= 5) score += 18;
    else if (fillerPercentage <= 8) score += 12;
    
    if (session.vocabularyRichness >= 60) score += 25;
    else if (session.vocabularyRichness >= 45) score += 18;
    else if (session.vocabularyRichness >= 30) score += 12;
    
    if (session.sentimentScore > 0.1) score += 25;
    else if (session.sentimentScore >= -0.1) score += 12;
    
    return score;
  };

  // Prepare progress chart data
  const progressData = sessions
    .slice(0, 10)
    .reverse()
    .map((session, index) => ({
      session: `#${sessions.length - index}`,
      score: calculateOverallScore(session),
      wpm: session.wordsPerMinute,
      clarity: session.clarityScore,
    }));

  const averageScore = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + calculateOverallScore(s), 0) / sessions.length)
    : 0;

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-gray-900 mb-2">No Practice Sessions Yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Start practicing your interview answers to track your progress over time!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm text-blue-900">Average Score</h3>
          </div>
          <div className="text-3xl text-blue-900">{averageScore}%</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="text-sm text-green-900">Total Sessions</h3>
          </div>
          <div className="text-3xl text-green-900">{sessions.length}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm text-purple-900">Latest Score</h3>
          </div>
          <div className="text-3xl text-purple-900">{calculateOverallScore(sessions[0])}%</div>
        </div>
      </div>

      {/* Progress Chart */}
      {sessions.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="mb-4 text-gray-900">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="session" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Overall Score"
                dot={{ fill: '#8b5cf6', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="wpm" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Words/Min"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Session List */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="mb-4 text-gray-900">Recent Sessions</h3>
        <div className="space-y-3">
          {sessions.map((session) => {
            const score = calculateOverallScore(session);
            return (
              <div
                key={session.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${getScoreColor(score)}`}>
                        Score: {score}%
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.timestamp)}
                      </span>
                    </div>
                    
                    {session.question && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        Q: {session.question}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>{session.wordsPerMinute} WPM</span>
                      <span>•</span>
                      <span>{formatDuration(session.duration)}</span>
                      <span>•</span>
                      <span>{session.totalWords} words</span>
                      <span>•</span>
                      <span>{session.totalFillerCount} fillers</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => onLoadSession(session)}
                      size="sm"
                      variant="outline"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onDeleteSession(session.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
