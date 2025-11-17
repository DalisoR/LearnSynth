-- Migration: Search Tracking System
-- Date: 2025-11-14
-- Purpose: Track search queries, results, and user interactions for analytics and optimization

-- Create search_tracking table
CREATE TABLE IF NOT EXISTS search_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  query_embedding VECTOR(1536), -- Store the embedding for future similarity searches
  results_count INTEGER DEFAULT 0,
  results_clicked INTEGER DEFAULT 0, -- How many results user clicked
  search_type VARCHAR(50) NOT NULL DEFAULT 'kb_specific', -- 'global' or 'kb_specific'
  response_time_ms INTEGER, -- Time taken to search in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_tracking_user_id ON search_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_search_tracking_subject_id ON search_tracking(subject_id);
CREATE INDEX IF NOT EXISTS idx_search_tracking_created_at ON search_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_search_tracking_search_type ON search_tracking(search_type);

-- Create vector index for similarity searches (find similar queries)
CREATE INDEX IF NOT EXISTS idx_search_tracking_embedding ON search_tracking
  USING ivfflat (query_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create search_results table to track individual result interactions
CREATE TABLE IF NOT EXISTS search_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_tracking_id UUID REFERENCES search_tracking(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  rank_position INTEGER NOT NULL, -- Position in search results (1-based)
  relevance_score DECIMAL(3,2), -- Relevance score from RAG
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for search_results
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_tracking_id);
CREATE INDEX IF NOT EXISTS idx_search_results_document_id ON search_results(document_id);
CREATE INDEX IF NOT EXISTS idx_search_results_clicked_at ON search_results(clicked_at);

-- Create embedding_stats table for monitoring embedding coverage
CREATE TABLE IF NOT EXISTS embedding_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  total_chunks INTEGER DEFAULT 0,
  embedded_chunks INTEGER DEFAULT 0,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for embedding_stats
CREATE INDEX IF NOT EXISTS idx_embedding_stats_document_id ON embedding_stats(document_id);
CREATE INDEX IF NOT EXISTS idx_embedding_stats_chapter_id ON embedding_stats(chapter_id);
CREATE INDEX IF NOT EXISTS idx_embedding_stats_last_updated ON embedding_stats(last_updated);

-- Enable RLS
ALTER TABLE search_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_tracking
CREATE POLICY "Users can view their own search tracking"
  ON search_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search tracking"
  ON search_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for search_results
CREATE POLICY "Users can view search results for their searches"
  ON search_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_tracking
      WHERE search_tracking.id = search_results.search_tracking_id
      AND search_tracking.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert search results for their searches"
  ON search_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_tracking
      WHERE search_tracking.id = search_results.search_tracking_id
      AND search_tracking.user_id = auth.uid()
    )
  );

-- RLS Policies for embedding_stats (read-only for all users)
CREATE POLICY "Anyone can view embedding stats"
  ON embedding_stats FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search_tracking
CREATE TRIGGER update_search_tracking_updated_at
  BEFORE UPDATE ON search_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate embedding coverage percentage
CREATE OR REPLACE FUNCTION get_embedding_coverage(document_uuid UUID)
RETURNS TABLE(
  document_id UUID,
  coverage_percentage DECIMAL(5,2),
  total_chunks BIGINT,
  embedded_chunks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.document_id,
    CASE
      WHEN es.total_chunks = 0 THEN 0
      ELSE ROUND((es.embedded_chunks::DECIMAL / es.total_chunks::DECIMAL) * 100, 2)
    END::DECIMAL(5,2) as coverage_percentage,
    es.total_chunks,
    es.embedded_chunks
  FROM embedding_stats es
  WHERE es.document_id = document_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON search_tracking TO authenticated;
GRANT ALL ON search_results TO authenticated;
GRANT ALL ON embedding_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE search_tracking IS 'Tracks user search queries and metadata';
COMMENT ON TABLE search_results IS 'Tracks individual search results and user clicks';
COMMENT ON TABLE embedding_stats IS 'Tracks embedding coverage for documents and chapters';
COMMENT ON COLUMN search_tracking.search_type IS 'Type of search: global or kb_specific';
COMMENT ON COLUMN search_tracking.response_time_ms IS 'Time taken to complete search in milliseconds';
COMMENT ON COLUMN search_results.rank_position IS 'Position of result in search results (1-based)';
COMMENT ON COLUMN search_results.relevance_score IS 'Relevance score from RAG system (0-1)';
COMMENT ON FUNCTION get_embedding_coverage(UUID) IS 'Returns embedding coverage statistics for a document';
