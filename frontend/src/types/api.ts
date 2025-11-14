// API TypeScript Types for LearnSynth Frontend

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface Document {
  id: string;
  title: string;
  file_type: 'pdf' | 'docx' | 'epub';
  file_size: number;
  upload_status: 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
}

export interface Lesson {
  id: string;
  lesson_title: string;
  summary?: string;
  key_concepts: string[];
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  narration_text?: string;
  audio_url?: string;
  references: Reference[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface Reference {
  source_doc: string;
  source_chapter: string;
  chapter_id: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface SRSItem {
  id: string;
  lesson_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  lessons: {
    id: string;
    lesson_title: string;
    flashcards: Flashcard[];
  };
}

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_at: string;
}
