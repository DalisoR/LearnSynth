export interface LessonGenerationRequest {
  chapterTitle: string;
  chapterContent: string;
  chapterNumber: number;
  documentTitle: string;
  subjectId?: string;
  knowledgeBaseContext?: string;
  style?: 'easy' | 'standard' | 'detailed';
  includeVisuals?: boolean;
}

export interface Concept {
  name: string;
  description: string;
  example: string;
  analogy: string;
  whyItMatters: string;
}

export interface Explanation {
  overview: string;
  concepts: Concept[];
  stepByStepGuide: string[];
  realWorldApplications: string[];
  keyTakeaways: string[];
}

export interface VisualAid {
  type: 'diagram' | 'chart' | 'illustration' | 'infographic' | 'diagram-mermaid';
  title: string;
  description: string;
  content: string; // The data or description for visualization
  prompt: string; // For AI image generation
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface Reflection {
  type: 'written' | 'practical' | 'inquiry' | 'connect';
  prompt: string;
  wordLimit?: number;
  examples?: number;
}

export interface Assessment {
  questions: QuizQuestion[];
  reflections: Reflection[];
  passingScore: number;
  timeLimit: number; // minutes
  totalPoints: number;
}

export interface ComprehensiveLesson {
  id?: string;
  chapterId: string;
  lessonTitle: string;
  summary: string;
  learningObjectives: string[];
  explanation: Explanation;
  visualAids: VisualAid[];
  quizzes: QuizQuestion[];
  reflection: {
    prompts: Reflection[];
    guidingQuestions: string[];
    journalingTemplate: string;
  };
  finalAssessment: Assessment;
  duration: number; // estimated minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
  references: Array<{
    source: string;
    chapter: string;
    url?: string;
  }>;
  narrationText: string;
  knowledgeBaseContext?: string;
}
