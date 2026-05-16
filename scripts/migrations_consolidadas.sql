-- ============================================================
-- ANJOIMOB v4.0 — Migrations Consolidadas
-- Rodar UMA VEZ no Supabase SQL Editor (em ordem)
-- Data: 2026-05-16
-- ============================================================
-- INSTRUÇÕES:
--   1. Abra o Supabase SQL Editor
--   2. Cole TODO este arquivo
--   3. Clique em "Run"
--   4. Após o sucesso, execute o ALTER DATABASE abaixo (separado)
-- ============================================================


-- ============================================================
-- BLOCO 1 — Score, Split, PRO, Saque Acelerado
-- (20260511_sb_anjoimob_vfinal.sql)
-- ============================================================

-- Score do Corretor
CREATE TABLE IF NOT EXISTS score_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    pontos_venda INTEGER DEFAULT 0,
    pontos_captacao INTEGER DEFAULT 0,
    pontos_treinamento INTEGER DEFAULT 0,
    pontos_indicacao INTEGER DEFAULT 0,
    pontos_engajamento INTEGER DEFAULT 0,
    score_total INTEGER GENERATED ALWAYS AS (
        pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento
    ) STORED,
    nivel_liberado INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN (pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento) >= 80 THEN 5
            WHEN (pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento) >= 60 THEN 3
            WHEN (pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento) >= 40 THEN 1
            ELSE 0
        END
    ) STORED,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE score_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seu próprio score"
    ON score_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir score"
    ON score_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar score"
    ON score_logs FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION calculate_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_vendas INTEGER;
    v_captacoes INTEGER;
BEGIN
    SELECT LEAST(COUNT(*) * 6, 30) INTO v_vendas
    FROM transactions WHERE broker_id = p_user_id AND status = 'pago';

    SELECT LEAST(COUNT(*) * 4, 20) INTO v_captacoes
    FROM properties WHERE broker_id = p_user_id;

    INSERT INTO score_logs (user_id, pontos_venda, pontos_captacao, updated_at)
    VALUES (p_user_id, v_vendas, v_captacoes, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        pontos_venda = EXCLUDED.pontos_venda,
        pontos_captacao = EXCLUDED.pontos_captacao,
        updated_at = NOW();

    RETURN (SELECT score_total FROM score_logs WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configuração de Split
CREATE TABLE IF NOT EXISTS config_split (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_config TEXT UNIQUE NOT NULL,
    percentual NUMERIC NOT NULL,
    descricao TEXT,
    modulo TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config_split (nome_config, percentual, descricao, modulo) VALUES
('captador_percent',             10.0, 'Percentual do Captador',             'corretagem'),
('parceiro_percent',             30.0, 'Percentual do Parceiro',             'corretagem'),
('vendedor_percent',             40.0, 'Percentual do Vendedor',             'corretagem'),
('sb_system_percent',            20.0, 'Percentual da Anjoimob',             'corretagem'),
('captador_vendedor_solo',       80.0, 'Acúmulo: Captador = Vendedor',       'acumulo'),
('captador_parceria',            45.0, 'Acúmulo: Captador + Parceria',       'acumulo'),
('apenas_captador',              10.0, 'Apenas Captador',                    'acumulo'),
('apenas_vendedor_solo',         70.0, 'Apenas Vendedor Solo',               'acumulo'),
('apenas_vendedor_parceria',     35.0, 'Apenas Vendedor Parceria',           'acumulo'),
('associado_pro_lucro',          50.0, 'Lucro do Associado PRO',             'pro'),
('associado_rede',               10.0, 'Rede sobre lucro do Associado',      'pro'),
('coordenacao_percent',           2.0, 'Coordenação Master',                 'coordenacao'),
('take_rate_servicos',           20.0, 'Take Rate Serviços',                 'marketplace'),
('taxa_saque_acelerado_min',      3.0, 'Taxa mínima saque acelerado',        'fintech'),
('taxa_saque_acelerado_max',      8.0, 'Taxa máxima saque acelerado',        'fintech'),
('rede_cascata_n1',              40.0, 'Nível 1 da cascata',                 'rede'),
('rede_cascata_n2',              25.0, 'Nível 2 da cascata',                 'rede'),
('rede_cascata_n3',              15.0, 'Nível 3 da cascata',                 'rede'),
('rede_cascata_n4',              10.0, 'Nível 4 da cascata',                 'rede'),
('rede_cascata_n5',              10.0, 'Nível 5 da cascata',                 'rede'),
('rede_indicacao_n1',             5.0, 'Indicação Nível 1 sobre SB',         'rede'),
('rede_indicacao_n2',             4.0, 'Indicação Nível 2 sobre SB',         'rede'),
('rede_indicacao_n3',             3.0, 'Indicação Nível 3 sobre SB',         'rede'),
('rede_indicacao_n4',             2.0, 'Indicação Nível 4 sobre SB',         'rede'),
('rede_indicacao_n5',             1.0, 'Indicação Nível 5 sobre SB',         'rede')
ON CONFLICT (nome_config) DO NOTHING;

ALTER TABLE config_split ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam config_split"
    ON config_split FOR ALL USING (true);

-- Colunas PRO na tabela brokers
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS is_associado BOOLEAN DEFAULT FALSE;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS associado_slug TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS percentual_lucro NUMERIC DEFAULT 50.0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_associado_slug
    ON brokers(associado_slug) WHERE associado_slug IS NOT NULL;

-- Caixa Anjoimob
CREATE TABLE IF NOT EXISTS caixa_anjoimob (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origem TEXT NOT NULL,
    motivo TEXT,
    user_id UUID REFERENCES auth.users(id),
    valor NUMERIC,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE caixa_anjoimob ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema pode inserir caixa anjoimob"
    ON caixa_anjoimob FOR INSERT WITH CHECK (true);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    valor_bruto NUMERIC NOT NULL,
    taxa NUMERIC DEFAULT 0,
    valor_liquido NUMERIC NOT NULL,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias transações"
    ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir transações"
    ON wallet_transactions FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_score_logs_user ON score_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_config_split_modulo ON config_split(modulo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_caixa_anjoimob_origem ON caixa_anjoimob(origem);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);


-- ============================================================
-- BLOCO 2 — pgvector + Busca Semântica
-- (20260511_sb_pgvector_embeddings.sql)
-- ============================================================

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


-- ============================================================
-- BLOCO 3 — Doc Vault + Banco de Áreas B2B
-- (20260511_sb_doc_vault_banco_areas.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS doc_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL,
    url_documento TEXT NOT NULL,
    dados_extraidos JSONB,
    hash_sha256 TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doc_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seus documentos"
    ON doc_vault FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere seus documentos"
    ON doc_vault FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza seus documentos"
    ON doc_vault FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_doc_vault_user ON doc_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_vault_status ON doc_vault(status);

CREATE TABLE IF NOT EXISTS banco_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    area_m2 DECIMAL,
    zoneamento TEXT,
    preco_m2 DECIMAL,
    lat DECIMAL,
    lng DECIMAL,
    status TEXT DEFAULT 'disponivel',
    proprietario_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE banco_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Áreas visíveis para autenticados"
    ON banco_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Proprietário edita sua área"
    ON banco_areas FOR UPDATE TO authenticated USING (auth.uid() = proprietario_id);

CREATE POLICY "Proprietário insere área"
    ON banco_areas FOR INSERT TO authenticated WITH CHECK (auth.uid() = proprietario_id);

CREATE INDEX IF NOT EXISTS idx_banco_areas_status ON banco_areas(status);
CREATE INDEX IF NOT EXISTS idx_banco_areas_zoneamento ON banco_areas(zoneamento);


-- ============================================================
-- BLOCO 4 — Marketplace: Prestadores, Avaliações, Permutas
-- (20260511_sb_marketplace_prestadores.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS prestadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT,
    avaliacao DECIMAL DEFAULT 5.0,
    total_avaliacoes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prestadores visíveis"
    ON prestadores FOR SELECT USING (true);

CREATE POLICY "Usuário insere perfil"
    ON prestadores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário edita seu perfil"
    ON prestadores FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prestadores_categoria ON prestadores(categoria);
CREATE INDEX IF NOT EXISTS idx_prestadores_status ON prestadores(status);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestador_id UUID REFERENCES prestadores(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES auth.users(id),
    nota INTEGER CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliações visíveis"
    ON avaliacoes FOR SELECT USING (true);

CREATE POLICY "Cliente insere avaliação"
    ON avaliacoes FOR INSERT WITH CHECK (auth.uid() = cliente_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_prestador ON avaliacoes(prestador_id);

CREATE OR REPLACE FUNCTION recalcular_avaliacao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prestadores
    SET
        avaliacao = (
            SELECT COALESCE(AVG(nota), 5.0)
            FROM avaliacoes
            WHERE prestador_id = NEW.prestador_id
        ),
        total_avaliacoes = (
            SELECT COUNT(*) FROM avaliacoes WHERE prestador_id = NEW.prestador_id
        )
    WHERE id = NEW.prestador_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalcular_avaliacao ON avaliacoes;
CREATE TRIGGER trigger_recalcular_avaliacao
    AFTER INSERT OR UPDATE ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_avaliacao();

CREATE TABLE IF NOT EXISTS permutas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL,
    descricao TEXT,
    valor_estimado DECIMAL,
    status TEXT DEFAULT 'aberto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permutas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permutas visíveis para autenticados"
    ON permutas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuário gerencia suas permutas"
    ON permutas FOR ALL TO authenticated USING (auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_permutas_status ON permutas(status);
CREATE INDEX IF NOT EXISTS idx_permutas_tipo ON permutas(tipo);


-- ============================================================
-- BLOCO 5 — White Label: domínio personalizado
-- (20260511_sb_white_label_dominio.sql)
-- ============================================================

ALTER TABLE brokers ADD COLUMN IF NOT EXISTS dominio_personalizado TEXT UNIQUE;

INSERT INTO config_split (nome_config, percentual, descricao, modulo) VALUES
('taxa_white_label', 10.0, 'Taxa da Anjoimob sobre receita de associado white label', 'expansao')
ON CONFLICT (nome_config) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_brokers_dominio ON brokers(dominio_personalizado)
    WHERE dominio_personalizado IS NOT NULL;


-- ============================================================
-- BLOCO 6 — Pilar 1: Segurança e Criptografia (pgcrypto)
-- (20260511_sb_pilar1_seguranca_crypto.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION encrypt_sensitive_data(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(
            input_text,
            current_setting('app.encryption_key')
        ),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_text, 'base64'),
        current_setting('app.encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf_encrypted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_encrypted TEXT;

CREATE OR REPLACE FUNCTION encrypt_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cpf IS NOT NULL THEN
        NEW.cpf_encrypted = encrypt_sensitive_data(NEW.cpf);
        NEW.cpf = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_encrypt_profile ON profiles;
CREATE TRIGGER trigger_encrypt_profile
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_profile_data();


-- ============================================================
-- BLOCO 7 — Embeddings Trigger (marca imóveis para indexação)
-- (20260511_sb_embeddings_trigger.sql)
-- ============================================================

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

CREATE OR REPLACE VIEW properties_pending_embedding AS
SELECT id, titulo, descricao, tipo, bairro, valor, area_m2
FROM properties
WHERE embedding_pending = TRUE
ORDER BY created_at DESC;


-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'score_logs', 'config_split', 'caixa_anjoimob', 'wallet_transactions',
    'property_embeddings', 'doc_vault', 'banco_areas',
    'prestadores', 'avaliacoes', 'permutas'
  )
ORDER BY table_name;

-- ============================================================
-- PASSO FINAL — rodar SEPARADAMENTE após o script acima:
--
-- ALTER DATABASE postgres
--   SET "app.encryption_key" = '1e5603c22182871eaf7e683338d230ebe314663193734a2ec80afdf53d543e04';
--
-- (necessário para as funções encrypt_sensitive_data / decrypt_sensitive_data)
-- ============================================================
