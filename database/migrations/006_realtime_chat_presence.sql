-- Migration: Add Real-Time Chat and Presence Tables
-- Description: Tables for group chat messages and user presence tracking
-- Created: 2024

-- ============================================
-- Group Chat Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'image', 'system'
  metadata JSONB DEFAULT '{}', -- For additional data like file URLs, reactions, etc.
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for group_chat_messages
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_id ON group_chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_user_id ON group_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_created_at ON group_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_created ON group_chat_messages(group_id, created_at DESC);

-- RLS Policies for group_chat_messages
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages from groups they're members of
CREATE POLICY "Users can read group chat messages from their groups"
  ON group_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_chat_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Users can insert messages into groups they're members of
CREATE POLICY "Users can send messages to their groups"
  ON group_chat_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_chat_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON group_chat_messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON group_chat_messages
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- User Presence Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- 'online', 'offline', 'away', 'busy'
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_activity VARCHAR(100), -- 'viewing_lesson', 'in_group', 'taking_quiz', etc.
  metadata JSONB DEFAULT '{}', -- Additional presence data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for user_presence
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

-- RLS Policies for user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read presence data
CREATE POLICY "Authenticated users can read presence data"
  ON user_presence
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert/update their own presence
CREATE POLICY "Users can manage their own presence"
  ON user_presence
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Message Reactions Table (Optional but useful)
-- ============================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES group_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction VARCHAR(50) NOT NULL, -- '👍', '❤️', '😊', etc. or emoji codes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- Indexes for message_reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- RLS Policies for message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read reactions on messages they have access to
CREATE POLICY "Users can read message reactions"
  ON message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_chat_messages gcm
      JOIN group_members gm ON gm.group_id = gcm.group_id
      WHERE gcm.id = message_reactions.message_id
      AND gm.user_id = auth.uid()
    )
  );

-- Users can add reactions
CREATE POLICY "Users can add reactions"
  ON message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_chat_messages gcm
      JOIN group_members gm ON gm.group_id = gcm.group_id
      WHERE gcm.id = message_reactions.message_id
      AND gm.user_id = auth.uid()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Typing Indicators Table (For persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 seconds'),
  UNIQUE(group_id, user_id)
);

-- Index for typing_indicators
CREATE INDEX IF NOT EXISTS idx_typing_indicators_group_id ON typing_indicators(group_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires_at ON typing_indicators(expires_at);

-- RLS Policies for typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can read typing indicators from their groups
CREATE POLICY "Users can read typing indicators from their groups"
  ON typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = typing_indicators.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Users can manage their own typing indicators
CREATE POLICY "Users can manage their own typing indicators"
  ON typing_indicators
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Cleanup Function for Expired Typing Indicators
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Update Timestamps Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_group_chat_messages_updated_at
  BEFORE UPDATE ON group_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE group_chat_messages IS 'Stores real-time group chat messages';
COMMENT ON TABLE user_presence IS 'Tracks user online/offline status and current activity';
COMMENT ON TABLE message_reactions IS 'Stores emoji reactions to chat messages';
COMMENT ON TABLE typing_indicators IS 'Temporary table for typing indicators (auto-cleanup)';

COMMENT ON COLUMN group_chat_messages.metadata IS 'JSONB field for file URLs, mentions, replies, etc.';
COMMENT ON COLUMN user_presence.metadata IS 'JSONB field for device info, location, etc.';
