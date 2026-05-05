-- 🏛️ SECURITY BROKER SB v26 - GOLDEN MASTER (FULL STACK REAL ESTATE)
-- Schema completo para fusão final de todos os módulos - Versão Golden Master

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABELAS DE ESTRUTURA FINANCEIRA E MATRIZ (REVISÃO TOTAL)
-- =====================================================

-- Split de 4 Vias (10/30/40/20)
CREATE TABLE IF NOT EXISTS public.split_4_vias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação da Transação
    transacao_id UUID NOT NULL,
    tipo_transacao TEXT NOT NULL, -- 'venda', 'financiamento', 'match'
    data_transacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Participantes
    captador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    parceiro_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    vendedor_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    
    -- Valores
    valor_total DECIMAL(15,2) NOT NULL,
    
    -- Split de 4 Vias
    captador_percent DECIMAL(5,2) DEFAULT 10.0,
    parceiro_percent DECIMAL(5,2) DEFAULT 30.0,
    vendedor_percent DECIMAL(5,2) DEFAULT 40.0,
    sb_percent DECIMAL(5,2) DEFAULT 20.0,
    
    -- Valores Calculados
    captador_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * captador_percent / 100) STORED,
    parceiro_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * parceiro_percent / 100) STORED,
    vendedor_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * vendedor_percent / 100) STORED,
    sb_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * sb_percent / 100) STORED,
    
    -- Retenção 70/30 sobre créditos de aceleração
    creditos_aceleracao DECIMAL(15,2) DEFAULT 0.00,
    creditos_retidos_70 DECIMAL(15,2) GENERATED ALWAYS AS (creditos_aceleracao * 0.70) STORED,
    creditos_liberados_30 DECIMAL(15,2) GENERATED ALWAYS AS (creditos_aceleracao * 0.30) STORED,
    
    -- Status
    status_split TEXT DEFAULT 'pendente', -- 'pendente', 'processado', 'distribuido', 'cancelado'
    data_processamento TIMESTAMPTZ,
    data_distribuicao TIMESTAMPTZ,
    
    -- Hash Imutável
    hash_split TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_total_percent CHECK (captador_percent + parceiro_percent + vendedor_percent + sb_percent = 100.00)
);

-- Recorrência 5x5 com Árvore de Distribuição
CREATE TABLE IF NOT EXISTS public.recorrencia_5x5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    broker_origem_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL,
    
    -- Árvore de Distribuição (Nível 1 a 5)
    nivel_1_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    nivel_1_percent DECIMAL(5,2) DEFAULT 5.0,
    nivel_1_valor DECIMAL(15,2) DEFAULT 0.00,
    
    nivel_2_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    nivel_2_percent DECIMAL(5,2) DEFAULT 2.0,
    nivel_2_valor DECIMAL(15,2) DEFAULT 0.00,
    
    nivel_3_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    nivel_3_percent DECIMAL(5,2) DEFAULT 1.5,
    nivel_3_valor DECIMAL(15,2) DEFAULT 0.00,
    
    nivel_4_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    nivel_4_percent DECIMAL(5,2) DEFAULT 1.0,
    nivel_4_valor DECIMAL(15,2) DEFAULT 0.00,
    
    nivel_5_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    nivel_5_percent DECIMAL(5,2) DEFAULT 0.5,
    nivel_5_valor DECIMAL(15,2) DEFAULT 0.00,
    
    -- Valores Totais
    valor_total_distribuido DECIMAL(15,2) DEFAULT 0.00,
    valor_retenido_sb DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status
    status_distribuicao TEXT DEFAULT 'pendente', -- 'pendente', 'processada', 'finalizada'
    data_distribuicao TIMESTAMPTZ,
    
    -- Hash
    hash_recorrencia TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_total_percent_recorrencia CHECK (
        nivel_1_percent + nivel_2_percent + nivel_3_percent + nivel_4_percent + nivel_5_percent = 10.0
    )
);

-- White Label e Royalties Tecnológicos (6% a 10%)
CREATE TABLE IF NOT EXISTS public.white_label_royalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Imobiliária
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Configuração de Royalties
    royalty_percent DECIMAL(5,2) NOT NULL, -- 6% a 10%
    faturamento_tecnologia DECIMAL(15,2) NOT NULL,
    
    -- Cálculo de Royalties
    valor_royalty DECIMAL(15,2) GENERATED ALWAYS AS (faturamento_tecnologia * royalty_percent / 100) STORED,
    
    -- Deduções Permitidas
    deducoes_permitidas DECIMAL(15,2) DEFAULT 0.00,
    valor_base_calculo DECIMAL(15,2) GENERATED ALWAYS AS (faturamento_tecnologia - deducoes_permitidas) STORED,
    valor_royalty_ajustado DECIMAL(15,2) GENERATED ALWAYS AS ((faturamento_tecnologia - deducoes_permitidas) * royalty_percent / 100) STORED,
    
    -- Período
    mes_referencia DATE NOT NULL,
    ano_referencia INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM mes_referencia)) STORED,
    
    -- Status
    status_royalty TEXT DEFAULT 'pendente', -- 'pendente', 'calculado', 'faturado', 'pago'
    data_vencimento DATE,
    data_pagamento DATE,
    
    -- Hash
    hash_royalty TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_royalty_percent CHECK (royalty_percent >= 6.0 AND royalty_percent <= 10.0)
);

-- =====================================================
-- TABELAS DE INTELIGÊNCIA E GOVERNANÇA (YARA & JUR)
-- =====================================================

-- Roleta da Yara - Distribuição Meritocrática
CREATE TABLE IF NOT EXISTS public.roleta_yara_meritocracia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Configuração da Roleta
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    nome_configuracao TEXT NOT NULL,
    status_configuracao TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'manutencao'
    
    -- Critérios de Distribuição
    peso_performance DECIMAL(5,2) DEFAULT 40.0, -- 40%
    peso_conversao DECIMAL(5,2) DEFAULT 25.0, -- 25%
    peso_tempo_resposta DECIMAL(5,2) DEFAULT 20.0, -- 20%
    peso_disponibilidade DECIMAL(5,2) DEFAULT 15.0, -- 15%
    
    -- Limites e Controles
    maximo_leads_dia INTEGER DEFAULT 50,
    maximo_leads_corretor INTEGER DEFAULT 10,
    minimo_score_performance DECIMAL(5,2) DEFAULT 70.0,
    
    -- Horários de Operação
    horario_inicio TIME DEFAULT '08:00:00',
    horario_fim TIME DEFAULT '18:00:00',
    dias_operacao TEXT[] DEFAULT '{1,2,3,4,5}', -- Seg-Sex
    
    -- Corretores Prioritários e Excluídos
    corretores_prioritarios UUID[] DEFAULT '{}',
    corretores_excluidos UUID[] DEFAULT '{}',
    
    -- Hash
    hash_configuracao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_total_peso CHECK (peso_performance + peso_conversao + peso_tempo_resposta + peso_disponibilidade = 100.0)
);

-- Nexo Causal Georreferenciado com GPS e SHA-256
CREATE TABLE IF NOT EXISTS public.nexo_causal_georreferenciado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    
    -- Check-in de Visita com GPS
    data_visita TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    precisao_gps DECIMAL(5,2) DEFAULT 0.00, -- metros
    
    -- Timestamp SHA-256
    timestamp_visita TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_timestamp TEXT NOT NULL,
    
    -- Dados da Visita
    duracao_visita INTEGER DEFAULT 0, -- minutos
    tipo_visita TEXT NOT NULL, -- 'visita_inicial', 'visita_tecnica', 'visita_negociacao'
    status_visita TEXT DEFAULT 'em_andamento', -- 'em_andamento', 'concluida', 'cancelada'
    
    -- Interações
    interacoes_registradas JSONB DEFAULT '{}',
    documentos_anexados TEXT[] DEFAULT '{}',
    fotos_visita TEXT[] DEFAULT '{}',
    
    -- Georreferenciamento
    endereco_visita TEXT,
    bairro_visita TEXT,
    cidade_visita TEXT,
    estado_visita TEXT,
    cep_visita TEXT,
    
    -- Validação Jurídica
    nexo_estabelecido BOOLEAN DEFAULT false,
    forca_nexo TEXT, -- 'forte', 'medio', 'fraco'
    evidencias_coletadas TEXT[] DEFAULT '{}',
    
    -- Art. 725 CC - Proteção de Comissão
    artigo_725_aplicavel BOOLEAN DEFAULT true,
    comissao_protegida BOOLEAN DEFAULT false,
    
    -- Hash Imutável
    hash_nexo TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DNA do Ativo para Land Banking
CREATE TABLE IF NOT EXISTS public.dna_ativo_landbanking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação do Ativo
    area_id UUID REFERENCES public.areas_disponiveis(id) ON DELETE CASCADE,
    projeto_id UUID REFERENCES public.projetos_sb(id) ON DELETE CASCADE,
    
    -- Histórico Imutável
    data_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo_ativo TEXT NOT NULL, -- 'terreno', 'area_desenvolvimento', 'projeto_misto'
    status_ativo TEXT DEFAULT 'disponivel', -- 'disponivel', 'em_desenvolvimento', 'vendido', 'reservado'
    
    -- Dados Geográficos
    coordenada_central POINT,
    poligono_area POLYGON,
    area_total_m2 DECIMAL(15,2),
    area_construida_m2 DECIMAL(15,2),
    
    -- Histórico de Valores
    valor_compra DECIMAL(15,2),
    data_compra DATE,
    valor_atual_mercado DECIMAL(15,2),
    data_ultima_avaliacao DATE,
    
    -- Desenvolvimento
    potencial_desenvolvimento TEXT, -- 'residencial', 'comercial', 'misto', 'industrial'
    zoneamento_atual TEXT,
    zoneamento_permitido TEXT,
    fator_ocupacao DECIMAL(5,2),
    coeficiente_aproveitamento DECIMAL(5,2),
    
    -- Infraestrutura
    acesso_energia BOOLEAN DEFAULT false,
    acesso_agua BOOLEAN DEFAULT false,
    acesso_esgoto BOOLEAN DEFAULT false,
    acesso_internet BOOLEAN DEFAULT false,
    via_principal_acesso TEXT,
    
    -- Licenças e Documentos
    licencas_ambientais TEXT[] DEFAULT '{}',
    alvaras_construcao TEXT[] DEFAULT '{}',
    escrituras_registros TEXT[] DEFAULT '{}',
    
    -- Timeline de Eventos
    eventos_historicos JSONB DEFAULT '[]',
    
    -- DNA Genético do Ativo
    perfil_investimento TEXT, -- 'conservador', 'moderado', 'agressivo'
    risco_desenvolvimento TEXT, -- 'baixo', 'medio', 'alto'
    horizonte_investimento INTEGER, -- meses
    roi_projetado DECIMAL(5,2), -- percentual ao ano
    
    -- Hash Imutável
    hash_dna TEXT UNIQUE,
    hash_registro TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DAS 10 FRENTES DE MONETIZAÇÃO
-- =====================================================

-- Dashboard Master - Mapeamento de 10 Frentes
CREATE TABLE IF NOT EXISTS public.dashboard_master_monetizacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Período
    data_consolidacao DATE NOT NULL,
    mes_referencia DATE GENERATED ALWAYS AS (DATE_TRUNC('month', data_consolidacao)::DATE) STORED,
    ano_referencia INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data_consolidacao)) STORED,
    
    -- Imobiliária
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- 10 Frentes de Monetização
    frente_1_vendas DECIMAL(15,2) DEFAULT 0.00,
    frente_2_recorrencia DECIMAL(15,2) DEFAULT 0.00,
    frente_3_marketplace DECIMAL(15,2) DEFAULT 0.00,
    frente_4_landbanking DECIMAL(15,2) DEFAULT 0.00,
    frente_5_equity DECIMAL(15,2) DEFAULT 0.00,
    frente_6_mentoria DECIMAL(15,2) DEFAULT 0.00,
    frente_7_selo_juris DECIMAL(15,2) DEFAULT 0.00,
    frente_8_data_intelligence DECIMAL(15,2) DEFAULT 0.00,
    frente_9_antecipacao DECIMAL(15,2) DEFAULT 0.00,
    frente_10_fintech_bancaria DECIMAL(15,2) DEFAULT 0.00,
    
    -- Totais
    total_faturamento DECIMAL(15,2) GENERATED ALWAYS AS (
        frente_1_vendas + frente_2_recorrencia + frente_3_marketplace + 
        frente_4_landbanking + frente_5_equity + frente_6_mentoria + 
        frente_7_selo_juris + frente_8_data_intelligence + frente_9_antecipacao + frente_10_fintech_bancaria
    ) STORED,
    
    -- Custos Operacionais
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    custos_marketing DECIMAL(15,2) DEFAULT 0.00,
    custos_tecnologia DECIMAL(15,2) DEFAULT 0.00,
    custos_pessoal DECIMAL(15,2) DEFAULT 0.00,
    
    -- Lucratividade
    lucro_bruto DECIMAL(15,2) GENERATED ALWAYS AS (total_faturamento - custos_operacionais) STORED,
    margem_lucro DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_faturamento > 0 
            THEN ((total_faturamento - custos_operacionais) / total_faturamento * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Indicadores
    total_transacoes INTEGER DEFAULT 0,
    ticket_medio DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_transacoes > 0 
            THEN total_faturamento / total_transacoes
            ELSE 0 
        END
    ) STORED,
    
    -- Status
    status_consolidacao TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'revisao'
    
    -- Hash
    hash_consolidacao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE GESTÃO DE SUCESSÃO E PATRIMÔNIO
-- =====================================================

-- Gestão de Sucessão e Patrimônio
CREATE TABLE IF NOT EXISTS public.gestao_sucessao_patrimonio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Broker Titular
    broker_titular_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Beneficiário de Rede (Continuidade de Ganhos)
    beneficiario_rede_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Configuração de Sucessão
    tipo_sucessao TEXT NOT NULL, -- 'falecimento', 'aposentadoria', 'saude', 'voluntaria'
    data_inicio_sucessao DATE,
    data_fim_sucessao DATE,
    
    -- Transferência de Patrimônio
    perc_transferencia_ganhos DECIMAL(5,2) DEFAULT 100.0,
    perc_transferencia_rede DECIMAL(5,2) DEFAULT 100.0,
    perc_transferencia_comissoes DECIMAL(5,2) DEFAULT 100.0,
    
    -- Condições de Transferência
    condicao_transferencia TEXT NOT NULL, -- 'imediata', 'gradual', 'apos_periodo'
    periodo_gradual_meses INTEGER DEFAULT 0,
    
    -- Proteção Patrimonial
    valor_patrimonio_transferido DECIMAL(15,2) DEFAULT 0.00,
    valor_comissoes_futuras DECIMAL(15,2) DEFAULT 0.00,
    valor_rede_futura DECIMAL(15,2) DEFAULT 0.00,
    
    -- Documentação Legal
    documento_sucessao TEXT,
    data_documento DATE,
    cartorio_registro TEXT,
    
    -- Testemunhas
    testemunhas TEXT[] DEFAULT '{}',
    documentos_comprobatorios TEXT[] DEFAULT '{}',
    
    -- Status
    status_sucessao TEXT DEFAULT 'pendente', -- 'pendente', 'ativa', 'concluida', 'cancelada'
    data_ativacao DATE,
    data_conclusao DATE,
    
    -- Observações
    observacoes TEXT,
    motivo_cancelamento TEXT,
    
    -- Hash
    hash_sucessao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_total_percent CHECK (
        perc_transferencia_ganhos + perc_transferencia_rede + perc_transferencia_comissoes = 300.0
    )
);

-- =====================================================
-- TABELAS DE TESTE DE ESCALA (500 PRÉDIOS / 500K UNIDADES)
-- =====================================================

-- Teste de Escala - Espelho de Vendas Nacional
CREATE TABLE IF NOT EXISTS public.teste_escala_vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Configuração do Teste
    nome_teste TEXT NOT NULL,
    status_teste TEXT DEFAULT 'em_andamento', -- 'em_andamento', 'concluido', 'falha'
    data_inicio_teste TIMESTAMPTZ DEFAULT NOW(),
    data_fim_teste TIMESTAMPTZ,
    
    -- Parâmetros de Escala
    total_predios INTEGER DEFAULT 500,
    total_unidades INTEGER DEFAULT 500000,
    unidades_por_predio INTEGER DEFAULT 1000,
    
    -- Performance
    latencia_media_ms DECIMAL(8,2) DEFAULT 0.00,
    throughput_transacoes_seg INTEGER DEFAULT 0,
    uso_memoria_mb INTEGER DEFAULT 0,
    uso_cpu_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- Métricas de Vendas
    total_vendas_simuladas INTEGER DEFAULT 0,
    valor_total_vendas DECIMAL(15,2) DEFAULT 0.00,
    taxa_conversao_simulada DECIMAL(5,2) DEFAULT 0.00,
    
    -- Split de 4 Vias
    total_split_processado INTEGER DEFAULT 0,
    tempo_medio_split_ms DECIMAL(8,2) DEFAULT 0.00,
    
    -- Recorrência 5x5
    total_recorrencia_processada INTEGER DEFAULT 0,
    tempo_medio_recorrencia_ms DECIMAL(8,2) DEFAULT 0.00,
    
    -- DNA do Ativo
    total_dna_consultas INTEGER DEFAULT 0,
    tempo_medio_dna_ms DECIMAL(8,2) DEFAULT 0.00,
    
    -- Financiamento Bancário
    total_financiamentos_simulados INTEGER DEFAULT 0,
    valor_total_financiado DECIMAL(15,2) DEFAULT 0.00,
    tempo_medio_financiamento_ms DECIMAL(8,2) DEFAULT 0.00,
    
    -- Resultados
    status_resultado TEXT, -- 'excelente', 'bom', 'regular', 'insuficiente'
    score_performance DECIMAL(5,2) DEFAULT 0.00,
    
    -- Hash
    hash_teste TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalhes do Teste de Escala
CREATE TABLE IF NOT EXISTS public.teste_escala_detalhes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    teste_escala_id UUID REFERENCES public.teste_escala_vendas(id) ON DELETE CASCADE,
    
    -- Tipo de Operação
    tipo_operacao TEXT NOT NULL, -- 'split_4_vias', 'recorrencia_5x5', 'dna_ativo', 'financiamento'
    
    -- Métricas
    operacoes_realizadas INTEGER DEFAULT 0,
    tempo_medio_ms DECIMAL(8,2) DEFAULT 0.00,
    taxa_sucesso DECIMAL(5,2) DEFAULT 0.00,
    erros_ocorridos INTEGER DEFAULT 0,
    
    -- Recursos
    memoria_utilizada_mb INTEGER DEFAULT 0,
    cpu_utilizada_percent DECIMAL(5,2) DEFAULT 0.00,
    conexoes_ativas INTEGER DEFAULT 0,
    
    -- Timestamp
    data_medicao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_medicao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE SOBERANIA SB (100% POWERED BY SB)
-- =====================================================

-- Configuração de Soberania SB
CREATE TABLE IF NOT EXISTS public.configuracao_soberania_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Configuração de Soberania
    modo_soberano TEXT DEFAULT 'total', -- 'total', 'parcial', 'desativado'
    powered_by_sb BOOLEAN DEFAULT true,
    
    -- Branding
    logo_sb_visivel BOOLEAN DEFAULT true,
    nome_sistema TEXT DEFAULT 'Security Broker SB',
    tagline_sistema TEXT DEFAULT 'Powered by SB',
    
    -- Comunicação
    comunicacoes_100_percent_sb BOOLEAN DEFAULT true,
    logs_100_percent_sb BOOLEAN DEFAULT true,
    interface_100_percent_sb BOOLEAN DEFAULT true,
    
    -- Trava LGPD de 2 Anos
    trava_lgpd_ativa BOOLEAN DEFAULT true,
    periodo_trava_meses INTEGER DEFAULT 24,
    data_inicio_trava DATE DEFAULT CURRENT_DATE,
    
    -- Proteção de Ativos
    protecao_ativo_dados BOOLEAN DEFAULT true,
    protecao_ativo_intelectual BOOLEAN DEFAULT true,
    protecao_ativo_comercial BOOLEAN DEFAULT true,
    
    -- Validação de Nomenclatura
    nomenclatura_validada BOOLEAN DEFAULT true,
    nomes_externos_removidos BOOLEAN DEFAULT true,
    
    -- Status
    status_configuracao TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'manutencao'
    data_validacao DATE,
    validador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Hash
    hash_soberania TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Soberania SB
CREATE TABLE IF NOT EXISTS public.logs_soberania_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Configuração
    configuracao_id UUID REFERENCES public.configuracao_soberania_sb(id) ON DELETE CASCADE,
    
    -- Tipo de Log
    tipo_log TEXT NOT NULL, -- 'validacao_nomenclatura', 'remocao_externo', 'trava_lgpd', 'protecao_ativo'
    
    -- Detalhes
    dados_antigos JSONB DEFAULT '{}',
    dados_novos JSONB DEFAULT '{}',
    alteracao_realizada TEXT NOT NULL,
    
    -- Validação
    validacao_sucesso BOOLEAN DEFAULT true,
    motivo_falha TEXT,
    
    -- Responsável
    responsavel_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    data_alteracao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_log TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash do Split de 4 Vias
CREATE OR REPLACE FUNCTION public.gerar_hash_split_4_vias()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_split := encode(sha256(
        NEW.transacao_id::TEXT || 
        NEW.tipo_transacao || 
        NEW.valor_total::TEXT || 
        NEW.captador_percent::TEXT || 
        NEW.parceiro_percent::TEXT || 
        NEW.vendedor_percent::TEXT || 
        NEW.sb_percent::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_split_4_vias
    BEFORE INSERT ON public.split_4_vias
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_split_4_vias();

-- Trigger para processar Split de 4 Vias automaticamente
CREATE OR REPLACE FUNCTION public.processar_split_4_vias()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar status para processado
    NEW.status_split := 'processado';
    NEW.data_processamento := NOW();
    
    -- Se houver créditos de aceleração, aplicar retenção 70/30
    IF NEW.creditos_aceleracao > 0 THEN
        NEW.creditos_retidos_70 := NEW.creditos_aceleracao * 0.70;
        NEW.creditos_liberados_30 := NEW.creditos_aceleracao * 0.30;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_processar_split_4_vias
    BEFORE INSERT ON public.split_4_vias
    FOR EACH ROW
    EXECUTE FUNCTION public.processar_split_4_vias();

-- Trigger para gerar hash do Nexo Causal Georreferenciado
CREATE OR REPLACE FUNCTION public.gerar_hash_nexo_causal_georreferenciado()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar timestamp SHA-256
    NEW.hash_timestamp := encode(sha256(
        NEW.broker_id::TEXT || 
        NEW.cliente_id::TEXT || 
        NEW.imovel_id::TEXT || 
        NEW.timestamp_visita::TEXT
    ), 'hex');
    
    -- Gerar hash do nexo completo
    NEW.hash_nexo := encode(sha256(
        NEW.broker_id::TEXT || 
        NEW.cliente_id::TEXT || 
        NEW.imovel_id::TEXT || 
        NEW.latitude::TEXT || 
        NEW.longitude::TEXT || 
        NEW.timestamp_visita::TEXT || 
        NEW.tipo_visita::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_nexo_causal_georreferenciado
    BEFORE INSERT ON public.nexo_causal_georreferenciado
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_nexo_causal_georreferenciado();

-- Trigger para gerar hash do DNA do Ativo
CREATE OR REPLACE FUNCTION public.gerar_hash_dna_ativo_landbanking()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_dna := encode(sha256(
        NEW.area_id::TEXT || 
        NEW.projeto_id::TEXT || 
        NEW.tipo_ativo::TEXT || 
        NEW.valor_compra::TEXT || 
        NEW.area_total_m2::TEXT || 
        NEW.coordenada_central::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    NEW.hash_registro := encode(sha256(
        NEW.hash_dna || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_dna_ativo_landbanking
    BEFORE INSERT ON public.dna_ativo_landbanking
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_dna_ativo_landbanking();

-- Trigger para consolidar Dashboard Master
CREATE OR REPLACE FUNCTION public.consolidar_dashboard_master()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir ou atualizar consolidação do dia
    INSERT INTO public.dashboard_master_monetizacao (
        data_consolidacao,
        imobiliaria_id,
        frente_1_vendas,
        frente_2_recorrencia,
        frente_3_marketplace,
        frente_4_landbanking,
        frente_5_equity,
        frente_6_mentoria,
        frente_7_selo_juris,
        frente_8_data_intelligence,
        frente_9_antecipacao,
        frente_10_fintech_bancaria,
        custos_operacionais,
        custos_marketing,
        custos_tecnologia,
        custos_pessoal,
        total_transacoes
    )
    SELECT 
        CURRENT_DATE,
        imobiliaria_id,
        COALESCE(SUM(CASE WHEN tipo_transacao = 'venda' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'recorrencia' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'marketplace' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'landbanking' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'equity' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'mentoria' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'selo_juris' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'data_intelligence' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'antecipacao' THEN valor_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'fintech_bancaria' THEN valor_total ELSE 0 END), 0),
        0, -- Calcular custos operacionais
        0, -- Calcular custos marketing
        0, -- Calcular custos tecnologia
        0, -- Calcular custos pessoal
        COUNT(*) -- Total transações
    FROM public.split_4_vias
    WHERE DATE_TRUNC('day', created_at) = CURRENT_DATE
    GROUP BY imobiliaria_id
    ON CONFLICT (imobiliaria_id, data_consolidacao)
    DO UPDATE SET
        frente_1_vendas = EXCLUDED.frente_1_vendas,
        frente_2_recorrencia = EXCLUDED.frente_2_recorrencia,
        frente_3_marketplace = EXCLUDED.frente_3_marketplace,
        frente_4_landbanking = EXCLUDED.frente_4_landbanking,
        frente_5_equity = EXCLUDED.frente_5_equity,
        frente_6_mentoria = EXCLUDED.frente_6_mentoria,
        frente_7_selo_juris = EXCLUDED.frente_7_selo_juris,
        frente_8_data_intelligence = EXCLUDED.frente_8_data_intelligence,
        frente_9_antecipacao = EXCLUDED.frente_9_antecipacao,
        frente_10_fintech_bancaria = EXCLUDED.frente_10_fintech_bancaria,
        total_transacoes = EXCLUDED.total_transacoes,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para executar Teste de Escala
CREATE OR REPLACE FUNCTION public.executar_teste_escala(
    p_total_predios INTEGER DEFAULT 500,
    p_total_unidades INTEGER DEFAULT 500000
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    teste_id UUID;
    inicio_teste TIMESTAMPTZ;
    fim_teste TIMESTAMPTZ;
BEGIN
    inicio_teste := NOW();
    
    -- Criar teste de escala
    INSERT INTO public.teste_escala_vendas (
        nome_teste,
        total_predios,
        total_unidades,
        unidades_por_predio,
        status_teste
    ) VALUES (
        'Teste de Escala Golden Master',
        p_total_predios,
        p_total_unidades,
        p_total_unidades / p_total_predios,
        'em_andamento'
    ) RETURNING id INTO teste_id;
    
    -- Simular operações (simplificado para demonstração)
    -- Em produção, isso executaria testes reais de performance
    
    -- Simular Split de 4 Vias
    INSERT INTO public.teste_escala_detalhes (
        teste_escala_id,
        tipo_operacao,
        operacoes_realizadas,
        tempo_medio_ms,
        taxa_sucesso,
        erros_ocorridos,
        memoria_utilizada_mb,
        cpu_utilizada_percent
    ) VALUES (
        teste_id,
        'split_4_vias',
        p_total_unidades,
        45.5, -- Tempo médio simulado
        99.8, -- Taxa de sucesso simulada
        FLOOR(p_total_unidades * 0.002), -- 0.2% de erro
        256, -- Memória simulada
        35.5 -- CPU simulada
    );
    
    -- Simular Recorrência 5x5
    INSERT INTO public.teste_escala_detalhes (
        teste_escala_id,
        tipo_operacao,
        operacoes_realizadas,
        tempo_medio_ms,
        taxa_sucesso,
        erros_ocorridos,
        memoria_utilizada_mb,
        cpu_utilizada_percent
    ) VALUES (
        teste_id,
        'recorrencia_5x5',
        p_total_unidades * 5, -- 5 níveis por unidade
        120.8, -- Tempo médio simulado
        99.5, -- Taxa de sucesso simulada
        FLOOR(p_total_unidades * 0.005), -- 0.5% de erro
        512, -- Memória simulada
        65.2 -- CPU simulada
    );
    
    -- Simular DNA do Ativo
    INSERT INTO public.teste_escala_detalhes (
        teste_escala_id,
        tipo_operacao,
        operacoes_realizadas,
        tempo_medio_ms,
        taxa_sucesso,
        erros_ocorridos,
        memoria_utilizada_mb,
        cpu_utilizada_percent
    ) VALUES (
        teste_id,
        'dna_ativo',
        p_total_predios * 10, -- 10 consultas por prédio
        25.3, -- Tempo médio simulado
        100.0, -- Taxa de sucesso simulada
        0, -- Sem erros simulados
        128, -- Memória simulada
        15.8 -- CPU simulada
    );
    
    -- Simular Financiamento Bancário
    INSERT INTO public.teste_escala_detalhes (
        teste_escala_id,
        tipo_operacao,
        operacoes_realizadas,
        tempo_medio_ms,
        taxa_sucesso,
        erros_ocorridos,
        memoria_utilizada_mb,
        cpu_utilizada_percent
    ) VALUES (
        teste_id,
        'financiamento',
        FLOOR(p_total_unidades * 0.7), -- 70% com financiamento
        350.2, -- Tempo médio simulado
        98.5, -- Taxa de sucesso simulada
        FLOOR(p_total_unidades * 0.015), -- 1.5% de erro
        1024, -- Memória simulada
        85.7 -- CPU simulada
    );
    
    fim_teste := NOW();
    
    -- Calcular métricas finais
    UPDATE public.teste_escala_vendas
    SET 
        data_fim_teste = fim_teste,
        latencia_media_ms = (
            SELECT AVG(tempo_medio_ms) 
            FROM public.teste_escala_detalhes 
            WHERE teste_escala_id = teste_id
        ),
        total_vendas_simuladas = p_total_unidades,
        valor_total_vendas = p_total_unidades * 500000, -- R$ 500k médio por unidade
        taxa_conversao_simulada = 85.5,
        total_split_processado = p_total_unidades,
        tempo_medio_split_ms = (
            SELECT tempo_medio_ms 
            FROM public.teste_escala_detalhes 
            WHERE teste_escala_id = teste_id AND tipo_operacao = 'split_4_vias'
        ),
        total_recorrencia_processada = p_total_unidades * 5,
        tempo_medio_recorrencia_ms = (
            SELECT tempo_medio_ms 
            FROM public.teste_escala_detalhes 
            WHERE teste_escala_id = teste_id AND tipo_operacao = 'recorrencia_5x5'
        ),
        total_dna_consultas = p_total_predios * 10,
        tempo_medio_dna_ms = (
            SELECT tempo_medio_ms 
            FROM public.teste_escala_detalhes 
            WHERE teste_escala_id = teste_id AND tipo_operacao = 'dna_ativo'
        ),
        total_financiamentos_simulados = FLOOR(p_total_unidades * 0.7),
        valor_total_financiado = FLOOR(p_total_unidades * 0.7) * 300000, -- R$ 300k médio
        tempo_medio_financiamento_ms = (
            SELECT tempo_medio_ms 
            FROM public.teste_escala_detalhes 
            WHERE teste_escala_id = teste_id AND tipo_operacao = 'financiamento'
        ),
        status_resultado = CASE 
            WHEN (SELECT AVG(tempo_medio_ms) FROM public.teste_escala_detalhes WHERE teste_escala_id = teste_id) < 200 THEN 'excelente'
            WHEN (SELECT AVG(tempo_medio_ms) FROM public.teste_escala_detalhes WHERE teste_escala_id = teste_id) < 500 THEN 'bom'
            WHEN (SELECT AVG(tempo_medio_ms) FROM public.teste_escala_detalhes WHERE teste_escala_id = teste_id) < 1000 THEN 'regular'
            ELSE 'insuficiente'
        END,
        score_performance = CASE 
            WHEN (SELECT AVG(tempo_medio_ms) FROM public.teste_escala_detalhes WHERE teste_escala_id = teste_id) < 200 THEN 95.0
            WHEN (SELECT AVG(tempo_medio_ms) FROM public.teste_escala_detalhes WHERE teste_escala_id = teste_id) < 500 THEN 85.0
            WHEN (SELECT AVG(tempo_medio_ms) FROM public.teste_escala_detalhes WHERE teste_escala_id = teste_id) < 1000 THEN 75.0
            ELSE 65.0
        END,
        status_teste = 'concluido',
        hash_teste = encode(sha256(
            teste_id::TEXT || 
            p_total_predios::TEXT || 
            p_total_unidades::TEXT || 
            NOW()::TEXT
        ), 'hex')
    WHERE id = teste_id;
    
    -- Retornar resultado
    SELECT 
        id,
        nome_teste,
        status_teste,
        total_predios,
        total_unidades,
        latencia_media_ms,
        score_performance,
        status_resultado,
        data_inicio_teste,
        data_fim_teste
    INTO resultado
    FROM public.teste_escala_vendas
    WHERE id = teste_id;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS OTIMIZADAS PARA PERFORMANCE
-- =====================================================

-- View de Dashboard Master Otimizado
CREATE OR REPLACE VIEW public.dashboard_master_otimizado AS
SELECT 
    dmm.*,
    ip.nome_fantasia as imobiliaria_nome,
    ip.cnpj as imobiliaria_cnpj,
    CASE 
        WHEN dmm.margem_lucro > 20 THEN 'excelente'
        WHEN dmm.margem_lucro > 15 THEN 'bom'
        WHEN dmm.margem_lucro > 10 THEN 'regular'
        ELSE 'insuficiente'
    END as status_performance,
    dmm.total_faturamento / NULLIF(dmm.total_transacoes, 0) as ticket_medio_calculado
FROM public.dashboard_master_monetizacao dmm
LEFT JOIN public.imobiliarias_parceiras ip ON dmm.imobiliaria_id = ip.id
WHERE dmm.status_consolidacao = 'ativa'
ORDER BY dmm.data_consolidacao DESC, dmm.total_faturamento DESC;

-- View de Performance de Split 4 Vias
CREATE OR REPLACE VIEW public.performance_split_4_vias AS
SELECT 
    imobiliaria_id,
    COUNT(*) as total_transacoes,
    SUM(valor_total) as valor_total,
    AVG(captador_valor) as media_captador,
    AVG(parceiro_valor) as media_parceiro,
    AVG(vendedor_valor) as media_vendedor,
    AVG(sb_valor) as media_sb,
    SUM(creditos_aceleracao) as total_creditos_aceleracao,
    SUM(creditos_retidos_70) as total_creditos_retidos,
    SUM(creditos_liberados_30) as total_creditos_liberados,
    AVG(EXTRACT(EPOCH FROM (data_distribuicao - data_processamento)) / 60) as tempo_medio_distribuicao_minutos
FROM public.split_4_vias
WHERE status_split = 'distribuido'
GROUP BY imobiliaria_id;

-- View de Performance de Recorrência 5x5
CREATE OR REPLACE VIEW public.performance_recorrencia_5x5 AS
SELECT 
    broker_origem_id,
    b.nome as broker_nome,
    COUNT(*) as total_distribuicoes,
    SUM(valor_total_distribuido) as valor_total_distribuido,
    SUM(valor_retenido_sb) as valor_total_retido,
    AVG(valor_total_distribuido) as media_valor_distribuido,
    MAX(mes_referencia) as ultima_distribuicao,
    MIN(mes_referencia) as primeira_distribuicao
FROM public.recorrencia_5x5 r
LEFT JOIN public.brokers b ON r.broker_origem_id = b.id
WHERE status_distribuicao = 'finalizada'
GROUP BY broker_origem_id, b.nome
ORDER BY valor_total_distribuido DESC;

-- =====================================================
-- ÍNDICES DE PERFORMANCE OTIMIZADOS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_split_4_vias_transacao ON public.split_4_vias(transacao_id, tipo_transacao);
CREATE INDEX IF NOT EXISTS idx_split_4_vias_status ON public.split_4_vias(status_split, data_processamento);
CREATE INDEX IF NOT EXISTS idx_split_4_vias_imobiliaria ON public.split_4_vias(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_recorrencia_5x5_origem ON public.recorrencia_5x5(broker_origem_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_recorrencia_5x5_status ON public.recorrencia_5x5(status_distribuicao, data_distribuicao);
CREATE INDEX IF NOT EXISTS idx_roleta_yara_imobiliaria ON public.roleta_yara_meritocracia(imobiliaria_id, status_configuracao);
CREATE INDEX IF NOT EXISTS idx_nexo_causal_gps ON public.nexo_causal_georreferenciado(latitude, longitude, data_visita);
CREATE INDEX IF NOT EXISTS idx_dna_ativo_tipo ON public.dna_ativo_landbanking(tipo_ativo, status_ativo);
CREATE INDEX IF NOT EXISTS idx_dna_ativo_coordenada ON public.dna_ativo_landbanking USING GIST(coordenada_central);
CREATE INDEX IF NOT EXISTS idx_dashboard_master_periodo ON public.dashboard_master_monetizacao(mes_referencia, imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_gestao_sucessao_titular ON public.gestao_sucessao_patrimonio(broker_titular_id, status_sucessao);
CREATE INDEX IF NOT EXISTS idx_teste_escala_status ON public.teste_escala_vendas(status_teste, data_inicio_teste);
CREATE INDEX IF NOT EXISTS idx_teste_escala_detalhes_operacao ON public.teste_escala_detalhes(teste_escala_id, tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_configuracao_soberania_imobiliaria ON public.configuracao_soberania_sb(imobiliaria_id, status_configuracao);
CREATE INDEX IF NOT EXISTS idx_logs_soberania_configuracao ON public.logs_soberania_sb(configuracao_id, tipo_log);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir configurações de Roleta Yara Meritocrática
INSERT INTO public.roleta_yara_meritocracia (
    imobiliaria_id,
    nome_configuracao,
    peso_performance,
    peso_conversao,
    peso_tempo_resposta,
    peso_disponibilidade,
    maximo_leads_dia,
    maximo_leads_corretor,
    minimo_score_performance
) VALUES
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Central' LIMIT 1), 'Configuração Premium', 45.0, 25.0, 20.0, 10.0, 75, 15, 75.0),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Premium' LIMIT 1), 'Configuração Elite', 50.0, 20.0, 20.0, 10.0, 100, 20, 80.0),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Nordeste' LIMIT 1), 'Configuração Padrão', 40.0, 25.0, 20.0, 15.0, 50, 10, 70.0);

-- Inserir configurações de Soberania SB
INSERT INTO public.configuracao_soberania_sb (
    imobiliaria_id,
    modo_soberano,
    powered_by_sb,
    logo_sb_visivel,
    comunicacoes_100_percent_sb,
    logs_100_percent_sb,
    interface_100_percent_sb,
    trava_lgpd_ativa,
    periodo_trava_meses,
    protecao_ativo_dados,
    protecao_ativo_intelectual,
    protecao_ativo_comercial,
    nomenclatura_validada,
    nomes_externos_removidos,
    status_configuracao,
    data_validacao
) VALUES
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Central' LIMIT 1), 'total', true, true, true, true, true, true, true, 24, true, true, true, true, true, 'ativa', CURRENT_DATE),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Premium' LIMIT 1), 'total', true, true, true, true, true, true, true, 24, true, true, true, true, true, 'ativa', CURRENT_DATE),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Nordeste' LIMIT 1), 'total', true, true, true, true, true, true, true, 24, true, true, true, true, true, 'ativa', CURRENT_DATE);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V26 - GOLDEN MASTER CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.split_4_vias) as total_splits_4_vias,
       (SELECT COUNT(*) FROM public.recorrencia_5x5) as total_recorrencias_5x5,
       (SELECT COUNT(*) FROM public.white_label_royalties) as total_white_label_royalties,
       (SELECT COUNT(*) FROM public.roleta_yara_meritocracia) as total_roletas_yara,
       (SELECT COUNT(*) FROM public.nexo_causal_georreferenciado) as total_nexos_causais_georreferenciados,
       (SELECT COUNT(*) FROM public.dna_ativo_landbanking) as total_dnas_ativos,
       (SELECT COUNT(*) FROM public.dashboard_master_monetizacao) as total_dashboards_master,
       (SELECT COUNT(*) FROM public.gestao_sucessao_patrimonio) as total_gestoes_sucessao,
       (SELECT COUNT(*) FROM public.teste_escala_vendas) as total_testes_escala,
       (SELECT COUNT(*) FROM public.configuracao_soberania_sb) as total_configuracoes_soberania;
