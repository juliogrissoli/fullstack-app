-- Trigger: marca propriedades para re-indexação ao inserir/atualizar
-- O job de indexação efetivo roda via /api/yara/index (chamado por cron)

ALTER TABLE properties ADD COLUMN IF NOT EXISTS embedding_pending BOOLEAN DEFAULT TRUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION marcar_embedding_pendente()
RETURNS TRIGGER AS $$
BEGIN
    NEW.embedding_pending = TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_embedding_pendente ON properties;
CREATE TRIGGER trigger_embedding_pendente
    BEFORE INSERT OR UPDATE OF titulo, descricao, tipo, bairro, valor, area_m2
    ON properties
    FOR EACH ROW
    EXECUTE FUNCTION marcar_embedding_pendente();

-- View: propriedades com embedding desatualizado (para o job ler)
CREATE OR REPLACE VIEW properties_pending_embedding AS
SELECT id, titulo, descricao, tipo, bairro, valor, area_m2
FROM properties
WHERE embedding_pending = TRUE
ORDER BY created_at DESC;
