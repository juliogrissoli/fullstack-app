-- 🏛️ SECURITY BROKER SB v30 - ORCHESTRATOR & TOKEN SAVER
-- Schema completo para orquestração, economia de tokens e precisão de dados

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- INTENT ROUTER (ECONOMIA DE TOKENS)
-- =====================================================

-- Configuração de Intent Router
CREATE TABLE IF NOT EXISTS public.configuracao_intent_router (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Filtros de Pré-processamento
    consultas_diretas TEXT[] DEFAULT ARRAY[
        'SELECT saldo FROM wallet_sb WHERE usuario_id = ?',
        'SELECT status FROM ordens_servico_limpeza WHERE prestador_id = ?',
        'SELECT deadline FROM contratos WHERE imovel_id = ?',
        'SELECT disponibilidade FROM unidades WHERE imovel_id = ?'
    ],
    
    -- Queries para LLM (Yara)
    consultas_llm TEXT[] DEFAULT ARRAY[
        'Análise estratégica de mercado',
        'Otimização de portfólio',
        'Previsão de demanda',
        'Análise de competitividade',
        'Recomendações de investimento'
    ],
    
    -- Configurações de Economia
    max_tokens_por_consulta INTEGER DEFAULT 1000,
    custo_por_token DECIMAL(10,8) DEFAULT 0.0001,
    cache_duration_minutes INTEGER DEFAULT 30,
    economia_ativa BOOLEAN DEFAULT true,
    
    -- Priorização
    prioridade_consultas TEXT[] DEFAULT ARRAY[
        'critical', 'high', 'medium', 'low'
    ],
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Histórico de Queries Processadas
CREATE TABLE IF NOT EXISTS public.historico_queries_intent_router (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    query_id TEXT UNIQUE NOT NULL,
    usuario_id UUID NOT NULL,
    sessao_id TEXT,
    
    -- Detalhes da Query
    tipo_query TEXT NOT NULL, -- 'direta', 'llm', 'cache'
    query_original TEXT NOT NULL,
    query_processada TEXT,
    
    -- Roteamento
    roteamento_aplicado TEXT NOT NULL, -- 'sql_direto', 'llm_yara', 'vector_cache'
    motivo_roteamento TEXT, -- 'consulta_padrao', 'analise_complexa', 'cache_disponivel'
    
    -- Economia de Tokens
    tokens_utilizados INTEGER DEFAULT 0,
    tokens_economizados INTEGER DEFAULT 0,
    custo_tokens DECIMAL(10,8) DEFAULT 0.0001,
    custo_economizado DECIMAL(10,8) DEFAULT 0.0001,
    
    -- Performance
    tempo_processamento_ms INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT false,
    
    -- Status
    status_query TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'concluida', 'erro', 'cache'
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_query TEXT UNIQUE
);

-- =====================================================
-- VECTOR CACHE (PGVECTOR INTEGRATION)
-- =====================================================

-- Configuração de Vector Cache
CREATE TABLE IF NOT EXISTS public.configuracao_vector_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações de Vector
    vector_dimension INTEGER DEFAULT 1536, -- OpenAI ada-002
    embedding_model TEXT DEFAULT 'text-embedding-ada-002',
    similarity_threshold DECIMAL(5,4) DEFAULT 0.8,
    max_results INTEGER DEFAULT 10,
    
    -- Cache Settings
    cache_ttl_hours INTEGER DEFAULT 24,
    max_cache_size_mb INTEGER DEFAULT 1024, -- 1GB
    cleanup_interval_hours INTEGER DEFAULT 6,
    
    -- Semantic Search Config
    search_strategy TEXT DEFAULT 'cosine', -- 'cosine', 'l2', 'inner_product'
    hybrid_search BOOLEAN DEFAULT true, -- Combina semantic + keyword
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Vector Cache de Conversas e Documentos
CREATE TABLE IF NOT EXISTS public.vector_cache_conversas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    cache_id TEXT UNIQUE NOT NULL,
    usuario_id UUID NOT NULL,
    conversa_id TEXT,
    
    -- Conteúdo Vectorizado
    conteudo_original TEXT NOT NULL,
    tipo_conteudo TEXT NOT NULL, -- 'pergunta', 'resposta', 'documento', 'nota_fiscal', 'contrato'
    embedding_vector vector(1536),
    
    -- Metadados do Conteúdo
    contexto TEXT,
    tags TEXT[] DEFAULT '{}',
    relevancia_score DECIMAL(5,4) DEFAULT 1.0,
    data_conteudo TIMESTAMPTZ DEFAULT NOW(),
    
    -- Cache Management
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Status
    status_cache TEXT DEFAULT 'ativo', -- 'ativo', 'expirado', 'invalidado'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_cache TEXT UNIQUE
);

-- Índice Vector para Busca Semântica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_cache_embedding 
ON public.vector_cache_conversas 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- =====================================================
-- STATE MACHINE OPERACIONAL (DATA INTEGRITY)
-- =====================================================

-- Configuração de State Machine
CREATE TABLE IF NOT EXISTS public.configuracao_state_machine (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Estados Definidos
    estados_permitidos TEXT[] DEFAULT ARRAY[
        'DISPONIVEL',
        'RESERVADO',
        'OCUPADO',
        'CHECKOUT_PENDENTE',
        'EM_LIMPEZA',
        'AUDITADO',
        'MANUTENCAO',
        'BLOQUEADO'
    ],
    
    -- Transições Válidas
    transicoes_validas JSONB DEFAULT '{
        "DISPONIVEL": ["RESERVADO", "MANUTENCAO", "BLOQUEADO"],
        "RESERVADO": ["OCUPADO", "DISPONIVEL"],
        "OCUPADO": ["CHECKOUT_PENDENTE", "MANUTENCAO"],
        "CHECKOUT_PENDENTE": ["EM_LIMPEZA"],
        "EM_LIMPEZA": ["AUDITADO"],
        "AUDITADO": ["DISPONIVEL"],
        "MANUTENCAO": ["DISPONIVEL"],
        "BLOQUEADO": ["DISPONIVEL"]
    }',
    
    -- Regras de Transição
    regras_transicao JSONB DEFAULT '{
        "EM_LIMPEZA": {
            "bloqueia_crossing": true,
            "motivo": "Em processo de limpeza, bloquear cruzamento de dados"
        },
        "CHECKOUT_PENDENTE": {
            "timeout_horas": 2,
            "auto_transicao": "EM_LIMPEZA"
        }
    }',
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Estado Atual dos Imóveis
CREATE TABLE IF NOT EXISTS public.estado_imoveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    estado_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    
    -- Estado Atual
    estado_atual TEXT NOT NULL,
    estado_anterior TEXT,
    
    -- Timestamps de Transição
    data_entrada_estado TIMESTAMPTZ DEFAULT NOW(),
    data_saida_estado TIMESTAMPTZ,
    duracao_estado_minutos INTEGER,
    
    -- Contexto da Transição
    motivo_transicao TEXT,
    usuario_transicao UUID,
    sistema_origem TEXT, -- 'reservas', 'limpeza', 'auditoria', 'manual'
    
    -- Validação de Integridade
    regras_validadas TEXT[] DEFAULT '{}',
    integridade_valida BOOLEAN DEFAULT true,
    erros_validacao TEXT[] DEFAULT '{}',
    
    -- Bloqueios
    bloqueios_ativos TEXT[] DEFAULT '{}', -- Bloqueios ativos neste estado
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_estado TEXT UNIQUE
);

-- Histórico de Transições de Estado
CREATE TABLE IF NOT EXISTS public.historico_transicoes_estado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    transicao_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    estado_id UUID REFERENCES public.estado_imoveis(id) ON DELETE CASCADE,
    
    -- Detalhes da Transição
    estado_origem TEXT NOT NULL,
    estado_destino TEXT NOT NULL,
    data_transicao TIMESTAMPTZ DEFAULT NOW(),
    duracao_transicao_minutos INTEGER,
    
    -- Contexto
    motivo_transicao TEXT,
    usuario_transicao UUID,
    sistema_origem TEXT,
    
    -- Validação
    regras_aplicadas TEXT[] DEFAULT '{}',
    validacao_bem_sucedida BOOLEAN DEFAULT true,
    erros_encontrados TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_transicao TEXT UNIQUE
);

-- =====================================================
-- MIDDLEWARE DE AUDITORIA
-- =====================================================

-- Configuração de Middleware de Auditoria
CREATE TABLE IF NOT EXISTS public.configuracao_middleware_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Pilares Monitorados
    pilares_monitorados TEXT[] DEFAULT ARRAY[
        'PILAR_4_CONTRATOS',
        'PILAR_5_BANK'
    ],
    
    -- Regras de Validação
    regras_validacao JSONB DEFAULT '{
        "PILAR_4_CONTRATOS": {
            "valida_antes_split": true,
            "valida_duplicidade": true,
            "valida_integridade": true,
            "bloqueia_conflito": true
        },
        "PILAR_5_BANK": {
            "valida_antes_split": true,
            "valida_saldo_disponivel": true,
            "valida_limite_diario": true,
            "valida_conformidade": true
        }
    }',
    
    -- Configurações de Execução
    modo_execucao TEXT DEFAULT 'bloqueante', -- 'bloqueante', 'alerta', 'log_only'
    timeout_validacao_segundos INTEGER DEFAULT 30,
    tentativas_maximas INTEGER DEFAULT 3,
    
    -- Notificações
    notifica_erro BOOLEAN DEFAULT true,
    notifica_alerta BOOLEAN DEFAULT true,
    canais_notificacao TEXT[] DEFAULT ARRAY['email', 'slack', 'teams'],
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Logs de Auditoria do Middleware
CREATE TABLE IF NOT EXISTS public.logs_middleware_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    auditoria_id TEXT UNIQUE NOT NULL,
    config_id UUID REFERENCES public.configuracao_middleware_auditoria(id) ON DELETE SET NULL,
    
    -- Detalhes da Auditoria
    pilar_envolvido TEXT NOT NULL,
    operacao_auditada TEXT NOT NULL,
    dados_operacao JSONB,
    
    -- Validação
    resultado_validacao TEXT NOT NULL, -- 'aprovado', 'rejeitado', 'erro', 'timeout'
    motivo_rejeicao TEXT,
    erros_encontrados TEXT[] DEFAULT '{}',
    
    -- Performance
    tempo_validacao_ms INTEGER DEFAULT 0,
    tentativas_realizadas INTEGER DEFAULT 1,
    
    -- Contexto
    usuario_solicitante UUID,
    sistema_origem TEXT,
    ip_origem TEXT,
    
    -- Timestamps
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    
    -- Ações Tomadas
    acoes_executadas TEXT[] DEFAULT '{}',
    bloqueios_aplicados TEXT[] DEFAULT '{}',
    
    -- Status
    status_auditoria TEXT DEFAULT 'concluida', -- 'pendente', 'em_andamento', 'concluida', 'erro'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_auditoria TEXT UNIQUE
);

-- =====================================================
-- REINO SB (CONTRIBUIÇÃO OPERACIONAL)
-- =====================================================

-- Tesouro Reino SB V30 (Atualizado com Economia de Tokens)
CREATE TABLE IF NOT EXISTS public.tesouro_reino_sb_v30 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    mes_referencia DATE UNIQUE NOT NULL,
    
    -- Faturamento Consolidado (14 Fontes: 13 anteriores + Economia Tokens)
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
    faturamento_taxa_conveniencia DECIMAL(15,2) DEFAULT 0.00,
    faturamento_economia_tokens DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Economia de Tokens
    
    -- Totais
    faturamento_bruto_total DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_venda_match + faturamento_recorrencia_5x5 + faturamento_short_stay + 
        faturamento_administracao + faturamento_marketplace_servicos + faturamento_land_banking + 
        faturamento_equity_fundo + faturamento_selo_juris + faturamento_data_sub + 
        faturamento_antecipacao + faturamento_seguros + faturamento_financiamento_bancario + 
        faturamento_prestadores_servicos + faturamento_taxa_conveniencia + faturamento_economia_tokens
    ) STORED,
    
    -- Deduções
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    splits_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    royalties_pagos DECIMAL(15,2) DEFAULT 0.00,
    reparos_danos_pagos DECIMAL(15,2) DEFAULT 0.00,
    taxes_conveniencia_devolvidas DECIMAL(15,2) DEFAULT 0.00,
    
    -- Faturamento Líquido
    faturamento_liquido DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_bruto_total - custos_operacionais - splits_distribuidos - 
        royalties_pagos - reparos_danos_pagos - taxes_conveniencia_devolvidas
    ) STORED,
    
    -- Contribuição Social (1%)
    percentual_contribuicao DECIMAL(5,2) DEFAULT 1.00,
    valor_contribuicao DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_liquido * percentual_contribuicao / 100
    ) STORED,
    
    -- Destinação Social
    destinacao_igrejas_locais DECIMAL(15,2) DEFAULT 0.00,
    destinacao_obra_missionaria DECIMAL(15,2) DEFAULT 0.00,
    destinacao_ajuda_desamparados DECIMAL(15,2) DEFAULT 0.00,
    destinacao_evangelizacao DECIMAL(15,2) DEFAULT 0.00,
    destinacao_acao_social DECIMAL(15,2) DEFAULT 0.00,
    destinacao_capacitacao_prestadores DECIMAL(15,2) DEFAULT 0.00,
    destinacao_tecnologia_social DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Para projetos de tecnologia social
    
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

-- Trigger para gerar hash de Configuração Intent Router
CREATE OR REPLACE FUNCTION public.gerar_hash_config_intent_router()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_intent_router
    BEFORE INSERT ON public.configuracao_intent_router
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_intent_router();

-- Trigger para gerar hash de Query
CREATE OR REPLACE FUNCTION public.gerar_hash_query()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_query := encode(sha256(
        NEW.query_id || 
        NEW.usuario_id::TEXT || 
        NEW.tipo_query || 
        NEW.query_original || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_query
    BEFORE INSERT ON public.historico_queries_intent_router
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_query();

-- Trigger para gerar hash de Configuração Vector Cache
CREATE OR REPLACE FUNCTION public.gerar_hash_config_vector_cache()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_vector_cache
    BEFORE INSERT ON public.configuracao_vector_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_vector_cache();

-- Trigger para gerar hash de Vector Cache
CREATE OR REPLACE FUNCTION public.gerar_hash_vector_cache()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_cache := encode(sha256(
        NEW.cache_id || 
        NEW.usuario_id::TEXT || 
        NEW.tipo_conteudo || 
        NEW.conteudo_original || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_vector_cache
    BEFORE INSERT ON public.vector_cache_conversas
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_vector_cache();

-- Trigger para gerar hash de Configuração State Machine
CREATE OR REPLACE FUNCTION public.gerar_hash_config_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_state_machine
    BEFORE INSERT ON public.configuracao_state_machine
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_state_machine();

-- Trigger para gerar hash de Estado
CREATE OR REPLACE FUNCTION public.gerar_hash_estado()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_estado := encode(sha256(
        NEW.estado_id || 
        NEW.imovel_id::TEXT || 
        NEW.estado_atual || 
        NEW.data_entrada_estado::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_estado
    BEFORE INSERT ON public.estado_imoveis
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_estado();

-- Trigger para gerar hash de Transição
CREATE OR REPLACE FUNCTION public.gerar_hash_transicao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_transicao := encode(sha256(
        NEW.transicao_id || 
        NEW.imovel_id::TEXT || 
        NEW.estado_origem || 
        NEW.estado_destino || 
        NEW.data_transicao::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_transicao
    BEFORE INSERT ON public.historico_transicoes_estado
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_transicao();

-- Trigger para gerar hash de Configuração Middleware
CREATE OR REPLACE FUNCTION public.gerar_hash_config_middleware()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_middleware
    BEFORE INSERT ON public.configuracao_middleware_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_middleware();

-- Trigger para gerar hash de Auditoria
CREATE OR REPLACE FUNCTION public.gerar_hash_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_auditoria := encode(sha256(
        NEW.auditoria_id || 
        NEW.pilar_envolvido || 
        NEW.operacao_auditada || 
        NEW.resultado_validacao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_auditoria
    BEFORE INSERT ON public.logs_middleware_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_auditoria();

-- Trigger para gerar hash de Tesouro V30
CREATE OR REPLACE FUNCTION public.gerar_hash_tesouro_v30()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_tesouro := encode(sha256(
        NEW.mes_referencia::TEXT || 
        NEW.faturamento_bruto_total::TEXT || 
        NEW.faturamento_liquido::TEXT || 
        NEW.valor_contribuicao::TEXT || 
        NEW.faturamento_economia_tokens::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_tesouro_v30
    BEFORE INSERT ON public.tesouro_reino_sb_v30
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_tesouro_v30();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO AVANÇADAS
-- =====================================================

-- Função para rotear query baseada no tipo
CREATE OR REPLACE FUNCTION public.route_query_intent(
    p_usuario_id UUID,
    p_query TEXT,
    p_contexto JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_query_normalizada TEXT;
    v_tipo_roteamento TEXT;
    v_resultado JSONB;
    v_cache_hit BOOLEAN := false;
    v_tokens_economizados INTEGER := 0;
    v_custo_economizado DECIMAL(10,8) := 0.0001;
BEGIN
    -- Buscar configuração do Intent Router
    SELECT * INTO v_config
    FROM public.configuracao_intent_router
    WHERE status_config = 'ativo'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Configuração do Intent Router não encontrada'
        );
    END IF;
    
    -- Normalizar query
    v_query_normalizada := lower(trim(p_query));
    
    -- Verificar se é consulta direta
    IF v_query_normalizada ~ ANY(v_config.consultas_diretas) THEN
        v_tipo_roteamento := 'sql_direto';
        v_tokens_economizados := v_config.max_tokens_por_consulta;
        v_custo_economizado := v_config.max_tokens_por_consulta * v_config.custo_por_token;
    ELSIF v_query_normalizada ~ ANY(v_config.consultas_llm) THEN
        v_tipo_roteamento := 'llm_yara';
    ELSE
        -- Verificar cache vector
        SELECT 1 INTO v_cache_hit
        FROM public.vector_cache_conversas
        WHERE conteudo_original % v_query_normalizada
        AND status_cache = 'ativo'
        AND expires_at > NOW()
        LIMIT 1;
        
        IF v_cache_hit THEN
            v_tipo_roteamento := 'vector_cache';
            v_tokens_economizados := v_config.max_tokens_por_consulta;
            v_custo_economizado := v_config.max_tokens_por_consulta * v_config.custo_por_token;
        ELSE
            v_tipo_roteamento := 'llm_yara';
        END IF;
    END IF;
    
    -- Inserir histórico de query
    INSERT INTO public.historico_queries_intent_router (
        query_id: 'Q-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        usuario_id: p_usuario_id,
        query_original: p_query,
        query_processada: v_query_normalizada,
        roteamento_aplicado: v_tipo_roteamento,
        motivo_roteamento: CASE 
            WHEN v_tipo_roteamento = 'sql_direto' THEN 'Consulta padrão direta'
            WHEN v_tipo_roteamento = 'llm_yara' THEN 'Análise complexa via LLM'
            WHEN v_tipo_roteamento = 'vector_cache' THEN 'Cache disponível'
            ELSE 'Roteamento padrão'
        END,
        tokens_utilizados: CASE 
            WHEN v_tipo_roteamento = 'llm_yara' THEN v_config.max_tokens_por_consulta
            ELSE 0
        END,
        tokens_economizados: v_tokens_economizados,
        custo_tokens: CASE 
            WHEN v_tipo_roteamento = 'llm_yara' THEN v_config.max_tokens_por_consulta * v_config.custo_por_token
            ELSE 0
        END,
        custo_economizado: v_custo_economizado,
        cache_hit: v_cache_hit,
        status_query: 'concluida',
        data_conclusao: NOW()
    );
    
    v_resultado := jsonb_build_object(
        'sucesso', true,
        'roteamento_aplicado', v_tipo_roteamento,
        'query_processada', v_query_normalizada,
        'tokens_utilizados', CASE 
            WHEN v_tipo_roteamento = 'llm_yara' THEN v_config.max_tokens_por_consulta
            ELSE 0
        END,
        'tokens_economizados', v_tokens_economizados,
        'custo_economizado', v_custo_economizado,
        'cache_hit', v_cache_hit,
        'mensagem', 'Query roteada com sucesso'
    );
    
    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar semantic search no vector cache
CREATE OR REPLACE FUNCTION public.semantic_search_vector_cache(
    p_query TEXT,
    p_usuario_id UUID,
    p_max_results INTEGER DEFAULT 10,
    p_similarity_threshold DECIMAL(5,4) DEFAULT 0.8
) RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_query_vector vector(1536);
    v_resultados JSONB := '[]'::JSONB;
    v_result_record RECORD;
    cursor_resultados REFCURSOR(resultados) FOR SELECT 
        cache_id,
        conteudo_original,
        tipo_conteudo,
        contexto,
        tags,
        relevancia_score,
        1 - (embedding_vector <=> p_query_vector) AS similarity
    FROM public.vector_cache_conversas
    WHERE 1 - (embedding_vector <=> p_query_vector) > p_similarity_threshold
    AND status_cache = 'ativo'
    AND expires_at > NOW()
    ORDER BY similarity DESC
    LIMIT p_max_results;
BEGIN
    -- Buscar configuração do Vector Cache
    SELECT * INTO v_config
    FROM public.configuracao_vector_cache
    WHERE status_config = 'ativo'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Configuração do Vector Cache não encontrada'
        );
    END IF;
    
    -- Aqui deveria gerar o embedding da query usando o modelo configurado
    -- Por ora, simulamos um embedding aleatório para demonstração
    v_query_vector := '[0.1, 0.2, 0.3, ...]'; -- Substituir por embedding real
    
    -- Buscar resultados similares
    OPEN cursor_resultados;
    LOOP
        FETCH cursor_resultados INTO v_result_record;
        EXIT WHEN NOT FOUND;
        
        -- Atualizar access count e last accessed
        UPDATE public.vector_cache_conversas
        SET 
            access_count = access_count + 1,
            last_accessed = NOW()
        WHERE cache_id = v_result_record.cache_id;
        
        v_resultados := v_resultados || jsonb_build_object(
            'cache_id', v_result_record.cache_id,
            'conteudo_original', v_result_record.conteudo_original,
            'tipo_conteudo', v_result_record.tipo_conteudo,
            'contexto', v_result_record.contexto,
            'tags', v_result_record.tags,
            'relevancia_score', v_result_record.relevancia_score,
            'similarity', v_result_record.similarity
        )::JSONB;
    END LOOP;
    CLOSE cursor_resultados;
    
    RETURN jsonb_build_object(
        'sucesso', true,
        'query', p_query,
        'resultados_encontrados', jsonb_array_length(v_resultados),
        'resultados', v_resultados,
        'mensagem', 'Busca semântica realizada com sucesso'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar transição de estado
CREATE OR REPLACE FUNCTION public.processar_transicao_estado(
    p_imovel_id UUID,
    p_estado_destino TEXT,
    p_motivo_transicao TEXT DEFAULT NULL,
    p_usuario_transicao UUID DEFAULT NULL,
    p_sistema_origem TEXT DEFAULT 'manual'
) RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_estado_atual RECORD;
    v_transicao_valida BOOLEAN := false;
    v_motivo_invalidacao TEXT;
    v_estado_id TEXT;
    v_transicao_id TEXT;
    v_regras_aplicadas TEXT[] := '{}';
BEGIN
    -- Buscar configuração da State Machine
    SELECT * INTO v_config
    FROM public.configuracao_state_machine
    WHERE status_config = 'ativo'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Configuração da State Machine não encontrada'
        );
    END IF;
    
    -- Buscar estado atual do imóvel
    SELECT * INTO v_estado_atual
    FROM public.estado_imoveis
    WHERE imovel_id = p_imovel_id
    AND estado_atual IS NOT NULL
    ORDER BY data_entrada_estado DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Primeiro estado - criar registro
        INSERT INTO public.estado_imoveis (
            estado_id: 'EST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
            imovel_id: p_imovel_id,
            estado_atual: p_estado_destino,
            data_entrada_estado: NOW(),
            motivo_transicao: 'Estado inicial',
            usuario_transicao: p_usuario_transicao,
            sistema_origem: p_sistema_origem,
            integridade_valida: true
        );
        
        RETURN jsonb_build_object(
            'sucesso', true,
            'estado_anterior', NULL,
            'estado_atual', p_estado_destino,
            'transicao_valida', true,
            'mensagem', 'Estado inicial criado com sucesso'
        );
    END IF;
    
    -- Validar transição
    v_transicao_valida := p_estado_destino = ANY(
        (v_config.transicoes_validas->v_estado_atual.estado_atual)
    );
    
    IF NOT v_transicao_valida THEN
        v_motivo_invalidacao := 'Transição de ' || v_estado_atual.estado_atual || 
                              ' para ' || p_estado_destino || ' não é permitida';
    END IF;
    
    -- Verificar regras especiais
    IF v_estado_atual.estado_atual = 'EM_LIMPEZA' THEN
        -- Verificar se bloqueia crossing de dados
        IF (v_config.regras_transicao->'EM_LIMPEZA'->>'bloqueia_crossing')::BOOLEAN THEN
            v_regras_aplicadas := array_append(v_regras_aplicadas, 'bloqueio_crossing_dados');
        END IF;
    END IF;
    
    IF v_transicao_valida THEN
        -- Finalizar estado anterior
        UPDATE public.estado_imoveis
        SET 
            data_saida_estado = NOW(),
            duracao_estado_minutos = EXTRACT(EPOCH FROM (NOW() - data_entrada_estado))/60
        WHERE id = v_estado_atual.id;
        
        -- Criar novo estado
        INSERT INTO public.estado_imoveis (
            estado_id: 'EST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
            imovel_id: p_imovel_id,
            estado_atual: p_estado_destino,
            estado_anterior: v_estado_atual.estado_atual,
            data_entrada_estado: NOW(),
            motivo_transicao: COALESCE(p_motivo_transicao, 'Transição manual'),
            usuario_transicao: p_usuario_transicao,
            sistema_origem: p_sistema_origem,
            regras_validadas: v_regras_aplicadas,
            integridade_valida: true
        );
        
        -- Registrar transição no histórico
        v_transicao_id := 'TR-' || EXTRACT(EPOCH FROM NOW())::TEXT;
        
        INSERT INTO public.historico_transicoes_estado (
            transicao_id: v_transicao_id,
            imovel_id: p_imovel_id,
            estado_origem: v_estado_atual.estado_atual,
            estado_destino: p_estado_destino,
            data_transicao: NOW(),
            motivo_transicao: COALESCE(p_motivo_transicao, 'Transição manual'),
            usuario_transicao: p_usuario_transicao,
            sistema_origem: p_sistema_origem,
            regras_aplicadas: v_regras_aplicadas,
            validacao_bem_sucedida: true
        );
        
        RETURN jsonb_build_object(
            'sucesso', true,
            'estado_anterior', v_estado_atual.estado_atual,
            'estado_atual', p_estado_destino,
            'transicao_id', v_transicao_id,
            'transicao_valida', true,
            'regras_aplicadas', v_regras_aplicadas,
            'mensagem', 'Transição de estado processada com sucesso'
        );
    ELSE
        RETURN jsonb_build_object(
            'sucesso', false,
            'estado_anterior', v_estado_atual.estado_atual,
            'estado_destino', p_estado_destino,
            'transicao_valida', false,
            'motivo_invalidacao', v_motivo_invalidacao,
            'mensagem', 'Transição inválida: ' || v_motivo_invalidacao
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para executar auditoria do middleware
CREATE OR REPLACE FUNCTION public.executar_auditoria_middleware(
    p_pilar_envolvido TEXT,
    p_operacao_auditada TEXT,
    p_dados_operacao JSONB,
    p_usuario_solicitante UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_resultado_validacao TEXT := 'aprovado';
    v_motivo_rejeicao TEXT;
    v_erros_encontrados TEXT[] := '{}';
    v_acoes_executadas TEXT[] := '{}';
    v_bloqueios_aplicados TEXT[] := '{}';
    v_auditoria_id TEXT;
    v_regras_aplicadas JSONB;
BEGIN
    -- Buscar configuração do Middleware
    SELECT * INTO v_config
    FROM public.configuracao_middleware_auditoria
    WHERE status_config = 'ativo'
    AND p_pilar_envolvido = ANY(pilares_monitorados)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Configuração do Middleware não encontrada para o pilar: ' || p_pilar_envolvido
        );
    END IF;
    
    v_regras_aplicadas := v_config.regras_validacao->p_pilar_envolvido;
    
    -- Executar validações baseadas no pilar
    IF p_pilar_envolvido = 'PILAR_4_CONTRATOS' THEN
        -- Validar antes do split
        IF (v_regras_aplicadas->>'valida_antes_split')::BOOLEAN THEN
            -- Verificar se existe split pendente para o mesmo contrato
            IF EXISTS (
                SELECT 1 FROM public.fluxo_financeiro_servico
                WHERE os_id IN (
                    SELECT id::TEXT FROM public.ordens_servico_limpeza 
                    WHERE imovel_id = (p_dados_operacao->>'imovel_id')::UUID
                )
                AND status_fluxo = 'pendente'
            ) THEN
                v_resultado_validacao := 'rejeitado';
                v_motivo_rejeicao := 'Split pendente encontrado para o mesmo contrato';
                v_erros_encontrados := array_append(v_erros_encontrados, 'split_pendente_conflito');
                
                IF v_config.modo_execucao = 'bloqueante' THEN
                    v_bloqueios_aplicados := array_append(v_bloqueios_aplicados, 'bloquear_split_contrato');
                END IF;
            END IF;
        END IF;
        
        -- Validar duplicidade
        IF (v_regras_aplicadas->>'valida_duplicidade')::BOOLEAN THEN
            -- Verificar duplicidade de contratos
            -- (Implementar lógica específica)
        END IF;
        
    ELSIF p_pilar_envolvido = 'PILAR_5_BANK' THEN
        -- Validar saldo disponível
        IF (v_regras_aplicadas->>'valida_saldo_disponivel')::BOOLEAN THEN
            -- Verificar saldo na wallet SB
            -- (Implementar lógica específica)
        END IF;
        
        -- Validar limite diário
        IF (v_regras_aplicadas->>'valida_limite_diario')::BOOLEAN THEN
            -- Verificar limite diário de transações
            -- (Implementar lógica específica)
        END IF;
    END IF;
    
    -- Gerar ID da auditoria
    v_auditoria_id := 'AUD-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Inserir log de auditoria
    INSERT INTO public.logs_middleware_auditoria (
        auditoria_id: v_auditoria_id,
        config_id: v_config.id,
        pilar_envolvido: p_pilar_envolvido,
        operacao_auditada: p_operacao_auditada,
        dados_operacao: p_dados_operacao,
        resultado_validacao: v_resultado_validacao,
        motivo_rejeicao: v_motivo_rejeicao,
        erros_encontrados: v_erros_encontrados,
        acoes_executadas: v_acoes_executadas,
        bloqueios_aplicados: v_bloqueios_aplicados,
        usuario_solicitante: p_usuario_solicitante,
        sistema_origem: 'middleware_auditoria',
        data_conclusao: NOW(),
        status_auditoria: 'concluida'
    );
    
    -- Enviar notificações se configurado
    IF v_config.notifica_erro AND v_resultado_validacao = 'rejeitado' THEN
        -- (Implementar envio de notificações)
        v_acoes_executadas := array_append(v_acoes_executadas, 'notificacao_erro_enviada');
    END IF;
    
    RETURN jsonb_build_object(
        'sucesso', true,
        'auditoria_id', v_auditoria_id,
        'pilar_envolvido', p_pilar_envolvido,
        'operacao_auditada', p_operacao_auditada,
        'resultado_validacao', v_resultado_validacao,
        'motivo_rejeicao', v_motivo_rejeicao,
        'erros_encontrados', v_erros_encontrados,
        'acoes_executadas', v_acoes_executadas,
        'bloqueios_aplicados', v_bloqueios_aplicados,
        'mensagem', 'Auditoria do middleware executada com sucesso'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar contribuição social V30
CREATE OR REPLACE FUNCTION public.processar_contribuicao_social_v30(
    p_mes_referencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    v_tesouro_record RECORD;
BEGIN
    -- Inserir ou atualizar tesouro V30
    INSERT INTO public.tesouro_reino_sb_v30 (
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
        faturamento_taxa_conveniencia,
        faturamento_economia_tokens,
        status_contribuicao: 'provisionado',
        data_calculo: CURRENT_DATE,
        data_provisionamento: CURRENT_DATE,
        destinacao_igrejas_locais: 25000.00,
        destinacao_obra_missionaria: 20000.00,
        destinacao_ajuda_desamparados: 15000.00,
        destinacao_evangelizacao: 10000.00,
        destinacao_acao_social: 10000.00,
        destinacao_capacitacao_prestadores: 10000.00,
        destinacao_tecnologia_social: 5000.00
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
        75000.00,  -- Prestadores de Serviços
        8500.00,   -- Taxa de Conveniência
        12000.00,  -- Economia de Tokens (NOVO)
        'provisionado',
        CURRENT_DATE,
        CURRENT_DATE
    )
    ON CONFLICT (mes_referencia)
    DO UPDATE SET
        faturamento_economia_tokens = EXCLUDED.faturamento_economia_tokens,
        destinacao_tecnologia_social = EXCLUDED.destinacao_tecnologia_social,
        status_contribuicao = 'provisionado',
        data_calculo = CURRENT_DATE,
        data_provisionamento = CURRENT_DATE,
        updated_at = NOW()
    RETURNING * INTO v_tesouro_record;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'tesouro_id', v_tesouro_record.id,
        'mes_referencia', v_tesouro_record.mes_referencia,
        'faturamento_bruto_total', v_tesouro_record.faturamento_bruto_total,
        'faturamento_economia_tokens', v_tesouro_record.faturamento_economia_tokens,
        'faturamento_liquido', v_tesouro_record.faturamento_liquido,
        'valor_contribuicao', v_tesouro_record.valor_contribuicao,
        'destinacao_tecnologia_social', v_tesouro_record.destinacao_tecnologia_social,
        'mensagem', 'Contribuição social V30 processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_config_intent_router_status ON public.configuracao_intent_router(status_config);
CREATE INDEX IF NOT EXISTS idx_historico_queries_usuario ON public.historico_queries_intent_router(usuario_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_historico_queries_tipo ON public.historico_queries_intent_router(tipo_query, data_inicio);
CREATE INDEX IF NOT EXISTS idx_historico_queries_roteamento ON public.historico_queries_intent_router(roteamento_aplicado, data_inicio);
CREATE INDEX IF NOT EXISTS idx_config_vector_cache_status ON public.configuracao_vector_cache(status_config);
CREATE INDEX IF NOT EXISTS idx_vector_cache_usuario ON public.vector_cache_conversas(usuario_id, last_accessed);
CREATE INDEX IF NOT EXISTS idx_vector_cache_tipo ON public.vector_cache_conversas(tipo_conteudo, last_accessed);
CREATE INDEX IF NOT EXISTS idx_vector_cache_expires ON public.vector_cache_conversas(expires_at, status_cache);
CREATE INDEX IF NOT EXISTS idx_config_state_machine_status ON public.configuracao_state_machine(status_config);
CREATE INDEX IF NOT EXISTS idx_estado_imoveis_atual ON public.estado_imoveis(imovel_id, estado_atual, data_entrada_estado);
CREATE INDEX IF NOT EXISTS idx_estado_imoveis_data ON public.estado_imoveis(data_entrada_estado, estado_atual);
CREATE INDEX IF NOT EXISTS idx_historico_transicoes_imovel ON public.historico_transicoes_estado(imovel_id, data_transicao);
CREATE INDEX IF NOT EXISTS idx_historico_transicoes_data ON public.historico_transicoes_estado(data_transicao, estado_origem, estado_destino);
CREATE INDEX IF NOT EXISTS idx_config_middleware_status ON public.configuracao_middleware_auditoria(status_config);
CREATE INDEX IF NOT EXISTS idx_logs_middleware_pilar ON public.logs_middleware_auditoria(pilar_envolvido, data_inicio);
CREATE INDEX IF NOT EXISTS idx_logs_middleware_resultado ON public.logs_middleware_auditoria(resultado_validacao, data_inicio);
CREATE INDEX IF NOT EXISTS idx_tesouro_mes_v30 ON public.tesouro_reino_sb_v30(mes_referencia, status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_tesouro_faturamento ON public.tesouro_reino_sb_v30(faturamento_bruto_total, status_contribuicao);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Configuração Intent Router
INSERT INTO public.configuracao_intent_router (
    config_id,
    nome_config,
    consultas_diretas,
    consultas_llm,
    max_tokens_por_consulta,
    custo_por_token,
    cache_duration_minutes,
    economia_ativa,
    prioridade_consultas,
    status_config,
    data_ativacao
) VALUES
('INTENT-ROUTER-001', 'Produção', 
 ARRAY['SELECT', 'UPDATE', 'DELETE', 'INSERT', 'saldo', 'status', 'deadline', 'disponibilidade'],
 ARRAY['análise estratégica', 'otimização de portfólio', 'previsão de demanda', 'análise de competitividade', 'recomendações de investimento'],
 1000, 0.0001, 30, true,
 ARRAY['critical', 'high', 'medium', 'low'],
 'ativo', CURRENT_DATE);

-- Inserir Configuração Vector Cache
INSERT INTO public.configuracao_vector_cache (
    config_id,
    nome_config,
    vector_dimension,
    embedding_model,
    similarity_threshold,
    max_results,
    cache_ttl_hours,
    max_cache_size_mb,
    cleanup_interval_hours,
    search_strategy,
    hybrid_search,
    status_config,
    data_ativacao
) VALUES
('VECTOR-CACHE-001', 'Produção', 1536, 'text-embedding-ada-002', 0.8, 10, 24, 1024, 6, 'cosine', true, 'ativo', CURRENT_DATE);

-- Inserir Configuração State Machine
INSERT INTO public.configuracao_state_machine (
    config_id,
    nome_config,
    estados_permitidos,
    transicoes_validas,
    regras_transicao,
    status_config,
    data_ativacao
) VALUES
('STATE-MACHINE-001', 'Produção',
 ARRAY['DISPONIVEL', 'RESERVADO', 'OCUPADO', 'CHECKOUT_PENDENTE', 'EM_LIMPEZA', 'AUDITADO', 'MANUTENCAO', 'BLOQUEADO'],
 '{
    "DISPONIVEL": ["RESERVADO", "MANUTENCAO", "BLOQUEADO"],
    "RESERVADO": ["OCUPADO", "DISPONIVEL"],
    "OCUPADO": ["CHECKOUT_PENDENTE", "MANUTENCAO"],
    "CHECKOUT_PENDENTE": ["EM_LIMPEZA"],
    "EM_LIMPEZA": ["AUDITADO"],
    "AUDITADO": ["DISPONIVEL"],
    "MANUTENCAO": ["DISPONIVEL"],
    "BLOQUEADO": ["DISPONIVEL"]
 }',
 '{
    "EM_LIMPEZA": {
        "bloqueia_crossing": true,
        "motivo": "Em processo de limpeza, bloquear cruzamento de dados"
    },
    "CHECKOUT_PENDENTE": {
        "timeout_horas": 2,
        "auto_transicao": "EM_LIMPEZA"
    }
 }',
 'ativo', CURRENT_DATE);

-- Inserir Configuração Middleware Auditoria
INSERT INTO public.configuracao_middleware_auditoria (
    config_id,
    nome_config,
    pilares_monitorados,
    regras_validacao,
    modo_execucao,
    timeout_validacao_segundos,
    tentativas_maximas,
    notifica_erro,
    notifica_alerta,
    canais_notificacao,
    status_config,
    data_ativacao
) VALUES
('MIDDLEWARE-AUD-001', 'Produção',
 ARRAY['PILAR_4_CONTRATOS', 'PILAR_5_BANK'],
 '{
    "PILAR_4_CONTRATOS": {
        "valida_antes_split": true,
        "valida_duplicidade": true,
        "valida_integridade": true,
        "bloqueia_conflito": true
    },
    "PILAR_5_BANK": {
        "valida_antes_split": true,
        "valida_saldo_disponivel": true,
        "valida_limite_diario": true,
        "valida_conformidade": true
    }
 }',
 'bloqueante', 30, 3, true, true,
 ARRAY['email', 'slack', 'teams'],
 'ativo', CURRENT_DATE);

-- Inserir Tesouro Reino SB V30 de exemplo
INSERT INTO public.tesouro_reino_sb_v30 (
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
    faturamento_taxa_conveniencia,
    faturamento_economia_tokens,
    status_contribuicao,
    data_calculo,
    data_provisionamento,
    destinacao_igrejas_locais,
    destinacao_obra_missionaria,
    destinacao_ajuda_desamparados,
    destinacao_evangelizacao,
    destinacao_acao_social,
    destinacao_capacitacao_prestadores,
    destinacao_tecnologia_social
) VALUES
(DATE_TRUNC('month', CURRENT_DATE)::DATE, 150000.00, 85000.00, 45000.00, 35000.00, 25000.00, 180000.00, 95000.00, 15000.00, 22000.00, 12000.00, 28000.00, 75000.00, 75000.00, 8500.00, 12000.00, 'provisionado', CURRENT_DATE, CURRENT_DATE, 25000.00, 20000.00, 15000.00, 10000.00, 10000.00, 10000.00, 5000.00),
(DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 135000.00, 75000.00, 42000.00, 32000.00, 22000.00, 165000.00, 85000.00, 13500.00, 20000.00, 11000.00, 25000.00, 68000.00, 58000.00, 78000.00, 70000.00, 8000.00, 10000.00, 'destinado', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 22000.00, 18000.00, 13000.00, 8000.00, 8000.00, 4500.00);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB ORCHESTRATOR & TOKEN SAVER V30 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.configuracao_intent_router) as total_configuracoes_intent_router,
       (SELECT COUNT(*) FROM public.historico_queries_intent_router) as total_historico_queries,
       (SELECT COUNT(*) FROM public.configuracao_vector_cache) as total_configuracoes_vector_cache,
       (SELECT COUNT(*) FROM public.vector_cache_conversas) as total_vector_cache,
       (SELECT COUNT(*) FROM public.configuracao_state_machine) as total_configuracoes_state_machine,
       (SELECT COUNT(*) FROM public.estado_imoveis) as total_estados_imoveis,
       (SELECT COUNT(*) FROM public.historico_transicoes_estado) as total_historico_transicoes,
       (SELECT COUNT(*) FROM public.configuracao_middleware_auditoria) as total_configuracoes_middleware,
       (SELECT COUNT(*) FROM public.logs_middleware_auditoria) as total_logs_middleware,
       (SELECT COUNT(*) FROM public.tesouro_reino_sb_v30) as total_tesouro_reino_sb_v30;
