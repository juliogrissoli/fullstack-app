-- 🏛️ SECURITY BROKER SB v27 - REINO SOCIAL (PROPÓSITO E FILANTROPIA)
-- Schema completo para motor de contribuição social e destinação de recursos para causas de caridade

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABELAS DO MÓDULO 'REINO SB' (1% FILANTROPIA)
-- =====================================================

-- Tesouro Reino SB - Fundo de Destinação
CREATE TABLE IF NOT EXISTS public.tesouro_reino_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    mes_referencia DATE NOT NULL,
    ano_referencia INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM mes_referencia)) STORED,
    
    -- Cálculo Automático (1% do faturamento líquido)
    faturamento_bruto DECIMAL(15,2) DEFAULT 0.00,
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    splits_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    faturamento_liquido DECIMAL(15,2) GENERATED ALWAYS AS (faturamento_bruto - custos_operacionais - splits_distribuidos) STORED,
    
    -- Contribuição Social (1%)
    percentual_contribuicao DECIMAL(5,2) DEFAULT 1.0,
    valor_contribuicao DECIMAL(15,2) GENERATED ALWAYS AS (faturamento_liquido * percentual_contribuicao / 100) STORED,
    
    -- Status
    status_contribuicao TEXT DEFAULT 'pendente', -- 'pendente', 'calculada', 'provisionada', 'destinada'
    data_calculo DATE,
    data_provisionamento DATE,
    data_destinacao DATE,
    
    -- Detalhes
    observacoes TEXT,
    responsavel_calculo_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Hash
    hash_tesouro TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_percentual_contribuicao CHECK (percentual_contribuicao = 1.0)
);

-- Projetos Sociais
CREATE TABLE IF NOT EXISTS public.projetos_sociais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    nome_projeto TEXT NOT NULL,
    descricao_projeto TEXT,
    tipo_projeto TEXT NOT NULL, -- 'moradias', 'templos', 'centros_acolhimento', 'pracas', 'escolas'
    status_projeto TEXT DEFAULT 'planejamento', -- 'planejamento', 'em_construcao', 'concluido', 'em_operacao'
    
    -- Localização
    endereco TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    coordenada_central POINT,
    
    -- Detalhes do Projeto
    area_total_m2 DECIMAL(10,2),
    capacidade_pessoas INTEGER,
    numero_unidades INTEGER,
    valor_estimado DECIMAL(15,2),
    valor_arrecadado DECIMAL(15,2) DEFAULT 0.00,
    valor_gasto DECIMAL(15,2) DEFAULT 0.00,
    
    -- Cronograma
    data_inicio_planejado DATE,
    data_fim_planejado DATE,
    data_inicio_real DATE,
    data_fim_real DATE,
    
    -- Responsáveis
    gestor_projeto_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    equipe_responsavel TEXT[] DEFAULT '{}',
    
    -- Documentação
    documentos_projeto TEXT[] DEFAULT '{}',
    licencas_ambientais TEXT[] DEFAULT '{}',
    alvaras_construcao TEXT[] DEFAULT '{}',
    
    -- Hash
    hash_projeto TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Destinações do Tesouro
CREATE TABLE IF NOT EXISTS public.destinacoes_tesouro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    tesouro_reino_id UUID REFERENCES public.tesouro_reino_sb(id) ON DELETE CASCADE,
    projeto_social_id UUID REFERENCES public.projetos_sociais(id) ON DELETE CASCADE,
    
    -- Valores
    valor_destinado DECIMAL(15,2) NOT NULL,
    percentual_destinado DECIMAL(5,2) DEFAULT 0.00,
    
    -- Detalhes
    motivo_destinacao TEXT,
    data_destinacao DATE DEFAULT CURRENT_DATE,
    status_destinacao TEXT DEFAULT 'provisionado', -- 'provisionado', 'transferido', 'aplicado', 'concluido'
    
    -- Documentação
    comprovante_transferencia TEXT,
    numero_documento TEXT,
    data_documento DATE,
    
    -- Hash
    hash_destinacao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE MARKETPLACE SOCIAL
-- =====================================================

-- Serviços Pro Bono
CREATE TABLE IF NOT EXISTS public.servicos_pro_bono (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Prestador de Serviço
    prestador_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    
    -- Detalhes do Serviço
    tipo_servico TEXT NOT NULL, -- 'engenharia', 'arquitetura', 'consultoria', 'juridico', 'marketing', 'tecnologia'
    nome_servico TEXT NOT NULL,
    descricao_servico TEXT,
    
    -- Condições
    tipo_oferta TEXT NOT NULL, -- 'horas_pro_bono', 'preco_custo', 'desconto_social'
    valor_normal DECIMAL(15,2),
    valor_social DECIMAL(15,2),
    horas_disponiveis INTEGER DEFAULT 0,
    horas_utilizadas INTEGER DEFAULT 0,
    
    -- Aplicação Social
    projetos_aplicaveis UUID[] DEFAULT '{}',
    restricoes_aplicacao TEXT[] DEFAULT '{}',
    
    -- Status
    status_servico TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'suspenso', 'concluido'
    data_inicio_disponibilidade DATE,
    data_fim_disponibilidade DATE,
    
    -- Hash
    hash_servico TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aplicações de Serviços Sociais
CREATE TABLE IF NOT EXISTS public.aplicacoes_servicos_sociais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    servico_pro_bono_id UUID REFERENCES public.servicos_pro_bono(id) ON DELETE CASCADE,
    projeto_social_id UUID REFERENCES public.projetos_sociais(id) ON DELETE CASCADE,
    solicitante_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Detalhes da Aplicação
    data_solicitacao DATE DEFAULT CURRENT_DATE,
    data_aprovacao DATE,
    data_inicio_execucao DATE,
    data_conclusao DATE,
    
    -- Valores
    horas_aplicadas INTEGER DEFAULT 0,
    valor_normal_estimado DECIMAL(15,2),
    valor_social_aplicado DECIMAL(15,2),
    economia_gerada DECIMAL(15,2) GENERATED ALWAYS AS (valor_normal_estimado - valor_social_aplicado) STORED,
    
    -- Status
    status_aplicacao TEXT DEFAULT 'solicitado', -- 'solicitado', 'aprovado', 'em_execucao', 'concluido', 'cancelado'
    motivo_cancelamento TEXT,
    
    -- Relatório
    relatorio_execucao TEXT,
    fotos_execucao TEXT[] DEFAULT '{}',
    documentos_comprobatorios TEXT[] DEFAULT '{}',
    
    -- Hash
    hash_aplicacao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE SELO DE PARCEIRO SOLIDÁRIO
-- =====================================================

-- Selos de Parceiro Solidário
CREATE TABLE IF NOT EXISTS public.selos_parceiro_solidario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Beneficiário
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Tipo de Selo
    tipo_selo TEXT NOT NULL, -- 'contribuinte', 'voluntario', 'pro_bono', 'sustentador', 'embaixador'
    nivel_selo TEXT NOT NULL, -- 'bronze', 'prata', 'ouro', 'diamante'
    
    -- Contribuições
    valor_contribuido DECIMAL(15,2) DEFAULT 0.00,
    horas_voluntarias INTEGER DEFAULT 0,
    projetos_participados UUID[] DEFAULT '{}',
    
    -- Métricas
    impacto_social TEXT, -- 'baixo', 'medio', 'alto', 'transformador'
    comunidades_beneficiadas TEXT[] DEFAULT '{}',
    pessoas_impactadas INTEGER DEFAULT 0,
    
    -- Status
    status_selo TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'suspenso', 'revogado'
    data_concessao DATE DEFAULT CURRENT_DATE,
    data_renovacao DATE,
    data_expiracao DATE,
    
    -- Documentação
    certificado_selo TEXT,
    codigo_verificacao TEXT UNIQUE,
    
    -- Hash
    hash_selo TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de Selos
CREATE TABLE IF NOT EXISTS public.historico_selos_solidarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    selo_parceiro_id UUID REFERENCES public.selos_parceiro_solidario(id) ON DELETE CASCADE,
    
    -- Alterações
    tipo_alteracao TEXT NOT NULL, -- 'concessao', 'renovacao', 'upgrade', 'downgrade', 'suspensao', 'revogacao'
    nivel_anterior TEXT,
    nivel_novo TEXT,
    data_alteracao DATE DEFAULT CURRENT_DATE,
    
    -- Motivo
    motivo TEXT,
    responsavel_alteracao_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Hash
    hash_historico TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE AUDITORIA E TRANSPARÊNCIA
-- =====================================================

-- Logs de Transparência Social
CREATE TABLE IF NOT EXISTS public.logs_transparencia_social (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    tipo_log TEXT NOT NULL, -- 'contribuicao', 'destinacao', 'projeto', 'aplicacao_servico', 'concessao_selo'
    entidade_id UUID NOT NULL, -- ID da entidade relacionada
    
    -- Dados do Log
    data_evento TIMESTAMPTZ DEFAULT NOW(),
    descricao_evento TEXT NOT NULL,
    valor_envolvido DECIMAL(15,2) DEFAULT 0.00,
    
    -- Documentação Visual
    fotos_evento TEXT[] DEFAULT '{}',
    videos_evento TEXT[] DEFAULT '{}',
    documentos_evento TEXT[] DEFAULT '{}',
    
    -- Localização
    local_evento TEXT,
    coordenada_evento POINT,
    
    -- Participantes
    participantes_ids UUID[] DEFAULT '{}',
    responsavel_evento_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Status
    status_verificacao TEXT DEFAULT 'pendente', -- 'pendente', 'verificado', 'rejeitado'
    data_verificacao DATE,
    verificador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    observacoes_verificacao TEXT,
    
    -- Visibilidade Pública
    visibilidade_publica BOOLEAN DEFAULT true,
    data_publicacao DATE,
    
    -- Hash
    hash_log TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relatórios de Impacto Social
CREATE TABLE IF NOT EXISTS public.relatorios_impacto_social (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    tipo_relatorio TEXT NOT NULL, -- 'mensal', 'trimestral', 'semestral', 'anual'
    
    -- Métricas Gerais
    total_contribuicoes DECIMAL(15,2) DEFAULT 0.00,
    total_destinacoes DECIMAL(15,2) DEFAULT 0.00,
    total_projetos_ativos INTEGER DEFAULT 0,
    total_projetos_concluidos INTEGER DEFAULT 0,
    
    -- Impacto Quantitativo
    pessoas_beneficiadas INTEGER DEFAULT 0,
    familias_ajudadas INTEGER DEFAULT 0,
    comunidades_impactadas INTEGER DEFAULT 0,
    horas_voluntarias INTEGER DEFAULT 0,
    servicos_pro_bono INTEGER DEFAULT 0,
    
    -- Impacto Qualitativo
    historias_impacto TEXT[] DEFAULT '{}',
    depoimentos_beneficiarios TEXT[] DEFAULT '{}',
    parceiros_envolvidos TEXT[] DEFAULT '{}',
    
    -- Projetos Detalhados
    projetos_detalhes JSONB DEFAULT '{}',
    
    -- Status
    status_relatorio TEXT DEFAULT 'em_elaboracao', -- 'em_elaboracao', 'concluido', 'publicado'
    data_conclusao DATE,
    data_publicacao DATE,
    
    -- Responsáveis
    elaborador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    aprovador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Documentação
    arquivo_relatorio TEXT,
    resumo_executivo TEXT,
    
    -- Hash
    hash_relatorio TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VIEWS OTIMIZADAS
-- =====================================================

-- Dashboard Social
CREATE OR REPLACE VIEW public.dashboard_social AS
SELECT 
    tr.*,
    COUNT(DISTINCT ps.id) as total_projetos_ativos,
    COUNT(DISTINCT CASE WHEN ps.status_projeto = 'concluido' THEN ps.id END) as total_projetos_concluidos,
    COALESCE(SUM(CASE WHEN ps.status_projeto = 'concluido' THEN ps.valor_estimado ELSE 0 END), 0) as valor_projetos_concluidos,
    COALESCE(SUM(ps.valor_arrecadado), 0) as valor_total_arrecadado,
    COALESCE(SUM(ps.valor_gasto), 0) as valor_total_gasto,
    COUNT(DISTINCT sp.id) as total_servicos_pro_bono,
    COUNT(DISTINCT CASE WHEN sp.status_servico = 'ativo' THEN sp.id END) as total_servicos_ativos,
    COALESCE(SUM(sp.horas_disponiveis), 0) as total_horas_disponiveis,
    COUNT(DISTINCT sps.id) as total_selos_concedidos,
    COUNT(DISTINCT CASE WHEN sps.status_selo = 'ativo' THEN sps.id END) as total_selos_ativos,
    COUNT(DISTINCT lts.id) as total_logs_transparencia,
    COUNT(DISTINCT CASE WHEN lts.visibilidade_publica = true THEN lts.id END) as total_logs_publicos
FROM public.tesouro_reino_sb tr
LEFT JOIN public.projetos_sociais ps ON tr.mes_referencia BETWEEN ps.data_inicio_planejado AND COALESCE(ps.data_fim_real, ps.data_fim_planejado)
LEFT JOIN public.servicos_pro_bono sp ON true
LEFT JOIN public.selos_parceiro_solidario sps ON true
LEFT JOIN public.logs_transparencia_social lts ON true
GROUP BY tr.id, tr.mes_referencia, tr.faturamento_bruto, tr.custos_operacionais, tr.splits_distribuidos, tr.faturamento_liquido, tr.percentual_contribuicao, tr.valor_contribuicao, tr.status_contribuicao, tr.data_calculo, tr.data_provisionamento, tr.data_destinacao, tr.observacoes, tr.responsavel_calculo_id, tr.hash_tesouro, tr.created_at, tr.updated_at
ORDER BY tr.mes_referencia DESC;

-- View de Projetos Sociais com Progresso
CREATE OR REPLACE VIEW public.projetos_sociais_progresso AS
SELECT 
    ps.*,
    CASE 
        WHEN ps.valor_estimado > 0 THEN (ps.valor_arrecadado / ps.valor_estimado * 100)
        ELSE 0 
    END as percentual_arrecadado,
    CASE 
        WHEN ps.valor_estimado > 0 THEN (ps.valor_gasto / ps.valor_estimado * 100)
        ELSE 0 
    END as percentual_gasto,
    CASE 
        WHEN ps.data_inicio_planejado IS NOT NULL AND ps.data_fim_planejado IS NOT NULL THEN
            CASE 
                WHEN CURRENT_DATE <= ps.data_inicio_planejado THEN 0
                WHEN CURRENT_DATE >= ps.data_fim_planejado THEN 100
                ELSE ((CURRENT_DATE - ps.data_inicio_planejado) / (ps.data_fim_planejado - ps.data_inicio_planejado) * 100)::INTEGER
            END
        ELSE 0
    END as percentual_cronograma,
    COUNT(DISTINCT dt.id) as total_destinacoes,
    COALESCE(SUM(dt.valor_destinado), 0) as valor_total_destinacoes,
    COUNT(DISTINCT lts.id) as total_logs_transparencia,
    COUNT(DISTINCT asp.id) as total_aplicacoes_servicos
FROM public.projetos_sociais ps
LEFT JOIN public.destinacoes_tesouro dt ON ps.id = dt.projeto_social_id
LEFT JOIN public.logs_transparencia_social lts ON ps.id = lts.entidade_id AND lts.tipo_log = 'projeto'
LEFT JOIN public.aplicacoes_servicos_sociais asp ON ps.id = asp.projeto_social_id
GROUP BY ps.id, ps.nome_projeto, ps.descricao_projeto, ps.tipo_projeto, ps.status_projeto, ps.endereco, ps.bairro, ps.cidade, ps.estado, ps.cep, ps.coordenada_central, ps.area_total_m2, ps.capacidade_pessoas, ps.numero_unidades, ps.valor_estimado, ps.valor_arrecadado, ps.valor_gasto, ps.data_inicio_planejado, ps.data_fim_planejado, ps.data_inicio_real, ps.data_fim_real, ps.gestor_projeto_id, ps.equipe_responsavel, ps.documentos_projeto, ps.licencas_ambientais, ps.alvaras_construcao, ps.hash_projeto, ps.created_at, ps.updated_at
ORDER BY ps.data_inicio_planejado DESC;

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para calcular contribuição social automaticamente
CREATE OR REPLACE FUNCTION public.calcular_contribuicao_social()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular faturamento líquido e contribuição de 1%
    IF NEW.faturamento_bruto IS NOT NULL AND NEW.custos_operacionais IS NOT NULL AND NEW.splits_distribuidos IS NOT NULL THEN
        NEW.valor_contribuicao := (NEW.faturamento_bruto - NEW.custos_operacionais - NEW.splits_distribuidos) * 0.01;
        NEW.data_calculo := CURRENT_DATE;
        NEW.status_contribuicao := 'calculada';
    END IF;
    
    -- Gerar hash
    NEW.hash_tesouro := encode(sha256(
        NEW.mes_referencia::TEXT || 
        NEW.faturamento_bruto::TEXT || 
        NEW.valor_contribuicao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_contribuicao_social
    BEFORE INSERT OR UPDATE ON public.tesouro_reino_sb
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_contribuicao_social();

-- Trigger para gerar hash de projeto social
CREATE OR REPLACE FUNCTION public.gerar_hash_projeto_social()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_projeto := encode(sha256(
        NEW.nome_projeto || 
        NEW.tipo_projeto || 
        NEW.valor_estimado::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_projeto_social
    BEFORE INSERT ON public.projetos_sociais
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_projeto_social();

-- Trigger para gerar log de transparência automático
CREATE OR REPLACE FUNCTION public.gerar_log_transparencia_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar log para destinação do tesouro
    IF TG_TABLE_NAME = 'destinacoes_tesouro' THEN
        INSERT INTO public.logs_transparencia_social (
            tipo_log,
            entidade_id,
            descricao_evento,
            valor_envolvido,
            data_evento,
            status_verificacao,
            visibilidade_publica,
            hash_log
        ) VALUES (
            'destinacao',
            NEW.id,
            'Destinação de recursos do Tesouro Reino SB para projeto social',
            NEW.valor_destinado,
            NEW.data_destinacao::TIMESTAMPTZ,
            'verificado',
            true,
            encode(sha256(
                'destinacao' || 
                NEW.id::TEXT || 
                NEW.valor_destinado::TEXT || 
                NEW.data_destinacao::TEXT || 
                NOW()::TEXT
            ), 'hex')
        );
    END IF;
    
    -- Gerar log para conclusão de projeto
    IF TG_TABLE_NAME = 'projetos_sociais' AND NEW.status_projeto = 'concluido' THEN
        INSERT INTO public.logs_transparencia_social (
            tipo_log,
            entidade_id,
            descricao_evento,
            valor_envolvido,
            data_evento,
            status_verificacao,
            visibilidade_publica,
            hash_log
        ) VALUES (
            'projeto',
            NEW.id,
            'Conclusão de projeto social - ' || NEW.nome_projeto,
            NEW.valor_estimado,
            NEW.data_fim_real::TIMESTAMPTZ,
            'verificado',
            true,
            encode(sha256(
                'projeto_concluido' || 
                NEW.id::TEXT || 
                NEW.valor_estimado::TEXT || 
                NEW.data_fim_real::TEXT || 
                NOW()::TEXT
            ), 'hex')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_log_transparencia_automatico
    AFTER INSERT OR UPDATE ON public.destinacoes_tesouro
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_log_transparencia_automatico();

CREATE TRIGGER trigger_gerar_log_projeto_concluido
    AFTER UPDATE ON public.projetos_sociais
    FOR EACH ROW
    WHEN (NEW.status_projeto = 'concluido' AND OLD.status_projeto != 'concluido')
    EXECUTE FUNCTION public.gerar_log_transparencia_automatico();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para processar contribuição social mensal
CREATE OR REPLACE FUNCTION public.processar_contribuicao_social_mensal(
    p_mes_referencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    tesouro_id UUID;
    faturamento_bruto DECIMAL;
    custos_operacionais DECIMAL;
    splits_distribuidos DECIMAL;
    valor_contribuicao DECIMAL;
BEGIN
    -- Calcular faturamento bruto do mês
    SELECT COALESCE(SUM(total_faturamento), 0) INTO faturamento_bruto
    FROM public.dashboard_master_monetizacao
    WHERE mes_referencia = p_mes_referencia;
    
    -- Calcular custos operacionais do mês
    SELECT COALESCE(SUM(custos_operacionais), 0) INTO custos_operacionais
    FROM public.dashboard_master_monetizacao
    WHERE mes_referencia = p_mes_referencia;
    
    -- Calcular splits distribuídos do mês
    SELECT COALESCE(SUM(valor_total), 0) INTO splits_distribuidos
    FROM public.split_4_vias
    WHERE DATE_TRUNC('month', created_at)::DATE = p_mes_referencia;
    
    -- Inserir ou atualizar tesouro
    INSERT INTO public.tesouro_reino_sb (
        mes_referencia,
        faturamento_bruto,
        custos_operacionais,
        splits_distribuidos,
        status_contribuicao,
        data_provisionamento
    ) VALUES (
        p_mes_referencia,
        faturamento_bruto,
        custos_operacionais,
        splits_distribuidos,
        'provisionado',
        CURRENT_DATE
    )
    ON CONFLICT (mes_referencia)
    DO UPDATE SET
        faturamento_bruto = EXCLUDED.faturamento_bruto,
        custos_operacionais = EXCLUDED.custos_operacionais,
        splits_distribuidos = EXCLUDED.splits_distribuidos,
        status_contribuicao = 'provisionado',
        data_provisionamento = CURRENT_DATE,
        updated_at = NOW()
    RETURNING id INTO tesouro_id;
    
    -- Buscar valor da contribuição
    SELECT valor_contribuicao INTO valor_contribuicao
    FROM public.tesouro_reino_sb
    WHERE id = tesouro_id;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'tesouro_id', tesouro_id,
        'mes_referencia', p_mes_referencia,
        'faturamento_bruto', faturamento_bruto,
        'custos_operacionais', custos_operacionais,
        'splits_distribuidos', splits_distribuidos,
        'faturamento_liquido', faturamento_bruto - custos_operacionais - splits_distribuidos,
        'valor_contribuicao', valor_contribuicao,
        'mensagem', 'Contribuição social processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para conceder selo de parceiro solidário
CREATE OR REPLACE FUNCTION public.conceder_selo_parceiro_solidario(
    p_broker_id UUID DEFAULT NULL,
    p_imobiliaria_id UUID DEFAULT NULL,
    p_tipo_selo TEXT,
    p_nivel_selo TEXT,
    p_motivo TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    selo_id UUID;
    codigo_verificacao TEXT;
BEGIN
    -- Validar parâmetros
    IF (p_broker_id IS NULL AND p_imobiliaria_id IS NULL) THEN
        RETURN jsonb_build_object('sucesso', false, 'erro', 'É necessário informar broker_id ou imobiliaria_id');
    END IF;
    
    -- Gerar código de verificação único
    codigo_verificacao := 'SB-' || UPPER(substring(md5(random()::text), 1, 8));
    
    -- Inserir selo
    INSERT INTO public.selos_parceiro_solidario (
        broker_id,
        imobiliaria_id,
        tipo_selo,
        nivel_selo,
        status_selo,
        data_concessao,
        data_expiracao,
        codigo_verificacao,
        motivo
    ) VALUES (
        p_broker_id,
        p_imobiliaria_id,
        p_tipo_selo,
        p_nivel_selo,
        'ativo',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 year',
        codigo_verificacao,
        p_motivo
    )
    RETURNING id INTO selo_id;
    
    -- Gerar log de transparência
    INSERT INTO public.logs_transparencia_social (
        tipo_log,
        entidade_id,
        descricao_evento,
        data_evento,
        status_verificacao,
        visibilidade_publica,
        hash_log
    ) VALUES (
        'concessao_selo',
        selo_id,
        'Concessão de Selo Parceiro Solidário - ' || p_tipo_selo || ' - ' || p_nivel_selo,
        0,
        NOW(),
        'verificado',
        true,
        encode(sha256(
            'concessao_selo' || 
            selo_id::TEXT || 
            p_tipo_selo || 
            p_nivel_selo || 
            NOW()::TEXT
        ), 'hex')
    );
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'selo_id', selo_id,
        'codigo_verificacao', codigo_verificacao,
        'tipo_selo', p_tipo_selo,
        'nivel_selo', p_nivel_selo,
        'data_concessao', CURRENT_DATE,
        'data_expiracao', CURRENT_DATE + INTERVAL '1 year',
        'mensagem', 'Selo concedido com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tesouro_reino_mes ON public.tesouro_reino_sb(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_tesouro_reino_status ON public.tesouro_reino_sb(status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_projetos_sociais_tipo ON public.projetos_sociais(tipo_projeto, status_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_sociais_localizacao ON public.projetos_sociais USING GIST(coordenada_central);
CREATE INDEX IF NOT EXISTS idx_destinacoes_tesouro_projeto ON public.destinacoes_tesouro(projeto_social_id);
CREATE INDEX IF NOT EXISTS idx_servicos_pro_bono_tipo ON public.servicos_pro_bono(tipo_servico, status_servico);
CREATE INDEX IF NOT EXISTS idx_servicos_pro_bono_prestador ON public.servicos_pro_bono(prestador_id);
CREATE INDEX IF NOT EXISTS idx_aplicacoes_servicos_projeto ON public.aplicacoes_servicos_sociais(projeto_social_id);
CREATE INDEX IF NOT EXISTS idx_selos_parceiro_tipo ON public.selos_parceiro_solidario(tipo_selo, nivel_selo);
CREATE INDEX IF NOT EXISTS idx_selos_parceiro_broker ON public.selos_parceiro_solidario(broker_id);
CREATE INDEX IF NOT EXISTS idx_selos_parceiro_imobiliaria ON public.selos_parceiro_solidario(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_logs_transparencia_tipo ON public.logs_transparencia_social(tipo_log, status_verificacao);
CREATE INDEX IF NOT EXISTS idx_logs_transparencia_visibilidade ON public.logs_transparencia_social(visibilidade_publica);
CREATE INDEX IF NOT EXISTS idx_relatorios_impacto_periodo ON public.relatorios_impacto_social(periodo_inicio, periodo_fim);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir projetos sociais iniciais
INSERT INTO public.projetos_sociais (
    nome_projeto,
    descricao_projeto,
    tipo_projeto,
    status_projeto,
    endereco,
    bairro,
    cidade,
    estado,
    area_total_m2,
    capacidade_pessoas,
    numero_unidades,
    valor_estimado,
    data_inicio_planejado,
    data_fim_planejado,
    coordenada_central
) VALUES
('Moradia Esperança', 'Construção de 50 moradias populares para famílias de baixa renda', 'moradias', 'em_construcao', 'Rua das Flores, 123', 'Jardim Primavera', 'São Paulo', 'SP', 5000.00, 200, 50, 2500000.00, '2026-01-01', '2026-12-31', POINT(-23.5505, -46.6333)),
('Templo da Comunidade', 'Reforma e ampliação de templo para atender 500 fiéis', 'templos', 'planejamento', 'Praça Central, 456', 'Centro', 'Rio de Janeiro', 'RJ', 2000.00, 500, 1, 800000.00, '2026-06-01', '2027-03-31', POINT(-22.9068, -43.1729)),
('Centro de Acolhimento', 'Centro de acolhimento para 100 crianças em situação de vulnerabilidade', 'centros_acolhimento', 'planejamento', 'Rua Solidariedade, 789', 'Boa Vista', 'Salvador', 'BA', 1500.00, 100, 0, 1500000.00, '2026-09-01', '2027-06-30', POINT(-12.9714, -38.5014)),
('Praça da Cidadania', 'Urbanização de praça com espaço para eventos comunitários', 'pracas', 'em_construcao', 'Avenida Principal, 321', 'Centro', 'Belo Horizonte', 'MG', 3000.00, 0, 0, 500000.00, '2026-03-01', '2026-08-31', POINT(-19.9167, -43.9345)),
('Escola do Futuro', 'Construção de escola para 200 alunos de comunidade carente', 'escolas', 'planejamento', 'Rua da Educação, 654', 'Vila Nova', 'Porto Alegre', 'RS', 4000.00, 200, 8, 3000000.00, '2026-07-01', '2027-12-31', POINT(-30.0346, -51.2177));

-- Inserir serviços pro bono iniciais
INSERT INTO public.servicos_pro_bono (
    prestador_id,
    tipo_servico,
    nome_servico,
    descricao_servico,
    tipo_oferta,
    valor_normal,
    valor_social,
    horas_disponiveis,
    status_servico,
    data_inicio_disponibilidade,
    data_fim_disponibilidade
) VALUES
((SELECT id FROM public.brokers WHERE nome LIKE '%Arquiteto%' LIMIT 1), 'arquitetura', 'Projetos Arquitetônicos Sociais', 'Projetos completos para moradias populares', 'horas_pro_bono', 50000.00, 0.00, 200, 'ativo', '2026-01-01', '2026-12-31'),
((SELECT id FROM public.brokers WHERE nome LIKE '%Engenheiro%' LIMIT 1), 'engenharia', 'Consultoria Estrutural', 'Análise estrutural para projetos sociais', 'preco_custo', 30000.00, 15000.00, 100, 'ativo', '2026-01-01', '2026-12-31'),
((SELECT id FROM public.brokers WHERE nome LIKE '%Advogado%' LIMIT 1), 'juridico', 'Assessoria Jurídica', 'Assessoria para regularização de projetos sociais', 'horas_pro_bono', 40000.00, 0.00, 150, 'ativo', '2026-01-01', '2026-12-31'),
((SELECT id FROM public.brokers WHERE nome LIKE '%Marketing%' LIMIT 1), 'marketing', 'Marketing Social', 'Campanhas de arrecadação para projetos sociais', 'desconto_social', 20000.00, 5000.00, 80, 'ativo', '2026-01-01', '2026-12-31'),
((SELECT id FROM public.brokers WHERE nome LIKE '%Tecnologia%' LIMIT 1), 'tecnologia', 'Desenvolvimento de Sistemas', 'Sistemas de gestão para projetos sociais', 'horas_pro_bono', 60000.00, 0.00, 120, 'ativo', '2026-01-01', '2026-12-31');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V27 - REINO SOCIAL CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.tesouro_reino_sb) as total_tesouros,
       (SELECT COUNT(*) FROM public.projetos_sociais) as total_projetos_sociais,
       (SELECT COUNT(*) FROM public.destinacoes_tesouro) as total_destinacoes,
       (SELECT COUNT(*) FROM public.servicos_pro_bono) as total_servicos_pro_bono,
       (SELECT COUNT(*) FROM public.aplicacoes_servicos_sociais) as total_aplicacoes_servicos,
       (SELECT COUNT(*) FROM public.selos_parceiro_solidario) as total_selos_concedidos,
       (SELECT COUNT(*) FROM public.logs_transparencia_social) as total_logs_transparencia,
       (SELECT COUNT(*) FROM public.relatorios_impacto_social) as total_relatorios_impacto;
