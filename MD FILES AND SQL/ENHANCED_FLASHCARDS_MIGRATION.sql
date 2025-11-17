-- Migration: Enhanced Flashcard System with Spaced Repetition
-- Creates tables for flashcards with SM-2 algorithm and image occlusion

-- Flashcards Table
CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_id TEXT,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    image_url TEXT,
    occlusion_data JSONB, -- Stores image occlusion data
    tags TEXT[],
    difficulty INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Indexes for flashcards
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON flashcards USING GIN(tags);

-- Enable RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policy for flashcards
CREATE POLICY "Users can view their own flashcards"
    ON flashcards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards"
    ON flashcards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
    ON flashcards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
    ON flashcards FOR DELETE
    USING (auth.uid() = user_id);

-- Spaced Repetition Data Table
CREATE TABLE IF NOT EXISTS flashcard_spaced_repetition (
    flashcard_id TEXT PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    easiness_factor DECIMAL(4,2) NOT NULL DEFAULT 2.5, -- SM-2 parameter
    interval_days INTEGER NOT NULL DEFAULT 0, -- days until next review
    repetitions INTEGER NOT NULL DEFAULT 0, -- consecutive correct recalls
    next_review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    review_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    average_response_time DECIMAL(8,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for spaced repetition
CREATE INDEX IF NOT EXISTS idx_sr_user_id ON flashcard_spaced_repetition(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_next_review ON flashcard_spaced_repetition(next_review_date);
CREATE INDEX IF NOT EXISTS idx_sr_interval ON flashcard_spaced_repetition(interval_days);

-- Enable RLS
ALTER TABLE flashcard_spaced_repetition ENABLE ROW LEVEL SECURITY;

-- RLS Policy for spaced repetition
CREATE POLICY "Users can view their own spaced repetition data"
    ON flashcard_spaced_repetition FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spaced repetition data"
    ON flashcard_spaced_repetition FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaced repetition data"
    ON flashcard_spaced_repetition FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spaced repetition data"
    ON flashcard_spaced_repetition FOR DELETE
    USING (auth.uid() = user_id);

-- Review History Table
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id TEXT PRIMARY KEY,
    flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5), -- 0-5 quality scale
    response_time INTEGER NOT NULL, -- milliseconds
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_type TEXT DEFAULT 'review' CHECK (review_type IN ('review', 'new', 'relearn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for review history
CREATE INDEX IF NOT EXISTS idx_reviews_flashcard_id ON flashcard_reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON flashcard_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_at ON flashcard_reviews(reviewed_at);

-- Enable RLS
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy for review history
CREATE POLICY "Users can view their own review history"
    ON flashcard_reviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review history"
    ON flashcard_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Study Sessions Table
CREATE TABLE IF NOT EXISTS flashcard_study_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_correct INTEGER NOT NULL DEFAULT 0,
    total_response_time INTEGER NOT NULL DEFAULT 0,
    session_type TEXT NOT NULL CHECK (session_type IN ('review', 'new', 'mixed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for study sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON flashcard_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON flashcard_study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON flashcard_study_sessions(end_time);

-- Enable RLS
ALTER TABLE flashcard_study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for study sessions
CREATE POLICY "Users can view their own study sessions"
    ON flashcard_study_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
    ON flashcard_study_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
    ON flashcard_study_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Flashcard Decks Table (Optional grouping)
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    card_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for decks
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON flashcard_decks(user_id);

-- Enable RLS
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;

-- RLS Policy for decks
CREATE POLICY "Users can view their own decks"
    ON flashcard_decks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decks"
    ON flashcard_decks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
    ON flashcard_decks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
    ON flashcard_decks FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update flashcard count in deck
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE flashcard_decks
        SET card_count = card_count + 1,
            updated_at = NOW()
        WHERE id = NEW.deck_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE flashcard_decks
        SET card_count = card_count - 1,
            updated_at = NOW()
        WHERE id = OLD.deck_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update card count on insert
DROP TRIGGER IF EXISTS trigger_update_deck_count ON flashcards;
CREATE TRIGGER trigger_update_deck_count
    AFTER INSERT OR DELETE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_card_count();

-- Function to automatically update spaced repetition data
CREATE OR REPLACE FUNCTION update_spaced_repetition_data()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO flashcard_spaced_repetition (
            flashcard_id,
            user_id,
            easiness_factor,
            interval_days,
            repetitions,
            next_review_date
        ) VALUES (
            NEW.id,
            NEW.user_id,
            2.5,
            0,
            0,
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create spaced repetition entry on flashcard creation
DROP TRIGGER IF EXISTS trigger_create_spaced_repetition ON flashcards;
CREATE TRIGGER trigger_create_spaced_repetition
    AFTER INSERT ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_spaced_repetition_data();

-- View for Flashcard Progress
CREATE OR REPLACE VIEW flashcard_progress AS
SELECT
    f.id as flashcard_id,
    f.user_id,
    f.front,
    f.back,
    f.tags,
    f.difficulty as current_difficulty,
    sr.easiness_factor,
    sr.interval_days,
    sr.repetitions,
    sr.next_review_date,
    sr.last_reviewed_at,
    sr.review_count,
    sr.correct_count,
    CASE
        WHEN sr.review_count = 0 THEN 0
        ELSE ROUND((sr.correct_count::DECIMAL / sr.review_count) * 100, 2)
    END as retention_rate,
    ROUND(sr.average_response_time, 2) as avg_response_time_ms,
    fd.name as deck_name
FROM flashcards f
LEFT JOIN flashcard_spaced_repetition sr ON f.id = sr.flashcard_id
LEFT JOIN flashcard_decks fd ON f.deck_id = fd.id
WHERE f.is_active = true;

-- Grant permissions
GRANT ALL ON flashcards TO authenticated;
GRANT ALL ON flashcard_spaced_repetition TO authenticated;
GRANT ALL ON flashcard_reviews TO authenticated;
GRANT ALL ON flashcard_study_sessions TO authenticated;
GRANT ALL ON flashcard_decks TO authenticated;
GRANT ALL ON flashcard_progress TO authenticated;

-- Comments
COMMENT ON TABLE flashcards IS 'Stores flashcard content including front/back and image occlusion data';
COMMENT ON TABLE flashcard_spaced_repetition IS 'Stores SM-2 spaced repetition algorithm data';
COMMENT ON TABLE flashcard_reviews IS 'Stores individual review attempts with quality and timing';
COMMENT ON TABLE flashcard_study_sessions IS 'Stores study session summaries';
COMMENT ON TABLE flashcard_decks IS 'Optional grouping for flashcards';

-- Sample data for testing (optional)
-- INSERT INTO flashcard_decks (id, user_id, name, description) VALUES
-- ('deck-1', '00000000-0000-0000-0000-000000000000', 'Biology', 'Biology flashcards');
