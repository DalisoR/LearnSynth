-- Migration: Personalized Learning Paths & Knowledge Gaps
-- Description: Tables for AI-driven personalized learning paths
-- Created: November 2024

-- ============================================
-- Learning Paths Table
-- ============================================
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'archived'
  target_completion_date DATE,
  current_node_id UUID, -- Points to current node in the path
  total_nodes INTEGER DEFAULT 0,
  completed_nodes INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for learning_paths
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
CREATE INDEX IF NOT EXISTS idx_learning_paths_created_at ON learning_paths(created_at DESC);

-- RLS Policies for learning_paths
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

-- Users can only access their own learning paths
CREATE POLICY "Users can manage their own learning paths"
  ON learning_paths
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Path Nodes Table (Individual Steps)
-- ============================================
CREATE TABLE IF NOT EXISTS path_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type VARCHAR(50) NOT NULL, -- 'lesson', 'quiz', 'video', 'reading', 'practice'
  node_order INTEGER NOT NULL,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  estimated_duration INTEGER, -- in minutes
  prerequisites JSONB DEFAULT '[]', -- Array of node IDs that must be completed first
  resources JSONB DEFAULT '{}', -- URLs, documents, etc.
  metadata JSONB DEFAULT '{}', -- Additional data (quiz_id, document_id, etc.)
  status VARCHAR(20) NOT NULL DEFAULT 'locked', -- 'locked', 'available', 'in_progress', 'completed', 'skipped'
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for path_nodes
CREATE INDEX IF NOT EXISTS idx_path_nodes_path_id ON path_nodes(path_id);
CREATE INDEX IF NOT EXISTS idx_path_nodes_subject_id ON path_nodes(subject_id);
CREATE INDEX IF NOT EXISTS idx_path_nodes_order ON path_nodes(path_id, node_order);
CREATE INDEX IF NOT EXISTS idx_path_nodes_status ON path_nodes(status);

-- RLS Policies for path_nodes
ALTER TABLE path_nodes ENABLE ROW LEVEL SECURITY;

-- Users can only access nodes from their own learning paths
CREATE POLICY "Users can access their own path nodes"
  ON path_nodes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM learning_paths
      WHERE learning_paths.id = path_nodes.path_id
      AND learning_paths.user_id = auth.uid()
    )
  );

-- ============================================
-- Knowledge Gaps Table
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT, -- More specific area
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  gap_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100, calculated score
  identified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_assessed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'improving', 'resolved'
  evidence JSONB DEFAULT '{}', -- Quiz results, quiz questions failed, etc.
  recommendations JSONB DEFAULT '[]', -- Suggested content for improvement
  progress_tracking JSONB DEFAULT '[]', -- Historical progress data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for knowledge_gaps
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user_id ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_subject_id ON knowledge_gaps(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_severity ON knowledge_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_gap_score ON knowledge_gaps(gap_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(status);

-- RLS Policies for knowledge_gaps
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- Users can only access their own knowledge gaps
CREATE POLICY "Users can manage their own knowledge gaps"
  ON knowledge_gaps
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Learning Path Recommendations Table (AI Generated)
-- ============================================
CREATE TABLE IF NOT EXISTS path_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  recommendation_type VARCHAR(50) NOT NULL, -- 'next_topic', 'difficulty_adjustment', 'practice_area'
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT, -- Why this recommendation was made
  confidence_score DECIMAL(5,2), -- 0-100, AI confidence
  content_data JSONB DEFAULT '{}', -- Structured data for the recommendation
  priority INTEGER DEFAULT 1, -- 1-5, higher = more important
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'implemented'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') -- Recommendations expire after 7 days
);

-- Indexes for path_recommendations
CREATE INDEX IF NOT EXISTS idx_path_recommendations_user_id ON path_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_path_recommendations_subject_id ON path_recommendations(subject_id);
CREATE INDEX IF NOT EXISTS idx_path_recommendations_status ON path_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_path_recommendations_expires_at ON path_recommendations(expires_at);

-- RLS Policies for path_recommendations
ALTER TABLE path_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own recommendations
CREATE POLICY "Users can manage their own recommendations"
  ON path_recommendations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- User Learning Analytics Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_learning_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Performance Metrics
  quiz_attempts INTEGER DEFAULT 0,
  quiz_correct_answers INTEGER DEFAULT 0,
  quiz_accuracy DECIMAL(5,2) DEFAULT 0.00,
  -- Learning Time
  total_study_time INTEGER DEFAULT 0, -- in minutes
  lesson_completions INTEGER DEFAULT 0,
  -- Knowledge Gap Metrics
  new_gaps_identified INTEGER DEFAULT 0,
  gaps_improved INTEGER DEFAULT 0,
  gaps_resolved INTEGER DEFAULT 0,
  -- Learning Velocity
  topics_covered INTEGER DEFAULT 0,
  average_completion_time INTEGER, -- in minutes
  -- Overall Score
  daily_score DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_id, date)
);

-- Indexes for user_learning_analytics
CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_id ON user_learning_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_subject_id ON user_learning_analytics(subject_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_date ON user_learning_analytics(date DESC);

-- RLS Policies for user_learning_analytics
ALTER TABLE user_learning_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own analytics
CREATE POLICY "Users can access their own learning analytics"
  ON user_learning_analytics
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Adaptive Difficulty Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS adaptive_difficulty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  base_difficulty INTEGER NOT NULL CHECK (base_difficulty BETWEEN 1 AND 5),
  current_difficulty INTEGER NOT NULL CHECK (current_difficulty BETWEEN 1 AND 5),
  adjustment_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual', 'auto', 'ai_recommended'
  adjustment_reason TEXT, -- Why difficulty was adjusted
  performance_history JSONB DEFAULT '[]', -- Last 10 quiz performances
  success_threshold DECIMAL(5,2) DEFAULT 70.00, -- Success threshold for maintaining difficulty
  failure_threshold DECIMAL(5,2) DEFAULT 40.00, -- Failure threshold for reducing difficulty
  last_adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

-- Indexes for adaptive_difficulty_settings
CREATE INDEX IF NOT EXISTS idx_adaptive_difficulty_user_id ON adaptive_difficulty_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_difficulty_subject_id ON adaptive_difficulty_settings(subject_id);

-- RLS Policies for adaptive_difficulty_settings
ALTER TABLE adaptive_difficulty_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own difficulty settings
CREATE POLICY "Users can manage their own difficulty settings"
  ON adaptive_difficulty_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update learning path progress
CREATE OR REPLACE FUNCTION update_learning_path_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status != 'completed') THEN
    UPDATE learning_paths
    SET completed_nodes = completed_nodes + 1,
        progress_percentage = (completed_nodes + 1) * 100.0 / NULLIF(total_nodes, 0),
        completed_at = CASE
          WHEN (completed_nodes + 1) >= total_nodes THEN NOW()
          ELSE NULL
        END,
        status = CASE
          WHEN (completed_nodes + 1) >= total_nodes THEN 'completed'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.path_id;
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    UPDATE learning_paths
    SET completed_nodes = completed_nodes - 1,
        progress_percentage = (completed_nodes - 1) * 100.0 / NULLIF(total_nodes, 0),
        completed_at = NULL,
        status = 'active',
        updated_at = NOW()
    WHERE id = NEW.path_id;
  ELSE
    UPDATE learning_paths
    SET updated_at = NOW()
    WHERE id = NEW.path_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update learning path progress
DROP TRIGGER IF EXISTS trigger_update_path_progress ON path_nodes;
CREATE TRIGGER trigger_update_path_progress
  AFTER INSERT OR UPDATE ON path_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_path_progress();

-- Function to calculate knowledge gap score
CREATE OR REPLACE FUNCTION calculate_knowledge_gap_score(
  p_user_id UUID,
  p_subject_id UUID,
  p_topic TEXT,
  p_quiz_results JSONB DEFAULT '{}'
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_questions INTEGER := 0;
  correct_answers INTEGER := 0;
  incorrect_questions JSONB := '[]';
  gap_score DECIMAL(5,2);
BEGIN
  -- Extract quiz data
  total_questions := COALESCE((p_quiz_results->>'total_questions')::INTEGER, 0);
  correct_answers := COALESCE((p_quiz_results->>'correct_answers')::INTEGER, 0);
  incorrect_questions := COALESCE(p_quiz_results->'incorrect_questions', '[]'::JSONB);

  -- Calculate gap score based on performance
  IF total_questions > 0 THEN
    gap_score := (total_questions - correct_answers) * 100.0 / total_questions;
  ELSE
    gap_score := 0.00;
  END IF;

  -- Adjust score based on frequency of incorrect answers
  -- If user fails same topic multiple times, increase severity
  gap_score := gap_score + (jsonb_array_length(incorrect_questions) * 5);

  -- Cap at 100
  IF gap_score > 100 THEN
    gap_score := 100;
  END IF;

  RETURN gap_score;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically identify knowledge gaps
CREATE OR REPLACE FUNCTION identify_knowledge_gaps()
RETURNS void AS $$
DECLARE
  user_rec RECORD;
  quiz_rec RECORD;
  existing_gap RECORD;
  gap_score DECIMAL(5,2);
BEGIN
  FOR user_rec IN
    SELECT DISTINCT qr.user_id, qr.quiz_id, q.subject_id
    FROM quiz_results qr
    JOIN quizzes q ON q.id = qr.quiz_id
    WHERE qr.created_at >= NOW() - INTERVAL '24 hours'
      AND qr.score < 70.00 -- Score below 70% indicates potential gap
  LOOP
    -- Get quiz questions for this user
    FOR quiz_rec IN
      SELECT * FROM jsonb_array_elements(
        (SELECT answers FROM quiz_results
         WHERE quiz_id = user_rec.quiz_id AND user_id = user_rec.user_id
         ORDER BY created_at DESC LIMIT 1)
      ) AS question_data
    LOOP
      -- Check if question was incorrect
      IF (quiz_rec->>'is_correct')::BOOLEAN = FALSE THEN
        gap_score := calculate_knowledge_gap_score(
          user_rec.user_id,
          user_rec.subject_id,
          quiz_rec->>'topic',
          quiz_rec
        );

        -- Check if gap already exists
        SELECT * INTO existing_gap
        FROM knowledge_gaps
        WHERE user_id = user_rec.user_id
          AND subject_id = user_rec.subject_id
          AND topic = quiz_rec->>'topic'
          AND status = 'active';

        IF FOUND THEN
          -- Update existing gap
          UPDATE knowledge_gaps
          SET gap_score = gap_score,
              last_assessed_at = NOW(),
              evidence = COALESCE(evidence, '{}'::JSONB) || jsonb_build_object('latest_quiz', quiz_rec),
              updated_at = NOW()
          WHERE id = existing_gap.id;
        ELSE
          -- Create new gap
          INSERT INTO knowledge_gaps (
            user_id,
            subject_id,
            topic,
            severity,
            gap_score,
            evidence
          ) VALUES (
            user_rec.user_id,
            user_rec.subject_id,
            quiz_rec->>'topic',
            CASE
              WHEN gap_score >= 80 THEN 'critical'
              WHEN gap_score >= 60 THEN 'high'
              WHEN gap_score >= 40 THEN 'medium'
              ELSE 'low'
            END,
            gap_score,
            jsonb_build_object('quiz_data', quiz_rec)
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_path_nodes_updated_at
  BEFORE UPDATE ON path_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_gaps_updated_at
  BEFORE UPDATE ON knowledge_gaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_path_recommendations_updated_at
  BEFORE UPDATE ON path_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_analytics_updated_at
  BEFORE UPDATE ON user_learning_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adaptive_difficulty_updated_at
  BEFORE UPDATE ON adaptive_difficulty_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Cleanup Expired Recommendations
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM path_recommendations
  WHERE expires_at < NOW()
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments for Documentation
-- ============================================
COMMENT ON TABLE learning_paths IS 'User-specific learning paths with AI-generated progression';
COMMENT ON TABLE path_nodes IS 'Individual steps within a learning path';
COMMENT ON TABLE knowledge_gaps IS 'Identified knowledge gaps based on quiz performance';
COMMENT ON TABLE path_recommendations IS 'AI-generated content and difficulty recommendations';
COMMENT ON TABLE user_learning_analytics IS 'Daily learning metrics and performance tracking';
COMMENT ON TABLE adaptive_difficulty_settings IS 'User-specific difficulty settings that auto-adjust';

COMMENT ON COLUMN knowledge_gaps.gap_score IS '0-100, calculated from quiz performance and failure frequency';
COMMENT ON COLUMN path_recommendations.confidence_score IS 'AI confidence in the recommendation (0-100)';
COMMENT ON COLUMN adaptive_difficulty_settings.performance_history IS 'Last 10 quiz results for pattern analysis';
