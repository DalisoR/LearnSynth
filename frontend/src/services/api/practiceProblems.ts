import api from './api';

export interface PracticeProblem {
  id: string;
  user_id: string;
  subject_id?: string;
  topic: string;
  subtopic?: string;
  difficulty_level: number;
  problem_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'essay' | 'code' | 'numeric';
  question: string;
  question_data?: any;
  correct_answer: string;
  incorrect_options?: string[];
  explanation: string;
  hints?: any;
  tags?: string[];
  points: number;
  estimated_time: number;
  ai_generated: boolean;
  generation_context?: any;
  created_at: string;
  updated_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  title?: string;
  subject_id?: string;
  topic?: string;
  difficulty_level: number;
  problem_count: number;
  completed_problems: number;
  correct_answers: number;
  total_time: number;
  session_type: 'practice' | 'test' | 'review' | 'adaptive';
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeAttempt {
  id: string;
  problem_id: string;
  user_id: string;
  session_id?: string;
  user_answer: string;
  is_correct: boolean;
  time_spent: number;
  attempt_number: number;
  hints_used: number;
  difficulty_rating?: number;
  confidence_level?: number;
  mistake_type?: string;
  learning_notes?: string;
  created_at: string;
}

export interface GenerationRequest {
  topic: string;
  subtopic?: string;
  difficultyLevel: number;
  problemType: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'essay' | 'code' | 'numeric';
  count: number;
  subject?: string;
  learningObjectives?: string[];
  context?: string;
}

export interface KnowledgeMastery {
  id: string;
  user_id: string;
  subject_id?: string;
  topic: string;
  subtopic?: string;
  difficulty_level: number;
  total_attempts: number;
  correct_attempts: number;
  average_time: number;
  mastery_score: number;
  trend: 'improving' | 'declining' | 'stable';
  last_practiced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetrics {
  summary: {
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    averageTime: number;
  };
  topicStats: Array<{
    topic: string;
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    averageTime: number;
  }>;
}

export interface ProblemEvaluation {
  isCorrect: boolean;
  score: number;
  feedback: string;
  correctAnswer: string;
  explanation: string;
}

class PracticeProblemsService {
  private readonly baseUrl = '/practice-problems';

  // ========================================
  // PROBLEM GENERATION
  // ========================================

  async generateProblems(data: GenerationRequest) {
    const response = await api.post(`${this.baseUrl}/generate`, data);
    return response.data;
  }

  async generatePersonalizedSet(subjectId: string, targetSkills: string[], count?: number) {
    const response = await api.post(`${this.baseUrl}/generate-personalized`, {
      subjectId,
      targetSkills,
      count,
    });
    return response.data;
  }

  // ========================================
  // PRACTICE SESSIONS
  // ========================================

  async createSession(data: {
    title?: string;
    subjectId?: string;
    topic?: string;
    difficultyLevel?: number;
    sessionType?: 'practice' | 'test' | 'review' | 'adaptive';
  }) {
    const response = await api.post(`${this.baseUrl}/sessions`, data);
    return response.data;
  }

  async getSessions(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await api.get(`${this.baseUrl}/sessions?${params.toString()}`);
    return response.data;
  }

  async getSession(sessionId: string) {
    const response = await api.get(`${this.baseUrl}/sessions/${sessionId}`);
    return response.data;
  }

  async completeSession(sessionId: string) {
    const response = await api.put(`${this.baseUrl}/sessions/${sessionId}/complete`);
    return response.data;
  }

  // ========================================
  // PROBLEMS & ATTEMPTS
  // ========================================

  async getProblems(options?: {
    topic?: string;
    subjectId?: string;
    difficultyLevel?: number;
    problemType?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.topic) params.append('topic', options.topic);
    if (options?.subjectId) params.append('subjectId', options.subjectId);
    if (options?.difficultyLevel) params.append('difficultyLevel', options.difficultyLevel.toString());
    if (options?.problemType) params.append('problemType', options.problemType);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.get(`${this.baseUrl}/problems?${params.toString()}`);
    return response.data;
  }

  async submitAttempt(data: {
    problemId: string;
    sessionId?: string;
    userAnswer: string;
    timeSpent: number;
    hintsUsed?: number;
  }) {
    const response = await api.post(`${this.baseUrl}/attempts`, data);
    return response.data;
  }

  async getAttempts(problemId: string) {
    const response = await api.get(`${this.baseUrl}/problems/${problemId}/attempts`);
    return response.data;
  }

  // ========================================
  // ANALYTICS & PERFORMANCE
  // ========================================

  async getPerformance(options?: {
    topic?: string;
    subjectId?: string;
    timeframe?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.topic) params.append('topic', options.topic);
    if (options?.subjectId) params.append('subjectId', options.subjectId);
    if (options?.timeframe) params.append('timeframe', options.timeframe);

    const response = await api.get(`${this.baseUrl}/performance?${params.toString()}`);
    return response.data;
  }

  async getMastery(subjectId?: string, topic?: string) {
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', subjectId);
    if (topic) params.append('topic', topic);

    const response = await api.get(`${this.baseUrl}/mastery?${params.toString()}`);
    return response.data;
  }

  async getRecommendations(topic: string, subjectId?: string) {
    const params = new URLSearchParams();
    params.append('topic', topic);
    if (subjectId) params.append('subjectId', subjectId);

    const response = await api.get(`${this.baseUrl}/recommendations?${params.toString()}`);
    return response.data;
  }

  // ========================================
  // PROBLEM TEMPLATES
  // ========================================

  async getTemplates(options?: {
    topic?: string;
    problemType?: string;
    difficultyLevel?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.topic) params.append('topic', options.topic);
    if (options?.problemType) params.append('problemType', options.problemType);
    if (options?.difficultyLevel) params.append('difficultyLevel', options.difficultyLevel.toString());

    const response = await api.get(`${this.baseUrl}/templates?${params.toString()}`);
    return response.data;
  }

  async createFromTemplate(templateId: string, customizations?: any) {
    const response = await api.post(`${this.baseUrl}/from-template/${templateId}`, {
      customizations,
    });
    return response.data;
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  getProblemTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      multiple_choice: '✅',
      true_false: '✓',
      short_answer: '✏️',
      fill_blank: '___',
      essay: '📄',
      code: '💻',
      numeric: '🔢',
    };
    return icons[type] || '❓';
  }

  getProblemTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      short_answer: 'Short Answer',
      fill_blank: 'Fill in the Blank',
      essay: 'Essay',
      code: 'Code',
      numeric: 'Numeric',
    };
    return labels[type] || type;
  }

  getDifficultyLabel(difficulty: number): string {
    if (difficulty >= 80) return 'Very Hard';
    if (difficulty >= 60) return 'Hard';
    if (difficulty >= 40) return 'Medium';
    if (difficulty >= 20) return 'Easy';
    return 'Very Easy';
  }

  getDifficultyColor(difficulty: number): string {
    if (difficulty >= 80) return 'red';
    if (difficulty >= 60) return 'orange';
    if (difficulty >= 40) return 'yellow';
    if (difficulty >= 20) return 'green';
    return 'blue';
  }

  getMasteryColor(score: number): string {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    if (score >= 20) return 'orange';
    return 'red';
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  formatPoints(points: number): string {
    return `${points} pts`;
  }

  calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }

  getAccuracyLabel(accuracy: number): string {
    if (accuracy >= 90) return 'Excellent';
    if (accuracy >= 80) return 'Very Good';
    if (accuracy >= 70) return 'Good';
    if (accuracy >= 60) return 'Fair';
    return 'Needs Improvement';
  }

  getTrendIcon(trend: string): string {
    const icons: { [key: string]: string } = {
      improving: '📈',
      declining: '📉',
      stable: '➡️',
    };
    return icons[trend] || '➡️';
  }

  getSessionTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      practice: '🎯',
      test: '📝',
      review: '🔄',
      adaptive: '🧠',
    };
    return icons[type] || '❓';
  }

  getSessionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      practice: 'Practice',
      test: 'Test',
      review: 'Review',
      adaptive: 'Adaptive',
    };
    return labels[type] || type;
  }

  getProblemCountBadge(count: number): { label: string; color: string } {
    if (count === 0) return { label: 'No problems', color: 'gray' };
    if (count < 5) return { label: `${count} problems`, color: 'blue' };
    if (count < 10) return { label: `${count} problems`, color: 'green' };
    return { label: `${count} problems`, color: 'purple' };
  }
}

const practiceProblemsService = new PracticeProblemsService();
export default practiceProblemsService;
