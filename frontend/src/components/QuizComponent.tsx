import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: number;
  points: number;
}

interface Quiz {
  id: string;
  chapterId: string;
  title: string;
  questions: Question[];
  timeLimit?: number;
  passMark: number;
  totalPoints: number;
}

interface QuizResult {
  quizId: string;
  userId: string;
  answers: {
    questionId: string;
    answer: string | number;
    isCorrect: boolean;
    pointsEarned: number;
  }[];
  score: number;
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;
  timeSpent: number;
  completedAt: Date;
}

interface QuizComponentProps {
  chapterId: string;
  onComplete: (result: QuizResult) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({ chapterId, onComplete }) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    generateQuiz();
  }, [chapterId]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/learning/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          chapterId,
          questionCount: 5,
          adaptive: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setQuiz(data.quiz);
        if (data.quiz.timeLimit) {
          setTimeLeft(data.quiz.timeLimit * 60);
        }
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz || !user) return;

    setSubmitted(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Format answers for submission
    const quizAnswers = quiz.questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || '',
      isCorrect: false, // Will be calculated by backend
      pointsEarned: 0
    }));

    try {
      const response = await fetch('http://localhost:4000/api/learning/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quizId: quiz.id,
          userId: user.id,
          answers: quizAnswers,
          timeSpent
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.result);
        onComplete(data.result);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-100 text-green-800';
    if (difficulty <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm">Generating quiz...</div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8 text-gray-500">
        Failed to generate quiz. Please try again.
      </div>
    );
  }

  if (submitted && result) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {result.passed ? (
              <CheckCircle className="w-16 h-16 text-green-600" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <CardTitle className="text-center">
            {result.passed ? 'Congratulations! You passed!' : 'Keep Learning!'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold mb-2">{result.score.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">
              You earned {result.earnedPoints} out of {result.totalPoints} points
            </div>
          </div>
          {result.passed && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
              <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 text-sm font-semibold">
                Great job! You've mastered this chapter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Quiz</CardTitle>
          {timeLeft > 0 && (
            <div className="flex items-center space-x-2 text-red-600">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        <Progress value={progress} />
        <div className="text-sm text-gray-600 mt-2">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">{question.question}</h4>
            <div className="flex items-center space-x-2">
              <Badge className={getDifficultyColor(question.difficulty)}>
                Level {question.difficulty}
              </Badge>
              <Badge variant="outline">
                {question.points} {question.points === 1 ? 'point' : 'points'}
              </Badge>
            </div>
          </div>

          {/* Multiple Choice Questions */}
          {question.type === 'multiple-choice' && question.options && (
            <RadioGroup
              value={answers[question.id]?.toString() || ''}
              onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
            >
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* True/False Questions */}
          {question.type === 'true-false' && (
            <RadioGroup
              value={answers[question.id]?.toString() || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="true" id="true-option" />
                <Label htmlFor="true-option" className="flex-1 cursor-pointer font-medium text-green-700">
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="false" id="false-option" />
                <Label htmlFor="false-option" className="flex-1 cursor-pointer font-medium text-red-700">
                  False
                </Label>
              </div>
            </RadioGroup>
          )}

          {/* Short Answer / Fill-in-Blank / Definition / One-Word Questions */}
          {(question.type === 'short-answer' ||
            question.type === 'scenario' ||
            question.type === 'matching' ||
            question.type === 'fill-blank' ||
            question.type === 'fill-in-blank' ||
            question.type === 'definition' ||
            question.type === 'one-word' ||
            question.type === 'numerical' ||
            question.type === 'keyword') && (
            <div>
              <textarea
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={question.type === 'numerical' || question.type === 'one-word' || question.type === 'keyword' ? 1 : 4}
                placeholder={
                  question.type === 'numerical' ? 'Enter a number (e.g., 42, 3.14, 1000)' :
                  question.type === 'one-word' || question.type === 'keyword' ? 'Enter one word or a short phrase' :
                  'Type your answer here...'
                }
                value={answers[question.id]?.toString() || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2">
                {question.type === 'numerical' ? '🔢 Enter a numerical value' :
                 question.type === 'one-word' ? '📝 Single word answer' :
                 question.type === 'keyword' ? '🔑 Key term or phrase' :
                 '💡 Tip: Your answer will be checked for understanding, not just exact wording!'}
              </p>
            </div>
          )}

          {/* Fallback for any unhandled question types */}
          {!['multiple-choice', 'true-false', 'short-answer', 'scenario', 'matching', 'fill-blank', 'fill-in-blank', 'definition', 'one-word', 'numerical', 'keyword'].includes(question.type) && (
            <div>
              {question.options && question.options.length > 0 ? (
                <RadioGroup
                  value={answers[question.id]?.toString() || ''}
                  onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                >
                  {question.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div>
                  <textarea
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Type your answer here..."
                    value={answers[question.id]?.toString() || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 This question type requires a text answer
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion < quiz.questions.length - 1 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              Submit Quiz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizComponent;