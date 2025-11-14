// Database TypeScript Types for LearnSynth

export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_type: 'pdf' | 'docx' | 'epub';
  file_size: number;
  file_path: string;
  upload_status: 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  document_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  chapter_id: string;
  lesson_title: string;
  summary?: string;
  key_concepts: string[];
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  narration_text?: string;
  audio_url?: string;
  references: Reference[];
  ai_log_id?: string;
  created_at: string;
  updated_at: string;
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

export interface Embedding {
  id: string;
  chapter_id: string;
  subject_id?: string;
  content_chunk: string;
  embedding?: number[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface AILog {
  id: string;
  user_id: string;
  model_name: string;
  prompt: string;
  response: string;
  tokens_used: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  subject_id?: string;
  session_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  referenced_snippets: {
    content: string;
    score: number;
    source: string;
  }[];
  created_at: string;
}

export interface SRSItem {
  id: string;
  user_id: string;
  flashcard_id: string;
  lesson_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  created_at: string;
  updated_at: string;
}

export interface StudyGroup {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'instructor' | 'member';
  joined_at: string;
}

export interface Assignment {
  id: string;
  group_id: string;
  lesson_id: string;
  due_date?: string;
  created_at: string;
}

export interface GroupMemberProgress {
  id: string;
  assignment_id: string;
  user_id: string;
  status: 'assigned' | 'in_progress' | 'completed';
  score?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentSubject {
  document_id: string;
  subject_id: string;
}
