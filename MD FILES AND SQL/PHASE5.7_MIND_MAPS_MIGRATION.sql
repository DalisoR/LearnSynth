-- Migration: Mind Map Generator from Lesson Content
-- Creates tables for AI-generated mind maps from lesson content

-- Mind Maps Table
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_content TEXT,
    source_type TEXT CHECK (source_type IN ('lesson', 'chapter', 'document', 'manual')),
    source_id UUID, -- References lesson, chapter, or document
    structure JSONB NOT NULL, -- Mind map structure with nodes and connections
    layout_type TEXT DEFAULT 'radial' CHECK (layout_type IN ('radial', 'hierarchical', 'mind_map', 'flowchart', 'tree')),
    theme TEXT DEFAULT 'default' CHECK (theme IN ('default', 'colorful', 'dark', 'minimal', 'academic')),
    color_scheme JSONB, -- Color configuration
    settings JSONB, -- Additional settings (node size, font size, spacing, etc.)
    ai_generated BOOLEAN DEFAULT true,
    generation_prompt TEXT,
    generation_metadata JSONB,
    version INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mind Map Nodes Table
CREATE TABLE IF NOT EXISTS mind_map_nodes (
    id TEXT PRIMARY KEY,
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL, -- Unique identifier within mind map
    parent_node_id TEXT,
    level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level
    label TEXT NOT NULL,
    content TEXT, -- Extended content/description
    node_type TEXT DEFAULT 'topic' CHECK (node_type IN ('topic', 'subtopic', 'detail', 'note', 'reference')),
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    width INTEGER,
    height INTEGER,
    shape TEXT DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle', 'diamond', 'rounded', 'cloud')),
    color TEXT,
    background_color TEXT,
    text_color TEXT,
    font_size INTEGER DEFAULT 14,
    font_weight TEXT DEFAULT 'normal' CHECK (font_weight IN ('normal', 'bold', 'light')),
    style JSONB, -- Additional styling options
    metadata JSONB, -- Node-specific metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(mind_map_id, node_id)
);

-- Mind Map Connections Table
CREATE TABLE IF NOT EXISTS mind_map_connections (
    id TEXT PRIMARY KEY,
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    label TEXT, -- Optional connection label
    connection_type TEXT DEFAULT 'default' CHECK (connection_type IN ('default', 'arrow', 'dashed', 'thick', 'bidirectional')),
    style JSONB, -- Line style, color, etc.
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (mind_map_id, source_node_id) REFERENCES mind_map_nodes(mind_map_id, node_id) ON DELETE CASCADE,
    FOREIGN KEY (mind_map_id, target_node_id) REFERENCES mind_map_nodes(mind_map_id, node_id) ON DELETE CASCADE,
    UNIQUE(mind_map_id, source_node_id, target_node_id)
);

-- Mind Map Versions Table (for version control)
CREATE TABLE IF NOT EXISTS mind_map_versions (
    id TEXT PRIMARY KEY,
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    structure JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    change_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(mind_map_id, version)
);

-- Mind Map Collaborators Table (for sharing)
CREATE TABLE IF NOT EXISTS mind_map_collaborators (
    id TEXT PRIMARY KEY,
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'edit', 'admin')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    UNIQUE(mind_map_id, user_id)
);

-- Indexes for mind_maps
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_source ON mind_maps(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_ai_generated ON mind_maps(ai_generated);
CREATE INDEX IF NOT EXISTS idx_mind_maps_created_at ON mind_maps(created_at);
CREATE INDEX IF NOT EXISTS idx_mind_maps_public ON mind_maps(is_public);
CREATE INDEX IF NOT EXISTS idx_mind_maps_tags ON mind_maps USING GIN(tags);

-- Indexes for mind_map_nodes
CREATE INDEX IF NOT EXISTS idx_mmind_nodes_mind_map_id ON mind_map_nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mmind_nodes_parent ON mind_map_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_mmind_nodes_level ON mind_map_nodes(level);
CREATE INDEX IF NOT EXISTS idx_mmind_nodes_type ON mind_map_nodes(node_type);

-- Indexes for mind_map_connections
CREATE INDEX IF NOT EXISTS idx_mmind_connections_mind_map_id ON mind_map_connections(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mmind_connections_source ON mind_map_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_mmind_connections_target ON mind_map_connections(target_node_id);

-- Indexes for mind_map_versions
CREATE INDEX IF NOT EXISTS idx_mmind_versions_mind_map_id ON mind_map_versions(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mmind_versions_version ON mind_map_versions(version);

-- Indexes for mind_map_collaborators
CREATE INDEX IF NOT EXISTS idx_mmind_collaborators_mind_map_id ON mind_map_collaborators(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mmind_collaborators_user_id ON mind_map_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_mmind_collaborators_status ON mind_map_collaborators(status);

-- Enable RLS
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mind_maps
CREATE POLICY "Users can view their own mind maps"
    ON mind_maps FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own mind maps"
    ON mind_maps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mind maps"
    ON mind_maps FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mind maps"
    ON mind_maps FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for mind_map_nodes
CREATE POLICY "Users can view nodes in accessible mind maps"
    ON mind_map_nodes FOR SELECT
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid() OR is_public = true
        )
    );

CREATE POLICY "Users can insert nodes in their mind maps"
    ON mind_map_nodes FOR INSERT
    WITH CHECK (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update nodes in their mind maps"
    ON mind_map_nodes FOR UPDATE
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete nodes in their mind maps"
    ON mind_map_nodes FOR DELETE
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for mind_map_connections
CREATE POLICY "Users can view connections in accessible mind maps"
    ON mind_map_connections FOR SELECT
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid() OR is_public = true
        )
    );

CREATE POLICY "Users can insert connections in their mind maps"
    ON mind_map_connections FOR INSERT
    WITH CHECK (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update connections in their mind maps"
    ON mind_map_connections FOR UPDATE
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete connections in their mind maps"
    ON mind_map_connections FOR DELETE
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for mind_map_versions
CREATE POLICY "Users can view versions of accessible mind maps"
    ON mind_map_versions FOR SELECT
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid() OR is_public = true
        )
    );

CREATE POLICY "Users can insert versions of their mind maps"
    ON mind_map_versions FOR INSERT
    WITH CHECK (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        ) AND auth.uid() = created_by
    );

-- RLS Policies for mind_map_collaborators
CREATE POLICY "Users can view collaborations on accessible mind maps"
    ON mind_map_collaborators FOR SELECT
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid() OR user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert collaborations"
    ON mind_map_collaborators FOR INSERT
    WITH CHECK (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        ) AND (auth.uid() = invited_by OR auth.uid() = user_id)
    );

CREATE POLICY "Users can update their own collaborations"
    ON mind_map_collaborators FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete collaborations"
    ON mind_map_collaborators FOR DELETE
    USING (
        mind_map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

-- Function to increment mind map version
CREATE OR REPLACE FUNCTION increment_mind_map_version()
RETURNS TRIGGER AS $$
DECLARE
    current_version INTEGER;
BEGIN
    -- Get current version
    SELECT version INTO current_version
    FROM mind_maps
    WHERE id = NEW.id;

    -- Insert version snapshot
    INSERT INTO mind_map_versions (id, mind_map_id, version, structure, created_by)
    VALUES (
        gen_random_uuid()::text,
        NEW.id,
        current_version,
        NEW.structure,
        NEW.user_id
    );

    -- Increment version in mind_map
    UPDATE mind_maps
    SET version = version + 1,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to save version on update
DROP TRIGGER IF EXISTS trigger_save_mind_map_version ON mind_maps;
CREATE TRIGGER trigger_save_mind_map_version
    AFTER UPDATE ON mind_maps
    FOR EACH ROW
    EXECUTE FUNCTION increment_mind_map_version();

-- Function to update mind map timestamp
CREATE OR REPLACE FUNCTION update_mind_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_mind_maps_updated_at ON mind_maps;
CREATE TRIGGER trigger_update_mind_maps_updated_at
    BEFORE UPDATE ON mind_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_mind_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_mind_map_nodes_updated_at ON mind_map_nodes;
CREATE TRIGGER trigger_update_mind_map_nodes_updated_at
    BEFORE UPDATE ON mind_map_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_mind_map_updated_at();

-- Function to generate mind map structure from nodes and connections
CREATE OR REPLACE FUNCTION generate_mind_map_structure(mind_map_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    nodes_data JSONB;
    connections_data JSONB;
BEGIN
    -- Get nodes
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', node_id,
            'label', label,
            'content', content,
            'type', node_type,
            'level', level,
            'parent', parent_node_id,
            'position', jsonb_build_object('x', position_x, 'y', position_y),
            'style', jsonb_build_object(
                'shape', shape,
                'color', color,
                'backgroundColor', background_color,
                'textColor', text_color,
                'fontSize', font_size,
                'fontWeight', font_weight
            )
        )
    )
    INTO nodes_data
    FROM mind_map_nodes
    WHERE mind_map_id = mind_map_id_param;

    -- Get connections
    SELECT jsonb_agg(
        jsonb_build_object(
            'source', source_node_id,
            'target', target_node_id,
            'label', label,
            'type', connection_type
        )
    )
    INTO connections_data
    FROM mind_map_connections
    WHERE mind_map_id = mind_map_id_param;

    -- Build result structure
    result := jsonb_build_object(
        'nodes', COALESCE(nodes_data, '[]'::jsonb),
        'connections', COALESCE(connections_data, '[]'::jsonb)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON mind_maps TO authenticated;
GRANT ALL ON mind_map_nodes TO authenticated;
GRANT ALL ON mind_map_connections TO authenticated;
GRANT SELECT ON mind_map_versions TO authenticated;
GRANT ALL ON mind_map_collaborators TO authenticated;

-- Comments
COMMENT ON TABLE mind_maps IS 'Stores AI-generated mind maps from lesson content';
COMMENT ON TABLE mind_map_nodes IS 'Individual nodes within mind maps with styling';
COMMENT ON TABLE mind_map_connections IS 'Connections between nodes in mind maps';
COMMENT ON TABLE mind_map_versions IS 'Version history for mind maps';
COMMENT ON TABLE mind_map_collaborators IS 'Collaboration and sharing settings for mind maps';

-- Create a view for mind map summaries
CREATE OR REPLACE VIEW mind_map_summaries AS
SELECT
    mm.id,
    mm.user_id,
    mm.title,
    mm.source_type,
    mm.source_id,
    mm.layout_type,
    mm.theme,
    mm.ai_generated,
    mm.version,
    mm.is_public,
    mm.tags,
    mm.created_at,
    mm.updated_at,
    COUNT(mmn.id) as node_count,
    COUNT(mmc.id) as connection_count
FROM mind_maps mm
LEFT JOIN mind_map_nodes mmn ON mm.id = mmn.mind_map_id
LEFT JOIN mind_map_connections mmc ON mm.id = mmc.mind_map_id
GROUP BY mm.id;

-- Grant view permissions
GRANT SELECT ON mind_map_summaries TO authenticated;

-- Insert default themes
INSERT INTO mind_maps (id, user_id, title, structure, layout_type, theme, is_public, ai_generated)
VALUES (
    gen_random_uuid()::text,
    '00000000-0000-0000-0000-000000000000',
    'Default Theme Template',
    '{"nodes": [], "connections": []}'::jsonb,
    'mind_map',
    'default',
    false,
    false
)
ON CONFLICT DO NOTHING;
