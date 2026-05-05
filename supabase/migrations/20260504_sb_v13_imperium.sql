-- 🏛️ SECURITY BROKER SB v13 - IMPERIUM SOBERANO
-- Schema completo para sistema de inteligência imobiliária com workflow cronológico

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS PRINCIPAIS DO SISTEMA SOBERANO
-- =====================================================

-- Incorporadoras e Construtoras
CREATE TABLE IF NOT EXISTS public.incorporadoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fantasia TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    status TEXT DEFAULT 'ativa', -- ativa, suspenso, encerrada
    plano TEXT DEFAULT 'basico', -- basico, premium, imperial
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_ativacao TIMESTAMPTZ,
    data_ultimo_pagamento TIMESTAMPTZ,
    proximo_vencimento TIMESTAMPTZ,
    valor_setup DECIMAL(10,2),
    valor_mensalidade DECIMAL(10,2),
    wallet_creditos DECIMAL(15,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Empreendimentos
CREATE TABLE IF NOT EXISTS public.empreendimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    endereco TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    total_unidades INTEGER NOT NULL,
    unidades_disponiveis INTEGER NOT NULL,
    area_total_m2 DECIMAL(10,2),
    vgv_estimado DECIMAL(15,2),
    status TEXT DEFAULT 'planejamento', -- planejamento, pre_lancamento, lancamento, construcao, entregue
    data_pre_lancamento DATE,
    data_lancamento DATE,
    data_entrega_prevista DATE,
    valor_medio_unidade DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unidades Imobiliárias
CREATE TABLE IF NOT EXISTS public.unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empreendimento_id UUID REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    tipo TEXT NOT NULL, -- apartamento, casa, cobertura, comercial
    dormitorios INTEGER,
    vagas_garagem INTEGER,
    area_privativa DECIMAL(8,2),
    area_total DECIMAL(8,2),
    preco_venda DECIMAL(12,2),
    preco_m2 DECIMAL(8,2),
    status TEXT DEFAULT 'disponivel', -- disponivel, reservado, vendido, bloqueado
    andar INTEGER,
    torre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corretores/Brokers
CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    creci TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'ativo', -- ativo, suspenso, inativo
    comissao_percentual DECIMAL(5,2) DEFAULT 4.00,
    pastas_100 INTEGER DEFAULT 0,
    total_vendido DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads/Clientes
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf TEXT NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento DATE,
    renda_mensal DECIMAL(10,2),
    profissao TEXT,
    status TEXT DEFAULT 'novo', -- novo, qualificado, em_analise, aprovado, rejeitado, convertido
    origem TEXT DEFAULT 'manual', -- manual, yara_ia, importacao
    duplicidade_detectada BOOLEAN DEFAULT FALSE,
    data_primeiro_contato TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastas de Documentos (Dossiê)
CREATE TABLE IF NOT EXISTS public.pastas_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'iniciada', -- iniciada, em_progresso, pendente, completa, rejeitada
    progresso_percentual INTEGER DEFAULT 0,
    documentos JSONB DEFAULT '{}', -- {rg: {url: '', status: 'pendente'}, cpf: {...}}
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análise de Crédito
CREATE TABLE IF NOT EXISTS public.analises_credito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    pasta_id UUID REFERENCES public.pastas_documentos(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pendente', -- pendente, em_analise, aprovado, rejeitado
    score_risco INTEGER, -- 0-100
    limite_aprovado DECIMAL(12,2),
    parcela_maxima DECIMAL(10,2),
    prazo_maximo INTEGER,
    taxa_juros DECIMAL(5,2),
    observacoes TEXT,
    data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
    data_analise TIMESTAMPTZ,
    analista_id UUID REFERENCES auth.users(id),
    biometria_autorizada BOOLEAN DEFAULT FALSE,
    ip_autorizacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas e Comissões
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE CASCADE,
    valor_venda DECIMAL(12,2) NOT NULL,
    data_venda TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pendente', -- pendente, confirmada, cancelada, concluida
    forma_pagamento TEXT,
    entrada_percentual DECIMAL(5,2),
    parcelas INTEGER,
    taxa_juros DECIMAL(5,2),
    comissao_corretor DECIMAL(12,2),
    comissao_coordenacao DECIMAL(12,2),
    comissao_sb DECIMAL(12,2),
    success_fee DECIMAL(12,2),
    biometria_assinatura BOOLEAN DEFAULT FALSE,
    ip_assinatura TEXT,
    hash_contrato TEXT, -- SHA-256 do contrato
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Split de Comissões
CREATE TABLE IF NOT EXISTS public.comissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    valor_total DECIMAL(12,2) NOT NULL,
    percentual_coordenacao DECIMAL(5,2) DEFAULT 2.00,
    valor_coordenacao DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_coordenacao / 100) STORED,
    percentual_corretor DECIMAL(5,2) DEFAULT 4.00,
    valor_corretor DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_corretor / 100) STORED,
    percentual_sb DECIMAL(5,2) DEFAULT 6.00,
    valor_sb DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_sb / 100) STORED,
    status TEXT DEFAULT 'pendente', -- pendente, processado, pago, atrasado
    data_vencimento TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    multa_atraso DECIMAL(12,2) DEFAULT 0,
    juros_atraso DECIMAL(12,2) DEFAULT 0,
    valor_total_recebido DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet de Créditos
CREATE TABLE IF NOT EXISTS public.wallet_creditos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- leads, ads, marketing, bonus
    valor DECIMAL(10,2) NOT NULL,
    origem TEXT, -- faturamento_b2b, deposito, bonus
    status TEXT DEFAULT 'disponivel', -- disponivel, usado, expirado
    data_expiracao DATE,
    data_uso TIMESTAMPTZ,
    referencia_id UUID, -- ID da venda ou depósito
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aportes e Marketing
CREATE TABLE IF NOT EXISTS public.aportes_marketing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    tipo TEXT NOT NULL, -- setup, estruturacao, campanha, ads
    data_aporte TIMESTAMPTZ DEFAULT NOW(),
    data_vencimento TIMESTAMPTZ,
    status TEXT DEFAULT 'pendente', -- pendente, pago, vencido, cancelado
    metodo_pagamento TEXT,
    referencia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yara IA - Qualificação de Leads
CREATE TABLE IF NOT EXISTS public.yara_ia_analises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    score_qualificacao INTEGER, -- 0-100
    probabilidade_conversao DECIMAL(5,2), -- 0-100%
    perfil_comportamental JSONB,
    recomendacoes JSONB,
    status TEXT DEFAULT 'pendente', -- pendente, analisado, qualificado, rejeitado
    data_analise TIMESTAMPTZ DEFAULT NOW(),
    modelo_versao TEXT DEFAULT 'v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nexo Causal Jurídico (Art. 725 CC)
CREATE TABLE IF NOT EXISTS public.nexo_causal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    acao TEXT NOT NULL, -- cadastro, contato, analise, venda
    hash_sha256 TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    dados_acao JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificações e Push
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinatario_id UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id),
    broker_id UUID REFERENCES public.brokers(id),
    incorporadora_id UUID REFERENCES public.incorporadoras(id),
    tipo TEXT NOT NULL, -- info, alerta, duplicidade, preferencia
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    status TEXT DEFAULT 'nao_lida', -- nao_lida, lida, arquivada
    data_envio TIMESTAMPTZ DEFAULT NOW(),
    data_leitura TIMESTAMPTZ,
    push_enviado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Auditoria (LGPD)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id),
    acao TEXT NOT NULL,
    tabela_afetada TEXT,
    registro_id TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    user_agent TEXT,
    data_bloqueio DATE, -- Para LGPD 2 anos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES
-- =====================================================

-- Trigger para gerar hash SHA-256 do Nexo Causal
CREATE OR REPLACE FUNCTION public.gerar_nexo_causal_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_sha256 = encode(
        sha256(NEW.lead_id::text || NEW.broker_id::text || NEW.acao::text || EXTRACT(EPOCH FROM NEW.created_at)::text),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_nexo_causal_hash
    BEFORE INSERT ON public.nexo_causal
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_nexo_causal_hash();

-- Trigger para atualizar progresso da pasta
CREATE OR REPLACE FUNCTION public.atualizar_progresso_pasta()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular progresso baseado nos documentos
    DECLARE
        total_documentos INTEGER := 0;
        documentos_completos INTEGER := 0;
        progresso INTEGER := 0;
    BEGIN
        -- Se documentos foram atualizados
        IF TG_OP = 'UPDATE' AND OLD.documentos IS DISTINCT FROM NEW.documentos THEN
            -- Contar documentos (simplificado - adaptar conforme estrutura real)
            total_documentos := jsonb_array_length(NEW.documentos);
            
            -- Contar documentos completos
            SELECT COUNT(*) INTO documentos_completos
            FROM jsonb_each_text(NEW.documentos) 
            WHERE value = 'completo';
            
            -- Calcular progresso
            IF total_documentos > 0 THEN
                progresso := (documentos_completos * 100) / total_documentos;
            END IF;
            
            NEW.progresso_percentual := progresso;
            NEW.ultima_atualizacao := NOW();
            
            -- Se atingiu 100%, marcar como completa
            IF progresso = 100 THEN
                NEW.status := 'completa';
                NEW.data_conclusao := NOW();
                
                -- Gatilho automático para análise de crédito
                INSERT INTO public.analises_credito (lead_id, pasta_id, status)
                VALUES (NEW.lead_id, NEW.id, 'em_analise');
            END IF;
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_pasta
    BEFORE UPDATE ON public.pastas_documentos
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_progresso_pasta();

-- Trigger para detectar duplicidade de CPF
CREATE OR REPLACE FUNCTION public.verificar_duplicidade_cpf()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se CPF já existe com outro broker
    IF EXISTS (
        SELECT 1 FROM public.leads 
        WHERE cpf = NEW.cpf 
        AND id != COALESCE(NEW.id::text, '00000000-0000-0000-0000-000000000000')::uuid
    ) THEN
        NEW.duplicidade_detectada := TRUE;
        
        -- Criar notificação de duplicidade
        INSERT INTO public.notificacoes (
            destinatario_id,
            lead_id,
            broker_id,
            tipo,
            titulo,
            mensagem
        ) VALUES (
            NEW.created_by,
            NEW.id,
            (SELECT broker_id FROM public.pastas_documentos WHERE lead_id = NEW.id LIMIT 1),
            'duplicidade',
            'Duplicidade de CPF Detectada',
            'Cliente já em atendimento no ecossistema. Prioridade para quem atingir 100% da pasta.'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_verificar_duplicidade
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.verificar_duplicidade_cpf();

-- Trigger para calcular comissões automaticamente
CREATE OR REPLACE FUNCTION public.calcular_comissoes_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular valores de comissão
    NEW.comissao_corretor := NEW.valor_venda * 0.04; -- 4% corretor
    NEW.comissao_coordenacao := NEW.valor_venda * 0.02; -- 2% coordenação
    NEW.comissao_sb := NEW.valor_venda * 0.06; -- 6% SB
    
    -- Gerar hash do contrato
    NEW.hash_contrato := encode(
        sha256(NEW.id::text || NEW.valor_venda::text || NEW.lead_id::text || EXTRACT(EPOCH FROM NEW.data_venda)::text),
        'hex'
    );
    
    -- Inserir na tabela de comissões
    INSERT INTO public.comissoes (
        venda_id,
        corretor_id,
        valor_total,
        data_vencimento
    ) VALUES (
        NEW.id,
        NEW.broker_id,
        NEW.valor_venda,
        NEW.data_venda + INTERVAL '5 days' -- Vencimento em 5 dias
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_comissoes
    BEFORE INSERT ON public.vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_comissoes_venda();

-- Trigger para multa de atraso em comissões
CREATE OR REPLACE FUNCTION public.aplicar_multa_atraso()
RETURNS TRIGGER AS $$
BEGIN
    -- Se está atrasado e ainda não foi aplicada multa
    IF NEW.status = 'atrasado' AND OLD.status != 'atrasado' THEN
        NEW.multa_atraso := NEW.valor_corretor * 0.10; -- 10% de multa
        NEW.juros_atraso := NEW.valor_corretor * 0.01; -- 1% de juros
        NEW.valor_total_recebido := NEW.valor_corretor + NEW.multa_atraso + NEW.juros_atraso;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_multa_atraso
    BEFORE UPDATE ON public.comissoes
    FOR EACH ROW
    EXECUTE FUNCTION public.aplicar_multa_atraso();

-- =====================================================
-- VIEWS E FUNÇÕES ÚTEIS
-- =====================================================

-- View de mérito por CPF
CREATE OR REPLACE VIEW public.merito_cpf AS
SELECT 
    l.cpf,
    l.nome,
    COUNT(DISTINCT pd.broker_id) as qtd_corretores,
    MAX(pd.progresso_percentual) as maior_progresso,
    CASE 
        WHEN MAX(pd.progresso_percentual) = 100 THEN 'preferencia'
        ELSE 'concorrente'
    END as status_merito,
    MAX(pd.data_conclusao) as data_conclusao_pasta
FROM public.leads l
LEFT JOIN public.pastas_documentos pd ON l.id = pd.lead_id
WHERE l.duplicidade_detectada = TRUE
GROUP BY l.cpf, l.nome;

-- View de VGV por empreendimento
CREATE OR REPLACE VIEW public.vgv_empreendimento AS
SELECT 
    e.id,
    e.nome as empreendimento,
    i.nome_fantasia as incorporadora,
    COUNT(u.id) as total_unidades,
    COUNT(CASE WHEN u.status = 'disponivel' THEN 1 END) as unidades_disponiveis,
    COUNT(CASE WHEN u.status = 'vendido' THEN 1 END) as unidades_vendidas,
    SUM(CASE WHEN u.status = 'vendido' THEN u.preco_venda ELSE 0 END) as vgv_gerado,
    SUM(u.preco_venda) as vgv_potencial,
    ROUND((COUNT(CASE WHEN u.status = 'vendido' THEN 1 END) * 100.0 / COUNT(u.id)), 2) as percentual_vendido
FROM public.empreendimentos e
JOIN public.incorporadoras i ON e.incorporadora_id = i.id
LEFT JOIN public.unidades u ON e.id = u.empreendimento_id
GROUP BY e.id, e.nome, i.nome_fantasia;

-- Função para calcular wallet de créditos
CREATE OR REPLACE FUNCTION public.calcular_wallet_creditos(p_incorporadora_id UUID)
RETURNS TABLE (
    creditos_disponiveis DECIMAL,
    creditos_usados DECIMAL,
    creditos_expirados DECIMAL,
    saldo_atual DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'disponivel' AND (data_expiracao IS NULL OR data_expiracao > CURRENT_DATE) THEN valor ELSE 0 END), 0) as creditos_disponiveis,
        COALESCE(SUM(CASE WHEN status = 'usado' THEN valor ELSE 0 END), 0) as creditos_usados,
        COALESCE(SUM(CASE WHEN status = 'disponivel' AND data_expiracao <= CURRENT_DATE THEN valor ELSE 0 END), 0) as creditos_expirados,
        COALESCE(SUM(CASE WHEN status = 'disponivel' AND (data_expiracao IS NULL OR data_expiracao > CURRENT_DATE) THEN valor ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN status = 'usado' THEN valor ELSE 0 END), 0) as saldo_atual
    FROM public.wallet_creditos
    WHERE incorporadora_id = p_incorporadora_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.incorporadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastas_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aportes_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yara_ia_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexo_causal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para Leads (visibilidade controlada)
CREATE POLICY "leads_public_view" ON public.leads
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (duplicidade_detectada = FALSE OR created_by = auth.uid())
    );

CREATE POLICY "leads_own_insert" ON public.leads
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "leads_own_update" ON public.leads
    FOR UPDATE USING (created_by = auth.uid() OR auth.role() IN ('admin', 'diretor'));

-- Políticas para Pastas de Documentos
CREATE POLICY "pastas_own_select" ON public.pastas_documentos
    FOR SELECT USING (
        broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

CREATE POLICY "pastas_own_insert" ON public.pastas_documentos
    FOR INSERT WITH CHECK (broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()));

-- Políticas para Vendas
CREATE POLICY "vendas_own_select" ON public.vendas
    FOR SELECT USING (
        broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()) OR
        incorporadora_id IN (SELECT id FROM public.incorporadoras WHERE created_by = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Comissões
CREATE POLICY "comissoes_own_select" ON public.comissoes
    FOR SELECT USING (
        corretor_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Notificações
CREATE POLICY "notificacoes_own_select" ON public.notificacoes
    FOR SELECT USING (
        destinatario_id = auth.uid() OR
        broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()) OR
        incorporadora_id IN (SELECT id FROM public.incorporadoras WHERE created_by = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Audit Logs (apenas admin)
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
    FOR ALL USING (auth.role() IN ('admin', 'diretor'));

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir dados de exemplo
INSERT INTO public.incorporadoras (
    id, nome_fantasia, razao_social, cnpj, plano, valor_setup, valor_mensalidade
) VALUES 
(
    uuid_generate_v4(),
    'SB Incorporações Imperial',
    'SB Incorporações Ltda',
    '12.345.678/0001-90',
    'imperial',
    135000.00,
    25000.00
),
(
    uuid_generate_v4(),
    'Construtora Alpha',
    'Construtora Alpha Ltda',
    '98.765.432/0001-10',
    'premium',
    55000.00,
    15000.00
);

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leads_cpf ON public.leads(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_duplicidade ON public.leads(duplicidade_detectada);
CREATE INDEX IF NOT EXISTS idx_pastas_lead_id ON public.pastas_documentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_pastas_broker_id ON public.pastas_documentos(broker_id);
CREATE INDEX IF NOT EXISTS idx_pastas_status ON public.pastas_documentos(status);
CREATE INDEX IF NOT EXISTS idx_vendas_broker_id ON public.vendas(broker_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON public.comissoes(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_vencimento ON public.comissoes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_nexo_causal_hash ON public.nexo_causal(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON public.notificacoes(status);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM v13 - SISTEMA SOBERANO CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.incorporadoras) as total_incorporadoras,
       (SELECT COUNT(*) FROM public.empreendimentos) as total_empreendimentos,
       (SELECT COUNT(*) FROM public.brokers) as total_brokers,
       (SELECT COUNT(*) FROM public.leads) as total_leads,
       (SELECT COUNT(*) FROM public.vendas) as total_vendas,
       (SELECT COUNT(*) FROM public.comissoes) as total_comissoes,
       (SELECT COUNT(*) FROM public.wallet_creditos) as total_creditos;
