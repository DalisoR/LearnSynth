/**
 * Certificate Service
 * Generates and manages learning certificates
 */

import { supabase } from '../supabase';
import { llmService } from '../llm/factory';

export interface Certificate {
  id: string;
  userId: string;
  documentId: string;
  title: string;
  description: string;
  issuedDate: Date;
  completionDate: Date;
  studyHours: number;
  quizAverage: number;
  certificateUrl?: string;
  verificationCode: string;
  metadata: {
    chaptersCompleted: number;
    totalChapters: number;
    finalQuizScore: number;
    achievements: string[];
  };
}

export class CertificateService {
  /**
   * Generate certificate for document completion
   */
  async generateCertificate(
    userId: string,
    documentId: string
  ): Promise<Certificate> {
    // Get document and user progress
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    const { data: chapters } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', documentId)
      .order('chapter_number');

    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId);

    if (!document || !chapters) {
      throw new Error('Document not found');
    }

    const completedChapters = (progress || []).filter(p => p.status === 'completed').length;
    const totalChapters = chapters.length;

    if (completedChapters < totalChapters) {
      throw new Error('Document not fully completed');
    }

    // Calculate stats
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('user_id', userId)
      .order('attempted_at');

    const chapterIds = chapters.map(c => c.id);
    const userQuizzes = (quizzes || []).filter(q =>
      // Filter quizzes from this document's chapters
      true // Simplified for now
    );

    const quizAverage = userQuizzes.length > 0
      ? userQuizzes.reduce((sum, q) => sum + q.score, 0) / userQuizzes.length
      : 0;

    const studyHours = await this.calculateStudyHours(userId, documentId);

    // Get achievements
    const { data: badges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    // Generate personalized description using AI
    const description = await this.generateCertificateDescription(
      document.title,
      completedChapters,
      totalChapters,
      quizAverage,
      studyHours
    );

    const certificate: Certificate = {
      id: `cert-${Date.now()}-${userId}`,
      userId,
      documentId,
      title: `Certificate of Completion: ${document.title}`,
      description,
      issuedDate: new Date(),
      completionDate: new Date(),
      studyHours,
      quizAverage,
      verificationCode: this.generateVerificationCode(),
      metadata: {
        chaptersCompleted: completedChapters,
        totalChapters,
        finalQuizScore: quizAverage,
        achievements: (badges || []).map(b => b.badge_id)
      }
    };

    // Save certificate
    await supabase
      .from('certificates')
      .insert({
        id: certificate.id,
        user_id: userId,
        document_id: documentId,
        title: certificate.title,
        description: certificate.description,
        issued_date: certificate.issuedDate,
        completion_date: certificate.completionDate,
        study_hours: studyHours,
        quiz_average: quizAverage,
        verification_code: certificate.verificationCode,
        metadata: certificate.metadata
      });

    return certificate;
  }

  /**
   * Generate milestone certificate
   */
  async generateMilestoneCertificate(
    userId: string,
    milestoneType: 'streak' | 'chapters' | 'perfect-score',
    value: number
  ): Promise<Certificate> {
    const certificate: Certificate = {
      id: `cert-milestone-${Date.now()}-${userId}`,
      userId,
      documentId: '', // No specific document for milestone certs
      title: this.getMilestoneTitle(milestoneType, value),
      description: this.getMilestoneDescription(milestoneType, value),
      issuedDate: new Date(),
      completionDate: new Date(),
      studyHours: 0,
      quizAverage: 0,
      verificationCode: this.generateVerificationCode(),
      metadata: {
        chaptersCompleted: 0,
        totalChapters: 0,
        finalQuizScore: 0,
        achievements: []
      }
    };

    await supabase
      .from('certificates')
      .insert({
        id: certificate.id,
        user_id: userId,
        title: certificate.title,
        description: certificate.description,
        issued_date: certificate.issuedDate,
        completion_date: certificate.completionDate,
        study_hours: 0,
        quiz_average: 0,
        verification_code: certificate.verificationCode,
        metadata: certificate.metadata
      });

    return certificate;
  }

  /**
   * Verify certificate
   */
  async verifyCertificate(verificationCode: string): Promise<Certificate | null> {
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('verification_code', verificationCode)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      documentId: data.document_id,
      title: data.title,
      description: data.description,
      issuedDate: new Date(data.issued_date),
      completionDate: new Date(data.completion_date),
      studyHours: data.study_hours,
      quizAverage: data.quiz_average,
      verificationCode: data.verification_code,
      metadata: data.metadata
    };
  }

  /**
   * Get user certificates
   */
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('issued_date', { ascending: false });

    return (data || []).map(data => ({
      id: data.id,
      userId: data.user_id,
      documentId: data.document_id,
      title: data.title,
      description: data.description,
      issuedDate: new Date(data.issued_date),
      completionDate: new Date(data.completion_date),
      studyHours: data.study_hours,
      quizAverage: data.quiz_average,
      verificationCode: data.verification_code,
      metadata: data.metadata
    }));
  }

  /**
   * Generate certificate description using AI
   */
  private async generateCertificateDescription(
    documentTitle: string,
    chaptersCompleted: number,
    totalChapters: number,
    quizAverage: number,
    studyHours: number
  ): Promise<string> {
    const prompt = `
      Write a personalized, inspiring certificate description for a student who has completed a course.

      Course: ${documentTitle}
      Chapters Completed: ${chaptersCompleted}/${totalChapters}
      Average Quiz Score: ${quizAverage.toFixed(1)}%
      Study Hours: ${studyHours.toFixed(1)}

      The description should:
      1. Be celebratory and encouraging
      2. Mention their achievement
      3. Be professional yet warm
      4. Be 2-3 sentences long
      5. Mention their dedication and learning journey

      Make it feel personal and meaningful.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 300,
        temperature: 0.8
      });

      return response.content.trim();
    } catch (error) {
      console.error('Error generating certificate description:', error);
    }

    // Fallback description
    return `This certificate is awarded for the successful completion of "${documentTitle}" with dedication and commitment to learning. The student demonstrated exceptional progress and mastery of the subject matter.`;
  }

  /**
   * Calculate total study hours for a document
   */
  private async calculateStudyHours(userId: string, documentId: string): Promise<number> {
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration')
      .eq('user_id', userId);

    // In a real implementation, you'd filter by document
    // For now, return total hours
    const totalMs = (sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
    return totalMs / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Generate unique verification code
   */
  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      if ((i + 1) % 4 === 0 && i < 11) code += '-';
    }
    return code;
  }

  /**
   * Get milestone title
   */
  private getMilestoneTitle(type: string, value: number): string {
    switch (type) {
      case 'streak':
        return `Learning Streak Champion: ${value} Days`;
      case 'chapters':
        return `Chapter Master: ${value} Chapters Completed`;
      case 'perfect-score':
        return `Perfect Score Achievement`;
      default:
        return 'Learning Milestone Achievement';
    }
  }

  /**
   * Get milestone description
   */
  private getMilestoneDescription(type: string, value: number): string {
    switch (type) {
      case 'streak':
        return `This certificate recognizes outstanding dedication to learning, maintaining a ${value}-day study streak. Your commitment to consistent learning is truly admirable.`;
      case 'chapters':
        return `Awarded for exceptional learning progress, completing ${value} chapters with dedication and perseverance.`;
      case 'perfect-score':
        return `This certificate celebrates the achievement of a perfect quiz score, demonstrating mastery and excellence in the subject matter.`;
      default:
        return 'This certificate recognizes your outstanding achievement in your learning journey.';
    }
  }
}

export const certificateService = new CertificateService();
