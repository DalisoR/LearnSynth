import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import practiceProblemsService, {
  PracticeProblem,
  PracticeSession,
  PracticeAttempt,
  KnowledgeMastery,
  GenerationRequest,
} from '../services/api/practiceProblems';

const PracticeProblems: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'practice' | 'sessions' | 'analytics'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [generationParams, setGenerationParams] = useState<Partial<GenerationRequest>>({
    problemType: 'multiple_choice',
    difficultyLevel: 50,
    count: 5,
  });

  // Practice state
  const [currentProblem, setCurrentProblem] = useState<PracticeProblem | null>(null);
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [startTime, setStartTime] = useState<number>(0);

  // Analytics state
  const [mastery, setMastery] = useState<KnowledgeMastery[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadMastery();
    }
  }, [user?.id]);

  const loadMastery = async () => {
    try {
      const data = await practiceProblemsService.getMastery();
      setMastery(data.mastery || []);
    } catch (err) {
      console.error('Failed to load mastery:', err);
    }
  };

  const handleGenerateProblems = async () => {
    if (!generationParams.topic || !generationParams.difficultyLevel || !generationParams.problemType) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await practiceProblemsService.generateProblems(
        generationParams as GenerationRequest
      );

      // Start a new session
      const sessionData = await practiceProblemsService.createSession({
        title: `${generationParams.topic} Practice`,
        topic: generationParams.topic,
        difficultyLevel: generationParams.difficultyLevel,
        sessionType: 'practice',
      });

      setCurrentSession(sessionData.session);
      setCurrentProblem(data.problems[0]);
      setStartTime(Date.now());
      setActiveTab('practice');
    } catch (err: any) {
      console.error('Failed to generate problems:', err);
      setError('Failed to generate problems');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentProblem || !currentSession || !userAnswer.trim()) {
      setError('Please enter an answer');
      return;
    }

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await practiceProblemsService.submitAttempt({
        problemId: currentProblem.id,
        sessionId: currentSession.id,
        userAnswer: userAnswer.trim(),
        timeSpent,
      });

      setAttempts([result.attempt, ...attempts]);

      // Show answer feedback
      setShowAnswer(true);

      // Load updated attempts
      const attemptsData = await practiceProblemsService.getAttempts(currentProblem.id);
      setAttempts(attemptsData.attempts || []);
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer');
    }
  };

  const handleNextProblem = async () => {
    setUserAnswer('');
    setShowAnswer(false);
    setStartTime(Date.now());

    // In a real implementation, load next problem
    setCurrentProblem(null);
  };

  const handleCompleteSession = async () => {
    if (!currentSession) return;

    try {
      await practiceProblemsService.completeSession(currentSession.id);
      setCurrentSession(null);
      setCurrentProblem(null);
      setActiveTab('sessions');
      loadMastery();
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Practice Problems</h1>
        <p className="text-gray-600">Generate and practice with AI-created problems</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'generate'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Generate Problems
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'practice'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Practice
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'sessions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm text-red-700 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Generate Problems Tab */}
      {activeTab === 'generate' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Generate New Problems</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={generationParams.topic || ''}
                onChange={(e) => setGenerationParams({ ...generationParams, topic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Algebra, Biology, History"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtopic (optional)
              </label>
              <input
                type="text"
                value={generationParams.subtopic || ''}
                onChange={(e) => setGenerationParams({ ...generationParams, subtopic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Linear Equations, Photosynthesis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problem Type
              </label>
              <select
                value={generationParams.problemType}
                onChange={(e) =>
                  setGenerationParams({
                    ...generationParams,
                    problemType: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="essay">Essay</option>
                <option value="code">Code</option>
                <option value="numeric">Numeric</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level: {generationParams.difficultyLevel}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={generationParams.difficultyLevel}
                onChange={(e) =>
                  setGenerationParams({
                    ...generationParams,
                    difficultyLevel: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Very Easy</span>
                <span>Medium</span>
                <span>Very Hard</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Problems
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={generationParams.count}
                onChange={(e) =>
                  setGenerationParams({
                    ...generationParams,
                    count: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject (optional)
              </label>
              <input
                type="text"
                value={generationParams.subject || ''}
                onChange={(e) =>
                  setGenerationParams({ ...generationParams, subject: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Mathematics, Science"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learning Objectives (optional)
            </label>
            <textarea
              value={generationParams.learningObjectives?.join(', ') || ''}
              onChange={(e) =>
                setGenerationParams({
                  ...generationParams,
                  learningObjectives: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="e.g., Understand quadratic equations, Apply differentiation rules"
            />
          </div>

          <button
            onClick={handleGenerateProblems}
            disabled={isLoading}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate Problems'}
          </button>
        </div>
      )}

      {/* Practice Tab */}
      {activeTab === 'practice' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {currentProblem ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentProblem.topic}</h2>
                  <p className="text-sm text-gray-600">
                    {practiceProblemsService.getProblemTypeLabel(currentProblem.problem_type)} •{' '}
                    {practiceProblemsService.getDifficultyLabel(currentProblem.difficulty_level)}
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {practiceProblemsService.formatPoints(currentProblem.points)}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {practiceProblemsService.formatTime(currentProblem.estimated_time)}
                  </span>
                </div>
              </div>

              {/* Question */}
              <div className="mb-6">
                <div className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Question</h3>
                  <p className="text-gray-800 whitespace-pre-wrap">{currentProblem.question}</p>
                </div>
              </div>

              {/* Answer Input */}
              {!showAnswer ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  {currentProblem.problem_type === 'multiple_choice' && currentProblem.incorrect_options ? (
                    <div className="space-y-2">
                      {[...currentProblem.incorrect_options, currentProblem.correct_answer]
                        .sort()
                        .map((option, index) => (
                          <label
                            key={index}
                            className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="answer"
                              value={option}
                              checked={userAnswer === option}
                              onChange={(e) => setUserAnswer(e.target.value)}
                              className="mr-3"
                            />
                            <span className="text-gray-800">{option}</span>
                          </label>
                        ))}
                    </div>
                  ) : currentProblem.problem_type === 'true_false' ? (
                    <div className="space-y-2">
                      {['True', 'False'].map((option) => (
                        <label
                          key={option}
                          className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="answer"
                            value={option}
                            checked={userAnswer === option}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            className="mr-3"
                          />
                          <span className="text-gray-800">{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Enter your answer here..."
                    />
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">Correct Answer</h3>
                    <p className="text-green-800 mb-4">{currentProblem.correct_answer}</p>
                    <h4 className="text-md font-semibold text-green-900 mb-2">Explanation</h4>
                    <p className="text-green-800 whitespace-pre-wrap">{currentProblem.explanation}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!showAnswer ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleNextProblem}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Next Problem
                    </button>
                    <button
                      onClick={handleCompleteSession}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Complete Session
                    </button>
                  </>
                )}
              </div>

              {/* Hints */}
              {!showAnswer && currentProblem.hints && currentProblem.hints.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Hints Available</h4>
                  <div className="space-y-2">
                    {currentProblem.hints.map((hint: string, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                      >
                        <p className="text-sm text-yellow-800">💡 {hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-600">No active practice session</p>
              <p className="text-sm text-gray-500 mt-2">Generate problems to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Practice Sessions</h2>
          <p className="text-gray-600">View your practice session history and performance.</p>
          {/* Session list would go here */}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Knowledge Mastery */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Knowledge Mastery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mastery.map((m) => (
                <div key={m.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{m.topic}</h3>
                    <span className="text-xl">
                      {practiceProblemsService.getTrendIcon(m.trend)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Score: {Math.round(m.mastery_score)}%</span>
                    <span>
                      {m.correct_attempts}/{m.total_attempts} correct
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-${practiceProblemsService.getMasteryColor(
                        m.mastery_score
                      )}-600`}
                      style={{ width: `${m.mastery_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {mastery.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-600">No mastery data yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Complete some practice sessions to see your progress
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeProblems;
