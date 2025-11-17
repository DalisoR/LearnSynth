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
  type: 'study' | 'class' | 'private' | 'community';
  owner_id: string;
  privacy: 'public' | 'private' | 'hidden';
  invite_code?: string;
  avatar_url?: string;
  created_at: string;
  is_active: boolean;
  settings: Record<string, any>;
  user_role?: 'owner' | 'instructor' | 'member' | 'observer';
  joined_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'instructor' | 'member' | 'observer';
  status: 'active' | 'pending' | 'banned';
  joined_at: string;
  permissions: Record<string, any>;
  users: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface GroupDocument {
  id: string;
  group_id: string;
  document_id: string;
  uploaded_by: string;
  category?: string;
  is_pinned: boolean;
  shared_at: string;
  access_level: 'all' | 'instructors' | 'owner';
  documents: Document;
  users: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface GroupQuiz {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description?: string;
  settings: Record<string, any>;
  scheduled_for?: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  created_at: string;
  completed_at?: string;
}

export interface GroupQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  group_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  time_spent: number;
  started_at: string;
  completed_at?: string;
  answers: any[];
}

export interface GroupDiscussion {
  id: string;
  group_id: string;
  chapter_id?: string;
  created_by: string;
  title?: string;
  content: string;
  parent_id?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    full_name?: string;
    email: string;
  };
  chapters?: {
    id: string;
    title: string;
    chapter_number: number;
  };
}

export interface GroupAnalytics {
  id: string;
  group_id: string;
  user_id?: string;
  date: string;
  metrics: Record<string, any>;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  email: string;
  role: 'owner' | 'instructor' | 'member' | 'observer';
  invited_by: string;
  invite_code: string;
  expires_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
}

// ============================================================
// STUDY PLANNER TYPES
// ============================================================

export interface StudyPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  subject_name?: string;
  subject_id?: string;
  group_id?: string;
  start_date: string;
  target_completion_date?: string;
  total_hours_estimated?: number;
  total_hours_completed: number;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
}

export interface StudySession {
  id: string;
  user_id: string;
  study_plan_id?: string;
  title: string;
  description?: string;
  subject_id?: string;
  chapter_id?: string;
  document_id?: string;
  group_id?: string;
  session_type: 'study' | 'review' | 'quiz' | 'group' | 'exam_prep';
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  duration_planned?: number;
  duration_actual?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  created_at: string;
  updated_at: string;
  completion_notes?: string;
  rating?: number;
}

export interface StudyGoal {
  id: string;
  user_id: string;
  study_plan_id?: string;
  title: string;
  description?: string;
  goal_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  study_session_id?: string;
  start_time: string;
  end_time?: string;
  duration_planned: number;
  duration_actual?: number;
  session_type: 'work' | 'short_break' | 'long_break';
  status: 'active' | 'completed' | 'interrupted' | 'paused';
  cycles_completed: number;
  notes?: string;
  created_at: string;
}

export interface StudyAnalytics {
  id: string;
  user_id: string;
  study_plan_id?: string;
  date: string;
  total_study_time: number;
  sessions_completed: number;
  sessions_missed: number;
  goals_met: number;
  goals_total: number;
  pomodoro_cycles: number;
  subjects_studied: string[];
  documents_accessed: string[];
  quizzes_taken: number;
  avg_session_rating?: number;
  metadata: Record<string, any>;
}

export interface StudyRecommendation {
  id: string;
  user_id: string;
  study_plan_id?: string;
  recommendation_type: 'schedule' | 'content' | 'review' | 'break' | 'goal' | 'focus_time';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_required: boolean;
  action_url?: string;
  expires_at?: string;
  dismissed: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface StudyPreferences {
  id: string;
  user_id: string;
  preferred_study_times: Array<{ day: string; start: string; end: string }>;
  pomodoro_work_duration: number;
  pomodoro_short_break_duration: number;
  pomodoro_long_break_duration: number;
  pomodoro_cycles_before_long_break: number;
  daily_study_goal: number;
  weekly_study_goal: number;
  reminder_settings: Record<string, any>;
  notification_preferences: Record<string, any>;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface StudyAchievement {
  id: string;
  user_id: string;
  achievement_type: 'streak' | 'hours' | 'sessions' | 'goal' | 'consistency' | 'milestone';
  title: string;
  description?: string;
  icon?: string;
  value?: number;
  metadata: Record<string, any>;
  earned_at: string;
}

export interface StudySessionNote {
  id: string;
  study_session_id: string;
  user_id: string;
  content: string;
  timestamp: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
