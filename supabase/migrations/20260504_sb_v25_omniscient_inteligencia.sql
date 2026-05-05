-- 🏛️ SECURITY BROKER SB v25 - OMNISCIENT INTELIGÊNCIA PREDITIVA
-- Schema completo para DNA do Ativo, Crédito Documentação, Yara Predictive e Fluxo Bancário

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABELAS DE DNA DO ATIVO (HISTÓRICO IMUTÁVEL)
-- =====================================================

-- Timeline do Ativo (DNA Imutável)
CREATE TABLE IF NOT EXISTS public.asset_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação do Ativo
    ativo_tipo TEXT NOT NULL, -- 'projeto', 'area', 'unidade'
    ativo_id UUID NOT NULL,
    projeto_id UUID REFERENCES public.projetos_sb(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas_disponiveis(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    
    -- Dados do Evento
    tipo_evento TEXT NOT NULL, -- 'criacao', 'avaliacao', 'match', 'vistoria', 'venda', 'transferencia', 'registro', 'itbi'
    data_evento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    descricao_evento TEXT,
    
    -- Detalhes Específicos
    dados_evento JSONB DEFAULT '{}',
    
    -- Participantes
    broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE SET NULL,
    
    -- Valores (quando aplicável)
    valor_ativo DECIMAL(15,2),
    valor_transacao DECIMAL(15,2),
    
    -- Documentação
    documentos_anexados TEXT[] DEFAULT '{}',
    url_documento TEXT,
    
    -- Status
    status_evento TEXT DEFAULT 'ativo', -- 'ativo', 'cancelado', 'concluido'
    
    -- Hash Imutável
    hash_evento TEXT NOT NULL,
    hash_registro TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certidão de Histórico SB
CREATE TABLE IF NOT EXISTS public.certidao_historico_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Solicitação
    solicitante_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras(id) ON DELETE CASCADE,
    
    -- Ativo
    ativo_tipo TEXT NOT NULL,
    ativo_id UUID NOT NULL,
    
    -- Dados da Certidão
    data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
    data_emissao TIMESTAMPTZ,
    data_validade TIMESTAMPTZ,
    numero_certidao TEXT UNIQUE,
    
    -- Conteúdo da Certidão
    historico_completo JSONB DEFAULT '{}',
    total_eventos INTEGER DEFAULT 0,
    eventos_por_tipo JSONB DEFAULT '{}',
    
    -- Validações
    status_validacao TEXT DEFAULT 'pendente', -- 'pendente', 'validado', 'rejeitado'
    validador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    data_validacao TIMESTAMPTZ,
    observacoes_validacao TEXT,
    
    -- Taxa e Pagamento
    taxa_certidao DECIMAL(10,2) DEFAULT 199.90,
    status_pagamento TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'cancelado'
    data_pagamento TIMESTAMPTZ,
    metodo_pagamento TEXT, -- 'pix', 'transferencia', 'cartao'
    
    -- Hash
    hash_certidao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE CRÉDITO PARA DOCUMENTAÇÃO (ITBI/REGISTRO)
-- =====================================================

-- Solicitações de Crédito para Documentação
CREATE TABLE IF NOT EXISTS public.creditos_documentacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Solicitante
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    
    -- Transação
    transacao_id UUID NOT NULL,
    tipo_transacao TEXT NOT NULL, -- 'itbi', 'registro', 'escritura', 'averbacao'
    
    -- Dados da Transação
    valor_transacao DECIMAL(15,2) NOT NULL,
    descricao_transacao TEXT,
    data_transacao DATE NOT NULL,
    
    -- Custos de Transferência
    custos_totais DECIMAL(15,2) NOT NULL,
    taxa_imobiliaria DECIMAL(5,2) DEFAULT 2.0,
    taxa_cartorio DECIMAL(5,2) DEFAULT 1.5,
    taxa_outros DECIMAL(5,2) DEFAULT 0.5,
    
    -- Financiamento
    valor_financiado DECIMAL(15,2) DEFAULT 0.00,
    parcelas_desejadas INTEGER DEFAULT 12,
    juros_mensais DECIMAL(5,2) DEFAULT 2.99,
    
    -- Cálculo de Parcelas
    valor_parcela_calculado DECIMAL(15,2),
    total_juros DECIMAL(15,2),
    total_pago DECIMAL(15,2) GENERATED ALWAYS AS (
        valor_parcela_calculado * parcelas_desejadas + total_juros
    ) STORED,
    
    -- Status
    status_credito TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado', 'ativo', 'pago', 'quitado'
    data_aprovacao TIMESTAMPTZ,
    data_primeira_parcela TIMESTAMPTZ,
    data_ultima_parcela TIMESTAMPTZ,
    data_quitacao TIMESTAMPTZ,
    
    -- Fintech Parceira
    fintech_parceira TEXT DEFAULT 'sb_fintech',
    id_transacao_fintech TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_credito TEXT UNIQUE
);

-- Parcelas de Crédito
CREATE TABLE IF NOT EXISTS public.parcelas_credito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credito_id UUID REFERENCES public.creditos_documentacao(id) ON DELETE CASCADE,
    
    -- Dados da Parcela
    numero_parcela INTEGER NOT NULL,
    valor_parcela DECIMAL(15,2) NOT NULL,
    valor_juros DECIMAL(15,2) DEFAULT 0.00,
    valor_principal DECIMAL(15,2) GENERATED ALWAYS AS (valor_parcela - valor_juros) STORED,
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    
    -- Status
    status_parcela TEXT DEFAULT 'pendente', -- 'pendente', 'paga', 'atrasada', 'cancelada'
    dias_atraso INTEGER DEFAULT 0,
    
    -- Pagamento
    forma_pagamento TEXT, -- 'pix', 'transferencia', 'debito'
    comprovante_url TEXT,
    hash_pagamento TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rebate de Originação (33/33/33)
CREATE TABLE IF NOT EXISTS public.rebate_origenacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Transação Original
    credito_id UUID REFERENCES public.creditos_documentacao(id) ON DELETE CASCADE,
    transacao_origem TEXT NOT NULL,
    
    -- Valores
    valor_total_rebate DECIMAL(15,2) NOT NULL,
    sb_percent DECIMAL(5,2) DEFAULT 33.33,
    imobiliaria_percent DECIMAL(5,2) DEFAULT 33.33,
    corretor_percent DECIMAL(5,2) DEFAULT 33.34,
    
    -- Valores Calculados
    valor_sb DECIMAL(15,2) GENERATED ALWAYS AS (valor_total_rebate * sb_percent / 100) STORED,
    valor_imobiliaria DECIMAL(15,2) GENERATED ALWAYS AS (valor_total_rebate * imobiliaria_percent / 100) STORED,
    valor_corretor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total_rebate * corretor_percent / 100) STORED,
    
    -- Distribuição
    status_rebate TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'distribuido', 'cancelado'
    data_processamento TIMESTAMPTZ,
    data_distribuicao TIMESTAMPTZ,
    
    -- Beneficiários
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    corretor_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Pagamentos
    sb_pago BOOLEAN DEFAULT false,
    imobiliaria_pago BOOLEAN DEFAULT false,
    corretor_pago BOOLEAN DEFAULT false,
    
    -- Hash
    hash_rebate TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_total_percent CHECK (sb_percent + imobiliaria_percent + corretor_percent = 100.00)
);

-- =====================================================
-- TABELAS DE YARA PREDICTIVE (LOOKALIKE)
-- =====================================================

-- Perfis de Compradores de Sucesso
CREATE TABLE IF NOT EXISTS public.perfis_compradores_sucesso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados do Perfil
    nome_perfil TEXT NOT NULL,
    descricao_perfil TEXT,
    
    -- Características Demográficas
    faixa_etaria TEXT, -- '25-35', '36-45', '46-55', '56+'
    faixa_renda TEXT, -- '5k-10k', '10k-20k', '20k-50k', '50k+'
    perfil_profissional TEXT, -- 'empresario', 'executivo', 'profissional_liberal', 'investidor'
    
    -- Preferências de Compra
    tipos_imovel_preferidos TEXT[] DEFAULT '{}', -- 'apartamento', 'casa', 'cobertura', 'terreno'
    bairros_preferidos TEXT[] DEFAULT '{}',
    valor_medio_compra DECIMAL(12,2),
    prazo_medio_compra INTEGER, -- meses
    
    -- Comportamento
    taxa_engajamento DECIMAL(5,2), -- % de leads que avançam
    taxa_conversao DECIMAL(5,2), -- % de leads que compram
    tempo_medio_decisao INTEGER, -- dias
    
    -- Dados Geográficos
    regioes_atuacao TEXT[] DEFAULT '{}', -- 'norte', 'sul', 'leste', 'oeste', 'centro'
    raio_atuacao_km INTEGER DEFAULT 10,
    
    -- Status
    status_perfil TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'arquivado'
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_perfil TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análises Predictivas
CREATE TABLE IF NOT EXISTS public.analises_predictivas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados da Análise
    nome_analise TEXT NOT NULL,
    tipo_analise TEXT NOT NULL, -- 'lookalike', 'cluster', 'predicao'
    data_analise TIMESTAMPTZ DEFAULT NOW(),
    
    -- Parâmetros
    perfil_referencia_id UUID REFERENCES public.perfis_compradores_sucesso(id) ON DELETE SET NULL,
    regiao_analise TEXT,
    raio_analise_km INTEGER DEFAULT 10,
    
    -- Resultados
    total_potenciais_detectados INTEGER DEFAULT 0,
    potenciais_gerados UUID[] DEFAULT '{}',
    score_confianca DECIMAL(5,2) DEFAULT 0.00, -- 0 a 100
    
    -- Detalhes
    detalhes_analise JSONB DEFAULT '{}',
    recomendacoes TEXT[] DEFAULT '{}',
    
    -- Status
    status_analise TEXT DEFAULT 'em_processamento', -- 'em_processamento', 'concluida', 'falha'
    data_conclusao TIMESTAMPTZ,
    
    -- Hash
    hash_analise TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Potenciais Detectados
CREATE TABLE IF NOT EXISTS public.potenciais_detectados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analise_id UUID REFERENCES public.analises_predictivas(id) ON DELETE CASCADE,
    
    -- Dados do Potencial
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    perfil_comparado_id UUID REFERENCES public.perfis_compradores_sucesso(id) ON DELETE SET NULL,
    
    -- Score de Similaridade
    score_similaridade DECIMAL(5,2) DEFAULT 0.00, -- 0 a 100
    fatores_similaridade JSONB DEFAULT '{}',
    
    -- Dados do Cliente
    dados_cliente JSONB DEFAULT '{}',
    
    -- Status
    status_potencial TEXT DEFAULT 'detectado', -- 'detectado', 'contatado', 'interessado', 'convertido', 'perdido'
    data_contato TIMESTAMPTZ,
    data_conversao TIMESTAMPTZ,
    
    -- Broker Responsável
    broker_responsavel_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Hash
    hash_potencial TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE FLUXO BANCÁRIO (FINTECH LAYER)
-- =====================================================

-- Consolidado de Fluxo Bancário
CREATE TABLE IF NOT EXISTS public.fluxo_bancario_consolidado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Período
    data_consolidacao DATE NOT NULL,
    mes_referencia DATE GENERATED ALWAYS AS (DATE_TRUNC('month', data_consolidacao)::DATE) STORED,
    ano_referencia INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data_consolidacao)) STORED,
    
    -- Imobiliária
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Comissões de Financiamento
    total_comissoes_recebidas DECIMAL(15,2) DEFAULT 0.00,
    comissoes_pendentes DECIMAL(15,2) DEFAULT 0.00,
    comissoes_atrasadas DECIMAL(15,2) DEFAULT 0.00,
    
    -- Split de Comissões
    total_imobiliaria DECIMAL(15,2) DEFAULT 0.00,
    total_corretores DECIMAL(15,2) DEFAULT 0.00,
    total_sb_tecnologia DECIMAL(15,2) DEFAULT 0.00,
    
    -- Rebates de Originação
    total_rebates_gerados DECIMAL(15,2) DEFAULT 0.00,
    total_rebates_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    rebates_pendentes DECIMAL(15,2) DEFAULT 0.00,
    
    -- Créditos Documentação
    total_creditos_concedidos DECIMAL(15,2) DEFAULT 0.00,
    total_parcelas_recebidas DECIMAL(15,2) DEFAULT 0.00,
    total_parcelas_pendentes DECIMAL(15,2) DEFAULT 0.00,
    total_juros_recebidos DECIMAL(15,2) DEFAULT 0.00,
    
    -- Lucro por Originador
    lucro_bruto DECIMAL(15,2) DEFAULT 0.00,
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    lucro_liquido DECIMAL(15,2) GENERATED ALWAYS AS (lucro_bruto - custos_operacionais) STORED,
    margem_lucro DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN lucro_bruto > 0 
            THEN ((lucro_bruto - custos_operacionais) / lucro_bruto * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Indicadores
    taxa_conversao_financiamento DECIMAL(5,2) DEFAULT 0.00,
    prazo_medio_financiamento INTEGER DEFAULT 0,
    ticket_medio DECIMAL(12,2) DEFAULT 0.00,
    
    -- Status
    status_consolidacao TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'revisao'
    
    -- Hash
    hash_consolidado TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações Bancárias Detalhadas
CREATE TABLE IF NOT EXISTS public.transacoes_bancarias_detalhadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados da Transação
    data_transacao DATE NOT NULL,
    tipo_transacao TEXT NOT NULL, -- 'comissao_financiamento', 'rebate_origenacao', 'parcela_credito', 'royalty_tecnologia'
    
    -- Valores
    valor_transacao DECIMAL(15,2) NOT NULL,
    valor_liquido DECIMAL(15,2),
    taxa_transacao DECIMAL(5,2) DEFAULT 0.00,
    
    -- Origem
    origem_id UUID NOT NULL,
    origem_tipo TEXT NOT NULL, -- 'comissao_financiamento', 'rebate_origenacao', 'parcela_credito', 'faturamento_tecnologia'
    
    -- Beneficiários
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Banco
    banco_destino TEXT,
    agencia_destino TEXT,
    conta_destino TEXT,
    
    -- Status
    status_transacao TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'concluida', 'cancelada', 'estornada'
    data_processamento TIMESTAMPTZ,
    data_conclusao TIMESTAMPTZ,
    
    -- Comprovação
    comprovante_url TEXT,
    hash_comprovante TEXT,
    
    -- Hash
    hash_transacao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE SOBERANIA TOTAL (WHITE LABEL)
-- =====================================================

-- Configurações de White Label
CREATE TABLE IF NOT EXISTS public.configuracoes_white_label (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Imobiliária
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Configurações Visuais
    modo_invisivel BOOLEAN DEFAULT true,
    mostrar_powered_by BOOLEAN DEFAULT true,
    logo_personalizada_url TEXT,
    cor_primaria TEXT DEFAULT '#1a1a1a',
    cor_secundaria TEXT DEFAULT '#2563eb',
    
    -- Configurações de Domínio
    subdomínio_personalizado TEXT,
    dominio_personalizado TEXT,
    ssl_ativo BOOLEAN DEFAULT false,
    
    -- Configurações de Funcionalidades
    funcionalidades_visiveis TEXT[] DEFAULT '{}', -- ['dashboard', 'leads', 'financiamento', 'analytics']
    funcionalidades_ocultas TEXT[] DEFAULT '{}', -- ['sb_branding', 'ecossistema_total', 'ourobos_compliance']
    
    -- Configurações de Relatórios
    relatorios_personalizados BOOLEAN DEFAULT false,
    logo_relatorios TEXT,
    cabecalho_relatorios TEXT,
    
    -- Status
    status_configuracao TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'manutencao'
    data_ativacao DATE,
    
    -- Hash
    hash_configuracao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Acesso White Label
CREATE TABLE IF NOT EXISTS public.logs_acesso_white_label (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados do Acesso
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Acesso
    data_acesso TIMESTAMPTZ DEFAULT NOW(),
    ip_acesso TEXT,
    user_agent TEXT,
    
    -- Página Acessada
    url_acessada TEXT,
    pagina_acessada TEXT,
    
    -- Dispositivo
    dispositivo_tipo TEXT, -- 'desktop', 'mobile', 'tablet'
    dispositivo_info JSONB DEFAULT '{}',
    
    -- Status
    status_acesso TEXT DEFAULT 'sucesso', -- 'sucesso', 'falha', 'bloqueado'
    motivo_bloqueio TEXT,
    
    -- Hash
    hash_acesso TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash do Asset Timeline
CREATE OR REPLACE FUNCTION public.gerar_hash_asset_timeline()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_evento := encode(sha256(
        NEW.ativo_tipo || 
        NEW.ativo_id::TEXT || 
        NEW.tipo_evento || 
        NEW.data_evento::TEXT || 
        COALESCE(NEW.descricao_evento, '') || 
        NEW.created_at::TEXT
    ), 'hex');
    
    NEW.hash_registro := encode(sha256(
        NEW.hash_evento || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_asset_timeline
    BEFORE INSERT ON public.asset_timeline
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_asset_timeline();

-- Trigger para criar Asset Timeline automaticamente
CREATE OR REPLACE FUNCTION public.criar_asset_timeline_automatico()
RETURNS TRIGGER AS $$
DECLARE
    timeline_id UUID;
BEGIN
    -- Criar timeline para avaliações
    IF TG_TABLE_NAME = 'avaliacoes_imoveis' THEN
        INSERT INTO public.asset_timeline (
            ativo_tipo,
            ativo_id,
            projeto_id,
            area_id,
            unidade_id,
            tipo_evento,
            descricao_evento,
            broker_id,
            valor_ativo,
            dados_evento
        ) VALUES (
            'avaliacao',
            NEW.id,
            NEW.projeto_id,
            NEW.area_id,
            NEW.unidade_id,
            'avaliacao',
            'Avaliação registrada no sistema',
            NEW.broker_id,
            NEW.valor_avaliacao,
            jsonb_build_object(
                'avaliacao_id', NEW.id,
                'valor_avaliacao', NEW.valor_avaliacao,
                'data_avaliacao', NEW.data_avaliacao,
                'observacoes', NEW.observacoes
            )
        ) RETURNING id INTO timeline_id;
    END IF;
    
    -- Criar timeline para vendas
    IF TG_TABLE_NAME = 'unidades_projetos' AND NEW.status_unidade = 'vendido' THEN
        INSERT INTO public.asset_timeline (
            ativo_tipo,
            ativo_id,
            projeto_id,
            unidade_id,
            tipo_evento,
            descricao_evento,
            broker_id,
            cliente_id,
            valor_ativo,
            valor_transacao,
            dados_evento
        ) VALUES (
            'unidade',
            NEW.id,
            NEW.projeto_id,
            NEW.id,
            'venda',
            'Unidade vendida',
            NEW.vendedor_id,
            NEW.cliente_id,
            NEW.valor_venda,
            NEW.valor_venda,
            jsonb_build_object(
                'unidade_id', NEW.id,
                'valor_venda', NEW.valor_venda,
                'data_venda', NEW.data_venda,
                'comissao_total', NEW.comissao_total
            )
        ) RETURNING id INTO timeline_id;
    END IF;
    
    -- Criar timeline para matches
    IF TG_TABLE_NAME = 'matches_autonomos' THEN
        INSERT INTO public.asset_timeline (
            ativo_tipo,
            ativo_id,
            tipo_evento,
            descricao_evento,
            broker_id,
            dados_evento
        ) VALUES (
            'match',
            NEW.id,
            'match',
            'Match de autônomos processado',
            NEW.captador_id,
            jsonb_build_object(
                'match_id', NEW.id,
                'captador_id', NEW.captador_id,
                'parceiro_id', NEW.parceiro_id,
                'vendedor_id', NEW.vendedor_id,
                'valor_imovel', NEW.valor_imovel,
                'comissao_total', NEW.comissao_total
            )
        ) RETURNING id INTO timeline_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para calcular fluxo bancário consolidado
CREATE OR REPLACE FUNCTION public.calcular_fluxo_bancario_consolidado()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir ou atualizar consolidado do dia
    INSERT INTO public.fluxo_bancario_consolidado (
        data_consolidacao,
        imobiliaria_id,
        total_comissoes_recebidas,
        comissoes_pendentes,
        comissoes_atrasadas,
        total_imobiliaria,
        total_corretores,
        total_sb_tecnologia,
        total_rebates_gerados,
        total_rebates_distribuidos,
        rebates_pendentes,
        total_creditos_concedidos,
        total_parcelas_recebidas,
        total_parcelas_pendentes,
        total_juros_recebidos,
        lucro_bruto,
        custos_operacionais
    )
    SELECT 
        CURRENT_DATE,
        imobiliaria_id,
        COALESCE(SUM(CASE WHEN status_comissao = 'pago' THEN valor_comissao_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_comissao = 'pendente' THEN valor_comissao_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_comissao = 'atrasado' THEN valor_comissao_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_comissao = 'pago' THEN valor_imobiliaria ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_comissao = 'pago' THEN valor_corretor ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_comissao = 'pago' THEN valor_sb_tecnologia ELSE 0 END), 0),
        COALESCE(SUM(valor_total_rebate), 0),
        COALESCE(SUM(CASE WHEN status_rebate = 'distribuido' THEN valor_total_rebate ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_rebate = 'pendente' THEN valor_total_rebate ELSE 0 END), 0),
        COALESCE(SUM(valor_financiado), 0),
        COALESCE(SUM(CASE WHEN status_parcela = 'paga' THEN valor_parcela ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_parcela = 'pendente' THEN valor_parcela ELSE 0 END), 0),
        COALESCE(SUM(valor_juros), 0),
        COALESCE(SUM(CASE WHEN status_transacao = 'concluida' THEN valor_transacao ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status_transacao = 'concluida' AND centro_custo = 'operacional' THEN valor_transacao ELSE 0 END), 0)
    FROM public.comissoes_financiamento cf
    LEFT JOIN public.rebate_origenacao ro ON cf.id = ro.credito_id
    LEFT JOIN public.parcelas_credito pc ON cf.id = pc.credito_id
    LEFT JOIN public.transacoes_bancarias_detalhadas tb ON tb.origem_id = cf.id AND tb.origem_tipo = 'comissao_financiamento'
    WHERE cf.imobiliaria_id = NEW.imobiliaria_id
    AND DATE_TRUNC('day', cf.data_contrato) = CURRENT_DATE
    GROUP BY imobiliaria_id
    ON CONFLICT (imobiliaria_id, data_consolidacao)
    DO UPDATE SET
        total_comissoes_recebidas = EXCLUDED.total_comissoes_recebidas,
        comissoes_pendentes = EXCLUDED.comissoes_pendentes,
        comissoes_atrasadas = EXCLUDED.comissoes_atrasadas,
        total_imobiliaria = EXCLUDED.total_imobiliaria,
        total_corretores = EXCLUDED.total_corretores,
        total_sb_tecnologia = EXCLUDED.total_sb_tecnologia,
        total_rebates_gerados = EXCLUDED.total_rebates_gerados,
        total_rebates_distribuidos = EXCLUDED.total_rebates_distribuidos,
        rebates_pendentes = EXCLUDED.rebates_pendentes,
        total_creditos_concedidos = EXCLUDED.total_creditos_concedidos,
        total_parcelas_recebidas = EXCLUDED.total_parcelas_recebidas,
        total_parcelas_pendentes = EXCLUDED.total_parcelas_pendentes,
        total_juros_recebidos = EXCLUDED.total_juros_recebidos,
        lucro_bruto = EXCLUDED.lucro_bruto,
        custos_operacionais = EXCLUDED.custos_operacionais,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para gerar certidão de histórico
CREATE OR REPLACE FUNCTION public.gerar_certidao_historico(
    p_ativo_tipo TEXT,
    p_ativo_id UUID,
    p_solicitante_id UUID,
    p_imobiliaria_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    certidao_id UUID;
    total_eventos INTEGER;
    eventos_por_tipo JSONB;
    historico_completo JSONB;
BEGIN
    -- Buscar eventos do ativo
    SELECT 
        COUNT(*) as total,
        jsonb_object_agg(tipo_evento, COUNT(*) ORDER BY tipo_evento) as eventos_tipo,
        jsonb_agg(
            jsonb_build_object(
                'data_evento', data_evento,
                'tipo_evento', tipo_evento,
                'descricao', descricao_evento,
                'broker_id', broker_id,
                'valor_ativo', valor_ativo,
                'valor_transacao', valor_transacao,
                'hash_evento', hash_evento
            ) ORDER BY data_evento
        ) as historico
    INTO total_eventos, eventos_por_tipo, historico_completo
    FROM public.asset_timeline
    WHERE ativo_tipo = p_ativo_tipo
    AND ativo_id = p_ativo_id
    GROUP BY ativo_tipo, ativo_id;
    
    -- Gerar certidão
    INSERT INTO public.certidao_historico_sb (
        solicitante_id,
        imobiliaria_id,
        ativo_tipo,
        ativo_id,
        historico_completo,
        total_eventos,
        eventos_por_tipo,
        numero_certidao,
        hash_certidao
    ) VALUES (
        p_solicitante_id,
        p_imobiliaria_id,
        p_ativo_tipo,
        p_ativo_id,
        historico_completo,
        total_eventos,
        eventos_por_tipo,
        'SB-' || UPPER(substring(md5(random()::text), 1, 8)),
        encode(sha256(
            p_ativo_tipo || 
            p_ativo_id::TEXT || 
            p_solicitante_id::TEXT || 
            CURRENT_DATE::TEXT
        ), 'hex')
    ) RETURNING id INTO certidao_id;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'certidao_id', certidao_id,
        'numero_certidao', 'SB-' || UPPER(substring(md5(random()::text), 1, 8)),
        'total_eventos', total_eventos,
        'eventos_por_tipo', eventos_por_tipo,
        'data_emissao', NOW()
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para análise predictiva lookalike
CREATE OR REPLACE FUNCTION public.analisar_lookalike_compradores(
    p_perfil_referencia_id UUID,
    p_regiao TEXT DEFAULT NULL,
    p_raio_km INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    analise_id UUID;
    potenciais_detectados UUID[];
    total_potenciais INTEGER;
BEGIN
    -- Criar análise
    INSERT INTO public.analises_predictivas (
        nome_analise,
        tipo_analise,
        perfil_referencia_id,
        regiao_analise,
        raio_analise_km
    ) VALUES (
        'Análise Lookalike - ' || (SELECT nome_perfil FROM public.perfis_compradores_sucesso WHERE id = p_perfil_referencia_id),
        'lookalike',
        p_perfil_referencia_id,
        p_regiao,
        p_raio_km
    ) RETURNING id INTO analise_id;
    
    -- Buscar clientes similares (simplificado)
    -- Em um sistema real, isso usaria algoritmos mais sofisticados
    SELECT array_agg(cliente_id) INTO potenciais_detectados
    FROM public.clientes c
    WHERE c.created_at >= CURRENT_DATE - INTERVAL '6 months'
    AND (
        p_regiao IS NULL OR 
        LOWER(c.cidade) = LOWER(p_regiao)
    )
    LIMIT 50;
    
    total_potenciais := COALESCE(array_length(potenciais_detectados), 0);
    
    -- Inserir potenciais detectados
    IF total_potenciais > 0 THEN
        INSERT INTO public.potenciais_detectados (
            analise_id,
            cliente_id,
            score_similaridade,
            fatores_similaridade,
            dados_cliente,
            hash_potencial
        ) SELECT 
            analise_id,
            cliente_id,
            75.0 + (random() * 20), -- Score simulado entre 75-95
            jsonb_build_object(
                'faixa_etaria', 'match',
                'faixa_renda', 'match',
                'regiao', 'match'
            ),
            jsonb_build_object(
                'cliente_id', cliente_id,
                'nome', nome,
                'email', email,
                'telefone', telefone
            ),
            encode(sha256(
                cliente_id::TEXT || 
                analise_id::TEXT || 
                NOW()::TEXT
            ), 'hex')
        FROM unnest(potenciais_detectados) AS t(cliente_id)
        JOIN public.clientes c ON c.id = t.cliente_id;
    END IF;
    
    -- Atualizar análise
    UPDATE public.analises_predictivas
    SET 
        total_potenciais_detectados = total_potenciais,
        potenciais_gerados = potenciais_detectados,
        score_confianca = 85.0,
        status_analise = 'concluida',
        data_conclusao = NOW(),
        hash_analise = encode(sha256(
            analise_id::TEXT || 
            total_potenciais::TEXT || 
            NOW()::TEXT
        ), 'hex')
    WHERE id = analise_id;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'analise_id', analise_id,
        'total_potenciais_detectados', total_potenciais,
        'score_confianca', 85.0,
        'mensagem', 'Oportunidade Preditiva: Detectamos ' || total_potenciais || ' potenciais investidores com perfil similar na região ' || COALESCE(p_regiao, 'analisada')
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS OTIMIZADAS
-- =====================================================

-- View de DNA do Ativo
CREATE OR REPLACE VIEW public.dna_ativo AS
SELECT 
    ativo_id,
    ativo_tipo,
    projeto_id,
    area_id,
    unidade_id,
    COUNT(*) as total_eventos,
    jsonb_agg(
        jsonb_build_object(
            'data_evento', data_evento,
            'tipo_evento', tipo_evento,
            'descricao', descricao_evento,
            'broker_id', broker_id,
            'valor_ativo', valor_ativo,
            'hash_evento', hash_evento
        ) ORDER BY data_evento
    ) as timeline_completa,
    MIN(data_evento) as data_primeiro_evento,
    MAX(data_evento) as data_ultimo_evento,
    jsonb_object_agg(tipo_evento, COUNT(*) ORDER BY tipo_evento) as resumo_eventos,
    COALESCE(SUM(valor_transacao), 0) as valor_total_transacoes
FROM public.asset_timeline
GROUP BY ativo_id, ativo_tipo, projeto_id, area_id, unidade_id;

-- View de Dashboard de Fluxo Bancário
CREATE OR REPLACE VIEW public.dashboard_fluxo_bancario AS
SELECT 
    fbc.*,
    ip.nome_fantasia as imobiliaria_nome,
    ip.cnpj as imobiliaria_cnpj,
    COUNT(DISTINCT cf.id) as total_financiamentos,
    COUNT(DISTINCT pc.id) as total_parcelas,
    COUNT(DISTINCT ro.id) as total_rebates,
    CASE 
        WHEN fbc.lucro_liquido > 0 THEN 'lucrativo'
        WHEN fbc.lucro_liquido = 0 THEN 'neutro'
        ELSE 'prejuizo'
    END as status_financeiro,
    fbc.margem_lucro
FROM public.fluxo_bancario_consolidado fbc
LEFT JOIN public.imobiliarias_parceiras ip ON fbc.imobiliaria_id = ip.id
LEFT JOIN public.comissoes_financiamento cf ON cf.imobiliaria_id = ip.id AND DATE_TRUNC('month', cf.data_contrato) = fbc.mes_referencia
LEFT JOIN public.parcelas_credito pc ON pc.credito_id IN (SELECT id FROM public.comissoes_financiamento WHERE imobiliaria_id = ip.id AND DATE_TRUNC('month', data_contrato) = fbc.mes_referencia)
LEFT JOIN public.rebate_origenacao ro ON ro.imobiliaria_id = ip.id AND DATE_TRUNC('month', ro.data_processamento) = fbc.mes_referencia
GROUP BY fbc.id, ip.nome_fantasia, ip.cnpj;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_asset_timeline_ativo ON public.asset_timeline(ativo_tipo, ativo_id);
CREATE INDEX IF NOT EXISTS idx_asset_timeline_data ON public.asset_timeline(data_evento);
CREATE INDEX IF NOT EXISTS idx_asset_timeline_broker ON public.asset_timeline(broker_id);
CREATE INDEX IF NOT EXISTS idx_certidao_historico_ativo ON public.certidao_historico_sb(ativo_tipo, ativo_id);
CREATE INDEX IF NOT EXISTS idx_certidao_historico_solicitante ON public.certidao_historico_sb(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_creditos_documento_status ON public.creditos_documentacao(status_credito);
CREATE INDEX IF NOT EXISTS idx_parcelas_credito_vencimento ON public.parcelas_credito(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_rebate_origenacao_status ON public.rebate_origenacao(status_rebate);
CREATE INDEX IF NOT EXISTS idx_perfis_compradores_status ON public.perfis_compradores_sucesso(status_perfil);
CREATE INDEX IF NOT EXISTS idx_analises_predictivas_tipo ON public.analises_predictivas(tipo_analise);
CREATE INDEX IF NOT EXISTS idx_potenciais_detectados_analise ON public.potenciais_detectados(analise_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_bancario_consolidado ON public.fluxo_bancario_consolidado(imobiliaria_id, data_consolidacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_bancarias_data ON public.transacoes_bancarias_detalhadas(data_transacao);
CREATE INDEX IF NOT EXISTS idx_configuracoes_white_label ON public.configuracoes_white_label(imobiliaria_id);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir perfis de compradores de sucesso
INSERT INTO public.perfis_compradores_sucesso (
    nome_perfil,
    descricao_perfil,
    faixa_etaria,
    faixa_renda,
    perfil_profissional,
    tipos_imovel_preferidos,
    bairros_preferidos,
    valor_medio_compra,
    prazo_medio_compra,
    taxa_engajamento,
    taxa_conversao,
    tempo_medio_decisao,
    regioes_atuacao,
    raio_atuacao_km,
    status_perfil
) VALUES
('Investidor Artesão', 'Perfil de investidor experiente que busca imóveis de alto valor', '46-55', '50k+', 'empresario', ARRAY['cobertura', 'apartamento'], ARRAY['higienopolis', 'vila_mariana', 'jardins'], 2500000.00, 180, 85.0, 25.0, 45, ARRAY['sul', 'oeste'], 15, 'ativo'),
('Executivo Jovem', 'Profissional bem-sucedido buscando primeiro imóvel', '36-45', '20k-50k', 'executivo', ARRAY['apartamento', 'casa'], ARRAY['pinheiros', 'moema', 'barra'], 800000.00, 240, 70.0, 15.0, 90, ARRAY['sul', 'zona_sul'], 10, 'ativo'),
('Profissional Liberal', 'Autônomo buscando estabilidade e valorização', '25-35', '10k-20k', 'profissional_liberal', ARRAY['apartamento', 'studio'], ARRAY['centro', 'botafogo', 'flamengo'], 500000.00, 300, 60.0, 12.0, 60, ARRAY['centro', 'sul', 'zona_norte'], 8, 'ativo');

-- Inserir configurações de white label
INSERT INTO public.configuracoes_white_label (
    imobiliaria_id,
    modo_invisivel,
    mostrar_powered_by,
    logo_personalizada_url,
    cor_primaria,
    cor_secundaria,
    funcionalidades_visiveis,
    funcionalidades_ocultas,
    status_configuracao,
    data_ativacao
) VALUES
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Central' LIMIT 1), true, true, null, '#1a1a1a', '#2563eb', ARRAY['dashboard', 'leads', 'financiamento'], ARRAY['sb_branding', 'ecossistema_total'], 'ativa', CURRENT_DATE),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Premium' LIMIT 1), true, false, null, '#ffffff', '#000000', ARRAY['dashboard', 'leads', 'analytics'], ARRAY['sb_branding', 'ourobos_compliance'], 'ativa', CURRENT_DATE),
((SELECT id FROM public.imobiliarias_parceiras WHERE nome_fantasia = 'SB Imobiliária Nordeste' LIMIT 1), true, true, null, '#2c3e50', '#ffffff', ARRAY['dashboard', 'leads', 'financiamento'], ARRAY['sb_branding', 'ecossistema_total'], 'ativa', CURRENT_DATE);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V25 - OMNISCIENT INTELIGÊNCIA PREDITIVA CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.asset_timeline) as total_timeline_eventos,
       (SELECT COUNT(*) FROM public.certidao_historico_sb) as total_certidoes_emitidas,
       (SELECT COUNT(*) FROM public.creditos_documentacao) as total_creditos_concedidos,
       (SELECT COUNT(*) FROM public.parcelas_credito) as total_parcelas_geradas,
       (SELECT COUNT(*) FROM public.rebate_origenacao) as total_rebates_gerados,
       (SELECT COUNT(*) FROM public.perfis_compradores_sucesso) as total_perfis_sucesso,
       (SELECT COUNT(*) FROM public.analises_predictivas) as total_analises_predictivas,
       (SELECT COUNT(*) FROM public.potenciais_detectados) as total_potenciais_detectados,
       (SELECT COUNT(*) FROM public.fluxo_bancario_consolidado) as total_fluxos_consolidados,
       (SELECT COUNT(*) FROM public.configuracoes_white_label) as total_configuracoes_white_label;
