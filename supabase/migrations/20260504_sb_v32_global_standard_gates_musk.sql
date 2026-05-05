-- 🏛️ SECURITY BROKER SB v32 - GLOBAL STANDARD (GATES & MUSK EDITION)
-- Schema completo para infraestrutura de rede e ativos proprietários

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- RWA TOKENIZATION ENGINE (LIQUIDEZ INFINITA)
-- =====================================================

-- Configuração do RWA Tokenization Engine
CREATE TABLE IF NOT EXISTS public.configuracao_rwa_tokenization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações de Tokenização
    blockchain_padrao TEXT DEFAULT 'ethereum', -- 'ethereum', 'polygon', 'avalanche', 'fantom'
    padrao_token TEXT DEFAULT 'ERC-721', -- 'ERC-721', 'ERC-1155', 'ERC-20'
    padrao_fracional BOOLEAN DEFAULT true, -- Permite fracionamento de ativos
    
    -- Configurações de Validação
    validacao_ativo BOOLEAN DEFAULT true,
    auditoria_externa BOOLEAN DEFAULT true,
    seguro_ativo BOOLEAN DEFAULT true,
    custodia_digital BOOLEAN DEFAULT true,
    
    -- Configurações de Liquidez
    pool_liquidez_padrao TEXT DEFAULT 'uniswap_v3', -- 'uniswap_v3', 'curve', 'balancer'
    taxa_liquidez DECIMAL(5,2) DEFAULT 0.30, -- 0.30% das transações
    lockup_periodo_dias INTEGER DEFAULT 30, -- Período de lockup para liquidez
    
    -- Configurações de Fração
    minimo_fracao DECIMAL(18,8) DEFAULT 0.00000001, -- Mínimo de 1/100M
    maximo_fracoes INTEGER DEFAULT 100000000, -- Máximo de 100M frações
    preco_fracao_inicial DECIMAL(18,8) DEFAULT 100.00, -- Preço inicial por fração em reais
    
    -- Configurações de Governança
    governanca_token BOOLEAN DEFAULT true,
    voting_power_fracao DECIMAL(5,4) DEFAULT 0.00001, -- 1 voto por 100K frações
    quorum_votacao DECIMAL(5,2) DEFAULT 51.00, -- 51% para aprovação
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao', 'auditoria'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Ativos Imobiliários para Tokenização
CREATE TABLE IF NOT EXISTS public.ativos_imobiliarios_rwa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    ativo_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    
    -- Detalhes do Ativo
    tipo_ativo TEXT NOT NULL, -- 'residencial', 'comercial', 'terreno', 'rural', 'industrial'
    endereco_completo TEXT NOT NULL,
    area_total DECIMAL(12,2) NOT NULL, -- m²
    area_construida DECIMAL(12,2) DEFAULT 0.00, -- m²
    ano_construcao INTEGER,
    numero_matricula TEXT,
    cartorio_registro TEXT,
    
    -- Validação e Auditoria
    status_validacao TEXT DEFAULT 'pendente', -- 'pendente', 'em_analise', 'aprovado', 'rejeitado'
    data_validacao TIMESTAMPTZ,
    auditor_externo_id UUID,
    relatorio_auditoria TEXT,
    
    -- Seguro e Custódia
    apolice_seguro TEXT,
    seguradora TEXT,
    data_vencimento_seguro DATE,
    custodia_digital_id TEXT,
    custodiante_id UUID,
    
    -- Tokenização
    token_id TEXT UNIQUE,
    contrato_endereco TEXT,
    blockchain TEXT,
    data_tokenizacao TIMESTAMPTZ,
    total_fracoes_emitidas BIGINT DEFAULT 0,
    fracoes_disponiveis BIGINT DEFAULT 0,
    preco_atual_fracao DECIMAL(18,8) DEFAULT 0.00000001,
    
    -- Financeiro
    valor_avaliado DECIMAL(18,2) NOT NULL, -- Valor total em reais
    valor_tokenizado DECIMAL(18,2) DEFAULT 0.00, -- Valor já tokenizado
    taxa_tokenizacao DECIMAL(5,2) DEFAULT 2.50, -- 2.5% do valor
    valor_liquidez DECIMAL(18,2) DEFAULT 0.00, -- Valor em pools de liquidez
    
    -- Metadados RWA
    metadata_rwa JSONB DEFAULT '{}',
    documentos_anexos TEXT[] DEFAULT '{}',
    certificacoes TEXT[] DEFAULT '{}',
    
    -- Status
    status_ativo TEXT DEFAULT 'disponivel', -- 'disponivel', 'em_tokenizacao', 'tokenizado', 'vendido', 'bloqueado'
    data_status TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_ativo TEXT UNIQUE
);

-- Frações de Ativos Tokenizados
CREATE TABLE IF NOT EXISTS public.fracoes_ativos_tokenizados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    fracao_id TEXT UNIQUE NOT NULL,
    ativo_imovel_id UUID REFERENCES public.ativos_imobiliarios_rwa(id) ON DELETE CASCADE,
    
    -- Detalhes da Fração
    numero_fracao BIGINT NOT NULL,
    quantidade_fracoes DECIMAL(18,8) NOT NULL,
    preco_compra DECIMAL(18,8) NOT NULL,
    data_compra TIMESTAMPTZ DEFAULT NOW(),
    
    -- Proprietário
    proprietario_id UUID NOT NULL,
    wallet_proprietario TEXT NOT NULL,
    
    -- Transação Blockchain
    transacao_hash TEXT,
    bloco_numero BIGINT,
    gas_utilizado BIGINT,
    custo_gas DECIMAL(18,8) DEFAULT 0.00000000,
    
    -- Direitos e Benefícios
    direitos_fração JSONB DEFAULT '{}',
    beneficios_fracao TEXT[] DEFAULT '{}',
    rendimento_mensal DECIMAL(18,8) DEFAULT 0.00000000,
    
    -- Status
    status_fracao TEXT DEFAULT 'ativa', -- 'ativa', 'vendida', 'bloqueada', 'queimada'
    data_status TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_fracao TEXT UNIQUE
);

-- Pools de Liquidez para Ativos Tokenizados
CREATE TABLE IF NOT EXISTS public.pools_liquidez_rwa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    pool_id TEXT UNIQUE NOT NULL,
    ativo_imovel_id UUID REFERENCES public.ativos_imobiliarios_rwa(id) ON DELETE CASCADE,
    
    -- Configurações do Pool
    tipo_pool TEXT NOT NULL, -- 'uniswap_v3', 'curve', 'balancer', 'sushiswap'
    blockchain TEXT NOT NULL,
    contrato_pool TEXT NOT NULL,
    token_principal TEXT NOT NULL, -- Token do ativo
    token_secundario TEXT NOT NULL, -- Stablecoin (USDT, USDC, DAI)
    
    -- Liquidez
    valor_total_liquidez DECIMAL(18,2) DEFAULT 0.00,
    valor_token_principal DECIMAL(18,2) DEFAULT 0.00,
    valor_token_secundario DECIMAL(18,2) DEFAULT 0.00,
    taxa_liquidez DECIMAL(5,2) DEFAULT 0.30,
    
    -- Performance
    volume_24h DECIMAL(18,2) DEFAULT 0.00,
    volume_7d DECIMAL(18,2) DEFAULT 0.00,
    volume_30d DECIMAL(18,2) DEFAULT 0.00,
    taxa_ano DECIMAL(5,4) DEFAULT 0.0000, -- APY anual
    
    -- Participantes
    total_participantes INTEGER DEFAULT 0,
    lockup_periodo_dias INTEGER DEFAULT 30,
    
    -- Status
    status_pool TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao', 'encerrado'
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_encerramento TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_pool TEXT UNIQUE
);

-- =====================================================
-- SB-CONNECT API (PADRÃO DO MERCADO)
-- =====================================================

-- Configuração do SB-Connect API
CREATE TABLE IF NOT EXISTS public.configuracao_sb_connect_api (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações da API
    versao_api TEXT DEFAULT 'v2.0',
    base_url TEXT NOT NULL,
    rate_limit INTEGER DEFAULT 1000, -- requests por hora
    rate_limit_window INTEGER DEFAULT 3600, -- segundos
    
    -- Autenticação
    auth_type TEXT DEFAULT 'api_key', -- 'api_key', 'oauth2', 'jwt'
    api_key_encrypted TEXT,
    oauth2_config JSONB DEFAULT '{}',
    
    -- Configurações de Cobrança
    modelo_cobranca TEXT DEFAULT 'saas', -- 'saas', 'pay_per_call', 'usage_based'
    preco_base DECIMAL(10,2) DEFAULT 99.90, -- R$ 99.90/mês
    preco_por_call DECIMAL(10,4) DEFAULT 0.0100, -- R$ 0.01 por chamada
    tier_limites JSONB DEFAULT '{
        "basic": {"calls": 1000, "features": ["sb_score", "selo_conformidade"]},
        "pro": {"calls": 10000, "features": ["sb_score", "selo_conformidade", "analytics", "webhooks"]},
        "enterprise": {"calls": 100000, "features": ["sb_score", "selo_conformidade", "analytics", "webhooks", "custom_models", "dedicated_support"]}
    }',
    
    -- Endpoints Disponíveis
    endpoints_disponiveis JSONB DEFAULT '{
        "sb_score": {
            "method": "GET",
            "path": "/api/v1/sb-score/{cpf}",
            "description": "Consulta SB Score de indivíduo",
            "pricing": "per_call"
        },
        "selo_conformidade": {
            "method": "GET",
            "path": "/api/v1/selo-conformidade/{imovel_id}",
            "description": "Consulta Selo de Conformidade GEO",
            "pricing": "per_call"
        },
        "analytics": {
            "method": "GET",
            "path": "/api/v1/analytics/summary",
            "description": "Resumo analítico do cliente",
            "pricing": "included"
        },
        "webhooks": {
            "method": "POST",
            "path": "/api/v1/webhooks/configure",
            "description": "Configurar webhooks de eventos",
            "pricing": "included"
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

-- Clientes do SB-Connect API
CREATE TABLE IF NOT EXISTS public.clientes_sb_connect (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    cliente_id TEXT UNIQUE NOT NULL,
    nome_empresa TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    
    -- Contato
    contato_nome TEXT NOT NULL,
    contato_email TEXT NOT NULL,
    contato_telefone TEXT,
    
    -- Configurações do Cliente
    tier_assinatura TEXT NOT NULL, -- 'basic', 'pro', 'enterprise'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    data_renovacao DATE,
    status_assinatura TEXT DEFAULT 'ativa', -- 'ativa', 'suspensa', 'cancelada'
    
    -- Limites de Uso
    limite_mensal_calls INTEGER DEFAULT 0,
    calls_usadas_mes INTEGER DEFAULT 0,
    ultimo_reset_mes DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    
    -- Configurações de API
    api_key_encrypted TEXT,
    webhooks_config JSONB DEFAULT '{}',
    custom_models JSONB DEFAULT '{}',
    
    -- Financeiro
    valor_mensalidade DECIMAL(10,2) DEFAULT 0.00,
    forma_pagamento TEXT DEFAULT 'boleto', -- 'boleto', 'cartao', 'transferencia'
    data_ultimo_pagamento DATE,
    proximo_vencimento DATE,
    
    -- Status
    status_cliente TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'bloqueado'
    data_status TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_cliente TEXT UNIQUE
);

-- Logs de Uso do SB-Connect API
CREATE TABLE IF NOT EXISTS public.logs_uso_sb_connect (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    log_id TEXT UNIQUE NOT NULL,
    cliente_id UUID REFERENCES public.clientes_sb_connect(id) ON DELETE CASCADE,
    
    -- Detalhes da Requisição
    endpoint_acessado TEXT NOT NULL,
    metodo_http TEXT NOT NULL,
    parametros_requisicao JSONB DEFAULT '{}',
    ip_origem TEXT,
    user_agent TEXT,
    
    -- Performance
    timestamp_requisicao TIMESTAMPTZ DEFAULT NOW(),
    timestamp_resposta TIMESTAMPTZ,
    tempo_resposta_ms INTEGER DEFAULT 0,
    status_http INTEGER,
    
    -- Resultado
    resultado_requisicao TEXT NOT NULL, -- 'sucesso', 'erro', 'timeout', 'rate_limit'
    mensagem_erro TEXT,
    
    -- Cobrança
    custo_chamada DECIMAL(10,4) DEFAULT 0.0000,
    faturado BOOLEAN DEFAULT false,
    data_faturamento DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_log TEXT UNIQUE
);

-- =====================================================
-- CBR-INDEX (FONTE EXTERNA ORACLE)
-- =====================================================

-- Configuração do CBR-Index Oracle
CREATE TABLE IF NOT EXISTS public.configuracao_cbr_index_oracle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações da Fonte Externa
    oracle_provider TEXT DEFAULT 'oracle_financial', -- 'oracle_financial', 'bloomberg', 'reuters', 'custom'
    oracle_endpoint TEXT NOT NULL,
    oracle_api_key_encrypted TEXT,
    oracle_certificado TEXT,
    
    -- Configurações de Sincronização
    frequencia_sincronizacao TEXT DEFAULT 'real_time', -- 'real_time', 'hourly', 'daily'
    timeout_conexao INTEGER DEFAULT 30, -- segundos
    retry_attempts INTEGER DEFAULT 3,
    cache_duration INTEGER DEFAULT 300, -- segundos
    
    -- Índices Disponíveis
    indices_disponiveis JSONB DEFAULT '{
        "cbr_bacen": {
            "nome": "Índice CBR Bacen",
            "frequencia": "mensal",
            "fonte": "banco_central",
            "atualizacao": "ultimo_dia_util"
        },
        "selic": {
            "nome": "Taxa SELIC",
            "frequencia": "diaria",
            "fonte": "banco_central",
            "atualizacao": "diariamente"
        },
        "ipca": {
            "nome": "IPCA",
            "frequencia": "mensal",
            "fonte": "ibge",
            "atualizacao": "mensalmente"
        },
        "igpm": {
            "nome": "IGP-M",
            "frequencia": "mensal",
            "fonte": "fgv",
            "atualizacao": "mensalmente"
        }
    }',
    
    -- Configurações de Cache
    cache_redis BOOLEAN DEFAULT true,
    cache_redis_host TEXT DEFAULT 'localhost',
    cache_redis_port INTEGER DEFAULT 6379,
    cache_redis_db INTEGER DEFAULT 0,
    
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

-- Dados do CBR-Index (Cache Local)
CREATE TABLE IF NOT EXISTS public.dados_cbr_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    indice_id TEXT UNIQUE NOT NULL,
    nome_indice TEXT NOT NULL,
    
    -- Valores Históricos
    data_referencia DATE NOT NULL,
    valor_atual DECIMAL(10,6) NOT NULL,
    valor_anterior DECIMAL(10,6),
    variacao_percentual DECIMAL(8,4),
    
    -- Metadados
    fonte_dados TEXT NOT NULL,
    data_coleta TIMESTAMPTZ DEFAULT NOW(),
    data_expiracao TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Análise
    tendencia TEXT, -- 'alta', 'baixa', 'estavel'
    volatilidade DECIMAL(8,4),
    projecao_30d DECIMAL(10,6),
    
    -- Status
    status_dado TEXT DEFAULT 'ativo', -- 'ativo', 'expirado', 'invalidado'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_dado TEXT UNIQUE
);

-- Logs de Sincronização Oracle
CREATE TABLE IF NOT EXISTS public.logs_sincronizacao_oracle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    sincronizacao_id TEXT UNIQUE NOT NULL,
    config_id UUID REFERENCES public.configuracao_cbr_index_oracle(id) ON DELETE CASCADE,
    
    -- Detalhes da Sincronização
    indice_sincronizado TEXT NOT NULL,
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_fim TIMESTAMPTZ,
    duracao_segundos INTEGER,
    
    -- Resultado
    status_sincronizacao TEXT NOT NULL, -- 'sucesso', 'erro', 'timeout', 'parcial'
    registros_sincronizados INTEGER DEFAULT 0,
    registros_erro INTEGER DEFAULT 0,
    mensagem_erro TEXT,
    
    -- Performance
    throughput_registros_seg DECIMAL(10,2) DEFAULT 0.00,
    latencia_media_ms INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_sincronizacao TEXT UNIQUE
);

-- =====================================================
-- ECOSSISTEMA DE CONSTRUÇÃO (VERTICALIZAÇÃO)
-- =====================================================

-- Configuração do Ecossistema de Construção
CREATE TABLE IF NOT EXISTS public.configuracao_ecossistema_construcao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações de Obra
    tipo_construcao TEXT NOT NULL, -- 'residencial', 'comercial', 'industrial', 'infraestrutura'
    padrao_construcao TEXT, -- 'padrao_sb', 'custom', 'internacional'
    
    -- Gestão de Custos
    moeda_padrao TEXT DEFAULT 'BRL',
    taxa_cambio DECIMAL(10,6) DEFAULT 1.000000,
    margem_lucro_padrao DECIMAL(5,2) DEFAULT 25.00,
    impostos_inclusos BOOLEAN DEFAULT true,
    
    -- Fornecedores
    fornecedores_habilitados TEXT[] DEFAULT '{}',
    criterios_selecao JSONB DEFAULT '{}',
    
    -- Timeline
    duracao_media_dias INTEGER DEFAULT 180, -- dias
    etapas_construcao JSONB DEFAULT '{
        "terraplenagem": {"duracao_dias": 30, "percentual_custo": 5},
        "fundacao": {"duracao_dias": 45, "percentual_custo": 15},
        "estrutura": {"duracao_dias": 60, "percentual_custo": 35},
        "acabamento": {"duracao_dias": 45, "percentual_custo": 45}
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

-- Gestão de Obra Proprietária
CREATE TABLE IF NOT EXISTS public.gestao_obra_proprietaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    obra_id TEXT UNIQUE NOT NULL,
    proprietario_id UUID NOT NULL,
    
    -- Detalhes da Obra
    nome_obra TEXT NOT NULL,
    tipo_obra TEXT NOT NULL,
    endereco_obra TEXT NOT NULL,
    area_terreno DECIMAL(12,2) NOT NULL,
    area_construida DECIMAL(12,2) DEFAULT 0.00,
    
    -- Custos (Terra Bruta até Entrega)
    custo_terra_bruta DECIMAL(18,2) NOT NULL,
    custo_licencas DECIMAL(18,2) DEFAULT 0.00,
    custo_terraplenagem DECIMAL(18,2) DEFAULT 0.00,
    custo_fundacao DECIMAL(18,2) DEFAULT 0.00,
    custo_estrutura DECIMAL(18,2) DEFAULT 0.00,
    custo_instalacoes DECIMAL(18,2) DEFAULT 0.00,
    custo_acabamento DECIMAL(18,2) DEFAULT 0.00,
    custo_lucro DECIMAL(18,2) DEFAULT 0.00,
    custo_impostos DECIMAL(18,2) DEFAULT 0.00,
    custo_total DECIMAL(18,2) GENERATED ALWAYS AS (
        custo_terra_bruta + custo_licencas + custo_terraplenagem + 
        custo_fundacao + custo_estrutura + custo_instalacoes + 
        custo_acabamento + custo_lucro + custo_impostos
    ) STORED,
    
    -- Timeline
    data_inicio_obra DATE NOT NULL,
    data_previsao_entrega DATE,
    data_entrega_real DATE,
    duracao_real_dias INTEGER,
    
    -- Fornecedores
    fornecedores_contratados TEXT[] DEFAULT '{}',
    fornecedores_pagamentos JSONB DEFAULT '{}',
    
    -- Status
    status_obra TEXT DEFAULT 'planejamento', -- 'planejamento', 'terraplenagem', 'fundacao', 'estrutura', 'acabamento', 'concluida', 'paralisada'
    data_status TIMESTAMPTZ DEFAULT NOW(),
    
    -- Documentação
    documentos_obra TEXT[] DEFAULT '{}',
    fotos_obra TEXT[] DEFAULT '{}',
    relatorios_obra TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_obra TEXT UNIQUE
);

-- Viabilidade de Loteamento SB
CREATE TABLE IF NOT EXISTS public.viabilidade_loteamento_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    viabilidade_id TEXT UNIQUE NOT NULL,
    area_id UUID NOT NULL,
    
    -- Detalhes da Área
    coordenada_central POINT NOT NULL,
    area_total DECIMAL(12,2) NOT NULL, -- hectares
    tipo_zona TEXT NOT NULL, -- 'residencial', 'comercial', 'mista', 'industrial'
    zoneamento_municipal TEXT,
    
    -- Análise de Viabilidade (10 segundos)
    fator_viabilidade DECIMAL(5,4) DEFAULT 0.0000, -- 0.0000 a 1.0000
    score_viabilidade DECIMAL(5,2) DEFAULT 0.00, -- 0.00 a 100.00
    classificacao_viabilidade TEXT, -- 'invivel', 'baixa', 'media', 'alta', 'excelente'
    
    -- Parâmetros de Cálculo
    densidade_maxima DECIMAL(8,4) DEFAULT 0.0000, -- hab/ha
    taxa_ocupacao_maxima DECIMAL(5,2) DEFAULT 0.00, -- percentual
    recuo_minimo DECIMAL(5,2) DEFAULT 0.00, -- metros
    taxa_permeabilidade_minima DECIMAL(5,2) DEFAULT 0.00, -- percentual
    
    -- Resultados Financeiros
    custo_terra_hectare DECIMAL(12,2) DEFAULT 0.00,
    custo_infraestrutura_hectare DECIMAL(12,2) DEFAULT 0.00,
    custo_total_hectare DECIMAL(12,2) DEFAULT 0.00,
    valor_lote_medio DECIMAL(12,2) DEFAULT 0.00,
    numero_lotes_viaveis INTEGER DEFAULT 0,
    lucro_estimado_hectare DECIMAL(12,2) DEFAULT 0.00,
    
    -- Tempo de Processamento
    tempo_processamento_segundos INTEGER DEFAULT 0,
    data_analise TIMESTAMPTZ DEFAULT NOW(),
    
    -- Recomendações
    recomendacoes TEXT[] DEFAULT '{}',
    restricoes TEXT[] DEFAULT '{}',
    proximos_passos TEXT[] DEFAULT '{}',
    
    -- Status
    status_viabilidade TEXT DEFAULT 'em_analise', -- 'em_analise', 'concluida', 'rejeitada'
    data_conclusao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_viabilidade TEXT UNIQUE
);

-- =====================================================
-- IMPACTO SOCIAL DE ESCALA (REINO SB GLOBAL)
-- =====================================================

-- Configuração do Reino SB Global
CREATE TABLE IF NOT EXISTS public.configuracao_reino_sb_global (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações Globais
    alcance_geografico TEXT[] DEFAULT ARRAY['brasil', 'america_latina', 'global'],
    moedas_suportadas TEXT[] DEFAULT ARRAY['BRL', 'USD', 'EUR'],
    
    -- Cidades Inteligentes Sociais
    cidades_inteligentes JSONB DEFAULT '{
        "sao_paulo": {
            "populacao": 12300000,
            "foco": "tecnologia_social",
            "projetos_ativos": 15,
            "investimento_total": 50000000.00,
            "beneficiarios": 250000
        },
        "rio_de_janeiro": {
            "populacao": 6700000,
            "foco": "educacao_crista",
            "projetos_ativos": 12,
            "investimento_total": 35000000.00,
            "beneficiarios": 180000
        },
        "belo_horizonte": {
            "populacao": 2500000,
            "foco": "saude_comunitaria",
            "projetos_ativos": 8,
            "investimento_total": 20000000.00,
            "beneficiarios": 100000
        }
    }',
    
    -- Configurações de Tecnologia
    tecnologia_baixo_custo JSONB DEFAULT '{
        "plataforma_educacao": "moodle_custom",
        "telemedicina": "zoom_integration",
        "energia_solar": "off_grid_systems",
        "agua_potavel": "filtracao_local",
        "conectividade": "mesh_network"
    }',
    
    -- Metas de Impacto
    metas_2026 JSONB DEFAULT '{
        "beneficiarios_totais": 1000000,
        "cidades_atendidas": 50,
        "projetos_concluidos": 100,
        "investimento_total": 500000000.00,
        "tecnologias_implementadas": 20
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

-- Projetos do Reino SB Global
CREATE TABLE IF NOT EXISTS public.projetos_reino_sb_global (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    projeto_id TEXT UNIQUE NOT NULL,
    config_id UUID REFERENCES public.configuracao_reino_sb_global(id) ON DELETE CASCADE,
    
    -- Detalhes do Projeto
    nome_projeto TEXT NOT NULL,
    tipo_projeto TEXT NOT NULL, -- 'tecnologia_social', 'educacao_crista', 'saude_comunitaria', 'infraestrutura_local'
    cidade_projeto TEXT NOT NULL,
    pais_projeto TEXT DEFAULT 'Brasil',
    coordinates POINT,
    
    -- Metas e Progresso
    meta_beneficiarios INTEGER DEFAULT 0,
    meta_investimento DECIMAL(15,2) DEFAULT 0.00,
    meta_data_inicio DATE,
    meta_data_conclusao DATE,
    
    beneficiarios_atendidos INTEGER DEFAULT 0,
    investimento_aplicado DECIMAL(15,2) DEFAULT 0.00,
    data_inicio_real DATE,
    data_conclusao_real DATE,
    percentual_conclusao DECIMAL(5,2) DEFAULT 0.00,
    
    -- Tecnologia Implementada
    tecnologia_principal TEXT,
    tecnologias_secundarias TEXT[] DEFAULT '{}',
    fornecedores_tecnologia TEXT[] DEFAULT '{}',
    
    -- Impacto Social
    descricao_impacto TEXT,
    metricas_impacto JSONB DEFAULT '{}',
    depoimentos_beneficiarios TEXT,
    
    -- Financeiro
    orcamento_total DECIMAL(15,2) DEFAULT 0.00,
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    saldo_disponivel DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status
    status_projeto TEXT DEFAULT 'planejado', -- 'planejado', 'em_andamento', 'concluido', 'suspenso', 'cancelado'
    data_status TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_projeto TEXT UNIQUE
);

-- =====================================================
-- SEGURANÇA DE NÍVEL ESTADUAL (DOC VAULT)
-- =====================================================

-- Configuração do Doc Vault
CREATE TABLE IF NOT EXISTS public.configuracao_doc_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Configurações de Criptografia
    algoritmo_criptografia TEXT DEFAULT 'AES-256-GCM', -- 'AES-256-GCM', 'ChaCha20-Poly1305'
    chave_criptografia_encrypted TEXT,
    salt_criptografia TEXT,
    iv_criptografia TEXT,
    
    -- Configurações de Segurança
    nivel_seguranca TEXT DEFAULT 'militar', -- 'militar', 'governamental', 'corporativo'
    autenticacao_multi_fator BOOLEAN DEFAULT true,
    sessao_timeout INTEGER DEFAULT 1800, -- 30 minutos
    max_tentativas_login INTEGER DEFAULT 3,
    lockout_tempo INTEGER DEFAULT 900, -- 15 minutos
    
    -- Configurações de Armazenamento
    storage_type TEXT DEFAULT 'distributed', -- 'distributed', 'centralized', 'hybrid'
    storage_providers JSONB DEFAULT '{
        "primary": "aws_s3",
        "backup": "google_cloud_storage",
        "cold_storage": "azure_blob"
    }',
    
    -- Configurações de Auditoria
    auditoria_completa BOOLEAN DEFAULT true,
    logs_retention_days INTEGER DEFAULT 2555, -- 7 anos
    blockchain_backup BOOLEAN DEFAULT true,
    
    -- Configurações de Acesso
    rbac_enabled BOOLEAN DEFAULT true,
    permissões_hierarquicas JSONB DEFAULT '{
        "nivel_1": ["leitura_basica"],
        "nivel_2": ["leitura_basica", "escrita_limitada"],
        "nivel_3": ["leitura_basica", "escrita_limitada", "moderacao"],
        "nivel_4": ["leitura_basica", "escrita_limitada", "moderacao", "administracao"],
        "nivel_5": ["acesso_total"]
    }',
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao', 'emergencia'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Escrituras Digitais Custodiadas
CREATE TABLE IF NOT EXISTS public.escrituras_digitais_custodiadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    escritura_id TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL,
    
    -- Detalhes da Escritura
    numero_matricula TEXT NOT NULL,
    cartorio_registro TEXT NOT NULL,
    data_registro DATE NOT NULL,
    livro_registro TEXT,
    folha_registro TEXT,
    
    -- Documento Digital
    arquivo_digital_encrypted TEXT NOT NULL,
    hash_documento TEXT NOT NULL,
    formato_arquivo TEXT DEFAULT 'PDF',
    tamanho_arquivo BIGINT DEFAULT 0,
    
    -- Criptografia
    algoritmo_criptografia TEXT NOT NULL,
    chave_criptografia_id TEXT NOT NULL,
    iv_criptografia TEXT NOT NULL,
    tag_autenticacao TEXT,
    
    -- Custódia
    data_custodia TIMESTAMPTZ DEFAULT NOW(),
    custodiante_id UUID NOT NULL,
    nivel_acesso_permitido TEXT DEFAULT 'nivel_3',
    
    -- Validação e Auditoria
    status_validacao TEXT DEFAULT 'pendente', -- 'pendente', 'validada', 'rejeitada'
    data_validacao TIMESTAMPTZ,
    validador_id UUID,
    observacoes_validacao TEXT,
    
    -- Acesso e Logs
    ultimo_acesso TIMESTAMPTZ,
    total_acessos INTEGER DEFAULT 0,
    logs_acesso JSONB DEFAULT '{}',
    
    -- Blockchain Integration
    blockchain_hash TEXT,
    blockchain_timestamp TIMESTAMPTZ,
    blockchain_confirmations INTEGER DEFAULT 0,
    
    -- Status
    status_escritura TEXT DEFAULT 'ativa', -- 'ativa', 'bloqueada', 'cancelada', 'transferida'
    data_status TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_escritura TEXT UNIQUE
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash de Configuração RWA
CREATE OR REPLACE FUNCTION public.gerar_hash_config_rwa()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.blockchain_padrao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_rwa
    BEFORE INSERT ON public.configuracao_rwa_tokenization
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_rwa();

-- Trigger para gerar hash de Ativo Imobiliário RWA
CREATE OR REPLACE FUNCTION public.gerar_hash_ativo_imobiliario_rwa()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_ativo := encode(sha256(
        NEW.ativo_id || 
        NEW.imovel_id::TEXT || 
        NEW.tipo_ativo || 
        NEW.valor_avaliado::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_ativo_imobiliario_rwa
    BEFORE INSERT ON public.ativos_imobiliarios_rwa
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_ativo_imobiliario_rwa();

-- Trigger para gerar hash de Fração Tokenizada
CREATE OR REPLACE FUNCTION public.gerar_hash_fracao_tokenizada()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_fracao := encode(sha256(
        NEW.fracao_id || 
        NEW.ativo_imovel_id::TEXT || 
        NEW.numero_fracao::TEXT || 
        NEW.proprietario_id::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_fracao_tokenizada
    BEFORE INSERT ON public.fracoes_ativos_tokenizados
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_fracao_tokenizada();

-- Trigger para gerar hash de Pool de Liquidez
CREATE OR REPLACE FUNCTION public.gerar_hash_pool_liquidez()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_pool := encode(sha256(
        NEW.pool_id || 
        NEW.ativo_imovel_id::TEXT || 
        NEW.tipo_pool || 
        NEW.valor_total_liquidez::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_pool_liquidez
    BEFORE INSERT ON public.pools_liquidez_rwa
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_pool_liquidez();

-- Trigger para gerar hash de Configuração SB-Connect
CREATE OR REPLACE FUNCTION public.gerar_hash_config_sb_connect()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.versao_api || 
        NEW.modelo_cobranca || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_sb_connect
    BEFORE INSERT ON public.configuracao_sb_connect_api
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_sb_connect();

-- Trigger para gerar hash de Cliente SB-Connect
CREATE OR REPLACE FUNCTION public.gerar_hash_cliente_sb_connect()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_cliente := encode(sha256(
        NEW.cliente_id || 
        NEW.nome_empresa || 
        NEW.cnpj || 
        NEW.tier_assinatura || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_cliente_sb_connect
    BEFORE INSERT ON public.clientes_sb_connect
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_cliente_sb_connect();

-- Trigger para gerar hash de Log Uso SB-Connect
CREATE OR REPLACE FUNCTION public.gerar_hash_log_uso_sb_connect()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_log := encode(sha256(
        NEW.log_id || 
        NEW.cliente_id::TEXT || 
        NEW.endpoint_acessado || 
        NEW.status_http::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_log_uso_sb_connect
    BEFORE INSERT ON public.logs_uso_sb_connect
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_log_uso_sb_connect();

-- Trigger para gerar hash de Configuração CBR-Index
CREATE OR REPLACE FUNCTION public.gerar_hash_config_cbr_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.oracle_provider || 
        NEW.frequencia_sincronizacao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_cbr_index
    BEFORE INSERT ON public.configuracao_cbr_index_oracle
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_cbr_index();

-- Trigger para gerar hash de Dados CBR-Index
CREATE OR REPLACE FUNCTION public.gerar_hash_dados_cbr_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_dado := encode(sha256(
        NEW.indice_id || 
        NEW.nome_indice || 
        NEW.data_referencia::TEXT || 
        NEW.valor_atual::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_dados_cbr_index
    BEFORE INSERT ON public.dados_cbr_index
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_dados_cbr_index();

-- Trigger para gerar hash de Log Sincronização Oracle
CREATE OR REPLACE FUNCTION public.gerar_hash_log_sincronizacao_oracle()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_sincronizacao := encode(sha256(
        NEW.sincronizacao_id || 
        NEW.config_id::TEXT || 
        NEW.indice_sincronizado || 
        NEW.status_sincronizacao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_log_sincronizacao_oracle
    BEFORE INSERT ON public.logs_sincronizacao_oracle
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_log_sincronizacao_oracle();

-- Trigger para gerar hash de Configuração Ecossistema
CREATE OR REPLACE FUNCTION public.gerar_hash_config_ecossistema()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.tipo_construcao || 
        NEW.padrao_construcao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_ecossistema
    BEFORE INSERT ON public.configuracao_ecossistema_construcao
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_ecossistema();

-- Trigger para gerar hash de Gestão de Obra
CREATE OR REPLACE FUNCTION public.gerar_hash_gestao_obra()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_obra := encode(sha256(
        NEW.obra_id || 
        NEW.proprietario_id::TEXT || 
        NEW.nome_obra || 
        NEW.custo_total::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_gestao_obra
    BEFORE INSERT ON public.gestao_obra_proprietaria
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_gestao_obra();

-- Trigger para gerar hash de Viabilidade Loteamento
CREATE OR REPLACE FUNCTION public.gerar_hash_viabilidade_loteamento()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_viabilidade := encode(sha256(
        NEW.viabilidade_id || 
        NEW.area_id::TEXT || 
        NEW.fator_viabilidade::TEXT || 
        NEW.score_viabilidade::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_viabilidade_loteamento
    BEFORE INSERT ON public.viabilidade_loteamento_sb
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_viabilidade_loteamento();

-- Trigger para gerar hash de Configuração Reino SB Global
CREATE OR REPLACE FUNCTION public.gerar_hash_config_reino_sb_global()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.alcance_geografico::TEXT || 
        NEW.cidades_inteligentes::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_reino_sb_global
    BEFORE INSERT ON public.configuracao_reino_sb_global
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_reino_sb_global();

-- Trigger para gerar hash de Projeto Reino SB Global
CREATE OR REPLACE FUNCTION public.gerar_hash_projeto_reino_sb_global()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_projeto := encode(sha256(
        NEW.projeto_id || 
        NEW.config_id::TEXT || 
        NEW.nome_projeto || 
        NEW.tipo_projeto || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_projeto_reino_sb_global
    BEFORE INSERT ON public.projetos_reino_sb_global
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_projeto_reino_sb_global();

-- Trigger para gerar hash de Configuração Doc Vault
CREATE OR REPLACE FUNCTION public.gerar_hash_config_doc_vault()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.nome_config || 
        NEW.algoritmo_criptografia || 
        NEW.nivel_seguranca || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_doc_vault
    BEFORE INSERT ON public.configuracao_doc_vault
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_doc_vault();

-- Trigger para gerar hash de Escritura Digital
CREATE OR REPLACE FUNCTION public.gerar_hash_escritura_digital()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_escritura := encode(sha256(
        NEW.escritura_id || 
        NEW.imovel_id::TEXT || 
        NEW.numero_matricula || 
        NEW.hash_documento || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_escritura_digital
    BEFORE INSERT ON public.escrituras_digitais_custodiadas
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_escritura_digital();

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_config_rwa_status ON public.configuracao_rwa_tokenization(status_config);
CREATE INDEX IF NOT EXISTS idx_ativos_imoveis_tipo ON public.ativos_imobiliarios_rwa(tipo_ativo, status_ativo);
CREATE INDEX IF NOT EXISTS idx_ativos_imoveis_validacao ON public.ativos_imobiliarios_rwa(status_validacao, data_validacao);
CREATE INDEX IF NOT EXISTS idx_ativos_imoveis_tokenizacao ON public.ativos_imobiliarios_rwa(status_ativo, data_tokenizacao);
CREATE INDEX IF NOT EXISTS idx_fracoes_ativo_proprietario ON public.fracoes_ativos_tokenizados(ativo_imovel_id, proprietario_id);
CREATE INDEX IF NOT EXISTS idx_fracoes_status ON public.fracoes_ativos_tokenizados(status_fracao, data_status);
CREATE INDEX IF NOT EXISTS idx_pools_ativo_tipo ON public.pools_liquidez_rwa(ativo_imovel_id, tipo_pool);
CREATE INDEX IF NOT EXISTS idx_pools_status ON public.pools_liquidez_rwa(status_pool, data_criacao);
CREATE INDEX IF NOT EXISTS idx_config_sb_connect_status ON public.configuracao_sb_connect_api(status_config);
CREATE INDEX IF NOT EXISTS idx_clientes_sb_connect_tier ON public.clientes_sb_connect(tier_assinatura, status_assinatura);
CREATE INDEX IF NOT EXISTS idx_clientes_sb_connect_cnpj ON public.clientes_sb_connect(cnpj, status_cliente);
CREATE INDEX IF NOT EXISTS idx_logs_uso_cliente_data ON public.logs_uso_sb_connect(cliente_id, timestamp_requisicao);
CREATE INDEX IF NOT EXISTS idx_logs_uso_endpoint ON public.logs_uso_sb_connect(endpoint_acessado, resultado_requisicao);
CREATE INDEX IF NOT EXISTS idx_config_cbr_index_status ON public.configuracao_cbr_index_oracle(status_config);
CREATE INDEX IF NOT EXISTS idx_dados_cbr_indice_data ON public.dados_cbr_index(nome_indice, data_referencia);
CREATE INDEX IF NOT EXISTS idx_dados_cbr_status ON public.dados_cbr_index(status_dado, data_expiracao);
CREATE INDEX IF NOT EXISTS idx_logs_sincronizacao_config ON public.logs_sincronizacao_oracle(config_id, status_sincronizacao);
CREATE INDEX IF NOT EXISTS idx_logs_sincronizacao_indice ON public.logs_sincronizacao_oracle(indice_sincronizado, data_inicio);
CREATE INDEX IF NOT EXISTS idx_config_ecossistema_status ON public.configuracao_ecossistema_construcao(status_config);
CREATE INDEX IF NOT EXISTS idx_gestao_obra_proprietario ON public.gestao_obra_proprietaria(proprietario_id, status_obra);
CREATE INDEX IF NOT EXISTS idx_gestao_obra_status ON public.gestao_obra_proprietaria(status_obra, data_inicio_obra);
CREATE INDEX IF NOT EXISTS idx_viabilidade_area_score ON public.viabilidade_loteamento_sb(area_id, score_viabilidade);
CREATE INDEX IF NOT EXISTS idx_viabilidade_status ON public.viabilidade_loteamento_sb(status_viabilidade, data_analise);
CREATE INDEX IF NOT EXISTS idx_config_reino_sb_global_status ON public.configuracao_reino_sb_global(status_config);
CREATE INDEX IF NOT EXISTS idx_projetos_reino_cidade ON public.projetos_reino_sb_global(cidade_projeto, status_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_reino_status ON public.projetos_reino_sb_global(status_projeto, data_status);
CREATE INDEX IF NOT EXISTS idx_config_doc_vault_status ON public.configuracao_doc_vault(status_config);
CREATE INDEX IF NOT EXISTS idx_escrituras_imovel ON public.escrituras_digitais_custodiadas(imovel_id, status_escritura);
CREATE INDEX IF NOT EXISTS idx_escrituras_matricula ON public.escrituras_digitais_custodiadas(numero_matricula, status_escritura);
CREATE INDEX IF NOT EXISTS idx_escrituras_custodiante ON public.escrituras_digitais_custodiadas(custodiante_id, data_custodia);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Configuração RWA Tokenization
INSERT INTO public.configuracao_rwa_tokenization (
    config_id,
    nome_config,
    blockchain_padrao,
    padrao_token,
    padrao_fracional,
    validacao_ativo,
    auditoria_externa,
    seguro_ativo,
    custodia_digital,
    pool_liquidez_padrao,
    taxa_liquidez,
    lockup_periodo_dias,
    minimo_fracao,
    maximo_fracoes,
    preco_fracao_inicial,
    governanca_token,
    voting_power_fracao,
    quorum_votacao,
    status_config,
    data_ativacao
) VALUES
('RWA-TOKEN-001', 'Produção RWA Tokenization', 'ethereum', 'ERC-1155', true, true, true, true, 'uniswap_v3', 0.30, 30, 0.00000001, 100000000, 100.00, true, 0.00001, 51.00, 'ativo', CURRENT_DATE);

-- Inserir Configuração SB-Connect API
INSERT INTO public.configuracao_sb_connect_api (
    config_id,
    nome_config,
    versao_api,
    base_url,
    rate_limit,
    rate_limit_window,
    auth_type,
    modelo_cobranca,
    preco_base,
    preco_por_call,
    tier_limites,
    endpoints_disponiveis,
    status_config,
    data_ativacao
) VALUES
('SB-CONNECT-001', 'Produção SB-Connect', 'v2.0', 'https://api.securitybroker.com.br', 1000, 3600, 'api_key', 'saas', 99.90, 0.0100, '{
        "basic": {"calls": 1000, "features": ["sb_score", "selo_conformidade"]},
        "pro": {"calls": 10000, "features": ["sb_score", "selo_conformidade", "analytics", "webhooks"]},
        "enterprise": {"calls": 100000, "features": ["sb_score", "selo_conformidade", "analytics", "webhooks", "custom_models", "dedicated_support"]}
    }', '{
        "sb_score": {
            "method": "GET",
            "path": "/api/v1/sb-score/{cpf}",
            "description": "Consulta SB Score de indivíduo",
            "pricing": "per_call"
        },
        "selo_conformidade": {
            "method": "GET",
            "path": "/api/v1/selo-conformidade/{imovel_id}",
            "description": "Consulta Selo de Conformidade GEO",
            "pricing": "per_call"
        },
        "analytics": {
            "method": "GET",
            "path": "/api/v1/analytics/summary",
            "description": "Resumo analítico do cliente",
            "pricing": "included"
        },
        "webhooks": {
            "method": "POST",
            "path": "/api/v1/webhooks/configure",
            "description": "Configurar webhooks de eventos",
            "pricing": "included"
        }
    }', 'ativo', CURRENT_DATE);

-- Inserir Configuração CBR-Index Oracle
INSERT INTO public.configuracao_cbr_index_oracle (
    config_id,
    nome_config,
    oracle_provider,
    oracle_endpoint,
    oracle_api_key_encrypted,
    frequencia_sincronizacao,
    timeout_conexao,
    retry_attempts,
    cache_duration,
    indices_disponiveis,
    cache_redis,
    cache_redis_host,
    cache_redis_port,
    cache_redis_db,
    status_config,
    data_ativacao
) VALUES
('CBR-ORACLE-001', 'Produção CBR-Index', 'oracle_financial', 'https://oracle.financial.com.br/api/v1', 'encrypted_key_placeholder', 'real_time', 30, 3, 300, '{
        "cbr_bacen": {
            "nome": "Índice CBR Bacen",
            "frequencia": "mensal",
            "fonte": "banco_central",
            "atualizacao": "ultimo_dia_util"
        },
        "selic": {
            "nome": "Taxa SELIC",
            "frequencia": "diaria",
            "fonte": "banco_central",
            "atualizacao": "diariamente"
        },
        "ipca": {
            "nome": "IPCA",
            "frequencia": "mensal",
            "fonte": "ibge",
            "atualizacao": "mensalmente"
        },
        "igpm": {
            "nome": "IGP-M",
            "frequencia": "mensal",
            "fonte": "fgv",
            "atualizacao": "mensalmente"
        }
    }', true, 'localhost', 6379, 0, 'ativo', CURRENT_DATE);

-- Inserir Configuração Ecossistema de Construção
INSERT INTO public.configuracao_ecossistema_construcao (
    config_id,
    nome_config,
    tipo_construcao,
    padrao_construcao,
    moeda_padrao,
    taxa_cambio,
    margem_lucro_padrao,
    impostos_inclusos,
    fornecedores_habilitados,
    criterios_selecao,
    duracao_media_dias,
    etapas_construcao,
    status_config,
    data_ativacao
) VALUES
('ECOSSISTEMA-001', 'Produção Ecossistema', 'residencial', 'padrao_sb', 'BRL', 5.50, 25.00, true, ARRAY['construtora_sb', 'fornecedor_materiais', 'engenharia_sb'], '{
        "experiencia_minima": 5,
        "certificacoes_obrigatorias": ["certificado_qualidade_iso"],
        "capacidade_financeira": "comprovada"
    }', 180, '{
        "terraplenagem": {"duracao_dias": 30, "percentual_custo": 5},
        "fundacao": {"duracao_dias": 45, "percentual_custo": 15},
        "estrutura": {"duracao_dias": 60, "percentual_custo": 35},
        "acabamento": {"duracao_dias": 45, "percentual_custo": 45}
    }', 'ativo', CURRENT_DATE);

-- Inserir Configuração Reino SB Global
INSERT INTO public.configuracao_reino_sb_global (
    config_id,
    nome_config,
    alcance_geografico,
    moedas_suportadas,
    cidades_inteligentes,
    tecnologia_baixo_custo,
    metas_2026,
    status_config,
    data_ativacao
) VALUES
('REINO-GLOBAL-001', 'Produção Reino SB Global', ARRAY['brasil', 'america_latina', 'global'], ARRAY['BRL', 'USD', 'EUR'], '{
        "sao_paulo": {
            "populacao": 12300000,
            "foco": "tecnologia_social",
            "projetos_ativos": 15,
            "investimento_total": 50000000.00,
            "beneficiarios": 250000
        },
        "rio_de_janeiro": {
            "populacao": 6700000,
            "foco": "educacao_crista",
            "projetos_ativos": 12,
            "investimento_total": 35000000.00,
            "beneficiarios": 180000
        },
        "belo_horizonte": {
            "populacao": 2500000,
            "foco": "saude_comunitaria",
            "projetos_ativos": 8,
            "investimento_total": 20000000.00,
            "beneficiarios": 100000
        }
    }', '{
        "plataforma_educacao": "moodle_custom",
        "telemedicina": "zoom_integration",
        "energia_solar": "off_grid_systems",
        "agua_potavel": "filtracao_local",
        "conectividade": "mesh_network"
    }', '{
        "beneficiarios_totais": 1000000,
        "cidades_atendidas": 50,
        "projetos_concluidos": 100,
        "investimento_total": 500000000.00,
        "tecnologias_implementadas": 20
    }', 'ativo', CURRENT_DATE);

-- Inserir Configuração Doc Vault
INSERT INTO public.configuracao_doc_vault (
    config_id,
    nome_config,
    algoritmo_criptografia,
    chave_criptografia_encrypted,
    salt_criptografia,
    iv_criptografia,
    nivel_seguranca,
    autenticacao_multi_fator,
    sessao_timeout,
    max_tentativas_login,
    lockout_tempo,
    storage_type,
    storage_providers,
    auditoria_completa,
    logs_retention_days,
    blockchain_backup,
    rbac_enabled,
    permissões_hierarquicas,
    status_config,
    data_ativacao
) VALUES
('DOC-VAULT-001', 'Produção Doc Vault', 'AES-256-GCM', 'encrypted_key_placeholder', 'salt_placeholder', 'iv_placeholder', 'militar', true, 1800, 3, 900, 'distributed', '{
        "primary": "aws_s3",
        "backup": "google_cloud_storage",
        "cold_storage": "azure_blob"
    }', true, 2555, true, true, '{
        "nivel_1": ["leitura_basica"],
        "nivel_2": ["leitura_basica", "escrita_limitada"],
        "nivel_3": ["leitura_basica", "escrita_limitada", "moderacao"],
        "nivel_4": ["leitura_basica", "escrita_limitada", "moderacao", "administracao"],
        "nivel_5": ["acesso_total"]
    }', 'ativo', CURRENT_DATE);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB GLOBAL STANDARD V32 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.configuracao_rwa_tokenization) as total_configuracoes_rwa,
       (SELECT COUNT(*) FROM public.ativos_imobiliarios_rwa) as total_ativos_imobiliarios_rwa,
       (SELECT COUNT(*) FROM public.fracoes_ativos_tokenizados) as total_fracoes_tokenizadas,
       (SELECT COUNT(*) FROM public.pools_liquidez_rwa) as total_pools_liquidez,
       (SELECT COUNT(*) FROM public.configuracao_sb_connect_api) as total_configuracoes_sb_connect,
       (SELECT COUNT(*) FROM public.clientes_sb_connect) as total_clientes_sb_connect,
       (SELECT COUNT(*) FROM public.logs_uso_sb_connect) as total_logs_uso_sb_connect,
       (SELECT COUNT(*) FROM public.configuracao_cbr_index_oracle) as total_configuracoes_cbr_index,
       (SELECT COUNT(*) FROM public.dados_cbr_index) as total_dados_cbr_index,
       (SELECT COUNT(*) FROM public.logs_sincronizacao_oracle) as total_logs_sincronizacao_oracle,
       (SELECT COUNT(*) FROM public.configuracao_ecossistema_construcao) as total_configuracoes_ecossistema,
       (SELECT COUNT(*) FROM public.gestao_obra_proprietaria) as total_gestao_obras,
       (SELECT COUNT(*) FROM public.viabilidade_loteamento_sb) as total_viabilidades_loteamento,
       (SELECT COUNT(*) FROM public.configuracao_reino_sb_global) as total_configuracoes_reino_sb_global,
       (SELECT COUNT(*) FROM public.projetos_reino_sb_global) as total_projetos_reino_sb_global,
       (SELECT COUNT(*) FROM public.configuracao_doc_vault) as total_configuracoes_doc_vault,
       (SELECT COUNT(*) FROM public.escrituras_digitais_custodiadas) as total_escrituras_digitais_custodiadas;
