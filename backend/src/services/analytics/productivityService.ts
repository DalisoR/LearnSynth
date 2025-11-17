import { supabase } from '../supabase';

export interface LearningHeatmapData {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  intensity: number; // 0-100 (activity level)
  activityCount: number;
  totalTime: number; // in minutes
}

export interface ProductivityInsight {
  type: 'peak_time' | 'consistency' | 'efficiency' | 'recommendation';
  title: string;
  description: string;
  value?: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export interface WeeklyPattern {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  averageStudyTime: number;
  averageSessions: number;
  productivityScore: number;
  mostProductiveHour: number;
}

export interface HourlyPattern {
  hour: number; // 0-23
  averageStudyTime: number;
  activityLevel: number;
  sessionCount: number;
}

export interface StudyStreak {
  current: number;
  longest: number;
  lastStudyDate: string | null;
  history: Array<{
    date: string;
    studied: boolean;
    streakActive: boolean;
  }>;
}

export interface EfficiencyMetrics {
  averageSessionDuration: number;
  mostProductiveDay: string;
  mostProductiveHour: number;
  averageBreaks: number;
  focusScore: number; // 0-100
  consistencyScore: number; // 0-100
  productivityScore: number; // 0-100
}

class ProductivityService {
  /**
   * Get learning activity heatmap data
   */
  async getLearningHeatmap(userId: string, weeks: number = 12): Promise<LearningHeatmapData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    // Get study sessions with timestamps
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('date, duration, activity')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (!sessions || sessions.length === 0) {
      return this.generateEmptyHeatmapData(startDate, endDate);
    }

    // Create heatmap data structure
    const heatmapMap = new Map<string, Map<number, LearningHeatmapData>>();

    // Initialize all days with zero intensity
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      heatmapMap.set(dateStr, new Map());

      for (let hour = 0; hour < 24; hour++) {
        heatmapMap.get(dateStr)!.set(hour, {
          date: dateStr,
          hour,
          intensity: 0,
          activityCount: 0,
          totalTime: 0,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process sessions
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const dateStr = sessionDate.toISOString().split('T')[0];
      const hour = sessionDate.getHours();

      const dayData = heatmapMap.get(dateStr);
      if (dayData && dayData.has(hour)) {
        const existing = dayData.get(hour)!;
        existing.activityCount += 1;
        existing.totalTime += session.duration || 0;

        // Calculate intensity based on time spent and activity count
        // Max intensity when studying 60+ minutes in an hour
        existing.intensity = Math.min(100, (existing.totalTime / 60) * 100);
      }
    });

    // Convert to array
    const heatmapData: LearningHeatmapData[] = [];
    heatmapMap.forEach((hours) => {
      hours.forEach((data) => {
        heatmapData.push(data);
      });
    });

    return heatmapData;
  }

  /**
   * Get productivity insights
   */
  async getProductivityInsights(userId: string): Promise<ProductivityInsight[]> {
    const insights: ProductivityInsight[] = [];

    // Get data
    const [heatmap, weeklyPattern, efficiency] = await Promise.all([
      this.getLearningHeatmap(userId, 4),
      this.getWeeklyPattern(userId),
      this.getEfficiencyMetrics(userId),
    ]);

    // Peak Time Insight
    const peakHour = efficiency.mostProductiveHour;
    insights.push({
      type: 'peak_time',
      title: 'Peak Productivity Time',
      description: `You're most productive around ${this.formatHour(peakHour)}. Schedule important study sessions during this time.`,
      value: this.formatHour(peakHour),
      icon: '⏰',
      color: 'blue',
    });

    // Consistency Insight
    if (efficiency.consistencyScore >= 80) {
      insights.push({
        type: 'consistency',
        title: 'Excellent Consistency',
        description: 'You maintain a very consistent study schedule. Keep up the great work!',
        icon: '🎯',
        color: 'green',
      });
    } else if (efficiency.consistencyScore >= 60) {
      insights.push({
        type: 'consistency',
        title: 'Good Consistency',
        description: 'Your study schedule is fairly consistent. Try to study at the same time each day.',
        icon: '📅',
        color: 'yellow',
      });
    } else {
      insights.push({
        type: 'consistency',
        title: 'Inconsistent Schedule',
        description: 'Your study times vary greatly. Try establishing a regular study routine.',
        icon: '📅',
        color: 'red',
      });
    }

    // Efficiency Insight
    if (efficiency.focusScore >= 80) {
      insights.push({
        type: 'efficiency',
        title: 'High Focus Score',
        description: `You maintain excellent focus with an average session duration of ${Math.round(efficiency.averageSessionDuration)} minutes.`,
        value: `${efficiency.focusScore}/100`,
        icon: '🧠',
        color: 'green',
      });
    } else if (efficiency.focusScore < 50) {
      insights.push({
        type: 'efficiency',
        title: 'Consider Longer Sessions',
        description: 'Your sessions are quite short. Try extending them to 30-45 minutes for better retention.',
        icon: '⏱️',
        color: 'yellow',
      });
    }

    // Recommendation
    if (efficiency.productivityScore < 60) {
      insights.push({
        type: 'recommendation',
        title: 'Boost Productivity',
        description: 'Take regular breaks using the Pomodoro technique (25 min work, 5 min break).',
        icon: '💡',
        color: 'purple',
      });
    }

    return insights;
  }

  /**
   * Get weekly study patterns
   */
  async getWeeklyPattern(userId: string): Promise<WeeklyPattern[]> {
    const heatmap = await this.getLearningHeatmap(userId, 12);

    const weeklyData = new Map<number, {
      totalTime: number;
      sessionCount: number;
      hours: Map<number, number>;
    }>();

    // Initialize
    for (let day = 0; day < 7; day++) {
      weeklyData.set(day, {
        totalTime: 0,
        sessionCount: 0,
        hours: new Map(),
      });
    }

    // Aggregate data by day of week
    heatmap.forEach(data => {
      const date = new Date(data.date);
      const dayOfWeek = date.getDay();

      const dayData = weeklyData.get(dayOfWeek)!;
      dayData.totalTime += data.totalTime;
      dayData.sessionCount += data.activityCount;

      // Track hours
      const hourTotal = dayData.hours.get(data.hour) || 0;
      dayData.hours.set(data.hour, hourTotal + data.totalTime);
    });

    // Calculate patterns
    const patterns: WeeklyPattern[] = [];

    for (let day = 0; day < 7; day++) {
      const dayData = weeklyData.get(day)!;
      const weeks = 12;

      const averageStudyTime = dayData.totalTime / weeks;
      const averageSessions = dayData.sessionCount / weeks;

      // Calculate productivity score (combination of time and consistency)
      const productivityScore = Math.min(100, (averageStudyTime / 60) * 20 + (averageSessions / 3) * 20);

      // Find most productive hour
      let mostProductiveHour = 0;
      let maxTime = 0;
      dayData.hours.forEach((time, hour) => {
        if (time > maxTime) {
          maxTime = time;
          mostProductiveHour = hour;
        }
      });

      patterns.push({
        dayOfWeek: day,
        averageStudyTime,
        averageSessions,
        productivityScore,
        mostProductiveHour,
      });
    }

    return patterns;
  }

  /**
   * Get hourly study patterns
   */
  async getHourlyPattern(userId: string): Promise<HourlyPattern[]> {
    const heatmap = await this.getLearningHeatmap(userId, 12);

    const hourlyMap = new Map<number, {
      totalTime: number;
      activityCount: number;
      dayCount: number;
    }>();

    // Initialize
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, {
        totalTime: 0,
        activityCount: 0,
        dayCount: new Set<string>().size,
      });
    }

    // Aggregate by hour
    heatmap.forEach(data => {
      const hourData = hourlyMap.get(data.hour)!;
      hourData.totalTime += data.totalTime;
      hourData.activityCount += data.activityCount;
    });

    // Convert to array
    const patterns: HourlyPattern[] = [];
    const days = 12 * 7; // 12 weeks * 7 days

    hourlyMap.forEach((data, hour) => {
      patterns.push({
        hour,
        averageStudyTime: data.totalTime / days,
        activityLevel: data.totalTime / days,
        sessionCount: data.activityCount / days,
      });
    });

    return patterns;
  }

  /**
   * Get study streak information
   */
  async getStudyStreak(userId: string): Promise<StudyStreak> {
    // Get all study sessions
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return {
        current: 0,
        longest: 0,
        lastStudyDate: null,
        history: [],
      };
    }

    // Get unique study dates
    const studyDates = new Set(
      sessions.map(s => new Date(s.date).toISOString().split('T')[0])
    );

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check backward from today
    let checkDate = new Date(today);
    while (studyDates.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    const sortedDates = Array.from(studyDates).sort();
    let lastDate: Date | null = null;

    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffTime = date.getTime() - lastDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      lastDate = date;
    });

    longestStreak = Math.max(longestStreak, tempStreak);

    // Build history (last 30 days)
    const history = [];
    const historyDate = new Date(today);
    historyDate.setDate(historyDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const dateStr = historyDate.toISOString().split('T')[0];
      const studied = studyDates.has(dateStr);

      history.push({
        date: dateStr,
        studied,
        streakActive: i < currentStreak,
      });

      historyDate.setDate(historyDate.getDate() + 1);
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      lastStudyDate: sortedDates[sortedDates.length - 1] || null,
      history,
    };
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics(userId: string): Promise<EfficiencyMetrics> {
    const [streak, weeklyPattern, sessions] = await Promise.all([
      this.getStudyStreak(userId),
      this.getWeeklyPattern(userId),
      supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId),
    ]);

    // Calculate average session duration
    const sessionDurations = sessions.data?.map(s => s.duration || 0) || [];
    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    // Find most productive day
    const mostProductiveDayObj = weeklyPattern.reduce((prev, current) =>
      prev.productivityScore > current.productivityScore ? prev : current
    );
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostProductiveDay = dayNames[mostProductiveDayObj.dayOfWeek];

    // Find most productive hour
    const mostProductiveHour = mostProductiveDayObj.mostProductiveHour;

    // Calculate scores
    const focusScore = Math.min(100, (averageSessionDuration / 45) * 100);

    // Consistency based on weekly variation
    const consistencyScore = this.calculateConsistencyScore(weeklyPattern);

    // Overall productivity score
    const productivityScore = Math.round(
      (streak.current / 7) * 30 +
      (focusScore) * 30 +
      (consistencyScore) * 40
    );

    return {
      averageSessionDuration,
      mostProductiveDay,
      mostProductiveHour,
      averageBreaks: 0, // Would need more complex tracking
      focusScore: Math.round(focusScore),
      consistencyScore,
      productivityScore: Math.min(100, productivityScore),
    };
  }

  /**
   * Calculate consistency score based on weekly patterns
   */
  private calculateConsistencyScore(weeklyPattern: WeeklyPattern[]): number {
    const totalTime = weeklyPattern.reduce((sum, w) => sum + w.averageStudyTime, 0);
    const averageTime = totalTime / 7;

    // Calculate variance
    const variance = weeklyPattern.reduce((sum, w) => {
      const diff = w.averageStudyTime - averageTime;
      return sum + (diff * diff);
    }, 0) / 7;

    // Convert to consistency score (lower variance = higher consistency)
    const standardDeviation = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (standardDeviation / averageTime) * 100);

    return Math.round(consistencyScore);
  }

  /**
   * Generate empty heatmap data
   */
  private generateEmptyHeatmapData(startDate: Date, endDate: Date): LearningHeatmapData[] {
    const data: LearningHeatmapData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      for (let hour = 0; hour < 24; hour++) {
        data.push({
          date: dateStr,
          hour,
          intensity: 0,
          activityCount: 0,
          totalTime: 0,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * Format hour to readable time
   */
  private formatHour(hour: number): string {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  }
}

export default new ProductivityService();
