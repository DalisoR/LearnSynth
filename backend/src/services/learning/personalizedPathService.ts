import { supabase } from '../supabase';

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING = 'reading',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface LearningPath {
  id: string;
  userId: string;
  name: string;
  description: string;
  subject: string;
  estimatedDuration: number;
  difficultyLevel: DifficultyLevel;
  learningStyle: LearningStyle;
  prerequisites: string[];
  goals: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PathStep {
  id: string;
  pathId: string;
  order: number;
  title: string;
  description: string;
  type: 'lesson' | 'quiz' | 'practice' | 'review';
  contentId?: string;
  estimatedTime: number;
  difficulty: DifficultyLevel;
  completed: boolean;
  completedAt?: Date;
}

export class PersonalizedPathService {
  async createLearningPath(
    userId: string,
    options: {
      subject: string;
      goals: string[];
      learningStyle?: LearningStyle;
      difficulty?: DifficultyLevel;
      timeAvailable?: number;
    }
  ): Promise<LearningPath> {
    const userStats = await this.getUserLearningStats(userId);
    const style = options.learningStyle || this.detectLearningStyle(userStats);
    const difficulty = options.difficulty || this.recommendDifficulty(userStats);

    const path = await this.generatePersonalizedPath(userId, options, style, difficulty);

    return path;
  }

  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    const { data } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data?.map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      description: item.description,
      subject: item.subject,
      estimatedDuration: item.estimated_duration,
      difficultyLevel: item.difficulty_level,
      learningStyle: item.learning_style,
      prerequisites: item.prerequisites || [],
      goals: item.goals || [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    })) || [];
  }

  async getLearningPathSteps(pathId: string): Promise<PathStep[]> {
    const { data } = await supabase
      .from('learning_path_steps')
      .select('*')
      .eq('path_id', pathId)
      .order('order', { ascending: true });

    return data?.map(item => ({
      id: item.id,
      pathId: item.path_id,
      order: item.order,
      title: item.title,
      description: item.description,
      type: item.type,
      contentId: item.content_id,
      estimatedTime: item.estimated_time,
      difficulty: item.difficulty,
      completed: item.completed,
      completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
    })) || [];
  }

  async updateStepProgress(
    stepId: string,
    userId: string,
    completed: boolean
  ): Promise<void> {
    await supabase
      .from('learning_path_steps')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', stepId);

    // Check if path is complete
    const { data: path } = await supabase
      .from('learning_path_steps')
      .select('path_id')
      .eq('id', stepId)
      .single();

    if (path) {
      await this.checkPathCompletion(path.path_id, userId);
    }
  }

  async getRecommendations(userId: string): Promise<{
    nextSteps: PathStep[];
    suggestedPaths: LearningPath[];
    weakAreas: string[];
  }> {
    const paths = await this.getUserLearningPaths(userId);
    const recommendations = {
      nextSteps: [] as PathStep[],
      suggestedPaths: [] as LearningPath[],
      weakAreas: [] as string[],
    };

    for (const path of paths) {
      const steps = await this.getLearningPathSteps(path.id);
      const nextStep = steps.find(s => !s.completed);
      if (nextStep) {
        recommendations.nextSteps.push(nextStep);
      }
    }

    const weakAreas = await this.identifyWeakAreas(userId);
    recommendations.weakAreas = weakAreas;

    if (weakAreas.length > 0) {
      const suggestedPath = await this.createLearningPath(userId, {
        subject: weakAreas[0],
        goals: ['Improve understanding', 'Practice regularly'],
      });
      recommendations.suggestedPaths.push(suggestedPath);
    }

    return recommendations;
  }

  async getPersonalizedContent(
    userId: string,
    subject: string,
    topic: string
  ): Promise<{
    lessons: any[];
    quizzes: any[];
    practiceProblems: any[];
  }> {
    const userStats = await this.getUserLearningStats(userId);
    const style = this.detectLearningStyle(userStats);

    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('subject', subject)
      .eq('topic', topic)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('*')
      .eq('subject', subject)
      .eq('topic', topic)
      .order('difficulty', { ascending: true })
      .limit(3);

    const { data: practice } = await supabase
      .from('practice_problems')
      .select('*')
      .eq('subject', subject)
      .eq('topic', topic)
      .order('difficulty', { ascending: true })
      .limit(10);

    return {
      lessons: lessons || [],
      quizzes: quizzes || [],
      practiceProblems: practice || [],
    };
  }

  private async getUserLearningStats(userId: string) {
    const { data: quizzes } = await supabase
      .from('quiz_results')
      .select('score, completed_at')
      .eq('user_id', userId);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration, started_at')
      .eq('user_id', userId);

    const { data: documents } = await supabase
      .from('documents')
      .select('subject, created_at')
      .eq('user_id', userId);

    return {
      quizzes: quizzes || [],
      sessions: sessions || [],
      documents: documents || [],
      averageScore: quizzes?.length
        ? quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length
        : 0,
      totalStudyTime: sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
      preferredStudyTime: this.analyzeStudyTime(sessions || []),
    };
  }

  private detectLearningStyle(stats: any): LearningStyle {
    if (stats.preferredStudyTime.morning > 0.6) return LearningStyle.VISUAL;
    if (stats.preferredStudyTime.evening > 0.6) return LearningStyle.KINESTHETIC;
    if (stats.averageScore > 85) return LearningStyle.READING;
    return LearningStyle.AUDITORY;
  }

  private recommendDifficulty(stats: any): DifficultyLevel {
    if (stats.averageScore >= 90) return DifficultyLevel.ADVANCED;
    if (stats.averageScore >= 70) return DifficultyLevel.INTERMEDIATE;
    return DifficultyLevel.BEGINNER;
  }

  private async generatePersonalizedPath(
    userId: string,
    options: any,
    style: LearningStyle,
    difficulty: DifficultyLevel
  ): Promise<LearningPath> {
    const pathName = `${options.subject} - ${style} Learning Path`;
    const description = `Personalized ${options.subject} learning path tailored for ${style} learners`;

    const { data: path } = await supabase
      .from('learning_paths')
      .insert({
        user_id: userId,
        name: pathName,
        description,
        subject: options.subject,
        estimated_duration: options.timeAvailable || 600,
        difficulty_level: difficulty,
        learning_style: style,
        prerequisites: [],
        goals: options.goals,
      })
      .select()
      .single();

    const steps = await this.generatePathSteps(path.id, options, style, difficulty);

    return {
      id: path.id,
      userId: path.user_id,
      name: path.name,
      description: path.description,
      subject: path.subject,
      estimatedDuration: path.estimated_duration,
      difficultyLevel: path.difficulty_level,
      learningStyle: path.learning_style,
      prerequisites: path.prerequisites || [],
      goals: path.goals || [],
      createdAt: new Date(path.created_at),
      updatedAt: new Date(path.updated_at),
    };
  }

  private async generatePathSteps(
    pathId: string,
    options: any,
    style: LearningStyle,
    difficulty: DifficultyLevel
  ): Promise<void> {
    const stepTemplates = [
      { title: 'Introduction & Overview', type: 'lesson' as const, order: 1 },
      { title: 'Core Concepts', type: 'lesson' as const, order: 2 },
      { title: 'Practice Quiz 1', type: 'quiz' as const, order: 3 },
      { title: 'Hands-on Practice', type: 'practice' as const, order: 4 },
      { title: 'Advanced Topics', type: 'lesson' as const, order: 5 },
      { title: 'Practice Quiz 2', type: 'quiz' as const, order: 6 },
      { title: 'Review & Summary', type: 'review' as const, order: 7 },
    ];

    for (const template of stepTemplates) {
      await supabase.from('learning_path_steps').insert({
        path_id: pathId,
        order: template.order,
        title: template.title,
        description: `${template.title} for ${options.subject}`,
        type: template.type,
        estimated_time: 30,
        difficulty,
        completed: false,
      });
    }
  }

  private async checkPathCompletion(pathId: string, userId: string): Promise<void> {
    const { data: steps } = await supabase
      .from('learning_path_steps')
      .select('completed')
      .eq('path_id', pathId);

    const allCompleted = steps?.every(s => s.completed) || false;

    if (allCompleted) {
      await supabase
        .from('learning_paths')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', pathId);
    }
  }

  private async identifyWeakAreas(userId: string): Promise<string[]> {
    const { data: quizzes } = await supabase
      .from('quiz_results')
      .select('score, subject')
      .eq('user_id', userId);

    if (!quizzes || quizzes.length === 0) return [];

    const subjectScores = new Map<string, number[]>();

    quizzes.forEach(q => {
      if (!subjectScores.has(q.subject)) {
        subjectScores.set(q.subject, []);
      }
      subjectScores.get(q.subject)!.push(q.score);
    });

    const weakAreas = Array.from(subjectScores.entries())
      .filter(([_, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return avg < 70;
      })
      .map(([subject]) => subject);

    return weakAreas.slice(0, 3);
  }

  private analyzeStudyTime(sessions: any[]) {
    if (sessions.length === 0) {
      return { morning: 0, afternoon: 0, evening: 0, night: 0 };
    }

    const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    sessions.forEach(session => {
      const hour = new Date(session.started_at).getHours();
      if (hour >= 6 && hour < 12) timeOfDay.morning++;
      else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
      else if (hour >= 17 && hour < 21) timeOfDay.evening++;
      else timeOfDay.night++;
    });

    const total = sessions.length;
    return {
      morning: timeOfDay.morning / total,
      afternoon: timeOfDay.afternoon / total,
      evening: timeOfDay.evening / total,
      night: timeOfDay.night / total,
    };
  }
}

export const personalizedPathService = new PersonalizedPathService();
