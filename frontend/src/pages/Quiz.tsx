import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

const Quiz: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(location.state?.quiz || null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState(quiz?.timeLimit ? quiz.timeLimit * 60 : 0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!quiz && chapterId) {
      // If no quiz in state, redirect
      navigate(`/learning/chapter/${chapterId}`);
      return;
    }
  }, [quiz, chapterId]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

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

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading quiz...</div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {result.passed ? (
                <CheckCircle className="w-20 h-20 text-green-600" />
              ) : (
                <XCircle className="w-20 h-20 text-red-600" />
              )}
            </div>
            <CardTitle className="text-3xl mb-2">
              {result.passed ? 'Congratulations!' : 'Keep Learning!'}
            </CardTitle>
            <div className="text-5xl font-bold mb-2">
              {result.score.toFixed(0)}%
            </div>
            <div className="text-gray-600">
              You earned {result.earnedPoints} out of {result.totalPoints} points
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.answers.filter(a => a.isCorrect).length}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {result.answers.filter(a => !a.isCorrect).length}
                </div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(result.timeSpent)}
                </div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
            </div>
            {result.passed && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-semibold">
                  You've mastered this chapter! The next chapter is now unlocked.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {quiz.questions.map((question, index) => {
            const userAnswer = result.answers.find(a => a.questionId === question.id);
            const isCorrect = userAnswer?.isCorrect || false;

            return (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        Level {question.difficulty}
                      </Badge>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{question.question}</p>

                  {question.type === 'multiple-choice' && question.options && (
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optIndex) => {
                        const isUserAnswer = userAnswer?.answer === optIndex;
                        const isCorrectAnswer = question.correctAnswer === optIndex;

                        return (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? 'bg-green-50 border-green-300'
                                : isUserAnswer && !isCorrectAnswer
                                ? 'bg-red-50 border-red-300'
                                : 'bg-gray-50'
                            }`}
                          >
                            {option}
                            {isCorrectAnswer && (
                              <CheckCircle className="inline w-4 h-4 text-green-600 ml-2" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle className="inline w-4 h-4 text-red-600 ml-2" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-800 mb-1">Explanation:</p>
                    <p className="text-sm text-blue-700">{question.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center space-x-4 mt-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/learning/chapter/${quiz.chapterId}`)}
          >
            Review Chapter
          </Button>
          <Button
            onClick={() => navigate(`/learning/dashboard/${quiz.chapterId.split('-')[0]}`)}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">{quiz.title}</h1>
            {timeLeft > 0 && (
              <div className="flex items-center space-x-2 text-red-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
          <Progress value={progress} />
          <div className="text-sm text-gray-600 mt-1">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question {currentQuestion + 1}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge className={getDifficultyColor(question.difficulty)}>
                  Level {question.difficulty}
                </Badge>
                <Badge variant="outline">
                  {question.points} {question.points === 1 ? 'point' : 'points'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{question.question}</p>

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

            <div className="flex justify-between mt-6">
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
      </div>
    </div>
  );
};

export default Quiz;