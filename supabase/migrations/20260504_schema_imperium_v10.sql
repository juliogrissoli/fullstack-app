-- 🏛️ SB PROTOCOLO 2032 - OUROBOROS v10.0 IMPERIUM EDITION
-- Schema SQL com proteção completa e tabelas críticas
-- Data: 04/05/2026
-- Versão: Security Broker SB v7.0 + OUROBOROS v10.0

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA 1: LAND_OPPORTUNITIES (ATIVOS COM RLS PROTEGIDO)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.land_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    localizacao_publica TEXT, -- Pública para todos
    localizacao_exata TEXT ENCRYPTED, -- PROTEGIDA POR RLS
    dados_proprietario JSONB ENCRYPTED, -- PROTEGIDO POR RLS
    area_m2 DECIMAL(10,2),
    preco_m2 DECIMAL(10,2),
    valor_total DECIMAL(15,2),
    zoneamento TEXT,
    status TEXT DEFAULT 'disponivel', -- disponivel, reservado, vendido, documentado_validado
    coordenadas GEOGRAPHY(POINT, 4326),
    documentos_url JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_land_opportunities_status ON public.land_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_land_opportunities_zoneamento ON public.land_opportunities(zoneamento);
CREATE INDEX IF NOT EXISTS idx_land_opportunities_created_at ON public.land_opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_land_opportunities_created_by ON public.land_opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_land_opportunities_coordenadas ON public.land_opportunities USING GIST(coordenadas);

-- =====================================================
-- TABELA 2: FINANCE_COMMISSIONS (SPLIT DE COMISSÃO 6%)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finance_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corretor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE CASCADE,
    valor_total DECIMAL(15,2) NOT NULL,
    percentual_coordenacao DECIMAL(5,2) DEFAULT 2.00, -- 2% Coordenação Soberana
    valor_coordenacao DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * percentual_coordenacao / 100) STORED,
    percentual_operacao DECIMAL(5,2) DEFAULT 4.00, -- 4% Operação Imobiliária
    valor_operacao DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * percentual_operacao / 100) STORED,
    percentual_sb DECIMAL(5,2) DEFAULT 6.00, -- 6% Security Broker
    valor_sb DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * percentual_sb / 100) STORED,
    percentual_corretor DECIMAL(5,2) GENERATED ALWAYS AS (100 - percentual_coordenacao - percentual_operacao - percentual_sb) STORED,
    valor_corretor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * percentual_corretor / 100) STORED,
    status TEXT DEFAULT 'pendente', -- pendente, processado, pago
    data_pagamento TIMESTAMPTZ,
    hash_comprovante TEXT, -- Hash SHA-256 do comprovante
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_finance_commissions_corretor_id ON public.finance_commissions(corretor_id);
CREATE INDEX IF NOT EXISTS idx_finance_commissions_status ON public.finance_commissions(status);
CREATE INDEX IF NOT EXISTS idx_finance_commissions_data_pagamento ON public.finance_commissions(data_pagamento);

-- =====================================================
-- TABELA 3: LEAD_VIEWS (NEXO CAUSAL JURÍDICO)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lead_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.land_opportunities(id) ON DELETE CASCADE,
    nexo_causal_hash TEXT UNIQUE, -- SHA-256(lead_id + asset_id + timestamp)
    ip_address TEXT,
    user_agent TEXT,
    duracao_visualizacao_segundos INTEGER DEFAULT 0,
    documentos_acessados TEXT[],
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER PARA GERAR NEXO CAUSAL AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.gerar_nexo_causal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nexo_causal_hash = encode(
        sha256(NEW.lead_id::text || NEW.asset_id::text || EXTRACT(EPOCH FROM NEW.viewed_at)::text),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_nexo_causal
    BEFORE INSERT ON public.lead_views
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_nexo_causal();

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_lead_views_hash ON public.lead_views(nexo_causal_hash);
CREATE INDEX IF NOT EXISTS idx_lead_views_lead_id ON public.lead_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_views_asset_id ON public.lead_views(asset_id);
CREATE INDEX IF NOT EXISTS idx_lead_views_viewed_at ON public.lead_views(viewed_at DESC);

-- =====================================================
-- TABELA 4: AUDIT_LOGS (REGISTRO IMUTÁVEL)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- ALTEROU_COMISSAO, VISUALIZOU_DOCUMENTO, etc
    table_name TEXT,
    record_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Land Opportunities: Controle granular de acesso
ALTER TABLE public.land_opportunities ENABLE ROW LEVEL SECURITY;

-- Todos autenticados veem dados básicos
CREATE POLICY "land_opportunities_public_view" ON public.land_opportunities
    FOR SELECT USING (
        auth.role() IN ('authenticated', 'admin', 'diretor', 'gerente')
    );

-- Dados sensíveis apenas para usuários validados
CREATE POLICY "land_opportunities_sensitive_data" ON public.land_opportunities
    FOR SELECT USING (
        auth.role() IN ('admin', 'diretor', 'gerente') OR
        (auth.role() = 'authenticated' AND status = 'documentado_validado')
    );

-- Apenas ADMIN, DIRETOR, GERENTE podem modificar
CREATE POLICY "land_opportunities_admin_only" ON public.land_opportunities
    FOR INSERT WITH CHECK (auth.role() IN ('admin', 'diretor', 'gerente'));

CREATE POLICY "land_opportunities_update_admin_only" ON public.land_opportunities
    FOR UPDATE USING (
        auth.role() IN ('admin', 'diretor', 'gerente')
    );

CREATE POLICY "land_opportunities_delete_admin_only" ON public.land_opportunities
    FOR DELETE USING (
        auth.role() IN ('admin', 'diretor', 'gerente')
    );

-- Finance Commissions: Apenas ADMIN e o próprio corretor
ALTER TABLE public.finance_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_commissions_own_select" ON public.finance_commissions
    FOR SELECT USING (
        auth.role() IN ('admin', 'diretor', 'gerente') OR
        auth.uid() = corretor_id
    );

CREATE POLICY "finance_commissions_admin_manage" ON public.finance_commissions
    FOR ALL USING (auth.role() IN ('admin', 'diretor', 'gerente'));

-- Lead Views: Gera hash automaticamente via trigger SQL
ALTER TABLE public.lead_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_views_authenticated_users" ON public.lead_views
    FOR ALL USING (auth.role() IN ('authenticated', 'admin', 'diretor', 'gerente'));

-- Audit Logs: Apenas INSERT (ninguém deleta), SELECT apenas para ADMIN
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert_only" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_logs_select_admin_only" ON public.audit_logs
    FOR SELECT USING (auth.role() IN ('admin', 'diretor', 'gerente'));

-- =====================================================
-- TRIGGERS DE AUDITORIA AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            new_value,
            ip_address,
            user_agent
        ) VALUES (
            auth.uid(),
            TG_OP || '_EM_' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            NEW.id::text,
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers')::json->>'user-agent'
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_value,
            new_value,
            ip_address,
            user_agent
        ) VALUES (
            auth.uid(),
            TG_OP || '_EM_' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            NEW.id::text,
            row_to_json(OLD),
            row_to_json(NEW),
            inet_client_addr(),
            current_setting('request.headers')::json->>'user-agent'
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_value,
            ip_address,
            user_agent
        ) VALUES (
            auth.uid(),
            TG_OP || '_EM_' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            OLD.id::text,
            row_to_json(OLD),
            inet_client_addr(),
            current_setting('request.headers')::json->>'user-agent'
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers nas tabelas principais
CREATE TRIGGER audit_land_opportunities
    AFTER INSERT OR UPDATE OR DELETE ON public.land_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_finance_commissions
    AFTER INSERT OR UPDATE OR DELETE ON public.finance_commissions
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_lead_views
    AFTER INSERT OR UPDATE OR DELETE ON public.lead_views
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para verificar se usuário tem documentos validados
CREATE OR REPLACE FUNCTION public.user_has_validated_docs(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.land_opportunities 
        WHERE created_by = p_user_id 
        AND status = 'documentado_validado'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular split de comissão automaticamente
CREATE OR REPLACE FUNCTION public.calcular_split_comissao(p_valor_total DECIMAL, p_corretor_id UUID)
RETURNS TABLE (
    percentual_coordenacao DECIMAL,
    valor_coordenacao DECIMAL,
    percentual_operacao DECIMAL,
    valor_operacao DECIMAL,
    percentual_sb DECIMAL,
    valor_sb DECIMAL,
    percentual_corretor DECIMAL,
    valor_corretor DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        2.00::DECIMAL as percentual_coordenacao,
        p_valor_total * 0.02 as valor_coordenacao,
        4.00::DECIMAL as percentual_operacao,
        p_valor_total * 0.04 as valor_operacao,
        6.00::DECIMAL as percentual_sb,
        p_valor_total * 0.06 as valor_sb,
        (100 - 2 - 4 - 6)::DECIMAL as percentual_corretor,
        p_valor_total * 0.88 as valor_corretor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS SEGURAS
-- =====================================================

-- View pública com dados básicos dos ativos
CREATE OR REPLACE VIEW public.land_opportunities_public AS
SELECT 
    id,
    titulo,
    descricao,
    localizacao_publica,
    area_m2,
    preco_m2,
    valor_total,
    zoneamento,
    status,
    coordenadas,
    documentos_url,
    created_by,
    created_at,
    updated_at
FROM public.land_opportunities;

-- View completa para administradores
CREATE OR REPLACE VIEW public.land_opportunities_full AS
SELECT 
    id,
    titulo,
    descricao,
    localizacao_publica,
    localizacao_exata,
    dados_proprietario,
    area_m2,
    preco_m2,
    valor_total,
    zoneamento,
    status,
    coordenadas,
    documentos_url,
    created_by,
    created_at,
    updated_at
FROM public.land_opportunities;

-- =====================================================
-- DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir alguns ativos de exemplo
INSERT INTO public.land_opportunities (
    id, titulo, descricao, localizacao_publica, area_m2, preco_m2, valor_total,
    zoneamento, status, coordenadas, documentos_url, created_by,
    localizacao_exata, dados_proprietario
) VALUES 
(
    uuid_generate_v4(),
    'Área Premium - Alphaville',
    'Terreno plano em área nobre com excelente localização. Próximo a shopping e escolas.',
    'Alphaville, SP - Zona Nobre',
    500.00,
    850.00,
    425000.00,
    'Residencial',
    'disponivel',
    ST_GeomFromText('POINT(-46.8865, -23.6475)', 4326),
    '["https://example.com/docs1.pdf", "https://example.com/docs2.pdf"]',
    (SELECT id FROM auth.users WHERE email = 'admin@securitybroker.com' LIMIT 1),
    'Rua Augusta, 1234 - Alphaville, SP - CEP: 06460-000',
    '{"nome": "Proprietário Confidencial", "cpf": "***.***.***-**", "telefone": "(11) ****-****"}'
),
(
    uuid_generate_v4(),
    'Terreno Industrial - São Bernardo',
    'Área industrial com grande potencial de valorização. Infraestrutura completa.',
    'São Bernardo do Campo, SP',
    1200.00,
    450.00,
    540000.00,
    'Industrial',
    'disponivel',
    ST_GeomFromText('POINT(-46.8865, -23.6475)', 4326),
    '["https://example.com/docs3.pdf"]',
    (SELECT id FROM auth.users WHERE email = 'admin@securitybroker.com' LIMIT 1),
    'Av. Industrial, 5000 - São Bernardo do Campo, SP - CEP: 09850-000',
    '{"nome": "Empresa Industrial Ltda", "cnpj": "**.***.***./****-**", "telefone": "(11) ****-****"}'
),
(
    uuid_generate_v4(),
    'Loteamento Residencial - Sorocaba',
    'Loteamento residencial com todos os serviços básicos. Ótimo para construtoras.',
    'Sorocaba, SP',
    800.00,
    600.00,
    480000.00,
    'Residencial',
    'disponivel',
    ST_GeomFromText('POINT(-46.8865, -23.6475)', 4326),
    '["https://example.com/docs4.pdf"]',
    (SELECT id FROM auth.users WHERE email = 'admin@securitybroker.com' LIMIT 1),
    'Rodovia Sorocaba, km 100 - Sorocaba, SP - CEP: 18000-000',
    '{"nome": "Incorporadora Sorocaba", "cnpj": "**.***.***./****-**", "telefone": "(15) ****-****"}'
);

-- =====================================================
-- GRANTS
-- =====================================================

-- GRANTS para acesso público
GRANT SELECT ON public.land_opportunities_public TO anon;
GRANT SELECT ON public.land_opportunities_public TO authenticated;

-- GRANTS para usuários autenticados
GRANT ALL ON public.land_opportunities TO authenticated;
GRANT ALL ON public.finance_commissions TO authenticated;
GRANT ALL ON public.lead_views TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SCHEMA IMPERIUM v10.0 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.land_opportunities) as total_ativos,
       (SELECT COUNT(*) FROM public.finance_commissions) as total_comissoes,
       (SELECT COUNT(*) FROM public.lead_views) as total_visualizacoes,
       (SELECT COUNT(*) FROM public.audit_logs) as total_auditorias;
