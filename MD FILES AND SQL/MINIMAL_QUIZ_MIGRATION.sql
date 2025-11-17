-- ============================================================
-- MINIMAL Quiz Migration - ONLY quiz tables, no dependencies
-- Creates just the essential quiz tables to fix the error
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. QUIZZES TABLE (THE FIX!)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quizzes') THEN
        CREATE TABLE quizzes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            chapter_id UUID NOT NULL,
            title TEXT NOT NULL,
            questions JSONB NOT NULL,
            time_limit INTEGER,
            pass_mark INTEGER DEFAULT 70,
            total_points INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        RAISE NOTICE '✓ Created quizzes table';
    ELSE
        RAISE NOTICE '✓ quizzes table already exists';
    END IF;
END $$;

-- ============================================================
-- 2. QUIZ RESULTS TABLE
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_results') THEN
        CREATE TABLE quiz_results (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            quiz_id UUID NOT NULL,
            user_id UUID NOT NULL,
            answers JSONB NOT NULL,
            score DECIMAL(5,2) NOT NULL,
            total_points INTEGER NOT NULL,
            earned_points INTEGER NOT NULL,
            passed BOOLEAN NOT NULL,
            time_spent INTEGER DEFAULT 0,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        RAISE NOTICE '✓ Created quiz_results table';
    ELSE
        RAISE NOTICE '✓ quiz_results table already exists';
    END IF;
END $$;

-- ============================================================
-- 3. INDEXES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quizzes_chapter_id') THEN
        CREATE INDEX idx_quizzes_chapter_id ON quizzes(chapter_id);
        RAISE NOTICE '✓ Created quizzes index';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_results_quiz_id') THEN
        CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
        RAISE NOTICE '✓ Created quiz_results index';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_results_user_id') THEN
        CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
        RAISE NOTICE '✓ Created quiz_results user index';
    END IF;
END $$;

-- ============================================================
-- 4. BASIC RLS (without foreign keys)
-- ============================================================

DO $$
BEGIN
    -- Enable RLS
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quizzes' AND relrowsecurity = true) THEN
        ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_results' AND relrowsecurity = true) THEN
        ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================
-- 5. SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MINIMAL QUIZ MIGRATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✓ quizzes';
    RAISE NOTICE '  ✓ quiz_results';
    RAISE NOTICE '';
    RAISE NOTICE 'Your quiz error is now FIXED! 🎉';
    RAISE NOTICE '========================================';
END $$;
