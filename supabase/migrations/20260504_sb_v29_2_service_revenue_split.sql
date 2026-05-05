-- 💰 SECURITY BROKER SB v29.2 - SERVICE REVENUE & SPLIT
-- Schema completo para monetização sobre prestação de serviços

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- SPLIT DE SERVIÇO (TAKE RATE 20%)
-- =====================================================

-- Configuração de Split de Serviço
CREATE TABLE IF NOT EXISTS public.configuracao_split_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    tipo_servico TEXT NOT NULL, -- 'limpeza', 'manutencao', 'pintura', 'jardim', 'eletrica', 'hidraulica'
    
    -- Take Rate (Retenção da Plataforma)
    take_rate_padrao DECIMAL(5,2) DEFAULT 20.00, -- % padrão
    take_rate_minimo DECIMAL(5,2) DEFAULT 15.00, -- % mínimo
    take_rate_maximo DECIMAL(5,2) DEFAULT 30.00, -- % máximo
    
    -- Ajuste por Score (Quanto maior o score, menor o take rate)
    score_minimo_reducao DECIMAL(5,2) DEFAULT 85.00, -- Score mínimo para redução
    taxa_reducao DECIMAL(5,2) DEFAULT 5.00, -- % de redução por ponto acima do mínimo
    
    -- Split Automático
    split_prestador DECIMAL(5,2) DEFAULT 80.00, -- % para o prestador
    split_plataforma DECIMAL(5,2) DEFAULT 20.00, -- % para a plataforma
    
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

-- Fluxo Financeiro de Serviços
CREATE TABLE IF NOT EXISTS public.fluxo_financeiro_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    transacao_id TEXT UNIQUE NOT NULL,
    os_id UUID REFERENCES public.ordens_servicos_limpeza(id) ON DELETE CASCADE,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL,
    
    -- Valores
    valor_total_servico DECIMAL(15,2) NOT NULL,
    take_rate_aplicada DECIMAL(5,2) NOT NULL, -- % aplicada nesta transação
    valor_retido_plataforma DECIMAL(15,2) GENERATED ALWAYS AS (
        valor_total_servico * take_rate_aplicada / 100
    ) STORED,
    valor_liquido_prestador DECIMAL(15,2) GENERATED ALWAYS AS (
        valor_total_servico - valor_retido_plataforma
    ) STORED,
    
    -- Status do Fluxo
    status_fluxo TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'concluido', 'cancelado', 'estornado'
    data_pagamento_cliente TIMESTAMPTZ,
    data_retirada_prestador TIMESTAMPTZ,
    data_conclusao_servico TIMESTAMPTZ,
    
    -- Wallet SB (Retenção)
    wallet_sb_id TEXT UNIQUE,
    valor_wallet_sb DECIMAL(15,2) DEFAULT 0.00,
    status_wallet TEXT DEFAULT 'pendente', -- 'pendente', 'disponivel', 'utilizado', 'bloqueado'
    
    -- Split Final
    split_prestador_final DECIMAL(5,2) DEFAULT 80.00, -- % final após ajustes
    split_plataforma_final DECIMAL(5,2) DEFAULT 20.00, -- % final após ajustes
    valor_final_prestador DECIMAL(15,2) DEFAULT 0.00,
    valor_final_plataforma DECIMAL(15,2) DEFAULT 0.00,
    
    -- Detalhes do Pagamento
    forma_pagamento_cliente TEXT, -- 'pix', 'cartao', 'boleto', 'transferencia'
    forma_pagamento_prestador TEXT, -- 'pix', 'transferencia', 'saque'
    
    -- Metadata
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_transacao TEXT UNIQUE
);

-- Wallet SB (Carteira da Plataforma)
CREATE TABLE IF NOT EXISTS public.wallet_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    wallet_id TEXT UNIQUE NOT NULL,
    usuario_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Saldo
    saldo_disponivel DECIMAL(15,2) DEFAULT 0.00,
    saldo_bloqueado DECIMAL(15,2) DEFAULT 0.00,
    saldo_total DECIMAL(15,2) GENERATED ALWAYS AS (
        saldo_disponivel + saldo_bloqueado
    ) STORED,
    
    -- Transações
    total_creditado DECIMAL(15,2) DEFAULT 0.00,
    total_debitado DECIMAL(15,2) DEFAULT 0.00,
    total_sacado DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status
    status_wallet TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'bloqueada', 'encerrada'
    data_criacao DATE DEFAULT CURRENT_DATE,
    ultima_movimentacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_wallet TEXT UNIQUE
);

-- Movimentações da Wallet SB
CREATE TABLE IF NOT EXISTS public.movimentacoes_wallet_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    movimentacao_id TEXT UNIQUE NOT NULL,
    wallet_id UUID REFERENCES public.wallet_sb(id) ON DELETE CASCADE,
    transacao_origem TEXT, -- ID da transação original
    
    -- Detalhes da Movimentação
    tipo_movimentacao TEXT NOT NULL, -- 'credito', 'debito', 'saque', 'bloqueio', 'desbloqueio'
    valor_movimentacao DECIMAL(15,2) NOT NULL,
    saldo_antes DECIMAL(15,2) NOT NULL,
    saldo_depois DECIMAL(15,2) NOT NULL,
    descricao_movimentacao TEXT NOT NULL,
    
    -- Referências
    os_id UUID REFERENCES public.ordens_servicos_limpeza(id) ON DELETE SET NULL,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
    
    -- Status
    status_movimentacao TEXT DEFAULT 'pendente', -- 'pendente', 'confirmada', 'cancelada'
    data_movimentacao TIMESTAMPTZ DEFAULT NOW(),
    data_confirmacao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_movimentacao TEXT UNIQUE
);

-- =====================================================
-- TAXA DE CONVENIÊNCIA (MARKETPLACE)
-- =====================================================

-- Configuração de Taxa de Conveniência
CREATE TABLE IF NOT EXISTS public.configuracao_taxa_conveniencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    config_id TEXT UNIQUE NOT NULL,
    tipo_imovel TEXT NOT NULL, -- 'apartamento', 'casa', 'studio', 'loft', 'kitnet'
    
    -- Taxa de Conveniência
    taxa_conveniencia_padrao DECIMAL(5,2) DEFAULT 10.00, -- % padrão
    taxa_conveniencia_minima DECIMAL(5,2) DEFAULT 5.00, -- % mínimo
    taxa_conveniencia_maxima DECIMAL(5,2) DEFAULT 20.00, -- % máximo
    
    -- Aplicação
    aplicar_em TEXT DEFAULT 'diaria', -- 'diaria', 'semanal', 'unica'
    base_calculo TEXT DEFAULT 'valor_diaria', -- 'valor_diaria', 'valor_total', 'valor_liquido'
    
    -- Condições
    valor_minimo_aplicacao DECIMAL(10,2) DEFAULT 100.00, -- valor mínimo para aplicar a taxa
    valor_maximo_aplicacao DECIMAL(10,2) DEFAULT 10000.00, -- valor máximo para aplicar a taxa
    dias_minima_estadia INTEGER DEFAULT 1, -- dias mínimos para aplicar
    
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

-- Taxas Aplicadas em Reservas
CREATE TABLE IF NOT EXISTS public.taxas_conveniencia_aplicadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    taxa_id TEXT UNIQUE NOT NULL,
    reserva_id UUID NOT NULL,
    imovel_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    
    -- Detalhes da Taxa
    taxa_conveniencia_aplicada DECIMAL(5,2) NOT NULL,
    valor_base_calculo DECIMAL(15,2) NOT NULL,
    valor_taxa_conveniencia DECIMAL(15,2) GENERATED ALWAYS AS (
        valor_base_calculo * taxa_conveniencia_aplicada / 100
    ) STORED,
    dias_estadia INTEGER NOT NULL,
    
    -- Cálculo
    valor_total_com_taxa DECIMAL(15,2) NOT NULL,
    valor_total_sem_taxa DECIMAL(15,2) GENERATED ALWAYS AS (
        valor_total_com_taxa - valor_taxa_conveniencia
    ) STORED,
    
    -- Status
    status_taxa TEXT DEFAULT 'pendente', -- 'pendente', 'aplicada', 'cancelada', 'estornada'
    data_aplicacao TIMESTAMPTZ DEFAULT NOW(),
    data_estorno TIMESTAMPTZ,
    motivo_estorno TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_taxa TEXT UNIQUE
);

-- =====================================================
-- RANKING DE PRESTADORES (MÉRITO FOTOGRÁFICO)
-- =====================================================

-- Métricas Fotográficas dos Prestadores
CREATE TABLE IF NOT EXISTS public.metricas_fotograficas_prestadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    metrica_id TEXT UNIQUE NOT NULL,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE CASCADE,
    vistoria_id UUID REFERENCES public.vistorias_saida(id) ON DELETE CASCADE,
    
    -- Avaliação Fotográfica
    qualidade_foto DECIMAL(5,2) NOT NULL, -- 0-100
    nitidez_imagem DECIMAL(5,2) NOT NULL, -- 0-100
    iluminação_adequada DECIMAL(5,2) NOT NULL, -- 0-100
    angulacao_profissional DECIMAL(5,2) NOT NULL, -- 0-100
    cobertura_completa DECIMAL(5,2) NOT NULL, -- 0-100
    detalhes_visiveis DECIMAL(5,2) NOT NULL, -- 0-100
    timestamp_foto TIMESTAMPTZ NOT NULL,
    
    -- Score Fotográfico
    score_fotografico DECIMAL(5,2) GENERATED ALWAYS AS (
        (qualidade_foto * 0.25 + nitidez_imagem * 0.20 + 
         iluminação_adequada * 0.20 + angulacao_profissional * 0.15 + 
         cobertura_completa * 0.10 + detalhes_visiveis * 0.10)
    ) STORED,
    
    -- Validação
    validado_por TEXT, -- 'ia_yara', 'supervisor', 'cliente'
    status_validacao TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado'
    data_validacao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_metrica TEXT UNIQUE
);

-- Ranking de Prestadores por Mérito Fotográfico
CREATE TABLE IF NOT EXISTS public.ranking_fotografico_prestadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    ranking_id TEXT UNIQUE NOT NULL,
    prestador_id UUID REFERENCES public.prestadores_servico(id) ON DELETE CASCADE,
    periodo_referencia DATE NOT NULL, -- mês/ano do ranking
    
    -- Métricas do Ranking
    score_medio_fotografico DECIMAL(5,2) NOT NULL,
    total_fotos_avaliadas INTEGER DEFAULT 0,
    total_fotos_aprovadas INTEGER DEFAULT 0,
    taxa_aprovacao DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_fotos_avaliadas > 0 
            THEN (total_fotos_aprovadas::DECIMAL / total_fotos_avaliadas::DECIMAL * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Posição no Ranking
    posicao_ranking INTEGER,
    total_prestadores_periodo INTEGER DEFAULT 0,
    percentil_ranking DECIMAL(5,2) DEFAULT 0.00,
    
    -- Benefícios por Ranking
    reducao_comissao DECIMAL(5,2) DEFAULT 0.00, -- % de redução na comissão
    bonus_prioridade INTEGER DEFAULT 0, -- pontos extras na roleta
    destaque_plataforma BOOLEAN DEFAULT false, -- destaque especial
    
    -- Status
    status_ranking TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'suspenso'
    data_calculo TIMESTAMPTZ DEFAULT NOW(),
    data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_ranking TEXT UNIQUE
);

-- =====================================================
-- REINO DE JESUS CRISTO (IMPACTO SOCIAL V29.2)
-- =====================================================

-- Tesouro Reino de Jesus Cristo V29.2
CREATE TABLE IF NOT EXISTS public.tesouro_reino_jesus_cristo_v29_2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    mes_referencia DATE UNIQUE NOT NULL,
    
    -- Faturamento Consolidado (13 Fontes: 12 Fronts + Prestadores)
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
    faturamento_prestadores_servicos DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Fonte 13
    faturamento_taxa_conveniencia DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Taxa de conveniência
    
    -- Totais
    faturamento_bruto_total DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_venda_match + faturamento_recorrencia_5x5 + faturamento_short_stay + 
        faturamento_administracao + faturamento_marketplace_servicos + faturamento_land_banking + 
        faturamento_equity_fundo + faturamento_selo_juris + faturamento_data_sub + 
        faturamento_antecipacao + faturamento_seguros + faturamento_financiamento_bancario + 
        faturamento_prestadores_servicos + faturamento_taxa_conveniencia
    ) STORED,
    
    -- Deduções
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    splits_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    royalties_pagos DECIMAL(15,2) DEFAULT 0.00,
    reparos_danos_pagos DECIMAL(15,2) DEFAULT 0.00,
    taxes_conveniencia_devolvidas DECIMAL(15,2) DEFAULT 0.00, -- NOVO: Devoluções de taxas
    
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

-- Projetos do Reino de Jesus Cristo
CREATE TABLE IF NOT EXISTS public.projetos_reino_jesus_cristo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    projeto_id TEXT UNIQUE NOT NULL,
    tesouro_id UUID REFERENCES public.tesouro_reino_jesus_cristo_v29_2(id) ON DELETE CASCADE,
    
    -- Detalhes do Projeto
    nome_projeto TEXT NOT NULL,
    tipo_projeto TEXT NOT NULL, -- 'igreja_local', 'obra_missionaria', 'ajuda_desamparados', 'evangelizacao', 'acao_social', 'capacitacao_prestadores'
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

-- Trigger para gerar hash de Configuração Split
CREATE OR REPLACE FUNCTION public.gerar_hash_config_split()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.tipo_servico || 
        NEW.take_rate_padrao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_split
    BEFORE INSERT ON public.configuracao_split_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_split();

-- Trigger para gerar hash de Fluxo Financeiro
CREATE OR REPLACE FUNCTION public.gerar_hash_fluxo_financeiro()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_transacao := encode(sha256(
        NEW.transacao_id || 
        NEW.os_id::TEXT || 
        NEW.valor_total_servico::TEXT || 
        NEW.take_rate_aplicada::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_fluxo_financeiro
    BEFORE INSERT ON public.fluxo_financeiro_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_fluxo_financeiro();

-- Trigger para gerar hash de Wallet SB
CREATE OR REPLACE FUNCTION public.gerar_hash_wallet_sb()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_wallet := encode(sha256(
        NEW.wallet_id || 
        NEW.usuario_id::TEXT || 
        NEW.saldo_disponivel::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_wallet_sb
    BEFORE INSERT ON public.wallet_sb
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_wallet_sb();

-- Trigger para gerar hash de Movimentação Wallet
CREATE OR REPLACE FUNCTION public.gerar_hash_movimentacao_wallet()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_movimentacao := encode(sha256(
        NEW.movimentacao_id || 
        NEW.wallet_id::TEXT || 
        NEW.tipo_movimentacao || 
        NEW.valor_movimentacao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_movimentacao_wallet
    BEFORE INSERT ON public.movimentacoes_wallet_sb
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_movimentacao_wallet();

-- Trigger para gerar hash de Configuração Taxa
CREATE OR REPLACE FUNCTION public.gerar_hash_config_taxa_conveniencia()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_config := encode(sha256(
        NEW.config_id || 
        NEW.tipo_imovel || 
        NEW.taxa_conveniencia_padrao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_config_taxa_conveniencia
    BEFORE INSERT ON public.configuracao_taxa_conveniencia
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_config_taxa_conveniencia();

-- Trigger para gerar hash de Taxa Aplicada
CREATE OR REPLACE FUNCTION public.gerar_hash_taxa_aplicada()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_taxa := encode(sha256(
        NEW.taxa_id || 
        NEW.reserva_id::TEXT || 
        NEW.valor_taxa_conveniencia::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_taxa_aplicada
    BEFORE INSERT ON public.taxas_conveniencia_aplicadas
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_taxa_aplicada();

-- Trigger para gerar hash de Métrica Fotográfica
CREATE OR REPLACE FUNCTION public.gerar_hash_metrica_fotografica()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_metrica := encode(sha256(
        NEW.metrica_id || 
        NEW.prestador_id::TEXT || 
        NEW.score_fotografico::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_metrica_fotografica
    BEFORE INSERT ON public.metricas_fotograficas_prestadores
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_metrica_fotografica();

-- Trigger para gerar hash de Ranking Fotográfico
CREATE OR REPLACE FUNCTION public.gerar_hash_ranking_fotografico()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_ranking := encode(sha256(
        NEW.ranking_id || 
        NEW.prestador_id::TEXT || 
        NEW.score_medio_fotografico::TEXT || 
        NEW.periodo_referencia::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_ranking_fotografico
    BEFORE INSERT ON public.ranking_fotografico_prestadores
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_ranking_fotografico();

-- Trigger para gerar hash de Tesouro Reino Jesus Cristo
CREATE OR REPLACE FUNCTION public.gerar_hash_tesouro_reino_jesus_cristo()
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

CREATE TRIGGER trigger_gerar_hash_tesouro_reino_jesus_cristo
    BEFORE INSERT ON public.tesouro_reino_jesus_cristo_v29_2
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_tesouro_reino_jesus_cristo();

-- Trigger para gerar hash de Projeto Reino Jesus Cristo
CREATE OR REPLACE FUNCTION public.gerar_hash_projeto_reino_jesus_cristo()
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

CREATE TRIGGER trigger_gerar_hash_projeto_reino_jesus_cristo
    BEFORE INSERT ON public.projetos_reino_jesus_cristo
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_projeto_reino_jesus_cristo();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO AVANÇADAS
-- =====================================================

-- Função para calcular take rate baseado no score
CREATE OR REPLACE FUNCTION public.calcular_take_rate_score(
    p_prestador_id UUID,
    p_tipo_servico TEXT,
    p_valor_servico DECIMAL
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_config RECORD;
    v_prestador RECORD;
    v_take_rate DECIMAL(5,2);
    v_score_prestador DECIMAL(5,2);
    v_pontos_acima_minimo DECIMAL(5,2);
    v_reducao DECIMAL(5,2);
BEGIN
    -- Buscar configuração do tipo de serviço
    SELECT * INTO v_config
    FROM public.configuracao_split_servico
    WHERE tipo_servico = p_tipo_servico
    AND status_config = 'ativo'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN 20.00; -- Padrão se não encontrar configuração
    END IF;
    
    -- Buscar score do prestador
    SELECT score_prestador INTO v_score_prestador
    FROM public.prestadores_servico
    WHERE id = p_prestador_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN v_config.take_rate_padrao;
    END IF;
    
    -- Calcular redução baseada no score
    IF v_score_prestador > v_config.score_minimo_reducao THEN
        v_pontos_acima_minimo := v_score_prestador - v_config.score_minimo_reducao;
        v_reducao := v_pontos_acima_minimo * v_config.taxa_reducao;
        v_take_rate := GREATEST(
            v_config.take_rate_minimo,
            v_config.take_rate_padrao - v_reducao
        );
    ELSE
        v_take_rate := v_config.take_rate_padrao;
    END IF;
    
    -- Limitar entre mínimo e máximo
    v_take_rate := GREATEST(v_config.take_rate_minimo, v_take_rate);
    v_take_rate := LEAST(v_config.take_rate_maximo, v_take_rate);
    
    RETURN v_take_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar split de serviço
CREATE OR REPLACE FUNCTION public.processar_split_servico(
    p_os_id UUID,
    p_prestador_id UUID,
    p_valor_total_servico DECIMAL,
    p_forma_pagamento_cliente TEXT DEFAULT 'pix',
    p_forma_pagamento_prestador TEXT DEFAULT 'pix'
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    v_transacao_id TEXT;
    v_take_rate_aplicada DECIMAL(5,2);
    v_valor_retido_plataforma DECIMAL(15,2);
    v_valor_liquido_prestador DECIMAL(15,2);
    v_wallet_id TEXT;
    v_fluxo_record RECORD;
BEGIN
    -- Gerar ID da transação
    v_transacao_id := 'SPLIT-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Calcular take rate baseado no score
    v_take_rate_aplicada := public.calcular_take_rate_score(
        p_prestador_id,
        'limpeza', -- Ajustar conforme tipo de serviço real
        p_valor_total_servico
    );
    
    -- Calcular valores do split
    v_valor_retido_plataforma := p_valor_total_servico * v_take_rate_aplicada / 100;
    v_valor_liquido_prestador := p_valor_total_servico - v_valor_retido_plataforma;
    
    -- Gerar wallet ID
    v_wallet_id := 'WALLET-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Inserir fluxo financeiro
    INSERT INTO public.fluxo_financeiro_servico (
        transacao_id,
        os_id,
        prestador_id,
        cliente_id, -- Buscar da OS
        valor_total_servico,
        take_rate_aplicada,
        forma_pagamento_cliente,
        forma_pagamento_prestador,
        wallet_sb_id: v_wallet_id,
        valor_wallet_sb: v_valor_retido_plataforma,
        status_fluxo: 'pendente'
    )
    RETURNING * INTO v_fluxo_record;
    
    -- Criar ou atualizar wallet
    INSERT INTO public.wallet_sb (
        wallet_id: v_wallet_id,
        usuario_id: (SELECT usuario_id FROM public.ordens_servicos_limpeza WHERE id = p_os_id LIMIT 1),
        saldo_disponivel: v_valor_retido_plataforma,
        total_creditado: v_valor_retido_plataforma,
        status_wallet: 'disponivel'
    )
    ON CONFLICT (wallet_id)
    DO UPDATE SET
        saldo_disponivel = saldo_disponivel + v_valor_retido_plataforma,
        total_creditado = total_creditado + v_valor_retido_plataforma,
        ultima_movimentacao = NOW(),
        updated_at = NOW();
    
    -- Inserir movimentação de crédito na wallet
    INSERT INTO public.movimentacoes_wallet_sb (
        movimentacao_id: 'MOV-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        wallet_id: (SELECT id FROM public.wallet_sb WHERE wallet_id = v_wallet_id LIMIT 1),
        transacao_origem: v_transacao_id,
        tipo_movimentacao: 'credito',
        valor_movimentacao: v_valor_retido_plataforma,
        saldo_antes: 0,
        saldo_depois: v_valor_retido_plataforma,
        descricao_movimentacao: 'Retenção de serviço - OS: ' || p_os_id::TEXT,
        os_id: p_os_id,
        prestador_id: p_prestador_id,
        status_movimentacao: 'confirmada',
        data_movimentacao: NOW(),
        data_confirmacao: NOW()
    );
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'transacao_id', v_transacao_id,
        'take_rate_aplicada', v_take_rate_aplicada,
        'valor_total_servico', p_valor_total_servico,
        'valor_retido_plataforma', v_valor_retido_plataforma,
        'valor_liquido_prestador', v_valor_liquido_prestador,
        'wallet_id', v_wallet_id,
        'fluxo_id', v_fluxo_record.id,
        'mensagem', 'Split de serviço processado com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar conclusão de serviço e liberação do split
CREATE OR REPLACE FUNCTION public.processar_conclusao_servico(
    p_os_id UUID,
    p_status_conclusao TEXT DEFAULT 'concluido'
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    v_fluxo_record RECORD;
    v_wallet_record RECORD;
    v_valor_final_prestador DECIMAL(15,2);
    v_valor_final_plataforma DECIMAL(15,2);
BEGIN
    -- Buscar fluxo financeiro
    SELECT * INTO v_fluxo_record
    FROM public.fluxo_financeiro_servico
    WHERE os_id = p_os_id
    AND status_fluxo = 'pendente'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Fluxo financeiro não encontrado ou já processado'
        );
    END IF;
    
    -- Buscar wallet
    SELECT * INTO v_wallet_record
    FROM public.wallet_sb
    WHERE wallet_id = v_fluxo_record.wallet_sb_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Wallet não encontrada'
        );
    END IF;
    
    -- Calcular valores finais
    v_valor_final_prestador := v_fluxo_record.valor_liquido_prestador;
    v_valor_final_plataforma := v_fluxo_record.valor_retido_plataforma;
    
    -- Atualizar fluxo financeiro
    UPDATE public.fluxo_financeiro_servico
    SET 
        status_fluxo = p_status_conclusao,
        data_conclusao_servico = NOW(),
        split_prestador_final = 80.00,
        split_plataforma_final = 20.00,
        valor_final_prestador = v_valor_final_prestador,
        valor_final_plataforma = v_valor_final_plataforma,
        updated_at = NOW()
    WHERE id = v_fluxo_record.id;
    
    -- Atualizar wallet (debitar valor retido)
    UPDATE public.wallet_sb
    SET 
        saldo_disponivel = saldo_disponivel - v_valor_final_plataforma,
        total_debitado = total_debitado + v_valor_final_plataforma,
        ultima_movimentacao = NOW(),
        updated_at = NOW()
    WHERE id = v_wallet_record.id;
    
    -- Inserir movimentação de débito na wallet
    INSERT INTO public.movimentacoes_wallet_sb (
        movimentacao_id: 'MOV-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        wallet_id: v_wallet_record.id,
        transacao_origem: v_fluxo_record.transacao_id,
        tipo_movimentacao: 'debito',
        valor_movimentacao: v_valor_final_plataforma,
        saldo_antes: v_wallet_record.saldo_disponivel,
        saldo_depois: v_wallet_record.saldo_disponivel - v_valor_final_plataforma,
        descricao_movimentacao: 'Liberação de serviço - OS: ' || p_os_id::TEXT,
        os_id: p_os_id,
        prestador_id: v_fluxo_record.prestador_id,
        status_movimentacao: 'confirmada',
        data_movimentacao: NOW(),
        data_confirmacao: NOW()
    );
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'fluxo_id', v_fluxo_record.id,
        'valor_final_prestador', v_valor_final_prestador,
        'valor_final_plataforma', v_valor_final_plataforma,
        'wallet_id', v_wallet_record.wallet_id,
        'saldo_disponivel_wallet', v_wallet_record.saldo_disponivel - v_valor_final_plataforma,
        'mensagem', 'Conclusão de serviço processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular taxa de conveniência
CREATE OR REPLACE FUNCTION public.calcular_taxa_conveniencia(
    p_reserva_id UUID,
    p_tipo_imovel TEXT,
    p_valor_diaria DECIMAL,
    p_dias_estadia INTEGER,
    p_data_checkin DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    v_config RECORD;
    v_taxa_aplicada DECIMAL(5,2);
    v_valor_base_calculo DECIMAL(15,2);
    v_valor_taxa DECIMAL(15,2);
    v_valor_total DECIMAL(15,2);
    v_taxa_id TEXT;
BEGIN
    -- Buscar configuração da taxa
    SELECT * INTO v_config
    FROM public.configuracao_taxa_conveniencia
    WHERE tipo_imovel = p_tipo_imovel
    AND status_config = 'ativo'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Configuração de taxa não encontrada'
        );
    END IF;
    
    -- Validar condições de aplicação
    IF p_valor_diaria < v_config.valor_minimo_aplicacao OR 
       p_valor_diaria > v_config.valor_maximo_aplicacao OR 
       p_dias_estadia < v_config.dias_minima_estadia THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Condições para aplicação da taxa não atendidas'
        );
    END IF;
    
    -- Calcular taxa aplicada (pode ser ajustada por outras regras)
    v_taxa_aplicada := v_config.taxa_conveniencia_padrao;
    v_valor_base_calculo := p_valor_diaria * p_dias_estadia;
    
    -- Calcular valor da taxa
    v_valor_taxa := v_valor_base_calculo * v_taxa_aplicada / 100;
    v_valor_total := v_valor_base_calculo + v_valor_taxa;
    
    -- Gerar ID da taxa
    v_taxa_id := 'TAXA-' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Inserir taxa aplicada
    INSERT INTO public.taxas_conveniencia_aplicadas (
        taxa_id: v_taxa_id,
        reserva_id: p_reserva_id,
        imovel_id: (SELECT imovel_id FROM public.ordens_servicos_limpeza WHERE id = p_reserva_id LIMIT 1),
        cliente_id: (SELECT cliente_id FROM public.ordens_servicos_limpeza WHERE id = p_reserva_id LIMIT 1),
        taxa_conveniencia_aplicada: v_taxa_aplicada,
        valor_base_calculo: v_valor_base_calculo,
        dias_estadia: p_dias_estadia,
        valor_taxa_conveniencia: v_valor_taxa,
        valor_total_com_taxa: v_valor_total,
        status_taxa: 'aplicada',
        data_aplicacao: NOW()
    );
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'taxa_id', v_taxa_id,
        'taxa_aplicada', v_taxa_aplicada,
        'valor_base_calculo', v_valor_base_calculo,
        'valor_taxa_conveniencia', v_valor_taxa,
        'valor_total_com_taxa', v_valor_total,
        'valor_total_sem_taxa', v_valor_base_calculo,
        'mensagem', 'Taxa de conveniência calculada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar contribuição social Reino Jesus Cristo
CREATE OR REPLACE FUNCTION public.processar_contribuicao_social_reino_jesus_cristo(
    p_mes_referencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    v_tesouro_record RECORD;
BEGIN
    -- Inserir ou atualizar tesouro
    INSERT INTO public.tesouro_reino_jesus_cristo_v29_2 (
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
        status_contribuicao: 'provisionado',
        data_calculo: CURRENT_DATE,
        data_provisionamento: CURRENT_DATE,
        destinacao_igrejas_locais: 25000.00,
        destinacao_obra_missionaria: 20000.00,
        destinacao_ajuda_desamparados: 15000.00,
        destinacao_evangelizacao: 10000.00,
        destinacao_acao_social: 10000.00,
        destinacao_capacitacao_prestadores: 10000.00
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
        'provisionado',
        CURRENT_DATE,
        CURRENT_DATE
    )
    ON CONFLICT (mes_referencia)
    DO UPDATE SET
        faturamento_prestadores_servicos = EXCLUDED.faturamento_prestadores_servicos,
        faturamento_taxa_conveniencia = EXCLUDED.faturamento_taxa_conveniencia,
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
        'faturamento_liquido', v_tesouro_record.faturamento_liquido,
        'valor_contribuicao', v_tesouro_record.valor_contribuicao,
        'faturamento_prestadores', v_tesouro_record.faturamento_prestadores_servicos,
        'faturamento_taxa_conveniencia', v_tesouro_record.faturamento_taxa_conveniencia,
        'destinacao_capacitacao_prestadores', v_tesouro_record.destinacao_capacitacao_prestadores,
        'mensagem', 'Contribuição social Reino Jesus Cristo processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_config_split_tipo ON public.configuracao_split_servico(tipo_servico, status_config);
CREATE INDEX IF NOT EXISTS idx_fluxo_os ON public.fluxo_financeiro_servico(os_id, status_fluxo);
CREATE INDEX IF NOT EXISTS idx_fluxo_prestador ON public.fluxo_financeiro_servico(prestador_id, status_fluxo);
CREATE INDEX IF NOT EXISTS idx_fluxo_data ON public.fluxo_financeiro_servico(data_pagamento_cliente, status_fluxo);
CREATE INDEX IF NOT EXISTS idx_wallet_usuario ON public.wallet_sb(usuario_id, status_wallet);
CREATE INDEX IF NOT EXISTS idx_wallet_id ON public.wallet_sb(wallet_id, status_wallet);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_wallet ON public.movimentacoes_wallet_sb(wallet_id, tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON public.movimentacoes_wallet_sb(data_movimentacao, status_movimentacao);
CREATE INDEX IF NOT EXISTS idx_config_taxa_tipo ON public.configuracao_taxa_conveniencia(tipo_imovel, status_config);
CREATE INDEX IF NOT EXISTS idx_taxas_reserva ON public.taxas_conveniencia_aplicadas(reserva_id, status_taxa);
CREATE INDEX IF NOT EXISTS idx_taxas_data ON public.taxas_conveniencia_aplicadas(data_aplicacao, status_taxa);
CREATE INDEX IF NOT EXISTS idx_metricas_prestador ON public.metricas_fotograficas_prestadores(prestador_id, score_fotografico);
CREATE INDEX IF NOT EXISTS idx_metricas_data ON public.metricas_fotograficas_prestadores(timestamp_foto, status_validacao);
CREATE INDEX IF NOT EXISTS idx_ranking_prestador ON public.ranking_fotografico_prestadores(prestador_id, periodo_referencia);
CREATE INDEX IF NOT EXISTS idx_ranking_score ON public.ranking_fotografico_prestadores(score_medio_fotografico, posicao_ranking);
CREATE INDEX IF NOT EXISTS idx_ranking_periodo ON public.ranking_fotografico_prestadores(periodo_referencia, status_ranking);
CREATE INDEX IF NOT EXISTS idx_tesouro_mes_v29_2 ON public.tesouro_reino_jesus_cristo_v29_2(mes_referencia, status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_tesouro_faturamento ON public.tesouro_reino_jesus_cristo_v29_2(faturamento_bruto_total, status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_projetos_tesouro ON public.projetos_reino_jesus_cristo(tesouro_id, status_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_status ON public.projetos_reino_jesus_cristo(status_projeto, data_inicio_real);
CREATE INDEX IF NOT EXISTS idx_projetos_localizacao ON public.projetos_reino_jesus_cristo USING GIST(coordinates);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Configurações de Split
INSERT INTO public.configuracao_split_servico (
    config_id,
    tipo_servico,
    take_rate_padrao,
    take_rate_minimo,
    take_rate_maximo,
    score_minimo_reducao,
    taxa_reducao,
    split_prestador,
    split_plataforma,
    status_config,
    data_ativacao
) VALUES
('SPLIT-LIMPEZA', 'limpeza', 20.00, 15.00, 30.00, 85.00, 5.00, 80.00, 20.00, 'ativo', CURRENT_DATE),
('SPLIT-MANUTENCAO', 'manutencao', 20.00, 15.00, 30.00, 85.00, 5.00, 80.00, 20.00, 'ativo', CURRENT_DATE),
('SPLIT-PINTURA', 'pintura', 20.00, 15.00, 30.00, 85.00, 5.00, 80.00, 20.00, 'ativo', CURRENT_DATE),
('SPLIT-JARDIM', 'jardim', 20.00, 15.00, 30.00, 85.00, 5.00, 80.00, 20.00, 'ativo', CURRENT_DATE),
('SPLIT-ELETRICA', 'eletrica', 20.00, 15.00, 30.00, 85.00, 5.00, 80.00, 20.00, 'ativo', CURRENT_DATE),
('SPLIT-HIDRAULICA', 'hidraulica', 20.00, 15.00, 30.00, 85.00, 5.00, 80.00, 20.00, 'ativo', CURRENT_DATE);

-- Inserir Configurações de Taxa de Conveniência
INSERT INTO public.configuracao_taxa_conveniencia (
    config_id,
    tipo_imovel,
    taxa_conveniencia_padrao,
    taxa_conveniencia_minima,
    taxa_conveniencia_maxima,
    aplicar_em,
    base_calculo,
    valor_minimo_aplicacao,
    valor_maximo_aplicacao,
    dias_minima_estadia,
    status_config,
    data_ativacao
) VALUES
('TAXA-APARTAMENTO', 'apartamento', 10.00, 5.00, 20.00, 'diaria', 'valor_diaria', 100.00, 10000.00, 1, 'ativo', CURRENT_DATE),
('TAXA-CASA', 'casa', 10.00, 5.00, 20.00, 'diaria', 'valor_diaria', 100.00, 10000.00, 1, 'ativo', CURRENT_DATE),
('TAXA-STUDIO', 'studio', 10.00, 5.00, 20.00, 'diaria', 'valor_diaria', 100.00, 10000.00, 1, 'ativo', CURRENT_DATE),
('TAXA-LOFT', 'loft', 10.00, 5.00, 20.00, 'diaria', 'valor_diaria', 100.00, 10000.00, 1, 'ativo', CURRENT_DATE),
('TAXA-KITNET', 'kitnet', 10.00, 5.00, 20.00, 'diaria', 'valor_diaria', 100.00, 10000.00, 1, 'ativo', CURRENT_DATE);

-- Inserir Tesouro Reino Jesus Cristo V29.2 de exemplo
INSERT INTO public.tesouro_reino_jesus_cristo_v29_2 (
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
    status_contribuicao,
    data_calculo,
    data_provisionamento,
    destinacao_igrejas_locais,
    destinacao_obra_missionaria,
    destinacao_ajuda_desamparados,
    destinacao_evangelizacao,
    destinacao_acao_social,
    destinacao_capacitacao_prestadores
) VALUES
(DATE_TRUNC('month', CURRENT_DATE)::DATE, 150000.00, 85000.00, 45000.00, 35000.00, 25000.00, 180000.00, 95000.00, 15000.00, 22000.00, 12000.00, 28000.00, 75000.00, 75000.00, 8500.00, 'provisionado', CURRENT_DATE, CURRENT_DATE, 25000.00, 20000.00, 15000.00, 10000.00, 10000.00),
(DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 135000.00, 75000.00, 42000.00, 32000.00, 22000.00, 165000.00, 85000.00, 13500.00, 20000.00, 11000.00, 25000.00, 68000.00, 58000.00, 78000.00, 70000.00, 8000.00, 'destinado', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 22000.00, 18000.00, 13000.00, 8000.00);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB SERVICE REVENUE & SPLIT V29.2 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.configuracao_split_servico) as total_configuracoes_split,
       (SELECT COUNT(*) FROM public.fluxo_financeiro_servico) as total_fluxos_financeiros,
       (SELECT COUNT(*) FROM public.wallet_sb) as total_wallets_sb,
       (SELECT COUNT(*) FROM public.movimentacoes_wallet_sb) as total_movimentacoes_wallet,
       (SELECT COUNT(*) FROM public.configuracao_taxa_conveniencia) as total_configuracoes_taxa,
       (SELECT COUNT(*) FROM public.taxas_conveniencia_aplicadas) as total_taxas_aplicadas,
       (SELECT COUNT(*) FROM public.metricas_fotograficas_prestadores) as total_metricas_fotograficas,
       (SELECT COUNT(*) FROM public.ranking_fotografico_prestadores) as total_rankings_fotograficos,
       (SELECT COUNT(*) FROM public.tesouro_reino_jesus_cristo_v29_2) as total_tesouro_reino_jesus_cristo,
       (SELECT COUNT(*) FROM public.projetos_reino_jesus_cristo) as total_projetos_reino_jesus_cristo;
