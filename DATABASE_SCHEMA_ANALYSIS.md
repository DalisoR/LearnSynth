# Database Schema Analysis & Migration Guide

## 🔍 Problem Identified

Chapters are not displaying in the left sidebar of the lesson workspace because:

1. **Missing columns** in the `chapters` table
2. **Missing tables** (`user_progress`, `quiz_attempts`)
3. **Data structure mismatch** between what the API expects vs what exists

---

## 📊 Current Database Schema

### Existing `chapters` Table
```sql
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Missing Columns Needed
The learning system expects these additional columns:
- `key_topics` (JSONB) - Array of key topics
- `difficulty` (TEXT) - 'beginner', 'intermediate', or 'advanced'
- `prerequisites` (JSONB) - Array of prerequisites
- `summary` (TEXT) - Chapter summary
- `estimated_read_time` (INTEGER) - Minutes to read
- `section_count` (INTEGER) - Number of sections

---

## 🆕 Required New Tables

### 1. user_progress Table
Tracks user learning progress per chapter.

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  is_locked BOOLEAN DEFAULT false,
  is_unlocked BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  quiz_attempts INTEGER DEFAULT 0,
  best_score DECIMAL(5,2) DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  time_spent INTEGER DEFAULT 0, -- in seconds
  mastery_level TEXT DEFAULT 'novice' CHECK (mastery_level IN ('novice', 'developing', 'proficient', 'mastered')),
  weak_areas JSONB DEFAULT '[]'::jsonb,
  strong_areas JSONB DEFAULT '[]'::jsonb,
  next_review_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);
```

### 2. quiz_attempts Table
Records all quiz attempts.

```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  quiz_id TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  total_points INTEGER NOT NULL,
  earned_points INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL, -- in seconds
  answers JSONB DEFAULT '[]'::jsonb,
  attempted_at TIMESTAMP DEFAULT NOW()
);
```

### 3. quizzes Table
Stores generated quizzes.

```sql
CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  pass_mark INTEGER DEFAULT 70,
  time_limit INTEGER, -- in minutes
  total_points INTEGER NOT NULL,
  adaptive BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Migration Script

Run this SQL in your Supabase SQL Editor:

```sql
-- =====================================================
-- MIGRATION: Add Missing Columns to Chapters Table
-- =====================================================

ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS key_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS section_count INTEGER DEFAULT 0;

-- =====================================================
-- MIGRATION: Create user_progress Table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  is_locked BOOLEAN DEFAULT false,
  is_unlocked BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  quiz_attempts INTEGER DEFAULT 0,
  best_score DECIMAL(5,2) DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  time_spent INTEGER DEFAULT 0,
  mastery_level TEXT DEFAULT 'novice' CHECK (mastery_level IN ('novice', 'developing', 'proficient', 'mastered')),
  weak_areas JSONB DEFAULT '[]'::jsonb,
  strong_areas JSONB DEFAULT '[]'::jsonb,
  next_review_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_chapter_id ON user_progress(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_document_id ON user_progress(document_id);

-- =====================================================
-- MIGRATION: Create quiz_attempts Table
-- =====================================================

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  quiz_id TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  total_points INTEGER NOT NULL,
  earned_points INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL,
  answers JSONB DEFAULT '[]'::jsonb,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_chapter_id ON quiz_attempts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);

-- =====================================================
-- MIGRATION: Create quizzes Table
-- =====================================================

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  pass_mark INTEGER DEFAULT 70,
  time_limit INTEGER,
  total_points INTEGER NOT NULL,
  adaptive BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);

-- =====================================================
-- MIGRATION: Enable RLS (Row Level Security)
-- =====================================================

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_progress
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for quiz_attempts
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for quizzes (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view quizzes" ON quizzes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage quizzes" ON quizzes
  FOR ALL TO service_role USING (true);

-- =====================================================
-- MIGRATION: Update Existing Chapters
-- =====================================================

-- Set difficulty for existing chapters based on word count
UPDATE chapters
SET difficulty = CASE
  WHEN word_count < 1000 THEN 'beginner'
  WHEN word_count < 5000 THEN 'intermediate'
  ELSE 'advanced'
END
WHERE difficulty IS NULL OR difficulty = 'intermediate';

-- Set estimated_read_time based on word count (200 words per minute)
UPDATE chapters
SET estimated_read_time = CEIL(word_count / 200.0)
WHERE estimated_read_time = 0 OR estimated_read_time IS NULL;

-- Generate summaries for existing chapters (first 200 characters)
UPDATE chapters
SET summary = SUBSTRING(content FROM 1 FOR 200) || '...'
WHERE summary IS NULL OR summary = '';

-- Count sections based on content (rough estimate)
UPDATE chapters
SET section_count = (
  SELECT COUNT(*)
  FROM (
    SELECT 1
    FROM generate_series(1, LENGTH(content) / 1000)
    WHERE SUBSTRING(content, (series * 1000)::int, 100) LIKE '%Chapter%'
  ) AS sections
)
WHERE section_count = 0 OR section_count IS NULL;

-- =====================================================
-- MIGRATION: Create Functions for Auto-updating Timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for user_progress
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION: Verify Schema
-- =====================================================

-- Check chapters table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chapters'
ORDER BY ordinal_position;

-- Check if new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_progress', 'quiz_attempts', 'quizzes');

-- Count existing chapters
SELECT COUNT(*) as chapter_count FROM chapters;

-- Count chapters with difficulty set
SELECT difficulty, COUNT(*) as count
FROM chapters
GROUP BY difficulty;
```

---

## 🎯 Next Steps

1. **Run the migration script** in Supabase SQL Editor
2. **Verify** all tables and columns were created
3. **Test** by uploading a new document
4. **Check** if chapters appear in lesson workspace

---

## 📋 API Endpoints Status

### Working Endpoints
- ✅ `GET /api/documents/:id/chapters` - Returns raw chapter data
- ✅ `POST /api/documents/upload` - Uploads document and creates chapters

### Learning Endpoints (Need Database Migration)
- ✅ `GET /api/learning/chapters/:documentId` - Returns enhanced chapter data with progress
- ✅ `POST /api/learning/quiz/generate` - Generates AI quiz
- ✅ `POST /api/learning/quiz/submit` - Submits and grades quiz
- ✅ `GET /api/learning/progress/:chapterId` - Gets user progress

---

## 🔄 Frontend Compatibility

The frontend `LessonWorkspace.tsx` calls:
```javascript
learningApi.getChapters(documentId, userId)
```

Which hits: `GET /api/learning/chapters/:documentId`

This requires the database schema to be updated. After running the migration, chapters should display correctly.

---

## ⚠️ Important Notes

1. **Test User ID**: The system uses hardcoded test user ID `00000000-0000-0000-0000-000000000000`
2. **RLS Policies**: Row Level Security is enabled for user data
3. **UUID Generation**: Uses PostgreSQL's `gen_random_uuid()` function
4. **JSON Fields**: Use JSONB for better performance with JSON data

---

## ✅ Expected Outcome

After running the migration:
1. Chapters will display in the left sidebar ✅
2. Progress tracking will work ✅
3. Quiz generation will work ✅
4. All learning features will be functional ✅
