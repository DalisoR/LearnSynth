import { supabase } from '../supabase';
import { TTSService } from './ttsService';

export interface EnhancedLesson {
  id?: string;
  user_id: string;
  chapter_id: string;
  chapter_title: string;
  teaching_style: 'socratic' | 'direct' | 'constructivist' | 'encouraging';
  enhanced_sections: any[];
  learning_objectives: string[];
  key_vocabulary: { term: string; definition: string }[];
  summary: string;
  quick_quiz: any[];
  knowledge_base_ids?: string[];
  knowledge_base_context?: {
    context: string;
    references: Array<{
      source: string;
      relevanceScore: number;
      excerpt: string;
      chapterId: string;
      documentId: string;
    }>;
  };
  tts_enabled?: boolean;
  audio_url?: string;
  audio_duration?: number;
  is_favorite?: boolean;
  view_count?: number;
  last_accessed?: string;
  created_at?: string;
  updated_at?: string;
}

export class EnhancedLessonService {
  private ttsService: TTSService;

  constructor() {
    this.ttsService = new TTSService();
  }

  /**
   * Save an enhanced lesson to database
   */
  async saveEnhancedLesson(lesson: Omit<EnhancedLesson, 'id' | 'created_at' | 'updated_at'>): Promise<EnhancedLesson> {
    // Generate TTS audio if enabled
    let audioUrl = null;
    let audioDuration = null;

    if (lesson.tts_enabled !== false) {
      try {
        const audioText = this.prepareTextForTTS(lesson);
        const ttsResult = await this.ttsService.generateAudio(audioText);
        audioUrl = ttsResult.audioUrl;
        audioDuration = ttsResult.duration;
      } catch (error) {
        console.error('Failed to generate TTS audio:', error);
        // Continue without TTS if it fails
      }
    }

    // Check if this is a mock user (for demo purposes)
    if (lesson.user_id === 'mock-user-id') {
      console.log('📝 Saving lesson for mock user (demo mode)');
      // Return a mock saved lesson for demo with sample audio
      return {
        ...lesson,
        id: 'mock-lesson-id-' + Date.now(),
        audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample audio URL for demo
        audio_duration: audioDuration || 120, // Default 2 minutes
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as EnhancedLesson;
    }

    const { data, error } = await supabase
      .from('enhanced_lessons')
      .insert({
        ...lesson,
        audio_url: audioUrl,
        audio_duration: audioDuration,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save enhanced lesson: ${error.message}`);
    }

    return data;
  }

  /**
   * Get an enhanced lesson by user, chapter, and teaching style
   */
  async getEnhancedLesson(
    userId: string,
    chapterId: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging'
  ): Promise<EnhancedLesson | null> {
    // Check if this is a mock user (for demo purposes)
    if (userId === 'mock-user-id') {
      console.log('📖 Checking for saved lesson for mock user (demo mode)');
      // For demo, return null to trigger new lesson generation
      return null;
    }

    const { data, error } = await supabase
      .from('enhanced_lessons')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .eq('teaching_style', teachingStyle)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found, return null
        return null;
      }
      throw new Error(`Failed to fetch enhanced lesson: ${error.message}`);
    }

    // Update last accessed and view count
    await this.updateViewCount(data.id);

    return data;
  }

  /**
   * List all enhanced lessons for a user
   */
  async listEnhancedLessons(userId: string, filters?: {
    teachingStyle?: string;
    chapterId?: string;
    favoriteOnly?: boolean;
  }): Promise<EnhancedLesson[]> {
    let query = supabase
      .from('enhanced_lessons')
      .select('*')
      .eq('user_id', userId);

    if (filters?.teachingStyle) {
      query = query.eq('teaching_style', filters.teachingStyle);
    }

    if (filters?.chapterId) {
      query = query.eq('chapter_id', filters.chapterId);
    }

    if (filters?.favoriteOnly) {
      query = query.eq('is_favorite', true);
    }

    const { data, error } = await query.order('last_accessed', { ascending: false });

    if (error) {
      throw new Error(`Failed to list enhanced lessons: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(lessonId: string, userId: string): Promise<EnhancedLesson> {
    // Check if this is a mock user (for demo purposes)
    if (userId === 'mock-user-id') {
      console.log('⭐ Toggling favorite for mock user (demo mode)');
      // Return a mock response for demo
      return {
        id: lessonId,
        user_id: userId,
        chapter_id: 'mock-chapter',
        chapter_title: 'Mock Chapter',
        teaching_style: 'direct',
        enhanced_sections: [],
        learning_objectives: [],
        key_vocabulary: [],
        summary: '',
        quick_quiz: [],
        is_favorite: true, // Toggle this value as needed
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as EnhancedLesson;
    }

    // First get current status
    const { data: current } = await supabase
      .from('enhanced_lessons')
      .select('is_favorite')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabase
      .from('enhanced_lessons')
      .update({ is_favorite: !current?.is_favorite })
      .eq('id', lessonId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle favorite: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete an enhanced lesson
   */
  async deleteEnhancedLesson(lessonId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('enhanced_lessons')
      .delete()
      .eq('id', lessonId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete enhanced lesson: ${error.message}`);
    }
  }

  /**
   * Update view count and last accessed
   */
  private async updateViewCount(lessonId: string): Promise<void> {
    const { error } = await supabase
      .rpc('increment_view_count', { lesson_id: lessonId });

    if (error) {
      console.error('Failed to update view count:', error);
    }
  }

  /**
   * Regenerate TTS audio for a lesson
   */
  async regenerateTTS(lessonId: string, userId: string): Promise<{ audioUrl: string; duration: number }> {
    // Check if this is a mock user (for demo purposes)
    if (userId === 'mock-user-id') {
      console.log('🔄 Regenerating TTS for mock user (demo mode)');
      // Return mock audio for demo
      return {
        audioUrl: 'https://example.com/mock-audio.mp3',
        duration: 120 // 2 minutes
      };
    }

    // Get the lesson
    const lesson = await this.getEnhancedLesson(userId, '', 'direct');
    // Note: This is a simplified version. In practice, you'd need to fetch by ID
    // and reconstruct the full lesson data.

    // For now, we'll regenerate TTS
    const audioText = ''; // Would reconstruct from lesson data
    const result = await this.ttsService.generateAudio(audioText);

    // Update in database
    await supabase
      .from('enhanced_lessons')
      .update({
        audio_url: result.audioUrl,
        audio_duration: result.duration,
      })
      .eq('id', lessonId)
      .eq('user_id', userId);

    return result;
  }

  /**
   * Prepare text for TTS conversion
   */
  private prepareTextForTTS(lesson: EnhancedLesson): string {
    let text = '';

    // Add chapter title
    text += `${lesson.chapter_title}\n\n`;

    // Add summary
    if (lesson.summary) {
      text += `Summary: ${lesson.summary}\n\n`;
    }

    // Add learning objectives
    if (lesson.learning_objectives && lesson.learning_objectives.length > 0) {
      text += 'Learning Objectives:\n';
      lesson.learning_objectives.forEach((objective, idx) => {
        text += `${idx + 1}. ${objective}\n`;
      });
      text += '\n';
    }

    // Add enhanced sections
    if (lesson.enhanced_sections && lesson.enhanced_sections.length > 0) {
      lesson.enhanced_sections.forEach((section: any) => {
        text += `${section.title}\n\n`;
        text += `${section.content}\n\n`;
      });
    }

    return text;
  }
}
