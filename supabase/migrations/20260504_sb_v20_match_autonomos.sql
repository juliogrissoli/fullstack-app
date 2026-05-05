-- 🏛️ SECURITY BROKER SB v20 - MATCH DE AUTÔNOMOS & SPLIT
-- Schema completo para Match de Autônomos com Split de Mesa

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS DE MATCH DE AUTÔNOMOS
-- =====================================================

-- Matches de Autônomos
CREATE TABLE IF NOT EXISTS public.matches_autonomos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados do Match
    imovel_id UUID REFERENCES public.imoveis_exclusividade(id) ON DELETE CASCADE,
    captador_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    parceiro_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    
    -- Valores da Transação
    valor_imovel DECIMAL(12,2) NOT NULL,
    comissao_total DECIMAL(12,2) NOT NULL,
    comissao_percentual DECIMAL(5,2) NOT NULL,
    
    -- Split de Mesa (Distribuição)
    captador_parte DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.10) STORED, -- 10%
    parceiro_parte DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.30) STORED, -- 30%
    vendedor_parte DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.40) STORED, -- 40%
    sb_system_parte DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.20) STORED, -- 20%
    
    -- Status do Match
    status_match TEXT DEFAULT 'pendente', -- 'pendente', 'aceito', 'executando', 'concluido', 'cancelado'
    data_match TIMESTAMPTZ DEFAULT NOW(),
    data_fechamento TIMESTAMPTZ,
    
    -- Condições de Saque
    dossiê_100_percent BOOLEAN DEFAULT false,
    nota_fiscal_validada BOOLEAN DEFAULT false,
    status_disponibilidade TEXT DEFAULT 'bloqueado', -- 'bloqueado', 'parcial', 'disponivel'
    data_liberacao_saque TIMESTAMPTZ,
    
    -- Gateway de Pagamento
    gateway_pagamento TEXT, -- 'stripe', 'mercadopago', 'pix_sb', 'transferencia'
    id_transacao_gateway TEXT,
    status_pagamento TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'pago', 'falha'
    data_pagamento TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_match TEXT UNIQUE
);

-- Transações de Split de Mesa
CREATE TABLE IF NOT EXISTS public.transacoes_split_mesa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_autonomo_id UUID REFERENCES public.matches_autonomos(id) ON DELETE CASCADE,
    
    -- Dados da Transação
    tipo_participante TEXT NOT NULL, -- 'captador', 'parceiro', 'vendedor', 'sb_system'
    broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Valores
    valor_original DECIMAL(12,2) NOT NULL,
    valor_liquido DECIMAL(12,2) NOT NULL,
    taxa_servico DECIMAL(5,2) DEFAULT 0.00,
    
    -- Split 70/30 (apenas para SB_SYSTEM)
    valor_70_percent DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN tipo_participante = 'sb_system' 
            THEN valor_liquido * 0.70 
            ELSE 0 
        END
    ) STORED,
    valor_30_percent DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN tipo_participante = 'sb_system' 
            THEN valor_liquido * 0.30 
            ELSE 0 
        END
    ) STORED,
    
    -- Status
    status_transacao TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'pago', 'bloqueado', 'cancelado'
    data_processamento TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    data_liberacao TIMESTAMPTZ,
    
    -- Wallet de Destino
    wallet_saque_id UUID REFERENCES public.wallet_saque_autonomo(id) ON DELETE SET NULL,
    wallet_aceleracao_id UUID REFERENCES public.wallet_aceleracao_autonomo(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_transacao TEXT UNIQUE
);

-- Histórico de Pagamentos de Split
CREATE TABLE IF NOT EXISTS public.historico_pagamentos_split (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_autonomo_id UUID REFERENCES public.matches_autonomos(id) ON DELETE CASCADE,
    
    -- Dados do Pagamento
    participante TEXT NOT NULL, -- 'captador', 'parceiro', 'vendedor', 'sb_system'
    broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Valores
    valor_pago DECIMAL(12,2) NOT NULL,
    taxa_retencao DECIMAL(5,2) DEFAULT 0.00,
    valor_liquido DECIMAL(12,2) NOT NULL,
    
    -- Métodos
    metodo_pagamento TEXT NOT NULL, -- 'transferencia', 'pix', 'deposito', 'cartao'
    conta_destino TEXT,
    
    -- Status
    status_pagamento TEXT DEFAULT 'processado', -- 'processado', 'falha', 'estornado'
    data_pagamento TIMESTAMPTZ DEFAULT NOW(),
    
    -- Comprovação
    comprovante_url TEXT,
    hash_comprovante TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE AUDITORIA SOBERANA
-- =====================================================

-- Extrato Detalhado de Comissões
CREATE TABLE IF NOT EXISTS public.extrato_detalhado_comissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    match_autonomo_id UUID REFERENCES public.matches_autonomos(id) ON DELETE CASCADE,
    
    -- Dados da Comissão
    tipo_participacao TEXT NOT NULL, -- 'captador', 'parceiro', 'vendedor', 'sb_system'
    comissao_total DECIMAL(12,2) NOT NULL,
    sua_parte DECIMAL(12,2) NOT NULL,
    saldo_reinvestimento DECIMAL(12,2) NOT NULL,
    
    -- Status
    status_comissao TEXT DEFAULT 'pendente', -- 'pendente', 'bloqueada', 'parcial', 'disponivel'
    motivo_bloqueio TEXT, -- 'dossiê_incompleto', 'nf_invalida', 'aguardando_pagamento'
    
    -- Liberações
    data_liberacao_parcial TIMESTAMPTZ,
    data_liberacao_total TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Auditoria de Split
CREATE TABLE IF NOT EXISTS public.logs_auditoria_split (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_autonomo_id UUID REFERENCES public.matches_autonomos(id) ON DELETE CASCADE,
    
    -- Dados da Auditoria
    tipo_auditoria TEXT NOT NULL, -- 'match_criado', 'split_processado', 'pagamento_efetuado', 'liberacao_efetuada'
    dados_antigos JSONB,
    dados_novos JSONB,
    
    -- Validações
    split_validado BOOLEAN DEFAULT false,
    pagamentos_validados BOOLEAN DEFAULT false,
    auditoria_soberana BOOLEAN DEFAULT false,
    
    -- Responsável
    auditor_responsavel UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Status
    status_auditoria TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado'
    observacoes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_auditoria TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE GATEWAY DE PAGAMENTO
-- =====================================================

-- Configurações de Gateway
CREATE TABLE IF NOT EXISTS public.configuracoes_gateway (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados do Gateway
    nome_gateway TEXT NOT NULL, -- 'stripe', 'mercadopago', 'pix_sb', 'transferencia'
    ativo BOOLEAN DEFAULT true,
    ambiente TEXT DEFAULT 'producao', -- 'sandbox', 'producao'
    
    -- Configurações
    api_key TEXT,
    webhook_url TEXT,
    taxa_padrao DECIMAL(5,2) DEFAULT 0.00,
    taxa_fixa DECIMAL(10,2) DEFAULT 0.00,
    
    -- Limites
    limite_minimo DECIMAL(12,2) DEFAULT 0.00,
    limite_maximo DECIMAL(12,2) DEFAULT 999999.99,
    
    -- Status
    status_gateway TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    ultimo_teste TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processamentos de Pagamento
CREATE TABLE IF NOT EXISTS public.processamentos_pagamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_autonomo_id UUID REFERENCES public.matches_autonomos(id) ON DELETE CASCADE,
    
    -- Dados do Processamento
    gateway_id UUID REFERENCES public.configuracoes_gateway(id) ON DELETE SET NULL,
    tipo_processamento TEXT NOT NULL, -- 'match_completo', 'split_individual'
    
    -- Valores
    valor_total DECIMAL(12,2) NOT NULL,
    taxa_gateway DECIMAL(5,2) DEFAULT 0.00,
    valor_liquido DECIMAL(12,2) NOT NULL,
    
    -- Participantes
    participantes JSONB DEFAULT '[]', -- Array de participantes com valores
    
    -- Status
    status_processamento TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'concluido', 'falha'
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    
    -- Gateway
    id_transacao_gateway TEXT,
    resposta_gateway JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_processamento TEXT UNIQUE
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE SPLIT
-- =====================================================

-- Trigger para gerar hash do match
CREATE OR REPLACE FUNCTION public.gerar_hash_match_autonomo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_match := encode(sha256(
        NEW.imovel_id::TEXT || 
        NEW.captador_id::TEXT || 
        NEW.parceiro_id::TEXT || 
        NEW.vendedor_id::TEXT || 
        NEW.valor_imovel::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_match_autonomo
    BEFORE INSERT ON public.matches_autonomos
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_match_autonomo();

-- Trigger para processar split automático
CREATE OR REPLACE FUNCTION public.processar_split_automatico()
RETURNS TRIGGER AS $$
DECLARE
    transacao_id UUID;
BEGIN
    -- Criar transações de split para cada participante
    -- Captador (10%)
    INSERT INTO public.transacoes_split_mesa (
        match_autonomo_id,
        tipo_participante,
        broker_id,
        valor_original,
        valor_liquido,
        status_transacao
    ) VALUES (
        NEW.id,
        'captador',
        NEW.captador_id,
        NEW.captador_parte,
        NEW.captador_parte,
        'pendente'
    ) RETURNING id INTO transacao_id;
    
    -- Parceiro (30%)
    INSERT INTO public.transacoes_split_mesa (
        match_autonomo_id,
        tipo_participante,
        broker_id,
        valor_original,
        valor_liquido,
        status_transacao
    ) VALUES (
        NEW.id,
        'parceiro',
        NEW.parceiro_id,
        NEW.parceiro_parte,
        NEW.parceiro_parte,
        'pendente'
    );
    
    -- Vendedor (40%)
    INSERT INTO public.transacoes_split_mesa (
        match_autonomo_id,
        tipo_participante,
        broker_id,
        valor_original,
        valor_liquido,
        status_transacao
    ) VALUES (
        NEW.id,
        'vendedor',
        NEW.vendedor_id,
        NEW.vendedor_parte,
        NEW.vendedor_parte,
        'pendente'
    );
    
    -- SB System (20%)
    INSERT INTO public.transacoes_split_mesa (
        match_autonomo_id,
        tipo_participante,
        valor_original,
        valor_liquido,
        status_transacao
    ) VALUES (
        NEW.id,
        'sb_system',
        NULL,
        NEW.sb_system_parte,
        NEW.sb_system_parte,
        'pendente'
    );
    
    -- Criar extratos detalhados
    INSERT INTO public.extrato_detalhado_comissoes (
        broker_id,
        match_autonomo_id,
        tipo_participacao,
        comissao_total,
        sua_parte,
        saldo_reinvestimento,
        status_comissao,
        motivo_bloqueio
    ) VALUES 
    (
        NEW.captador_id,
        NEW.id,
        'captador',
        NEW.comissao_total,
        NEW.captador_parte,
        0,
        'bloqueada',
        'dossiê_incompleto'
    ),
    (
        NEW.parceiro_id,
        NEW.id,
        'parceiro',
        NEW.comissao_total,
        NEW.parceiro_parte,
        0,
        'bloqueada',
        'dossiê_incompleto'
    ),
    (
        NEW.vendedor_id,
        NEW.id,
        'vendedor',
        NEW.comissao_total,
        NEW.vendedor_parte,
        0,
        'bloqueada',
        'dossiê_incompleto'
    );
    
    -- Criar log de auditoria
    INSERT INTO public.logs_auditoria_split (
        match_autonomo_id,
        tipo_auditoria,
        dados_novos,
        split_validado,
        auditoria_soberana
    ) VALUES (
        NEW.id,
        'match_criado',
        jsonb_build_object(
            'captador_id', NEW.captador_id,
            'parceiro_id', NEW.parceiro_id,
            'vendedor_id', NEW.vendedor_id,
            'valor_imovel', NEW.valor_imovel,
            'comissao_total', NEW.comissao_total,
            'split_distribuicao', jsonb_build_object(
                'captador', NEW.captador_parte,
                'parceiro', NEW.parceiro_parte,
                'vendedor', NEW.vendedor_parte,
                'sb_system', NEW.sb_system_parte
            )
        ),
        true,
        true
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_processar_split_automatico
    AFTER INSERT ON public.matches_autonomos
    FOR EACH ROW
    EXECUTE FUNCTION public.processar_split_automatico();

-- Trigger para atualizar status de disponibilidade
CREATE OR REPLACE FUNCTION public.atualizar_status_disponibilidade()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se Dossiê está 100% e NF validada
    IF NEW.dossiê_100_percent = true AND NEW.nota_fiscal_validada = true THEN
        -- Liberar comissões (80%)
        UPDATE public.transacoes_split_mesa
        SET status_transacao = 'disponivel',
            data_liberacao = NOW()
        WHERE match_autonomo_id = NEW.id
        AND tipo_participante IN ('captador', 'parceiro', 'vendedor');
        
        -- Atualizar extratos
        UPDATE public.extrato_detalhado_comissoes
        SET status_comissao = 'disponivel',
            data_liberacao_total = NOW()
        WHERE match_autonomo_id = NEW.id
        AND tipo_participacao IN ('captador', 'parceiro', 'vendedor');
        
        -- Liberar 70% do SB System
        UPDATE public.transacoes_split_mesa
        SET status_transacao = 'disponivel',
            data_liberacao = NOW()
        WHERE match_autonomo_id = NEW.id
        AND tipo_participante = 'sb_system';
        
        -- Atualizar status do match
        UPDATE public.matches_autonomos
        SET status_disponibilidade = 'disponivel',
            data_liberacao_saque = NOW()
        WHERE id = NEW.id;
        
    ELSIF NEW.dossiê_100_percent = true OR NEW.nota_fiscal_validada = true THEN
        -- Liberação parcial (50%)
        UPDATE public.transacoes_split_mesa
        SET status_transacao = 'parcial',
            data_liberacao = NOW()
        WHERE match_autonomo_id = NEW.id
        AND tipo_participante IN ('captador', 'parceiro', 'vendedor');
        
        -- Atualizar extratos
        UPDATE public.extrato_detalhado_comissoes
        SET status_comissao = 'parcial',
            data_liberacao_parcial = NOW()
        WHERE match_autonomo_id = NEW.id
        AND tipo_participacao IN ('captador', 'parceiro', 'vendedor');
        
        -- Atualizar status do match
        UPDATE public.matches_autonomos
        SET status_disponibilidade = 'parcial'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_status_disponibilidade
    AFTER UPDATE ON public.matches_autonomos
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_status_disponibilidade();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para processar pagamento integral
CREATE OR REPLACE FUNCTION public.processar_pagamento_integral(
    p_match_id UUID,
    p_gateway TEXT DEFAULT 'stripe'
) RETURNS JSONB AS $$
DECLARE
    match_data RECORD;
    processamento_id UUID;
    gateway_config RECORD;
BEGIN
    -- Buscar dados do match
    SELECT * INTO match_data
    FROM public.matches_autonomos
    WHERE id = p_match_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Match não encontrado');
    END IF;
    
    -- Buscar configuração do gateway
    SELECT * INTO gateway_config
    FROM public.configuracoes_gateway
    WHERE nome_gateway = p_gateway
    AND ativo = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Gateway não encontrado ou inativo');
    END IF;
    
    -- Criar processamento de pagamento
    INSERT INTO public.processamentos_pagamento (
        match_autonomo_id,
        gateway_id,
        tipo_processamento,
        valor_total,
        taxa_gateway,
        valor_liquido,
        participantes
    ) VALUES (
        p_match_id,
        gateway_config.id,
        'match_completo',
        match_data.comissao_total,
        gateway_config.taxa_padrao,
        match_data.comissao_total * (1 - gateway_config.taxa_padrao / 100),
        jsonb_build_array(
            jsonb_build_object('tipo', 'captador', 'valor', match_data.captador_parte, 'broker_id', match_data.captador_id),
            jsonb_build_object('tipo', 'parceiro', 'valor', match_data.parceiro_parte, 'broker_id', match_data.parceiro_id),
            jsonb_build_object('tipo', 'vendedor', 'valor', match_data.vendedor_parte, 'broker_id', match_data.vendedor_id),
            jsonb_build_object('tipo', 'sb_system', 'valor', match_data.sb_system_parte, 'broker_id', NULL)
        )
    ) RETURNING id INTO processamento_id;
    
    -- Atualizar status do match
    UPDATE public.matches_autonomos
    SET status_match = 'executando',
        gateway_pagamento = p_gateway,
        status_pagamento = 'processando'
    WHERE id = p_match_id;
    
    -- Criar log de auditoria
    INSERT INTO public.logs_auditoria_split (
        match_autonomo_id,
        tipo_auditoria,
        dados_novos,
        pagamentos_validados,
        auditoria_soberana
    ) VALUES (
        p_match_id,
        'pagamento_efetuado',
        jsonb_build_object(
            'gateway', p_gateway,
            'valor_total', match_data.comissao_total,
            'processamento_id', processamento_id
        ),
        true,
        true
    );
    
    RETURN jsonb_build_object(
        'sucesso', true,
        'processamento_id', processamento_id,
        'valor_total', match_data.comissao_total,
        'participantes', jsonb_build_array(
            jsonb_build_object('tipo', 'captador', 'valor', match_data.captador_parte),
            jsonb_build_object('tipo', 'parceiro', 'valor', match_data.parceiro_parte),
            jsonb_build_object('tipo', 'vendedor', 'valor', match_data.vendedor_parte),
            jsonb_build_object('tipo', 'sb_system', 'valor', match_data.sb_system_parte)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar extrato detalhado
CREATE OR REPLACE FUNCTION public.gerar_extrato_detalhado(
    p_broker_id UUID,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
BEGIN
    -- Buscar extrato detalhado
    SELECT jsonb_agg(
        jsonb_build_object(
            'match_id', ed.match_autonomo_id,
            'tipo_participacao', ed.tipo_participacao,
            'comissao_total', ed.comissao_total,
            'sua_parte', ed.sua_parte,
            'saldo_reinvestimento', ed.saldo_reinvestimento,
            'status_comissao', ed.status_comissao,
            'motivo_bloqueio', ed.motivo_bloqueio,
            'data_liberacao_parcial', ed.data_liberacao_parcial,
            'data_liberacao_total', ed.data_liberacao_total,
            'dados_match', jsonb_build_object(
                'valor_imovel', ma.valor_imovel,
                'data_match', ma.data_match,
                'status_match', ma.status_match,
                'captador_nome', bc.nome,
                'parceiro_nome', bp.nome,
                'vendedor_nome', bv.nome,
                'cliente_nome', cl.nome
            )
        )
    ) INTO resultado
    FROM public.extrato_detalhado_comissoes ed
    JOIN public.matches_autonomos ma ON ed.match_autonomo_id = ma.id
    LEFT JOIN public.brokers bc ON ma.captador_id = bc.id
    LEFT JOIN public.brokers bp ON ma.parceiro_id = bp.id
    LEFT JOIN public.brokers bv ON ma.vendedor_id = bv.id
    LEFT JOIN public.clientes cl ON ma.cliente_id = cl.id
    WHERE ed.broker_id = p_broker_id
    AND (p_data_inicio IS NULL OR ma.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR ma.created_at <= p_data_fim)
    ORDER BY ed.created_at DESC;
    
    RETURN COALESCE(resultado, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS OTIMIZADAS
-- =====================================================

-- View de Dashboard Match Autônomos
CREATE OR REPLACE VIEW public.dashboard_match_autonomos AS
SELECT 
    ma.*,
    captador.nome as captador_nome,
    captador.email as captador_email,
    parceiro.nome as parceiro_nome,
    parceiro.email as parceiro_email,
    vendedor.nome as vendedor_nome,
    vendedor.email as vendedor_email,
    cliente.nome as cliente_nome,
    cliente.email as cliente_email,
    COUNT(DISTINCT ts.id) as total_transacoes_split,
    COALESCE(SUM(ts.valor_liquido), 0) as valor_total_distribuido,
    CASE 
        WHEN ma.dossiê_100_percent AND ma.nota_fiscal_validada THEN 'disponivel'
        WHEN ma.dossiê_100_percent OR ma.nota_fiscal_validada THEN 'parcial'
        ELSE 'bloqueado'
    END as status_disponibilidade_final
FROM public.matches_autonomos ma
LEFT JOIN public.brokers captador ON ma.captador_id = captador.id
LEFT JOIN public.brokers parceiro ON ma.parceiro_id = parceiro.id
LEFT JOIN public.brokers vendedor ON ma.vendedor_id = vendedor.id
LEFT JOIN public.clientes cliente ON ma.cliente_id = cliente.id
LEFT JOIN public.transacoes_split_mesa ts ON ma.id = ts.match_autonomo_id
GROUP BY ma.id, captador.id, parceiro.id, vendedor.id, cliente.id;

-- View de Extrato Consolidado
CREATE OR REPLACE VIEW public.extrato_consolidado_autonomos AS
SELECT 
    ed.broker_id,
    b.nome as broker_nome,
    b.email as broker_email,
    COUNT(*) as total_participacoes,
    COUNT(CASE WHEN ed.status_comissao = 'disponivel' THEN 1 END) as total_disponiveis,
    COUNT(CASE WHEN ed.status_comissao = 'bloqueado' THEN 1 END) as total_bloqueados,
    COUNT(CASE WHEN ed.status_comissao = 'parcial' THEN 1 END) as total_parciais,
    COALESCE(SUM(ed.sua_parte), 0) as total_ganhos,
    COALESCE(SUM(ed.saldo_reinvestimento), 0) as total_reinvestimento,
    COALESCE(SUM(
        CASE 
            WHEN ed.status_comissao = 'disponivel' 
            THEN ed.sua_parte 
            ELSE 0 
        END
    ), 0) as total_disponivel_saque,
    COALESCE(SUM(
        CASE 
            WHEN ed.status_comissao IN ('bloqueado', 'parcial') 
            THEN ed.sua_parte 
            ELSE 0 
        END
    ), 0) as total_bloqueado,
    MAX(ed.created_at) as ultima_participacao
FROM public.extrato_detalhado_comissoes ed
JOIN public.brokers b ON ed.broker_id = b.id
GROUP BY ed.broker_id, b.id
ORDER BY total_ganhos DESC;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_matches_autonomos_captador ON public.matches_autonomos(captador_id);
CREATE INDEX IF NOT EXISTS idx_matches_autonomos_parceiro ON public.matches_autonomos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_matches_autonomos_vendedor ON public.matches_autonomos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_matches_autonomos_status ON public.matches_autonomos(status_match);
CREATE INDEX IF NOT EXISTS idx_matches_autonomos_disponibilidade ON public.matches_autonomos(status_disponibilidade);
CREATE INDEX IF NOT EXISTS idx_transacoes_split_match ON public.transacoes_split_mesa(match_autonomo_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_split_broker ON public.transacoes_split_mesa(broker_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_split_status ON public.transacoes_split_mesa(status_transacao);
CREATE INDEX IF NOT EXISTS idx_extrato_broker ON public.extrato_detalhado_comissoes(broker_id);
CREATE INDEX IF NOT EXISTS idx_extrato_status ON public.extrato_detalhado_comissoes(status_comissao);
CREATE INDEX IF NOT EXISTS idx_processamentos_match ON public.processamentos_pagamento(match_autonomo_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_match ON public.logs_auditoria_split(match_autonomo_id);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir configurações de gateway
INSERT INTO public.configuracoes_gateway (
    nome_gateway,
    ativo,
    ambiente,
    taxa_padrao,
    taxa_fixa,
    limite_minimo,
    limite_maximo,
    status_gateway
) VALUES
('stripe', true, 'producao', 2.90, 0.50, 10.00, 500000.00, 'ativo'),
('mercadopago', true, 'producao', 3.99, 0.30, 10.00, 500000.00, 'ativo'),
('pix_sb', true, 'producao', 0.00, 0.00, 1.00, 100000.00, 'ativo'),
('transferencia', true, 'producao', 0.00, 0.00, 10.00, 1000000.00, 'ativo');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V20 - MATCH DE AUTÔNOMOS & SPLIT CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.matches_autonomos) as total_matches,
       (SELECT COUNT(*) FROM public.transacoes_split_mesa) as total_transacoes_split,
       (SELECT COUNT(*) FROM public.extrato_detalhado_comissoes) as total_extratos,
       (SELECT COUNT(*) FROM public.processamentos_pagamento) as total_processamentos,
       (SELECT COUNT(*) FROM public.logs_auditoria_split) as total_logs_auditoria;
