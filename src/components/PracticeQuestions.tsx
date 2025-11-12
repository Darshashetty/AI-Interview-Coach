import { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface PracticeQuestionsProps {
  selectedQuestion: string | null;
  onSelectQuestion: (question: string | null) => void;
}

const questionCategories = {
  'Behavioral': [
    'Tell me about yourself.',
    'What are your greatest strengths?',
    'What is your biggest weakness?',
    'Tell me about a time you faced a challenge at work.',
    'Describe a situation where you showed leadership.',
    'Tell me about a time you failed and what you learned.',
  ],
  'Technical': [
    'Explain your technical background and expertise.',
    'Describe a complex technical problem you solved.',
    'What technologies are you most proficient in?',
    'How do you stay updated with industry trends?',
  ],
  'Situational': [
    'How would you handle a conflict with a team member?',
    'What would you do if you disagreed with your manager?',
    'How do you prioritize multiple urgent tasks?',
    'How would you handle a tight deadline?',
  ],
  'Career Goals': [
    'Where do you see yourself in 5 years?',
    'Why do you want to work for our company?',
    'Why are you leaving your current position?',
    'What motivates you in your career?',
  ],
};

export function PracticeQuestions({ selectedQuestion, onSelectQuestion }: PracticeQuestionsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Behavioral');

  const getRandomQuestion = () => {
    const allQuestions = Object.values(questionCategories).flat();
    const randomIndex = Math.floor(Math.random() * allQuestions.length);
    onSelectQuestion(allQuestions[randomIndex]);
  };

  return (
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          <h2>Practice Questions</h2>
        </div>
        <Button
          onClick={getRandomQuestion}
          size="sm"
          variant="outline"
          className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Random
        </Button>
      </div>

      {/* Selected Question Display */}
      {selectedQuestion && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg">
          <p className="text-sm text-purple-900 dark:text-white">{selectedQuestion}</p>
          <Button
            onClick={() => onSelectQuestion(null)}
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-300"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Question Categories */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {Object.entries(questionCategories).map(([category, questions]) => (
            <div key={category} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="text-sm text-gray-900 dark:text-gray-100">{category}</span>
              {expandedCategory === category ? (
                <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {expandedCategory === category && (
              <div className="p-2 space-y-1">
                {questions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectQuestion(question)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      selectedQuestion === question
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-200'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-900 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
