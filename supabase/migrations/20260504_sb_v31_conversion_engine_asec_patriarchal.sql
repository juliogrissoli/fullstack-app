-- 🏛️ SECURITY BROKER SB v31 - CONVERSION ENGINE (ASEC + PATRIMONIAL)
-- Schema completo para sistema operacional de conteúdo e conversão patrimonial

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- SEQUÊNCIA OPERACIONAL IMUTÁVEL (ASEC + ENGENHEIRO DE DECISÃO)
-- =====================================================

-- Configuração da Sequência Operacional
CREATE TABLE IF NOT EXISTS public.configuracao_sequencia_operacional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Estágios da Sequência (ASEC)
    estagios_sequencia TEXT[] DEFAULT ARRAY[
        'FE', -- Fé (Direção)
        'DOR', -- Dor (Identificação)
        'RESILIENCIA', -- Resiliência (Continuidade)
        'FAMILIA', -- Família (Profundidade)
        'DECISAO', -- Decisão (Pressão)
        'IMOVEL' -- Imóvel (Conversão)
    ],
    
    -- Configurações dos Estágios
    configuracao_estagios JSONB DEFAULT '{
        "FE": {
            "duracao_dias": 7,
            "objetivo": "Direção Espiritual",
            "acoes_obrigatorias": ["oracao", "jejum", "caridade"],
            "kpi_conversao": 0.05
        },
        "DOR": {
            "duracao_dias": 14,
            "objetivo": "Identificação da Dor",
            "acoes_obrigatorias": ["diagnostico", "prospecao", "mapeamento_dor"],
            "kpi_conversao": 0.10
        },
        "RESILIENCIA": {
            "duracao_dias": 21,
            "objetivo": "Construção de Resiliência",
            "acoes_obrigatorias": ["planejamento", "disciplina", "persistencia"],
            "kpi_conversao": 0.15
        },
        "FAMILIA": {
            "duracao_dias": 30,
            "objetivo": "Profundidade Familiar",
            "acoes_obrigatorias": ["conversa_familiar", "compromisso", "visita"],
            "kpi_conversao": 0.25
        },
        "DECISAO": {
            "duracao_dias": 14,
            "objetivo": "Tomada de Decisão",
            "acoes_obrigatorias": ["proposta_comercial", "negociacao", "fechamento"],
            "kpi_conversao": 0.30
        },
        "IMOVEL": {
            "duracao_dias": 45,
            "objetivo": "Conversão do Imóvel",
            "acoes_obrigatorias": ["visita", "proposta", "contrato", "financiamento"],
            "kpi_conversao": 0.15
        }
    }',
    
    -- Regra de Trava
    trava_estagio_final BOOLEAN DEFAULT true,
    estagio_final_travado TEXT DEFAULT 'IMOVEL',
    
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

-- Ciclo de Conteúdo do Lead
CREATE TABLE IF NOT EXISTS public.ciclo_conteudo_lead (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    ciclo_id TEXT UNIQUE NOT NULL,
    lead_id UUID NOT NULL,
    
    -- Estágio Atual
    estagio_atual TEXT NOT NULL,
    estagio_anterior TEXT,
    data_entrada_estagio TIMESTAMPTZ DEFAULT NOW(),
    data_saida_estagio TIMESTAMPTZ,
    duracao_dias INTEGER,
    
    -- Progresso no Ciclo
    progresso_ciclo DECIMAL(5,2) DEFAULT 0.00, -- 0-100%
    pontos_conquistados INTEGER DEFAULT 0,
    pontos_maximos_estagio INTEGER DEFAULT 100,
    
    -- Conteúdo Entregue
    conteudo_entregue TEXT[] DEFAULT '{}',
    interacoes_registradas INTEGER DEFAULT 0,
    engajamento_medio DECIMAL(5,2) DEFAULT 0.00, -- 0-100%
    
    -- Análise da Yara
    analise_yara JSONB DEFAULT '{}',
    score_conversao_atual DECIMAL(5,2) DEFAULT 0.00,
    probabilidade_conversao DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Status
    status_ciclo TEXT DEFAULT 'ativo', -- 'ativo', 'concluido', 'abandonado', 'pausado'
    data_conclusao_ciclo TIMESTAMPTZ,
    motivo_conclusao TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_ciclo TEXT UNIQUE
);

-- =====================================================
-- MOTOR VISUAL & UI (GOLDEN RATIO)
-- =====================================================

-- Configuração do Motor Visual
CREATE TABLE IF NOT EXISTS public.configuracao_motor_visual (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Paleta de Autoridade (Golden Ratio)
    paleta_autoridade JSONB DEFAULT '{
        "preto": {
            "hex": "#000000",
            "rgb": [0, 0, 0],
            "significado": "Autoridade Absoluta",
            "uso": "contratos, documentos legais"
        },
        "branco_dourado": {
            "hex": "#FFD700",
            "rgb": [255, 215, 0],
            "significado": "Sabedoria Divina",
            "uso": "propostas finais, decisões"
        },
        "azul_celeste": {
            "hex": "#4169E1",
            "rgb": [65, 105, 225],
            "significado": "Confiança Celestial",
            "uso": "testemunhos, depoimentos"
        },
        "verde_jade": {
            "hex": "#00A86B",
            "rgb": [0, 168, 107],
            "significado": "Equilíbrio Espiritual",
            "uso": "conteúdo educativo, planejamento"
        },
        "coral": {
            "hex": "#FF7F50",
            "rgb": [255, 127, 80],
            "significado": "Urgência Emocional",
            "uso": "chamadas para ação"
        }
    }',
    
    -- Configurações de UI
    layout_responsivo JSONB DEFAULT '{
        "mobile": {
            "fonte_tamanho_base": 16,
            "espacamento_linha": 1.5,
            "margem_segura": 20
        },
        "desktop": {
            "fonte_tamanho_base": 14,
            "espacamento_linha": 1.2,
            "margem_segura": 15
        },
        "tablet": {
            "fonte_tamanho_base": 15,
            "espacamento_linha": 1.3,
            "margem_segura": 18
        }
    }',
    
    -- Configurações de Acessibilidade
    acessibilidade JSONB DEFAULT '{
        "alto_contraste": true,
        "fonte_legivel": true,
        "navegacao_teclado": true,
        "leitor_tela": true,
        "descricao_imagens": true
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

-- Assets Gerados pela IA
CREATE TABLE IF NOT EXISTS public.assets_gerados_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    asset_id TEXT UNIQUE NOT NULL,
    lead_id UUID NOT NULL,
    tipo_asset TEXT NOT NULL, -- 'imagem', 'video', 'documento', 'apresentacao'
    
    -- Metadados do Asset
    titulo_asset TEXT NOT NULL,
    descricao_asset TEXT,
    tags TEXT[] DEFAULT '{}',
    categoria_autoridade TEXT, -- Referência à paleta de autoridade
    
    -- Conteúdo e Design
    conteudo_gerado TEXT,
    prompt_geracao TEXT,
    modelo_ia_utilizado TEXT DEFAULT 'yara-vision',
    parametros_geracao JSONB DEFAULT '{}',
    
    -- Análise Visual
    analise_visual JSONB DEFAULT '{}',
    score_qualidade DECIMAL(5,2) DEFAULT 0.00,
    elementos_identificados TEXT[] DEFAULT '{}',
    
    -- Golden Ratio Validation
    validacao_golden_ratio BOOLEAN DEFAULT false,
    score_harmonia DECIMAL(5,2) DEFAULT 0.00,
    elementos_harmoniosos TEXT[] DEFAULT '{}',
    
    -- Status
    status_asset TEXT DEFAULT 'gerado', -- 'gerado', 'aprovado', 'rejeitado', 'em_uso'
    data_geracao TIMESTAMPTZ DEFAULT NOW(),
    data_aprovacao TIMESTAMPTZ,
    usuario_aprovacao UUID,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_asset TEXT UNIQUE
);

-- =====================================================
-- ENGENHARIA DE DECISÃO PATRIMONIAL
-- =====================================================

-- Configuração da Engenharia de Decisão
CREATE TABLE IF NOT EXISTS public.configuracao_engenharia_decisao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Modelos de Decisão
    modelos_ativos TEXT[] DEFAULT ARRAY[
        'regressao_logistica',
        'arvore_decisao',
        'redes_neurais',
        'ensemble_voting'
    ],
    
    -- Parâmetros dos Modelos
    parametros_modelos JSONB DEFAULT '{
        "regressao_logistica": {
            "features": ["renda", "idade", "patrimonio", "score_ciclo", "engajamento"],
            "target": "probabilidade_venda",
            "threshold_decisao": 0.7
        },
        "arvore_decisao": {
            "max_profundidade": 5,
            "min_samples_leaf": 10,
            "criterion": "gini"
        },
        "redes_neurais": {
            "camadas_ocultas": [64, 32, 16],
            "funcao_ativacao": "relu",
            "dropout_rate": 0.2
        },
        "ensemble_voting": {
            "modelos": ["regressao", "arvore", "rede_neural"],
            "pesos": [0.4, 0.3, 0.3]
        }
    }',
    
    -- Filtros de Decisão
    filtros_decisao JSONB DEFAULT '{
        "faixa_renda": [1000, 10000000],
        "idade_minima": 18,
        "idade_maxima": 80,
        "score_minimo_ciclo": 30.0,
        "engajamento_minimo": 50.0,
        "patrimonio_minimo": 50000.00
    }',
    
    -- Configurações de Substituição
    termos_substituicao JSONB DEFAULT '{
        "venda_imoveis": {
            "enabled": true,
            "termos_originais": ["compra", "venda", "financiamento"],
            "termos_novos": ["conducao_patrimonial", "decisao_automatica", "transferencia_direta"]
        },
        "financiamento": {
            "enabled": true,
            "substituicao_automatica": true,
            "validacao_cadastro": true
        }
    }',
    
    -- Status
    status_config TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao', 'treinamento'
    data_ativacao DATE DEFAULT CURRENT_DATE,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_config TEXT UNIQUE
);

-- Histórico de Decisões Automáticas
CREATE TABLE IF NOT EXISTS public.historico_decisoes_automaticas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    decisao_id TEXT UNIQUE NOT NULL,
    lead_id UUID NOT NULL,
    modelo_utilizado TEXT NOT NULL,
    
    -- Contexto da Decisão
    dados_entrada JSONB NOT NULL,
    features_analisadas JSONB DEFAULT '{}',
    probabilidade_calculada DECIMAL(5,4) DEFAULT 0.0000,
    confianca_decisao DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Decisão Tomada
    decisao_automatica TEXT NOT NULL, -- 'aprovar', 'rejeitar', 'encaminhar', 'aguardar'
    justificativa_decisao TEXT,
    parametros_decisao JSONB DEFAULT '{}',
    
    -- Resultado da Decisão
    resultado_decisao TEXT NOT NULL, -- 'sucesso', 'fracasso', 'pendente', 'cancelado'
    data_resultado TIMESTAMPTZ,
    valor_transacao DECIMAL(15,2),
    
    -- Validação Humana
    validacao_humana BOOLEAN DEFAULT false,
    validador_id UUID,
    feedback_validacao TEXT,
    
    -- Performance
    tempo_processamento_ms INTEGER DEFAULT 0,
    custo_processamento DECIMAL(10,8) DEFAULT 0.0001,
    
    -- Status
    status_decisao TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'concluida', 'erro'
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_decisao TEXT UNIQUE
);

-- =====================================================
-- INTEGRAÇÃO SUPABASE / VERCEL (AUTOMAÇÃO)
-- =====================================================

-- Configuração de Automação
CREATE TABLE IF NOT EXISTS public.configuracao_automação (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Edge Functions Habilitadas
    edge_functions_habilitadas TEXT[] DEFAULT ARRAY[
        'direct_disparo',
        'lead_qualification',
        'asset_generation',
        'decision_engine',
        'content_delivery'
    ],
    
    -- Configurações de Direct
    config_direct JSONB DEFAULT '{
        "instagram": {
            "enabled": true,
            "business_account": "@sb_imoveis",
            "auto_reply": true,
            "story_templates": 5,
            "regras_engajamento": ["resposta_rapida", "conteudo_personalizado"]
        },
        "linkedin": {
            "enabled": true,
            "company_page": "security-broker-sb",
            "auto_connect": true,
            "inmail_personalizado": true,
            "regras_conexao": ["perfil_alvo", "mensagem_contextual"]
        },
        "facebook": {
            "enabled": false,
            "page_id": null,
            "auto_post": false
        }
    }',
    
    -- Configurações de Qualificação
    config_qualificacao JSONB DEFAULT '{
        "estagios_qualificacao": ["FE", "DOR", "RESILIENCIA"],
        "triggers_automaticos": true,
        "score_minimo_qualificacao": 60.0,
        "tempo_resposta_horas": 2,
        "max_tentativas_diarias": 3
    }',
    
    -- Configurações de Assets
    config_assets JSONB DEFAULT '{
        "geracao_automatica": true,
        "validacao_humana": false,
        "modelos_ia": ["yara-vision", "yara-text", "yara-video"],
        "qualidade_minima": 0.7,
        "golden_ratio_validation": true,
        "max_assets_por_lead": 10
    }',
    
    -- Configurações de Decision Engine
    config_decision_engine JSONB DEFAULT '{
        "modelo_padrao": "ensemble_voting",
        "threshold_automatico": 0.8,
        "validacao_humana_obrigatoria": false,
        "escalas_decisao": ["baixo", "medio", "alto"],
        "tempo_maximo_decisao_segundos": 30
    }',
    
    -- Configurações de Entrega
    config_entrega JSONB DEFAULT '{
        "canais_prioridade": ["whatsapp", "email", "sms"],
        "entrega_imediata": true,
        "personalizacao_conteudo": true,
        "agendamento_entrega": true,
        "rastreamento_entrega": true
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

-- Logs de Automação
CREATE TABLE IF NOT EXISTS public.logs_automação (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    log_id TEXT UNIQUE NOT NULL,
    config_id UUID REFERENCES public.configuracao_automação(id) ON DELETE SET NULL,
    
    -- Detalhes da Automação
    tipo_automação TEXT NOT NULL, -- 'direct_disparo', 'lead_qualification', 'asset_generation', 'decision_engine', 'content_delivery'
    origem_automação TEXT NOT NULL, -- 'edge_function', 'cron_job', 'webhook', 'manual'
    
    -- Contexto da Operação
    lead_id UUID,
    usuario_id UUID,
    dados_entrada JSONB DEFAULT '{}',
    
    -- Resultado da Operação
    resultado_operacao JSONB DEFAULT '{}',
    status_operacao TEXT NOT NULL, -- 'sucesso', 'fracasso', 'parcial', 'pendente'
    erro_operacao TEXT,
    
    -- Performance
    tempo_execucao_ms INTEGER DEFAULT 0,
    custo_operacional DECIMAL(10,8) DEFAULT 0.0001,
    tokens_utilizados INTEGER DEFAULT 0,
    
    -- Timestamps
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    
    -- Status
    status_log TEXT DEFAULT 'ativo', -- 'ativo', 'concluido', 'erro'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_log TEXT UNIQUE
);

-- =====================================================
-- VALIDAÇÃO FINAL (GATEKEEPER)
-- =====================================================

-- Configuração do Gatekeeper
CREATE TABLE IF NOT EXISTS public.configuracao_gatekeeper (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    nome_config TEXT NOT NULL,
    
    -- Regras de Validação
    regras_validacao JSONB DEFAULT '{
        "gera_conexao": {
            "enabled": true,
            "min_interacoes": 3,
            "min_engajamento": 50.0,
            "min_dias_ciclo": 14
        },
        "tomada_decisao": {
            "enabled": true,
            "min_score_ciclo": 60.0,
            "min_probabilidade": 0.7,
            "validacao_humana": false
        },
        "conversao_imovel": {
            "enabled": true,
            "min_score_decisao": 80.0,
            "validacao_documentos": true,
            "validacao_financiamento": true
        },
        "bloqueio_saida": {
            "enabled": true,
            "motivos_bloqueio": ["baixo_score", "documentos_pendentes", "risco_alto"],
            "avisar_usuario": true
        }
    }',
    
    -- Configurações de Loop
    config_loop JSONB DEFAULT '{
        "refinamento_automatico": true,
        "max_iteracoes": 3,
        "melhoria_threshold": 0.05,
        "feedback_loop": true
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

-- Logs de Validação do Gatekeeper
CREATE TABLE IF NOT EXISTS public.logs_validacao_gatekeeper (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    validacao_id TEXT UNIQUE NOT NULL,
    config_id UUID REFERENCES public.configuracao_gatekeeper(id) ON DELETE SET NULL,
    
    -- Contexto da Validação
    lead_id UUID NOT NULL,
    usuario_id UUID NOT NULL,
    tipo_validacao TEXT NOT NULL, -- 'gera_conexao', 'tomada_decisao', 'conversao_imovel', 'bloqueio_saida'
    
    -- Resultado da Validação
    resultado_validacao TEXT NOT NULL, -- 'aprovado', 'rejeitado', 'pendente', 'bloqueado'
    detalhes_validacao JSONB DEFAULT '{}',
    proximos_passos TEXT[] DEFAULT '{}',
    
    -- Loop de Refinamento
    iteracao_atual INTEGER DEFAULT 0,
    feedback_recebido TEXT,
    melhoria_aplicada BOOLEAN DEFAULT false,
    
    -- Timestamps
    data_validacao TIMESTAMPTZ DEFAULT NOW(),
    data_proxima_validacao TIMESTAMPTZ,
    
    -- Status
    status_validacao TEXT DEFAULT 'pendente', -- 'pendente', 'concluida', 'erro'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_validacao TEXT UNIQUE
);

-- =====================================================
-- REINO SB & PROPÓSITO JESUS CRISTO
-- =====================================================

-- Tesouro Reino SB V31 (Atualizado com ASEC)
CREATE TABLE IF NOT EXISTS public.tesouro_reino_jesus_cristo_v31 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    mes_referencia DATE UNIQUE NOT NULL,
    
    -- Faturamento Consolidado (15 Fontes: 14 V30 + ASEC)
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
    faturamento_economia_tokens DECIMAL(15,2) DEFAULT 0.00,
    faturamento_asec_patrimonial DECIMAL(15,2) DEFAULT 0.00, -- NOVO: ASEC + Patrimonial
    faturamento_conteudo_digital DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Conteúdo Digital
    
    -- Totais
    faturamento_bruto_total DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_venda_match + faturamento_recorrencia_5x5 + faturamento_short_stay + 
        faturamento_administracao + faturamento_marketplace_servicos + faturamento_land_banking + 
        faturamento_equity_fundo + faturamento_selo_juris + faturamento_data_sub + 
        faturamento_antecipacao + faturamento_seguros + faturamento_financiamento_bancario + 
        faturamento_prestadores_servicos + faturamento_taxa_conveniencia + faturamento_economia_tokens + 
        faturamento_asec_patrimonial + faturamento_conteudo_digital
    ) STORED,
    
    -- Deduções
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    splits_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    royalties_pagos DECIMAL(15,2) DEFAULT 0.00,
    reparos_danos_pagos DECIMAL(15,2) DEFAULT 0.00,
    taxes_conveniencia_devolvidas DECIMAL(15,2) DEFAULT 0.00,
    custos_automacao DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Custos de automação
    custos_conteudo_digital DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Custos de conteúdo digital
    
    -- Faturamento Líquido
    faturamento_liquido DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_bruto_total - custos_operacionais - splits_distribuidos - 
        royalties_pagos - reparos_danos_pagos - taxes_conveniencia_devolvidas - 
        custos_automacao - custos_conteudo_digital
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
    destinacao_tecnologia_social DECIMAL(15,2) DEFAULT 0.00,
    destinacao_obras_sociais DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Obras Sociais
    destinacao_educacao_crista DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Educação Cristã
    destinacao_acao_caridade DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Ação Caridade
    
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

-- Projetos do Reino Jesus Cristo V31
CREATE TABLE IF NOT EXISTS public.projetos_reino_jesus_cristo_v31 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    projeto_id TEXT UNIQUE NOT NULL,
    tesouro_id UUID REFERENCES public.tesouro_reino_jesus_cristo_v31(id) ON DELETE CASCADE,
    
    -- Detalhes do Projeto
    nome_projeto TEXT NOT NULL,
    tipo_projeto TEXT NOT NULL, -- 'igreja_local', 'obra_missionaria', 'ajuda_desamparados', 'evangelizacao', 'acao_social', 'capacitacao_prestadores', 'tecnologia_social', 'obras_sociais', 'educacao_crista', 'acao_caridade'
    descricao_projeto TEXT NOT NULL,
    
    -- Localização
    localizacao TEXT,
    cidade TEXT,
    estado TEXT,
    pais TEXT DEFAULT 'Brasil',
    coordinates POINT,
    
    -- Metas
    meta_arrecadacao DECIMAL(15,2) DEFAULT 0.00,
    meta_beneficiarios INTEGER DEFAULT 0,
    data_inicio_projeto DATE,
    data_fim_projeto DATE,
    
    -- Progresso
    valor_arrecadado DECIMAL(15,2) DEFAULT 0.00,
    beneficiarios_atendidos INTEGER DEFAULT 0,
    percentual_conclusao DECIMAL(5,2) DEFAULT 0.00,
    
    -- Status
    status_projeto TEXT DEFAULT 'planejado', -- 'planejado', 'em_andamento', 'concluido', 'suspenso', 'cancelado'
    data_inicio_real DATE,
    data_conclusao_real DATE,
    
    -- Responsáveis
    gestor_projeto_id UUID,
    voluntarios_participantes INTEGER DEFAULT 0,
    
    -- Financeiro
    orcamento_total DECIMAL(15,2) DEFAULT 0.00,
    valor_gasto DECIMAL(15,2) DEFAULT 0.00,
    saldo_disponivel DECIMAL(15,2) DEFAULT 0.00,
    
    -- Impacto
    descricao_impacto TEXT,
    depoimentos_beneficiarios TEXT,
    midias_divulgacao TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_projeto TEXT UNIQUE
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash de Configuração Sequência
CREATE OR REPLACE FUNCTION public.gerar_hash_config_sequencia()
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

CREATE TRIGGER trigger_gerar_hash_config_sequencia
    BEFORE INSERT ON public.configuracao_sequencia_operacional
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_sequencia();

-- Trigger para gerar hash de Ciclo de Conteúdo
CREATE OR REPLACE FUNCTION public.gerar_hash_ciclo_conteudo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_ciclo := encode(sha256(
        NEW.ciclo_id || 
        NEW.lead_id::TEXT || 
        NEW.estagio_atual || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_ciclo_conteudo
    BEFORE INSERT ON public.ciclo_conteudo_lead
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_ciclo_conteudo();

-- Trigger para gerar hash de Configuração Motor Visual
CREATE OR REPLACE FUNCTION public.gerar_hash_config_motor_visual()
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

CREATE TRIGGER trigger_gerar_hash_config_motor_visual
    BEFORE INSERT ON public.configuracao_motor_visual
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_motor_visual();

-- Trigger para gerar hash de Assets Gerados
CREATE OR REPLACE FUNCTION public.gerar_hash_asset_gerado()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_asset := encode(sha256(
        NEW.asset_id || 
        NEW.lead_id::TEXT || 
        NEW.tipo_asset || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_asset_gerado
    BEFORE INSERT ON public.assets_gerados_ia
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_asset_gerado();

-- Trigger para gerar hash de Configuração Engenharia Decisão
CREATE OR REPLACE FUNCTION public.gerar_hash_config_engenharia_decisao()
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

CREATE TRIGGER trigger_gerar_hash_config_engenharia_decisao
    BEFORE INSERT ON public.configuracao_engenharia_decisao
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_engenharia_decisao();

-- Trigger para gerar hash de Histórico de Decisões
CREATE OR REPLACE FUNCTION public.gerar_hash_historico_decisoes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_decisao := encode(sha256(
        NEW.decisao_id || 
        NEW.lead_id::TEXT || 
        NEW.modelo_utilizado || 
        NEW.decisao_automatica || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_historico_decisoes
    BEFORE INSERT ON public.historico_decisoes_automaticas
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_historico_decisoes();

-- Trigger para gerar hash de Configuração Automação
CREATE OR REPLACE FUNCTION public.gerar_hash_config_automação()
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

CREATE TRIGGER trigger_gerar_hash_config_automação
    BEFORE INSERT ON public.configuracao_automação
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_automação();

-- Trigger para gerar hash de Logs Automação
CREATE OR REPLACE FUNCTION public.gerar_hash_logs_automação()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_log := encode(sha256(
        NEW.log_id || 
        NEW.tipo_automação || 
        NEW.lead_id::TEXT || 
        NEW.status_operacao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_logs_automação
    BEFORE INSERT ON public.logs_automação
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_logs_automação();

-- Trigger para gerar hash de Configuração Gatekeeper
CREATE OR REPLACE FUNCTION public.gerar_hash_config_gatekeeper()
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

CREATE TRIGGER trigger_gerar_hash_config_gatekeeper
    BEFORE INSERT ON public.configuracao_gatekeeper
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_gatekeeper();

-- Trigger para gerar hash de Logs Validação Gatekeeper
CREATE OR REPLACE FUNCTION public.gerar_hash_logs_validacao_gatekeeper()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_validacao := encode(sha256(
        NEW.validacao_id || 
        NEW.lead_id::TEXT || 
        NEW.tipo_validacao || 
        NEW.resultado_validacao || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_logs_validacao_gatekeeper
    BEFORE INSERT ON public.logs_validacao_gatekeeper
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_logs_validacao_gatekeeper();

-- Trigger para gerar hash de Tesouro V31
CREATE OR REPLACE FUNCTION public.gerar_hash_tesouro_v31()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_tesouro := encode(sha256(
        NEW.mes_referencia::TEXT || 
        NEW.faturamento_bruto_total::TEXT || 
        NEW.faturamento_liquido::TEXT || 
        NEW.valor_contribuicao::TEXT || 
        NEW.faturamento_asec_patrimonial::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_tesouro_v31
    BEFORE INSERT ON public.tesouro_reino_jesus_cristo_v31
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_tesouro_v31();

-- Trigger para gerar hash de Projeto V31
CREATE OR REPLACE FUNCTION public.gerar_hash_projeto_v31()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_projeto := encode(sha256(
        NEW.projeto_id || 
        NEW.nome_projeto || 
        NEW.tipo_projeto || 
        NEW.valor_arrecadado::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_projeto_v31
    BEFORE INSERT ON public.projetos_reino_jesus_cristo_v31
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_projeto_v31();

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_config_sequencia_status ON public.configuracao_sequencia_operacional(status_config);
CREATE INDEX IF NOT EXISTS idx_ciclo_conteudo_lead ON public.ciclo_conteudo_lead(lead_id, estagio_atual);
CREATE INDEX IF NOT EXISTS idx_ciclo_conteudo_progresso ON public.ciclo_conteudo_lead(progresso_ciclo, status_ciclo);
CREATE INDEX IF NOT EXISTS idx_ciclo_conteudo_data ON public.ciclo_conteudo_lead(data_entrada_estagio, data_saida_estagio);
CREATE INDEX IF NOT EXISTS idx_config_motor_visual_status ON public.configuracao_motor_visual(status_config);
CREATE INDEX IF NOT EXISTS idx_assets_gerados_lead ON public.assets_gerados_ia(lead_id, status_asset);
CREATE INDEX IF NOT EXISTS idx_assets_gerados_tipo ON public.assets_gerados_ia(tipo_asset, status_asset);
CREATE INDEX IF NOT EXISTS idx_assets_gerados_categoria ON public.assets_gerados_ia(categoria_autoridade, status_asset);
CREATE INDEX IF NOT EXISTS idx_config_engenharia_status ON public.configuracao_engenharia_decisao(status_config);
CREATE INDEX IF NOT EXISTS idx_historico_decisoes_lead ON public.historico_decisoes_automaticas(lead_id, status_decisao);
CREATE INDEX IF NOT EXISTS idx_historico_decisoes_data ON public.historico_decisoes_automaticas(data_inicio, data_conclusao);
CREATE INDEX IF NOT EXISTS idx_config_automação_status ON public.configuracao_automação(status_config);
CREATE INDEX IF NOT EXISTS idx_logs_automação_tipo ON public.logs_automação(tipo_automação, status_log);
CREATE INDEX IF NOT EXISTS idx_logs_automação_data ON public.logs_automação(data_inicio, data_conclusao);
CREATE INDEX IF NOT EXISTS idx_config_gatekeeper_status ON public.configuracao_gatekeeper(status_config);
CREATE INDEX IF NOT EXISTS idx_logs_validacao_lead ON public.logs_validacao_gatekeeper(lead_id, status_validacao);
CREATE INDEX IF NOT EXISTS idx_logs_validacao_tipo ON public.logs_validacao_gatekeeper(tipo_validacao, status_validacao);
CREATE INDEX IF NOT EXISTS idx_logs_validacao_data ON public.logs_validacao_gatekeeper(data_validacao, data_proxima_validacao);
CREATE INDEX IF NOT EXISTS idx_tesouro_mes_v31 ON public.tesouro_reino_jesus_cristo_v31(mes_referencia, status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_tesouro_faturamento ON public.tesouro_reino_jesus_cristo_v31(faturamento_bruto_total, status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_projetos_tesouro_v31 ON public.projetos_reino_jesus_cristo_v31(tesouro_id, status_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_status_v31 ON public.projetos_reino_jesus_cristo_v31(status_projeto, data_inicio_real);
CREATE INDEX IF NOT EXISTS idx_projetos_localizacao_v31 ON public.projetos_reino_jesus_cristo_v31 USING GIST(coordinates);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Configuração da Sequência Operacional
INSERT INTO public.configuracao_sequencia_operacional (
    config_id,
    nome_config,
    estagios_sequencia,
    configuracao_estagios,
    trava_estagio_final,
    estagio_final_travado,
    status_config,
    data_ativacao
) VALUES
('SEQ-ASEC-001', 'Sequência Operacional ASEC', 
 ARRAY['FE', 'DOR', 'RESILIENCIA', 'FAMILIA', 'DECISAO', 'IMOVEL'],
 '{
        "FE": {
            "duracao_dias": 7,
            "objetivo": "Direção Espiritual",
            "acoes_obrigatorias": ["oracao", "jejum", "caridade"],
            "kpi_conversao": 0.05
        },
        "DOR": {
            "duracao_dias": 14,
            "objetivo": "Identificação da Dor",
            "acoes_obrigatorias": ["diagnostico", "prospecao", "mapeamento_dor"],
            "kpi_conversao": 0.10
        },
        "RESILIENCIA": {
            "duracao_dias": 21,
            "objetivo": "Construção de Resiliência",
            "acoes_obrigatorias": ["planejamento", "disciplina", "persistencia"],
            "kpi_conversao": 0.15
        },
        "FAMILIA": {
            "duracao_dias": 30,
            "objetivo": "Profundidade Familiar",
            "acoes_obrigatorias": ["conversa_familiar", "compromisso", "visita"],
            "kpi_conversao": 0.25
        },
        "DECISAO": {
            "duracao_dias": 14,
            "objetivo": "Tomada de Decisão",
            "acoes_obrigatorias": ["proposta_comercial", "negociacao", "fechamento"],
            "kpi_conversao": 0.30
        },
        "IMOVEL": {
            "duracao_dias": 45,
            "objetivo": "Conversão do Imóvel",
            "acoes_obrigatorias": ["visita", "proposta", "contrato", "financiamento"],
            "kpi_conversao": 0.15
        }
    }',
 true, 'IMOVEL', 'ativo', CURRENT_DATE);

-- Inserir Configuração do Motor Visual
INSERT INTO public.configuracao_motor_visual (
    config_id,
    nome_config,
    paleta_autoridade,
    layout_responsivo,
    acessibilidade,
    status_config,
    data_ativacao
) VALUES
('MOTOR-VISUAL-001', 'Motor Visual Golden Ratio',
 '{
        "preto": {
            "hex": "#000000",
            "rgb": [0, 0, 0],
            "significado": "Autoridade Absoluta",
            "uso": "contratos, documentos legais"
        },
        "branco_dourado": {
            "hex": "#FFD700",
            "rgb": [255, 215, 0],
            "significado": "Sabedoria Divina",
            "uso": "propostas finais, decisões"
        },
        "azul_celeste": {
            "hex": "#4169E1",
            "rgb": [65, 105, 225],
            "significado": "Confiança Celestial",
            "uso": "testemunhos, depoimentos"
        },
        "verde_jade": {
            "hex": "#00A86B",
            "rgb": [0, 168, 107],
            "significado": "Equilíbrio Espiritual",
            "uso": "conteúdo educativo, planejamento"
        },
        "coral": {
            "hex": "#FF7F50",
            "rgb": [255, 127, 80],
            "significado": "Urgência Emocional",
            "uso": "chamadas para ação"
        }
    }',
 '{
        "mobile": {
            "fonte_tamanho_base": 16,
            "espacamento_linha": 1.5,
            "margem_segura": 20
        },
        "desktop": {
            "fonte_tamanho_base": 14,
            "espacamento_linha": 1.2,
            "margem_segura": 15
        },
        "tablet": {
            "fonte_tamanho_base": 15,
            "espacamento_linha": 1.3,
            "margem_segura": 18
        }
    }',
 '{
        "alto_contraste": true,
        "fonte_legivel": true,
        "navegacao_teclado": true,
        "leitor_tela": true,
        "descricao_imagens": true
    }',
 'ativo', CURRENT_DATE);

-- Inserir Configuração da Engenharia de Decisão
INSERT INTO public.configuracao_engenharia_decisao (
    config_id,
    nome_config,
    modelos_ativos,
    parametros_modelos,
    filtros_decisao,
    termos_substituicao,
    status_config,
    data_ativacao
) VALUES
('ENG-DECISAO-001', 'Engenharia de Decisão Patrimonial',
 ARRAY['regressao_logistica', 'arvore_decisao', 'redes_neurais', 'ensemble_voting'],
 '{
        "regressao_logistica": {
            "features": ["renda", "idade", "patrimonio", "score_ciclo", "engajamento"],
            "target": "probabilidade_venda",
            "threshold_decisao": 0.7
        },
        "arvore_decisao": {
            "max_profundidade": 5,
            "min_samples_leaf": 10,
            "criterion": "gini"
        },
        "redes_neurais": {
            "camadas_ocultas": [64, 32, 16],
            "funcao_ativacao": "relu",
            "dropout_rate": 0.2
        },
        "ensemble_voting": {
            "modelos": ["regressao", "arvore", "rede_neural"],
            "pesos": [0.4, 0.3, 0.3]
        }
    }',
 '{
        "faixa_renda": [1000, 10000000],
        "idade_minima": 18,
        "idade_maxima": 80,
        "score_minimo_ciclo": 30.0,
        "engajamento_minimo": 50.0,
        "patrimonio_minimo": 50000.00
    }',
 '{
        "venda_imoveis": {
            "enabled": true,
            "termos_originais": ["compra", "venda", "financiamento"],
            "termos_novos": ["conducao_patrimonial", "decisao_automatica", "transferencia_direta"]
        },
        "financiamento": {
            "enabled": true,
            "substituicao_automatica": true,
            "validacao_cadastro": true
        }
    }',
 'ativo', CURRENT_DATE);

-- Inserir Configuração de Automação
INSERT INTO public.configuracao_automação (
    config_id,
    nome_config,
    edge_functions_habilitadas,
    config_direct,
    config_qualificacao,
    config_assets,
    config_decision_engine,
    config_entrega,
    status_config,
    data_ativacao
) VALUES
('AUTOMACAO-001', 'Automação Completa SB',
 ARRAY['direct_disparo', 'lead_qualification', 'asset_generation', 'decision_engine', 'content_delivery'],
 '{
        "instagram": {
            "enabled": true,
            "business_account": "@sb_imoveis",
            "auto_reply": true,
            "story_templates": 5,
            "regras_engajamento": ["resposta_rapida", "conteudo_personalizado"]
        },
        "linkedin": {
            "enabled": true,
            "company_page": "security-broker-sb",
            "auto_connect": true,
            "inmail_personalizado": true,
            "regras_conexao": ["perfil_alvo", "mensagem_contextual"]
        },
        "facebook": {
            "enabled": false,
            "page_id": null,
            "auto_post": false
        }
    }',
 '{
        "estagios_qualificacao": ["FE", "DOR", "RESILIENCIA"],
        "triggers_automaticos": true,
        "score_minimo_qualificacao": 60.0,
        "tempo_resposta_horas": 2,
        "max_tentativas_diarias": 3
    }',
 '{
        "geracao_automatica": true,
        "validacao_humana": false,
        "modelos_ia": ["yara-vision", "yara-text", "yara-video"],
        "qualidade_minima": 0.7,
        "golden_ratio_validation": true,
        "max_assets_por_lead": 10
    }',
 '{
        "modelo_padrao": "ensemble_voting",
        "threshold_automatico": 0.8,
        "validacao_humana_obrigatoria": false,
        "escalas_decisao": ["baixo", "medio", "alto"],
        "tempo_maximo_decisao_segundos": 30
    }',
 '{
        "canais_prioridade": ["whatsapp", "email", "sms"],
        "entrega_imediata": true,
        "personalizacao_conteudo": true,
        "agendamento_entrega": true,
        "rastreamento_entrega": true
    }',
 'ativo', CURRENT_DATE);

-- Inserir Configuração do Gatekeeper
INSERT INTO public.configuracao_gatekeeper (
    config_id,
    nome_config,
    regras_validacao,
    config_loop,
    status_config,
    data_ativacao
) VALUES
('GATEKEEPER-001', 'Gatekeeper de Validação Final',
 '{
        "gera_conexao": {
            "enabled": true,
            "min_interacoes": 3,
            "min_engajamento": 50.0,
            "min_dias_ciclo": 14
        },
        "tomada_decisao": {
            "enabled": true,
            "min_score_ciclo": 60.0,
            "min_probabilidade": 0.7,
            "validacao_humana": false
        },
        "conversao_imovel": {
            "enabled": true,
            "min_score_decisao": 80.0,
            "validacao_documentos": true,
            "validacao_financiamento": true
        },
        "bloqueio_saida": {
            "enabled": true,
            "motivos_bloqueio": ["baixo_score", "documentos_pendentes", "risco_alto"],
            "avisar_usuario": true
        }
    }',
 '{
        "refinamento_automatico": true,
        "max_iteracoes": 3,
        "melhoria_threshold": 0.05,
        "feedback_loop": true
    }',
 'ativo', CURRENT_DATE);

-- Inserir Tesouro Reino Jesus Cristo V31 de exemplo
INSERT INTO public.tesouro_reino_jesus_cristo_v31 (
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
    faturamento_asec_patrimonial,
    faturamento_conteudo_digital,
    status_contribuicao,
    data_calculo,
    data_provisionamento,
    destinacao_igrejas_locais,
    destinacao_obra_missionaria,
    destinacao_ajuda_desamparados,
    destinacao_evangelizacao,
    destinacao_acao_social,
    destinacao_capacitacao_prestadores,
    destinacao_tecnologia_social,
    destinacao_obras_sociais,
    destinacao_educacao_crista,
    destinacao_acao_caridade
) VALUES
(DATE_TRUNC('month', CURRENT_DATE)::DATE, 150000.00, 85000.00, 45000.00, 35000.00, 25000.00, 180000.00, 95000.00, 15000.00, 22000.00, 12000.00, 28000.00, 75000.00, 75000.00, 8500.00, 12000.00, 45000.00, 25000.00, 'provisionado', CURRENT_DATE, CURRENT_DATE, 25000.00, 20000.00, 15000.00, 10000.00, 10000.00, 5000.00, 5000.00, 3000.00, 2000.00),
(DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 135000.00, 75000.00, 42000.00, 32000.00, 22000.00, 165000.00, 85000.00, 13500.00, 20000.00, 11000.00, 25000.00, 68000.00, 58000.00, 78000.00, 70000.00, 8000.00, 10000.00, 'destinado', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 22000.00, 18000.00, 13000.00, 8000.00, 4500.00, 3000.00, 2000.00);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB CONVERSION ENGINE V31 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.configuracao_sequencia_operacional) as total_configuracoes_sequencia,
       (SELECT COUNT(*) FROM public.ciclo_conteudo_lead) as total_ciclos_conteudo,
       (SELECT COUNT(*) FROM public.configuracao_motor_visual) as total_configuracoes_motor_visual,
       (SELECT COUNT(*) FROM public.assets_gerados_ia) as total_assets_gerados,
       (SELECT COUNT(*) FROM public.configuracao_engenharia_decisao) as total_configuracoes_engenharia,
       (SELECT COUNT(*) FROM public.historico_decisoes_automaticas) as total_historico_decisoes,
       (SELECT COUNT(*) FROM public.configuracao_automação) as total_configuracoes_automação,
       (SELECT COUNT(*) FROM public.logs_automação) as total_logs_automação,
       (SELECT COUNT(*) FROM public.configuracao_gatekeeper) as total_configuracoes_gatekeeper,
       (SELECT COUNT(*) FROM public.logs_validacao_gatekeeper) as total_logs_validacao_gatekeeper,
       (SELECT COUNT(*) FROM public.tesouro_reino_jesus_cristo_v31) as total_tesouro_reino_jesus_cristo_v31,
       (SELECT COUNT(*) FROM public.projetos_reino_jesus_cristo_v31) as total_projetos_reino_jesus_cristo_v31;
