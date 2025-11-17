/**
 * AI Quiz Engine
 * Generates adaptive quizzes from chapter content using OpenAI
 */

import { llmService } from '../llm/factory';
import { supabase } from '../supabase';

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'scenario' | 'matching';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // for multiple-choice
  correctAnswer: string | number; // index for multiple-choice, text for others
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1=easy, 5=hard
  points: number;
  topic: string;
  hint?: string;
}

export interface Quiz {
  id: string;
  chapterId: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  passMark: number; // percentage
  totalPoints: number;
  adaptive: boolean;
  createdAt: Date;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface QuizResult {
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  score: number; // percentage
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;
  timeSpent: number; // in seconds
  completedAt: Date;
}

export class AIQuizEngine {
  private passMark: number = 70;
  private defaultQuestionCount: number = 10;

  /**
   * Generate quiz from chapter content
   */
  async generateQuiz(
    chapterId: string,
    questionCount: number = 10,
    adaptive: boolean = true,
    passMark?: number
  ): Promise<Quiz> {
    if (passMark) {
      this.passMark = passMark;
    }

    // Get chapter content
    const { data: chapter, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (error || !chapter) {
      throw new Error(`Chapter not found: ${error?.message}`);
    }

    // Generate questions using OpenAI
    const questions = await this.generateQuestionsFromContent(
      chapter.content,
      chapter.title,
      questionCount,
      adaptive
    );

    // Save quiz to database
    const quizId = `quiz-${chapterId}-${Date.now()}`;
    const quiz: Quiz = {
      id: quizId,
      chapterId,
      title: `Quiz: ${chapter.title}`,
      questions,
      timeLimit: Math.ceil(chapter.word_count / 200) * 0.5, // 30 seconds per 200 words
      passMark: this.passMark,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      adaptive,
      createdAt: new Date()
    };

    await this.saveQuiz(quiz);

    return quiz;
  }

  /**
   * Generate questions using OpenAI
   */
  private async generateQuestionsFromContent(
    content: string,
    chapterTitle: string,
    questionCount: number,
    adaptive: boolean
  ): Promise<QuizQuestion[]> {
    const questionTypes: QuestionType[] = ['multiple-choice', 'true-false', 'short-answer', 'scenario'];

    // Distribute questions across types
    const distribution = this.calculateQuestionDistribution(questionCount, adaptive);

    const allQuestions: QuizQuestion[] = [];

    for (const [type, count] of Object.entries(distribution)) {
      const questions = await this.generateQuestionsByType(
        content,
        chapterTitle,
        type as QuestionType,
        count
      );
      allQuestions.push(...questions);
    }

    return allQuestions.slice(0, questionCount);
  }

  /**
   * Calculate adaptive question distribution
   */
  private calculateQuestionDistribution(
    totalQuestions: number,
    adaptive: boolean
  ): { [key in QuestionType]: number } {
    if (!adaptive) {
      // Equal distribution
      const perType = Math.floor(totalQuestions / 4);
      return {
        'multiple-choice': perType + (totalQuestions % 4),
        'true-false': perType,
        'short-answer': perType,
        'scenario': perType
      };
    }

    // Adaptive distribution (more multiple-choice for easier flow)
    return {
      'multiple-choice': Math.ceil(totalQuestions * 0.4), // 40%
      'true-false': Math.ceil(totalQuestions * 0.2), // 20%
      'short-answer': Math.ceil(totalQuestions * 0.25), // 25%
      'scenario': Math.floor(totalQuestions * 0.15) // 15%
    };
  }

  /**
   * Generate questions of a specific type
   */
  private async generateQuestionsByType(
    content: string,
    chapterTitle: string,
    type: QuestionType,
    count: number
  ): Promise<QuizQuestion[]> {
    const prompt = this.buildQuestionPrompt(content, chapterTitle, type, count);

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 2000,
        temperature: 0.7
      });

      const questions = this.parseQuestionsFromResponse(response.content, type, chapterTitle);
      return questions;
    } catch (error) {
      console.error(`Error generating ${type} questions:`, error);
      return this.generateFallbackQuestions(content, type, count, chapterTitle);
    }
  }

  /**
   * Build prompt for question generation
   */
  private buildQuestionPrompt(
    content: string,
    chapterTitle: string,
    type: QuestionType,
    count: number
  ): string {
    const typeInstructions = {
      'multiple-choice': `Create ${count} multiple-choice questions with 4 options each. Mark the correct answer clearly.`,
      'true-false': `Create ${count} true/false questions. Mark clearly as TRUE or FALSE.`,
      'short-answer': `Create ${count} short-answer questions that can be answered in 1-3 sentences.`,
      'scenario': `Create ${count} scenario-based questions that test application of concepts.`
    };

    return `
      Create educational quiz questions strictly based on the following chapter content.

      Chapter: ${chapterTitle}
      Type: ${typeInstructions[type]}

      CRITICAL REQUIREMENTS:
      1. Only use information from the provided content - DO NOT add external knowledge
      2. Questions must test understanding, not just memorization
      3. Provide clear explanations for answers
      4. Ensure questions are well-formed and unambiguous

      Content:
      ${content.substring(0, 4000)}... (truncated for processing)

      Return ONLY a valid JSON array with this structure:
      [
        {
          "question": "Question text",
          "answer": "Correct answer or index",
          "explanation": "Why this is correct",
          "difficulty": 1-5,
          "points": 1-10
        }
      ]

      Ensure all questions are grounded in the chapter content.
    `;
  }

  /**
   * Parse questions from OpenAI response
   */
  private parseQuestionsFromResponse(
    response: string,
    type: QuestionType,
    chapterTitle: string
  ): QuizQuestion[] {
    try {
      const jsonStr = this.extractJsonFromResponse(response);
      const questionsData = JSON.parse(jsonStr);

      return questionsData.map((q: any, index: number) => ({
        id: `${type}-${Date.now()}-${index}`,
        type,
        question: q.question,
        options: type === 'multiple-choice' ? q.options : undefined,
        correctAnswer: q.answer,
        explanation: q.explanation,
        difficulty: Math.min(5, Math.max(1, q.difficulty || 3)),
        points: q.points || 5,
        topic: chapterTitle,
        hint: q.hint
      }));
    } catch (error) {
      console.error('Error parsing questions:', error);
      return this.generateFallbackQuestions('', type, 3, chapterTitle);
    }
  }

  /**
   * Extract JSON from OpenAI response
   */
  private extractJsonFromResponse(response: string): string {
    // Try to find JSON array in response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // Fallback: return minimal valid JSON
    return '[]';
  }

  /**
   * Generate fallback questions when AI fails
   */
  private generateFallbackQuestions(
    content: string,
    type: QuestionType,
    count: number,
    chapterTitle: string
  ): QuizQuestion[] {
    const questions: QuizQuestion[] = [];

    for (let i = 0; i < count; i++) {
      questions.push({
        id: `fallback-${type}-${i}`,
        type,
        question: `What is the main topic of ${chapterTitle}?`,
        options: type === 'multiple-choice'
          ? ['Topic A', 'Topic B', 'Topic C', 'Topic D']
          : undefined,
        correctAnswer: type === 'multiple-choice' ? 0 : 'The chapter covers the main concepts of the subject',
        explanation: 'This question is based on the chapter content.',
        difficulty: 2,
        points: 5,
        topic: chapterTitle
      });
    }

    return questions;
  }

  /**
   * Grade a quiz
   */
  gradeQuiz(quiz: Quiz, userAnswers: QuizAnswer[]): QuizResult {
    let earnedPoints = 0;
    const totalPoints = quiz.totalPoints;

    const gradedAnswers: QuizAnswer[] = quiz.questions.map(question => {
      const userAnswer = userAnswers.find(a => a.questionId === question.id);

      if (!userAnswer) {
        return {
          questionId: question.id,
          answer: '',
          isCorrect: false,
          pointsEarned: 0
        };
      }

      let isCorrect = false;
      let similarityScore = 0;

      if (question.type === 'multiple-choice') {
        // Multiple choice: exact index match
        isCorrect = userAnswer.answer === question.correctAnswer;
        similarityScore = isCorrect ? 100 : 0;
      } else if (question.type === 'true-false') {
        // True/False: check boolean value
        const userAnswerStr = String(userAnswer.answer).toLowerCase().trim();
        const correctAnswerStr = String(question.correctAnswer).toLowerCase().trim();
        isCorrect = userAnswerStr === correctAnswerStr;
        similarityScore = isCorrect ? 100 : 0;
      } else if (question.type === 'short-answer') {
        // SHORT ANSWER: Use intelligent semantic matching
        const result = this.gradeShortAnswer(
          String(userAnswer.answer),
          String(question.correctAnswer)
        );
        isCorrect = result.isCorrect;
        similarityScore = result.similarityScore;
      } else {
        // Other types: intelligent semantic matching
        const result = this.gradeShortAnswer(
          String(userAnswer.answer),
          String(question.correctAnswer)
        );
        isCorrect = result.isCorrect;
        similarityScore = result.similarityScore;
      }

      // Award partial credit based on similarity score
      let pointsEarned = 0;
      if (similarityScore >= 90) {
        pointsEarned = question.points; // Full points for excellent match
      } else if (similarityScore >= 70) {
        pointsEarned = Math.floor(question.points * 0.8); // 80% for good match
      } else if (similarityScore >= 50) {
        pointsEarned = Math.floor(question.points * 0.5); // 50% for partial match
      } else if (similarityScore >= 30) {
        pointsEarned = Math.floor(question.points * 0.2); // 20% for weak match
      }

      earnedPoints += pointsEarned;

      return {
        questionId: question.id,
        answer: userAnswer.answer,
        isCorrect,
        pointsEarned
      };
    });

    const score = (earnedPoints / totalPoints) * 100;
    const passed = score >= quiz.passMark;

    return {
      quizId: quiz.id,
      userId: '', // Will be set by caller
      answers: gradedAnswers,
      score,
      totalPoints,
      earnedPoints,
      passed,
      timeSpent: 0, // Will be set by caller
      completedAt: new Date()
    };
  }

  /**
   * Save quiz to database
   */
  private async saveQuiz(quiz: Quiz): Promise<void> {
    const { error } = await supabase
      .from('quizzes')
      .insert({
        id: quiz.id,
        chapter_id: quiz.chapterId,
        title: quiz.title,
        questions: quiz.questions,
        pass_mark: quiz.passMark,
        time_limit: quiz.timeLimit,
        total_points: quiz.totalPoints,
        created_at: quiz.createdAt
      });

    if (error) {
      console.error('Error saving quiz:', error);
    }
  }

  /**
   * Get quiz by ID
   */
  async getQuiz(quizId: string): Promise<Quiz | null> {
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error || !quiz) {
      return null;
    }

    return {
      id: quiz.id,
      chapterId: quiz.chapter_id,
      title: quiz.title,
      questions: quiz.questions || [],
      timeLimit: quiz.time_limit,
      passMark: quiz.pass_mark,
      totalPoints: quiz.total_points,
      adaptive: true,
      createdAt: new Date(quiz.created_at)
    };
  }

  /**
   * Intelligently grade short answer questions using semantic similarity
   * Not just exact matching - understands concepts and ideas
   */
  private gradeShortAnswer(userAnswer: string, correctAnswer: string): {
    isCorrect: boolean;
    similarityScore: number; // 0-100
  } {
    // Normalize and clean answers
    const user = this.normalizeText(userAnswer);
    const correct = this.normalizeText(correctAnswer);

    // If they're essentially the same, return perfect score
    if (user === correct) {
      return { isCorrect: true, similarityScore: 100 };
    }

    // Calculate multiple similarity metrics
    const metrics = {
      tokenOverlap: this.calculateTokenOverlap(user, correct),
      longestCommonSubsequence: this.calculateLCS(user, correct),
      conceptualSimilarity: this.calculateConceptualSimilarity(user, correct),
      fuzzyMatch: this.calculateFuzzySimilarity(user, correct)
    };

    // Weight the metrics (conceptual similarity is most important)
    const weightedScore =
      metrics.tokenOverlap * 0.25 +
      metrics.longestCommonSubsequence * 0.20 +
      metrics.conceptualSimilarity * 0.35 +
      metrics.fuzzyMatch * 0.20;

    // Consider it correct if similarity is >= 65%
    const isCorrect = weightedScore >= 65;

    return {
      isCorrect,
      similarityScore: Math.round(weightedScore)
    };
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate token overlap similarity (Jaccard index)
   */
  private calculateTokenOverlap(user: string, correct: string): number {
    const userTokens = new Set(user.split(' ').filter(t => t.length > 2));
    const correctTokens = new Set(correct.split(' ').filter(t => t.length > 2));

    const intersection = new Set([...userTokens].filter(t => correctTokens.has(t)));
    const union = new Set([...userTokens, ...correctTokens]);

    if (union.size === 0) return 0;
    return (intersection.size / union.size) * 100;
  }

  /**
   * Calculate Longest Common Subsequence similarity
   */
  private calculateLCS(user: string, correct: string): number {
    const userWords = user.split(' ');
    const correctWords = correct.split(' ');

    const dp: number[][] = Array(userWords.length + 1)
      .fill(null)
      .map(() => Array(correctWords.length + 1).fill(0));

    for (let i = 1; i <= userWords.length; i++) {
      for (let j = 1; j <= correctWords.length; j++) {
        if (userWords[i - 1] === correctWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lcsLength = dp[userWords.length][correctWords.length];
    const maxLength = Math.max(userWords.length, correctWords.length);

    return maxLength > 0 ? (lcsLength / maxLength) * 100 : 0;
  }

  /**
   * Calculate conceptual similarity based on synonym matching
   */
  private calculateConceptualSimilarity(user: string, correct: string): number {
    const userTokens = user.split(' ').filter(t => t.length > 2);
    const correctTokens = correct.split(' ').filter(t => t.length > 2);

    let matchCount = 0;
    let totalChecks = 0;

    // Check each user token against correct tokens
    for (const userToken of userTokens) {
      let bestMatch = false;
      let bestSimilarity = 0;

      for (const correctToken of correctTokens) {
        // Exact match
        if (userToken === correctToken) {
          bestMatch = true;
          break;
        }

        // Check for substring match (handles plurals, variations)
        if (userToken.includes(correctToken) || correctToken.includes(userToken)) {
          const similarity = this.getSubstringSimilarity(userToken, correctToken);
          bestSimilarity = Math.max(bestSimilarity, similarity);
        }

        // Check for edit distance (typos, small differences)
        const editDistance = this.getEditDistance(userToken, correctToken);
        const maxLength = Math.max(userToken.length, correctToken.length);
        const similarity = ((maxLength - editDistance) / maxLength) * 100;

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
        }
      }

      totalChecks++;

      if (bestMatch || bestSimilarity >= 85) {
        matchCount++;
      }
    }

    return totalChecks > 0 ? (matchCount / totalChecks) * 100 : 0;
  }

  /**
   * Calculate fuzzy string similarity (Levenshtein-based)
   */
  private calculateFuzzySimilarity(user: string, correct: string): number {
    const editDistance = this.getEditDistance(user, correct);
    const maxLength = Math.max(user.length, correct.length);

    if (maxLength === 0) return 100;
    return ((maxLength - editDistance) / maxLength) * 100;
  }

  /**
   * Get edit distance between two strings (Levenshtein distance)
   */
  private getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate substring similarity
   */
  private getSubstringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;

    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length < str2.length ? str2 : str1;

    if (longer.includes(shorter)) {
      return (shorter.length / longer.length) * 100;
    }

    return 0;
  }

  /**
   * Get user's quiz results
   */
  async getQuizResults(quizId: string, userId: string): Promise<QuizResult | null> {
    const { data: result, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !result) {
      return null;
    }

    return {
      quizId: result.quiz_id,
      userId: result.user_id,
      answers: result.answers || [],
      score: result.score,
      totalPoints: result.total_points,
      earnedPoints: result.earned_points,
      passed: result.passed,
      timeSpent: result.time_spent,
      completedAt: new Date(result.attempted_at)
    };
  }

  /**
   * Save quiz attempt result
   */
  async saveQuizResult(result: QuizResult): Promise<void> {
    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: result.quizId,
        user_id: result.userId,
        answers: result.answers,
        score: result.score,
        total_points: result.totalPoints,
        earned_points: result.earnedPoints,
        passed: result.passed,
        time_spent: result.timeSpent,
        attempted_at: result.completedAt
      });

    if (error) {
      throw new Error(`Failed to save quiz result: ${error.message}`);
    }
  }

  /**
   * Generate contextual quiz from raw content text
   * Used for embedded quizzes within chapter content
   */
  async generateQuizFromContent(content: string, questionCount: number = 1): Promise<QuizQuestion[]> {
    try {
      console.log('🎯 Generating contextual quiz from content section...');

      // Use multiple-choice questions for embedded quizzes
      const prompt = this.buildContentQuizPrompt(content, questionCount);

      const response = await llmService.complete({
        prompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      const questions = this.parseQuestionsFromResponse(response.content, 'multiple-choice', 'Content Section');

      // Ensure we return the requested number of questions
      if (questions.length === 0) {
        return this.generateFallbackQuestions(content, 'multiple-choice', questionCount, 'Content Section');
      }

      return questions.slice(0, questionCount);

    } catch (error) {
      console.error('Error generating contextual quiz:', error);

      // Return fallback questions
      return this.generateFallbackQuestions(content, 'multiple-choice', questionCount, 'Content Section');
    }
  }

  /**
   * Build prompt for contextual quiz generation from content
   */
  private buildContentQuizPrompt(content: string, questionCount: number): string {
    return `
      Based on the following content section, create ${questionCount} multiple-choice question(s) that test understanding of the key concepts.

      Content:
      ${content}

      CRITICAL REQUIREMENTS:
      1. Create ONLY multiple-choice questions with exactly 4 options
      2. Questions must test comprehension of the key ideas in this content
      3. Provide clear explanations
      4. Mark the correct answer with its index (0-3)
      5. Base questions ONLY on the information in the provided content

      Return ONLY a valid JSON array with this structure:
      [
        {
          "question": "Question text",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "answer": 0,
          "explanation": "Clear explanation of why this answer is correct",
          "difficulty": 2-4,
          "points": 5
        }
      ]

      Ensure all questions are grounded in the content provided above.
    `;
  }
}

export const aiQuizEngine = new AIQuizEngine();
