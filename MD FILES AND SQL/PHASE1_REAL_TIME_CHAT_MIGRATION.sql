-- Migration: Real-time Chat System
-- Creates tables for group chat messages and user presence

-- User Presence Table
CREATE TABLE IF NOT EXISTS user_presence (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

-- Group Chat Messages Table
CREATE TABLE IF NOT EXISTS group_chat_messages (
    id TEXT PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    file_url TEXT,
    file_name TEXT,
    reply_to_id TEXT REFERENCES group_chat_messages(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_presence
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_group_id ON user_presence(group_id);
CREATE INDEX IF NOT EXISTS idx_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON user_presence(last_seen);

-- Indexes for group_chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON group_chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON group_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON group_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON group_chat_messages(reply_to_id);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence in their groups"
    ON user_presence FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own presence"
    ON user_presence FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence"
    ON user_presence FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own presence"
    ON user_presence FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for group_chat_messages
CREATE POLICY "Users can view messages in their groups"
    ON group_chat_messages FOR SELECT
    USING (
        group_id IN (
            SELECT group_id
            FROM group_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their groups"
    ON group_chat_messages FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        group_id IN (
            SELECT group_id
            FROM group_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages"
    ON group_chat_messages FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
    ON group_chat_messages FOR DELETE
    USING (user_id = auth.uid());

-- Function to update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on presence update
DROP TRIGGER IF EXISTS trigger_update_presence_timestamp ON user_presence;
CREATE TRIGGER trigger_update_presence_timestamp
    BEFORE UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_presence_timestamp();

-- Function to automatically insert user presence when joining group
CREATE OR REPLACE FUNCTION handle_new_group_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_presence (id, user_id, group_id, status)
    VALUES (gen_random_uuid()::text, NEW.user_id, NEW.group_id, 'online')
    ON CONFLICT (user_id, group_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add presence on group join
DROP TRIGGER IF EXISTS trigger_add_presence_on_join ON group_members;
CREATE TRIGGER trigger_add_presence_on_join
    AFTER INSERT ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_group_member();

-- Function to update presence when leaving group
CREATE OR REPLACE FUNCTION handle_group_member_leave()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_presence
    SET status = 'offline', last_seen = NOW()
    WHERE user_id = OLD.user_id AND group_id = OLD.group_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update presence on group leave
DROP TRIGGER IF EXISTS trigger_update_presence_on_leave ON group_members;
CREATE TRIGGER trigger_update_presence_on_leave
    BEFORE DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION handle_group_member_leave();

-- Grant permissions
GRANT ALL ON user_presence TO authenticated;
GRANT ALL ON group_chat_messages TO authenticated;

-- Comments
COMMENT ON TABLE user_presence IS 'Tracks online/offline status of users in groups';
COMMENT ON TABLE group_chat_messages IS 'Stores group chat messages with support for replies and file attachments';

-- Add default presence for existing group members
INSERT INTO user_presence (id, user_id, group_id, status)
SELECT
    gen_random_uuid()::text,
    gm.user_id,
    gm.group_id,
    'online'
FROM group_members gm
WHERE NOT EXISTS (
    SELECT 1 FROM user_presence up
    WHERE up.user_id = gm.user_id AND up.group_id = gm.group_id
)
ON CONFLICT (user_id, group_id) DO NOTHING;
