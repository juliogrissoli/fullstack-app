-- 🏛️ SECURITY BROKER SB v17 - RISK & LIQUIDITY LAYER
-- Schema completo para Rating de Risco, Mercado Secundário e Liquidez

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS DE RATING DE RISCO SB (SCORE AAA)
-- =====================================================

-- Rating de Risco de Projetos
CREATE TABLE IF NOT EXISTS public.rating_risco_projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    data_avaliacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Score de Risco (0-100)
    score_risco DECIMAL(5,2) NOT NULL,
    rating_final TEXT NOT NULL, -- 'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'
    
    -- Componentes do Rating
    score_documental DECIMAL(5,2) DEFAULT 0, -- Status Documental 100%
    score_prazo_obra DECIMAL(5,2) DEFAULT 0, -- Prazo de Obra
    score_volume_unidades DECIMAL(5,2) DEFAULT 0, -- Volume de Unidades em Dossiê
    score_estrutura DECIMAL(5,2) DEFAULT 0, -- Estrutura do Projeto
    score_mercado DECIMAL(5,2) DEFAULT 0, -- Condições de Mercado
    
    -- Métricas Específicas
    percentual_documentacao DECIMAL(5,2) DEFAULT 0, -- % de documentação completa
    prazo_obra_meses INTEGER DEFAULT 0,
    unidades_dossie INTEGER DEFAULT 0,
    unidades_total INTEGER DEFAULT 0,
    percentual_dossie DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN unidades_total > 0 THEN (unidades_dossie::DECIMAL / unidades_total * 100) ELSE 0 END) STORED,
    
    -- Fatores de Risco
    fator_risco_construcao TEXT, -- 'baixo', 'medio', 'alto'
    fator_risco_mercado TEXT, -- 'baixo', 'medio', 'alto'
    fator_risco_regulatorio TEXT, -- 'baixo', 'medio', 'alto'
    fator_risco_financeiro TEXT, -- 'baixo', 'medio', 'alto'
    
    -- Recomendações
    recomendacoes TEXT[] DEFAULT '{}',
    restricoes TEXT[] DEFAULT '{}',
    condicoes_aprovacao TEXT[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'em_analise', -- 'em_analise', 'aprovado', 'rejeitado', 'revisao'
    data_aprovacao TIMESTAMPTZ,
    avaliador_id UUID REFERENCES public.brokers(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de Rating
CREATE TABLE IF NOT EXISTS public.historico_rating (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rating_id UUID REFERENCES public.rating_risco_projetos(id) ON DELETE CASCADE,
    rating_anterior TEXT,
    rating_atual TEXT,
    score_anterior DECIMAL(5,2),
    score_atual DECIMAL(5,2),
    motivo_alteracao TEXT,
    data_alteracao TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE MERCADO SECUNDÁRIO DE COTAS (LIQUIDEZ)
-- =====================================================

-- Ofertas de Mercado Secundário
CREATE TABLE IF NOT EXISTS public.ofertas_mercado_secundario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendedor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Tipo de Ativo
    tipo_ativo TEXT NOT NULL, -- 'participacao_lucros', 'cotas_fundo', 'equity_projeto'
    ativo_origem_id UUID NOT NULL, -- ID do ativo original
    
    -- Dados da Oferta
    quantidade_ofertada DECIMAL(15,6) NOT NULL,
    preco_unitario DECIMAL(10,6) NOT NULL,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (quantidade_ofertada * preco_unitario) STORED,
    
    -- Condições
    tipo_oferta TEXT NOT NULL, -- 'venda', 'compra'
    preco_minimo DECIMAL(10,6), -- Para ofertas de venda
    preco_maximo DECIMAL(10,6), -- Para ofertas de compra
    validade_oferta DATE NOT NULL,
    
    -- Taxas
    taxa_transferencia DECIMAL(5,2) DEFAULT 1.50, -- 1.5% para SB
    valor_taxa DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * taxa_transferencia / 100) STORED,
    valor_liquido DECIMAL(15,2) GENERATED ALWAYS AS (valor_total - valor_taxa) STORED,
    
    -- Status
    status TEXT DEFAULT 'ativa', -- 'ativa', 'executada', 'cancelada', 'expirada'
    data_execucao TIMESTAMPTZ,
    comprador_id UUID REFERENCES public.brokers(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ordens de Execução
CREATE TABLE IF NOT EXISTS public.ordens_execucao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oferta_id UUID REFERENCES public.ofertas_mercado_secundario(id) ON DELETE CASCADE,
    comprador_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Dados da Execução
    quantidade_executada DECIMAL(15,6) NOT NULL,
    preco_executado DECIMAL(10,6) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    
    -- Taxas e Comissões
    taxa_sb DECIMAL(5,2) DEFAULT 1.50,
    valor_taxa_sb DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * taxa_sb / 100) STORED,
    valor_liquido_vendedor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total - valor_taxa_sb) STORED,
    
    -- Transferência de Ativos
    ativo_transferido_id UUID, -- ID do novo ativo do comprador
    ativo_origem_vendedor_id UUID, -- ID do ativo original do vendedor
    
    -- Status
    status TEXT DEFAULT 'executada', -- 'executada', 'pendente', 'cancelada'
    data_execucao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Documentação
    comprovante_transacao TEXT,
    hash_transacao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE LIQUIDEZ E TREASURY
-- =====================================================

-- Treasury de Liquidez
CREATE TABLE IF NOT EXISTS public.treasury_liquidez (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fundo_id UUID REFERENCES public.fundo_investimento_corretores(id) ON DELETE CASCADE,
    
    -- Saldo de Liquidez
    saldo_disponivel DECIMAL(15,2) DEFAULT 0,
    saldo_reservado DECIMAL(15,2) DEFAULT 0,
    saldo_total DECIMAL(15,2) GENERATED ALWAYS AS (saldo_disponivel + saldo_reservado) STORED,
    
    -- Fontes de Liquidez
    tesouraria_direta DECIMAL(15,2) DEFAULT 0,
    linha_credito DECIMAL(15,2) DEFAULT 0,
    resgate_antecipado DECIMAL(15,2) DEFAULT 0,
    
    -- Métricas de Liquidez
    ratio_liquidez DECIMAL(5,2) DEFAULT 0, -- Saldo disponível / Total ativos
    dias_liquidez INTEGER DEFAULT 0, -- Dias de liquidez disponível
    stress_test_liquidez DECIMAL(5,2) DEFAULT 0, -- Teste de estresse de liquidez
    
    -- Status
    status TEXT DEFAULT 'ativo', -- 'ativo', 'suspenso', 'critico'
    data_ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservas de Liquidez
CREATE TABLE IF NOT EXISTS public.reservas_liquidez (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treasury_id UUID REFERENCES public.treasury_liquidez(id) ON DELETE CASCADE,
    
    -- Dados da Reserva
    tipo_reserva TEXT NOT NULL, -- 'resgate', 'emergencia', 'regulatorio'
    valor_reservado DECIMAL(15,2) NOT NULL,
    data_reserva DATE NOT NULL,
    data_liberacao DATE,
    
    -- Vinculação
    vinculo_id UUID, -- ID da transação vinculada
    motivo_reserva TEXT,
    
    -- Status
    status TEXT DEFAULT 'ativa', -- 'ativa', 'liberada', 'cancelada'
    data_liberacao_efetiva TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE RATING
-- =====================================================

-- Trigger para calcular rating de risco
CREATE OR REPLACE FUNCTION public.calcular_rating_risco()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular scores individuais
    DECLARE
        score_doc DECIMAL(5,2);
        score_prazo DECIMAL(5,2);
        score_volume DECIMAL(5,2);
        score_estrutura DECIMAL(5,2);
        score_mercado DECIMAL(5,2);
        score_final DECIMAL(5,2);
        rating_final TEXT;
    BEGIN
        -- Score Documental (30%)
        IF NEW.percentual_documentacao >= 100 THEN
            score_doc := 30;
        ELSIF NEW.percentual_documentacao >= 90 THEN
            score_doc := 25;
        ELSIF NEW.percentual_documentacao >= 80 THEN
            score_doc := 20;
        ELSIF NEW.percentual_documentacao >= 70 THEN
            score_doc := 15;
        ELSE
            score_doc := 10;
        END IF;
        
        -- Score Prazo de Obra (25%)
        IF NEW.prazo_obra_meses <= 12 THEN
            score_prazo := 25;
        ELSIF NEW.prazo_obra_meses <= 18 THEN
            score_prazo := 20;
        ELSIF NEW.prazo_obra_meses <= 24 THEN
            score_prazo := 15;
        ELSIF NEW.prazo_obra_meses <= 36 THEN
            score_prazo := 10;
        ELSE
            score_prazo := 5;
        END IF;
        
        -- Score Volume de Unidades (25%)
        IF NEW.percentual_dossie >= 80 THEN
            score_volume := 25;
        ELSIF NEW.percentual_dossie >= 60 THEN
            score_volume := 20;
        ELSIF NEW.percentual_dossie >= 40 THEN
            score_volume := 15;
        ELSIF NEW.percentual_dossie >= 20 THEN
            score_volume := 10;
        ELSE
            score_volume := 5;
        END IF;
        
        -- Score Estrutura (10%)
        score_estrutura := NEW.score_estrutura;
        
        -- Score Mercado (10%)
        score_mercado := NEW.score_mercado;
        
        -- Score Final
        score_final := score_doc + score_prazo + score_volume + score_estrutura + score_mercado;
        
        -- Determinar Rating
        IF score_final >= 90 THEN
            rating_final := 'AAA';
        ELSIF score_final >= 85 THEN
            rating_final := 'AA';
        ELSIF score_final >= 80 THEN
            rating_final := 'A';
        ELSIF score_final >= 75 THEN
            rating_final := 'BBB';
        ELSIF score_final >= 70 THEN
            rating_final := 'BB';
        ELSIF score_final >= 60 THEN
            rating_final := 'B';
        ELSIF score_final >= 50 THEN
            rating_final := 'CCC';
        ELSIF score_final >= 40 THEN
            rating_final := 'CC';
        ELSIF score_final >= 30 THEN
            rating_final := 'C';
        ELSE
            rating_final := 'D';
        END IF;
        
        -- Atualizar campos
        NEW.score_risco := score_final;
        NEW.rating_final := rating_final;
        NEW.score_documental := score_doc;
        NEW.score_prazo_obra := score_prazo;
        NEW.score_volume_unidades := score_volume;
        
        -- Gerar recomendações
        NEW.recomendacoes := CASE
            WHEN score_final >= 80 THEN ARRAY['Projeto apto para investimento', 'Pode receber aportes do fundo']
            WHEN score_final >= 60 THEN ARRAY['Projeto com risco moderado', 'Recomendações de melhoria necessárias']
            ELSE ARRAY['Projeto de alto risco', 'Não recomendado para investimento do fundo']
        END;
        
        -- Gerar restrições
        NEW.restricoes := CASE
            WHEN score_final < 60 THEN ARRAY['Não pode receber aportes do Fundo de Corretores', 'Requer melhorias significativas']
            WHEN score_final < 80 THEN ARRAY['Aportes limitados', 'Monitoramento intensivo necessário']
            ELSE ARRAY['Sem restrições significativas']
        END;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_rating_risco
    BEFORE INSERT OR UPDATE ON public.rating_risco_projetos
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_rating_risco();

-- Trigger para executar ordens no mercado secundário
CREATE OR REPLACE FUNCTION public.executar_ordem_mercado_secundario()
RETURNS TRIGGER AS $$
BEGIN
    -- Se oferta foi executada, criar ordem de execução
    IF NEW.status = 'executada' AND OLD.status != 'executada' THEN
        -- Criar ordem de execução
        INSERT INTO public.ordens_execucao (
            oferta_id,
            comprador_id,
            vendedor_id,
            quantidade_executada,
            preco_executado,
            valor_total,
            ativo_transferido_id,
            ativo_origem_vendedor_id,
            hash_transacao,
            status
        ) VALUES (
            NEW.id,
            NEW.comprador_id,
            NEW.vendedor_id,
            NEW.quantidade_ofertada,
            NEW.preco_unitario,
            NEW.valor_total,
            generate_uuid(),
            NEW.ativo_origem_id,
            encode(sha256(NEW.id::TEXT || NEW.comprador_id::TEXT || NEW.vendedor_id::TEXT || NOW()::TEXT), 'hex'),
            'executada'
        );
        
        -- Atualizar treasury
        UPDATE public.treasury_liquidez
        SET saldo_disponivel = saldo_disponivel + NEW.valor_taxa
        WHERE fundo_id = (
            SELECT id FROM public.fundo_investimento_corretores 
            WHERE status = 'ativo' 
            LIMIT 1
        );
        
        -- Criar notificação
        INSERT INTO public.notificacoes (
            broker_id,
            tipo,
            titulo,
            mensagem,
            status
        ) VALUES (
            NEW.vendedor_id,
            'mercado_secundario',
            'Ordem Executada com Sucesso',
            format('Sua oferta foi executada: %s unidades a R$ %s', 
                   NEW.quantidade_ofertada, NEW.preco_unitario),
            'nao_lida'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_executar_ordem_mercado_secundario
    AFTER UPDATE ON public.ofertas_mercado_secundario
    FOR EACH ROW
    EXECUTE FUNCTION public.executar_ordem_mercado_secundario();

-- =====================================================
-- FUNÇÕES DE ANÁLISE E RATING
-- =====================================================

-- Função para calcular rating completo
CREATE OR REPLACE FUNCTION public.calcular_rating_completo(
    p_projeto_id UUID
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    dados_projeto RECORD;
    rating_atual RECORD;
    score_final DECIMAL(5,2);
BEGIN
    -- Buscar dados do projeto
    SELECT * INTO dados_projeto
    FROM public.empreendimentos_sb
    WHERE id = p_projeto_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Projeto não encontrado');
    END IF;
    
    -- Buscar rating atual
    SELECT * INTO rating_atual
    FROM public.rating_risco_projetos
    WHERE projeto_id = p_projeto_id
    ORDER BY data_avaliacao DESC
    LIMIT 1;
    
    -- Calcular métricas adicionais
    DECLARE
        percentual_doc DECIMAL(5,2);
        unidades_dossie INTEGER;
        unidades_total INTEGER;
        prazo_obra INTEGER;
    BEGIN
        -- Simulação de dados (em produção buscar de tabelas reais)
        percentual_doc := CASE 
            WHEN rating_atual IS NOT NULL THEN rating_atual.percentual_documentacao
            ELSE 85.0
        END;
        
        unidades_dossie := CASE 
            WHEN rating_atual IS NOT NULL THEN rating_atual.unidades_dossie
            ELSE 45
        END;
        
        unidades_total := dados_projeto.total_unidades || 50;
        prazo_obra := dados_projeto.prazo_obra_meses || 18;
        
        -- Construir resultado
        resultado := jsonb_build_object(
            'projeto', jsonb_build_object(
                'id', dados_projeto.id,
                'nome', dados_projeto.nome,
                'cidade', dados_projeto.cidade,
                'estado', dados_projeto.estado
            ),
            'rating_atual', CASE 
                WHEN rating_atual IS NOT NULL THEN jsonb_build_object(
                    'score_risco', rating_atual.score_risco,
                    'rating_final', rating_atual.rating_final,
                    'data_avaliacao', rating_atual.data_avaliacao,
                    'status', rating_atual.status
                )
                ELSE NULL
            END,
            'analise_detalhada', jsonb_build_object(
                'documental', jsonb_build_object(
                    'percentual', percentual_doc,
                    'score', CASE 
                        WHEN percentual_doc >= 100 THEN 30
                        WHEN percentual_doc >= 90 THEN 25
                        WHEN percentual_doc >= 80 THEN 20
                        WHEN percentual_doc >= 70 THEN 15
                        ELSE 10
                    END,
                    'status', CASE 
                        WHEN percentual_doc >= 90 THEN 'excelente'
                        WHEN percentual_doc >= 80 THEN 'bom'
                        WHEN percentual_doc >= 70 THEN 'regular'
                        ELSE 'insuficiente'
                    END
                ),
                'prazo_obra', jsonb_build_object(
                    'meses', prazo_obra,
                    'score', CASE 
                        WHEN prazo_obra <= 12 THEN 25
                        WHEN prazo_obra <= 18 THEN 20
                        WHEN prazo_obra <= 24 THEN 15
                        WHEN prazo_obra <= 36 THEN 10
                        ELSE 5
                    END,
                    'status', CASE 
                        WHEN prazo_obra <= 12 THEN 'otimo'
                        WHEN prazo_obra <= 18 THEN 'bom'
                        WHEN prazo_obra <= 24 THEN 'regular'
                        ELSE 'longo'
                    END
                ),
                'volume_unidades', jsonb_build_object(
                    'unidades_dossie', unidades_dossie,
                    'unidades_total', unidades_total,
                    'percentual', (unidades_dossie::DECIMAL / unidades_total * 100),
                    'score', CASE 
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 80 THEN 25
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 60 THEN 20
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 40 THEN 15
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 20 THEN 10
                        ELSE 5
                    END,
                    'status', CASE 
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 80 THEN 'excelente'
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 60 THEN 'bom'
                        WHEN (unidades_dossie::DECIMAL / unidades_total * 100) >= 40 THEN 'regular'
                        ELSE 'insuficiente'
                    END
                )
            ),
            'recomendacoes', CASE 
                WHEN rating_atual IS NOT NULL THEN rating_atual.recomendacoes
                ELSE ARRAY['Realizar análise completa para rating definitivo']
            END,
            'restricoes', CASE 
                WHEN rating_atual IS NOT NULL THEN rating_atual.restricoes
                ELSE ARRAY['Aguardando rating definitivo']
            END
        );
    END;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para analisar liquidez do fundo
CREATE OR REPLACE FUNCTION public.analisar_liquidez_fundo(
    p_fundo_id UUID
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    dados_fundo RECORD;
    dados_treasury RECORD;
    total_ativos DECIMAL(15,2);
    ratio_liquidez DECIMAL(5,2);
BEGIN
    -- Buscar dados do fundo
    SELECT * INTO dados_fundo
    FROM public.fundo_investimento_corretores
    WHERE id = p_fundo_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('erro', 'Fundo não encontrado');
    END IF;
    
    -- Buscar dados do treasury
    SELECT * INTO dados_treasury
    FROM public.treasury_liquidez
    WHERE fundo_id = p_fundo_id;
    
    -- Calcular métricas
    total_ativos := dados_fundo.patrimonio_total;
    ratio_liquidez := CASE 
        WHEN total_ativos > 0 THEN (COALESCE(dados_treasury.saldo_disponivel, 0) / total_ativos * 100)
        ELSE 0
    END;
    
    -- Construir resultado
    resultado := jsonb_build_object(
        'fundo', jsonb_build_object(
            'id', dados_fundo.id,
            'nome', dados_fundo.nome_fundo,
            'patrimonio_total', dados_fundo.patrimonio_total,
            'cotacao_atual', dados_fundo.cotacao_atual
        ),
        'liquidez', jsonb_build_object(
            'saldo_disponivel', COALESCE(dados_treasury.saldo_disponivel, 0),
            'saldo_reservado', COALESCE(dados_treasury.saldo_reservado, 0),
            'saldo_total', COALESCE(dados_treasury.saldo_total, 0),
            'ratio_liquidez', ratio_liquidez,
            'dias_liquidez', COALESCE(dados_treasury.dias_liquidez, 0),
            'status_liquidez', CASE 
                WHEN ratio_liquidez >= 10 THEN 'excelente'
                WHEN ratio_liquidez >= 5 THEN 'bom'
                WHEN ratio_liquidez >= 2 THEN 'regular'
                ELSE 'critico'
            END
        ),
        'fontes_liquidez', jsonb_build_object(
            'tesouraria_direta', COALESCE(dados_treasury.tesouraria_direta, 0),
            'linha_credito', COALESCE(dados_treasury.linha_credito, 0),
            'resgate_antecipado', COALESCE(dados_treasury.resgate_antecipado, 0)
        ),
        'stress_test', jsonb_build_object(
            'ratio_stress', COALESCE(dados_treasury.stress_test_liquidez, 0),
            'cenario_critico', CASE 
                WHEN ratio_liquidez >= 5 THEN 'Resistente'
                WHEN ratio_liquidez >= 2 THEN 'Moderado'
                ELSE 'Vulnerável'
            END
        ),
        'recomendacoes', CASE 
            WHEN ratio_liquidez < 2 THEN ARRAY['Aumentar reservas de liquidez', 'Reduzir exposição a resgates']
            WHEN ratio_liquidez < 5 THEN ARRAY['Monitorar liquidez diariamente', 'Manter reservas adequadas']
            ELSE ARRAY['Liquidez adequada', 'Manter política atual']
        END
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS E CONSULTAS OTIMIZADAS
-- =====================================================

-- View de Dashboard de Rating
CREATE OR REPLACE VIEW public.dashboard_rating_projetos AS
SELECT 
    r.*,
    e.nome as projeto_nome,
    e.cidade,
    e.estado,
    e.total_unidades,
    e.prazo_obra_meses,
    CASE 
        WHEN r.rating_final IN ('AAA', 'AA', 'A') THEN 'aprovado_fundo'
        WHEN r.rating_final IN ('BBB', 'BB', 'B') THEN 'analise_adicional'
        ELSE 'reprovado_fundo'
    END as elegibilidade_fundo,
    CASE 
        WHEN r.score_risco >= 80 THEN 'verde'
        WHEN r.score_risco >= 60 THEN 'amarelo'
        ELSE 'vermelho'
    END as status_cor
FROM public.rating_risco_projetos r
JOIN public.empreendimentos_sb e ON r.projeto_id = e.id
WHERE r.status = 'aprovado'
ORDER BY r.score_risco DESC;

-- View de Mercado Secundário
CREATE OR REPLACE VIEW public.mercado_secundario_ativo AS
SELECT 
    o.*,
    v.nome as vendedor_nome,
    c.nome as comprador_nome,
    CASE 
        WHEN o.status = 'executada' THEN jsonb_build_object(
            'data_execucao', o.data_execucao,
            'comprador', c.nome
        )
        ELSE NULL
    END as detalhes_execucao,
    CASE 
        WHEN o.validade_oferta < CURRENT_DATE THEN 'expirada'
        ELSE o.status
    END as status_atual
FROM public.ofertas_mercado_secundario o
LEFT JOIN public.brokers v ON o.vendedor_id = v.id
LEFT JOIN public.brokers c ON o.comprador_id = c.id
WHERE o.status IN ('ativa', 'executada')
ORDER BY o.created_at DESC;

-- View de Liquidez do Fundo
CREATE OR REPLACE VIEW public.liquidez_fundo_resumo AS
SELECT 
    f.*,
    t.saldo_disponivel,
    t.saldo_reservado,
    t.saldo_total,
    t.ratio_liquidez,
    t.dias_liquidez,
    t.status as status_liquidez,
    CASE 
        WHEN t.ratio_liquidez >= 10 THEN 'excelente'
        WHEN t.ratio_liquidez >= 5 THEN 'bom'
        WHEN t.ratio_liquidez >= 2 THEN 'regular'
        ELSE 'critico'
    END as classificacao_liquidez
FROM public.fundo_investimento_corretores f
LEFT JOIN public.treasury_liquidez t ON f.id = t.fundo_id
WHERE f.status = 'ativo';

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rating_projeto ON public.rating_risco_projetos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_rating_score ON public.rating_risco_projetos(score_risco);
CREATE INDEX IF NOT EXISTS idx_rating_final ON public.rating_risco_projetos(rating_final);
CREATE INDEX IF NOT EXISTS idx_rating_status ON public.rating_risco_projetos(status);
CREATE INDEX IF NOT EXISTS idx_ofertas_vendedor ON public.ofertas_mercado_secundario(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_status ON public.ofertas_mercado_secundario(status);
CREATE INDEX IF NOT EXISTS idx_ofertas_tipo ON public.ofertas_mercado_secundario(tipo_ativo);
CREATE INDEX IF NOT EXISTS idx_ordens_comprador ON public.ordens_execucao(comprador_id);
CREATE INDEX IF NOT EXISTS idx_ordens_vendedor ON public.ordens_execucao(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_treasury_fundo ON public.treasury_liquidez(fundo_id);
CREATE INDEX IF NOT EXISTS idx_reservas_treasury ON public.reservas_liquidez(treasury_id);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Criar treasury padrão
INSERT INTO public.treasury_liquidez (
    fundo_id,
    saldo_disponivel,
    saldo_reservado,
    tesouraria_direta,
    linha_credito,
    ratio_liquidez,
    dias_liquidez,
    stress_test_liquidez,
    status
) VALUES (
    (SELECT id FROM public.fundo_investimento_corretores WHERE status = 'ativo' LIMIT 1),
    500000.00, -- R$ 500k disponível
    100000.00, -- R$ 100k reservado
    300000.00, -- R$ 300k tesouraria direta
    200000.00, -- R$ 200k linha de crédito
    15.0, -- 15% de ratio de liquidez
    30, -- 30 dias de liquidez
    8.5, -- 8.5% stress test
    'ativo'
);

-- Inserir ratings de exemplo
INSERT INTO public.rating_risco_projetos (
    projeto_id,
    percentual_documentacao,
    prazo_obra_meses,
    unidades_dossie,
    unidades_total,
    score_estrutura,
    score_mercado,
    fator_risco_construcao,
    fator_risco_mercado,
    fator_risco_regulatorio,
    fator_risco_financeiro,
    status,
    avaliador_id
) VALUES
-- Projeto One Prime - Rating AAA
('00000000-0000-0000-0000-000000000001', 100, 12, 48, 50, 8, 9, 'baixo', 'baixo', 'baixo', 'baixo', 'aprovado', '00000000-0000-0000-0000-000000000001'),
-- Projeto Taiwan - Rating AA
('00000000-0000-0000-0000-000000000002', 95, 18, 35, 40, 7, 8, 'medio', 'baixo', 'baixo', 'medio', 'aprovado', '00000000-0000-0000-0000-000000000001');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V17 - RISK & LIQUIDITY LAYER CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.rating_risco_projetos) as total_ratings,
       (SELECT COUNT(*) FROM public.ofertas_mercado_secundario) as total_ofertas,
       (SELECT COUNT(*) FROM public.ordens_execucao) as total_ordens,
       (SELECT COUNT(*) FROM public.treasury_liquidez) as total_treasury,
       (SELECT COUNT(*) FROM public.reservas_liquidez) as total_reservas;
