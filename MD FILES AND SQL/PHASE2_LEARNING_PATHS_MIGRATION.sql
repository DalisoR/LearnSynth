-- Migration: Learning Paths & Knowledge Gaps
-- Creates tables for personalized learning paths and ML-based knowledge gap detection

-- Knowledge Gaps Table
CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID,
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty_level INTEGER NOT NULL DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    quiz_score DECIMAL(5,2),
    quiz_id UUID,
    identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    is_resolved BOOLEAN DEFAULT false,
    recommendations TEXT[],
    ml_confidence DECIMAL(4,2) DEFAULT 0.0,
    source_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learning Paths Table
CREATE TABLE IF NOT EXISTS learning_paths (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    current_step INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    difficulty_level INTEGER DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learning Path Steps Table
CREATE TABLE IF NOT EXISTS learning_path_steps (
    id TEXT PRIMARY KEY,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT CHECK (resource_type IN ('lesson', 'quiz', 'video', 'reading', 'exercise', 'flashcard')),
    resource_id UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    difficulty_level INTEGER DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(learning_path_id, step_order)
);

-- Indexes for knowledge_gaps
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user_id ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_subject ON knowledge_gaps(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_topic ON knowledge_gaps(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_resolved ON knowledge_gaps(is_resolved);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_difficulty ON knowledge_gaps(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_identified_at ON knowledge_gaps(identified_at);

-- Indexes for learning_paths
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_subject ON learning_paths(subject_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
CREATE INDEX IF NOT EXISTS idx_learning_paths_created ON learning_paths(created_at);

-- Indexes for learning_path_steps
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_path_id ON learning_path_steps(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_order ON learning_path_steps(step_order);
CREATE INDEX IF NOT EXISTS idx_learning_path_steps_status ON learning_path_steps(status);

-- Enable RLS
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_gaps
CREATE POLICY "Users can view their own knowledge gaps"
    ON knowledge_gaps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge gaps"
    ON knowledge_gaps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge gaps"
    ON knowledge_gaps FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge gaps"
    ON knowledge_gaps FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for learning_paths
CREATE POLICY "Users can view their own learning paths"
    ON learning_paths FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning paths"
    ON learning_paths FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning paths"
    ON learning_paths FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning paths"
    ON learning_paths FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for learning_path_steps
CREATE POLICY "Users can view steps in their learning paths"
    ON learning_path_steps FOR SELECT
    USING (
        learning_path_id IN (
            SELECT id FROM learning_paths WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert steps in their learning paths"
    ON learning_path_steps FOR INSERT
    WITH CHECK (
        learning_path_id IN (
            SELECT id FROM learning_paths WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update steps in their learning paths"
    ON learning_path_steps FOR UPDATE
    USING (
        learning_path_id IN (
            SELECT id FROM learning_paths WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete steps in their learning paths"
    ON learning_path_steps FOR DELETE
    USING (
        learning_path_id IN (
            SELECT id FROM learning_paths WHERE user_id = auth.uid()
        )
    );

-- Function to update knowledge gap resolution status
CREATE OR REPLACE FUNCTION update_knowledge_gap_resolution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_resolved = true AND OLD.is_resolved = false THEN
        NEW.resolved_at = NOW();
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update knowledge gap resolution
DROP TRIGGER IF EXISTS trigger_update_knowledge_gap_resolution ON knowledge_gaps;
CREATE TRIGGER trigger_update_knowledge_gap_resolution
    BEFORE UPDATE ON knowledge_gaps
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_gap_resolution();

-- Function to update learning path progress
CREATE OR REPLACE FUNCTION update_learning_path_progress()
RETURNS TRIGGER AS $$
DECLARE
    path_total_steps INTEGER;
    path_completed_steps INTEGER;
BEGIN
    -- Count total steps
    SELECT COUNT(*)
    INTO path_total_steps
    FROM learning_path_steps
    WHERE learning_path_id = NEW.learning_path_id;

    -- Count completed steps
    SELECT COUNT(*)
    INTO path_completed_steps
    FROM learning_path_steps
    WHERE learning_path_id = NEW.learning_path_id
    AND status = 'completed';

    -- Update learning path
    UPDATE learning_paths
    SET
        total_steps = path_total_steps,
        current_step = path_completed_steps,
        updated_at = NOW(),
        status = CASE
            WHEN path_completed_steps = path_total_steps THEN 'completed'
            WHEN path_completed_steps > 0 THEN 'active'
            ELSE 'active'
        END,
        completed_at = CASE
            WHEN path_completed_steps = path_total_steps THEN NOW()
            ELSE completed_at
        END
    WHERE id = NEW.learning_path_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update learning path progress on step update
DROP TRIGGER IF EXISTS trigger_update_learning_path_progress ON learning_path_steps;
CREATE TRIGGER trigger_update_learning_path_progress
    AFTER INSERT OR UPDATE OR DELETE ON learning_path_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_path_progress();

-- Function to set timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_knowledge_gaps_updated_at ON knowledge_gaps;
CREATE TRIGGER trigger_update_knowledge_gaps_updated_at
    BEFORE UPDATE ON knowledge_gaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_learning_paths_updated_at ON learning_paths;
CREATE TRIGGER trigger_update_learning_paths_updated_at
    BEFORE UPDATE ON learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_learning_path_steps_updated_at ON learning_path_steps;
CREATE TRIGGER trigger_update_learning_path_steps_updated_at
    BEFORE UPDATE ON learning_path_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON knowledge_gaps TO authenticated;
GRANT ALL ON learning_paths TO authenticated;
GRANT ALL ON learning_path_steps TO authenticated;

-- Comments
COMMENT ON TABLE knowledge_gaps IS 'Stores identified knowledge gaps detected by ML algorithms';
COMMENT ON TABLE learning_paths IS 'Stores personalized learning paths for users';
COMMENT ON TABLE learning_path_steps IS 'Stores individual steps within learning paths';

-- Create a view for active knowledge gaps
CREATE OR REPLACE VIEW active_knowledge_gaps AS
SELECT
    kg.*,
    s.name as subject_name
FROM knowledge_gaps kg
LEFT JOIN subjects s ON kg.subject_id = s.id
WHERE kg.is_resolved = false;

-- Create a view for learning path progress
CREATE OR REPLACE VIEW learning_path_progress AS
SELECT
    lp.*,
    COUNT(lps.id) as total_steps,
    COUNT(CASE WHEN lps.status = 'completed' THEN 1 END) as completed_steps,
    ROUND(
        CASE
            WHEN COUNT(lps.id) > 0
            THEN (COUNT(CASE WHEN lps.status = 'completed' THEN 1 END)::DECIMAL / COUNT(lps.id)) * 100
            ELSE 0
        END,
        2
    ) as progress_percentage
FROM learning_paths lp
LEFT JOIN learning_path_steps lps ON lp.id = lps.learning_path_id
GROUP BY lp.id;

-- Grant view permissions
GRANT SELECT ON active_knowledge_gaps TO authenticated;
GRANT SELECT ON learning_path_progress TO authenticated;

-- Sample data for testing (optional)
-- INSERT INTO knowledge_gaps (id, user_id, topic, difficulty_level, quiz_score, recommendations)
-- VALUES
-- (gen_random_uuid()::text, '00000000-0000-0000-0000-000000000000', 'Algebra', 75, 45.5, ARRAY['Review linear equations', 'Practice quadratic formulas']);
