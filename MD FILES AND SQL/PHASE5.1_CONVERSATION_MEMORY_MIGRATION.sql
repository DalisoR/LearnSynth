-- Migration: AI Tutor Conversation Memory
-- Creates tables for persistent conversation memory across sessions

-- Conversation Sessions Table
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    subject TEXT,
    mode TEXT DEFAULT 'default' CHECK (mode IN ('default', 'socratic', 'guided')),
    context_summary TEXT,
    total_messages INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation Messages Table
CREATE TABLE IF NOT EXISTS conversation_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'code', 'image', 'quiz', 'socratic_question')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation Memory Table
CREATE TABLE IF NOT EXISTS conversation_memory (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'context', 'goal', 'knowledge', 'interaction')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, key)
);

-- Conversation Context Table
CREATE TABLE IF NOT EXISTS conversation_context (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL CHECK (context_type IN ('subject', 'chapter', 'lesson', 'topic', 'difficulty', 'learning_style')),
    context_key TEXT NOT NULL,
    context_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, context_type, context_key)
);

-- Socratic Questioning Sessions Table
CREATE TABLE IF NOT EXISTS socratic_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    current_stage INTEGER NOT NULL DEFAULT 0,
    total_stages INTEGER NOT NULL DEFAULT 4,
    stage_data JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversation_sessions
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_subject ON conversation_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_mode ON conversation_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity ON conversation_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_created_at ON conversation_sessions(created_at);

-- Indexes for conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role ON conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_type ON conversation_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

-- Indexes for conversation_memory
CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_id ON conversation_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_session_id ON conversation_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_type ON conversation_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_importance ON conversation_memory(importance);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_last_accessed ON conversation_memory(last_accessed);

-- Indexes for conversation_context
CREATE INDEX IF NOT EXISTS idx_conversation_context_session_id ON conversation_context(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_context_type ON conversation_context(context_type);
CREATE INDEX IF NOT EXISTS idx_conversation_context_key ON conversation_context(context_key);

-- Indexes for socratic_sessions
CREATE INDEX IF NOT EXISTS idx_socratic_sessions_session_id ON socratic_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_socratic_sessions_user_id ON socratic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_socratic_sessions_topic ON socratic_sessions(topic);

-- Enable RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_sessions
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

-- RLS Policies for conversation_messages
CREATE POLICY "Users can view messages in their sessions"
    ON conversation_messages FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM conversation_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their sessions"
    ON conversation_messages FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM conversation_sessions WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for conversation_memory
CREATE POLICY "Users can view their own conversation memory"
    ON conversation_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation memory"
    ON conversation_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation memory"
    ON conversation_memory FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation memory"
    ON conversation_memory FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for conversation_context
CREATE POLICY "Users can view context in their sessions"
    ON conversation_context FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM conversation_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert context in their sessions"
    ON conversation_context FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM conversation_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update context in their sessions"
    ON conversation_context FOR UPDATE
    USING (
        session_id IN (
            SELECT id FROM conversation_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete context in their sessions"
    ON conversation_context FOR DELETE
    USING (
        session_id IN (
            SELECT id FROM conversation_sessions WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for socratic_sessions
CREATE POLICY "Users can view their own socratic sessions"
    ON socratic_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own socratic sessions"
    ON socratic_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own socratic sessions"
    ON socratic_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own socratic sessions"
    ON socratic_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update conversation session timestamp
CREATE OR REPLACE FUNCTION update_conversation_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions
    SET last_activity = NOW(),
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity when message is added
DROP TRIGGER IF EXISTS trigger_update_conversation_session_activity ON conversation_messages;
CREATE TRIGGER trigger_update_conversation_session_activity
    AFTER INSERT ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_session_timestamp();

-- Function to update message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions
    SET total_messages = (
        SELECT COUNT(*) FROM conversation_messages WHERE session_id = NEW.session_id
    ),
    updated_at = NOW()
    WHERE id = NEW.session_id;

    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update message count
DROP TRIGGER IF EXISTS trigger_update_conversation_message_count ON conversation_messages;
CREATE TRIGGER trigger_update_conversation_message_count
    AFTER INSERT OR DELETE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

-- Function to update memory access tracking
CREATE OR REPLACE FUNCTION update_conversation_memory_access()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'SELECT' THEN
        UPDATE conversation_memory
        SET last_accessed = NOW(),
            access_count = access_count + 1
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation session updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_conversation_sessions_updated_at ON conversation_sessions;
CREATE TRIGGER trigger_update_conversation_sessions_updated_at
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_conversation_memory_updated_at ON conversation_memory;
CREATE TRIGGER trigger_update_conversation_memory_updated_at
    BEFORE UPDATE ON conversation_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_socratic_sessions_updated_at ON socratic_sessions;
CREATE TRIGGER trigger_update_socratic_sessions_updated_at
    BEFORE UPDATE ON socratic_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to summarize conversation
CREATE OR REPLACE FUNCTION summarize_conversation(
    session_id_param TEXT,
    message_limit INTEGER DEFAULT 50
)
RETURNS TEXT AS $$
DECLARE
    messages_text TEXT;
BEGIN
    SELECT string_agg(role || ': ' || LEFT(content, 100), ' | ' ORDER BY created_at)
    INTO messages_text
    FROM (
        SELECT role, content
        FROM conversation_messages
        WHERE session_id = session_id_param
        ORDER BY created_at DESC
        LIMIT message_limit
    ) recent_messages;

    RETURN COALESCE(messages_text, 'No messages in conversation');
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation context
CREATE OR REPLACE FUNCTION get_conversation_context(session_id_param TEXT)
RETURNS TABLE(
    context_type TEXT,
    context_key TEXT,
    context_value JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT cc.context_type, cc.context_key, cc.context_value
    FROM conversation_context cc
    WHERE cc.session_id = session_id_param
    ORDER BY cc.context_type, cc.context_key;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON conversation_sessions TO authenticated;
GRANT ALL ON conversation_messages TO authenticated;
GRANT ALL ON conversation_memory TO authenticated;
GRANT ALL ON conversation_context TO authenticated;
GRANT ALL ON socratic_sessions TO authenticated;

-- Comments
COMMENT ON TABLE conversation_sessions IS 'Stores AI tutor conversation sessions';
COMMENT ON TABLE conversation_messages IS 'Stores individual messages in conversations';
COMMENT ON TABLE conversation_memory IS 'Stores persistent memory and preferences from conversations';
COMMENT ON TABLE conversation_context IS 'Stores contextual information for conversations';
COMMENT ON TABLE socratic_sessions IS 'Stores Socratic questioning session data';

-- Create a view for conversation history
CREATE OR REPLACE VIEW conversation_history AS
SELECT
    cs.id,
    cs.user_id,
    cs.title,
    cs.subject,
    cs.mode,
    cs.total_messages,
    cs.created_at,
    cs.last_activity,
    LEAST(cs.total_messages, 10) as recent_message_count,
    summarize_conversation(cs.id, 10) as recent_summary
FROM conversation_sessions cs
ORDER BY cs.last_activity DESC;

-- Grant view permissions
GRANT SELECT ON conversation_history TO authenticated;
