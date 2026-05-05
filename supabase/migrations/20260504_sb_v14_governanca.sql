-- 🏛️ SECURITY BROKER SB v14 - GOVERNANÇA FINANCEIRA E MONITORAMENTO GEO-LOCALIZADO
-- Schema completo para Dashboard de Marketing, Radar 5KM e Consolidação

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS DE GOVERNANÇA FINANCEIRA
-- =====================================================

-- Fontes de Tráfego e Origem de Leads
CREATE TABLE IF NOT EXISTS public.fontes_trafego (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL, -- Google Ads, Facebook, Instagram, Orgânico, Indicação
    tipo TEXT NOT NULL, -- pago, organico, referencia
    plataforma TEXT, -- google, meta, tiktok, linkedin
    custo_mensal DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ativa', -- ativa, pausada, encerrada
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rastreabilidade de Marketing (Origem do Lead)
CREATE TABLE IF NOT EXISTS public.rastreabilidade_marketing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    fonte_trafego_id UUID REFERENCES public.fontes_trafego(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    campanha TEXT, -- Nome da campanha específica
    termo_pesquisa TEXT, -- Termo que gerou o lead
    data_primeiro_contato TIMESTAMPTZ DEFAULT NOW(),
    data_ultima_interacao TIMESTAMPTZ DEFAULT NOW(),
    custo_aquisicao DECIMAL(10,2) DEFAULT 0,
    status_conversao TEXT DEFAULT 'pendente', -- pendente, qualificado, pasta_100, convertido, perdido
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extrato de Utilização de Verba (Transparência de Aporte)
CREATE TABLE IF NOT EXISTS public.extrato_verba (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    tipo_movimento TEXT NOT NULL, -- credito, debito, ajuste, monetizacao
    categoria TEXT NOT NULL, -- setup, marketing, ads, match, bonus
    valor DECIMAL(12,2) NOT NULL,
    saldo_anterior DECIMAL(12,2),
    saldo_posterior DECIMAL(12,2),
    referencia_id UUID, -- ID da transação relacionada
    descricao TEXT NOT NULL,
    data_movimento TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE RADAR DE MERCADO 5KM (IA SENTINEL)
-- =====================================================

-- Monitoramento de Preços por Região
CREATE TABLE IF NOT EXISTS public.monitoramento_precos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empreendimento_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    coordenadas_centro GEOGRAPHY(POINT, 4326),
    raio_km INTEGER DEFAULT 5,
    data_coleta TIMESTAMPTZ DEFAULT NOW(),
    preco_medio_m2 DECIMAL(10,2), -- Preço médio do m² na região
    preco_minimo_m2 DECIMAL(10,2),
    preco_maximo_m2 DECIMAL(10,2),
    total_anuncios INTEGER, -- Total de anúncios analisados
    variacao_percentual DECIMAL(5,2), -- Variação em relação à coleta anterior
    tendencia TEXT, -- alta, estavel, baixa
    fonte_dados TEXT, -- onde os dados foram coletados
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análise Geracional do Público
CREATE TABLE IF NOT EXISTS public.analise_geracional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    geracao TEXT NOT NULL, -- Gen Z, Millennials, Gen X, Boomers
    faixa_etaria_min INTEGER,
    faixa_etaria_max INTEGER,
    total_leads INTEGER DEFAULT 0,
    percentual_conversao DECIMAL(5,2),
    ticket_medio DECIMAL(12,2),
    preferencia_tipo_imovel TEXT, -- casa, apartamento, comercial
    preferencia_bairro TEXT,
    poder_aquisitivo TEXT, -- baixo, medio, alto
    data_analise TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indicadores Econômicos (INCC e Selic)
CREATE TABLE IF NOT EXISTS public.indicadores_economicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicador TEXT NOT NULL, -- INCC, Selic, IPCA, IGPM
    valor DECIMAL(10,6) NOT NULL,
    data_referencia DATE NOT NULL,
    variacao_mensal DECIMAL(10,6),
    variacao_anual DECIMAL(10,6),
    fonte TEXT NOT NULL, -- IBGE, Bacen, FGV
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projeções de Financiamento e ROI
CREATE TABLE IF NOT EXISTS public.projecoes_financeiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empreendimento_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    data_projecao TIMESTAMPTZ DEFAULT NOW(),
    valor_imovel DECIMAL(12,2) NOT NULL,
    percentual_entrada DECIMAL(5,2),
    valor_entrada DECIMAL(12,2),
    prazo_financiamento INTEGER, -- em meses
    taxa_juros_efetiva DECIMAL(6,4),
    valor_parcela DECIMAL(10,2),
    taxa_selic_atual DECIMAL(6,4),
    taxa_incc_atual DECIMAL(6,4),
    roi_projetado DECIMAL(8,2),
    risco_credito TEXT, -- baixo, medio, alto
    viabilidade TEXT, -- viavel, marginal, inviavel
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE CONSOLIDAÇÃO E TRAVAS
-- =====================================================

-- Consolidação de CPF e Mérito (OUROBOROS 3.0)
CREATE TABLE IF NOT EXISTS public.consolidacao_cpf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf TEXT NOT NULL,
    total_cadastros INTEGER DEFAULT 0,
    brokers_envolvidos JSONB DEFAULT '[]', -- Array de broker_id
    incorporadoras_envolvidas JSONB DEFAULT '[]', -- Array de incorporadora_id
    status_consolidacao TEXT DEFAULT 'pendente', -- pendente, em_analise, consolidado, perdido
    broker_eleito_id UUID REFERENCES public.brokers(id),
    pasta_progresso_maxima INTEGER DEFAULT 0,
    data_primeiro_cadastro TIMESTAMPTZ DEFAULT NOW(),
    data_consolidacao TIMESTAMPTZ,
    eficiencia_conversao DECIMAL(5,2), -- % de conversão do CPF
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estudo de Demanda do Bairro
CREATE TABLE IF NOT EXISTS public.estudo_demanda_bairro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    coordenadas GEOGRAPHY(POINT, 4326),
    data_estudo TIMESTAMPTZ DEFAULT NOW(),
    demanda_total INTEGER DEFAULT 0, -- Total de leads interessados
    oferta_total INTEGER DEFAULT 0, -- Total de unidades disponíveis
    gap_quantitativo INTEGER DEFAULT 0, -- Diferença absoluta
    gap_percentual DECIMAL(5,2) DEFAULT 0,
    banco_areas_disponiveis INTEGER DEFAULT 0, -- Áreas no banco de permutas
    areas_escassas TEXT[] DEFAULT '{}', -- Tipos de áreas escassas
    preco_medio_m2 DECIMAL(10,2),
    poder_aquisitivo_medio DECIMAL(10,2),
    tendencia_mercado TEXT, -- aquecimento, estabilidade, resfriamento
    recomendacoes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs Imutáveis de Governança (Centavos e Leads)
CREATE TABLE IF NOT EXISTS public.logs_governanca (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_registro TEXT NOT NULL, -- centavo, lead, transacao, decisao
    entidade_id UUID NOT NULL,
    entidade_tabela TEXT NOT NULL,
    acao TEXT NOT NULL, -- create, update, delete, approve, reject
    dados_anteriores JSONB,
    dados_novos JSONB,
    valor_movimentado DECIMAL(15,2), -- Para registros financeiros
    ip_address TEXT,
    user_agent TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    hash_imutavel TEXT UNIQUE NOT NULL, -- SHA-256 para imutabilidade
    data_registro TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE GOVERNANÇA
-- =====================================================

-- Trigger para gerar hash imutável dos logs
CREATE OR REPLACE FUNCTION public.gerar_hash_governanca()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_imutavel = encode(
        sha256(
            NEW.tipo_registro::text || 
            NEW.entidade_id::text || 
            NEW.acao::text || 
            COALESCE(NEW.valor_movimentado::text, '0') || 
            EXTRACT(EPOCH FROM NEW.data_registro)::text
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_hash_governanca
    BEFORE INSERT ON public.logs_governanca
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_governanca();

-- Trigger para atualizar consolidação de CPF
CREATE OR REPLACE FUNCTION public.atualizar_consolidacao_cpf()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar ou criar consolidação quando um lead for inserido/atualizado
    INSERT INTO public.consolidacao_cpf (
        cpf,
        total_cadastros,
        brokers_envolvidos,
        incorporadoras_envolvidas,
        pasta_progresso_maxima,
        status_consolidacao
    )
    SELECT 
        NEW.cpf,
        COUNT(*)::INTEGER,
        array_agg(DISTINCT b.id::text),
        array_agg(DISTINCT i.id::text),
        COALESCE(MAX(pd.progresso_percentual), 0),
        CASE 
            WHEN COUNT(*) >= 3 THEN 'em_analise'
            WHEN COUNT(*) >= 2 THEN 'pendente'
            ELSE 'consolidado'
        END
    FROM public.leads l
    LEFT JOIN public.brokers b ON l.broker_eleito_id = b.id
    LEFT JOIN public.incorporadoras_sb i ON b.incorporadora_id = i.id
    LEFT JOIN public.pastas_documentos pd ON l.id = pd.lead_id
    WHERE l.cpf = NEW.cpf
    GROUP BY l.cpf
    ON CONFLICT (cpf) DO UPDATE SET
        total_cadastros = EXCLUDED.total_cadastros,
        brokers_envolvidos = EXCLUDED.brokers_envolvidos,
        incorporadoras_envolvidas = EXCLUDED.incorporadoras_envolvidas,
        pasta_progresso_maxima = EXCLUDED.pasta_progresso_maxima,
        status_consolidacao = EXCLUDED.status_consolidacao,
        updated_at = NOW();
    
    -- Criar log de governança
    INSERT INTO public.logs_governanca (
        tipo_registro,
        entidade_id,
        entidade_tabela,
        acao,
        dados_novos,
        usuario_id
    ) VALUES (
        'lead',
        NEW.id,
        'leads',
        TG_OP,
        json_build_object('cpf', NEW.cpf, 'status', NEW.status),
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_consolidacao_cpf
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_consolidacao_cpf();

-- Trigger para extrato de verba
CREATE OR REPLACE FUNCTION public.atualizar_extrato_verba()
RETURNS TRIGGER AS $$
DECLARE
    saldo_anterior DECIMAL(12,2);
    saldo_posterior DECIMAL(12,2);
BEGIN
    -- Buscar saldo anterior da incorporadora
    SELECT COALESCE(wallet_creditos, 0) INTO saldo_anterior
    FROM public.incorporadoras_sb 
    WHERE id = NEW.incorporadora_id;
    
    -- Calcular novo saldo
    IF NEW.tipo_movimento = 'credito' THEN
        saldo_posterior := saldo_anterior + NEW.valor;
    ELSIF NEW.tipo_movimento = 'debito' THEN
        saldo_posterior := saldo_anterior - NEW.valor;
    ELSE
        saldo_posterior := saldo_anterior; -- Para ajustes
    END IF;
    
    -- Atualizar saldo no registro
    NEW.saldo_anterior := saldo_anterior;
    NEW.saldo_posterior := saldo_posterior;
    
    -- Atualizar wallet da incorporadora
    UPDATE public.incorporadoras_sb 
    SET wallet_creditos = saldo_posterior
    WHERE id = NEW.incorporadora_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_extrato_verba
    BEFORE INSERT ON public.extrato_verba
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_extrato_verba();

-- =====================================================
-- FUNÇÕES DE ANÁLISE E MONITORAMENTO
-- =====================================================

-- Função para calcular ROI de Marketing
CREATE OR REPLACE FUNCTION public.calcular_roi_marketing(
    p_incorporadora_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    total_investido DECIMAL(12,2) := 0;
    total_leads INTEGER := 0;
    leads_qualificados INTEGER := 0;
    pastas_100 INTEGER := 0;
    total_vendas DECIMAL(12,2) := 0;
    roi DECIMAL(8,2) := 0;
    custo_por_lead DECIMAL(10,2) := 0;
    custo_por_conversao DECIMAL(10,2) := 0;
BEGIN
    -- Calcular total investido em marketing
    SELECT COALESCE(SUM(valor), 0) INTO total_investido
    FROM public.extrato_verba
    WHERE incorporadora_id = p_incorporadora_id
    AND categoria = 'marketing'
    AND data_movimento::date BETWEEN p_data_inicio AND p_data_fim;
    
    -- Calcular métricas de leads
    SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'qualificado' THEN 1 END) as leads_qualificados
    INTO total_leads, leads_qualificados
    FROM public.rastreabilidade_marketing rm
    WHERE rm.incorporadora_id = p_incorporadora_id
    AND rm.data_primeiro_contato::date BETWEEN p_data_inicio AND p_data_fim;
    
    -- Calcular pastas 100%
    SELECT COUNT(*) INTO pastas_100
    FROM public.pastas_documentos pd
    JOIN public.rastreabilidade_marketing rm ON pd.lead_id = rm.lead_id
    WHERE rm.incorporadora_id = p_incorporadora_id
    AND pd.progresso_percentual = 100
    AND rm.data_primeiro_contato::date BETWEEN p_data_inicio AND p_data_fim;
    
    -- Calcular total de vendas
    SELECT COALESCE(SUM(v.valor_venda), 0) INTO total_vendas
    FROM public.vendas v
    JOIN public.rastreabilidade_marketing rm ON v.lead_id = rm.lead_id
    WHERE rm.incorporadora_id = p_incorporadora_id
    AND v.data_venda::date BETWEEN p_data_inicio AND p_data_fim
    AND v.status = 'confirmada';
    
    -- Calcular métricas
    custo_por_lead := CASE WHEN total_leads > 0 THEN total_investido / total_leads ELSE 0 END;
    custo_por_conversao := CASE WHEN pastas_100 > 0 THEN total_investido / pastas_100 ELSE 0 END;
    roi := CASE WHEN total_investido > 0 THEN ((total_vendas - total_investido) / total_investido) * 100 ELSE 0 END;
    
    -- Construir resultado JSON
    resultado := jsonb_build_object(
        'periodo', jsonb_build_object('inicio', p_data_inicio, 'fim', p_data_fim),
        'investimento', jsonb_build_object(
            'total_investido', total_investido,
            'fontes', 'marketing'
        ),
        'metricas', jsonb_build_object(
            'total_leads', total_leads,
            'leads_qualificados', leads_qualificados,
            'pastas_100', pastas_100,
            'total_vendas', total_vendas
        ),
        'performance', jsonb_build_object(
            'custo_por_lead', custo_por_lead,
            'custo_por_conversao', custo_por_conversao,
            'roi_percentual', roi,
            'taxa_conversao', CASE WHEN total_leads > 0 THEN (pastas_100::DECIMAL / total_leads) * 100 ELSE 0 END
        )
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para analisar mercado 5KM
CREATE OR REPLACE FUNCTION public.analisar_mercado_5km(
    p_empreendimento_id UUID
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    dados_empreendimento RECORD;
    monitoramento_atual RECORD;
    analise_geracional JSONB := '[]'::jsonb;
    demanda_bairro RECORD;
BEGIN
    -- Buscar dados do empreendimento
    SELECT * INTO dados_empreendimento
    FROM public.empreendimentos_sb
    WHERE id = p_empreendimento_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Empreendimento não encontrado');
    END IF;
    
    -- Buscar monitoramento atual de preços
    SELECT * INTO monitoramento_atual
    FROM public.monitoramento_precos
    WHERE bairro = dados_empreendimento.bairro
    AND cidade = dados_empreendimento.cidade
    ORDER BY data_coleta DESC
    LIMIT 1;
    
    -- Buscar análise geracional
    SELECT jsonb_agg(
        jsonb_build_object(
            'geracao', g.geracao,
            'total_leads', g.total_leads,
            'percentual_conversao', g.percentual_conversao,
            'ticket_medio', g.ticket_medio,
            'preferencia_tipo', g.preferencia_tipo_imovel
        )
    ) INTO analise_geracional
    FROM public.analise_geracional g
    WHERE g.bairro = dados_empreendimento.bairro
    AND g.cidade = dados_empreendimento.cidade;
    
    -- Buscar estudo de demanda do bairro
    SELECT * INTO demanda_bairro
    FROM public.estudo_demanda_bairro
    WHERE bairro = dados_empreendimento.bairro
    AND cidade = dados_empreendimento.cidade
    ORDER BY data_estudo DESC
    LIMIT 1;
    
    -- Construir resultado
    resultado := jsonb_build_object(
        'empreendimento', jsonb_build_object(
            'id', dados_empreendimento.id,
            'nome', dados_empreendimento.nome,
            'bairro', dados_empreendimento.bairro,
            'cidade', dados_empreendimento.cidade,
            'coordenadas', ST_AsGeoJSON(dados_empreendimento.coordenadas)
        ),
        'monitoramento_precos', CASE 
            WHEN monitoramento_atual IS NOT NULL THEN 
                jsonb_build_object(
                    'preco_medio_m2', monitoramento_atual.preco_medio_m2,
                    'preco_minimo_m2', monitoramento_atual.preco_minimo_m2,
                    'preco_maximo_m2', monitoramento_atual.preco_maximo_m2,
                    'total_anuncios', monitoramento_atual.total_anuncios,
                    'variacao_percentual', monitoramento_atual.variacao_percentual,
                    'tendencia', monitoramento_atual.tendencia,
                    'data_coleta', monitoramento_atual.data_coleta
                )
            ELSE NULL
        END,
        'analise_geracional', analise_geracional,
        'demanda_bairro', CASE 
            WHEN demanda_bairro IS NOT NULL THEN 
                jsonb_build_object(
                    'demanda_total', demanda_bairro.demanda_total,
                    'oferta_total', demanda_bairro.oferta_total,
                    'gap_quantitativo', demanda_bairro.gap_quantitativo,
                    'gap_percentual', demanda_bairro.gap_percentual,
                    'banco_areas_disponiveis', demanda_bairro.banco_areas_disponiveis,
                    'tendencia_mercado', demanda_bairro.tendencia_mercado
                )
            ELSE NULL
        END
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS E CONSULTAS OTIMIZADAS
-- =====================================================

-- View de Dashboard de Marketing
CREATE OR REPLACE VIEW public.dashboard_marketing AS
SELECT 
    i.id as incorporadora_id,
    i.nome_fantasia,
    rm.fonte_trafego_id,
    ft.nome as fonte_nome,
    ft.tipo as fonte_tipo,
    COUNT(DISTINCT rm.lead_id) as total_leads,
    COUNT(DISTINCT CASE WHEN rm.status_conversao = 'qualificado' THEN rm.lead_id END) as leads_qualificados,
    COUNT(DISTINCT CASE WHEN rm.status_conversao = 'pasta_100' THEN rm.lead_id END) as pastas_100,
    COUNT(DISTINCT CASE WHEN rm.status_conversao = 'convertido' THEN rm.lead_id END) as convertidos,
    COALESCE(SUM(rm.custo_aquisicao), 0) as custo_total,
    COALESCE(AVG(rm.custo_aquisicao), 0) as custo_medio,
    COALESCE(SUM(v.valor_venda), 0) as valor_vendas,
    CASE 
        WHEN COALESCE(SUM(rm.custo_aquisicao), 0) > 0 THEN 
            ROUND(((COALESCE(SUM(v.valor_venda), 0) - COALESCE(SUM(rm.custo_aquisicao), 0)) / COALESCE(SUM(rm.custo_aquisicao), 0)) * 100, 2)
        ELSE 0 
    END as roi_percentual
FROM public.incorporadoras_sb i
LEFT JOIN public.rastreabilidade_marketing rm ON i.id = rm.incorporadora_id
LEFT JOIN public.fontes_trafego ft ON rm.fonte_trafego_id = ft.id
LEFT JOIN public.vendas v ON rm.lead_id = v.lead_id AND v.status = 'confirmada'
GROUP BY i.id, i.nome_fantasia, rm.fonte_trafego_id, ft.nome, ft.tipo;

-- View de Radar de Mercado 5KM
CREATE OR REPLACE VIEW public.radar_mercado_5km AS
SELECT 
    e.id as empreendimento_id,
    e.nome as empreendimento_nome,
    e.bairro,
    e.cidade,
    e.estado,
    mp.preco_medio_m2,
    mp.preco_minimo_m2,
    mp.preco_maximo_m2,
    mp.total_anuncios,
    mp.variacao_percentual,
    mp.tendencia,
    mp.data_coleta,
    ed.demanda_total,
    ed.oferta_total,
    ed.gap_quantitativo,
    ed.gap_percentual,
    ed.banco_areas_disponiveis,
    ed.tendencia_mercado as tendencia_demanda,
    CASE 
        WHEN mp.preco_medio_m2 IS NOT NULL AND e.valor_medio_unidade IS NOT NULL THEN
            ROUND(((mp.preco_medio_m2 - (e.valor_medio_unidade / NULLIF(e.area_total_m2, 0))) / 
                   (e.valor_medio_unidade / NULLIF(e.area_total_m2, 0))) * 100, 2)
        ELSE NULL
    END as diferenca_percentual_mercado
FROM public.empreendimentos_sb e
LEFT JOIN public.monitoramento_precos mp ON e.bairro = mp.bairro AND e.cidade = mp.cidade
LEFT JOIN public.estudo_demanda_bairro ed ON e.bairro = ed.bairro AND e.cidade = ed.cidade
WHERE e.status IN ('lancamento', 'construcao')
ORDER BY mp.data_coleta DESC;

-- View de Consolidação CPF
CREATE OR REPLACE VIEW public.consolidacao_cpf_view AS
SELECT 
    cc.cpf,
    cc.total_cadastros,
    cc.status_consolidacao,
    cc.broker_eleito_id,
    cc.pasta_progresso_maxima,
    cc.eficiencia_conversao,
    cc.data_consolidacao,
    array_agg(DISTINCT b.nome) as brokers_envolvidos_nomes,
    array_agg(DISTINCT i.nome_fantasia) as incorporadoras_envolvidas_nomes,
    CASE 
        WHEN cc.total_cadastros >= 3 THEN 'Alta competição - Eficiência pendente'
        WHEN cc.total_cadastros = 2 THEN 'Média competição - Em análise'
        ELSE 'Consolidado'
    END as alerta_nivel
FROM public.consolidacao_cpf cc
LEFT JOIN public.brokers b ON cc.broker_eleito_id = b.id
LEFT JOIN public.incorporadoras_sb i ON i.id = ANY(cc.incorporadoras_envolvidas::uuid[])
GROUP BY cc.cpf, cc.total_cadastros, cc.status_consolidacao, cc.broker_eleito_id, 
         cc.pasta_progresso_maxima, cc.eficiencia_conversao, cc.data_consolidacao
ORDER BY cc.total_cadastros DESC, cc.pasta_progresso_maxima DESC;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rastreabilidade_fonte ON public.rastreabilidade_marketing(fonte_trafego_id);
CREATE INDEX IF NOT EXISTS idx_rastreabilidade_status ON public.rastreabilidade_marketing(status_conversao);
CREATE INDEX IF NOT EXISTS idx_rastreabilidade_data ON public.rastreabilidade_marketing(data_primeiro_contato);
CREATE INDEX IF NOT EXISTS idx_extrato_incorporadora ON public.extrato_verba(incorporadora_id);
CREATE INDEX IF NOT EXISTS idx_extrato_data ON public.extrato_verba(data_movimento);
CREATE INDEX IF NOT EXISTS idx_monitoramento_bairro ON public.monitoramento_precos(bairro, cidade);
CREATE INDEX IF NOT EXISTS idx_monitoramento_data ON public.monitoramento_precos(data_coleta);
CREATE INDEX IF NOT EXISTS idx_analise_geracional_bairro ON public.analise_geracional(bairro, cidade);
CREATE INDEX IF NOT EXISTS idx_indicadores_data ON public.indicadores_economicos(data_referencia);
CREATE INDEX IF NOT EXISTS idx_projecoes_empreendimento ON public.projecoes_financeiras(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_consolidacao_cpf ON public.consolidacao_cpf(cpf);
CREATE INDEX IF NOT EXISTS idx_consolidacao_status ON public.consolidacao_cpf(status_consolidacao);
CREATE INDEX IF NOT EXISTS idx_estudo_demanda_bairro ON public.estudo_demanda_bairro(bairro, cidade);
CREATE INDEX IF NOT EXISTS idx_logs_governanca_hash ON public.logs_governanca(hash_imutavel);
CREATE INDEX IF NOT EXISTS idx_logs_governanca_tipo ON public.logs_governanca(tipo_registro);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir fontes de tráfego
INSERT INTO public.fontes_trafego (nome, tipo, plataforma, custo_mensal) VALUES
('Google Ads', 'pago', 'google', 15000.00),
('Facebook Ads', 'pago', 'meta', 10000.00),
('Instagram Ads', 'pago', 'meta', 8000.00),
('Tráfego Orgânico', 'organico', 'google', 0.00),
('Indicação Direta', 'referencia', null, 0.00),
('LinkedIn Ads', 'pago', 'linkedin', 5000.00);

-- Inserir indicadores econômicos iniciais
INSERT INTO public.indicadores_economicos (indicador, valor, data_referencia, variacao_mensal, fonte) VALUES
('INCC', 0.45, '2026-05-04', 0.02, 'FGV'),
('Selic', 10.75, '2026-05-04', -0.25, 'Bacen'),
('IPCA', 0.38, '2026-05-04', 0.15, 'IBGE'),
('IGPM', 0.52, '2026-05-04', 0.08, 'FGV');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V14 - GOVERNANÇA FINANCEIRA CONCLUÍDA ✅' AS status,
       (SELECT COUNT(*) FROM public.fontes_trafego) as total_fontes_trafego,
       (SELECT COUNT(*) FROM public.rastreabilidade_marketing) as total_rastreabilidade,
       (SELECT COUNT(*) FROM public.extrato_verba) as total_extratos,
       (SELECT COUNT(*) FROM public.monitoramento_precos) as total_monitoramentos,
       (SELECT COUNT(*) FROM public.analise_geracional) as total_analises_geracionais,
       (SELECT COUNT(*) FROM public.indicadores_economicos) as total_indicadores,
       (SELECT COUNT(*) FROM public.consolidacao_cpf) as total_consolidacoes,
       (SELECT COUNT(*) FROM public.logs_governanca) as total_logs_governanca;
