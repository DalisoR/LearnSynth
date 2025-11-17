import { supabase } from '../supabase';

export interface LearningMetrics {
  totalStudyTime: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number;
  streak: number;
  totalPoints: number;
  level: number;
}

export interface StudySession {
  id: string;
  date: string;
  duration: number; // in minutes
  subject: string;
  activity: string;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  lessonsCompleted: number;
  totalLessons: number;
  averageScore: number;
  timeSpent: number; // in minutes
  progress: number; // percentage
}

export interface DailyActivity {
  date: string;
  studyTime: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  pointsEarned: number;
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
  difficulty: number; // 0-100
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

class AnalyticsService {
  /**
   * Get comprehensive learning metrics for a user
   */
  async getLearningMetrics(userId: string): Promise<LearningMetrics> {
    try {
      // Get study sessions
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId);

      const totalStudyTime = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

      // Get completed lessons
      const { count: lessonsCompleted } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true);

      // Get quiz statistics
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('score, difficulty')
        .eq('user_id', userId);

      const quizzesTaken = quizAttempts?.length || 0;
      const averageQuizScore = quizAttempts && quizAttempts.length > 0
        ? quizAttempts.reduce((sum, q) => sum + (q.score || 0), 0) / quizAttempts.length
        : 0;

      // Calculate streak (simplified)
      const streak = await this.calculateStreak(userId);

      // Get points from gamification
      const { data: points } = await supabase
        .from('user_achievements')
        .select('points')
        .eq('user_id', userId);

      const totalPoints = points?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;
      const level = Math.floor(totalPoints / 1000) + 1;

      return {
        totalStudyTime,
        lessonsCompleted: lessonsCompleted || 0,
        quizzesTaken,
        averageQuizScore,
        streak,
        totalPoints,
        level,
      };
    } catch (error) {
      console.error('Error fetching learning metrics:', error);
      return {
        totalStudyTime: 0,
        lessonsCompleted: 0,
        quizzesTaken: 0,
        averageQuizScore: 0,
        streak: 0,
        totalPoints: 0,
        level: 1,
      };
    }
  }

  /**
   * Get daily activity for the last 30 days
   */
  async getDailyActivity(userId: string, days: number = 30): Promise<DailyActivity[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('date, duration, subject, activity')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    // Get quiz attempts
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('created_at, score')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Group by date
    const activityMap = new Map<string, DailyActivity>();

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      activityMap.set(dateStr, {
        date: dateStr,
        studyTime: 0,
        lessonsCompleted: 0,
        quizzesTaken: 0,
        pointsEarned: 0,
      });
    }

    // Add study sessions
    sessions?.forEach(session => {
      const dateStr = new Date(session.date).toISOString().split('T')[0];
      const activity = activityMap.get(dateStr);
      if (activity) {
        activity.studyTime += session.duration || 0;
        if (session.activity === 'lesson' || session.activity === 'lesson_complete') {
          activity.lessonsCompleted += 1;
        }
      }
    });

    // Add quiz attempts
    quizzes?.forEach(quiz => {
      const dateStr = new Date(quiz.created_at).toISOString().split('T')[0];
      const activity = activityMap.get(dateStr);
      if (activity) {
        activity.quizzesTaken += 1;
        activity.pointsEarned += Math.floor(quiz.score / 10); // Simple points calculation
      }
    });

    return Array.from(activityMap.values());
  }

  /**
   * Get progress by subject
   */
  async getSubjectProgress(userId: string): Promise<SubjectProgress[]> {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name');

    if (!subjects) return [];

    const progressPromises = subjects.map(async (subject) => {
      // Get lesson progress
      const { count: totalLessons } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subject.id);

      const { count: completedLessons } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('chapter_id', subject.id)
        .eq('completed', true);

      // Get average quiz score
      const { data: quizzes } = await supabase
        .from('quiz_attempts')
        .select('score')
        .eq('user_id', userId)
        .eq('subject_id', subject.id);

      const averageScore = quizzes && quizzes.length > 0
        ? quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length
        : 0;

      // Get time spent
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .eq('subject', subject.name);

      const timeSpent = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

      const total = totalLessons || 0;
      const completed = completedLessons || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        lessonsCompleted: completed,
        totalLessons: total,
        averageScore,
        timeSpent,
        progress,
      };
    });

    return Promise.all(progressPromises);
  }

  /**
   * Get weekly progress for the last 12 weeks
   */
  async getWeeklyProgress(userId: string, weeks: number = 12): Promise<WeeklyProgress[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    const weeklyData: WeeklyProgress[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Get sessions for this week
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .gte('date', weekStart.toISOString())
        .lt('date', weekEnd.toISOString());

      const totalStudyTime = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

      // Get quiz scores for this week
      const { data: quizzes } = await supabase
        .from('quiz_attempts')
        .select('score')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString());

      const averageScore = quizzes && quizzes.length > 0
        ? quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length
        : 0;

      const lessonsCompleted = sessions?.length || 0;
      const streak = await this.calculateStreak(userId);

      weeklyData.push({
        week: weekStart.toISOString().split('T')[0],
        totalStudyTime,
        averageScore,
        lessonsCompleted,
        streak,
      });
    }

    return weeklyData;
  }

  /**
   * Get quiz performance over time
   */
  async getQuizPerformance(userId: string, limit: number = 20): Promise<QuizPerformance[]> {
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select(`
        created_at,
        score,
        difficulty,
        subject_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!quizzes) return [];

    // Get subject names
    const subjectIds = [...new Set(quizzes.map(q => q.subject_id))];
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds);

    const subjectMap = new Map(subjects?.map(s => [s.id, s.name]) || []);

    return quizzes.map(quiz => ({
      date: new Date(quiz.created_at).toISOString().split('T')[0],
      score: quiz.score || 0,
      difficulty: quiz.difficulty || 'medium',
      subject: subjectMap.get(quiz.subject_id) || 'Unknown',
      timeSpent: 0, // Could be calculated from start/end times
    }));
  }

  /**
   * Get knowledge gaps (areas needing improvement)
   */
  async getKnowledgeGaps(userId: string): Promise<KnowledgeGap[]> {
    // This would typically use ML to analyze quiz results and identify weak areas
    // For now, returning mock data
    return [
      {
        topic: 'Algebraic Equations',
        subject: 'Mathematics',
        difficulty: 75,
        recommendedReview: true,
      },
      {
        topic: 'Cell Biology',
        subject: 'Biology',
        difficulty: 60,
        recommendedReview: true,
      },
      {
        topic: 'World War II',
        subject: 'History',
        difficulty: 45,
        recommendedReview: false,
      },
    ];
  }

  /**
   * Get study goals progress
   */
  async getStudyGoals(userId: string): Promise<StudyGoal[]> {
    // Mock data - would integrate with actual goals table
    return [
      {
        id: '1',
        title: 'Complete 20 Lessons',
        target: 20,
        current: 12,
        unit: 'lessons',
        deadline: '2025-12-31',
        completed: false,
      },
      {
        id: '2',
        title: 'Study 50 Hours',
        target: 50,
        current: 35,
        unit: 'hours',
        deadline: '2025-12-31',
        completed: false,
      },
      {
        id: '3',
        title: 'Achieve 85% Quiz Average',
        target: 85,
        current: 88,
        unit: 'percent',
        deadline: '2025-11-30',
        completed: true,
      },
    ];
  }

  /**
   * Calculate current study streak
   */
  private async calculateStreak(userId: string): Promise<number> {
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (!sessions || sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * Get learning recommendations
   */
  async getRecommendations(userId: string): Promise<string[]> {
    const metrics = await this.getLearningMetrics(userId);
    const gaps = await this.getKnowledgeGaps(userId);

    const recommendations = [];

    if (metrics.streak < 3) {
      recommendations.push('Try to maintain a consistent daily study habit to build your streak!');
    }

    if (metrics.averageQuizScore < 70) {
      recommendations.push('Consider reviewing the material before taking quizzes to improve your scores.');
    }

    if (gaps.some(g => g.recommendedReview)) {
      recommendations.push('Focus on the knowledge gaps we identified to strengthen your understanding.');
    }

    if (metrics.totalStudyTime < 300) { // Less than 5 hours
      recommendations.push('Increase your study time to reach your learning goals faster.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! Keep up the excellent work.');
    }

    return recommendations;
  }
}

export default new AnalyticsService();
