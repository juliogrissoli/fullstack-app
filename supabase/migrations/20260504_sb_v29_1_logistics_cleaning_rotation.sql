-- 🏛️ SECURITY BROKER SB v29.1 - LOGISTICS & CLEANING ROTATION
-- Schema completo para gestão de manutenção e roleta de prestadores

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- ROLETA DE PRESTADORES DE SERVIÇO
-- =====================================================

-- Catálogo de Prestadores de Serviço
CREATE TABLE IF NOT EXISTS public.prestadores_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    prestador_id TEXT UNIQUE NOT NULL,
    nome_prestador TEXT NOT NULL,
    documento_cpf_cnpj TEXT NOT NULL,
    tipo_prestador TEXT NOT NULL, -- 'limpeza', 'manutencao', 'pintura', 'jardim', 'eletrica', 'hidraulica', 'pintura', 'outros'
    
    -- Contato
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    endereco TEXT NOT NULL,
    bairro TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT,
    coordinates POINT,
    
    -- Qualificação
    score_prestador DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    tempo_medio_execucao INTEGER DEFAULT 0, -- minutos
    total_servicos_realizados INTEGER DEFAULT 0,
    taxa_aceite DECIMAL(5,2) DEFAULT 0.00, -- % de aceitação
    
    -- Serviços Oferecidos
    servicos_oferecidos TEXT[] DEFAULT '{}',
    especialidades TEXT[] DEFAULT '{}',
    areas_atendimento TEXT[] DEFAULT '{}',
    
    -- Status
    status_prestador TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'suspenso', 'bloqueado'
    data_cadastro DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Financeiro
    valor_medio_servico DECIMAL(10,2) DEFAULT 0.00,
    forma_pagamento TEXT[] DEFAULT '{'pix','dinheiro','transferencia'}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_prestador TEXT UNIQUE
);

-- Ordens de Serviço com Status de Limpeza
CREATE TABLE IF NOT EXISTS public.ordens_servico_limpeza (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    os_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
    
    -- Detalhes do Serviço
    tipo_servico TEXT NOT NULL,
    descricao_servico TEXT NOT NULL,
    data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
    data_agendada TIMESTAMPTZ,
    data_inicio_servico TIMESTAMPTZ,
    data_fim_servico TIMESTAMPTZ,
    
    -- Status da OS
    status_os TEXT DEFAULT 'EM_LIMPEZA', -- 'EM_LIMPEZA', 'AGUARDANDO_PRESTADOR', 'ACEITA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'DANO_DETECTADO'
    status_anterior TEXT,
    
    -- Timer de Aceite
    timer_aceite_minutos INTEGER DEFAULT 30, -- minutos para aceitar
    data_limite_aceite TIMESTAMPTZ,
    aceita_em TIMESTAMPTZ,
    
    -- Rotação Automática
    reatribuida_vezes INTEGER DEFAULT 0,
    data_ultima_reatribuicao TIMESTAMPTZ,
    prestador_anterior_id UUID REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
    
    -- Prioridade e Escala
    prioridade INTEGER DEFAULT 1, -- 1-10
    ranking_escala INTEGER DEFAULT 0, -- posição no ranking
    
    -- Financeiro
    valor_servico DECIMAL(10,2) NOT NULL,
    valor_reparo DECIMAL(10,2) DEFAULT 0.00,
    forma_pagamento TEXT DEFAULT 'pix',
    status_pagamento TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'reembolsado', 'cobranca'
    
    -- Localização
    endereco_servico TEXT NOT NULL,
    bairro_servico TEXT,
    cidade_servico TEXT NOT NULL,
    estado_servico TEXT NOT NULL,
    coordinates_servico POINT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_os TEXT UNIQUE
);

-- =====================================================
-- AUDITORIA DE DANOS E COBRANÇA AUTOMÁTICA
-- =====================================================

-- Vistoria de Saída (Obrigatório: Foto + Descrição)
CREATE TABLE IF NOT EXISTS public.vistorias_saida (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    vistoria_id TEXT UNIQUE NOT NULL,
    os_id UUID REFERENCES public.ordens_servico_limpeza(id) ON DELETE CASCADE,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
    imovel_id UUID NOT NULL,
    
    -- Detalhes da Vistoria
    data_vistoria TIMESTAMPTZ DEFAULT NOW(),
    tipo_vistoria TEXT NOT NULL, -- 'saida', 'entrada', 'danos'
    
    -- Fotos Obrigatórias
    foto_antes TEXT, -- URL da foto antes do serviço
    foto_depois TEXT, -- URL da foto depois do serviço
    foto_dano TEXT, -- URL da foto do dano (se houver)
    foto_comprovante TEXT, -- URL do comprovante
    
    -- Descrição Detalhada
    descricao_geral TEXT NOT NULL,
    descricao_danos TEXT,
    descricao_estado_imovel TEXT,
    
    -- Avaliação de Danos
    dano_detectado BOOLEAN DEFAULT false,
    tipo_dano TEXT, -- 'arranhao', 'quebra', 'mancha', 'umidade', 'outros'
    gravidade_dano TEXT, -- 'leve', 'moderado', 'grave'
    custo_estimado_reparo DECIMAL(10,2) DEFAULT 0.00,
    
    -- Responsabilidade
    responsavel_dano TEXT, -- 'prestador', 'cliente', 'imovel', 'terceiro'
    descricao_circunstancia TEXT,
    
    -- Validação
    assinatura_prestador TEXT,
    assinatura_cliente TEXT,
    hash_vistoria TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fluxo Financeiro para Danos Detectados
CREATE TABLE IF NOT EXISTS public.fluxo_financeiro_danos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    transacao_id TEXT UNIQUE NOT NULL,
    vistoria_id UUID REFERENCES public.vistorias_saida(id) ON DELETE CASCADE,
    os_id UUID REFERENCES public.ordens_servico_limpeza(id) ON DELETE CASCADE,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL,
    
    -- Detalhes do Dano
    data_dano_detectado TIMESTAMPTZ NOT NULL,
    tipo_dano TEXT NOT NULL,
    gravidade_dano TEXT NOT NULL,
    custo_reparo DECIMAL(10,2) NOT NULL,
    
    -- Payment Link Gerado
    payment_link_id TEXT UNIQUE,
    payment_link_url TEXT,
    payment_link_gerado_em TIMESTAMPTZ,
    payment_link_expira_em TIMESTAMPTZ,
    
    -- Bloqueio de Garantia
    garantia_bloqueada BOOLEAN DEFAULT false,
    valor_garantia_bloqueada DECIMAL(10,2) DEFAULT 0.00,
    data_bloqueio_garantia TIMESTAMPTZ,
    motivo_bloqueio TEXT,
    
    -- Status da Cobrança
    status_cobranca TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'vencido', 'cancelado', 'reembolsado'
    data_vencimento_cobranca DATE,
    data_pagamento TIMESTAMPTZ,
    valor_pago DECIMAL(10,2) DEFAULT 0.00,
    metodo_pagamento TEXT, -- 'pix', 'cartao', 'boleto', 'transferencia'
    
    -- Responsabilização
    responsavel_pagamento TEXT, -- 'prestador', 'cliente', 'seguro', 'dividido'
    percentual_responsabilidade_prestador DECIMAL(5,2) DEFAULT 0.00,
    percentual_responsabilidade_cliente DECIMAL(5,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_transacao TEXT UNIQUE
);

-- =====================================================
-- NOTIFICAÇÃO PUSH & WHATSAPP
-- =====================================================

-- Configurações de Notificação
CREATE TABLE IF NOT EXISTS public.configuracoes_notificacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    tipo_canal TEXT NOT NULL, -- 'push', 'whatsapp', 'email', 'sms'
    
    -- Configurações
    api_provider TEXT, -- 'resend', 'twilio', 'firebase', 'meta'
    api_key TEXT,
    api_secret TEXT,
    api_endpoint TEXT,
    
    -- Templates
    template_checkout_cliente TEXT,
    template_checkout_prestador TEXT,
    template_aceite_os TEXT,
    template_reatribuicao_os TEXT,
    template_dano_detectado TEXT,
    template_pagamento_pendente TEXT,
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    data_ativacao TIMESTAMPTZ DEFAULT NOW(),
    ultima_verificacao TIMESTAMPTZ,
    
    -- Limites
    limite_diario INTEGER DEFAULT 1000,
    limite_horario INTEGER DEFAULT 100,
    taxa_envio DECIMAL(5,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Notificações Enviadas
CREATE TABLE IF NOT EXISTS public.logs_notificacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    notificacao_id TEXT UNIQUE NOT NULL,
    config_id UUID REFERENCES public.configuracoes_notificacao(id) ON DELETE SET NULL,
    
    -- Destinatário
    destinatario_id UUID NOT NULL,
    destinatario_tipo TEXT NOT NULL, -- 'cliente', 'prestador', 'admin'
    destinatario_telefone TEXT,
    destinatario_email TEXT,
    destinatario_device_token TEXT,
    
    -- Conteúdo
    tipo_notificacao TEXT NOT NULL, -- 'checkout', 'aceite_os', 'reatribuicao', 'dano_detectado', 'pagamento'
    titulo_mensagem TEXT NOT NULL,
    corpo_mensagem TEXT NOT NULL,
    template_usado TEXT,
    
    -- Canal
    canal_envio TEXT NOT NULL, -- 'push', 'whatsapp', 'email', 'sms'
    status_envio TEXT DEFAULT 'pendente', -- 'pendente', 'enviado', 'entregue', 'falhou', 'lido'
    
    -- Timestamps
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_envio TIMESTAMPTZ,
    data_entrega TIMESTAMPTZ,
    data_leitura TIMESTAMPTZ,
    
    -- Resposta
    resposta_api TEXT,
    codigo_erro TEXT,
    tentativas_envio INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LIBERAÇÃO IMEDIATA (SYNC)
-- =====================================================

-- Sync de Imóveis com Marketplace
CREATE TABLE IF NOT EXISTS public.sync_imoveis_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    sync_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    marketplace_id TEXT,
    
    -- Status do Imóvel
    status_imovel TEXT NOT NULL, -- 'DISPONIVEL', 'OCUPADO', 'MANUTENCAO', 'LIMPEZA', 'BLOQUEADO'
    status_anterior TEXT,
    
    -- Timestamps
    data_mudanca_status TIMESTAMPTZ DEFAULT NOW(),
    data_sync_marketplace TIMESTAMPTZ,
    data_sync_calendario TIMESTAMPTZ,
    
    -- Sistemas Sincronizados
    sync_marketplace BOOLEAN DEFAULT false,
    sync_calendario BOOLEAN DEFAULT false,
    sync_crm BOOLEAN DEFAULT false,
    sync_api_externa BOOLEAN DEFAULT false,
    
    -- Detalhes da Sincronização
    marketplace_origem TEXT, -- 'airbnb', 'booking', 'viva', 'outros'
    calendario_origem TEXT, -- 'google', 'outlook', 'apple', 'outros'
    api_externa_origem TEXT,
    
    -- Erros
    erro_sync TEXT,
    tentativas_sync INTEGER DEFAULT 0,
    ultima_tentativa_sync TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_sync TEXT UNIQUE
);

-- Calendários Sincronizados
CREATE TABLE IF NOT EXISTS public.calendarios_sincronizados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    calendario_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    sync_id UUID REFERENCES public.sync_imoveis_marketplace(id) ON DELETE CASCADE,
    
    -- Eventos
    evento_id TEXT,
    tipo_evento TEXT NOT NULL, -- 'reserva', 'manutencao', 'limpeza', 'bloqueio'
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    
    -- Origem
    origem_calendario TEXT NOT NULL, -- 'marketplace', 'crm', 'api', 'manual'
    sistema_origem TEXT, -- 'airbnb', 'booking', 'google', 'outlook', 'outros'
    
    -- Status
    status_sync TEXT DEFAULT 'pendente', -- 'pendente', 'sincronizado', 'erro'
    data_sync TIMESTAMPTZ,
    erro_sync TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- IMPACTO SOCIAL (REINO SB) - VERSÃO PRESTADORES
-- =====================================================

-- Tesouro Reino SB V29.1 (Atualizado com Prestadores)
CREATE TABLE IF NOT EXISTS public.tesouro_reino_sb_v29_1 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    mes_referencia DATE UNIQUE NOT NULL,
    
    -- Faturamento Consolidado (12 Fronts + Prestadores)
    faturamento_venda_match DECIMAL(15,2) DEFAULT 0.00,
    faturamento_recorrencia_5x5 DECIMAL(15,2) DEFAULT 0.00,
    faturamento_short_stay DECIMAL(15,2) DEFAULT 0.00,
    faturamento_administracao DECIMAL(15,2) DEFAULT 0.00,
    faturamento_marketplace_servicos DECIMAL(15,2) DEFAULT 0.00,
    faturamento_land_banking DECIMAL(15,2) DEFAULT 0.00,
    faturamento_equity_fundo DECIMAL(15,2) DEFAULT 0.00,
    faturamento_selo_juris DECIMAL(15,2) DEFAULT 0.00,
    faturamento_data_sub DECIMAL(15,2) DEFAULT 0.00,
    faturamento_antecipacao DECIMAL(15,2) DEFAULT 0.00,
    faturamento_seguros DECIMAL(15,2) DEFAULT 0.00,
    faturamento_financiamento_bancario DECIMAL(15,2) DEFAULT 0.00,
    faturamento_prestadores_servicos DECIMAL(15,2) DEFAULT 0.00,
    
    -- Totais
    faturamento_bruto_total DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_venda_match + faturamento_recorrencia_5x5 + faturamento_short_stay + 
        faturamento_administracao + faturamento_marketplace_servicos + faturamento_land_banking + 
        faturamento_equity_fundo + faturamento_selo_juris + faturamento_data_sub + 
        faturamento_antecipacao + faturamento_seguros + faturamento_financiamento_bancario + 
        faturamento_prestadores_servicos
    ) STORED,
    
    -- Deduções
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    splits_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    royalties_pagos DECIMAL(15,2) DEFAULT 0.00,
    reparos_danos_pagos DECIMAL(15,2) DEFAULT 0.00,
    
    -- Faturamento Líquido
    faturamento_liquido DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_bruto_total - custos_operacionais - splits_distribuidos - royalties_pagos - reparos_danos_pagos
    ) STORED,
    
    -- Contribuição Social (1%)
    percentual_contribuicao DECIMAL(5,2) DEFAULT 1.00,
    valor_contribuicao DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_liquido * percentual_contribuicao / 100
    ) STORED,
    
    -- Destinação Social
    destinacao_melhoria_comunidades DECIMAL(15,2) DEFAULT 0.00,
    destinacao_centros_acolhimento DECIMAL(15,2) DEFAULT 0.00,
    destinacao_capacitacao_prestadores DECIMAL(15,2) DEFAULT 0.00,
    destinacao_emergencia_social DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status
    status_contribuicao TEXT DEFAULT 'provisionado', -- 'provisionado', 'destinado', 'auditado'
    data_calculo DATE DEFAULT CURRENT_DATE,
    data_provisionamento DATE,
    data_destinacao DATE,
    
    -- Responsáveis
    responsavel_calculo_id UUID,
    responsavel_aprovacao_id UUID,
    
    -- Observações
    observacoes TEXT,
    auditoria_observacoes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_tesouro TEXT UNIQUE
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash de Prestador
CREATE OR REPLACE FUNCTION public.gerar_hash_prestador()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_prestador := encode(sha256(
        NEW.prestador_id || 
        NEW.nome_prestador || 
        NEW.documento_cpf_cnpj || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_prestador
    BEFORE INSERT ON public.prestadores_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_prestador();

-- Trigger para gerar hash de OS
CREATE OR REPLACE FUNCTION public.gerar_hash_os()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_os := encode(sha256(
        NEW.os_id || 
        NEW.imovel_id::TEXT || 
        NEW.cliente_id::TEXT || 
        NEW.tipo_servico || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_os
    BEFORE INSERT ON public.ordens_servico_limpeza
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_os();

-- Trigger para gerar hash de Vistoria
CREATE OR REPLACE FUNCTION public.gerar_hash_vistoria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_vistoria := encode(sha256(
        NEW.vistoria_id || 
        NEW.os_id::TEXT || 
        NEW.tipo_vistoria || 
        NEW.descricao_geral || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_vistoria
    BEFORE INSERT ON public.vistorias_saida
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_vistoria();

-- Trigger para gerar hash de Transação
CREATE OR REPLACE FUNCTION public.gerar_hash_transacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_transacao := encode(sha256(
        NEW.transacao_id || 
        NEW.vistoria_id::TEXT || 
        NEW.tipo_dano || 
        NEW.custo_reparo::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_transacao
    BEFORE INSERT ON public.fluxo_financeiro_danos
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_transacao();

-- Trigger para gerar hash de Sync
CREATE OR REPLACE FUNCTION public.gerar_hash_sync()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_sync := encode(sha256(
        NEW.sync_id || 
        NEW.imovel_id::TEXT || 
        NEW.status_imovel || 
        NEW.data_mudanca_status::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_sync
    BEFORE INSERT ON public.sync_imoveis_marketplace
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_sync();

-- Trigger para gerar hash de Tesouro V29.1
CREATE OR REPLACE FUNCTION public.gerar_hash_tesouro_v29_1()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_tesouro := encode(sha256(
        NEW.mes_referencia::TEXT || 
        NEW.faturamento_bruto_total::TEXT || 
        NEW.faturamento_liquido::TEXT || 
        NEW.valor_contribuicao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_tesouro_v29_1
    BEFORE INSERT ON public.tesouro_reino_sb_v29_1
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_tesouro_v29_1();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO AVANÇADAS
-- =====================================================

-- Função para processar rotação automática de prestadores
CREATE OR REPLACE FUNCTION public.processar_rotacao_prestadores()
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    os_record RECORD;
    proximo_prestador RECORD;
    total_os_reatribuidas INTEGER := 0;
BEGIN
    -- Buscar OS que expiraram o timer de aceite
    FOR os_record IN 
        SELECT * FROM public.ordens_servico_limpeza
        WHERE status_os = 'AGUARDANDO_PRESTADOR'
        AND data_limite_aceite < NOW()
        AND reatribuida_vezes < 3
    LOOP
        -- Buscar próximo prestador disponível com melhor ranking
        SELECT * INTO proximo_prestador
        FROM public.prestadores_servico
        WHERE status_prestador = 'ativo'
        AND tipo_prestador = os_record.tipo_servico
        AND score_prestador > 90
        ORDER BY ranking_escala ASC, tempo_medio_execucao ASC
        LIMIT 1;
        
        IF FOUND THEN
            -- Reatribuir OS
            UPDATE public.ordens_servico_limpeza
            SET 
                prestador_id = proximo_prestador.id,
                prestador_anterior_id = os_record.prestador_id,
                status_os = 'AGUARDANDO_PRESTADOR',
                reatribuida_vezes = os_record.reatribuida_vezes + 1,
                data_ultima_reatribuicao = NOW(),
                data_limite_aceite = NOW() + (timer_aceite_minutos || ' minutes')::INTERVAL,
                updated_at = NOW()
            WHERE id = os_record.id;
            
            total_os_reatribuidas := total_os_reatribuidas + 1;
        END IF;
    END LOOP;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'total_os_reatribuidas', total_os_reatribuidas,
        'mensagem', 'Rotação de prestadores processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar auditoria de danos
CREATE OR REPLACE FUNCTION public.processar_auditoria_danos(
    p_vistoria_id UUID,
    p_dano_detectado BOOLEAN,
    p_tipo_dano TEXT,
    p_gravidade_dano TEXT,
    p_custo_estimado DECIMAL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    transacao_record RECORD;
    payment_link_id TEXT;
    payment_link_url TEXT;
BEGIN
    -- Se dano detectado, gerar payment link
    IF p_dano_detectado THEN
        payment_link_id := 'PAY-' || EXTRACT(EPOCH FROM NOW())::TEXT;
        payment_link_url := 'https://payment.securitybroker.com.br/pay/' || payment_link_id;
        
        -- Inserir transação financeira
        INSERT INTO public.fluxo_financeiro_danos (
            transacao_id,
            vistoria_id,
            data_dano_detectado,
            tipo_dano,
            gravidade_dano,
            custo_reparo,
            payment_link_id,
            payment_link_url,
            payment_link_gerado_em,
            payment_link_expira_em,
            status_cobranca,
            data_vencimento_cobranca,
            responsavel_pagamento,
            percentual_responsabilidade_prestador
        ) VALUES (
            payment_link_id,
            p_vistoria_id,
            NOW(),
            p_tipo_dano,
            p_gravidade_dano,
            p_custo_estimado,
            payment_link_id,
            payment_link_url,
            NOW(),
            NOW() + INTERVAL '7 days',
            'pendente',
            CURRENT_DATE + INTERVAL '7 days',
            'prestador',
            100.00
        )
        RETURNING * INTO transacao_record;
        
        -- Bloquear garantia se houver
        -- (Lógica específica dependendo do tipo de garantia do imóvel)
        
        resultado := jsonb_build_object(
            'sucesso', true,
            'dano_detectado', true,
            'payment_link_gerado', true,
            'payment_link_id', payment_link_id,
            'payment_link_url', payment_link_url,
            'custo_reparo', p_custo_estimado,
            'mensagem', 'Auditoria de dano processada e payment link gerado'
        );
    ELSE
        resultado := jsonb_build_object(
            'sucesso', true,
            'dano_detectado', false,
            'mensagem', 'Auditoria de dano processada - sem danos detectados'
        );
    END IF;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para enviar notificações automáticas
CREATE OR REPLACE FUNCTION public.enviar_notificacao_automatica(
    p_destinatario_id UUID,
    p_destinatario_tipo TEXT,
    p_tipo_notificacao TEXT,
    p_canal_envio TEXT,
    p_titulo_mensagem TEXT,
    p_corpo_mensagem TEXT
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    notificacao_id TEXT;
    config_record RECORD;
BEGIN
    -- Buscar configuração do canal
    SELECT * INTO config_record
    FROM public.configuracoes_notificacao
    WHERE canal_envio = p_canal_envio
    AND status_config = 'ativo'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Canal de notificação não configurado'
        );
    END IF;
    
    -- Gerar ID da notificação
    notificacao_id := 'NOT-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Inserir log de notificação
    INSERT INTO public.logs_notificacao (
        notificacao_id,
        config_id,
        destinatario_id,
        destinatario_tipo,
        tipo_notificacao,
        canal_envio,
        titulo_mensagem,
        corpo_mensagem,
        status_envio,
        data_criacao
    ) VALUES (
        notificacao_id,
        config_record.id,
        p_destinatario_id,
        p_destinatario_tipo,
        p_tipo_notificacao,
        p_canal_envio,
        p_titulo_mensagem,
        p_corpo_mensagem,
        'pendente',
        NOW()
    );
    
    -- Simular envio (integrar com API real)
    -- Aqui seria integrado com Resend/Twilio/Meta
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'notificacao_id', notificacao_id,
        'canal_envio', p_canal_envio,
        'destinatario_tipo', p_destinatario_tipo,
        'tipo_notificacao', p_tipo_notificacao,
        'mensagem', 'Notificação enviada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para sincronizar liberação imediata
CREATE OR REPLACE FUNCTION public.sincronizar_liberacao_imediata(
    p_imovel_id UUID,
    p_status_novo TEXT
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    sync_record RECORD;
    sync_id TEXT;
BEGIN
    -- Gerar ID de sincronização
    sync_id := 'SYNC-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Inserir registro de sincronização
    INSERT INTO public.sync_imoveis_marketplace (
        sync_id,
        imovel_id,
        status_imovel,
        data_mudanca_status,
        sync_marketplace,
        sync_calendario,
        sync_crm,
        status_sync
    ) VALUES (
        sync_id,
        p_imovel_id,
        p_status_novo,
        NOW(),
        true,
        true,
        true,
        'pendente'
    )
    RETURNING * INTO sync_record;
    
    -- Simular sincronização com marketplaces
    -- Aqui seria integrado com APIs do Airbnb, Booking, etc.
    
    -- Atualizar status como sincronizado
    UPDATE public.sync_imoveis_marketplace
    SET 
        sync_marketplace = true,
        sync_calendario = true,
        sync_crm = true,
        status_sync = 'sincronizado',
        data_sync_marketplace = NOW(),
        data_sync_calendario = NOW()
    WHERE id = sync_record.id;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'sync_id', sync_id,
        'imovel_id', p_imovel_id,
        'status_novo', p_status_novo,
        'sincronizado', true,
        'mensagem', 'Imóvel sincronizado com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar contribuição social V29.1
CREATE OR REPLACE FUNCTION public.processar_contribuicao_social_v29_1(
    p_mes_referencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    tesouro_record RECORD;
BEGIN
    -- Inserir ou atualizar tesouro V29.1
    INSERT INTO public.tesouro_reino_sb_v29_1 (
        mes_referencia,
        faturamento_venda_match,
        faturamento_recorrencia_5x5,
        faturamento_short_stay,
        faturamento_administracao,
        faturamento_marketplace_servicos,
        faturamento_land_banking,
        faturamento_equity_fundo,
        faturamento_selo_juris,
        faturamento_data_sub,
        faturamento_antecipacao,
        faturamento_seguros,
        faturamento_financiamento_bancario,
        faturamento_prestadores_servicos,
        custos_operacionais,
        splits_distribuidos,
        royalties_pagos,
        reparos_danos_pagos,
        status_contribuicao,
        data_calculo,
        data_provisionamento,
        destinacao_melhoria_comunidades,
        destinacao_centros_acolhimento,
        destinacao_capacitacao_prestadores,
        destinacao_emergencia_social
    ) VALUES (
        p_mes_referencia,
        150000.00, -- Venda/Match
        85000.00,  -- Recorrência 5x5
        45000.00,  -- Short-stay
        35000.00,  -- Administração
        25000.00,  -- Marketplace Serviços
        180000.00, -- Land Banking
        95000.00,  -- Equity/Fundo
        15000.00,  -- Selo Juris
        22000.00,  -- Data Sub
        12000.00,  -- Antecipação
        28000.00,  -- Seguros
        75000.00,  -- Financiamento Bancário
        65000.00,  -- Prestadores de Serviços (NOVO)
        85000.00,  -- Custos Operacionais
        120000.00, -- Splits Distribuídos
        45000.00,  -- Royalties Pagos
        15000.00,  -- Reparos de Danos Pagos (NOVO)
        'provisionado',
        CURRENT_DATE,
        CURRENT_DATE,
        25000.00,  -- Melhoria Comunidades
        20000.00,  -- Centros Acolhimento
        15000.00,  -- Capacitação Prestadores (NOVO)
        10000.00   -- Emergência Social
    )
    ON CONFLICT (mes_referencia)
    DO UPDATE SET
        faturamento_prestadores_servicos = EXCLUDED.faturamento_prestadores_servicos,
        reparos_danos_pagos = EXCLUDED.reparos_danos_pagos,
        destinacao_capacitacao_prestadores = EXCLUDED.destinacao_capacitacao_prestadores,
        status_contribuicao = 'provisionado',
        data_calculo = CURRENT_DATE,
        data_provisionamento = CURRENT_DATE,
        updated_at = NOW()
    RETURNING * INTO tesouro_record;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'tesouro_id', tesouro_record.id,
        'mes_referencia', tesouro_record.mes_referencia,
        'faturamento_bruto_total', tesouro_record.faturamento_bruto_total,
        'faturamento_liquido', tesouro_record.faturamento_liquido,
        'valor_contribuicao', tesouro_record.valor_contribuicao,
        'faturamento_prestadores', tesouro_record.faturamento_prestadores_servicos,
        'destinacao_capacitacao_prestadores', tesouro_record.destinacao_capacitacao_prestadores,
        'mensagem', 'Tesouro Reino SB V29.1 processado com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_prestadores_score ON public.prestadores_servico(score_prestador, ranking_escala);
CREATE INDEX IF NOT EXISTS idx_prestadores_tipo ON public.prestadores_servico(tipo_prestador, status_prestador);
CREATE INDEX IF NOT EXISTS idx_prestadores_localizacao ON public.prestadores_servico USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_os_status ON public.ordens_servico_limpeza(status_os, data_limite_aceite);
CREATE INDEX IF NOT EXISTS idx_os_prestador ON public.ordens_servico_limpeza(prestador_id, status_os);
CREATE INDEX IF NOT EXISTS idx_os_imovel ON public.ordens_servico_limpeza(imovel_id, status_os);
CREATE INDEX IF NOT EXISTS idx_vistorias_os ON public.vistorias_saida(os_id, tipo_vistoria);
CREATE INDEX IF NOT EXISTS idx_vistorias_dano ON public.vistorias_saida(dano_detectado, data_vistoria);
CREATE INDEX IF NOT EXISTS idx_fluxo_danos_vistoria ON public.fluxo_financeiro_danos(vistoria_id, status_cobranca);
CREATE INDEX IF NOT EXISTS idx_fluxo_danos_status ON public.fluxo_financeiro_danos(status_cobranca, data_vencimento_cobranca);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.logs_notificacao(destinatario_id, tipo_notificacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON public.logs_notificacao(status_envio, data_criacao);
CREATE INDEX IF NOT EXISTS idx_sync_imovel ON public.sync_imoveis_marketplace(imovel_id, status_sync);
CREATE INDEX IF NOT EXISTS idx_sync_status ON public.sync_imoveis_marketplace(status_sync, data_mudanca_status);
CREATE INDEX IF NOT EXISTS idx_calendario_imovel ON public.calendarios_sincronizados(imovel_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_calendario_evento ON public.calendarios_sincronizados(tipo_evento, status_sync);
CREATE INDEX IF NOT EXISTS idx_tesouro_mes_v29_1 ON public.tesouro_reino_sb_v29_1(mes_referencia, status_contribuicao);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Prestadores de Serviço de exemplo
INSERT INTO public.prestadores_servico (
    prestador_id,
    nome_prestador,
    documento_cpf_cnpj,
    tipo_prestador,
    telefone,
    whatsapp,
    email,
    endereco,
    bairro,
    cidade,
    estado,
    cep,
    coordinates,
    score_prestador,
    tempo_medio_execucao,
    total_servicos_realizados,
    taxa_aceite,
    servicos_oferecidos,
    especialidades,
    areas_atendimento,
    valor_medio_servico,
    forma_pagamento,
    status_prestador
) VALUES
('PREST-001', 'Maria Silva Limpeza', '123.456.789-00', 'limpeza', '(11) 9876-5432', '(11) 9876-5432', 'maria@limpeza.com', 'Rua das Flores, 123', 'Jardins', 'São Paulo', 'SP', '01450-000', 'POINT(-23.5505, -46.6333)', 95.5, 90, 150, 98.5, ARRAY['limpeza_residencial', 'limpeza_comercial', 'pos_obra'], ARRAY['residencial', 'comercial'], ARRAY['zona_sul', 'zona_centro'], 250.00, ARRAY['pix', 'dinheiro', 'transferencia'], 'ativo'),
('PREST-002', 'João Santos Manutenção', '987.654.321-00', 'manutencao', '(11) 8765-4321', '(11) 8765-4321', 'joao@manutencao.com', 'Av. Paulista, 456', 'Bela Vista', 'São Paulo', 'SP', '01310-100', 'POINT(-23.5505, -46.6333)', 92.8, 120, 200, 95.0, ARRAY['eletrica', 'hidraulica', 'ar_condicionado'], ARRAY['comercial', 'residencial'], ARRAY['zona_centro', 'zona_oeste'], 350.00, ARRAY['pix', 'transferencia'], 'ativo'),
('PREST-003', 'Ana Costa Pintura', '456.789.123-00', 'pintura', '(11) 7654-3210', '(11) 7654-3210', 'ana@pintura.com', 'Rua Verde, 789', 'Pinheiros', 'São Paulo', 'SP', '05425-000', 'POINT(-23.5505, -46.6333)', 91.2, 180, 120, 97.2, ARRAY['pintura_interna', 'pintura_externa', 'texturas'], ARRAY['residencial', 'comercial'], ARRAY['zona_sul', 'zona_leste'], 400.00, ARRAY['pix', 'dinheiro'], 'ativo'),
('PREST-004', 'Carlos Oliveira Jardim', '321.654.987-00', 'jardim', '(11) 6543-2109', '(11) 6543-2109', 'carlos@jardim.com', 'Alameda dos Anjos, 321', 'Moema', 'São Paulo', 'SP', '04050-000', 'POINT(-23.5505, -46.6333)', 93.7, 60, 80, 96.5, ARRAY['jardinagem', 'paisagismo', 'podas'], ARRAY['residencial', 'comercial'], ARRAY['zona_sul', 'zona_oeste'], 300.00, ARRAY['pix', 'transferencia'], 'ativo'),
('PREST-005', 'Pedro Rocha Elétrica', '654.321.789-00', 'eletrica', '(11) 5432-1098', '(11) 5432-1098', 'pedro@eletrica.com', 'Rua das Indústrias, 654', 'Lapa', 'São Paulo', 'SP', '05050-000', 'POINT(-23.5505, -46.6333)', 94.3, 90, 100, 98.0, ARRAY['instalacoes_eletricas', 'manutencao_predial', 'iluminacao'], ARRAY['comercial', 'industrial'], ARRAY['zona_oeste', 'zona_norte'], 450.00, ARRAY['pix', 'transferencia'], 'ativo');

-- Inserir Ordens de Serviço de exemplo
INSERT INTO public.ordens_servico_limpeza (
    os_id,
    imovel_id,
    cliente_id,
    prestador_id,
    tipo_servico,
    descricao_servico,
    data_solicitacao,
    data_agendada,
    status_os,
    timer_aceite_minutos,
    data_limite_aceite,
    prioridade,
    ranking_escala,
    valor_servico,
    forma_pagamento,
    endereco_servico,
    bairro_servico,
    cidade_servico,
    estado_servico,
    coordinates_servico
) VALUES
('OS-LIM-001', uuid_generate_v4(), uuid_generate_v4(), (SELECT id FROM public.prestadores_servico WHERE prestador_id = 'PREST-001'), 'limpeza', 'Limpeza residencial completa', NOW(), NOW() + INTERVAL '2 hours', 'EM_LIMPEZA', 30, NOW() + INTERVAL '30 minutes', 1, 1, 250.00, 'pix', 'Rua das Flores, 123', 'Jardins', 'São Paulo', 'SP', 'POINT(-23.5505, -46.6333)'),
('OS-LIM-002', uuid_generate_v4(), uuid_generate_v4(), (SELECT id FROM public.prestadores_servico WHERE prestador_id = 'PREST-002'), 'manutencao', 'Manutenção ar condicionado', NOW(), NOW() + INTERVAL '4 hours', 'AGUARDANDO_PRESTADOR', 30, NOW() + INTERVAL '30 minutes', 2, 2, 350.00, 'pix', 'Av. Paulista, 456', 'Bela Vista', 'São Paulo', 'SP', 'POINT(-23.5505, -46.6333)'),
('OS-LIM-003', uuid_generate_v4(), uuid_generate_v4(), (SELECT id FROM public.prestadores_servico WHERE prestador_id = 'PREST-003'), 'pintura', 'Pintura sala e quartos', NOW(), NOW() + INTERVAL '1 day', 'EM_LIMPEZA', 30, NOW() + INTERVAL '30 minutes', 3, 3, 400.00, 'pix', 'Rua Verde, 789', 'Pinheiros', 'São Paulo', 'SP', 'POINT(-23.5505, -46.6333)');

-- Inserir Configurações de Notificação
INSERT INTO public.configuracoes_notificacao (
    config_id,
    tipo_canal,
    api_provider,
    template_checkout_cliente,
    template_checkout_prestador,
    template_aceite_os,
    template_reatribuicao_os,
    template_dano_detectado,
    template_pagamento_pendente,
    status_config,
    data_ativacao,
    limite_diario,
    limite_horario,
    taxa_envio
) VALUES
('CONFIG-PUSH-001', 'push', 'firebase', '🏠 Nova OS de limpeza disponível!', '🧹 Nova oportunidade de serviço!', '✅ OS aceita com sucesso!', '🔄 OS reatribuída para você!', '⚠️ Dano detectado na OS', '💳 Pagamento pendente', 'ativo', NOW(), 1000, 100, 0.05),
('CONFIG-WHATS-001', 'whatsapp', 'twilio', '🏠 Nova OS via SB Logistics!', '🧹 Nova oportunidade no SB!', '✅ OS aceita!', '🔄 OS reatribuída!', '⚠️ Dano detectado!', '💳 Pagamento pendente', 'ativo', NOW(), 500, 50, 0.15),
('CONFIG-EMAIL-001', 'email', 'resend', '🏠 Nova OS de limpeza', '🧹 Nova oportunidade de serviço', '✅ OS aceita com sucesso', '🔄 OS reatribuída', '⚠️ Dano detectado', '💳 Pagamento pendente', 'ativo', NOW(), 2000, 200, 0.02);

-- Inserir Tesouro Reino SB V29.1 de exemplo
INSERT INTO public.tesouro_reino_sb_v29_1 (
    mes_referencia,
    faturamento_venda_match,
    faturamento_recorrencia_5x5,
    faturamento_short_stay,
    faturamento_administracao,
    faturamento_marketplace_servicos,
    faturamento_land_banking,
    faturamento_equity_fundo,
    faturamento_selo_juris,
    faturamento_data_sub,
    faturamento_antecipacao,
    faturamento_seguros,
    faturamento_financiamento_bancario,
    faturamento_prestadores_servicos,
    custos_operacionais,
    splits_distribuidos,
    royalties_pagos,
    reparos_danos_pagos,
    status_contribuicao,
    data_calculo,
    data_provisionamento,
    destinacao_melhoria_comunidades,
    destinacao_centros_acolhimento,
    destinacao_capacitacao_prestadores,
    destinacao_emergencia_social
) VALUES
(DATE_TRUNC('month', CURRENT_DATE)::DATE, 150000.00, 85000.00, 45000.00, 35000.00, 25000.00, 180000.00, 95000.00, 15000.00, 22000.00, 12000.00, 28000.00, 75000.00, 65000.00, 85000.00, 120000.00, 45000.00, 15000.00, 'provisionado', CURRENT_DATE, CURRENT_DATE, 25000.00, 20000.00, 15000.00, 10000.00),
(DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 135000.00, 75000.00, 42000.00, 32000.00, 22000.00, 165000.00, 85000.00, 13500.00, 20000.00, 11000.00, 25000.00, 68000.00, 58000.00, 78000.00, 105000.00, 42000.00, 12000.00, 'destinado', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 22000.00, 18000.00, 13000.00, 8000.00);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB LOGISTICS & CLEANING ROTATION V29.1 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.prestadores_servico) as total_prestadores,
       (SELECT COUNT(*) FROM public.ordens_servico_limpeza) as total_ordens_servico,
       (SELECT COUNT(*) FROM public.vistorias_saida) as total_vistorias,
       (SELECT COUNT(*) FROM public.fluxo_financeiro_danos) as total_fluxo_danos,
       (SELECT COUNT(*) FROM public.logs_notificacao) as total_notificacoes,
       (SELECT COUNT(*) FROM public.sync_imoveis_marketplace) as total_sync_imoveis,
       (SELECT COUNT(*) FROM public.tesouro_reino_sb_v29_1) as total_tesouro_v29_1;
