/**
 * Chapter Management Service
 * Handles chapter navigation, delivery, and state management
 */

import { supabase } from '../supabase';

export interface ChapterInfo {
  id: string;
  documentId: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  keyTopics: string[];
  estimatedReadTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  summary: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  userProgress?: number; // 0-100
}

export interface ChapterNavigation {
  current: ChapterInfo | null;
  next: ChapterInfo | null;
  previous: ChapterInfo | null;
  total: number;
  position: number; // 1-based position
}

export class ChapterManager {
  /**
   * Get list of all chapters for a document
   */
  async getChapterList(documentId: string, userId: string): Promise<ChapterInfo[]> {
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', documentId)
      .order('chapter_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chapters: ${error.message}`);
    }

    if (!chapters) {
      return [];
    }

    // Get user progress for these chapters
    const chapterIds = chapters.map(c => c.id);
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .in('chapter_id', chapterIds)
      .eq('user_id', userId);

    // Combine chapters with progress
    const chaptersWithProgress: ChapterInfo[] = chapters.map(chapter => {
      const progressRecord = progress?.find(p => p.chapter_id === chapter.id);

      return {
        id: chapter.id,
        documentId: chapter.document_id,
        chapterNumber: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.word_count || chapter.content?.length || 0,
        keyTopics: this.parseJsonSafely(chapter.key_topics, []),
        estimatedReadTime: Math.ceil((chapter.word_count || 0) / 200),
        difficulty: (chapter.difficulty as any) || 'intermediate',
        prerequisites: this.parseJsonSafely(chapter.prerequisites, []),
        summary: chapter.summary || '',
        isUnlocked: progressRecord?.is_unlocked || chapter.chapter_number === 1,
        isCompleted: progressRecord?.is_completed || false,
        userProgress: progressRecord?.progress || 0
      };
    });

    return chaptersWithProgress;
  }

  /**
   * Get specific chapter content
   */
  async getChapterContent(chapterId: string, userId: string): Promise<ChapterInfo | null> {
    // Get chapter details
    const { data: chapter, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (error || !chapter) {
      throw new Error(`Chapter not found: ${error?.message}`);
    }

    // Get user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('user_id', userId)
      .single();

    // Check if chapter is unlocked
    const isUnlocked = progress?.is_unlocked || chapter.chapter_number === 1;

    if (!isUnlocked) {
      throw new Error('Chapter is locked. Complete previous chapters to unlock.');
    }

    return {
      id: chapter.id,
      documentId: chapter.document_id,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.word_count || 0,
      keyTopics: this.parseJsonSafely(chapter.key_topics, []),
      estimatedReadTime: Math.ceil((chapter.word_count || 0) / 200),
      difficulty: (chapter.difficulty as any) || 'intermediate',
      prerequisites: this.parseJsonSafely(chapter.prerequisites, []),
      summary: chapter.summary || '',
      isUnlocked,
      isCompleted: progress?.is_completed || false,
      userProgress: progress?.progress || 0
    };
  }

  /**
   * Get navigation information for a chapter
   */
  async getChapterNavigation(chapterId: string, userId: string): Promise<ChapterNavigation> {
    // Get current chapter
    const currentChapter = await this.getChapterContent(chapterId, userId);

    if (!currentChapter) {
      return {
        current: null,
        next: null,
        previous: null,
        total: 0,
        position: 0
      };
    }

    // Get all chapters for this document
    const allChapters = await this.getChapterList(currentChapter.documentId, userId);
    const total = allChapters.length;
    const position = allChapters.findIndex(c => c.id === chapterId) + 1;

    // Get next chapter
    const next = position < total ? allChapters[position] : null;

    // Get previous chapter
    const previous = position > 1 ? allChapters[position - 2] : null;

    return {
      current: currentChapter,
      next,
      previous,
      total,
      position
    };
  }

  /**
   * Get next unlocked chapter
   */
  async getNextChapter(documentId: string, currentChapterId: string, userId: string): Promise<ChapterInfo | null> {
    const chapters = await this.getChapterList(documentId, userId);
    const currentIndex = chapters.findIndex(c => c.id === currentChapterId);

    if (currentIndex === -1) {
      return null;
    }

    // Find next unlocked chapter
    for (let i = currentIndex + 1; i < chapters.length; i++) {
      if (chapters[i].isUnlocked) {
        return chapters[i];
      }
    }

    return null;
  }

  /**
   * Get previous unlocked chapter
   */
  async getPreviousChapter(documentId: string, currentChapterId: string, userId: string): Promise<ChapterInfo | null> {
    const chapters = await this.getChapterList(documentId, userId);
    const currentIndex = chapters.findIndex(c => c.id === currentChapterId);

    if (currentIndex === -1) {
      return null;
    }

    // Find previous unlocked chapter
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (chapters[i].isUnlocked) {
        return chapters[i];
      }
    }

    return null;
  }

  /**
   * Update user progress for a chapter
   */
  async updateProgress(userId: string, chapterId: string, progress: number): Promise<void> {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        chapter_id: chapterId,
        progress: Math.min(100, Math.max(0, progress)),
        updated_at: new Date()
      });

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }
  }

  /**
   * Mark chapter as completed and unlock next
   */
  async completeChapter(userId: string, chapterId: string, score: number, passMark: number = 70): Promise<void> {
    const isPassed = score >= passMark;

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        chapter_id: chapterId,
        is_completed: isPassed,
        progress: 100,
        score,
        updated_at: new Date()
      });

    if (error) {
      throw new Error(`Failed to complete chapter: ${error.message}`);
    }

    // Unlock next chapter if passed
    if (isPassed) {
      await this.unlockNextChapter(userId, chapterId);
    }
  }

  /**
   * Unlock the next chapter in sequence
   */
  private async unlockNextChapter(userId: string, completedChapterId: string): Promise<void> {
    // Get completed chapter details
    const { data: completedChapter } = await supabase
      .from('chapters')
      .select('document_id, chapter_number')
      .eq('id', completedChapterId)
      .single();

    if (!completedChapter) {
      return;
    }

    // Find next chapter
    const { data: nextChapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('document_id', completedChapter.document_id)
      .eq('chapter_number', completedChapter.chapter_number + 1)
      .single();

    if (!nextChapter) {
      return; // No next chapter
    }

    // Unlock next chapter
    await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        chapter_id: nextChapter.id,
        is_unlocked: true,
        progress: 0,
        updated_at: new Date()
      });
  }

  /**
   * Check if a chapter is unlocked
   */
  async isChapterUnlocked(userId: string, chapterId: string): Promise<boolean> {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('is_unlocked')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    return progress?.is_unlocked || false;
  }

  /**
   * Safely parse JSON fields from database
   */
  private parseJsonSafely(value: any, defaultValue: any = []): any {
    if (!value) return defaultValue;

    try {
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;
    } catch {
      return defaultValue;
    }
  }
}

export const chapterManager = new ChapterManager();
