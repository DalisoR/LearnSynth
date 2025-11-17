import api from './api';

export interface LearningHeatmapData {
  date: string;
  hour: number;
  intensity: number;
  activityCount: number;
  totalTime: number;
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
  dayOfWeek: number;
  averageStudyTime: number;
  averageSessions: number;
  productivityScore: number;
  mostProductiveHour: number;
}

export interface HourlyPattern {
  hour: number;
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
  focusScore: number;
  consistencyScore: number;
  productivityScore: number;
}

export interface ProductivityDashboardData {
  heatmap: LearningHeatmapData[];
  insights: ProductivityInsight[];
  weekly: WeeklyPattern[];
  hourly: HourlyPattern[];
  streak: StudyStreak;
  efficiency: EfficiencyMetrics;
}

class ProductivityService {
  /**
   * Get learning heatmap data
   */
  async getLearningHeatmap(userId: string, weeks: number = 12): Promise<LearningHeatmapData[]> {
    const response = await api.get(`/productivity/heatmap/${userId}`, {
      params: { weeks },
    });
    return response.data.heatmap;
  }

  /**
   * Get productivity insights
   */
  async getProductivityInsights(userId: string): Promise<ProductivityInsight[]> {
    const response = await api.get(`/productivity/insights/${userId}`);
    return response.data.insights;
  }

  /**
   * Get weekly study patterns
   */
  async getWeeklyPattern(userId: string): Promise<WeeklyPattern[]> {
    const response = await api.get(`/productivity/weekly-pattern/${userId}`);
    return response.data.pattern;
  }

  /**
   * Get hourly study patterns
   */
  async getHourlyPattern(userId: string): Promise<HourlyPattern[]> {
    const response = await api.get(`/productivity/hourly-pattern/${userId}`);
    return response.data.pattern;
  }

  /**
   * Get study streak information
   */
  async getStudyStreak(userId: string): Promise<StudyStreak> {
    const response = await api.get(`/productivity/streak/${userId}`);
    return response.data.streak;
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics(userId: string): Promise<EfficiencyMetrics> {
    const response = await api.get(`/productivity/efficiency/${userId}`);
    return response.data.efficiency;
  }

  /**
   * Get comprehensive productivity dashboard data
   */
  async getDashboardData(userId: string): Promise<ProductivityDashboardData> {
    const response = await api.get(`/productivity/dashboard/${userId}`);
    return response.data;
  }

  /**
   * Format hour to readable time
   */
  formatHour(hour: number): string {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  }

  /**
   * Get day name from day of week
   */
  getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }

  /**
   * Get color for insight type
   */
  getInsightColor(type: string): {
    bg: string;
    border: string;
    text: string;
  } {
    const colors = {
      peak_time: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
      consistency: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
      efficiency: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
      recommendation: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
      default: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' },
    };
    return colors[type as keyof typeof colors] || colors.default;
  }

  /**
   * Calculate heatmap cell color based on intensity
   */
  getHeatmapColor(intensity: number): string {
    if (intensity === 0) return '#ebedf0';
    if (intensity < 20) return '#9be9a8';
    if (intensity < 40) return '#40c463';
    if (intensity < 60) return '#30a14e';
    if (intensity < 80) return '#216e39';
    return '#116329';
  }

  /**
   * Get intensity level description
   */
  getIntensityLevel(intensity: number): string {
    if (intensity === 0) return 'No activity';
    if (intensity < 20) return 'Minimal';
    if (intensity < 40) return 'Light';
    if (intensity < 60) return 'Moderate';
    if (intensity < 80) return 'Heavy';
    return 'Very Heavy';
  }

  /**
   * Format minutes to readable time
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (mins === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''}`;
    }

    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`;
  }

  /**
   * Get score level and color
   */
  getScoreInfo(score: number): {
    level: string;
    color: string;
    bgColor: string;
  } {
    if (score >= 90) {
      return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (score >= 80) {
      return { level: 'Very Good', color: 'text-green-500', bgColor: 'bg-green-50' };
    } else if (score >= 70) {
      return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (score >= 60) {
      return { level: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { level: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  }
}

export default new ProductivityService();
