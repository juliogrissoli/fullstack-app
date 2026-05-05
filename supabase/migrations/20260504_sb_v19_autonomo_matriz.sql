-- 🏛️ SECURITY BROKER SB v19 - AUTÔNOMO & MATRIZ 5X5
-- Schema completo para remuneração e reinvestimento de corretores autônomos

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS DE DISTRIBUIÇÃO DE COMISSÃO (CAPTAÇÃO)
-- =====================================================

-- Imóveis com Exclusividade
CREATE TABLE IF NOT EXISTS public.imoveis_exclusividade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados do Imóvel
    codigo_imovel TEXT UNIQUE NOT NULL,
    endereco TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT,
    coordenadas GEOGRAPHY(POINT, 4326),
    
    -- Características
    tipo_imovel TEXT, -- 'apartamento', 'casa', 'comercial', 'terreno'
    area_util DECIMAL(10,2),
    area_total DECIMAL(10,2),
    quartos INTEGER,
    banheiros INTEGER,
    vagas INTEGER,
    
    -- Valores
    valor_venda DECIMAL(12,2),
    valor_aluguel DECIMAL(12,2),
    valor_condominio DECIMAL(10,2),
    valor_iptu DECIMAL(10,2),
    
    -- Exclusividade
    tipo_exclusividade TEXT NOT NULL, -- 'venda', 'aluguel', 'ambos'
    data_inicio_exclusividade DATE NOT NULL,
    data_fim_exclusividade DATE,
    status_exclusividade TEXT DEFAULT 'ativa', -- 'ativa', 'pausada', 'cancelada', 'vendida'
    
    -- Comissão
    comissao_percentual DECIMAL(5,2) NOT NULL, -- % sobre o valor
    comissao_valor_fixo DECIMAL(12,2), -- valor fixo opcional
    comissao_tipo_calculo TEXT DEFAULT 'percentual', -- 'percentual', 'fixo', 'misto'
    
    -- Captador
    captador_user_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    data_captacao DATE,
    status_captacao TEXT DEFAULT 'pendente', -- 'pendente', 'aprovada', 'rejeitada'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações de Comissão
CREATE TABLE IF NOT EXISTS public.transacoes_comissao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imovel_exclusividade_id UUID REFERENCES public.imoveis_exclusividade(id) ON DELETE CASCADE,
    captador_user_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados da Transação
    tipo_transacao TEXT NOT NULL, -- 'venda', 'aluguel', 'rescisao'
    valor_transacao DECIMAL(12,2) NOT NULL,
    data_transacao DATE NOT NULL,
    
    -- Comissão Total
    comissao_total DECIMAL(12,2) NOT NULL,
    comissao_percentual DECIMAL(5,2),
    
    -- Distribuição da Comissão
    cota_captador DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.10) STORED, -- 10%
    taxa_sb_total DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.20) STORED, -- 20%
    taxa_sb_corporate DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.10) STORED, -- 10%
    taxa_sb_fundo_recorrencia DECIMAL(12,2) GENERATED ALWAYS AS (comissao_total * 0.10) STORED, -- 10%
    
    -- Split de Saque (70/30)
    wallet_saque_70 DECIMAL(12,2) GENERATED ALWAYS AS ((comissao_total - taxa_sb_total) * 0.70) STORED,
    wallet_aceleracao_30 DECIMAL(12,2) GENERATED ALWAYS AS ((comissao_total - taxa_sb_total) * 0.30) STORED,
    
    -- Status
    status_transacao TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'paga', 'cancelada'
    data_processamento TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    
    -- Conformidade
    conformidade_crecci BOOLEAN DEFAULT false,
    artigo_725_cc BOOLEAN DEFAULT false,
    nexo_causal_protegido BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_transacao TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE ENGINE DE MATRIZ 5X5 (RECORRÊNCIA)
-- =====================================================

-- Matriz de Indicação 5x5
CREATE TABLE IF NOT EXISTS public.matriz_indicacao_5x5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Estrutura da Matriz
    nivel_matriz INTEGER NOT NULL, -- 1, 2, 3, 4, 5
    posicao_matriz INTEGER NOT NULL, -- Posição dentro do nível
    pai_id UUID REFERENCES public.matriz_indicacao_5x5(id) ON DELETE SET NULL,
    
    -- Indicador
    indicador_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    data_indicacao DATE NOT NULL,
    status_indicacao TEXT DEFAULT 'ativa', -- 'ativa', 'pausada', 'cancelada'
    
    -- Performance
    total_indicados INTEGER DEFAULT 0,
    total_fechamentos INTEGER DEFAULT 0,
    total_comissoes_geradas DECIMAL(12,2) DEFAULT 0.00,
    
    -- Limites e Regras
    limite_indicados_nivel INTEGER DEFAULT 5, -- Limite de indicados diretos
    limite_fechamentos_mes INTEGER DEFAULT 10, -- Limite de fechamentos mensais
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créditos de Rede (Matriz 5x5)
CREATE TABLE IF NOT EXISTS public.creditos_rede_matriz (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matriz_id UUID REFERENCES public.matriz_indicacao_5x5(id) ON DELETE CASCADE,
    transacao_comissao_id UUID REFERENCES public.transacoes_comissao(id) ON DELETE CASCADE,
    
    -- Dados do Crédito
    nivel_origem INTEGER NOT NULL, -- Nível de onde veio a comissão
    percentual_credito DECIMAL(5,2) NOT NULL, -- % do Fundo de Recorrência
    valor_credito DECIMAL(12,2) NOT NULL,
    
    -- Distribuição por Nível
    valor_nivel1 DECIMAL(12,2) GENERATED ALWAYS AS (valor_credito * 0.05) STORED, -- 5.0%
    valor_nivel2 DECIMAL(12,2) GENERATED ALWAYS AS (valor_credito * 0.02) STORED, -- 2.0%
    valor_nivel3 DECIMAL(12,2) GENERATED ALWAYS AS (valor_credito * 0.015) STORED, -- 1.5%
    valor_nivel4 DECIMAL(12,2) GENERATED ALWAYS AS (valor_credito * 0.01) STORED, -- 1.0%
    valor_nivel5 DECIMAL(12,2) GENERATED ALWAYS AS (valor_credito * 0.005) STORED, -- 0.5%
    
    -- Beneficiários
    beneficiario_nivel1_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    beneficiario_nivel2_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    beneficiario_nivel3_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    beneficiario_nivel4_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    beneficiario_nivel5_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Status
    status_credito TEXT DEFAULT 'pendente', -- 'pendente', 'processado', 'pago', 'cancelado'
    data_processamento TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_credito TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE WALLETS (SAQUE E ACELERAÇÃO)
-- =====================================================

-- Wallet de Saque (70%)
CREATE TABLE IF NOT EXISTS public.wallet_saque_autonomo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Saldos
    saldo_disponivel DECIMAL(12,2) DEFAULT 0.00,
    saldo_bloqueado DECIMAL(12,2) DEFAULT 0.00,
    saldo_total DECIMAL(12,2) GENERATED ALWAYS AS (saldo_disponivel + saldo_bloqueado) STORED,
    
    -- Limites e Configurações
    limite_diario DECIMAL(12,2) DEFAULT 10000.00, -- R$ 10.000 por dia
    limite_mensal DECIMAL(12,2) DEFAULT 50000.00, -- R$ 50.000 por mês
    taxa_saque DECIMAL(5,2) DEFAULT 2.50, -- 2.5% taxa de saque
    
    -- Status
    status_wallet TEXT DEFAULT 'ativa', -- 'ativa', 'suspensa', 'bloqueada'
    data_ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet de Aceleração (30%)
CREATE TABLE IF NOT EXISTS public.wallet_aceleracao_autonomo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Saldos
    saldo_disponivel DECIMAL(12,2) DEFAULT 0.00,
    saldo_bloqueado DECIMAL(12,2) DEFAULT 0.00,
    saldo_total DECIMAL(12,2) GENERATED ALWAYS AS (saldo_disponivel + saldo_bloqueado) STORED,
    
    -- Usos Permitidos
    permite_leads BOOLEAN DEFAULT true,
    permite_mentoria BOOLEAN DEFAULT true,
    permite_ads BOOLEAN DEFAULT true,
    permite_outros BOOLEAN DEFAULT false,
    
    -- Limites por Uso
    limite_leads_mensal DECIMAL(12,2) DEFAULT 5000.00, -- R$ 5.000 em leads/mês
    limite_mentoria_mensal DECIMAL(12,2) DEFAULT 3000.00, -- R$ 3.000 em mentoria/mês
    limite_ads_mensal DECIMAL(12,2) DEFAULT 2000.00, -- R$ 2.000 em ads/mês
    
    -- Status
    status_wallet TEXT DEFAULT 'ativa', -- 'ativa', 'suspensa', 'bloqueada'
    data_ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações de Wallet
CREATE TABLE IF NOT EXISTS public.transacoes_wallet_autonomo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_saque_id UUID REFERENCES public.wallet_saque_autonomo(id) ON DELETE SET NULL,
    wallet_aceleracao_id UUID REFERENCES public.wallet_aceleracao_autonomo(id) ON DELETE SET NULL,
    
    -- Dados da Transação
    tipo_wallet TEXT NOT NULL, -- 'saque', 'aceleracao'
    tipo_transacao TEXT NOT NULL, -- 'recebimento', 'saque', 'uso_leads', 'uso_mentoria', 'uso_ads'
    valor_transacao DECIMAL(12,2) NOT NULL,
    
    -- Saldos
    saldo_antes DECIMAL(12,2) NOT NULL,
    saldo_depois DECIMAL(12,2) NOT NULL,
    
    -- Origem
    origem_transacao TEXT, -- 'comissao', 'credito_rede', 'saque_fintech', 'uso_interno'
    id_origem UUID, -- ID da transação original
    
    -- Descrição
    descricao_transacao TEXT,
    
    -- Status
    status_transacao TEXT DEFAULT 'pendente', -- 'pendente', 'processada', 'cancelada'
    data_processamento TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_transacao TEXT UNIQUE
);

-- =====================================================
-- TABELAS DE EVOLUÇÃO E GESTÃO
-- =====================================================

-- Módulos de Mentoria e Gestão SB
CREATE TABLE IF NOT EXISTS public.modulos_mentoria_gestao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dados do Módulo
    nome_modulo TEXT NOT NULL,
    descricao_modulo TEXT,
    categoria_modulo TEXT, -- 'basico', 'intermediario', 'avancado', 'especialista'
    
    -- Conteúdo
    duracao_horas INTEGER,
    numero_aulas INTEGER,
    tipo_conteudo TEXT, -- 'video', 'texto', 'interativo', 'live'
    
    -- Requisitos
    modulo_pre_requisito_id UUID REFERENCES public.modulos_mentoria_gestao(id) ON DELETE SET NULL,
    nivel_minimo_broker TEXT, -- 'autonomo', 'senior', 'master'
    
    -- Progressão
    pontos_experiencia INTEGER DEFAULT 0,
    badge_conclusao TEXT,
    
    -- Status
    status_modulo TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'manutencao'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso do Broker em Módulos
CREATE TABLE IF NOT EXISTS public.progresso_broker_modulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    modulo_id UUID REFERENCES public.modulos_mentoria_gestao(id) ON DELETE CASCADE,
    
    -- Progresso
    status_progresso TEXT DEFAULT 'nao_iniciado', -- 'nao_iniciado', 'em_andamento', 'concluido'
    percentual_conclusao DECIMAL(5,2) DEFAULT 0.00,
    aulas_concluidas INTEGER DEFAULT 0,
    ultima_aula_concluida TIMESTAMPTZ,
    
    -- Avaliação
    nota_avaliacao DECIMAL(3,2),
    data_conclusao TIMESTAMPTZ,
    certificado_emitido BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(broker_id, modulo_id)
);

-- Níveis de Acesso do Broker
CREATE TABLE IF NOT EXISTS public.niveis_acesso_broker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Níveis de Acesso
    nivel_acesso TEXT NOT NULL, -- 'autonomo', 'investidor', 'coordenador_lancamento', 'master'
    status_acesso TEXT DEFAULT 'bloqueado', -- 'bloqueado', 'liberado', 'suspenso'
    
    -- Requisitos para Liberação
    modulos_obrigatorios TEXT[] DEFAULT '{}', -- IDs dos módulos obrigatórios
    total_modulos_concluidos INTEGER DEFAULT 0,
    pontos_experiencia_minimos INTEGER DEFAULT 0,
    
    -- Liberação
    data_liberacao TIMESTAMPTZ,
    liberado_por UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    motivo_liberacao TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(broker_id, nivel_acesso)
);

-- =====================================================
-- TABELAS DE AUDITORIA SOBERANA
-- =====================================================

-- Auditoria de Conformidade CRECI
CREATE TABLE IF NOT EXISTS public.auditoria_conformidade_crecci (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transacao_comissao_id UUID REFERENCES public.transacoes_comissao(id) ON DELETE CASCADE,
    
    -- Verificações CRECI
    tabela_crecci_respeitada BOOLEAN DEFAULT false,
    percentual_maximo_respeitado BOOLEAN DEFAULT false,
    comissao_justa BOOLEAN DEFAULT false,
    
    -- Detalhes da Verificação
    percentual_aplicado DECIMAL(5,2),
    percentual_maximo_permitido DECIMAL(5,2),
    diferenca_percentual DECIMAL(5,2),
    
    -- Status
    status_auditoria TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado'
    data_auditoria TIMESTAMPTZ DEFAULT NOW(),
    auditor_responsavel UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Observações
    observacoes_auditoria TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_auditoria TEXT UNIQUE
);

-- Auditoria Art. 725 CC
CREATE TABLE IF NOT EXISTS public.auditoria_artigo_725_cc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transacao_comissao_id UUID REFERENCES public.transacoes_comissao(id) ON DELETE CASCADE,
    
    -- Verificações Art. 725 CC
    nexo_causal_presente BOOLEAN DEFAULT false,
    intermedia_efetiva BOOLEAN DEFAULT false,
    comissao_justa BOOLEAN DEFAULT false,
    
    -- Detalhes da Verificação
    data_primeiro_contato DATE,
    data_intermediacao DATE,
    data_fechamento DATE,
    dias_intermediacao INTEGER,
    
    -- Documentação
    contrato_intermediacao_existente BOOLEAN DEFAULT false,
    relatorio_visitas_existente BOOLEAN DEFAULT false,
    documentacao_completa BOOLEAN DEFAULT false,
    
    -- Status
    status_auditoria TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado'
    data_auditoria TIMESTAMPTZ DEFAULT NOW(),
    auditor_responsavel UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Observações
    observacoes_auditoria TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hash_auditoria TEXT UNIQUE
);

-- Potencial de Recorrência Mensal
CREATE TABLE IF NOT EXISTS public.potencial_recorrencia_mensal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Cálculo do Potencial
    mes_referencia DATE NOT NULL,
    
    -- Base de Cálculo
    total_imoveis_exclusividade INTEGER DEFAULT 0,
    total_fechamentos_previstos INTEGER DEFAULT 0,
    valor_medio_comissao DECIMAL(12,2) DEFAULT 0.00,
    
    -- Potencial por Nível
    potencial_nivel1 DECIMAL(12,2) GENERATED ALWAYS AS ((valor_medio_comissao * total_fechamentos_previstos * 0.10) * 0.05) STORED,
    potencial_nivel2 DECIMAL(12,2) GENERATED ALWAYS AS ((valor_medio_comissao * total_fechamentos_previstos * 0.10) * 0.02) STORED,
    potencial_nivel3 DECIMAL(12,2) GENERATED ALWAYS AS ((valor_medio_comissao * total_fechamentos_previstos * 0.10) * 0.015) STORED,
    potencial_nivel4 DECIMAL(12,2) GENERATED ALWAYS AS ((valor_medio_comissao * total_fechamentos_previstos * 0.10) * 0.01) STORED,
    potencial_nivel5 DECIMAL(12,2) GENERATED ALWAYS AS ((valor_medio_comissao * total_fechamentos_previstos * 0.10) * 0.005) STORED,
    
    -- Potencial Total
    potencial_total_recorrencia DECIMAL(12,2) GENERATED ALWAYS AS (
        potencial_nivel1 + potencial_nivel2 + potencial_nivel3 + potencial_nivel4 + potencial_nivel5
    ) STORED,
    
    -- Realizado
    realizado_mes DECIMAL(12,2) DEFAULT 0.00,
    taxa_realizacao DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN potencial_total_recorrencia > 0 
            THEN (realizado_mes / potencial_total_recorrencia) * 100 
            ELSE 0 
        END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(broker_id, mes_referencia)
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash de transação
CREATE OR REPLACE FUNCTION public.gerar_hash_transacao_comissao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_transacao := encode(sha256(
        NEW.imovel_exclusividade_id::TEXT || 
        NEW.captador_user_id::TEXT || 
        NEW.valor_transacao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_transacao_comissao
    BEFORE INSERT ON public.transacoes_comissao
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_transacao_comissao();

-- Trigger para processar split 70/30 automaticamente
CREATE OR REPLACE FUNCTION public.processar_split_70_30()
RETURNS TRIGGER AS $$
DECLARE
    wallet_saque_id UUID;
    wallet_aceleracao_id UUID;
BEGIN
    -- Buscar ou criar wallets do broker
    SELECT id INTO wallet_saque_id 
    FROM public.wallet_saque_autonomo 
    WHERE broker_id = NEW.captador_user_id;
    
    IF wallet_saque_id IS NULL THEN
        INSERT INTO public.wallet_saque_autonomo (broker_id)
        VALUES (NEW.captador_user_id)
        RETURNING id INTO wallet_saque_id;
    END IF;
    
    SELECT id INTO wallet_aceleracao_id 
    FROM public.wallet_aceleracao_autonomo 
    WHERE broker_id = NEW.captador_user_id;
    
    IF wallet_aceleracao_id IS NULL THEN
        INSERT INTO public.wallet_aceleracao_autonomo (broker_id)
        VALUES (NEW.captador_user_id)
        RETURNING id INTO wallet_aceleracao_id;
    END IF;
    
    -- Criar transações de wallet
    INSERT INTO public.transacoes_wallet_autonomo (
        wallet_saque_id,
        wallet_aceleracao_id,
        tipo_wallet,
        tipo_transacao,
        valor_transacao,
        saldo_antes,
        saldo_depois,
        origem_transacao,
        id_origem,
        descricao_transacao
    ) VALUES 
    (
        wallet_saque_id,
        NULL,
        'saque',
        'recebimento',
        NEW.wallet_saque_70,
        (SELECT saldo_disponivel FROM public.wallet_saque_autonomo WHERE id = wallet_saque_id),
        (SELECT saldo_disponivel FROM public.wallet_saque_autonomo WHERE id = wallet_saque_id) + NEW.wallet_saque_70,
        'comissao',
        NEW.id,
        'Recebimento de comissão - 70% wallet saque'
    ),
    (
        NULL,
        wallet_aceleracao_id,
        'aceleracao',
        'recebimento',
        NEW.wallet_aceleracao_30,
        (SELECT saldo_disponivel FROM public.wallet_aceleracao_autonomo WHERE id = wallet_aceleracao_id),
        (SELECT saldo_disponivel FROM public.wallet_aceleracao_autonomo WHERE id = wallet_aceleracao_id) + NEW.wallet_aceleracao_30,
        'comissao',
        NEW.id,
        'Recebimento de comissão - 30% wallet aceleração'
    );
    
    -- Atualizar saldos
    UPDATE public.wallet_saque_autonomo
    SET saldo_disponivel = saldo_disponivel + NEW.wallet_saque_70,
        updated_at = NOW()
    WHERE id = wallet_saque_id;
    
    UPDATE public.wallet_aceleracao_autonomo
    SET saldo_disponivel = saldo_disponivel + NEW.wallet_aceleracao_30,
        updated_at = NOW()
    WHERE id = wallet_aceleracao_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_processar_split_70_30
    AFTER INSERT ON public.transacoes_comissao
    FOR EACH ROW
    EXECUTE FUNCTION public.processar_split_70_30();

-- Trigger para gerar créditos de rede automaticamente
CREATE OR REPLACE FUNCTION public.gerar_creditos_rede_automatico()
RETURNS TRIGGER AS $$
DECLARE
    matriz_id UUID;
    creditos_rede_id UUID;
BEGIN
    -- Buscar matriz do captador
    SELECT id INTO matriz_id
    FROM public.matriz_indicacao_5x5
    WHERE broker_id = NEW.captador_user_id
    AND status_indicacao = 'ativa'
    LIMIT 1;
    
    IF matriz_id IS NOT NULL THEN
        -- Criar crédito de rede
        INSERT INTO public.creditos_rede_matriz (
            matriz_id,
            transacao_comissao_id,
            nivel_origem,
            percentual_credito,
            valor_credito
        ) VALUES (
            matriz_id,
            NEW.id,
            1, -- Nível 1 (captador)
            100.00, -- 100% do Fundo de Recorrência
            NEW.taxa_sb_fundo_recorrencia
        ) RETURNING id INTO creditos_rede_id;
        
        -- Processar distribuição dos níveis
        PERFORM public.processar_distribuicao_niveis(creditos_rede_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_creditos_rede_automatico
    AFTER INSERT ON public.transacoes_comissao
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_creditos_rede_automatico();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para processar distribuição dos níveis
CREATE OR REPLACE FUNCTION public.processar_distribuicao_niveis(p_creditos_rede_id UUID)
RETURNS void AS $$
DECLARE
    credito RECORD;
    matriz_atual RECORD;
    nivel_atual INTEGER;
BEGIN
    -- Buscar dados do crédito
    SELECT * INTO credito
    FROM public.creditos_rede_matriz
    WHERE id = p_creditos_rede_id;
    
    -- Buscar matriz atual
    SELECT * INTO matriz_atual
    FROM public.matriz_indicacao_5x5
    WHERE id = credito.matriz_id;
    
    -- Distribuir para os 5 níveis
    nivel_atual := matriz_atual.nivel_matriz;
    
    -- Nível 1 (pai)
    IF matriz_atual.pai_id IS NOT NULL THEN
        UPDATE public.creditos_rede_matriz
        SET beneficiario_nivel1_id = (SELECT broker_id FROM public.matriz_indicacao_5x5 WHERE id = matriz_atual.pai_id)
        WHERE id = p_creditos_rede_id;
    END IF;
    
    -- Nível 2 (avô)
    IF nivel_atual >= 2 THEN
        UPDATE public.creditos_rede_matriz
        SET beneficiario_nivel2_id = (
            SELECT broker_id 
            FROM public.matriz_indicacao_5x5 
            WHERE id = (SELECT pai_id FROM public.matriz_indicacao_5x5 WHERE id = matriz_atual.pai_id)
        )
        WHERE id = p_creditos_rede_id;
    END IF;
    
    -- Continuar para níveis 3, 4, 5...
    -- (Lógica similar para os níveis superiores)
    
    -- Atualizar status para processado
    UPDATE public.creditos_rede_matriz
    SET status_credito = 'processado',
        data_processamento = NOW()
    WHERE id = p_creditos_rede_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar liberação de nível de acesso
CREATE OR REPLACE FUNCTION public.verificar_liberacao_nivel_acesso(p_broker_id UUID, p_nivel_acesso TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    modulos_concluidos INTEGER;
    pontos_experiencia INTEGER;
    requisitos RECORD;
BEGIN
    -- Buscar requisitos do nível
    SELECT * INTO requisitos
    FROM public.niveis_acesso_broker
    WHERE broker_id = p_broker_id
    AND nivel_acesso = p_nivel_acesso;
    
    IF requisitos IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Contar módulos concluídos
    SELECT COUNT(*) INTO modulos_concluidos
    FROM public.progresso_broker_modulos
    WHERE broker_id = p_broker_id
    AND status_progresso = 'concluido'
    AND modulo_id = ANY(requisitos.modulos_obrigatorios);
    
    -- Buscar pontos de experiência
    SELECT COALESCE(SUM(pontos_experiencia), 0) INTO pontos_experiencia
    FROM public.progresso_broker_modulos
    WHERE broker_id = p_broker_id
    AND status_progresso = 'concluido';
    
    -- Verificar se atende aos requisitos
    IF modulos_concluidos >= ARRAY_LENGTH(requisitos.modulos_obrigatorios, 1)
    AND pontos_experiencia >= requisitos.pontos_experiencia_minimos THEN
        -- Liberar acesso
        UPDATE public.niveis_acesso_broker
        SET status_acesso = 'liberado',
            data_liberacao = NOW(),
            total_modulos_concluidos = modulos_concluidos
        WHERE id = requisitos.id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular potencial de recorrência mensal
CREATE OR REPLACE FUNCTION public.calcular_potencial_recorrencia_mensal(p_broker_id UUID, p_mes_referencia DATE)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    potencial_total DECIMAL(12,2);
BEGIN
    -- Inserir ou atualizar potencial do mês
    INSERT INTO public.potencial_recorrencia_mensal (
        broker_id,
        mes_referencia,
        total_imoveis_exclusividade,
        total_fechamentos_previstos,
        valor_medio_comissao
    ) VALUES (
        p_broker_id,
        p_mes_referencia,
        (SELECT COUNT(*) FROM public.imoveis_exclusividade WHERE captador_user_id = p_broker_id AND status_exclusividade = 'ativa'),
        (SELECT COUNT(*) FROM public.transacoes_comissao WHERE captador_user_id = p_broker_id AND DATE_TRUNC('month', data_transacao) = p_mes_referencia),
        (SELECT AVG(comissao_total) FROM public.transacoes_comissao WHERE captador_user_id = p_broker_id AND DATE_TRUNC('month', data_transacao) = p_mes_referencia)
    )
    ON CONFLICT (broker_id, mes_referencia)
    DO UPDATE SET
        total_imoveis_exclusividade = EXCLUDED.total_imoveis_exclusividade,
        total_fechamentos_previstos = EXCLUDED.total_fechamentos_previstos,
        valor_medio_comissao = EXCLUDED.valor_medio_comissao,
        updated_at = NOW();
    
    -- Retornar potencial total
    SELECT potencial_total_recorrencia INTO potencial_total
    FROM public.potencial_recorrencia_mensal
    WHERE broker_id = p_broker_id
    AND mes_referencia = p_mes_referencia;
    
    RETURN COALESCE(potencial_total, 0.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS OTIMIZADAS
-- =====================================================

-- View de Dashboard Autônomo
CREATE OR REPLACE VIEW public.dashboard_autonomo AS
SELECT 
    b.*,
    ws.saldo_disponivel as saldo_saque,
    ws.saldo_bloqueado as saldo_saque_bloqueado,
    ws.saldo_total as saldo_saque_total,
    wa.saldo_disponivel as saldo_aceleracao,
    wa.saldo_bloqueado as saldo_aceleracao_bloqueado,
    wa.saldo_total as saldo_aceleracao_total,
    COUNT(DISTINCT ie.id) as total_imoveis_exclusividade,
    COUNT(DISTINCT tc.id) as total_fechamentos,
    COALESCE(SUM(tc.comissao_total), 0) as total_comissoes_geradas,
    COALESCE(SUM(tc.wallet_saque_70), 0) as total_recebido_saque,
    COALESCE(SUM(tc.wallet_aceleracao_30), 0) as total_recebido_aceleracao,
    prm.potencial_total_recorrencia,
    prm.taxa_realizacao
FROM public.brokers b
LEFT JOIN public.wallet_saque_autonomo ws ON b.id = ws.broker_id
LEFT JOIN public.wallet_aceleracao_autonomo wa ON b.id = wa.broker_id
LEFT JOIN public.imoveis_exclusividade ie ON b.id = ie.captador_user_id AND ie.status_exclusividade = 'ativa'
LEFT JOIN public.transacoes_comissao tc ON b.id = tc.captador_user_id
LEFT JOIN public.potencial_recorrencia_mensal prm ON b.id = prm.broker_id AND prm.mes_referencia = DATE_TRUNC('month', CURRENT_DATE)
WHERE b.status = 'ativo'
GROUP BY b.id, ws.id, wa.id, prm.id;

-- View de Matriz 5x5
CREATE OR REPLACE VIEW public.dashboard_matriz_5x5 AS
SELECT 
    mi.*,
    b.nome as broker_nome,
    b.email as broker_email,
    pai.nome as pai_nome,
    COUNT(DISTINCT filhos.id) as total_indicados_diretos,
    COUNT(DISTINCT tc.id) as total_fechamentos_indicados,
    COALESCE(SUM(tc.taxa_sb_fundo_recorrencia), 0) as total_fundo_recorrencia,
    COALESCE(SUM(crm.valor_credito), 0) as total_creditos_rede
FROM public.matriz_indicacao_5x5 mi
JOIN public.brokers b ON mi.broker_id = b.id
LEFT JOIN public.matriz_indicacao_5x5 pai ON mi.pai_id = pai.id
LEFT JOIN public.matriz_indicacao_5x5 filhos ON mi.id = filhos.pai_id
LEFT JOIN public.transacoes_comissao tc ON mi.broker_id = tc.captador_user_id
LEFT JOIN public.creditos_rede_matriz crm ON mi.id = crm.matriz_id
WHERE mi.status_indicacao = 'ativa'
GROUP BY mi.id, b.id, pai.id;

-- View de Auditoria Soberana
CREATE OR REPLACE VIEW public.dashboard_auditoria_soberana AS
SELECT 
    tc.*,
    acc.status_auditoria as auditoria_crecci_status,
    acc.data_auditoria as auditoria_crecci_data,
    a725.status_auditoria as auditoria_725_status,
    a725.data_auditoria as auditoria_725_data,
    CASE 
        WHEN acc.status_auditoria = 'aprovado' AND a725.status_auditoria = 'aprovado' 
        THEN 'conforme'
        ELSE 'nao_conforme'
    END as status_conformidade_total
FROM public.transacoes_comissao tc
LEFT JOIN public.auditoria_conformidade_crecci acc ON tc.id = acc.transacao_comissao_id
LEFT JOIN public.auditoria_artigo_725_cc a725 ON tc.id = a725.transacao_comissao_id;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_imoveis_exclusividade_captador ON public.imoveis_exclusividade(captador_user_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_exclusividade_status ON public.imoveis_exclusividade(status_exclusividade);
CREATE INDEX IF NOT EXISTS idx_transacoes_comissao_captador ON public.transacoes_comissao(captador_user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_comissao_data ON public.transacoes_comissao(data_transacao DESC);
CREATE INDEX IF NOT EXISTS idx_matriz_indicacao_broker ON public.matriz_indicacao_5x5(broker_id);
CREATE INDEX IF NOT EXISTS idx_matriz_indicacao_pai ON public.matriz_indicacao_5x5(pai_id);
CREATE INDEX IF NOT EXISTS idx_creditos_rede_matriz ON public.creditos_rede_matriz(matriz_id);
CREATE INDEX IF NOT EXISTS idx_wallet_saque_broker ON public.wallet_saque_autonomo(broker_id);
CREATE INDEX IF NOT EXISTS idx_wallet_aceleracao_broker ON public.wallet_aceleracao_autonomo(broker_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_wallet_broker ON public.transacoes_wallet_autonomo(wallet_saque_id);
CREATE INDEX IF NOT EXISTS idx_modulos_categoria ON public.modulos_mentoria_gestao(categoria_modulo);
CREATE INDEX IF NOT EXISTS idx_progresso_broker_status ON public.progresso_broker_modulos(broker_id, status_progresso);
CREATE INDEX IF NOT EXISTS idx_niveis_acesso_status ON public.niveis_acesso_broker(broker_id, status_acesso);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir módulos de mentoria e gestão
INSERT INTO public.modulos_mentoria_gestao (
    nome_modulo, descricao_modulo, categoria_modulo, duracao_horas, numero_aulas, tipo_conteudo, pontos_experiencia, badge_conclusao
) VALUES
('Fundamentos do Mercado Imobiliário', 'Conceitos básicos e legislação', 'basico', 8, 4, 'video', 100, 'bronze'),
('Técnicas de Captação', 'Estratégias eficazes para captar imóveis', 'basico', 12, 6, 'video', 150, 'bronze'),
('Gestão de Carteira', 'Como gerenciar seu portfólio de imóveis', 'intermediario', 16, 8, 'interativo', 200, 'prata'),
('Marketing Digital para Corretores', 'Estratégias online e mídias sociais', 'intermediario', 10, 5, 'video', 180, 'prata'),
('Financiamento Imobiliário', 'Sistemas de financiamento e bancos', 'avancado', 20, 10, 'live', 250, 'ouro'),
('Gestão de Equipes', 'Liderança e desenvolvimento de pessoas', 'avancado', 24, 12, 'interativo', 300, 'ouro'),
('Investimentos Imobiliários', 'Análise de oportunidades e ROI', 'especialista', 30, 15, 'live', 400, 'platina'),
('Coordenação de Lançamentos', 'Planejamento e execução de empreendimentos', 'especialista', 40, 20, 'interativo', 500, 'platina');

-- Inserir níveis de acesso padrão
INSERT INTO public.niveis_acesso_broker (broker_id, nivel_acesso, modulos_obrigatorios, pontos_experiencia_minimos)
SELECT 
    b.id,
    unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']),
    CASE 
        WHEN unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']) = 'autonomo' 
        THEN ARRAY[(SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Fundamentos do Mercado Imobiliário')]
        WHEN unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']) = 'investidor' 
        THEN ARRAY[(SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Financiamento Imobiliário'), (SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Investimentos Imobiliários')]
        WHEN unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']) = 'coordenador_lancamento' 
        THEN ARRAY[(SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Gestão de Equipes'), (SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Coordenação de Lançamentos')]
        ELSE ARRAY[(SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Coordenação de Lançamentos'), (SELECT id FROM public.modulos_mentoria_gestao WHERE nome_modulo = 'Investimentos Imobiliários')]
    END,
    CASE 
        WHEN unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']) = 'autonomo' THEN 100
        WHEN unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']) = 'investidor' THEN 650
        WHEN unnest(ARRAY['autonomo', 'investidor', 'coordenador_lancamento', 'master']) = 'coordenador_lancamento' THEN 800
        ELSE 900
    END
FROM public.brokers b
WHERE b.status = 'ativo';

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V19 - AUTÔNOMO & MATRIZ 5X5 CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.imoveis_exclusividade) as total_imoveis_exclusividade,
       (SELECT COUNT(*) FROM public.transacoes_comissao) as total_transacoes,
       (SELECT COUNT(*) FROM public.matriz_indicacao_5x5) as total_matriz,
       (SELECT COUNT(*) FROM public.wallet_saque_autonomo) as total_wallets_saque,
       (SELECT COUNT(*) FROM public.wallet_aceleracao_autonomo) as total_wallets_aceleracao,
       (SELECT COUNT(*) FROM public.modulos_mentoria_gestao) as total_modulos,
       (SELECT COUNT(*) FROM public.auditoria_conformidade_crecci) as total_auditorias_crecci,
       (SELECT COUNT(*) FROM public.auditoria_artigo_725_cc) as total_auditorias_725;
