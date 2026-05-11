-- pgvector: busca semântica de imóveis

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS property_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    embedding vector(1536),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_embeddings_ivfflat
    ON property_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE OR REPLACE FUNCTION search_properties(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    property_id UUID,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pe.property_id,
        pe.content,
        1 - (pe.embedding <=> query_embedding) AS similarity
    FROM property_embeddings pe
    WHERE 1 - (pe.embedding <=> query_embedding) > match_threshold
    ORDER BY pe.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE property_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema pode inserir embeddings"
    ON property_embeddings FOR INSERT WITH CHECK (true);

CREATE POLICY "Leitura pública de embeddings"
    ON property_embeddings FOR SELECT USING (true);

-- Verificação final
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
