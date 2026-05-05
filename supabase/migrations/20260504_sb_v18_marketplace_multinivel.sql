-- 🏛️ SECURITY BROKER SB v18 - MARKETPLACE & MULTINÍVEL
-- Schema completo para Marketplace de Serviços e Gestão de Créditos

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS DE MARKETPLACE DE SERVIÇOS
-- =====================================================

-- Categorias de Serviços
CREATE TABLE IF NOT EXISTS public.categorias_servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_categoria TEXT NOT NULL,
    descricao TEXT,
    slug TEXT UNIQUE NOT NULL,
    icone TEXT,
    cor_hex TEXT,
    taxa_intermediacao_padrao DECIMAL(5,2) DEFAULT 20.00, -- 20% padrão SB
    ativa BOOLEAN DEFAULT true,
    ordem_exibicao INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serviços do Marketplace
CREATE TABLE IF NOT EXISTS public.servicos_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES public.categorias_servicos(id) ON DELETE CASCADE,
    prestador_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados do Serviço
    nome_servico TEXT NOT NULL,
    descricao_servico TEXT,
    preco_base DECIMAL(12,2) NOT NULL,
    preco_minimo DECIMAL(12,2),
    preco_maximo DECIMAL(12,2),
    tipo_preco TEXT NOT NULL, -- 'fixo', 'faixa', 'orcamento'
    
    -- Configuração de Taxas
    taxa_intermediacao DECIMAL(5,2) DEFAULT 20.00, -- 20% SB
    split_niveis JSONB DEFAULT '[]', -- Split multinível
    comissao_pai DECIMAL(5,2) DEFAULT 0.00, -- % para o pai
    comissao_neto DECIMAL(5,2) DEFAULT 0.00, -- % para o neto
    comissao_nivel3 DECIMAL(5,2) DEFAULT 0.00, -- % para o nível 3
    
    -- Disponibilidade
    disponivel BOOLEAN DEFAULT true,
    regioes_atendidas TEXT[] DEFAULT '{}',
    tempo_entrega_estimado INTEGER, -- minutos
    horario_funcionamento JSONB DEFAULT '{}',
    
    -- Avaliação e Reputação
    avaliacao_media DECIMAL(3,2) DEFAULT 0.00,
    total_avaliacoes INTEGER DEFAULT 0,
    selo_qualidade TEXT, -- 'bronze', 'prata', 'ouro', 'platina'
    
    -- Status
    status TEXT DEFAULT 'ativo', -- 'ativo', 'pausado', 'inativo'
    aprovado BOOLEAN DEFAULT false,
    data_aprovacao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ordens de Serviços
CREATE TABLE IF NOT EXISTS public.ordens_servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    servico_id UUID REFERENCES public.servicos_marketplace(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados da Ordem
    descricao_ordem TEXT,
    preco_final DECIMAL(12,2) NOT NULL,
    data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
    data_aceite TIMESTAMPTZ,
    data_conclusao TIMESTAMPTZ,
    data_expiracao TIMESTAMPTZ,
    
    -- Endereço de Execução
    endereco_execucao TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    coordenadas GEOGRAPHY(POINT, 4326),
    
    -- Status
    status TEXT DEFAULT 'pendente', -- 'pendente', 'aceito', 'executando', 'concluido', 'cancelado', 'disputado'
    motivo_cancelamento TEXT,
    
    -- Pagamento
    forma_pagamento TEXT, -- 'checkout_sb', 'cartao', 'pix', 'boleto'
    status_pagamento TEXT, -- 'pendente', 'processando', 'pago', 'falha'
    gateway_pagamento TEXT,
    id_transacao_externa TEXT,
    
    -- Split Multinível
    split_detalhes JSONB DEFAULT '{}',
    valores_distribuidos JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE GESTÃO DE CRÉDITOS SB_CREDITS
-- =====================================================

-- Wallet de Créditos SB
CREATE TABLE IF NOT EXISTS public.wallet_creditos_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Saldos
    saldo_disponivel DECIMAL(12,2) DEFAULT 0.00,
    saldo_bloqueado DECIMAL(12,2) DEFAULT 0.00,
    saldo_total DECIMAL(12,2) GENERATED ALWAYS AS (saldo_disponivel + saldo_bloqueado) STORED,
    
    -- Configurações
    limite_credito DECIMAL(12,2) DEFAULT 0.00,
    score_credito DECIMAL(5,2) DEFAULT 0.00,
    nivel_credito TEXT DEFAULT 'basico', -- 'basico', 'prata', 'ouro', 'platina'
    
    -- Status
    status TEXT DEFAULT 'ativo', -- 'ativo', 'suspenso', 'bloqueado'
    data_ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações de Créditos
CREATE TABLE IF NOT EXISTS public.transacoes_creditos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallet_creditos_sb(id) ON DELETE CASCADE,
    
    -- Dados da Transação
    tipo_transacao TEXT NOT NULL, -- 'ganho', 'gasto', 'estorno', 'expiracao'
    valor_transacao DECIMAL(12,2) NOT NULL,
    saldo_antes DECIMAL(12,2) NOT NULL,
    saldo_depois DECIMAL(12,2) NOT NULL,
    
    -- Origem/Destino
    origem_transacao TEXT, -- 'marketplace', 'indicacao', 'bonus', 'estorno'
    id_origem UUID, -- ID da ordem, indicação, etc.
    descricao_transacao TEXT,
    
    -- Expiração (TTL)
    data_expiracao DATE,
    notificado_60_dias BOOLEAN DEFAULT false,
    notificado_30_dias BOOLEAN DEFAULT false,
    notificado_7_dias BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_transacao TEXT UNIQUE
);

-- Regras de Expiração
CREATE TABLE IF NOT EXISTS public.regras_expiracao_creditos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nivel_credito TEXT NOT NULL,
    dias_expiracao INTEGER NOT NULL,
    percentual_notificacao DECIMAL(5,2) DEFAULT 100.00,
    
    -- Configurações de Notificação
    notificar_60_dias BOOLEAN DEFAULT true,
    notificar_30_dias BOOLEAN DEFAULT true,
    notificar_7_dias BOOLEAN DEFAULT true,
    notificar_1_dia BOOLEAN DEFAULT true,
    
    -- Ações Automáticas
    acao_expiracao TEXT DEFAULT 'estorno_treasury', -- 'estorno_treasury', 'transferencia_disponivel'
    percentual_estorno DECIMAL(5,2) DEFAULT 0.00,
    
    -- Status
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE CHECKOUT NATIVO
-- =====================================================

-- Checkout Nativo SB
CREATE TABLE IF NOT EXISTS public.checkout_nativo_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordem_servico_id UUID REFERENCES public.ordens_servicos(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    
    -- Dados do Pagamento
    valor_total DECIMAL(12,2) NOT NULL,
    forma_pagamento TEXT NOT NULL, -- 'cartao_sb', 'pix_sb', 'debito_sb'
    parcelas INTEGER DEFAULT 1,
    
    -- Split Multinível (20% total)
    valor_split_total DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * 0.20) STORED,
    valor_nivel1 DECIMAL(12,2), -- 20% do split
    valor_nivel2 DECIMAL(12,2), -- 20% do valor_nivel1
    valor_nivel3 DECIMAL(12,2), -- 20% do valor_nivel2
    valor_nivel4 DECIMAL(12,2), -- 20% do valor_nivel3
    valor_nivel5 DECIMAL(12,2), -- 20% do valor_nivel4 (restante)
    
    -- IDs dos Recebedores
    broker_nivel1_id UUID REFERENCES public.brokers(id),
    broker_nivel2_id UUID REFERENCES public.brokers(id),
    broker_nivel3_id UUID REFERENCES public.brokers(id),
    broker_nivel4_id UUID REFERENCES public.brokers(id),
    broker_nivel5_id UUID REFERENCES public.brokers(id),
    
    -- Processamento
    status TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'aprovado', 'pago', 'falha'
    data_processamento TIMESTAMPTZ DEFAULT NOW(),
    data_aprovacao TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    
    -- Gateway
    gateway_pagamento TEXT, -- 'sb_internal', 'stripe', 'mercadopago'
    id_transacao_gateway TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTEGRAÇÃO COM MERITOCRACIA
-- =====================================================

-- Uso de Créditos para Melhorar Score
CREATE TABLE IF NOT EXISTS public.uso_creditos_meritocracia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    transacao_credito_id UUID REFERENCES public.transacoes_creditos(id) ON DELETE CASCADE,
    
    -- Tipo de Melhoria
    tipo_melhoria TEXT NOT NULL, -- 'comprar_pasta', 'aumentar_score', 'desbloquear_lead', 'feature_special'
    custo_creditos DECIMAL(12,2) NOT NULL,
    
    -- Resultado
    score_antes DECIMAL(5,2) NOT NULL,
    score_depois DECIMAL(5,2) NOT NULL,
    nivel_antes TEXT,
    nivel_depois TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_transacao TEXT UNIQUE
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE MARKETPLACE
-- =====================================================

-- Trigger para calcular split multinível
CREATE OR REPLACE FUNCTION public.calcular_split_multinivel()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular valores do split multinível (20% total)
    NEW.valor_nivel1 := NEW.valor_total * 0.20; -- 20% do total
    NEW.valor_nivel2 := NEW.valor_nivel1 * 0.20; -- 20% do nível 1
    NEW.valor_nivel3 := NEW.valor_nivel2 * 0.20; -- 20% do nível 2
    NEW.valor_nivel4 := NEW.valor_nivel3 * 0.20; -- 20% do nível 3
    NEW.valor_nivel5 := NEW.valor_nivel4 * 0.20; -- 20% do nível 4 (restante)
    
    -- Ajustar para garantir que a soma seja exatamente 20% do total
    NEW.valor_nivel5 := (NEW.valor_total * 0.20) - (NEW.valor_nivel1 + NEW.valor_nivel2 + NEW.valor_nivel3 + NEW.valor_nivel4);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_split_multinivel
    BEFORE INSERT OR UPDATE ON public.checkout_nativo_sb
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_split_multinivel();

-- Trigger para processar transações de créditos
CREATE OR REPLACE FUNCTION public.processar_transacao_credito()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar hash da transação
    NEW.hash_transacao := encode(sha256(NEW.wallet_id::TEXT || NEW.tipo_transacao::TEXT || NEW.valor_transacao::TEXT || NEW.created_at::TEXT), 'hex');
    
    -- Atualizar saldo da wallet
    IF NEW.tipo_transacao = 'ganho' THEN
        UPDATE public.wallet_creditos_sb
        SET 
            saldo_disponivel = saldo_disponivel + NEW.valor_transacao,
            saldo_total = saldo_total + NEW.valor_transacao,
            data_ultima_atualizacao = NOW()
        WHERE id = NEW.wallet_id;
    ELSIF NEW.tipo_transacao = 'gasto' THEN
        UPDATE public.wallet_creditos_sb
        SET 
            saldo_disponivel = saldo_disponivel - NEW.valor_transacao,
            saldo_bloqueado = saldo_bloqueado + NEW.valor_transacao,
            saldo_total = saldo_total,
            data_ultima_atualizacao = NOW()
        WHERE id = NEW.wallet_id;
    ELSIF NEW.tipo_transacao = 'estorno' THEN
        UPDATE public.wallet_creditos_sb
        SET 
            saldo_disponivel = saldo_disponivel + NEW.valor_transacao,
            saldo_bloqueado = saldo_bloqueado - NEW.valor_transacao,
            saldo_total = saldo_total,
            data_ultima_atualizacao = NOW()
        WHERE id = NEW.wallet_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_processar_transacao_credito
    AFTER INSERT ON public.transacoes_creditos
    FOR EACH ROW
    EXECUTE FUNCTION public.processar_transacao_credito();

-- Trigger para expiração de créditos
CREATE OR REPLACE FUNCTION public.verificar_expiracao_creditos()
RETURNS void AS $$
DECLARE
    creditos_expirados RECORD;
BEGIN
    -- Buscar créditos expirados
    FOR creditos_expirados IN 
        SELECT tc.*, w.broker_id
        FROM public.transacoes_creditos tc
        JOIN public.wallet_creditos_sb w ON tc.wallet_id = w.id
        WHERE tc.tipo_transacao = 'ganho'
        AND tc.data_expiracao < CURRENT_DATE
        AND tc.notificado_1_dia = false
    LOOP
        -- Criar transação de expiração
        INSERT INTO public.transacoes_creditos (
            wallet_id,
            tipo_transacao,
            valor_transacao,
            saldo_antes,
            saldo_depois,
            origem_transacao,
            id_origem,
            descricao_transacao
        ) VALUES (
            creditos_expirados.wallet_id,
            'expiracao',
            creditos_expirados.valor_transacao,
            creditos_expirados.saldo_antes,
            creditos_expirados.saldo_antes - creditos_expirados.valor_transacao,
            'expiracao_automatica',
            creditos_expirados.id,
            'Crédito expirado após 90 dias'
        );
        
        -- Atualizar notificação
        UPDATE public.transacoes_creditos
        SET notificado_1_dia = true
        WHERE id = creditos_expirados.id;
        
        -- Enviar notificação (simulado)
        PERFORM pg_notify('credito_expirado', json_build_object(
            'broker_id', creditos_expirados.broker_id,
            'valor', creditos_expirados.valor_transacao,
            'data_expiracao', creditos_expirados.data_expiracao
        )::TEXT);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÕES DE MARKETPLACE
-- =====================================================

-- Função para buscar serviços disponíveis
CREATE OR REPLACE FUNCTION public.buscar_servicos_disponiveis(
    p_categoria_id UUID DEFAULT NULL,
    p_cidade TEXT DEFAULT NULL,
    p_preco_minimo DECIMAL DEFAULT 0,
    p_preco_maximo DECIMAL DEFAULT 999999.99,
    p_limite INTEGER DEFAULT 50
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
BEGIN
    -- Buscar serviços ativos e aprovados
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'nome_servico', s.nome_servico,
            'descricao_servico', s.descricao_servico,
            'preco_base', s.preco_base,
            'preco_minimo', s.preco_minimo,
            'preco_maximo', s.preco_maximo,
            'tipo_preco', s.tipo_preco,
            'taxa_intermediacao', s.taxa_intermediacao,
            'split_niveis', s.split_niveis,
            'avaliacao_media', s.avaliacao_media,
            'total_avaliacoes', s.total_avaliacoes,
            'selo_qualidade', s.selo_qualidade,
            'prestador', jsonb_build_object(
                'id', b.id,
                'nome', b.nome,
                'email', b.email,
                'telefone', b.telefone
            ),
            'categoria', jsonb_build_object(
                'id', c.id,
                'nome', c.nome_categoria,
                'slug', c.slug
            ),
            'disponibilidade', jsonb_build_object(
                'disponivel', s.disponivel,
                'regioes_atendidas', s.regioes_atendidas,
                'tempo_entrega_estimado', s.tempo_entrega_estimado,
                'horario_funcionamento', s.horario_funcionamento
            )
        )
    ) INTO resultado
    FROM public.servicos_marketplace s
    JOIN public.brokers b ON s.prestador_id = b.id
    JOIN public.categorias_servicos c ON s.categoria_id = c.id
    WHERE s.status = 'ativo'
    AND s.aprovado = true
    AND s.disponivel = true
    AND (p_categoria_id IS NULL OR s.categoria_id = p_categoria_id)
    AND (p_cidade IS NULL OR s.regioes_atendidas @> ARRAY[p_cidade])
    AND s.preco_base BETWEEN p_preco_minimo AND p_preco_maximo
    ORDER BY s.avaliacao_media DESC, s.total_avaliacoes DESC
    LIMIT p_limite;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar ordem de serviço
CREATE OR REPLACE FUNCTION public.criar_ordem_servico(
    p_servico_id UUID,
    p_cliente_id UUID,
    p_descricao_ordem TEXT,
    p_preco_final DECIMAL,
    p_endereco_execucao TEXT,
    p_cidade TEXT,
    p_estado TEXT,
    p_cep TEXT,
    p_coordenadas_lat DECIMAL,
    p_coordenadas_lng DECIMAL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    nova_ordem_id UUID;
    servico_disponivel BOOLEAN;
BEGIN
    -- Verificar se serviço está disponível
    SELECT (status = 'ativo' AND aprovado = true AND disponivel = true) INTO servico_disponivel
    FROM public.servicos_marketplace
    WHERE id = p_servico_id;
    
    IF NOT servico_disponivel THEN
        RETURN jsonb_build_object('erro', 'Serviço não está disponível');
    END IF;
    
    -- Criar ordem
    INSERT INTO public.ordens_servicos (
        servico_id,
        cliente_id,
        descricao_ordem,
        preco_final,
        endereco_execucao,
        cidade,
        estado,
        cep,
        coordenadas,
        data_expiracao
    ) VALUES (
        p_servico_id,
        p_cliente_id,
        p_descricao_ordem,
        p_preco_final,
        p_endereco_execucao,
        p_cidade,
        p_estado,
        p_cep,
        ST_GeomFromText('POINT(' || p_coordenadas_lng || ' ' || p_coordenadas_lat || ')', 4326),
        CURRENT_TIMESTAMP + INTERVAL '7 days'
    ) RETURNING id INTO nova_ordem_id;
    
    -- Construir resultado
    resultado := jsonb_build_object(
        'ordem_id', nova_ordem_id,
        'status', 'criada',
        'data_expiracao', CURRENT_TIMESTAMP + INTERVAL '7 days',
        'mensagem', 'Ordem criada com sucesso. Aguardando aceitação do prestador.'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar checkout nativo
CREATE OR REPLACE FUNCTION public.processar_checkout_nativo(
    p_ordem_servico_id UUID,
    p_cliente_id UUID,
    p_forma_pagamento TEXT,
    p_parcelas INTEGER DEFAULT 1,
    p_broker_nivel1_id UUID,
    p_broker_nivel2_id UUID DEFAULT NULL,
    p_broker_nivel3_id UUID DEFAULT NULL,
    p_broker_nivel4_id UUID DEFAULT NULL,
    p_broker_nivel5_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    novo_checkout_id UUID;
    ordem_valida BOOLEAN;
BEGIN
    -- Verificar se ordem é válida
    SELECT (status = 'pendente' AND data_expiracao > CURRENT_TIMESTAMP) INTO ordem_valida
    FROM public.ordens_servicos
    WHERE id = p_ordem_servico_id;
    
    IF NOT ordem_valida THEN
        RETURN jsonb_build_object('erro', 'Ordem inválida ou expirada');
    END IF;
    
    -- Criar checkout
    INSERT INTO public.checkout_nativo_sb (
        ordem_servico_id,
        cliente_id,
        valor_total,
        forma_pagamento,
        parcelas,
        broker_nivel1_id,
        broker_nivel2_id,
        broker_nivel3_id,
        broker_nivel4_id,
        broker_nivel5_id,
        status
    ) VALUES (
        p_ordem_servico_id,
        p_cliente_id,
        (SELECT preco_final FROM public.ordens_servicos WHERE id = p_ordem_servico_id),
        p_forma_pagamento,
        p_parcelas,
        p_broker_nivel1_id,
        p_broker_nivel2_id,
        p_broker_nivel3_id,
        p_broker_nivel4_id,
        p_broker_nivel5_id,
        'processando'
    ) RETURNING id INTO novo_checkout_id;
    
    -- Atualizar status da ordem
    UPDATE public.ordens_servicos
    SET 
        status = 'aceito',
        data_aceite = CURRENT_TIMESTAMP,
        broker_id = p_broker_nivel1_id
    WHERE id = p_ordem_servico_id;
    
    -- Construir resultado
    resultado := jsonb_build_object(
        'checkout_id', novo_checkout_id,
        'status', 'processando',
        'mensagem', 'Pagamento processando. Aguardando confirmação.',
        'valores_distribuidos', jsonb_build_object(
            'nivel1', jsonb_build_object('valor', (SELECT valor_nivel1 FROM public.checkout_nativo_sb WHERE id = novo_checkout_id), 'broker_id', p_broker_nivel1_id),
            'nivel2', jsonb_build_object('valor', (SELECT valor_nivel2 FROM public.checkout_nativo_sb WHERE id = novo_checkout_id), 'broker_id', p_broker_nivel2_id),
            'nivel3', jsonb_build_object('valor', (SELECT valor_nivel3 FROM public.checkout_nativo_sb WHERE id = novo_checkout_id), 'broker_id', p_broker_nivel3_id),
            'nivel4', jsonb_build_object('valor', (SELECT valor_nivel4 FROM public.checkout_nativo_sb WHERE id = novo_checkout_id), 'broker_id', p_broker_nivel4_id),
            'nivel5', jsonb_build_object('valor', (SELECT valor_nivel5 FROM public.checkout_nativo_sb WHERE id = novo_checkout_id), 'broker_id', p_broker_nivel5_id)
        )
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS OTIMIZADAS
-- =====================================================

-- View de Dashboard Marketplace
CREATE OR REPLACE VIEW public.dashboard_marketplace AS
SELECT 
    s.*,
    c.nome_categoria,
    c.slug as categoria_slug,
    b.nome as prestador_nome,
    b.email as prestador_email,
    b.telefone as prestador_telefone,
    CASE 
        WHEN s.avaliacao_media >= 4.5 THEN 'platina'
        WHEN s.avaliacao_media >= 4.0 THEN 'ouro'
        WHEN s.avaliacao_media >= 3.5 THEN 'prata'
        WHEN s.avaliacao_media >= 3.0 THEN 'bronze'
        ELSE 'sem_classificacao'
    END as classificacao_final,
    CASE 
        WHEN s.total_avaliacoes >= 50 THEN 'muito_confiavel'
        WHEN s.total_avaliacoes >= 20 THEN 'confiavel'
        WHEN s.total_avaliacoes >= 10 THEN 'razoavel'
        ELSE 'avaliar'
    END as nivel_confianca
FROM public.servicos_marketplace s
JOIN public.categorias_servicos c ON s.categoria_id = c.id
JOIN public.brokers b ON s.prestador_id = b.id
WHERE s.status = 'ativo'
ORDER BY s.avaliacao_media DESC, s.total_avaliacoes DESC;

-- View de Wallet de Créditos
CREATE OR REPLACE VIEW public.wallet_creditos_resumo AS
SELECT 
    w.*,
    b.nome as broker_nome,
    b.email as broker_email,
    b.score_meritocracia,
    CASE 
        WHEN w.saldo_total >= 10000 THEN 'alto'
        WHEN w.saldo_total >= 5000 THEN 'medio'
        WHEN w.saldo_total >= 1000 THEN 'baixo'
        ELSE 'minimo'
    END as nivel_saldo,
    CASE 
        WHEN w.score_credito >= 80 THEN 'excelente'
        WHEN w.score_credito >= 60 THEN 'bom'
        WHEN w.score_credito >= 40 THEN 'regular'
        ELSE 'precisa_melhorar'
    END as classificacao_credito
FROM public.wallet_creditos_sb w
JOIN public.brokers b ON w.broker_id = b.id
WHERE w.status = 'ativo'
ORDER BY w.saldo_total DESC;

-- View de Transações de Créditos
CREATE OR REPLACE VIEW public.transacoes_creditos_dashboard AS
SELECT 
    t.*,
    w.broker_id,
    b.nome as broker_nome,
    b.email as broker_email,
    CASE 
        WHEN t.tipo_transacao = 'ganho' THEN 'credito'
        WHEN t.tipo_transacao = 'gasto' THEN 'debito'
        WHEN t.tipo_transacao = 'estorno' THEN 'estorno'
        ELSE 'expiracao'
    END as tipo_operacao,
    CASE 
        WHEN t.tipo_transacao = 'ganho' THEN 'success'
        WHEN t.tipo_transacao = 'gasto' THEN 'warning'
        WHEN t.tipo_transacao = 'estorno' THEN 'info'
        ELSE 'error'
    END as status_visual
FROM public.transacoes_creditos t
JOIN public.wallet_creditos_sb w ON t.wallet_id = w.id
JOIN public.brokers b ON w.broker_id = b.id
ORDER BY t.created_at DESC;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON public.servicos_marketplace(categoria_id);
CREATE INDEX IF NOT EXISTS idx_servicos_prestador ON public.servicos_marketplace(prestador_id);
CREATE INDEX IF NOT EXISTS idx_servicos_status ON public.servicos_marketplace(status, aprovado);
CREATE INDEX IF NOT EXISTS idx_servicos_preco ON public.servicos_marketplace(preco_base);
CREATE INDEX IF NOT EXISTS idx_servicos_avaliacao ON public.servicos_marketplace(avaliacao_media DESC);
CREATE INDEX IF NOT EXISTS idx_ordens_cliente ON public.ordens_servicos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico ON public.ordens_servicos(servico_id);
CREATE INDEX IF NOT EXISTS idx_ordens_status ON public.ordens_servicos(status);
CREATE INDEX IF NOT EXISTS idx_ordens_data ON public.ordens_servicos(data_solicitacao DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_broker ON public.wallet_creditos_sb(broker_id);
CREATE INDEX IF NOT EXISTS idx_wallet_status ON public.wallet_creditos_sb(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_wallet ON public.transacoes_creditos(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON public.transacoes_creditos(tipo_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes_creditos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_ordem ON public.checkout_nativo_sb(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_checkout_status ON public.checkout_nativo_sb(status);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir categorias de serviços
INSERT INTO public.categorias_servicos (
    nome_categoria, descricao, slug, icone, cor_hex, taxa_intermediacao_padrao, ordem_exibicao
) VALUES
('Arquitetura', 'Projetos arquitetônicos e plantas', 'arquitetura', '#FF6B6B', 20.00, 1),
('Engenharia', 'Análises estruturais e cálculos', 'engenharia', '#4ECDC4', 20.00, 2),
('Advocacia', 'Consultoria jurídica imobiliária', 'advocacia', '#45B7D1', 20.00, 3),
('Financiamento', 'Intermediação financeira', 'financiamento', '#96CEB4', 20.00, 4),
('Marketing Digital', 'Divulgação imobiliária online', 'marketing-digital', '#FF9500', 20.00, 5),
('Fotografia', 'Fotografia profissional de imóveis', 'fotografia', '#7C3AED', 20.00, 6),
('Consultoria', 'Consultoria imobiliária geral', 'consultoria', '#2ECC71', 20.00, 7),
('Vistoria', 'Vistorias técnicas e laudos', 'vistoria', '#E91E63', 20.00, 8);

-- Inserir regras de expiração
INSERT INTO public.regras_expiracao_creditos (
    nivel_credito, dias_expiracao, percentual_notificacao, notificar_60_dias, notificar_30_dias, notificar_7_dias, notificar_1_dia, acao_expiracao, percentual_estorno
) VALUES
('basico', 90, 100.00, true, true, true, true, 'estorno_treasury', 0.00),
('prata', 120, 100.00, true, true, true, true, 'estorno_treasury', 0.00),
('ouro', 180, 100.00, true, true, true, true, 'estorno_treasury', 0.00),
('platina', 365, 100.00, true, true, true, true, 'estorno_treasury', 0.00);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V18 - MARKETPLACE & MULTINÍVEL CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.categorias_servicos) as total_categorias,
       (SELECT COUNT(*) FROM public.servicos_marketplace) as total_servicos,
       (SELECT COUNT(*) FROM public.ordens_servicos) as total_ordens,
       (SELECT COUNT(*) FROM public.wallet_creditos_sb) as total_wallets,
       (SELECT COUNT(*) FROM public.transacoes_creditos) as total_transacoes,
       (SELECT COUNT(*) FROM public.checkout_nativo_sb) as total_checkouts;
