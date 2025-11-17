-- Migration: Conversation Memory System
-- Creates tables for AI tutor conversation history and session management

-- Conversation Sessions Table
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    topic TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    key_points TEXT[]
);

-- Indexes for conversation_sessions
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_created_at ON conversation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_subject ON conversation_sessions(subject);

-- Enable RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for conversation_sessions
CREATE POLICY "Users can view their own conversation sessions"
    ON conversation_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation sessions"
    ON conversation_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation sessions"
    ON conversation_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation sessions"
    ON conversation_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Conversation Messages Table
CREATE TABLE IF NOT EXISTS conversation_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Indexes for conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_metadata ON conversation_messages USING GIN(metadata);

-- Enable RLS
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy for conversation_messages
CREATE POLICY "Users can view their own conversation messages"
    ON conversation_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation messages"
    ON conversation_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation messages"
    ON conversation_messages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation messages"
    ON conversation_messages FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update message_count
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions
    SET message_count = (
        SELECT COUNT(*)
        FROM conversation_messages
        WHERE session_id = NEW.session_id
    ),
    updated_at = NOW()
    WHERE id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update message count on insert
DROP TRIGGER IF EXISTS trigger_update_message_count ON conversation_messages;
CREATE TRIGGER trigger_update_message_count
    AFTER INSERT ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_count();

-- Trigger to update message count on delete
CREATE OR REPLACE FUNCTION update_session_message_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions
    SET message_count = (
        SELECT COUNT(*)
        FROM conversation_messages
        WHERE session_id = OLD.session_id
    ),
    updated_at = NOW()
    WHERE id = OLD.session_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message_count_delete ON conversation_messages;
CREATE TRIGGER trigger_update_message_count_delete
    AFTER DELETE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_count_on_delete();

-- View for conversation history with context
CREATE OR REPLACE VIEW conversation_history AS
SELECT
    s.id as session_id,
    s.user_id,
    s.title,
    s.subject,
    s.topic,
    s.created_at as session_created_at,
    s.updated_at as session_updated_at,
    s.message_count,
    s.summary,
    s.key_points,
    m.id as message_id,
    m.role,
    m.content,
    m.timestamp as message_timestamp,
    m.metadata
FROM conversation_sessions s
LEFT JOIN conversation_messages m ON s.id = m.session_id
ORDER BY s.updated_at DESC, m.timestamp ASC;

-- Grant permissions (adjust as needed for your setup)
GRANT ALL ON conversation_sessions TO authenticated;
GRANT ALL ON conversation_messages TO authenticated;
GRANT ALL ON conversation_history TO authenticated;

-- Comments
COMMENT ON TABLE conversation_sessions IS 'Stores AI tutor conversation sessions';
COMMENT ON TABLE conversation_messages IS 'Stores individual messages within conversation sessions';
COMMENT ON VIEW conversation_history IS 'Combined view of sessions and messages for easy querying';
