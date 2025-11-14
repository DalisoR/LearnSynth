export type BloomLevel =
  | 'remember'      // Recall facts
  | 'understand'    // Explain ideas
  | 'apply'         // Use knowledge
  | 'analyze'       // Break down concepts
  | 'evaluate'      // Make judgments
  | 'create';       // Produce new work

export type QuestionType = 'mcq' | 'short-answer' | 'essay' | 'matching' | 'fill-blank' | 'scenario';

export type AssessmentType = 'checkpoint' | 'final' | 'practice' | 'remediation';

export interface Assessment {
  id: string;
  lessonId: string;
  type: AssessmentType;
  title: string;
  description?: string;
  questions: Question[];
  timeLimit?: number; // minutes
  passingScore: number; // percentage
  maxAttempts: number;
  randomizeQuestions: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  bloomDistribution: BloomDistribution;
  createdAt: Date;
}

export interface BloomDistribution {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  bloomLevel: BloomLevel;
  difficulty: number; // 1-5
  topic: string;
  question: string;
  options?: string[]; // For MCQ
  correctAnswer: string | string[];
  explanation?: string;
  hint?: string;
  points: number;
  tags?: string[];
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  responses: QuestionResponse[];
  score: number; // percentage
  timeSpent: number; // seconds
  startedAt: Date;
  completedAt?: Date;
  attemptNumber: number;
}

export interface QuestionResponse {
  questionId: string;
  response: string | string[];
  isCorrect: boolean;
  timeSpent: number; // seconds on this question
  hintsUsed: number;
}

export interface AssessmentAnalytics {
  assessmentId: string;
  totalAttempts: number;
  averageScore: number;
  averageTime: number;
  passRate: number;
  questionAnalytics: QuestionAnalytics[];
  bloomLevelPerformance: { [key in BloomLevel]: number };
  difficultyAnalysis: { [key: number]: number };
}

export interface QuestionAnalytics {
  questionId: string;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTime: number;
  hintUsage: number;
  difficultyRating: number; // Actual difficulty based on performance
}

export interface LearningGap {
  topic: string;
  bloomLevel: BloomLevel;
  masteryScore: number; // 0-100
  recommendedActions: string[];
  relatedQuestions: string[];
}

export interface CompetencyMapping {
  competency: string;
  requiredQuestions: string[];
  masteryThreshold: number;
  currentLevel: number; // 0-100
}
