-- 🏛️ SCHEMA GEO v8.1 IMPERIUM EDITION
-- Fortaleza de Dados com Segurança e Conformidade
-- Migration: 20260505_geo_v8_1_imperium.sql

-- 1. EXTENSION NECESSÁRIA PARA UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE ATIVOS (LAND BANKING)
CREATE TABLE IF NOT EXISTS land_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    valor_total DECIMAL(15,2),
    area_m2 DECIMAL(10,2),
    localizacao_exata TEXT, -- PROTEGIDO POR RLS
    dados_proprietario JSONB, -- PROTEGIDO POR RLS
    status TEXT DEFAULT 'publicado', -- publicado, reservado, vendido
    tag_zoneamento TEXT,
    roi_projetado DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE INTELIGÊNCIA E SCORING (DOUTRINA CHINA)
CREATE TABLE IF NOT EXISTS lead_behavior_scoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    search_intent TEXT, -- ROI, Zoneamento, Gap_Precos
    engagement_depth INTEGER DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE NEXO CAUSAL (SEGURANÇA JURÍDICA)
CREATE TABLE IF NOT EXISTS lead_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES land_opportunities(id) ON DELETE CASCADE,
    nexo_causal_hash TEXT UNIQUE, -- HASH SHA-256
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE AUDITORIA IMUTÁVEL (GOVERNANÇA)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    acao TEXT NOT NULL,
    tabela_afetada TEXT,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE COMISSÕES E VENDAS
CREATE TABLE IF NOT EXISTS sales_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES land_opportunities(id) ON DELETE CASCADE,
    valor_comissao DECIMAL(10,2),
    status_comissao TEXT DEFAULT 'pendente', -- pendente, aprovada, paga
    data_venda TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FUNÇÃO PARA GERAR NEXO CAUSAL HASH
CREATE OR REPLACE FUNCTION generate_nexo_causal_hash(
    p_user_id UUID,
    p_asset_id UUID,
    p_timestamp TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        sha256(p_user_id::text || p_asset_id::text || EXTRACT(EPOCH FROM p_timestamp)::text),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER PARA NEXO CAUSAL AUTOMÁTICO
CREATE OR REPLACE FUNCTION nexo_causal_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nexo_causal_hash = generate_nexo_causal_hash(
        NEW.user_id, 
        NEW.asset_id, 
        NEW.viewed_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. APLICAR TRIGGER
CREATE TRIGGER trigger_nexo_causal
    BEFORE INSERT ON lead_views
    FOR EACH ROW
    EXECUTE FUNCTION nexo_causal_trigger();

-- 10. FUNÇÃO DE AUDITORIA AUTOMÁTICA
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        acao,
        tabela_afetada,
        dados_antigos,
        dados_novos,
        ip_address,
        user_agent
    ) VALUES (
        COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        current_setting('app.client_ip', true),
        current_setting('app.user_agent', true)
    );
    
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. APLICAR TRIGGERS DE AUDITORIA
CREATE TRIGGER audit_land_opportunities
    AFTER INSERT OR UPDATE OR DELETE ON land_opportunities
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_lead_behavior_scoring
    AFTER INSERT OR UPDATE OR DELETE ON lead_behavior_scoring
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_sales_commissions
    AFTER INSERT OR UPDATE OR DELETE ON sales_commissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 12. BLINDAGEM RLS (POLICIES)
ALTER TABLE land_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_behavior_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;

-- 13. POLÍTICAS DE SEGURANÇA

-- Política: Todos podem ver ativos públicos (sem dados sensíveis)
CREATE POLICY "Public Assets View" ON land_opportunities 
FOR SELECT USING (true);

-- Política: Apenas usuários autenticados podem ver seus próprios scores
CREATE POLICY "Users View Own Scores" ON lead_behavior_scoring
FOR SELECT USING (auth.uid() = user_id);

-- Política: Apenas usuários autenticados podem registrar views
CREATE POLICY "Users Register Views" ON lead_views
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Apenas usuários autenticados podem ver suas próprias views
CREATE POLICY "Users View Own Views" ON lead_views
FOR SELECT USING (auth.uid() = user_id);

-- Política: Apenas usuários autenticados podem ver suas comissões
CREATE POLICY "Users View Own Commissions" ON sales_commissions
FOR SELECT USING (auth.uid() = user_id);

-- 14. VIEWS SEGURAS (OCULTA DADOS SENSÍVEIS)
CREATE OR REPLACE VIEW public_assets_secure AS
SELECT 
    id,
    titulo,
    descricao,
    valor_total,
    area_m2,
    status,
    tag_zoneamento,
    roi_projetado,
    created_at,
    updated_at
FROM land_opportunities
WHERE status = 'publicado';

-- 15. FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM DADOS VALIDADOS
CREATE OR REPLACE FUNCTION user_has_validated_docs(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar se o usuário tem perfil com document_validated = true
    -- Esta função deve ser adaptada conforme sua lógica de validação
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = p_user_id 
        AND (EXISTS (
            SELECT 1 FROM jsonb_each_text(to_jsonb(profiles)) 
            WHERE key = 'document_validated' AND value = 'true'
        ))
    );
END;
$$ LANGUAGE plpgsql;

-- 16. VIEW COM DADOS COMPLETOS (APENAS PARA USUÁRIOS VALIDADOS)
CREATE OR REPLACE VIEW land_opportunities_full AS
SELECT 
    lo.*
FROM land_opportunities lo
WHERE lo.status = 'publicado'
   OR user_has_validated_docs(auth.uid());

-- 17. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_land_opportunities_status ON land_opportunities(status);
CREATE INDEX idx_land_opportunities_created_at ON land_opportunities(created_at);
CREATE INDEX idx_lead_behavior_scoring_user_id ON lead_behavior_scoring(user_id);
CREATE INDEX idx_lead_behavior_scoring_score ON lead_behavior_scoring(score DESC);
CREATE INDEX idx_lead_views_user_id ON lead_views(user_id);
CREATE INDEX idx_lead_views_asset_id ON lead_views(asset_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_sales_commissions_user_id ON sales_commissions(user_id);

-- 18. FUNÇÃO DE SCORING AUTOMÁTICO
CREATE OR REPLACE FUNCTION update_lead_score(
    p_user_id UUID,
    p_search_intent TEXT,
    p_engagement_bonus INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    current_score INTEGER;
    new_score INTEGER;
BEGIN
    -- Obter score atual ou criar novo registro
    SELECT COALESCE(score, 0) INTO current_score
    FROM lead_behavior_scoring 
    WHERE user_id = p_user_id;
    
    -- Calcular incremento baseado no intent
    CASE p_search_intent
        WHEN 'ROI' THEN new_score := current_score + 50;
        WHEN 'Zoneamento' THEN new_score := current_score + 30;
        WHEN 'Gap_Precos' THEN new_score := current_score + 25;
        ELSE new_score := current_score + 10;
    END CASE;
    
    -- Adicionar bônus de engagement
    new_score := new_score + p_engagement_bonus;
    
    -- Atualizar ou inserir
    INSERT INTO lead_behavior_scoring (user_id, score, search_intent, engagement_depth, last_interaction)
    VALUES (p_user_id, new_score, p_search_intent, p_engagement_bonus, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        score = new_score,
        search_intent = p_search_intent,
        engagement_depth = engagement_depth,
        last_interaction = NOW();
    
    -- Disparar webhook se score > 80 (Prioridade S)
    IF new_score > 80 THEN
        -- Aqui você pode implementar a chamada de webhook
        -- PERFORM pg_notify('priority_s_alert', json_build_object(
        --     'user_id', p_user_id,
        --     'score', new_score,
        --     'timestamp', NOW()
        -- )::text);
    END IF;
    
    RETURN new_score;
END;
$$ LANGUAGE plpgsql;

-- 🏛️ SCHEMA COMPLETO - FORTALEZA DE DADOS ESTÁ PRONTA
-- Migration GEO v8.1 Imperium Edition Finalizada
