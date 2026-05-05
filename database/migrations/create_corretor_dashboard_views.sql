-- 🏛️ SECURITY BROKER SB - VIEWS OTIMIZADAS PARA DASHBOARD DO CORRETOR
-- Performance <200ms para Match Areas
-- Nexo Causal para trava de comissão

-- 📊 VIEW: imoveis_disponiveis_view
-- View pré-calculada para performance <200ms
CREATE MATERIALIZED VIEW IF NOT EXISTS imoveis_disponiveis_view AS
SELECT 
    i.id,
    i.titulo,
    i.preco,
    i.area,
    i.localizacao,
    i.broker_id,
    i.created_at,
    -- 🎯 MATCH SCORE PRÉ-CALCULADO
    CASE 
        WHEN i.preco > 0 AND i.area > 0 THEN
            (i.preco / i.area) * 0.7 + -- Preço/m² (70%)
            (EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 86400) * -0.3 -- Tempo (30%)
        ELSE 0
    END as match_score,
    'disponivel' as status
FROM imoveis i
WHERE i.status = 'disponivel'
  AND i.preco > 0
  AND i.area > 0
  AND i.broker_id IS NOT NULL;

-- 📊 ÍNDICES PARA PERFORMANCE OTIMIZADA
CREATE INDEX IF NOT EXISTS idx_imoveis_disponiveis_broker_score 
ON imoveis_disponiveis_view(broker_id, match_score DESC) 
WHERE status = 'disponivel';

CREATE INDEX IF NOT EXISTS idx_imoveis_disponiveis_preco 
ON imoveis_disponiveis_view(preco) 
WHERE status = 'disponivel';

CREATE INDEX IF NOT EXISTS idx_imoveis_disponiveis_created_at 
ON imoveis_disponiveis_view(created_at DESC) 
WHERE status = 'disponivel';

-- 🔄 REFRESH AUTOMÁTICO DA MATERIALIZED VIEW (A CADA 5 MINUTOS)
CREATE OR REPLACE FUNCTION refresh_imoveis_disponiveis()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY imoveis_disponiveis_view;
END;
$$ LANGUAGE plpgsql;

-- 🕐 AGENDAR REFRESH (requer pg_cron)
-- SELECT cron.schedule('refresh-imoveis', '*/5 * * * *', 'SELECT refresh_imoveis_disponiveis();');

-- 📋 TABELA: lead_corretor_associacoes
-- Para Nexo Causal e trava de comissão
CREATE TABLE IF NOT EXISTS lead_corretor_associacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    corretor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativa', -- ativa, inativa, transferida
    nexo_causal_hash TEXT NOT NULL, -- SHA256 para trava de comissão
    data_associacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_desassociacao TIMESTAMP WITH TIME ZONE,
    motivo_desassociacao TEXT,
    
    -- 🏛️ METADADOS DE AUDITORIA
    criado_por UUID REFERENCES profiles(id),
    atualizado_por UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    
    -- 📊 ÍNDICES
    CONSTRAINT lead_corretor_unique UNIQUE (lead_id, status) WHERE status = 'ativa',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📊 ÍNDICES PARA NEXO CAUSAL
CREATE INDEX IF NOT EXISTS idx_lead_corretor_associacoes_lead 
ON lead_corretor_associacoes(lead_id) 
WHERE status = 'ativa';

CREATE INDEX IF NOT EXISTS idx_lead_corretor_associacoes_corretor 
ON lead_corretor_associacoes(corretor_id) 
WHERE status = 'ativa';

CREATE INDEX IF NOT EXISTS idx_lead_corretor_associacoes_nexo 
ON lead_corretor_associacoes(nexo_causal_hash);

-- 📄 TABELA: dossies_patrimoniais
-- Para Dossiê com Creci vinculado
CREATE TABLE IF NOT EXISTS dossies_patrimoniais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corretor_id UUID NOT NULL REFERENCES profiles(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    creci_corretor TEXT NOT NULL,
    hash_dossie TEXT NOT NULL UNIQUE,
    
    -- 📋 DADOS ESTRUTURADOS
    dados_corretor JSONB NOT NULL,
    dados_lead JSONB NOT NULL,
    dados_transacao JSONB,
    
    -- 📊 STATUS E METADADOS
    status VARCHAR(20) NOT NULL DEFAULT 'gerado', -- gerado, assinado, concluido, cancelado
    processing_time_ms INTEGER,
    arquivo_url TEXT,
    
    -- 🏛️ AUDITORIA
    criado_por UUID REFERENCES profiles(id),
    assinado_por UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 📊 ÍNDICES
    CONSTRAINT dossie_hash_unique UNIQUE (hash_dossie)
);

-- 📊 ÍNDICES PARA DOSSIÊS
CREATE INDEX IF NOT EXISTS idx_dossies_patrimoniais_corretor 
ON dossies_patrimoniais(corretor_id) 
WHERE status IN ('gerado', 'assinado');

CREATE INDEX IF NOT EXISTS idx_dossies_patrimoniais_lead 
ON dossies_patrimoniais(lead_id);

CREATE INDEX IF NOT EXISTS idx_dossies_patrimoniais_hash 
ON dossies_patrimoniais(hash_dossie);

CREATE INDEX IF NOT EXISTS idx_dossies_patrimoniais_status 
ON dossies_patrimoniais(status) 
WHERE status IN ('gerado', 'assinado');

-- 📊 TABELA: transacoes_corretor
-- Para cálculo de comissões
CREATE TABLE IF NOT EXISTS transacoes_corretor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corretor_id UUID NOT NULL REFERENCES profiles(id),
    lead_id UUID REFERENCES leads(id),
    dossie_id UUID REFERENCES dossies_patrimoniais(id),
    
    -- 💰 DADOS FINANCEIROS
    valor DECIMAL(15,2) NOT NULL,
    comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 2.0,
    valor_comissao DECIMAL(15,2) GENERATED ALWAYS AS (valor * (comissao_percentual / 100)) STORED,
    
    -- 📊 STATUS
    status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, liberada, cancelada
    data_liberacao TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento TEXT,
    
    -- 🏛️ AUDITORIA
    criado_por UUID REFERENCES profiles(id),
    liberado_por UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📊 ÍNDICES PARA COMISSÕES
CREATE INDEX IF NOT EXISTS idx_transacoes_corretor_corretor 
ON transacoes_corretor(corretor_id, status);

CREATE INDEX IF NOT EXISTS idx_transacoes_corretor_status 
ON transacoes_corretor(status, created_at);

CREATE INDEX IF NOT EXISTS idx_transacoes_corretor_valor 
ON transacoes_corretor(valor DESC) 
WHERE status = 'liberada';

-- 🔧 TRIGGER PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🕐 APLICAR TRIGGERS
CREATE TRIGGER set_timestamp_lead_corretor_associacoes
BEFORE UPDATE ON lead_corretor_associacoes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_dossies_patrimoniais
BEFORE UPDATE ON dossies_patrimoniais
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_transacoes_corretor
BEFORE UPDATE ON transacoes_corretor
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 🏛️ POLÍTICAS DE SEGURANÇA (RLS)

-- Habilitar RLS nas tabelas
ALTER TABLE lead_corretor_associacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossies_patrimoniais ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_corretor ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA lead_corretor_associacoes
CREATE POLICY "Corretor ver próprias associações" ON lead_corretor_associacoes
FOR SELECT USING (
  corretor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Corretor criar associações" ON lead_corretor_associacoes
FOR INSERT WITH CHECK (corretor_id = auth.uid());

CREATE POLICY "Admin gerenciar associações" ON lead_corretor_associacoes
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLÍTICAS PARA dossies_patrimoniais
CREATE POLICY "Corretor ver próprios dossiês" ON dossies_patrimoniais
FOR SELECT USING (
  corretor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Corretor criar dossiês" ON dossies_patrimoniais
FOR INSERT WITH CHECK (corretor_id = auth.uid());

CREATE POLICY "Admin gerenciar dossiês" ON dossies_patrimoniais
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLÍTICAS PARA transacoes_corretor
CREATE POLICY "Corretor ver próprias transações" ON transacoes_corretor
FOR SELECT USING (
  corretor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin gerenciar transações" ON transacoes_corretor
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 📊 VIEWS ADICIONAIS PARA PERFORMANCE

-- View para estatísticas do corretor
CREATE OR REPLACE VIEW corretor_estatisticas_view AS
SELECT 
    p.id as corretor_id,
    p.nome,
    p.creci,
    p.sb_score,
    
    -- 📈 MÉTRICAS DE VENDAS
    COUNT(DISTINCT lca.lead_id) as total_leads,
    COALESCE(SUM(l.valor_estimado), 0) as total_vendas,
    
    -- 💰 MÉTRICAS DE COMISSÃO
    COALESCE(SUM(tc.valor_comissao), 0) as total_comissoes,
    COALESCE(SUM(CASE WHEN tc.status = 'pendente' THEN tc.valor_comissao ELSE 0 END), 0) as comissoes_pendentes,
    COALESCE(SUM(CASE WHEN tc.status = 'liberada' THEN tc.valor_comissao ELSE 0 END), 0) as comissoes_liberadas,
    
    -- 🏆 MÉTRICAS DE PERFORMANCE
    COUNT(DISTINCT dp.id) as total_dossies,
    AVG(EXTRACT(EPOCH FROM (dp.updated_at - dp.created_at))/60) as tempo_medio_processamento_min,
    
    -- 📊 DATA ATUALIZAÇÃO
    NOW() as data_calculo
    
FROM profiles p
LEFT JOIN lead_corretor_associacoes lca ON p.id = lca.corretor_id AND lca.status = 'ativa'
LEFT JOIN leads l ON lca.lead_id = l.id
LEFT JOIN transacoes_corretor tc ON p.id = tc.corretor_id
LEFT JOIN dossies_patrimoniais dp ON p.id = dp.corretor_id
WHERE p.role IN ('corretor', 'admin')
GROUP BY p.id, p.nome, p.creci, p.sb_score;

-- 📋 COMENTÁRIOS DE DOCUMENTAÇÃO

COMMENT ON MATERIALIZED VIEW imoveis_disponiveis_view IS '🏛️ Security Broker SB - View materializada para performance <200ms no carregamento de Match Areas do corretor.';

COMMENT ON TABLE lead_corretor_associacoes IS '🏛️ Security Broker SB - Associações entre leads e corretores com Nexo Causal para trava de comissão.';

COMMENT ON COLUMN lead_corretor_associacoes.nexo_causal_hash IS '🔒 Hash SHA256 para Nexo Causal - garante a integridade da associação e trava de comissão.';

COMMENT ON TABLE dossies_patrimoniais IS '🏛️ Security Broker SB - Dossiês Patrimoniais com Creci do corretor vinculado ao documento final.';

COMMENT ON COLUMN dossies_patrimoniais.creci_corretor IS '📋 Creci do corretor vinculado ao dossiê patrimonial para validação jurídica.';

COMMENT ON TABLE transacoes_corretor IS '🏛️ Security Broker SB - Transações financeiras dos corretores para cálculo de comissões.';

COMMENT ON COLUMN transacoes_corretor.valor_comissao IS '💰 Valor da comissão calculado automaticamente (valor * percentual).';

-- ✅ MIGRATION COMPLETA
-- Performance otimizada, Nexo Causal implementado, Creci vinculado ao Dossiê
