import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProgressData {
  chapterId: string;
  progress: number;
  isCompleted: boolean;
  bestScore: number;
  quizAttempts: number;
  timeSpent: number;
  masteryLevel: 'novice' | 'developing' | 'proficient' | 'mastered';
}

interface ProgressTrackerProps {
  chapterId: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ chapterId }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chapterId && user) {
      fetchProgress();
    }
  }, [chapterId, user]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/progress/${chapterId}?userId=${user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'mastered': return 'bg-purple-100 text-purple-800';
      case 'proficient': return 'bg-blue-100 text-blue-800';
      case 'developing': return 'bg-yellow-100 text-yellow-800';
      case 'novice': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMasteryIcon = (level: string) => {
    switch (level) {
      case 'mastered': return <Award className="w-4 h-4" />;
      case 'proficient': return <CheckCircle className="w-4 h-4" />;
      case 'developing': return <TrendingUp className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Loading progress...
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="mb-2">No progress yet</div>
        <div className="text-sm">Start reading and take quizzes to track your progress!</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Reading Progress</span>
          <span className="text-sm text-gray-600">{progress.progress}%</span>
        </div>
        <Progress value={progress.progress} className="h-2" />
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mastery Level */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Mastery</span>
            <Badge className={getMasteryColor(progress.masteryLevel)}>
              <span className="flex items-center gap-1">
                {getMasteryIcon(progress.masteryLevel)}
                {progress.masteryLevel}
              </span>
            </Badge>
          </div>
        </div>

        {/* Best Score */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Best Score</span>
            <span className="text-sm font-bold">{progress.bestScore.toFixed(0)}%</span>
          </div>
          <Progress value={progress.bestScore} className="h-1" />
        </div>

        {/* Quiz Attempts */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Quiz Attempts</span>
            <span className="text-sm font-bold">{progress.quizAttempts}</span>
          </div>
        </div>

        {/* Time Spent */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Time Spent</span>
            <span className="text-sm font-bold">{formatTime(progress.timeSpent)}</span>
          </div>
        </div>
      </div>

      {/* Completion Status */}
      {progress.isCompleted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Chapter Completed!</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Congratulations! You've successfully completed this chapter.
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">In Progress</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Keep reading and take the quiz to complete this chapter.
          </p>
        </div>
      )}

      {/* Next Steps */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-semibold mb-2">Next Steps:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          {!progress.isCompleted && (
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Continue reading to reach 100% progress
            </li>
          )}
          {progress.bestScore < 70 && (
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
              Retake quiz to score 70% or higher
            </li>
          )}
          {progress.masteryLevel === 'novice' && (
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
              Achieve mastery level through practice
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProgressTracker;