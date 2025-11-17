import api from './api';

export interface LearningMetrics {
  totalStudyTime: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number;
  streak: number;
  totalPoints: number;
  level: number;
}

export interface DailyActivity {
  date: string;
  studyTime: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  pointsEarned: number;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  lessonsCompleted: number;
  totalLessons: number;
  averageScore: number;
  timeSpent: number;
  progress: number;
}

export interface WeeklyProgress {
  week: string;
  totalStudyTime: number;
  averageScore: number;
  lessonsCompleted: number;
  streak: number;
}

export interface QuizPerformance {
  date: string;
  score: number;
  difficulty: string;
  subject: string;
  timeSpent: number;
}

export interface KnowledgeGap {
  topic: string;
  subject: string;
  difficulty: number;
  recommendedReview: boolean;
}

export interface StudyGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  completed: boolean;
}

export interface DashboardData {
  metrics: LearningMetrics;
  activity: DailyActivity[];
  subjects: SubjectProgress[];
  weekly: WeeklyProgress[];
  performance: QuizPerformance[];
  gaps: KnowledgeGap[];
  goals: StudyGoal[];
  recommendations: string[];
}

class AnalyticsService {
  /**
   * Get learning metrics summary
   */
  async getLearningMetrics(userId: string): Promise<LearningMetrics> {
    const response = await api.get(`/analytics-dashboard/metrics/${userId}`);
    return response.data.metrics;
  }

  /**
   * Get daily activity data
   */
  async getDailyActivity(userId: string, days: number = 30): Promise<DailyActivity[]> {
    const response = await api.get(`/analytics-dashboard/activity/${userId}`, {
      params: { days },
    });
    return response.data.activity;
  }

  /**
   * Get progress by subject
   */
  async getSubjectProgress(userId: string): Promise<SubjectProgress[]> {
    const response = await api.get(`/analytics-dashboard/subjects/${userId}`);
    return response.data.progress;
  }

  /**
   * Get weekly progress
   */
  async getWeeklyProgress(userId: string, weeks: number = 12): Promise<WeeklyProgress[]> {
    const response = await api.get(`/analytics-dashboard/weekly/${userId}`, {
      params: { weeks },
    });
    return response.data.progress;
  }

  /**
   * Get quiz performance
   */
  async getQuizPerformance(userId: string, limit: number = 20): Promise<QuizPerformance[]> {
    const response = await api.get(`/analytics-dashboard/quiz-performance/${userId}`, {
      params: { limit },
    });
    return response.data.performance;
  }

  /**
   * Get knowledge gaps
   */
  async getKnowledgeGaps(userId: string): Promise<KnowledgeGap[]> {
    const response = await api.get(`/analytics-dashboard/knowledge-gaps/${userId}`);
    return response.data.gaps;
  }

  /**
   * Get study goals
   */
  async getStudyGoals(userId: string): Promise<StudyGoal[]> {
    const response = await api.get(`/analytics-dashboard/goals/${userId}`);
    return response.data.goals;
  }

  /**
   * Get learning recommendations
   */
  async getRecommendations(userId: string): Promise<string[]> {
    const response = await api.get(`/analytics-dashboard/recommendations/${userId}`);
    return response.data.recommendations;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    const response = await api.get(`/analytics-dashboard/dashboard/${userId}`);
    return response.data;
  }

  /**
   * Format study time from minutes to readable format
   */
  formatStudyTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0
      ? `${days}d ${remainingHours}h`
      : `${days}d`;
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  }

  /**
   * Get performance level based on score
   */
  getPerformanceLevel(score: number): {
    level: string;
    color: string;
  } {
    if (score >= 90) {
      return { level: 'Excellent', color: '#10b981' }; // Green
    } else if (score >= 80) {
      return { level: 'Good', color: '#3b82f6' }; // Blue
    } else if (score >= 70) {
      return { level: 'Average', color: '#f59e0b' }; // Yellow
    } else if (score >= 60) {
      return { level: 'Below Average', color: '#f97316' }; // Orange
    } else {
      return { level: 'Needs Improvement', color: '#ef4444' }; // Red
    }
  }
}

export default new AnalyticsService();
