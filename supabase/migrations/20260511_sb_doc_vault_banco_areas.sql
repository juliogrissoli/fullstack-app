-- Doc Vault e Banco de Áreas B2B

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

-- Banco de Áreas B2B
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
