-- ============================================================
-- Enhanced Groups Feature - Database Migration
-- LearnSynth Groups Feature Implementation
-- ============================================================

-- Drop existing basic tables if they exist (migration from basic to enhanced)
DROP TABLE IF EXISTS group_member_progress CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;

-- ============================================================
-- ENHANCED GROUPS TABLES
-- ============================================================

-- Enhanced Groups table (replaces study_groups)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('study', 'class', 'private', 'community')),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('public', 'private', 'hidden')),
  invite_code TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'
);

-- Enhanced Group Members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'instructor', 'member', 'observer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
  permissions JSONB DEFAULT '{}',
  UNIQUE(group_id, user_id)
);

-- Group Documents (shared documents/KBs)
CREATE TABLE IF NOT EXISTS group_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  category TEXT,
  is_pinned BOOLEAN DEFAULT false,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'all' CHECK (access_level IN ('all', 'instructors', 'owner'))
);

-- Group Quizzes
CREATE TABLE IF NOT EXISTS group_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Group Quiz Attempts
CREATE TABLE IF NOT EXISTS group_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES group_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  passed BOOLEAN,
  time_spent INTEGER, -- seconds
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB DEFAULT '[]'
);

-- Group Discussions
CREATE TABLE IF NOT EXISTS group_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id),
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES group_discussions(id),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Group Analytics
CREATE TABLE IF NOT EXISTS group_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  metrics JSONB NOT NULL,
  UNIQUE(group_id, user_id, date)
);

-- Group Invitations
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_documents_group_id ON group_documents(group_id);
CREATE INDEX IF NOT EXISTS idx_group_quizzes_group_id ON group_quizzes(group_id);
CREATE INDEX IF NOT EXISTS idx_group_quiz_attempts_quiz_id ON group_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_group_quiz_attempts_user_id ON group_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_group_discussions_group_id ON group_discussions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analytics_group_id ON group_analytics(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Groups Policies
CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Group owners can update groups" ON groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Group owners can delete groups" ON groups
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view groups they own" ON groups
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can view public groups" ON groups
  FOR SELECT USING (privacy = 'public');

-- Group Members Policies
CREATE POLICY "Users can view members of groups they belong to" ON group_members
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Group owners can manage members" ON group_members
  FOR ALL USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Group instructors can manage members" ON group_members
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'instructor' AND status = 'active'
    )
  );

CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update their own membership" ON group_members
  FOR UPDATE USING (user_id = auth.uid());

-- Group Documents Policies
CREATE POLICY "Group members can view group documents" ON group_documents
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Group owners can manage documents" ON group_documents
  FOR ALL USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Group instructors can manage documents" ON group_documents
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('instructor', 'owner') AND status = 'active'
    )
  );

CREATE POLICY "Members can upload documents if allowed" ON group_documents
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('member', 'instructor', 'owner') AND status = 'active'
    )
  );

-- Group Quizzes Policies
CREATE POLICY "Group members can view quizzes" ON group_quizzes
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Group owners can manage quizzes" ON group_quizzes
  FOR ALL USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Group instructors can manage quizzes" ON group_quizzes
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('instructor', 'owner') AND status = 'active'
    )
  );

-- Group Quiz Attempts Policies
CREATE POLICY "Users can view their own quiz attempts" ON group_quiz_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Group instructors can view all attempts" ON group_quiz_attempts
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('instructor', 'owner') AND status = 'active'
    )
  );

CREATE POLICY "Users can create quiz attempts" ON group_quiz_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Group Discussions Policies
CREATE POLICY "Group members can view discussions" ON group_discussions
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Group members can create discussions" ON group_discussions
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Discussion authors can update their discussions" ON group_discussions
  FOR UPDATE USING (created_by = auth.uid());

-- Group Analytics Policies
CREATE POLICY "Group members can view their own analytics" ON group_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Group owners can view all analytics" ON group_analytics
  FOR SELECT USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Group instructors can view all analytics" ON group_analytics
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('instructor', 'owner') AND status = 'active'
    )
  );

-- Group Invitations Policies
CREATE POLICY "Group owners can manage invitations" ON group_invitations
  FOR ALL USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Group instructors can manage invitations" ON group_invitations
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('instructor', 'owner') AND status = 'active'
    )
  );

-- ============================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_discussions_updated_at BEFORE UPDATE ON group_discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
