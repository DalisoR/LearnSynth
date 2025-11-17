-- Migration: AI Practice Problems Engine
-- Creates tables for AI-generated practice problems and user attempts

-- Practice Problem Templates Table
CREATE TABLE IF NOT EXISTS practice_problem_templates (
    id TEXT PRIMARY KEY,
    subject_id UUID,
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty_level INTEGER NOT NULL DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    problem_type TEXT NOT NULL CHECK (problem_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'essay', 'code', 'numeric')),
    question_template TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    incorrect_options TEXT[], -- For multiple choice
    explanation TEXT,
    hints JSONB,
    tags TEXT[],
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated Practice Problems Table
CREATE TABLE IF NOT EXISTS practice_problems (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES practice_problem_templates(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID,
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty_level INTEGER NOT NULL DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    problem_type TEXT NOT NULL CHECK (problem_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'essay', 'code', 'numeric')),
    question TEXT NOT NULL,
    question_data JSONB, -- For complex problem data
    correct_answer TEXT NOT NULL,
    incorrect_options TEXT[], -- For multiple choice
    explanation TEXT,
    hints JSONB,
    tags TEXT[],
    points INTEGER DEFAULT 10,
    estimated_time INTEGER DEFAULT 60, -- in seconds
    ai_generated BOOLEAN DEFAULT false,
    generation_context JSONB, -- Context used for AI generation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Practice Attempts Table
CREATE TABLE IF NOT EXISTS practice_attempts (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES practice_problems(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    time_spent INTEGER NOT NULL, -- in seconds
    attempt_number INTEGER NOT NULL DEFAULT 1,
    hints_used INTEGER DEFAULT 0,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
    mistake_type TEXT, -- categorizes common mistakes
    learning_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Practice Sessions Table
CREATE TABLE IF NOT EXISTS practice_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    subject_id UUID,
    topic TEXT,
    difficulty_level INTEGER DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    problem_count INTEGER NOT NULL DEFAULT 0,
    completed_problems INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_time INTEGER DEFAULT 0, -- in seconds
    session_type TEXT DEFAULT 'practice' CHECK (session_type IN ('practice', 'test', 'review', 'adaptive')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Problem Categories Table
CREATE TABLE IF NOT EXISTS problem_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Point Mastery Table
CREATE TABLE IF NOT EXISTS knowledge_point_mastery (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID,
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty_level INTEGER NOT NULL DEFAULT 50 CHECK (difficulty_level >= 0 AND difficulty_level <= 100),
    total_attempts INTEGER NOT NULL DEFAULT 0,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    average_time DECIMAL(8,2) DEFAULT 0,
    mastery_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, topic, subtopic)
);

-- Indexes for practice_problem_templates
CREATE INDEX IF NOT EXISTS idx_ppt_subject ON practice_problem_templates(subject_id);
CREATE INDEX IF NOT EXISTS idx_ppt_topic ON practice_problem_templates(topic);
CREATE INDEX IF NOT EXISTS idx_ppt_difficulty ON practice_problem_templates(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_ppt_type ON practice_problem_templates(problem_type);
CREATE INDEX IF NOT EXISTS idx_ppt_tags ON practice_problem_templates USING GIN(tags);

-- Indexes for practice_problems
CREATE INDEX IF NOT EXISTS idx_pp_user_id ON practice_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_subject ON practice_problems(subject_id);
CREATE INDEX IF NOT EXISTS idx_pp_topic ON practice_problems(topic);
CREATE INDEX IF NOT EXISTS idx_pp_difficulty ON practice_problems(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_pp_type ON practice_problems(problem_type);
CREATE INDEX IF NOT EXISTS idx_pp_created_at ON practice_problems(created_at);
CREATE INDEX IF NOT EXISTS idx_pp_ai_generated ON practice_problems(ai_generated);

-- Indexes for practice_attempts
CREATE INDEX IF NOT EXISTS idx_pa_problem_id ON practice_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_pa_user_id ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_session_id ON practice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_pa_correct ON practice_attempts(is_correct);
CREATE INDEX IF NOT EXISTS idx_pa_created_at ON practice_attempts(created_at);

-- Indexes for practice_sessions
CREATE INDEX IF NOT EXISTS idx_ps_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ps_subject ON practice_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_ps_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ps_started_at ON practice_sessions(started_at);

-- Indexes for knowledge_point_mastery
CREATE INDEX IF NOT EXISTS idx_kpm_user_id ON knowledge_point_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_kpm_subject ON knowledge_point_mastery(subject_id);
CREATE INDEX IF NOT EXISTS idx_kpm_topic ON knowledge_point_mastery(topic);
CREATE INDEX IF NOT EXISTS idx_kpm_mastery ON knowledge_point_mastery(mastery_score);
CREATE INDEX IF NOT EXISTS idx_kpm_last_practiced ON knowledge_point_mastery(last_practiced_at);

-- Enable RLS
ALTER TABLE practice_problem_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_point_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_problem_templates
CREATE POLICY "Users can view practice problem templates"
    ON practice_problem_templates FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert practice problem templates"
    ON practice_problem_templates FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update practice problem templates"
    ON practice_problem_templates FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can delete practice problem templates"
    ON practice_problem_templates FOR DELETE
    USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for practice_problems
CREATE POLICY "Users can view their own practice problems"
    ON practice_problems FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice problems"
    ON practice_problems FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice problems"
    ON practice_problems FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice problems"
    ON practice_problems FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for practice_attempts
CREATE POLICY "Users can view their own practice attempts"
    ON practice_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice attempts"
    ON practice_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice attempts"
    ON practice_attempts FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view their own practice sessions"
    ON practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
    ON practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
    ON practice_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions"
    ON practice_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for problem_categories
CREATE POLICY "Users can view problem categories"
    ON problem_categories FOR SELECT
    USING (true);

-- RLS Policies for knowledge_point_mastery
CREATE POLICY "Users can view their own knowledge mastery"
    ON knowledge_point_mastery FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge mastery"
    ON knowledge_point_mastery FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge mastery"
    ON knowledge_point_mastery FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to update practice session statistics
CREATE OR REPLACE FUNCTION update_practice_session_stats()
RETURNS TRIGGER AS $$
DECLARE
    session_completed INTEGER;
    session_correct INTEGER;
    session_total_time INTEGER;
BEGIN
    -- Count completed problems
    SELECT COUNT(*), COALESCE(SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END), 0), COALESCE(SUM(pa.time_spent), 0)
    INTO session_completed, session_correct, session_total_time
    FROM practice_attempts pa
    WHERE pa.session_id = NEW.session_id;

    -- Update practice session
    UPDATE practice_sessions
    SET
        completed_problems = session_completed,
        correct_answers = session_correct,
        total_time = session_total_time,
        updated_at = NOW(),
        status = CASE
            WHEN session_completed = (
                SELECT COUNT(*) FROM practice_problems WHERE id IN (
                    SELECT problem_id FROM practice_attempts WHERE session_id = NEW.session_id
                )
            ) THEN 'completed'
            ELSE 'in_progress'
        END,
        completed_at = CASE
            WHEN session_completed = (
                SELECT COUNT(*) FROM practice_problems WHERE id IN (
                    SELECT problem_id FROM practice_attempts WHERE session_id = NEW.session_id
                )
            ) THEN NOW()
            ELSE completed_at
        END
    WHERE id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session stats on attempt
DROP TRIGGER IF EXISTS trigger_update_practice_session_stats ON practice_attempts;
CREATE TRIGGER trigger_update_practice_session_stats
    AFTER INSERT ON practice_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_practice_session_stats();

-- Function to update knowledge mastery
CREATE OR REPLACE FUNCTION update_knowledge_mastery()
RETURNS TRIGGER AS $$
DECLARE
    mastery_score_val DECIMAL(5,2);
    avg_time_val DECIMAL(8,2);
    total_attempts_val INTEGER;
    correct_attempts_val INTEGER;
BEGIN
    -- Calculate mastery metrics
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0),
        COALESCE(AVG(time_spent), 0)
    INTO total_attempts_val, correct_attempts_val, avg_time_val
    FROM practice_attempts
    WHERE problem_id = NEW.problem_id
    AND user_id = NEW.user_id;

    -- Calculate mastery score (0-100)
    mastery_score_val = CASE
        WHEN total_attempts_val > 0
        THEN ROUND((correct_attempts_val::DECIMAL / total_attempts_val) * 100, 2)
        ELSE 0
    END;

    -- Get topic from problem
    INSERT INTO knowledge_point_mastery (
        id, user_id, subject_id, topic, subtopic, difficulty_level,
        total_attempts, correct_attempts, average_time, mastery_score,
        trend, last_practiced_at
    )
    SELECT
        gen_random_uuid()::text,
        NEW.user_id,
        pp.subject_id,
        pp.topic,
        pp.subtopic,
        pp.difficulty_level,
        total_attempts_val,
        correct_attempts_val,
        avg_time_val,
        mastery_score_val,
        'stable',
        NOW()
    FROM practice_problems pp
    WHERE pp.id = NEW.problem_id
    ON CONFLICT (user_id, topic, subtopic)
    DO UPDATE SET
        subject_id = EXCLUDED.subject_id,
        difficulty_level = EXCLUDED.difficulty_level,
        total_attempts = EXCLUDED.total_attempts,
        correct_attempts = EXCLUDED.correct_attempts,
        average_time = EXCLUDED.average_time,
        mastery_score = EXCLUDED.mastery_score,
        last_practiced_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update mastery on attempt
DROP TRIGGER IF EXISTS trigger_update_knowledge_mastery ON practice_attempts;
CREATE TRIGGER trigger_update_knowledge_mastery
    AFTER INSERT ON practice_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_mastery();

-- Function to update attempt number
CREATE OR REPLACE FUNCTION update_attempt_number()
RETURNS TRIGGER AS $$
DECLARE
    max_attempt INTEGER;
BEGIN
    SELECT COALESCE(MAX(attempt_number), 0)
    INTO max_attempt
    FROM practice_attempts
    WHERE problem_id = NEW.problem_id
    AND user_id = NEW.user_id;

    NEW.attempt_number = max_attempt + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set attempt number
DROP TRIGGER IF EXISTS trigger_set_attempt_number ON practice_attempts;
CREATE TRIGGER trigger_set_attempt_number
    BEFORE INSERT ON practice_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_attempt_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_ppt_updated_at ON practice_problem_templates;
CREATE TRIGGER trigger_update_ppt_updated_at
    BEFORE UPDATE ON practice_problem_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_pp_updated_at ON practice_problems;
CREATE TRIGGER trigger_update_pp_updated_at
    BEFORE UPDATE ON practice_problems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_ps_updated_at ON practice_sessions;
CREATE TRIGGER trigger_update_ps_updated_at
    BEFORE UPDATE ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_kpm_updated_at ON knowledge_point_mastery;
CREATE TRIGGER trigger_update_kpm_updated_at
    BEFORE UPDATE ON knowledge_point_mastery
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON practice_problem_templates TO authenticated;
GRANT ALL ON practice_problems TO authenticated;
GRANT ALL ON practice_attempts TO authenticated;
GRANT ALL ON practice_sessions TO authenticated;
GRANT SELECT ON problem_categories TO authenticated;
GRANT ALL ON knowledge_point_mastery TO authenticated;

-- Comments
COMMENT ON TABLE practice_problem_templates IS 'Reusable templates for generating practice problems';
COMMENT ON TABLE practice_problems IS 'AI-generated or curated practice problems for users';
COMMENT ON TABLE practice_attempts IS 'User attempts at solving practice problems';
COMMENT ON TABLE practice_sessions IS 'Practice sessions containing multiple problems';
COMMENT ON TABLE problem_categories IS 'Categorization of practice problem types';
COMMENT ON TABLE knowledge_point_mastery IS 'Track user mastery of specific knowledge points';

-- Create views for analytics
CREATE OR REPLACE VIEW problem_performance AS
SELECT
    pp.id,
    pp.user_id,
    pp.topic,
    pp.difficulty_level,
    COUNT(pa.id) as total_attempts,
    COUNT(CASE WHEN pa.is_correct THEN 1 END) as correct_attempts,
    ROUND(
        CASE
            WHEN COUNT(pa.id) > 0
            THEN (COUNT(CASE WHEN pa.is_correct THEN 1 END)::DECIMAL / COUNT(pa.id)) * 100
            ELSE 0
        END, 2
    ) as accuracy_rate,
    ROUND(AVG(pa.time_spent), 2) as avg_time_spent,
    ROUND(AVG(pa.difficulty_rating), 2) as avg_difficulty_rating
FROM practice_problems pp
LEFT JOIN practice_attempts pa ON pp.id = pa.problem_id
GROUP BY pp.id, pp.user_id, pp.topic, pp.difficulty_level;

CREATE OR REPLACE VIEW topic_mastery_overview AS
SELECT
    kpm.user_id,
    kpm.topic,
    kpm.subtopic,
    kpm.mastery_score,
    kpm.total_attempts,
    kpm.correct_attempts,
    kpm.trend,
    kpm.last_practiced_at,
    CASE
        WHEN kpm.mastery_score >= 80 THEN 'Mastered'
        WHEN kpm.mastery_score >= 60 THEN 'Proficient'
        WHEN kpm.mastery_score >= 40 THEN 'Developing'
        ELSE 'Needs Practice'
    END as proficiency_level
FROM knowledge_point_mastery kpm
ORDER BY kpm.mastery_score DESC;

-- Grant view permissions
GRANT SELECT ON problem_performance TO authenticated;
GRANT SELECT ON topic_mastery_overview TO authenticated;

-- Insert default problem categories
INSERT INTO problem_categories (id, name, description, icon, color) VALUES
(gen_random_uuid()::text, 'Mathematics', 'Math problems and equations', '∑', '#3b82f6'),
(gen_random_uuid()::text, 'Science', 'Science and scientific concepts', '🔬', '#10b981'),
(gen_random_uuid()::text, 'Language', 'Language and grammar', '📝', '#f59e0b'),
(gen_random_uuid()::text, 'History', 'Historical events and facts', '📜', '#ef4444'),
(gen_random_uuid()::text, 'Programming', 'Coding and programming', '💻', '#8b5cf6'),
(gen_random_uuid()::text, 'General Knowledge', 'General knowledge questions', '🧠', '#06b6d4')
ON CONFLICT (name) DO NOTHING;
