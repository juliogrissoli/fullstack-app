-- 🏛️ SECURITY BROKER SB v16 - GLOBAL INVESTMENT HUB
-- Schema completo para Radar de Déficit Habitacional, Fundo de Investimento e Profit Sharing

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS DE RADAR DE DÉFICIT HABITACIONAL & ORIGINAÇÃO
-- =====================================================

-- Regiões com Déficit Habitacional
CREATE TABLE IF NOT EXISTS public.regioes_deficit_habitacional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_regiao TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    coordenadas GEOGRAPHY(POINT, 4326),
    
    -- Dados de déficit
    deficit_quantitativo INTEGER DEFAULT 0, -- Número de famílias sem moradia
    deficit_percentual DECIMAL(5,2) DEFAULT 0, -- Percentual da população
    demanda_reprimida INTEGER DEFAULT 0, -- Demanda não atendida
    poder_aquisitivo_medio DECIMAL(10,2) DEFAULT 0, -- Renda média familiar
    
    -- Dados de mercado
    preco_medio_m2 DECIMAL(10,2) DEFAULT 0,
    preco_minimo_viavel DECIMAL(10,2) DEFAULT 0,
    oferta_publica INTEGER DEFAULT 0, -- Unidades disponíveis no mercado
    tempo_medio_venda INTEGER DEFAULT 0, -- Meses para vender
    
    -- Índices de oportunidade
    score_oportunidade DECIMAL(5,2) DEFAULT 0, -- Score 0-100
    indice_escassez DECIMAL(5,2) DEFAULT 0, -- Índice de escassez
    potencial_valorizacao DECIMAL(5,2) DEFAULT 0, -- Potencial de valorização
    
    -- Classificação
    classificacao TEXT, -- 'alta_prioridade', 'media_prioridade', 'baixa_prioridade'
    tendencia_mercado TEXT, -- 'aquecimento', 'estabilidade', 'resfriamento'
    
    -- Metadata
    data_coleta TIMESTAMPTZ DEFAULT NOW(),
    fonte_dados TEXT DEFAULT 'IBGE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venda de Terrenos (Marco Zero)
CREATE TABLE IF NOT EXISTS public.vendas_terrenos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados do terreno
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    coordenadas GEOGRAPHY(POINT, 4326),
    area_m2 DECIMAL(10,2) NOT NULL,
    zoneamento TEXT, -- 'residencial', 'comercial', 'misto'
    
    -- Dados financeiros
    valor_venda DECIMAL(12,2) NOT NULL,
    valor_metro DECIMAL(12,2) GENERATED ALWAYS AS (valor_venda / area_m2) STORED,
    forma_pagamento TEXT, -- 'vista', 'financiado', 'permuta'
    entrada_percentual DECIMAL(5,2),
    
    -- Comissão de Marco Zero
    comissao_percentual DECIMAL(5,2) DEFAULT 6.00,
    comissao_valor DECIMAL(12,2) GENERATED ALWAYS AS (valor_venda * comissao_percentual / 100) STORED,
    status_comissao TEXT DEFAULT 'pendente', -- 'pendente', 'paga', 'retida'
    
    -- Vínculo com projeto
    projeto_futuro_id UUID, -- ID do projeto futuro
    nome_projeto_futuro TEXT,
    data_previsao_lancamento DATE,
    
    -- Status
    status TEXT DEFAULT 'negociacao', -- 'negociacao', 'aprovado', 'concluido', 'cancelado'
    data_venda DATE,
    data_conclusao TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE GESTÃO DE PARTICIPAÇÃO E LUCROS (PL)
-- =====================================================

-- Participação nos Lucros dos Empreendimentos
CREATE TABLE IF NOT EXISTS public.participacao_lucros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empreendimento_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados da participação
    tipo_participacao TEXT NOT NULL, -- 'lucro_venda', 'lucro_construcao', 'lucro_operacional'
    percentual_participacao DECIMAL(5,2) NOT NULL, -- Percentual sobre o lucro
    valor_base_calculo DECIMAL(12,2) NOT NULL, -- Base de cálculo do lucro
    
    -- Cálculo do lucro
    lucro_bruto DECIMAL(12,2) DEFAULT 0,
    participacao_valor DECIMAL(12,2) GENERATED ALWAYS AS (lucro_bruto * percentual_participacao / 100) STORED,
    
    -- Condições
    condicao_pagamento TEXT, -- 'vista', 'parcelado', 'final_obra'
    prazo_pagamento_meses INTEGER,
    data_inicio_participacao DATE,
    data_fim_participacao DATE,
    
    -- Status
    status TEXT DEFAULT 'pendente', -- 'pendente', 'ativo', 'pago', 'suspenso'
    data_ativacao TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    
    -- Documentação
    contrato_id UUID,
    clausula_contratual TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modelo de Investidor SB MASTER
CREATE TABLE IF NOT EXISTS public.investidores_sb_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados do investidor
    tipo_investidor TEXT NOT NULL, -- 'sb_master', 'broker_investidor', 'incorporadora_investidor'
    cnpj_investidor TEXT UNIQUE,
    razao_social TEXT NOT NULL,
    capital_social DECIMAL(15,2) DEFAULT 0,
    
    -- Participação societária
    percentual_sociedade DECIMAL(5,2) DEFAULT 0.01, -- 1% padrão SB MASTER
    valor_investimento DECIMAL(12,2) NOT NULL,
    data_investimento DATE NOT NULL,
    
    -- Direitos e deveres
    direito_voto BOOLEAN DEFAULT TRUE,
    direito_participacao_lucros BOOLEAN DEFAULT TRUE,
    direito_informacao BOOLEAN DEFAULT TRUE,
    dever_gestao_ativa BOOLEAN DEFAULT FALSE,
    
    -- Condições especiais
    clausula_buy_sell BOOLEAN DEFAULT TRUE,
    valor_minimo_venda DECIMAL(12,2),
    prazo_lockup INTEGER DEFAULT 24, -- Meses
    
    -- Status
    status TEXT DEFAULT 'proposto', -- 'proposto', 'aprovado', 'ativo', 'encerrado'
    data_aprovacao TIMESTAMPTZ,
    data_encerramento TIMESTAMPTZ,
    
    -- Documentação
    contrato_social_id UUID,
    ata_assembleia_id UUID,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE FUNDO DE INVESTIMENTO DOS CORRETORES
-- =====================================================

-- Fundo de Investimento Interno
CREATE TABLE IF NOT EXISTS public.fundo_investimento_corretores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fundo TEXT NOT NULL DEFAULT 'SB BROKERS INVESTMENT FUND',
    tipo_fundo TEXT NOT NULL DEFAULT 'multimercado',
    
    -- Dados financeiros
    patrimonio_total DECIMAL(15,2) DEFAULT 0,
    cotacao_atual DECIMAL(10,6) DEFAULT 1.000000,
    total_cotas_emitidas DECIMAL(15,2) DEFAULT 0,
    
    -- Performance
    rentabilidade_mensal DECIMAL(8,4) DEFAULT 0,
    rentabilidade_anual DECIMAL(8,4) DEFAULT 0,
    drawdown_maximo DECIMAL(8,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    
    -- Configurações
    taxa_administracao DECIMAL(5,2) DEFAULT 1.50, -- 1.5% ao ano
    taxa_performance DECIMAL(5,2) DEFAULT 20.00, -- 20% sobre performance
    investimento_minimo DECIMAL(10,2) DEFAULT 1000.00,
    
    -- Status
    status TEXT DEFAULT 'ativo', -- 'ativo', 'suspenso', 'encerrado'
    data_constituicao DATE NOT NULL,
    data_encerramento DATE,
    
    -- Gestão
 gestor_principal_id UUID REFERENCES public.brokers(id),
    comite_investimento UUID[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet de Investimento dos Corretores
CREATE TABLE IF NOT EXISTS public.wallet_investimento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    fundo_id UUID REFERENCES public.fundo_investimento_corretores(id) ON DELETE CASCADE,
    
    -- Dados da aplicação
    tipo_aplicacao TEXT NOT NULL, -- 'comissao', 'recurso_proprio', 'bonus'
    valor_aplicado DECIMAL(12,2) NOT NULL,
    cotacao_aplicacao DECIMAL(10,6) NOT NULL,
    quantidade_cotas DECIMAL(15,6) GENERATED ALWAYS AS (valor_aplicado / cotacao_aplicacao) STORED,
    
    -- Origem dos recursos
    origem_recurso_id UUID, -- ID da comissão ou transação original
    percentual_comissao_alocado DECIMAL(5,2) DEFAULT 0, -- % da comissão alocada
    
    -- Condições
    data_aplicacao DATE NOT NULL,
    data_resgate DATE,
    prazo_lockup INTEGER DEFAULT 12, -- Meses
    
    -- Performance
    valor_atual DECIMAL(12,2) GENERATED ALWAYS AS (quantidade_cotas * (SELECT cotacao_atual FROM public.fundo_investimento_corretores WHERE id = fundo_id)) STORED,
    rentabilidade_parcial DECIMAL(8,4) GENERATED ALWAYS AS ((valor_atual - valor_aplicado) / valor_aplicado * 100) STORED,
    
    -- Status
    status TEXT DEFAULT 'ativo', -- 'ativo', 'resgatado', 'suspenso'
    data_resgate_efetivo TIMESTAMPTZ,
    valor_resgate DECIMAL(12,2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Oportunidades de Aporte (Curadoria IA)
CREATE TABLE IF NOT EXISTS public.oportunidades_aporte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    
    -- Dados da oportunidade
    nome_projeto TEXT NOT NULL,
    tipo_projeto TEXT, -- 'residencial', 'comercial', 'misto', 'land_banking'
    estagio TEXT, -- 'greenfield', 'construcao', 'pronto'
    
    -- Dados financeiros
    valor_total_projeto DECIMAL(15,2) NOT NULL,
    valor_capital_externo DECIMAL(15,2) NOT NULL,
    valor_minimo_aporte DECIMAL(10,2) NOT NULL,
    
    -- Métricas de ROI
    roi_projetado DECIMAL(8,4) NOT NULL,
    payback_meses INTEGER NOT NULL,
    tir_projetada DECIMAL(8,4) NOT NULL,
    
    -- Análise de risco
    nivel_risco TEXT NOT NULL, -- 'baixo', 'medio', 'alto'
    score_credito DECIMAL(5,2) DEFAULT 0,
    garantias TEXT[] DEFAULT '{}',
    
    -- Curadoria IA
    score_oportunidade DECIMAL(5,2) NOT NULL, -- Score 0-100 da IA
    motivo_destaque TEXT, -- Por que esta oportunidade está em destaque
    recomendacao_ia TEXT, -- Recomendação da inteligência artificial
    tags_ia TEXT[] DEFAULT '{}',
    
    -- Condições
    data_inicio_captação DATE NOT NULL,
    data_fim_captação DATE NOT NULL,
    prazo_investimento INTEGER NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'disponivel', -- 'disponivel', 'encerrado', 'cancelado'
    total_aportado DECIMAL(15,2) DEFAULT 0,
    investidores_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aportes em Oportunidades
CREATE TABLE IF NOT EXISTS public.aportes_oportunidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oportunidade_id UUID REFERENCES public.oportunidades_aporte(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados do aporte
    valor_aporte DECIMAL(12,2) NOT NULL,
    percentual_participacao DECIMAL(5,2) NOT NULL,
    data_aporte DATE NOT NULL,
    
    -- Origem dos recursos
    origem_fundos TEXT, -- 'wallet_investimento', 'recursos_proprios', 'financiamento'
    wallet_investimento_id UUID REFERENCES public.wallet_investimento(id),
    
    -- Condições
    prazo_investimento INTEGER NOT NULL,
    taxa_juros_contratual DECIMAL(8,4),
    clausulas_especiais TEXT[] DEFAULT '{}',
    
    -- Retornos esperados
    retorno_esperado DECIMAL(12,2),
    data_retorno_esperado DATE,
    
    -- Status
    status TEXT DEFAULT 'ativo', -- 'ativo', 'concluido', 'cancelado'
    data_conclusao TIMESTAMPTZ,
    valor_retornado DECIMAL(12,2),
    
    -- Documentação
    contrato_investimento_id UUID,
    comprovante_transferencia_id UUID,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE INVESTIMENTO
-- =====================================================

-- Trigger para calcular score de oportunidade
CREATE OR REPLACE FUNCTION public.calcular_score_oportunidade()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular score baseado em múltiplos fatores
    DECLARE
        score_roi DECIMAL(5,2);
        score_risco DECIMAL(5,2);
        score_mercado DECIMAL(5,2);
        score_final DECIMAL(5,2);
    BEGIN
        -- Score ROI (40%)
        IF NEW.roi_projetado >= 20 THEN
            score_roi := 40;
        ELSIF NEW.roi_projetado >= 15 THEN
            score_roi := 30;
        ELSIF NEW.roi_projetado >= 10 THEN
            score_roi := 20;
        ELSE
            score_roi := 10;
        END IF;
        
        -- Score Risco (30%)
        IF NEW.nivel_risco = 'baixo' THEN
            score_risco := 30;
        ELSIF NEW.nivel_risco = 'medio' THEN
            score_risco := 20;
        ELSE
            score_risco := 10;
        END IF;
        
        -- Score Mercado (30%)
        IF NEW.score_credito >= 80 THEN
            score_mercado := 30;
        ELSIF NEW.score_credito >= 60 THEN
            score_mercado := 20;
        ELSE
            score_mercado := 10;
        END IF;
        
        -- Score final
        score_final := score_roi + score_risco + score_mercado;
        
        NEW.score_oportunidade := score_final;
        
        -- Gerar recomendação da IA
        IF score_final >= 80 THEN
            NEW.recomendacao_ia := 'Oportunidade premium - ROI excepcional com risco controlado';
        ELSIF score_final >= 60 THEN
            NEW.recomendacao_ia := 'Oportunidade atrativa - Bom equilíbrio risco/retorno';
        ELSIF score_final >= 40 THEN
            NEW.recomendacao_ia := 'Oportunidade moderada - Avaliar com cuidado';
        ELSE
            NEW.recomendacao_ia := 'Oportunidade de baixo perfil - Risco elevado';
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_score_oportunidade
    BEFORE INSERT OR UPDATE ON public.oportunidades_aporte
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_score_oportunidade();

-- Trigger para atualizar cotações do fundo
CREATE OR REPLACE FUNCTION public.atualizar_cotacao_fundo()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar cotação baseada na performance
    UPDATE public.fundo_investimento_corretores
    SET 
        cotacao_atual = cotacao_atual * (1 + NEW.rentabilidade_mensal / 100),
        rentabilidade_anual = (SELECT AVG(rentabilidade_mensal) * 12 FROM fundo_investimento_corretores WHERE id = NEW.id),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_cotacao_fundo
    AFTER UPDATE ON public.fundo_investimento_corretores
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_cotacao_fundo();

-- =====================================================
-- FUNÇÕES DE ANÁLISE E CURADORIA
-- =====================================================

-- Função para analisar déficit habitacional
CREATE OR REPLACE FUNCTION public.analisar_deficit_habitacional(
    p_cidade TEXT,
    p_estado TEXT
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    dados_regiao RECORD;
    total_deficit INTEGER := 0;
    media_precos DECIMAL(10,2) := 0;
    score_oportunidade DECIMAL(5,2) := 0;
BEGIN
    -- Buscar dados da região
    SELECT * INTO dados_regiao
    FROM public.regioes_deficit_habitacional
    WHERE cidade = p_cidade AND estado = p_estado
    ORDER BY score_oportunidade DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Região não encontrada');
    END IF;
    
    -- Calcular métricas adicionais
    total_deficit := dados_regiao.deficit_quantitativo + dados_regiao.demanda_reprimida;
    media_precos := dados_regiao.preco_medio_m2;
    
    -- Construir resultado
    resultado := jsonb_build_object(
        'regiao', jsonb_build_object(
            'nome', dados_regiao.nome_regiao,
            'cidade', dados_regiao.cidade,
            'estado', dados_regiao.estado,
            'coordenadas', ST_AsGeoJSON(dados_regiao.coordenadas)
        ),
        'deficit_habitacional', jsonb_build_object(
            'quantitativo', dados_regiao.deficit_quantitativo,
            'percentual', dados_regiao.deficit_percentual,
            'demanda_reprimida', dados_regiao.demanda_reprimida,
            'total_necessidade', total_deficit
        ),
        'dados_mercado', jsonb_build_object(
            'preco_medio_m2', media_precos,
            'preco_minimo_viavel', dados_regiao.preco_minimo_viavel,
            'oferta_publica', dados_regiao.oferta_publica,
            'tempo_medio_venda', dados_regiao.tempo_medio_venda
        ),
        'indices_oportunidade', jsonb_build_object(
            'score_oportunidade', dados_regiao.score_oportunidade,
            'indice_escassez', dados_regiao.indice_escassez,
            'potencial_valorizacao', dados_regiao.potencial_valorizacao,
            'classificacao', dados_regiao.classificacao,
            'tendencia_mercado', dados_regiao.tendencia_mercado
        ),
        'recomendacoes', jsonb_build_array(
            CASE 
                WHEN dados_regiao.score_oportunidade >= 80 THEN 'Alta prioridade - Investir imediatamente'
                WHEN dados_regiao.score_oportunidade >= 60 THEN 'Média prioridade - Avaliar oportunidade'
                ELSE 'Baixa prioridade - Monitorar mercado'
            END,
            CASE 
                WHEN dados_regiao.oferta_publica < dados_regiao.deficit_quantitativo THEN 'Déficit de oferta - Oportunidade de lançamento'
                ELSE 'Oferta adequada - Focar em qualidade'
            END
        )
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para curadoria de oportunidades
CREATE OR REPLACE FUNCTION public.curadoria_oportunidades_ia(
    p_broker_id UUID,
    p_risco_maximo TEXT DEFAULT 'medio',
    p_roi_minimo DECIMAL DEFAULT 10.0
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    oportunidades JSONB := '[]'::jsonb;
    oportunidade_destaque RECORD;
BEGIN
    -- Buscar perfil do broker
    DECLARE
        perfil_broker RECORD;
    BEGIN
        SELECT 
            b.nome,
            b.experiencia_anos,
            b.portfolio_valor_total,
            b.risco_apetite
        INTO perfil_broker
        FROM public.brokers b
        WHERE b.id = p_broker_id;
    END;
    
    -- Buscar oportunidades conforme critérios
    FOR oportunidade_destaque IN
        SELECT 
            o.*,
            e.nome as empreendimento_nome,
            e.cidade,
            e.estado
        FROM public.oportunidades_aporte o
        JOIN public.empreendimentos_sb e ON o.projeto_id = e.id
        WHERE o.status = 'disponivel'
        AND o.nivel_risco <= p_risco_maximo
        AND o.roi_projetado >= p_roi_minimo
        AND o.score_oportunidade >= 60
        ORDER BY o.score_oportunidade DESC
        LIMIT 10
    LOOP
        -- Adicionar oportunidade ao resultado
        oportunidades := oportunidades || jsonb_build_object(
            'id', oportunidade_destaque.id,
            'nome_projeto', oportunidade_destaque.nome_projeto,
            'localizacao', jsonb_build_object(
                'cidade', oportunidade_destaque.cidade,
                'estado', oportunidade_destaque.estado
            ),
            'dados_financeiros', jsonb_build_object(
                'valor_total', oportunidade_destaque.valor_total_projeto,
                'valor_minimo_aporte', oportunidade_destaque.valor_minimo_aporte,
                'roi_projetado', oportunidade_destaque.roi_projetado,
                'tir_projetada', oportunidade_destaque.tir_projetada,
                'payback_meses', oportunidade_destaque.payback_meses
            ),
            'analise_risco', jsonb_build_object(
                'nivel_risco', oportunidade_destaque.nivel_risco,
                'score_credito', oportunidade_destaque.score_credito,
                'garantias', oportunidade_destaque.garantias
            ),
            'curadoria_ia', jsonb_build_object(
                'score_oportunidade', oportunidade_destaque.score_oportunidade,
                'motivo_destaque', oportunidade_destaque.motivo_destaque,
                'recomendacao_ia', oportunidade_destaque.recomendacao_ia,
                'tags', oportunidade_destaque.tags_ia
            ),
            'condicoes', jsonb_build_object(
                'data_inicio_captação', oportunidade_destaque.data_inicio_captação,
                'data_fim_captação', oportunidade_destaque.data_fim_captação,
                'prazo_investimento', oportunidade_destaque.prazo_investimento
            )
        );
    END LOOP;
    
    -- Construir resultado final
    resultado := jsonb_build_object(
        'broker', jsonb_build_object(
            'id', p_broker_id,
            'nome', perfil_broker.nome,
            'experiencia_anos', perfil_broker.experiencia_anos,
            'portfolio_valor', perfil_broker.portfolio_valor_total
        ),
        'criterios_busca', jsonb_build_object(
            'risco_maximo', p_risco_maximo,
            'roi_minimo', p_roi_minimo
        ),
        'oportunidades_encontradas', jsonb_array_length(oportunidades),
        'oportunidades', oportunidades,
        'resumo', jsonb_build_object(
            'total_oportunidades', jsonb_array_length(oportunidades),
            'roi_medio', (SELECT AVG(roi_projetado::DECIMAL) FROM jsonb_array_elements(oportunidades) -> 'dados_financeiros' ->> 'roi_projetado'),
            'score_medio', (SELECT AVG(score_oportunidade::DECIMAL) FROM jsonb_array_elements(oportunidades) -> 'curadoria_ia' ->> 'score_oportunidade'),
            'recomendacao_principal', CASE 
                WHEN jsonb_array_length(oportunidades) >= 5 THEN 'Excelente carteira de oportunidades'
                WHEN jsonb_array_length(oportunidades) >= 3 THEN 'Boa carteira de oportunidades'
                WHEN jsonb_array_length(oportunidades) >= 1 THEN 'Oportunidades limitadas disponíveis'
                ELSE 'Nenhuma oportunidade encontrada nos critérios'
            END
        )
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS E CONSULTAS OTIMIZADAS
-- =====================================================

-- View de Dashboard de Déficit Habitacional
CREATE OR REPLACE VIEW public.dashboard_deficit_habitacional AS
SELECT 
    r.*,
    CASE 
        WHEN r.score_oportunidade >= 80 THEN 'alta_prioridade'
        WHEN r.score_oportunidade >= 60 THEN 'media_prioridade'
        ELSE 'baixa_prioridade'
    END as prioridade_investimento,
    CASE 
        WHEN r.deficit_quantitativo > r.oferta_publica THEN 'deficit_oferta'
        WHEN r.deficit_quantitativo = r.oferta_publica THEN 'equilibrio'
        ELSE 'excesso_oferta'
    END as balanco_oferta_demanda
FROM public.regioes_deficit_habitacional r
WHERE r.data_coleta >= CURRENT_DATE - INTERVAL '6 months'
ORDER BY r.score_oportunidade DESC;

-- View de Performance do Fundo de Investimento
CREATE OR REPLACE VIEW public.performance_fundo_investimento AS
SELECT 
    f.*,
    COUNT(wi.id) as total_investidores,
    SUM(wi.valor_aplicado) as total_aplicado,
    SUM(wi.valor_atual) as total_atual,
    (SUM(wi.valor_atual) - SUM(wi.valor_aplicado)) / SUM(wi.valor_aplicado) * 100 as rentabilidade_fundo,
    AVG(wi.rentabilidade_parcial) as rentabilidade_media_investidores
FROM public.fundo_investimento_corretores f
LEFT JOIN public.wallet_investimento wi ON f.id = wi.fundo_id AND wi.status = 'ativo'
GROUP BY f.id, f.nome_fundo, f.tipo_fundo, f.patrimonio_total, f.cotacao_atual, 
         f.total_cotas_emitidas, f.rentabilidade_mensal, f.rentabilidade_anual, 
         f.drawdown_maximo, f.sharpe_ratio, f.taxa_administracao, f.taxa_performance,
         f.investimento_minimo, f.status, f.data_constitucao, f.data_encerramento,
         f.gestor_principal_id, f.comite_investimento, f.created_at, f.updated_at;

-- View de Oportunidades de Investimento
CREATE OR REPLACE VIEW public.oportunidades_investimento AS
SELECT 
    o.*,
    e.nome as empreendimento_nome,
    e.cidade,
    e.estado,
    e.bairro,
    COUNT(ap.id) as total_aportes,
    COALESCE(SUM(ap.valor_aporte), 0) as total_aportado,
    (o.valor_capital_externo - COALESCE(SUM(ap.valor_aporte), 0)) as valor_disponivel,
    CASE 
        WHEN o.score_oportunidade >= 80 THEN 'premium'
        WHEN o.score_oportunidade >= 60 THEN 'atracao'
        ELSE 'moderada'
    END as classificacao
FROM public.oportunidades_aporte o
JOIN public.empreendimentos_sb e ON o.projeto_id = e.id
LEFT JOIN public.aportes_oportunidades ap ON o.id = ap.oportunidade_id AND ap.status = 'ativo'
WHERE o.status = 'disponivel'
GROUP BY o.id, o.nome_projeto, o.tipo_projeto, o.estagio, o.valor_total_projeto,
         o.valor_capital_externo, o.valor_minimo_aporte, o.roi_projetado, o.payback_meses,
         o.tir_projetada, o.nivel_risco, o.score_credito, o.garantias, o.score_oportunidade,
         o.motivo_destaque, o.recomendacao_ia, o.tags_ia, o.data_inicio_captação,
         o.data_fim_captação, o.prazo_investimento, o.status, o.total_aportado,
         o.investidores_count, e.nome, e.cidade, e.estado, e.bairro
ORDER BY o.score_oportunidade DESC;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_regioes_score ON public.regioes_deficit_habitacional(score_oportunidade);
CREATE INDEX IF NOT EXISTS idx_regioes_localizacao ON public.regioes_deficit_habitacional(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_vendas_terrenos_broker ON public.vendas_terrenos(broker_id);
CREATE INDEX IF NOT EXISTS idx_vendas_terrenos_status ON public.vendas_terrenos(status);
CREATE INDEX IF NOT EXISTS idx_participacao_empreendimento ON public.participacao_lucros(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_participacao_broker ON public.participacao_lucros(broker_id);
CREATE INDEX IF NOT EXISTS idx_investidores_status ON public.investidores_sb_master(status);
CREATE INDEX IF NOT EXISTS idx_fundo_investimento_status ON public.fundo_investimento_corretores(status);
CREATE INDEX IF NOT EXISTS idx_wallet_broker ON public.wallet_investimento(broker_id);
CREATE INDEX IF NOT EXISTS idx_wallet_status ON public.wallet_investimento(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_score ON public.oportunidades_aporte(score_oportunidade);
CREATE INDEX IF NOT EXISTS idx_oportunidades_status ON public.oportunidades_aporte(status);
CREATE INDEX IF NOT EXISTS idx_aportes_oportunidade ON public.aportes_oportunidades(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_aportes_broker ON public.aportes_oportunidades(broker_id);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir regiões com déficit habitacional (exemplos)
INSERT INTO public.regioes_deficit_habitacional (
    nome_regiao, cidade, estado, coordenadas, deficit_quantitativo, deficit_percentual,
    demanda_reprimida, poder_aquisitivo_medio, preco_medio_m2, preco_minimo_viavel,
    oferta_publica, score_oportunidade, indice_escassez, potencial_valorizacao,
    classificacao, tendencia_mercado
) VALUES
('Zona Norte São Paulo', 'São Paulo', 'SP', 'POINT(-46.6333 -23.5505)', 15000, 25.5, 8000, 8500.00, 7500.00, 5500.00, 3200, 85.5, 4.2, 12.8, 'alta_prioridade', 'aquecimento'),
('Barra da Tijuca', 'Rio de Janeiro', 'RJ', 'POINT(-43.3157 -22.9999)', 12000, 18.2, 6500, 12000.00, 9800.00, 7200.00, 2800, 78.3, 3.8, 8.5, 'alta_prioridade', 'estabilidade'),
('Vila Madalena', 'São Paulo', 'SP', 'POINT(-46.6902 -23.5432)', 8500, 22.1, 4200, 15000.00, 12000.00, 8900.00, 1900, 92.1, 5.2, 15.3, 'alta_prioridade', 'aquecimento');

-- Criar fundo de investimento padrão
INSERT INTO public.fundo_investimento_corretores (
    nome_fundo, tipo_fundo, patrimonio_total, cotacao_atual, rentabilidade_mensal,
    rentabilidade_anual, taxa_administracao, taxa_performance, investimento_minimo,
    data_constitucao, status
) VALUES (
    'SB BROKERS INVESTMENT FUND', 'multimercado', 2500000.00, 1.000000, 1.25, 15.00, 1.50, 20.00, 1000.00, '2026-01-01', 'ativo'
);

-- Inserir oportunidades de aporte (exemplos)
INSERT INTO public.oportunidades_aporte (
    projeto_id, nome_projeto, tipo_projeto, estagio, valor_total_projeto,
    valor_capital_externo, valor_minimo_aporte, roi_projetado, payback_meses,
    tir_projetada, nivel_risco, score_credito, garantias, score_oportunidade,
    motivo_destaque, recomendacao_ia, tags_ia, data_inicio_captação,
    data_fim_captação, prazo_investimento, status
) VALUES
-- Exemplo One Prime
('00000000-0000-0000-0000-000000000001', 'One Prime Residential', 'residencial', 'construcao', 50000000.00, 15000000.00, 250000.00, 18.5, 36, 22.3, 'medio', 82.5, ARRAY['hipoteca', 'terreno', 'seguro'], 88.7, 'ROI excepcional com garantias robustas', 'Oportunidade premium - Investir imediatamente', ARRAY['high_roi', 'garantias_reais', 'localizacao_prime'], '2026-05-01', '2026-12-31', 48, 'disponivel'),
-- Exemplo Taiwan
('00000000-0000-0000-0000-000000000002', 'Taiwan Business Center', 'comercial', 'greenfield', 35000000.00, 12000000.00, 200000.00, 22.1, 42, 25.8, 'medio', 78.9, ARRAY['terreno', 'contratos'], 85.2, 'Localização estratégica com alta demanda', 'Oportunidade premium - ROI excepcional com risco controlado', ARRAY['comercial', 'localizacao_estrategica', 'alta_demanda'], '2026-05-01', '2027-03-31', 60, 'disponivel');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V16 - GLOBAL INVESTMENT HUB CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.regioes_deficit_habitacional) as total_regioes_deficit,
       (SELECT COUNT(*) FROM public.vendas_terrenos) as total_vendas_terrenos,
       (SELECT COUNT(*) FROM public.participacao_lucros) as total_participacoes,
       (SELECT COUNT(*) FROM public.investidores_sb_master) as total_investidores,
       (SELECT COUNT(*) FROM public.fundo_investimento_corretores) as total_fundos,
       (SELECT COUNT(*) FROM public.wallet_investimento) as total_wallets,
       (SELECT COUNT(*) FROM public.oportunidades_aporte) as total_oportunidades,
       (SELECT COUNT(*) FROM public.aportes_oportunidades) as total_aportes;
