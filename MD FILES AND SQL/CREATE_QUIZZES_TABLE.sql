-- ============================================================
-- Quiz Tables Migration
-- Adds quiz-related tables for comprehensive quiz functionality
-- ============================================================

-- Quizzes Table (stores generated quizzes)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  time_limit INTEGER, -- in minutes, NULL if no time limit
  pass_mark INTEGER DEFAULT 70, -- percentage needed to pass
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz Results Table (stores user quiz attempts)
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score DECIMAL(5,2) NOT NULL, -- percentage score (0-100)
  total_points INTEGER NOT NULL,
  earned_points INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER DEFAULT 0, -- in seconds
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Group Quizzes Table (quiz assignments for groups)
CREATE TABLE IF NOT EXISTS group_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, quiz_id)
);

-- Group Quiz Results Table (group member quiz results)
CREATE TABLE IF NOT EXISTS group_quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_quiz_id UUID NOT NULL REFERENCES group_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_quiz_id, user_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_group_quizzes_group_id ON group_quizzes(group_id);
CREATE INDEX IF NOT EXISTS idx_group_quiz_results_group_quiz_id ON group_quiz_results(group_quiz_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all quiz tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_quiz_results ENABLE ROW LEVEL SECURITY;

-- Quizzes Policies
CREATE POLICY "Users can view quizzes for their chapters" ON quizzes
  FOR SELECT USING (
    chapter_id IN (
      SELECT c.id FROM chapters c
      JOIN documents d ON c.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quizzes for their chapters" ON quizzes
  FOR INSERT WITH CHECK (
    chapter_id IN (
      SELECT c.id FROM chapters c
      JOIN documents d ON c.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Quiz Results Policies
CREATE POLICY "Users can manage own quiz results" ON quiz_results
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view quiz results for their quizzes" ON quiz_results
  FOR SELECT USING (
    quiz_id IN (
      SELECT q.id FROM quizzes q
      JOIN chapters c ON q.chapter_id = c.id
      JOIN documents d ON c.document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Group Quizzes Policies
CREATE POLICY "Group owners can manage group quizzes" ON group_quizzes
  FOR ALL USING (
    group_id IN (SELECT id FROM study_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Group members can view group quizzes" ON group_quizzes
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Group Quiz Results Policies
CREATE POLICY "Users can manage own group quiz results" ON group_quiz_results
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Group owners can view group quiz results" ON group_quiz_results
  FOR ALL USING (
    group_quiz_id IN (
      SELECT gq.id FROM group_quizzes gq
      JOIN study_groups sg ON gq.group_id = sg.id
      WHERE sg.owner_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_quiz_results_updated_at BEFORE UPDATE ON group_quiz_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
