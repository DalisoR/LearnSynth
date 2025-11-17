-- ============================================================
-- MIGRATION: Add Enhanced Lessons Table
-- Run this SQL to add the missing enhanced_lessons table
-- ============================================================

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
  knowledge_base_ids JSONB DEFAULT '[]', -- References to KB subjects used
  tts_enabled BOOLEAN DEFAULT true,
  audio_url TEXT,
  audio_duration INTEGER, -- in seconds
  is_favorite BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, chapter_id, teaching_style)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_user_id ON enhanced_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_chapter_id ON enhanced_lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_lessons_teaching_style ON enhanced_lessons(teaching_style);

-- Enable Row Level Security
ALTER TABLE enhanced_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policy for enhanced_lessons
CREATE POLICY "Users can manage own enhanced lessons" ON enhanced_lessons
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_enhanced_lessons_updated_at
  BEFORE UPDATE ON enhanced_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify the table was created:
-- SELECT * FROM enhanced_lessons LIMIT 1;
