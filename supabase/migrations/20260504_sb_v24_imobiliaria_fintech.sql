-- 🏛️ SECURITY BROKER SB v24 - IMOBILIÁRIA & FINTECH
-- Schema completo para gestão privada de imobiliárias e comissionamento bancário

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABELAS DE GESTÃO PRIVADA DE IMOBILIÁRIAS
-- =====================================================

-- Imobiliárias Parceiras
CREATE TABLE IF NOT EXISTS public.imobiliarias_parceiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados da Imobiliária
    nome_fantasia TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    
    -- Contato
    telefone TEXT,
    email TEXT,
    site TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    
    -- Configurações
    status_imobiliaria TEXT DEFAULT 'ativa', -- 'ativa', 'suspensa', 'inativa'
    data_contrato DATE,
    data_inicio_operacao DATE,
    
    -- Financeiro
    faturamento_mensal DECIMAL(12,2),
    royalty_tecnologia_percent DECIMAL(5,2) DEFAULT 8.0, -- 6% a 10%
    limite_verba_marketing DECIMAL(12,2),
    
    -- Gestão
    broker_master_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    gerente_comercial_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_imobiliaria TEXT UNIQUE
);

-- Tabela de Split Interno da Imobiliária
CREATE TABLE IF NOT EXISTS public.split_interno_imobiliaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Configurações de Split
    nome_configuracao TEXT NOT NULL,
    descricao_configuracao TEXT,
    
    -- Distribuição Interna (100%)
    corretor_vendedor_percent DECIMAL(5,2) NOT NULL,
    corretor_captador_percent DECIMAL(5,2) DEFAULT 0.00,
    gerente_comercial_percent DECIMAL(5,2) DEFAULT 0.00,
    imobiliaria_gestao_percent DECIMAL(5,2) NOT NULL,
    fundo_marketing_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- Validação
    total_percentual DECIMAL(5,2) GENERATED ALWAYS AS (
        corretor_vendedor_percent + 
        corretor_captador_percent + 
        gerente_comercial_percent + 
        imobiliaria_gestao_percent + 
        fundo_marketing_percent
    ) STORED,
    
    -- Status
    status_configuracao TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'arquivada'
    data_vigencia_inicio DATE,
    data_vigencia_fim DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_split TEXT UNIQUE,
    
    CONSTRAINT chk_total_percentual CHECK (total_percentual = 100.00)
);

-- Corretores Vinculados à Imobiliária
CREATE TABLE IF NOT EXISTS public.corretores_imobiliaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Vínculo
    data_vinculo DATE NOT NULL,
    data_desvinculo DATE,
    motivo_desvinculo TEXT,
    
    -- Função
    funcao TEXT NOT NULL, -- 'corretor_vendedor', 'corretor_captador', 'gerente_comercial', 'diretor'
    nivel_hierarquico INTEGER DEFAULT 1, -- 1 a 5
    
    -- Configurações
    comissao_padrao_percent DECIMAL(5,2),
    meta_mensal DECIMAL(12,2),
    bonus_meta_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- Performance
    total_vendas INTEGER DEFAULT 0,
    total_comissoes DECIMAL(12,2) DEFAULT 0.00,
    taxa_conversao DECIMAL(5,2) DEFAULT 0.00,
    tempo_medio_resposta INTEGER DEFAULT 0, -- minutos
    
    -- Status
    status_vinculo TEXT DEFAULT 'ativo', -- 'ativo', 'suspenso', 'inativo'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_vinculo TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE CASHFLOW DASHBOARD
-- =====================================================

-- Entradas e Saídas da Imobiliária
CREATE TABLE IF NOT EXISTS public.cashflow_imobiliaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Dados da Transação
    data_transacao DATE NOT NULL,
    tipo_transacao TEXT NOT NULL, -- 'entrada', 'saida'
    categoria_transacao TEXT NOT NULL, -- 'venda', 'marketing', 'comissao', 'royalty', 'operacional'
    
    -- Descrição
    descricao TEXT NOT NULL,
    referencia_id UUID, -- ID da venda, lead, etc.
    referencia_tipo TEXT, -- 'venda', 'lead', 'comissao_bancaria'
    
    -- Valores
    valor_transacao DECIMAL(12,2) NOT NULL,
    valor_liquido DECIMAL(12,2),
    taxa_impostos DECIMAL(5,2) DEFAULT 0.00,
    valor_impostos DECIMAL(12,2) GENERATED ALWAYS AS (valor_transacao * taxa_impostos / 100) STORED,
    
    -- Centro de Custo
    centro_custo TEXT, -- 'marketing', 'vendas', 'operacional', 'tecnologia'
    
    -- Status
    status_transacao TEXT DEFAULT 'confirmada', -- 'pendente', 'confirmada', 'cancelada'
    data_confirmacao DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_cashflow TEXT UNIQUE
);

-- Resumo Mensal do Cashflow
CREATE TABLE IF NOT EXISTS public.resumo_cashflow_mensal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Período
    mes_referencia DATE NOT NULL,
    ano_referencia INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM mes_referencia)) STORED,
    
    -- Totais
    total_entradas DECIMAL(12,2) DEFAULT 0.00,
    total_saidas DECIMAL(12,2) DEFAULT 0.00,
    saldo_liquido DECIMAL(12,2) GENERATED ALWAYS AS (total_entradas - total_saidas) STORED,
    
    -- Por Categoria
    entradas_vendas DECIMAL(12,2) DEFAULT 0.00,
    entradas_comissoes DECIMAL(12,2) DEFAULT 0.00,
    entradas_outras DECIMAL(12,2) DEFAULT 0.00,
    
    saidas_marketing DECIMAL(12,2) DEFAULT 0.00,
    saidas_comissoes DECIMAL(12,2) DEFAULT 0.00,
    saidas_operacional DECIMAL(12,2) DEFAULT 0.00,
    saidas_royalties DECIMAL(12,2) DEFAULT 0.00,
    saidas_outras DECIMAL(12,2) DEFAULT 0.00,
    
    -- Indicadores
    margem_lucro DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_entradas > 0 
            THEN ((total_entradas - total_saidas) / total_entradas * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_resumo TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE ROLETA DE LEADS YARA
-- =====================================================

-- Leads Captados pela Imobiliária
CREATE TABLE IF NOT EXISTS public.leads_imobiliaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Dados do Lead
    nome_lead TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cpf TEXT,
    
    -- Origem
    canal_origem TEXT NOT NULL, -- 'site', 'instagram', 'facebook', 'google_ads', 'indicacao'
    campanha_origem TEXT,
    verba_utilizada DECIMAL(10,2),
    
    -- Interesse
    tipo_imovel TEXT, -- 'apartamento', 'casa', 'comercial', 'terreno'
    bairro_interesse TEXT,
    cidade_interesse TEXT,
    valor_maximo DECIMAL(12,2),
    
    -- Status
    status_lead TEXT DEFAULT 'novo', -- 'novo', 'em_atendimento', 'convertido', 'perdido'
    data_captacao TIMESTAMPTZ DEFAULT NOW(),
    data_primeiro_contato TIMESTAMPTZ,
    data_ultimo_contato TIMESTAMPTZ,
    
    -- Distribuição
    broker_distribuido_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    data_distribuicao TIMESTAMPTZ,
    metodo_distribuicao TEXT, -- 'roleta_yara', 'manual', 'prioridade'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_lead TEXT UNIQUE
);

-- Score de Performance dos Corretores
CREATE TABLE IF NOT EXISTS public.score_performance_corretores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Período de Análise
    data_referencia DATE NOT NULL,
    periodo_analise TEXT DEFAULT 'mensal', -- 'semanal', 'mensal', 'trimestral'
    
    -- Métricas de Performance
    total_leads_recebidos INTEGER DEFAULT 0,
    leads_convertidos INTEGER DEFAULT 0,
    taxa_conversao DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_leads_recebidos > 0 
            THEN (leads_convertidos::DECIMAL / total_leads_recebidos * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Tempo de Resposta
    tempo_medio_resposta INTEGER DEFAULT 0, -- minutos
    tempo_maximo_resposta INTEGER DEFAULT 0, -- minutos
    taxa_resposta_1h DECIMAL(5,2) DEFAULT 0.00, -- % de leads respondidos em 1 hora
    
    -- Qualidade
    taxa_engajamento DECIMAL(5,2) DEFAULT 0.00, -- % de leads que interagiram
    score_atendimento INTEGER DEFAULT 0, -- 1 a 100
    score_conversao INTEGER DEFAULT 0, -- 1 a 100
    
    -- Score Final (0-100)
    score_final DECIMAL(5,2) GENERATED ALWAYS AS (
        (taxa_conversao * 0.4) + 
        (CASE WHEN tempo_medio_resposta > 0 THEN (100 - LEAST(tempo_medio_resposta / 6, 100)) * 0.3 ELSE 0 END) + 
        (score_atendimento * 0.2) + 
        (score_conversao * 0.1)
    ) STORED,
    
    -- Ranking
    ranking_imobiliaria INTEGER,
    ranking_geral INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_score TEXT UNIQUE
);

-- Configuração da Roleta Yara
CREATE TABLE IF NOT EXISTS public.configuracao_roleta_yara (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Configurações
    nome_configuracao TEXT NOT NULL,
    status_configuracao TEXT DEFAULT 'ativa', -- 'ativa', 'inativa'
    
    -- Critérios de Distribuição
    peso_score_performance DECIMAL(5,2) DEFAULT 40.0, -- 40%
    peso_tempo_resposta DECIMAL(5,2) DEFAULT 30.0, -- 30%
    peso_taxa_conversao DECIMAL(5,2) DEFAULT 20.0, -- 20%
    peso_disponibilidade DECIMAL(5,2) DEFAULT 10.0, -- 10%
    
    -- Limites
    maximo_leads_por_corretor INTEGER DEFAULT 10,
    maximo_leads_dia INTEGER DEFAULT 50,
    
    -- Filtros
    corretores_excluidos UUID[] DEFAULT '{}',
    corretores_prioritarios UUID[] DEFAULT '{}',
    
    -- Horários
    horario_inicio_distribuicao TIME DEFAULT '08:00:00',
    horario_fim_distribuicao TIME DEFAULT '18:00:00',
    dias_distribucao TEXT[] DEFAULT '{1,2,3,4,5}', -- Seg-Sex
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_configuracao TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE COMISSÃO DE FINANCIAMENTO (FINTECH LAYER)
-- =====================================================

-- Comissões de Financiamento Bancário
CREATE TABLE IF NOT EXISTS public.comissoes_financiamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados do Financiamento
    imovel_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Dados do Financiamento
    banco_origem TEXT NOT NULL,
    numero_contrato TEXT,
    data_contrato DATE NOT NULL,
    data_liberacao DATE,
    
    -- Valores do Financiamento
    valor_financiado DECIMAL(12,2) NOT NULL,
    valor_entrada DECIMAL(12,2),
    valor_total_financiamento DECIMAL(12,2),
    taxa_juros_anual DECIMAL(5,2),
    prazo_meses INTEGER,
    
    -- Comissão de Originador
    comissao_originador_percent DECIMAL(5,2) NOT NULL,
    valor_comissao_total DECIMAL(12,2) GENERATED ALWAYS AS (valor_financiado * comissao_originador_percent / 100) STORED,
    
    -- Split da Comissão
    imobiliaria_percent DECIMAL(5,2) DEFAULT 40.0,
    corretor_percent DECIMAL(5,2) DEFAULT 40.0,
    sb_tecnologia_percent DECIMAL(5,2) DEFAULT 20.0,
    
    -- Valores do Split
    valor_imobiliaria DECIMAL(12,2) GENERATED ALWAYS AS (valor_comissao_total * imobiliaria_percent / 100) STORED,
    valor_corretor DECIMAL(12,2) GENERATED ALWAYS AS (valor_comissao_total * corretor_percent / 100) STORED,
    valor_sb_tecnologia DECIMAL(12,2) GENERATED ALWAYS AS (valor_comissao_total * sb_tecnologia_percent / 100) STORED,
    
    -- Status
    status_financiamento TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'liberado', 'pago', 'cancelado'
    status_comissao TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'pago', 'cancelado'
    
    -- Datas
    data_aprovacao DATE,
    data_liberacao_comissao DATE,
    data_pagamento DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_financiamento TEXT UNIQUE,
    
    CONSTRAINT chk_split_percent CHECK (imobiliaria_percent + corretor_percent + sb_tecnologia_percent = 100.00)
);

-- Histórico de Pagamentos de Comissões
CREATE TABLE IF NOT EXISTS public.historico_pagamentos_comissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comissao_financiamento_id UUID REFERENCES public.comissoes_financiamento(id) ON DELETE CASCADE,
    
    -- Dados do Pagamento
    data_pagamento DATE NOT NULL,
    valor_pago DECIMAL(12,2) NOT NULL,
    forma_pagamento TEXT, -- 'transferencia', 'deposito', 'pix'
    
    -- Beneficiários
    imobiliaria_pago BOOLEAN DEFAULT false,
    corretor_pago BOOLEAN DEFAULT false,
    sb_pago BOOLEAN DEFAULT false,
    
    -- Valores Pagos
    valor_imobiliaria_pago DECIMAL(12,2) DEFAULT 0.00,
    valor_corretor_pago DECIMAL(12,2) DEFAULT 0.00,
    valor_sb_pago DECIMAL(12,2) DEFAULT 0.00,
    
    -- Comprovação
    comprovante_url TEXT,
    hash_comprovante TEXT,
    
    -- Status
    status_pagamento TEXT DEFAULT 'processado', -- 'processado', 'pendente', 'falha', 'estornado'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_pagamento TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE ROYALTIES TECNOLÓGICOS
-- =====================================================

-- Faturamento de Tecnologia da Imobiliária
CREATE TABLE IF NOT EXISTS public.faturamento_tecnologia_imobiliaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Período
    mes_referencia DATE NOT NULL,
    ano_referencia INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM mes_referencia)) STORED,
    
    -- Faturamento
    faturamento_total DECIMAL(12,2) NOT NULL,
    faturamento_tecnologia DECIMAL(12,2) NOT NULL,
    
    -- Royalties
    royalty_percent DECIMAL(5,2) NOT NULL,
    valor_royalty DECIMAL(12,2) GENERATED ALWAYS AS (faturamento_tecnologia * royalty_percent / 100) STORED,
    
    -- Deduções
    deducoes_permtidas DECIMAL(12,2) DEFAULT 0.00,
    valor_base_calculo DECIMAL(12,2) GENERATED ALWAYS AS (faturamento_tecnologia - deducoes_permtidas) STORED,
    valor_royalty_ajustado DECIMAL(12,2) GENERATED ALWAYS AS ((faturamento_tecnologia - deducoes_permtidas) * royalty_percent / 100) STORED,
    
    -- Status
    status_faturamento TEXT DEFAULT 'pendente', -- 'pendente', 'calculado', 'faturado', 'pago'
    data_vencimento DATE,
    data_pagamento DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_faturamento TEXT UNIQUE
);

-- Pagamentos de Royalties
CREATE TABLE IF NOT EXISTS public.pagamentos_royalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faturamento_id UUID REFERENCES public.faturamento_tecnologia_imobiliaria(id) ON DELETE CASCADE,
    
    -- Dados do Pagamento
    data_pagamento DATE NOT NULL,
    valor_pago DECIMAL(12,2) NOT NULL,
    forma_pagamento TEXT, -- 'transferencia', 'deposito', 'pix'
    
    -- Conta SB
    conta_destino TEXT,
    banco_destino TEXT,
    
    -- Comprovação
    comprovante_url TEXT,
    hash_comprovante TEXT,
    
    -- Status
    status_pagamento TEXT DEFAULT 'processado', -- 'processado', 'pendente', 'falha', 'estornado'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_royalty TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE AUDITORIA E SOBERANIA
-- =====================================================

-- Nexo Causal de Financiamento
CREATE TABLE IF NOT EXISTS public.nexo_causal_financiamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comissao_financiamento_id UUID REFERENCES public.comissoes_financiamento(id) ON DELETE CASCADE,
    
    -- Dados da Interação
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    banco_id TEXT, -- ID do banco no sistema
    
    -- Timeline de Interações
    data_primeiro_contato DATE NOT NULL,
    data_visita_imovel DATE,
    data_proposta_financiamento DATE,
    data_envio_banco DATE,
    data_aprovacao_banco DATE,
    data_contrato DATE,
    
    -- Detalhes das Intações
    tipo_interacao TEXT NOT NULL, -- 'contato', 'visita', 'proposta', 'envio_banco', 'aprovacao', 'contrato'
    descricao_interacao TEXT,
    canal_comunicacao TEXT, -- 'telefone', 'whatsapp', 'email', 'presencial', 'sistema_banco'
    
    -- Documentação
    documentos_anexados TEXT[] DEFAULT '{}',
    assinatura_cliente BOOLEAN DEFAULT false,
    assinatura_banco BOOLEAN DEFAULT false,
    
    -- Nexo Causal
    nexo_estabelecido BOOLEAN DEFAULT false,
    forca_nexo TEXT, -- 'forte', 'medio', 'fraco'
    justificativa_nexo TEXT,
    
    -- Repasse Bancário
    dados_repasse JSONB, -- Dados do repasse bancário
    confirmacao_repasse BOOLEAN DEFAULT false,
    data_repasse DATE,
    
    -- Hash Imutável
    hash_interacao TEXT NOT NULL,
    hash_registro TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Auditoria de Financiamento
CREATE TABLE IF NOT EXISTS public.logs_auditoria_financiamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comissao_financiamento_id UUID REFERENCES public.comissoes_financiamento(id) ON DELETE CASCADE,
    
    -- Dados da Auditoria
    tipo_auditoria TEXT NOT NULL, -- 'criacao_financiamento', 'aprovacao_banco', 'calculo_comissao', 'split_pagamento', 'repasse_bancario'
    dados_antigos JSONB,
    dados_novos JSONB,
    
    -- Validações
    split_validado BOOLEAN DEFAULT false,
    repasse_validado BOOLEAN DEFAULT false,
    auditoria_soberana BOOLEAN DEFAULT false,
    conformidade_bancaria BOOLEAN DEFAULT false,
    
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
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash da imobiliária
CREATE OR REPLACE FUNCTION public.gerar_hash_imobiliaria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_imobiliaria := encode(sha256(
        NEW.nome_fantasia || 
        NEW.cnpj || 
        NEW.created_at::TEXT
    ), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_imobiliaria
    BEFORE INSERT ON public.imobiliarias_parceiras
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_imobiliaria();

-- Trigger para calcular cashflow mensal
CREATE OR REPLACE FUNCTION public.calcular_cashflow_mensal()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar resumo mensal quando houver transação
    INSERT INTO public.resumo_cashflow_mensal (
        imobiliaria_id,
        mes_referencia,
        total_entradas,
        total_saidas,
        entradas_vendas,
        entradas_comissoes,
        entradas_outras,
        saidas_marketing,
        saidas_comissoes,
        saidas_operacional,
        saidas_royalties,
        saidas_outras
    )
    SELECT 
        NEW.imobiliaria_id,
        DATE_TRUNC('month', NEW.data_transacao)::DATE,
        COALESCE(SUM(CASE WHEN tipo_transacao = 'entrada' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'saida' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'entrada' AND categoria_transacao = 'venda' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'entrada' AND categoria_transacao = 'comissao' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'entrada' AND categoria_transacao NOT IN ('venda', 'comissao') THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'saida' AND categoria_transacao = 'marketing' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'saida' AND categoria_transacao = 'comissao' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'saida' AND categoria_transacao = 'operacional' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'saida' AND categoria_transacao = 'royalty' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_transacao = 'saida' AND categoria_transacao NOT IN ('marketing', 'comissao', 'operacional', 'royalty') THEN valor_transacao ELSE 0 END), 0)
    FROM public.cashflow_imobiliaria
    WHERE imobiliaria_id = NEW.imobiliaria_id
    AND DATE_TRUNC('month', data_transacao) = DATE_TRUNC('month', NEW.data_transacao)
    GROUP BY imobiliaria_id, DATE_TRUNC('month', data_transacao)
    ON CONFLICT (imobiliaria_id, mes_referencia)
    DO UPDATE SET
        total_entradas = EXCLUDED.total_entradas,
        total_saidas = EXCLUDED.total_saidas,
        entradas_vendas = EXCLUDED.entradas_vendas,
        entradas_comissoes = EXCLUDED.entradas_comissoes,
        entradas_outras = EXCLUDED.entradas_outras,
        saidas_marketing = EXCLUDED.saidas_marketing,
        saidas_comissoes = EXCLUDED.saidas_comissoes,
        saidas_operacional = EXCLUDED.saidas_operacional,
        saidas_royalties = EXCLUDED.saidas_royalties,
        saidas_outras = EXCLUDED.saidas_outras,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_cashflow_mensal
    AFTER INSERT OR UPDATE ON public.cashflow_imobiliaria
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_cashflow_mensal();

-- Trigger para atualizar score de performance
CREATE OR REPLACE FUNCTION public.atualizar_score_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar score quando houver distribuição de lead
    IF NEW.broker_distribuido_id IS NOT NULL THEN
        INSERT INTO public.score_performance_corretores (
            broker_id,
            imobiliaria_id,
            data_referencia,
            total_leads_recebidos
        ) VALUES (
            NEW.broker_distribuido_id,
            NEW.imobiliaria_id,
            CURRENT_DATE,
            1
        )
        ON CONFLICT (broker_id, imobiliaria_id, data_referencia)
        DO UPDATE SET
            total_leads_recebidos = score_performance_corretores.total_leads_recebidos + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_score_performance
    AFTER UPDATE ON public.leads_imobiliaria
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_score_performance();

-- Trigger para registrar nexo causal de financiamento
CREATE OR REPLACE FUNCTION public.registrar_nexo_causal_financiamento()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar hash imutável da interação
    NEW.hash_financiamento := encode(sha256(
        NEW.banco_origem || 
        NEW.valor_financiado::TEXT || 
        NEW.data_contrato::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    -- Criar nexo causal inicial
    INSERT INTO public.nexo_causal_financiamento (
        comissao_financiamento_id,
        broker_id,
        cliente_id,
        banco_id,
        data_primeiro_contato,
        tipo_interacao,
        descricao_interacao,
        canal_comunicacao,
        nexo_estabelecido,
        hash_interacao,
        hash_registro
    ) VALUES (
        NEW.id,
        NEW.broker_id,
        NEW.cliente_id,
        NEW.banco_origem,
        NEW.data_contrato,
        'contrato',
        'Contrato de financiamento assinado',
        'sistema_banco',
        true,
        encode(sha256(
            NEW.broker_id::TEXT || 
            NEW.cliente_id::TEXT || 
            NEW.banco_origem || 
            NEW.data_contrato::TEXT
        ), 'hex'),
        encode(sha256(
            NEW.id::TEXT || 
            NEW.broker_id::TEXT || 
            NEW.cliente_id::TEXT || 
            NEW.created_at::TEXT
        ), 'hex')
    );
    
    -- Criar log de auditoria
    INSERT INTO public.logs_auditoria_financiamento (
        comissao_financiamento_id,
        tipo_auditoria,
        dados_novos,
        split_validado,
        auditoria_soberana,
        status_auditoria
    ) VALUES (
        NEW.id,
        'criacao_financiamento',
        jsonb_build_object(
            'banco_origem', NEW.banco_origem,
            'valor_financiado', NEW.valor_financiado,
            'comissao_originador_percent', NEW.comissao_originador_percent,
            'split_distribuicao', jsonb_build_object(
                'imobiliaria', NEW.imobiliaria_percent,
                'corretor', NEW.corretor_percent,
                'sb_tecnologia', NEW.sb_tecnologia_percent
            )
        ),
        true,
        true,
        'aprovado'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_registrar_nexo_causal_financiamento
    BEFORE INSERT ON public.comissoes_financiamento
    FOR EACH ROW
    EXECUTE FUNCTION public.registrar_nexo_causal_financiamento();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para distribuir leads via roleta Yara
CREATE OR REPLACE FUNCTION public.distribuir_lead_roleta_yara(
    p_lead_id UUID,
    p_imobiliaria_id UUID
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    broker_selecionado UUID;
    config_roleta RECORD;
BEGIN
    -- Buscar configuração da roleta
    SELECT * INTO config_roleta
    FROM public.configuracao_roleta_yara
    WHERE imobiliaria_id = p_imobiliaria_id
    AND status_configuracao = 'ativa'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Configuração da roleta não encontrada');
    END IF;
    
    -- Buscar corretores disponíveis com score
    SELECT broker_id INTO broker_selecionado
    FROM public.score_performance_corretores spc
    JOIN public.corretores_imobiliaria ci ON spc.broker_id = ci.broker_id
    WHERE spc.imobiliaria_id = p_imobiliaria_id
    AND ci.status_vinculo = 'ativo'
    AND spc.data_referencia = CURRENT_DATE
    AND NOT (spc.broker_id = ANY(config_roleta.corretores_excluidos))
    ORDER BY spc.score_final DESC
    LIMIT 1;
    
    -- Se não encontrar score, buscar por disponibilidade
    IF broker_selecionado IS NULL THEN
        SELECT ci.broker_id INTO broker_selecionado
        FROM public.corretores_imobiliaria ci
        WHERE ci.imobiliaria_id = p_imobiliaria_id
        AND ci.status_vinculo = 'ativo'
        AND NOT (ci.broker_id = ANY(config_roleta.corretores_excluidos))
        ORDER BY ci.nivel_hierarquico ASC
        LIMIT 1;
    END IF;
    
    -- Distribuir lead
    UPDATE public.leads_imobiliaria
    SET broker_distribuido_id = broker_selecionado,
        data_distribuicao = NOW(),
        metodo_distribuicao = 'roleta_yara'
    WHERE id = p_lead_id;
    
    -- Atualizar score
    INSERT INTO public.score_performance_corretores (
        broker_id,
        imobiliaria_id,
        data_referencia,
        total_leads_recebidos
    ) VALUES (
        broker_selecionado,
        p_imobiliaria_id,
        CURRENT_DATE,
        1
    )
    ON CONFLICT (broker_id, imobiliaria_id, data_referencia)
    DO UPDATE SET
        total_leads_recebidos = score_performance_corretores.total_leads_recebidos + 1,
        updated_at = NOW();
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'broker_selecionado', broker_selecionado,
        'metodo_distribuicao', 'roleta_yara',
        'data_distribuicao', NOW()
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular royalties tecnológicos
CREATE OR REPLACE FUNCTION public.calcular_royalties_tecnologicos(
    p_imobiliaria_id UUID,
    p_mes_referencia DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    faturamento RECORD;
    royalty_valor DECIMAL(12,2);
BEGIN
    -- Buscar faturamento do mês
    SELECT * INTO faturamento
    FROM public.faturamento_tecnologia_imobiliaria
    WHERE imobiliaria_id = p_imobiliaria_id
    AND mes_referencia = p_mes_referencia;
    
    IF NOT FOUND THEN
        -- Calcular faturamento baseado nas vendas do mês
        SELECT 
            p_imobiliaria_id,
            p_mes_referencia,
            COALESCE(SUM(valor_venda), 0) as faturamento_total,
            COALESCE(SUM(valor_venda) * 0.02, 0) as faturamento_tecnologia -- 2% do total como tecnologia
        INTO faturamento
        FROM public.unidades_projetos up
        JOIN public.projetos_sb ps ON up.projeto_id = ps.id
        WHERE ps.incorporadora_id IN (
            SELECT id FROM public.incorporadoras WHERE imobiliaria_id = p_imobiliaria_id
        )
        AND DATE_TRUNC('month', up.data_venda) = p_mes_referencia
        AND up.status_unidade = 'vendido';
        
        -- Inserir faturamento
        INSERT INTO public.faturamento_tecnologia_imobiliaria (
            imobiliaria_id,
            mes_referencia,
            faturamento_total,
            faturamento_tecnologia,
            royalty_percent
        ) VALUES (
            p_imobiliaria_id,
            p_mes_referencia,
            faturamento.faturamento_total,
            faturamento.faturamento_tecnologia,
            (SELECT royalty_tecnologia_percent FROM public.imobiliarias_parceiras WHERE id = p_imobiliaria_id)
        );
    END IF;
    
    -- Calcular royalties
    royalty_valor := faturamento.faturamento_tecnologia * faturamento.royalty_percent / 100;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'faturamento_total', faturamento.faturamento_total,
        'faturamento_tecnologia', faturamento.faturamento_tecnologia,
        'royalty_percent', faturamento.royalty_percent,
        'valor_royalty', royalty_valor,
        'mes_referencia', p_mes_referencia
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS OTIMIZADAS
-- =====================================================

-- View de Dashboard da Imobiliária
CREATE OR REPLACE VIEW public.dashboard_imobiliaria AS
SELECT 
    ip.*,
    COUNT(DISTINCT ci.broker_id) as total_corretores_vinculados,
    COUNT(DISTINCT CASE WHEN ci.status_vinculo = 'ativo' THEN ci.broker_id END) as corretores_ativos,
    COALESCE(rcm.total_entradas, 0) as total_entradas_mes,
    COALESCE(rcm.total_saidas, 0) as total_saidas_mes,
    COALESCE(rcm.saldo_liquido, 0) as saldo_liquido_mes,
    COALESCE(rcm.margem_lucro, 0) as margem_lucro_mes,
    COUNT(DISTINCT li.id) as total_leads_mes,
    COUNT(DISTINCT CASE WHEN li.status_lead = 'convertido' THEN li.id END) as leads_convertidos_mes,
    COUNT(DISTINCT cf.id) as total_financiamentos,
    COALESCE(SUM(cf.valor_comissao_total), 0) as total_comissoes_financiamento,
    COALESCE(SUM(ft.valor_royalty_ajustado), 0) as total_royalties_pagos
FROM public.imobiliarias_parceiras ip
LEFT JOIN public.corretores_imobiliaria ci ON ip.id = ci.imobiliaria_id
LEFT JOIN public.resumo_cashflow_mensal rcm ON ip.id = rcm.imobiliaria_id AND rcm.mes_referencia = DATE_TRUNC('month', CURRENT_DATE)::DATE
LEFT JOIN public.leads_imobiliaria li ON ip.id = li.imobiliaria_id AND DATE_TRUNC('month', li.data_captacao) = DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN public.comissoes_financiamento cf ON ip.id = cf.imobiliaria_id
LEFT JOIN public.faturamento_tecnologia_imobiliaria ft ON ip.id = ft.imobiliaria_id
GROUP BY ip.id;

-- View de Performance de Corretores
CREATE OR REPLACE VIEW public.performance_corretores_imobiliaria AS
SELECT 
    b.id as broker_id,
    b.nome as broker_nome,
    b.email as broker_email,
    ci.imobiliaria_id,
    ip.nome_fantasia as imobiliaria_nome,
    ci.funcao,
    ci.nivel_hierarquico,
    spc.total_leads_recebidos,
    spc.leads_convertidos,
    spc.taxa_conversao,
    spc.tempo_medio_resposta,
    spc.score_final,
    spc.ranking_imobiliaria,
    ci.total_vendas,
    ci.total_comissoes,
    ci.meta_mensal,
    ci.bonus_meta_percent,
    CASE 
        WHEN ci.total_comissoes >= ci.meta_mensal THEN 'meta_atingida'
        WHEN ci.total_comissoes >= ci.meta_mensal * 0.8 THEN 'meta_parcial'
        ELSE 'meta_nao_atingida'
    END as status_meta
FROM public.brokers b
JOIN public.corretores_imobiliaria ci ON b.id = ci.broker_id
JOIN public.imobiliarias_parceiras ip ON ci.imobiliaria_id = ip.id
LEFT JOIN public.score_performance_corretores spc ON b.id = spc.broker_id AND spc.data_referencia = CURRENT_DATE
WHERE ci.status_vinculo = 'active'
ORDER BY spc.score_final DESC NULLS LAST;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_imobiliarias_parceiras_cnpj ON public.imobiliarias_parceiras(cnpj);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_parceiras_status ON public.imobiliarias_parceiras(status_imobiliaria);
CREATE INDEX IF NOT EXISTS idx_split_interno_imobiliaria ON public.split_interno_imobiliaria(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_corretores_imobiliaria_vinculo ON public.corretores_imobiliaria(imobiliaria_id, status_vinculo);
CREATE INDEX IF NOT EXISTS idx_cashflow_imobiliaria_data ON public.cashflow_imobiliaria(imobiliaria_id, data_transacao);
CREATE INDEX IF NOT EXISTS idx_leads_imobiliaria_distribuicao ON public.leads_imobiliaria(imobiliaria_id, broker_distribuido_id);
CREATE INDEX IF NOT EXISTS idx_score_performance_data ON public.score_performance_corretores(imobiliaria_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_financiamento_status ON public.comissoes_financiamento(status_financiamento, status_comissao);
CREATE INDEX IF NOT EXISTS idx_faturamento_tecnologia_mes ON public.faturamento_tecnologia_imobiliaria(imobiliaria_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_nexo_causal_financiamento ON public.nexo_causal_financiamento(comissao_financiamento_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_financiamento ON public.logs_auditoria_financiamento(comissao_financiamento_id);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir imobiliárias parceiras de exemplo
INSERT INTO public.imobiliarias_parceiras (
    nome_fantasia,
    razao_social,
    cnpj,
    telefone,
    email,
    cidade,
    estado,
    status_imobiliaria,
    data_contrato,
    data_inicio_operacao,
    faturamento_mensal,
    royalty_tecnologia_percent,
    limite_verba_marketing
) VALUES
('SB Imobiliária Central', 'SB Imobiliária Central Ltda', '12.345.678/0001-90', '(11) 3000-0001', 'central@sbimobiliaria.com.br', 'São Paulo', 'SP', 'ativa', '2024-01-01', '2024-01-01', 500000.00, 8.0, 50000.00),
('SB Imobiliária Premium', 'SB Imobiliária Premium S/A', '98.765.432/0001-23', '(21) 4000-0002', 'premium@sbimobiliaria.com.br', 'Rio de Janeiro', 'RJ', 'ativa', '2024-02-01', '2024-02-01', 750000.00, 9.0, 75000.00),
('SB Imobiliária Nordeste', 'SB Imobiliária Nordeste Ltda', '45.678.912/0001-45', '(81) 3000-0003', 'nordeste@sbimobiliaria.com.br', 'Recife', 'PE', 'ativa', '2024-03-01', '2024-03-01', 300000.00, 7.0, 30000.00);

-- Inserir configurações de split interno
INSERT INTO public.split_interno_imobiliaria (
    imobiliaria_id,
    nome_configuracao,
    corretor_vendedor_percent,
    corretor_captador_percent,
    gerente_comercial_percent,
    imobiliaria_gestao_percent,
    fundo_marketing_percent
) VALUES
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Central'), 'Padrão Vendedor', 60.0, 10.0, 5.0, 20.0, 5.0),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Premium'), 'Premium Captador', 40.0, 30.0, 5.0, 20.0, 5.0),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Nordeste'), 'Nordeste Equilibrado', 50.0, 15.0, 5.0, 25.0, 5.0);

-- Inserir configurações da roleta Yara
INSERT INTO public.configuracao_roleta_yara (
    imobiliaria_id,
    nome_configuracao,
    peso_score_performance,
    peso_tempo_resposta,
    peso_taxa_conversao,
    peso_disponibilidade,
    maximo_leads_por_corretor,
    maximo_leads_dia
) VALUES
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Central'), 'Configuração Padrão', 40.0, 30.0, 20.0, 10.0, 10, 50),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Premium'), 'Configuração Premium', 50.0, 25.0, 15.0, 10.0, 15, 75),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Nordeste'), 'Configuração Nordeste', 35.0, 35.0, 20.0, 10.0, 8, 40);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V24 - IMOBILIÁRIA & FINTECH CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.imobiliarias_parceiras) as total_imobiliarias,
       (SELECT COUNT(*) FROM public.corretores_imobiliaria) as total_corretores_vinculados,
       (SELECT COUNT(*) FROM public.split_interno_imobiliaria) as total_splits_internos,
       (SELECT COUNT(*) FROM public.cashflow_imobiliaria) as total_transacoes_cashflow,
       (SELECT COUNT(*) FROM public.leads_imobiliaria) as total_leads,
       (SELECT COUNT(*) FROM public.score_performance_corretores) as total_scores_performance,
       (SELECT COUNT(*) FROM public.comissoes_financiamento) as total_comissoes_financiamento,
       (SELECT COUNT(*) FROM public.faturamento_tecnologia_imobiliaria) as total_faturamentos_tecnologia,
       (SELECT COUNT(*) FROM public.nexo_causal_financiamento) as total_nexos_causais,
       (SELECT COUNT(*) FROM public.logs_auditoria_financiamento) as total_logs_auditoria;
