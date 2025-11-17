-- ============================================================
-- Database Migration: KB/RAG System Updates
-- Date: 2025-11-14
-- Description: Adds KB context tracking and favorite features
-- ============================================================

-- Migration 1: Add knowledge_base_context to enhanced_lessons table
-- This stores the full KB context and references used during lesson generation
ALTER TABLE enhanced_lessons
ADD COLUMN IF NOT EXISTS knowledge_base_context JSONB DEFAULT '{"context": "", "references": []}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN enhanced_lessons.knowledge_base_context IS 'Stores KB context and source references used in lesson generation for citation and attribution';

-- Migration 2: Add is_favorite to subjects table
-- This allows users to mark favorite knowledge bases for quick access
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN subjects.is_favorite IS 'Indicates if this knowledge base is marked as favorite by the user';

-- Create index for faster favorite filtering
CREATE INDEX IF NOT EXISTS idx_subjects_favorite
ON subjects(user_id, is_favorite)
WHERE is_favorite = true;

-- ============================================================
-- Verification Queries (Run these to verify the migration)
-- ============================================================

-- Verify enhanced_lessons has the new column
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'enhanced_lessons' AND column_name = 'knowledge_base_context';

-- Verify subjects has the new column
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'subjects' AND column_name = 'is_favorite';

-- Check if index was created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'subjects' AND indexname = 'idx_subjects_favorite';

-- ============================================================
-- Rollback Script (Use if you need to revert these changes)
-- ============================================================

-- ALTER TABLE enhanced_lessons DROP COLUMN IF EXISTS knowledge_base_context;
-- ALTER TABLE subjects DROP COLUMN IF EXISTS is_favorite;
-- DROP INDEX IF EXISTS idx_subjects_favorite;

-- ============================================================
-- Sample Data Updates (Optional)
-- ============================================================

-- Set default empty context for existing enhanced lessons
-- UPDATE enhanced_lessons
-- SET knowledge_base_context = '{"context": "", "references": []}'::jsonb
-- WHERE knowledge_base_context IS NULL;

-- Set all existing subjects as non-favorite by default
-- UPDATE subjects
-- SET is_favorite = false
-- WHERE is_favorite IS NULL;

-- ============================================================
-- End of Migration
-- ============================================================
