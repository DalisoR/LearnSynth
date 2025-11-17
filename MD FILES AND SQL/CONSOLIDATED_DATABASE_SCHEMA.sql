-- ============================================================
-- LearnSynth Consolidated Database Schema
-- Complete database schema with all tables, indexes, and optimizations
-- For Supabase PostgreSQL with Vector Extension
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- CORE USER & AUTHENTICATION TABLES
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- CONTENT & KNOWLEDGE MANAGEMENT
-- ============================================================

-- Subjects (Knowledge Base subjects/courses)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Documents (uploaded textbooks)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  upload_status TEXT DEFAULT 'processing',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chapters (extracted from documents)
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Lessons (AI-generated)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  lesson_title TEXT NOT NULL,
  summary TEXT,
  key_concepts JSONB DEFAULT '[]',
  quiz JSONB DEFAULT '[]',
  flashcards JSONB DEFAULT '[]',
  narration_text TEXT,
  audio_url TEXT,
  lesson_references JSONB DEFAULT '[]',
  ai_log_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enhanced Lessons (AI-enhanced with teaching styles, saved for reuse)
CREATE TABLE IF NOT EXISTS enhanced_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_title TEXT NOT NULL,
  teaching_style TEXT NOT NULL CHECK (teaching_style IN ('socratic', 'direct', 'constructivist', 'encouraging')),
  enhanced_sections JSONB NOT NULL,
  learning_objectives JSONB DEFAULT '[]',
  key_vocabulary JSONB DEFAULT '[]',
  summary TEXT,
  quick_quiz JSONB DEFAULT '[]',
  knowledge_base_ids JSONB DEFAULT '[]',
  knowledge_base_context JSONB DEFAULT '{"context": "", "references": []}',
  tts_enabled BOOLEAN DEFAULT true,
  audio_url TEXT,
  audio_duration INTEGER,
  is_favorite BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, chapter_id, teaching_style)
);

-- Embeddings (vector storage for RAG)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- AI & CONVERSATION MANAGEMENT
-- ============================================================

-- AI Logs (auditability)
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  session_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  referenced_snippets JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Conversation Memory (for AI Tutor persistence)
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  mode TEXT DEFAULT 'tutor' CHECK (mode IN ('tutor', 'socratic')),
  context JSONB DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- SPACED REPETITION SYSTEM
-- ============================================================

-- SRS Items (Spaced Repetition System)
CREATE TABLE IF NOT EXISTS srs_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id TEXT NOT NULL,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, flashcard_id)
);

-- Enhanced Flashcards (Phase 5.5)
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  image_url TEXT,
  image_occlusion_data JSONB,
  card_type TEXT DEFAULT 'basic' CHECK (card_type IN ('basic', 'cloze', 'image_occlusion', 'reverse')),
  difficulty INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcard_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  interval INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5),
  time_taken INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- STUDY GROUPS & COLLABORATION
-- ============================================================

-- Study Groups
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'instructor', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Group Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Group Member Progress
CREATE TABLE IF NOT EXISTS group_member_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(assignment_id, user_id)
);

-- Real-time Chat (Phase 1)
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS group_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- LEARNING PATHS & ANALYTICS
-- ============================================================

-- Learning Paths
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_path_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'lesson' CHECK (type IN ('lesson', 'quiz', 'assignment', 'milestone')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(path_id, step_number)
);

-- Knowledge Gaps
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  gap_score REAL DEFAULT 0,
  identified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  addressed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'addressed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Study Plans
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  session_type TEXT DEFAULT 'study' CHECK (session_type IN ('study', 'break', 'review')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  productivity_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Study Goals
CREATE TABLE IF NOT EXISTS study_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  unit TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- PRACTICE PROBLEMS (PHASE 5.6)
-- ============================================================

CREATE TABLE IF NOT EXISTS practice_problem_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  problem_type TEXT NOT NULL CHECK (problem_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'essay', 'code', 'numeric')),
  template_data JSONB NOT NULL,
  difficulty_range JSONB DEFAULT '{"min": 0, "max": 100}',
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES practice_problem_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  problem_type TEXT NOT NULL CHECK (problem_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'essay', 'code', 'numeric')),
  difficulty INTEGER NOT NULL,
  correct_answer TEXT NOT NULL,
  options JSONB,
  explanation TEXT,
  hints JSONB DEFAULT '[]',
  topic TEXT,
  subtopic TEXT,
  tags TEXT[] DEFAULT '{}',
  estimated_time INTEGER DEFAULT 60,
  points INTEGER DEFAULT 10,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  session_type TEXT DEFAULT 'practice' CHECK (session_type IN ('practice', 'quiz', 'test')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  total_problems INTEGER DEFAULT 0,
  completed_problems INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_time INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID NOT NULL REFERENCES practice_problems(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  feedback TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_point_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT,
  mastery_score REAL DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  average_time REAL DEFAULT 0,
  last_practiced TIMESTAMP WITH TIME ZONE,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, topic, subtopic)
);

-- ============================================================
-- MIND MAPS (PHASE 5.7)
-- ============================================================

CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_content TEXT,
  source_type TEXT CHECK (source_type IN ('lesson', 'chapter', 'document', 'manual')),
  source_id UUID,
  structure JSONB NOT NULL,
  layout_type TEXT DEFAULT 'radial' CHECK (layout_type IN ('radial', 'hierarchical', 'mind_map', 'flowchart', 'tree')),
  theme TEXT DEFAULT 'default' CHECK (theme IN ('default', 'colorful', 'dark', 'minimal', 'academic')),
  color_scheme JSONB,
  settings JSONB,
  ai_generated BOOLEAN DEFAULT true,
  generation_prompt TEXT,
  generation_metadata JSONB,
  version INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mind_map_nodes (
  id TEXT PRIMARY KEY,
  mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  parent_node_id TEXT REFERENCES mind_map_nodes(node_id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  content TEXT,
  node_type TEXT DEFAULT 'topic' CHECK (node_type IN ('topic', 'subtopic', 'detail', 'note', 'reference')),
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  width INTEGER,
  height INTEGER,
  shape TEXT DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle', 'diamond', 'rounded', 'cloud')),
  color TEXT,
  background_color TEXT,
  text_color TEXT,
  font_size INTEGER DEFAULT 14,
  font_weight TEXT DEFAULT 'normal' CHECK (font_weight IN ('normal', 'bold', 'light')),
  style JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(mind_map_id, node_id)
);

CREATE TABLE IF NOT EXISTS mind_map_connections (
  id TEXT PRIMARY KEY,
  mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label TEXT,
  connection_type TEXT DEFAULT 'default' CHECK (connection_type IN ('default', 'arrow', 'dashed', 'thick', 'bidirectional')),
  style JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (mind_map_id, source_node_id) REFERENCES mind_map_nodes(mind_map_id, node_id) ON DELETE CASCADE,
  FOREIGN KEY (mind_map_id, target_node_id) REFERENCES mind_map_nodes(mind_map_id, node_id) ON DELETE CASCADE,
  UNIQUE(mind_map_id, source_node_id, target_node_id)
);

CREATE TABLE IF NOT EXISTS mind_map_versions (
  id TEXT PRIMARY KEY,
  mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  structure JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(mind_map_id, version)
);

CREATE TABLE IF NOT EXISTS mind_map_collaborators (
  id TEXT PRIMARY KEY,
  mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'edit', 'admin')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  UNIQUE(mind_map_id, user_id)
);

-- ============================================================
-- MANY-TO-MANY RELATIONSHIPS
-- ============================================================

-- Document Subjects (many-to-many)
CREATE TABLE IF NOT EXISTS document_subjects (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, subject_id)
);

-- Study Plan Items
CREATE TABLE IF NOT EXISTS study_plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('lesson', 'quiz', 'assignment', 'custom')),
  item_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  scheduled_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(plan_id, order_index)
);

-- ============================================================
-- COMPREHENSIVE PERFORMANCE INDEXES
-- ============================================================

-- Core user and content indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_favorite ON subjects(user_id, is_favorite);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(upload_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_chapters_document_id ON chapters(document_id);
CREATE INDEX IF NOT EXISTS idx_chapters_number ON chapters(document_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at);

CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_user_id ON enhanced_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_chapter ON enhanced_lessons(chapter_id, teaching_style);
CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_favorite ON enhanced_lessons(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_accessed ON enhanced_lessons(last_accessed);

-- Vector search optimization
CREATE INDEX IF NOT EXISTS embeddings_chapter_id ON embeddings(chapter_id);
CREATE INDEX IF NOT EXISTS embeddings_subject_id ON embeddings(subject_id);
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AI and chat indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_model ON ai_logs(model_name);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_subject ON chat_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_mode ON conversation_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_message ON conversation_sessions(last_message_at);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

-- SRS and flashcard indexes
CREATE INDEX IF NOT EXISTS idx_srs_items_user_id ON srs_items(user_id);
CREATE INDEX IF NOT EXISTS idx_srs_items_lesson_id ON srs_items(lesson_id);
CREATE INDEX IF NOT EXISTS idx_srs_items_next_review ON srs_items(next_review);
CREATE INDEX IF NOT EXISTS idx_srs_items_flashcard ON srs_items(user_id, flashcard_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_type ON flashcards(card_type);
CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON flashcards USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject ON flashcard_decks(subject_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_flashcard_id ON flashcard_reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_id ON flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_date ON flashcard_reviews(review_date);

-- Study groups and collaboration indexes
CREATE INDEX IF NOT EXISTS idx_study_groups_owner_id ON study_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_private ON study_groups(is_private);
CREATE INDEX IF NOT EXISTS idx_study_groups_created_at ON study_groups(created_at);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_group_progress_assignment ON group_member_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_group_progress_user_id ON group_member_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_group_progress_status ON group_member_progress(status);

CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_group_id ON user_presence(group_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

CREATE INDEX IF NOT EXISTS idx_group_chat_group_id ON group_chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_user_id ON group_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_created_at ON group_chat_messages(created_at);

-- Learning paths and knowledge gaps indexes
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_subject ON learning_paths(subject_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
CREATE INDEX IF NOT EXISTS idx_learning_paths_created_at ON learning_paths(created_at);

CREATE INDEX IF NOT EXISTS idx_learning_path_steps_path_id ON learning_path_steps(path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_order ON learning_path_steps(path_id, order_index);
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_status ON learning_path_steps(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user_id ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_subject ON knowledge_gaps(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_topic ON knowledge_gaps(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_severity ON knowledge_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_identified ON knowledge_gaps(identified_at);

-- Study plans and sessions indexes
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_date_range ON study_plans(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_plan_id ON study_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_type ON study_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject_id);

CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_status ON study_goals(status);
CREATE INDEX IF NOT EXISTS idx_study_goals_target_date ON study_goals(target_date);

-- Practice problems indexes
CREATE INDEX IF NOT EXISTS idx_practice_problems_user_id ON practice_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_problems_template ON practice_problems(template_id);
CREATE INDEX IF NOT EXISTS idx_practice_problems_type ON practice_problems(problem_type);
CREATE INDEX IF NOT EXISTS idx_practice_problems_difficulty ON practice_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_practice_problems_topic ON practice_problems(topic);
CREATE INDEX IF NOT EXISTS idx_practice_problems_ai_generated ON practice_problems(ai_generated);
CREATE INDEX IF NOT EXISTS idx_practice_problems_tags ON practice_problems USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_start_time ON practice_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_problem_id ON practice_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_session ON practice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_id ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_correct ON practice_attempts(is_correct);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_date ON practice_attempts(attempted_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_user_id ON knowledge_point_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_topic ON knowledge_point_mastery(topic, subtopic);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_score ON knowledge_point_mastery(mastery_score);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_trend ON knowledge_point_mastery(trend);

-- Mind maps indexes
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_source ON mind_maps(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_ai_generated ON mind_maps(ai_generated);
CREATE INDEX IF NOT EXISTS idx_mind_maps_created_at ON mind_maps(created_at);
CREATE INDEX IF NOT EXISTS idx_mind_maps_public ON mind_maps(is_public);
CREATE INDEX IF NOT EXISTS idx_mind_maps_tags ON mind_maps USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_mind_map_id ON mind_map_nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_parent ON mind_map_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_level ON mind_map_nodes(level);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_type ON mind_map_nodes(node_type);

CREATE INDEX IF NOT EXISTS idx_mind_map_connections_mind_map_id ON mind_map_connections(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_connections_source ON mind_map_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_connections_target ON mind_map_connections(target_node_id);

CREATE INDEX IF NOT EXISTS idx_mind_map_versions_mind_map_id ON mind_map_versions(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_versions_version ON mind_map_versions(version);

CREATE INDEX IF NOT EXISTS idx_mind_map_collaborators_mind_map_id ON mind_map_collaborators(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_collaborators_user_id ON mind_map_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_collaborators_status ON mind_map_collaborators(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_problem_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_point_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_subjects ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Subjects policies
CREATE POLICY "Users can manage own subjects" ON subjects FOR ALL USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can manage own documents" ON documents FOR ALL USING (auth.uid() = user_id);

-- Chapters policies
CREATE POLICY "Users can view chapters of own documents" ON chapters FOR ALL USING (
  EXISTS (SELECT 1 FROM documents WHERE id = document_id AND user_id = auth.uid())
);

-- Lessons policies
CREATE POLICY "Users can view lessons of own chapters" ON lessons FOR ALL USING (
  chapter_id IN (
    SELECT c.id FROM chapters c
    JOIN documents d ON c.document_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

-- Enhanced lessons policies
CREATE POLICY "Users can manage own enhanced lessons" ON enhanced_lessons FOR ALL USING (auth.uid() = user_id);

-- Embeddings policies
CREATE POLICY "Users can view own embeddings" ON embeddings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM chapters
    JOIN documents ON chapters.document_id = documents.id
    WHERE chapters.id = embeddings.chapter_id AND documents.user_id = auth.uid()
  )
  OR
  (subject_id IS NOT NULL AND subject_id IN (SELECT id FROM subjects WHERE user_id = auth.uid()))
);

-- AI logs policies
CREATE POLICY "Users can manage own ai_logs" ON ai_logs FOR ALL USING (auth.uid() = user_id);

-- Chat sessions policies
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages of own sessions" ON chat_messages FOR ALL USING (
  session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
);

-- Conversation sessions policies
CREATE POLICY "Users can manage own conversation sessions" ON conversation_sessions FOR ALL USING (auth.uid() = user_id);

-- Conversation messages policies
CREATE POLICY "Users can view messages of own conversations" ON conversation_messages FOR ALL USING (
  session_id IN (SELECT id FROM conversation_sessions WHERE user_id = auth.uid())
);

-- SRS items policies
CREATE POLICY "Users can manage own srs items" ON srs_items FOR ALL USING (auth.uid() = user_id);

-- Flashcard policies
CREATE POLICY "Users can manage own flashcards" ON flashcards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own flashcard decks" ON flashcard_decks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own flashcard reviews" ON flashcard_reviews FOR ALL USING (auth.uid() = user_id);

-- Study groups policies
CREATE POLICY "Users can manage own study groups" ON study_groups FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users can view groups they belong to" ON study_groups FOR SELECT USING (
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Group members policies
CREATE POLICY "Users can manage group members in their groups" ON group_members FOR ALL USING (
  group_id IN (SELECT id FROM study_groups WHERE owner_id = auth.uid())
  OR user_id = auth.uid()
);

-- Assignments policies
CREATE POLICY "Users can manage assignments in their groups" ON assignments FOR ALL USING (
  group_id IN (SELECT id FROM study_groups WHERE owner_id = auth.uid())
);
CREATE POLICY "Users can view assignments in their groups" ON assignments FOR ALL USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Group progress policies
CREATE POLICY "Users can manage own progress" ON group_member_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Group owners can view group member progress" ON group_member_progress FOR ALL USING (
  assignment_id IN (
    SELECT id FROM assignments
    WHERE group_id IN (SELECT id FROM study_groups WHERE owner_id = auth.uid())
  )
);

-- Presence policies
CREATE POLICY "Users can manage own presence" ON user_presence FOR ALL USING (
  user_id = auth.uid()
  OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Group chat policies
CREATE POLICY "Users can view group messages" ON group_chat_messages FOR ALL USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON group_chat_messages FOR ALL USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Learning paths policies
CREATE POLICY "Users can manage own learning paths" ON learning_paths FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view steps of own paths" ON learning_path_steps FOR ALL USING (
  path_id IN (SELECT id FROM learning_paths WHERE user_id = auth.uid())
);

-- Knowledge gaps policies
CREATE POLICY "Users can manage own knowledge gaps" ON knowledge_gaps FOR ALL USING (auth.uid() = user_id);

-- Study plans policies
CREATE POLICY "Users can manage own study plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view items of own plans" ON study_plan_items FOR ALL USING (
  plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid())
);

-- Study sessions policies
CREATE POLICY "Users can manage own study sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

-- Study goals policies
CREATE POLICY "Users can manage own study goals" ON study_goals FOR ALL USING (auth.uid() = user_id);

-- Practice problems policies
CREATE POLICY "Users can manage own practice problems" ON practice_problems FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public templates" ON practice_problem_templates FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own templates" ON practice_problem_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON practice_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own attempts" ON practice_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own mastery" ON knowledge_point_mastery FOR ALL USING (auth.uid() = user_id);

-- Mind maps policies
CREATE POLICY "Users can view own mind maps" ON mind_maps FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own mind maps" ON mind_maps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mind maps" ON mind_maps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mind maps" ON mind_maps FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view nodes in accessible mind maps" ON mind_map_nodes FOR SELECT USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid() OR is_public = true
  )
);
CREATE POLICY "Users can manage nodes in own mind maps" ON mind_map_nodes FOR ALL USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view connections in accessible mind maps" ON mind_map_connections FOR SELECT USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid() OR is_public = true
  )
);
CREATE POLICY "Users can manage connections in own mind maps" ON mind_map_connections FOR ALL USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view versions of accessible mind maps" ON mind_map_versions FOR SELECT USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid() OR is_public = true
  )
);
CREATE POLICY "Users can insert versions of own mind maps" ON mind_map_versions FOR INSERT WITH CHECK (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid()
  ) AND auth.uid() = created_by
);

CREATE POLICY "Users can view collaborations" ON mind_map_collaborators FOR SELECT USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid() OR user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage collaborations" ON mind_map_collaborators FOR ALL USING (
  mind_map_id IN (
    SELECT id FROM mind_maps WHERE user_id = auth.uid()
  ) AND (auth.uid() = invited_by OR auth.uid() = user_id)
);

-- Document subjects policies
CREATE POLICY "Users can manage document subjects for their documents" ON document_subjects FOR ALL USING (
  document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_lessons_updated_at BEFORE UPDATE ON enhanced_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_logs_updated_at BEFORE UPDATE ON ai_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_sessions_updated_at BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_srs_items_updated_at BEFORE UPDATE ON srs_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_decks_updated_at BEFORE UPDATE ON flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON study_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_member_progress_updated_at BEFORE UPDATE ON group_member_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON study_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_problems_updated_at BEFORE UPDATE ON practice_problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_sessions_updated_at BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_point_mastery_updated_at BEFORE UPDATE ON knowledge_point_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_map_nodes_updated_at BEFORE UPDATE ON mind_map_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ADDITIONAL FUNCTIONS FOR PRACTICE PROBLEMS
-- ============================================================

-- Function to calculate knowledge point mastery
CREATE OR REPLACE FUNCTION calculate_knowledge_mastery(
  p_user_id UUID,
  p_topic TEXT,
  p_subtopic TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  total_attempts INTEGER := 0;
  correct_attempts INTEGER := 0;
  avg_time REAL := 0;
BEGIN
  -- Calculate total attempts
  SELECT COUNT(*), AVG(time_spent)
  INTO total_attempts, avg_time
  FROM practice_attempts
  WHERE user_id = p_user_id
  AND problem_id IN (
    SELECT id FROM practice_problems
    WHERE topic = p_topic
    AND (subtopic = p_subtopic OR p_subtopic IS NULL)
  );

  -- Calculate correct attempts
  SELECT COUNT(*)
  INTO correct_attempts
  FROM practice_attempts
  WHERE user_id = p_user_id
  AND is_correct = true
  AND problem_id IN (
    SELECT id FROM practice_problems
    WHERE topic = p_topic
    AND (subtopic = p_subtopic OR p_subtopic IS NULL)
  );

  -- Calculate mastery score
  IF total_attempts > 0 THEN
    INSERT INTO knowledge_point_mastery (
      user_id, topic, subtopic, mastery_score,
      total_attempts, correct_attempts, average_time,
      last_practiced, updated_at
    )
    VALUES (
      p_user_id, p_topic, p_subtopic,
      (correct_attempts::REAL / total_attempts::REAL) * 100,
      total_attempts, correct_attempts,
      COALESCE(avg_time, 0),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, topic, subtopic)
    DO UPDATE SET
      mastery_score = EXCLUDED.mastery_score,
      total_attempts = EXCLUDED.total_attempts,
      correct_attempts = EXCLUDED.correct_attempts,
      average_time = EXCLUDED.average_time,
      last_practiced = EXCLUDED.last_practiced,
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ADDITIONAL FUNCTIONS FOR MIND MAPS
-- ============================================================

-- Function to increment mind map version
CREATE OR REPLACE FUNCTION increment_mind_map_version()
RETURNS TRIGGER AS $$
DECLARE
  current_version INTEGER;
BEGIN
  SELECT version INTO current_version
  FROM mind_maps
  WHERE id = NEW.id;

  INSERT INTO mind_map_versions (id, mind_map_id, version, structure, created_by)
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    current_version,
    NEW.structure,
    NEW.user_id
  );

  UPDATE mind_maps
  SET version = version + 1,
      updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate mind map structure
CREATE OR REPLACE FUNCTION generate_mind_map_structure(mind_map_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  nodes_data JSONB;
  connections_data JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', node_id,
      'label', label,
      'content', content,
      'type', node_type,
      'level', level,
      'parent', parent_node_id,
      'position', jsonb_build_object('x', position_x, 'y', position_y),
      'style', jsonb_build_object(
        'shape', shape,
        'color', color,
        'backgroundColor', background_color,
        'textColor', text_color,
        'fontSize', font_size,
        'fontWeight', font_weight
      )
    )
  )
  INTO nodes_data
  FROM mind_map_nodes
  WHERE mind_map_id = mind_map_id_param;

  SELECT jsonb_agg(
    jsonb_build_object(
      'source', source_node_id,
      'target', target_node_id,
      'label', label,
      'type', connection_type
    )
  )
  INTO connections_data
  FROM mind_map_connections
  WHERE mind_map_id = mind_map_id_param;

  result := jsonb_build_object(
    'nodes', COALESCE(nodes_data, '[]'::jsonb),
    'connections', COALESCE(connections_data, '[]'::jsonb)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS FOR REPORTING
-- ============================================================

-- View for document statistics
CREATE OR REPLACE VIEW document_stats AS
SELECT
  d.id,
  d.user_id,
  d.title,
  d.file_type,
  d.created_at,
  COUNT(DISTINCT c.id) as chapter_count,
  COUNT(DISTINCT l.id) as lesson_count,
  SUM(c.word_count) as total_words
FROM documents d
LEFT JOIN chapters c ON d.id = c.document_id
LEFT JOIN lessons l ON c.id = l.chapter_id
GROUP BY d.id, d.user_id, d.title, d.file_type, d.created_at;

-- View for user learning progress
CREATE OR REPLACE VIEW user_learning_progress AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT d.id) as documents_count,
  COUNT(DISTINCT c.id) as chapters_count,
  COUNT(DISTINCT l.id) as lessons_count,
  COUNT(DISTINCT el.id) as enhanced_lessons_count,
  COUNT(DISTINCT fc.id) as flashcards_count,
  COUNT(DISTINCT mm.id) as mind_maps_count,
  COUNT(DISTINCT pp.id) as practice_problems_count
FROM users u
LEFT JOIN documents d ON u.id = d.user_id
LEFT JOIN chapters c ON d.id = c.document_id
LEFT JOIN lessons l ON c.id = l.chapter_id
LEFT JOIN enhanced_lessons el ON u.id = el.user_id
LEFT JOIN flashcards fc ON u.id = fc.user_id
LEFT JOIN mind_maps mm ON u.id = mm.user_id
LEFT JOIN practice_problems pp ON u.id = pp.user_id
GROUP BY u.id, u.email;

-- View for study statistics
CREATE OR REPLACE VIEW study_statistics AS
SELECT
  ss.user_id,
  ss.subject_id,
  s.name as subject_name,
  COUNT(DISTINCT ss.id) as total_sessions,
  SUM(ss.duration) as total_duration,
  AVG(ss.productivity_score) as avg_productivity
FROM study_sessions ss
LEFT JOIN subjects s ON ss.subject_id = s.id
GROUP BY ss.user_id, ss.subject_id, s.name;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
