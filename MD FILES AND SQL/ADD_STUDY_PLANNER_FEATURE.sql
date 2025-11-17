-- ============================================================
-- Study Planner Feature - Database Migration
-- Comprehensive Study Planning System for LearnSynth
-- ============================================================

-- ============================================================
-- STUDY PLANNING TABLES
-- ============================================================

-- Study Plans (master study plan for a course/subject)
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subject_name TEXT,
  subject_id UUID REFERENCES subjects(id),
  group_id UUID REFERENCES groups(id),
  start_date DATE NOT NULL,
  target_completion_date DATE,
  total_hours_estimated DECIMAL(8,2),
  total_hours_completed DECIMAL(8,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  settings JSONB DEFAULT '{}'
);

-- Study Sessions (individual planned study blocks)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id),
  chapter_id UUID REFERENCES chapters(id),
  document_id UUID REFERENCES documents(id),
  group_id UUID REFERENCES groups(id),
  session_type TEXT NOT NULL DEFAULT 'study' CHECK (session_type IN ('study', 'review', 'quiz', 'group', 'exam_prep')),
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  duration_planned INTEGER, -- in minutes
  duration_actual INTEGER, -- in minutes
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completion_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- Study Goals (daily/weekly/monthly goals)
CREATE TABLE IF NOT EXISTS study_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'custom')),
  target_value DECIMAL(8,2) NOT NULL,
  current_value DECIMAL(8,2) DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'hours', -- hours, pages, chapters, quizzes, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- Study Session Notes (notes taken during study sessions)
CREATE TABLE IF NOT EXISTS study_session_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pomodoro Sessions (for Pomodoro timer tracking)
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_planned INTEGER NOT NULL DEFAULT 25, -- minutes
  duration_actual INTEGER, -- minutes
  session_type TEXT NOT NULL DEFAULT 'work' CHECK (session_type IN ('work', 'short_break', 'long_break')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'interrupted', 'paused')),
  cycles_completed INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Study Analytics (tracking progress and insights)
CREATE TABLE IF NOT EXISTS study_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_study_time INTEGER DEFAULT 0, -- minutes
  sessions_completed INTEGER DEFAULT 0,
  sessions_missed INTEGER DEFAULT 0,
  goals_met INTEGER DEFAULT 0,
  goals_total INTEGER DEFAULT 0,
  pomodoro_cycles INTEGER DEFAULT 0,
  subjects_studied TEXT[],
  documents_accessed UUID[],
  quizzes_taken INTEGER DEFAULT 0,
  avg_session_rating DECIMAL(3,2),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, study_plan_id, date)
);

-- Study Recommendations (AI-generated recommendations)
CREATE TABLE IF NOT EXISTS study_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('schedule', 'content', 'review', 'break', 'goal', 'focus_time')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Study Preferences (user customization settings)
CREATE TABLE IF NOT EXISTS study_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_study_times JSONB DEFAULT '[]', -- [{day: 'monday', start: '09:00', end: '11:00'}, ...]
  pomodoro_work_duration INTEGER DEFAULT 25, -- minutes
  pomodoro_short_break_duration INTEGER DEFAULT 5, -- minutes
  pomodoro_long_break_duration INTEGER DEFAULT 15, -- minutes
  pomodoro_cycles_before_long_break INTEGER DEFAULT 4,
  daily_study_goal INTEGER DEFAULT 120, -- minutes
  weekly_study_goal INTEGER DEFAULT 840, -- minutes (14 hours)
  reminder_settings JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Study Achievements (badges and milestones)
CREATE TABLE IF NOT EXISTS study_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('streak', 'hours', 'sessions', 'goal', 'consistency', 'milestone')),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  value DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_subject_id ON study_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_group_id ON study_plans(group_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_study_plan_id ON study_sessions(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled_start ON study_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id);

CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_study_plan_id ON study_goals(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_date_range ON study_goals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_study_goals_status ON study_goals(status);

CREATE INDEX IF NOT EXISTS idx_study_session_notes_session_id ON study_session_notes(study_session_id);
CREATE INDEX IF NOT EXISTS idx_study_session_notes_user_id ON study_session_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_study_session_id ON pomodoro_sessions(study_session_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_start_time ON pomodoro_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_study_analytics_user_id ON study_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_study_analytics_study_plan_id ON study_analytics(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_analytics_date ON study_analytics(date);

CREATE INDEX IF NOT EXISTS idx_study_recommendations_user_id ON study_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_study_recommendations_study_plan_id ON study_recommendations(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_recommendations_expires ON study_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_study_recommendations_dismissed ON study_recommendations(dismissed);

CREATE INDEX IF NOT EXISTS idx_study_preferences_user_id ON study_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_study_achievements_user_id ON study_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_study_achievements_earned_at ON study_achievements(earned_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_achievements ENABLE ROW LEVEL SECURITY;

-- Study Plans Policies
CREATE POLICY "Users can manage own study plans" ON study_plans
  FOR ALL USING (auth.uid() = user_id);

-- Study Sessions Policies
CREATE POLICY "Users can manage own study sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Study Goals Policies
CREATE POLICY "Users can manage own study goals" ON study_goals
  FOR ALL USING (auth.uid() = user_id);

-- Study Session Notes Policies
CREATE POLICY "Users can manage notes for own sessions" ON study_session_notes
  FOR ALL USING (auth.uid() = user_id);

-- Pomodoro Sessions Policies
CREATE POLICY "Users can manage own pomodoro sessions" ON pomodoro_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Study Analytics Policies
CREATE POLICY "Users can view own study analytics" ON study_analytics
  FOR ALL USING (auth.uid() = user_id);

-- Study Recommendations Policies
CREATE POLICY "Users can view own study recommendations" ON study_recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own study recommendations" ON study_recommendations
  FOR UPDATE USING (auth.uid() = user_id);

-- Study Preferences Policies
CREATE POLICY "Users can manage own study preferences" ON study_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Study Achievements Policies
CREATE POLICY "Users can view own study achievements" ON study_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study achievements" ON study_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON study_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_session_notes_updated_at BEFORE UPDATE ON study_session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_preferences_updated_at BEFORE UPDATE ON study_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to calculate study streak
CREATE OR REPLACE FUNCTION calculate_study_streak(user_uuid UUID, days_back INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  current_date DATE := CURRENT_DATE;
  day_count INTEGER;
BEGIN
  FOR i IN 0..days_back LOOP
    SELECT COALESCE(SUM(duration_actual), 0) INTO day_count
    FROM study_sessions
    WHERE user_id = user_uuid
      AND DATE(actual_start) = current_date - i
      AND status = 'completed'
      AND duration_actual > 0;

    IF day_count > 0 THEN
      streak := streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming sessions
CREATE OR REPLACE FUNCTION get_upcoming_sessions(user_uuid UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  title TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  duration_planned INTEGER,
  session_type TEXT,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.title, s.scheduled_start, s.duration_planned, s.session_type, s.priority
  FROM study_sessions s
  WHERE s.user_id = user_uuid
    AND s.status = 'scheduled'
    AND s.scheduled_start >= NOW()
    AND s.scheduled_start <= NOW() + INTERVAL '1 day' * days_ahead
  ORDER BY s.scheduled_start;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate study plan from document
CREATE OR REPLACE FUNCTION auto_generate_study_plan(
  user_uuid UUID,
  plan_name TEXT,
  doc_id UUID,
  exam_date DATE,
  daily_hours DECIMAL
)
RETURNS UUID AS $$
DECLARE
  plan_id UUID;
  chapter_count INTEGER;
  days_available INTEGER;
  chapters_per_day DECIMAL;
  session_date DATE;
  chap_record RECORD;
BEGIN
  -- Create study plan
  INSERT INTO study_plans (user_id, name, subject_name, start_date, target_completion_date, total_hours_estimated)
  VALUES (user_uuid, plan_name, 'Document Based', CURRENT_DATE, exam_date, (exam_date - CURRENT_DATE) * daily_hours)
  RETURNING id INTO plan_id;

  -- Get chapter count
  SELECT COUNT(*) INTO chapter_count
  FROM chapters
  WHERE document_id = doc_id;

  -- Calculate distribution
  days_available := exam_date - CURRENT_DATE;
  chapters_per_day := chapter_count::DECIMAL / days_available::DECIMAL;

  -- Generate sessions for each chapter
  session_date := CURRENT_DATE;

  FOR chap_record IN
    SELECT id, chapter_number, title
    FROM chapters
    WHERE document_id = doc_id
    ORDER BY chapter_number
  LOOP
    -- Add main study session
    INSERT INTO study_sessions (
      user_id, study_plan_id, title, chapter_id, document_id,
      session_type, scheduled_start, scheduled_end, duration_planned, priority
    ) VALUES (
      user_uuid, plan_id,
      'Study: Chapter ' || chap_record.chapter_number || ' - ' || chap_record.title,
      chap_record.id, doc_id,
      'study',
      session_date + TIME '10:00',
      session_date + TIME '10:00' + (daily_hours * 60 || ' minutes')::INTERVAL,
      (daily_hours * 60)::INTEGER,
      'high'
    );

    -- Add review session (next day)
    INSERT INTO study_sessions (
      user_id, study_plan_id, title, chapter_id, document_id,
      session_type, scheduled_start, scheduled_end, duration_planned, priority
    ) VALUES (
      user_uuid, plan_id,
      'Review: Chapter ' || chap_record.chapter_number,
      chap_record.id, doc_id,
      'review',
      session_date + 1 + TIME '14:00',
      session_date + 1 + TIME '14:00' + INTERVAL '60 minutes',
      60,
      'medium'
    );

    -- Move to next day
    session_date := session_date + 1;
  END LOOP;

  RETURN plan_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
