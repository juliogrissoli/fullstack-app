-- 🏛️ SECURITY BROKER SB v15 - FINTECH & GOVERNANÇA TOTAL
-- Schema completo para Split de Mesa, Gestão de Recebíveis e Compliance Fiscal

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS FINTECH (SPLIT DE MESA)
-- =====================================================

-- Gateways de Pagamento Integrados
CREATE TABLE IF NOT EXISTS public.gateway_pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL, -- Stripe, Mercado Pago, PicPay, etc.
    tipo TEXT NOT NULL, -- cartao, pix, boleto, transferencia
    api_key TEXT, -- Chave criptografada
    api_secret TEXT, -- Secret criptografado
    webhook_url TEXT,
    status TEXT DEFAULT 'ativo', -- ativo, inativo, teste
    split_habilitado BOOLEAN DEFAULT TRUE,
    taxa_transacao DECIMAL(5,2) DEFAULT 0, -- Taxa do gateway
    taxa_split DECIMAL(5,2) DEFAULT 0, -- Taxa adicional para split
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações de Pagamento
CREATE TABLE IF NOT EXISTS public.transacoes_pagamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    gateway_id UUID REFERENCES public.gateway_pagamentos(id),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    
    -- Dados da transação
    tipo_transacao TEXT NOT NULL, -- entrada_reserva, parcela, comissao, multa
    valor_total DECIMAL(12,2) NOT NULL,
    valor_original DECIMAL(12,2) NOT NULL,
    moeda TEXT DEFAULT 'BRL',
    
    -- Status e processamento
    status TEXT DEFAULT 'pendente', -- pendente, processando, aprovado, rejeitado, cancelado
    gateway_transacao_id TEXT, -- ID da transação no gateway
    gateway_status TEXT, -- Status retornado pelo gateway
    data_pagamento TIMESTAMPTZ,
    data_vencimento TIMESTAMPTZ,
    data_aprovacao TIMESTAMPTZ,
    
    -- Split de mesa
    split_processado BOOLEAN DEFAULT FALSE,
    split_data_processamento TIMESTAMPTZ,
    
    -- Retenção técnica
    retencao_tecnica BOOLEAN DEFAULT TRUE, -- Por padrão, fica retido
    condicao_liberacao TEXT, -- 'upload_nf' ou 'biometria_cliente'
    documento_liberacao_id UUID, -- ID da NF ou biometria
    data_liberacao TIMESTAMPTZ,
    status_liberacao TEXT DEFAULT 'pendente', -- pendente, liberado, bloqueado
    
    -- Dados de pagamento
    forma_pagamento TEXT, -- cartao_credito, pix, boleto, transferencia
    parcelas INTEGER DEFAULT 1,
    numero_parcela INTEGER DEFAULT 1,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    dados_gateway JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Split de Mesa (Distribuição Financeira)
CREATE TABLE IF NOT EXISTS public.split_mesa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transacao_id UUID REFERENCES public.transacoes_pagamento(id) ON DELETE CASCADE,
    
    -- Distribuição: [2% SB | Comissão Corretor | Saldo Incorporadora]
    percentual_sb DECIMAL(5,2) DEFAULT 2.00,
    valor_sb DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_sb / 100) STORED,
    
    percentual_corretor DECIMAL(5,2),
    valor_corretor DECIMAL(12,2),
    
    percentual_incorporadora DECIMAL(5,2),
    valor_incorporadora DECIMAL(12,2),
    
    -- Taxas do gateway
    taxa_gateway DECIMAL(5,2),
    valor_taxa_gateway DECIMAL(12,2),
    
    -- Status de cada parte
    status_sb TEXT DEFAULT 'pendente', -- pendente, processado, pago
    status_corretor TEXT DEFAULT 'pendente',
    status_incorporadora TEXT DEFAULT 'pendente',
    
    -- Datas de pagamento
    data_pagamento_sb TIMESTAMPTZ,
    data_pagamento_corretor TIMESTAMPTZ,
    data_pagamento_incorporadora TIMESTAMPTZ,
    
    -- IDs de pagamento no gateway
    gateway_pagamento_sb_id TEXT,
    gateway_pagamento_corretor_id TEXT,
    gateway_pagamento_incorporadora_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE AUDITORIA E COMPLIANCE FISCAL
-- =====================================================

-- Gestão de Notas Fiscais
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    transacao_id UUID REFERENCES public.transacoes_pagamento(id) ON DELETE CASCADE,
    
    -- Dados da NF
    numero_nf TEXT NOT NULL,
    serie_nf TEXT,
    data_emissao DATE NOT NULL,
    data_recebimento DATE,
    valor_nf DECIMAL(12,2) NOT NULL,
    valor_imposto DECIMAL(12,2) DEFAULT 0,
    
    -- Dados do emitente
    emitente_cnpj TEXT NOT NULL,
    emitente_razao_social TEXT NOT NULL,
    emitente_ie TEXT,
    
    -- Dados do destinatário
    destinatario_cnpj TEXT,
    destinatario_razao_social TEXT,
    destinatario_ie TEXT,
    
    -- Status e validação
    status TEXT DEFAULT 'pendente', -- pendente, validada, rejeitada, aprovada
    validacao_automatica BOOLEAN DEFAULT FALSE,
    hash_nf TEXT UNIQUE, -- Hash SHA-256 para integridade
    url_documento TEXT, -- URL do PDF da NF
    
    -- Vinculação
    tipo_servico TEXT DEFAULT 'intermediacao_imobiliaria',
    descricao_servico TEXT,
    
    -- Auditoria
    ip_upload TEXT,
    usuario_upload_id UUID REFERENCES auth.users(id),
    data_upload TIMESTAMPTZ DEFAULT NOW(),
    data_validacao TIMESTAMPTZ,
    validador_id UUID REFERENCES auth.users(id),
    observacoes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relatório de Bitributação
CREATE TABLE IF NOT EXISTS public.relatorios_bitributacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    period_inicio DATE NOT NULL,
    period_fim DATE NOT NULL,
    
    -- Economia tributária
    valor_total_intermediacoes DECIMAL(15,2) DEFAULT 0,
    valor_comissoes_tradicionais DECIMAL(15,2) DEFAULT 0,
    valor_comissoes_split DECIMAL(15,2) DEFAULT 0,
    economia_tributaria DECIMAL(15,2) DEFAULT 0,
    
    -- Cálculos fiscais
    aliquota_pis_cofins_tradicional DECIMAL(5,2) DEFAULT 3.65,
    aliquota_pis_cofins_split DECIMAL(5,2) DEFAULT 0,
    economia_pis_cofins DECIMAL(15,2) DEFAULT 0,
    
    aliquota_iss_tradicional DECIMAL(5,2) DEFAULT 5.00,
    aliquota_iss_split DECIMAL(5,2) DEFAULT 0,
    economia_iss DECIMAL(15,2) DEFAULT 0,
    
    -- Totais
    total_economia_tributaria DECIMAL(15,2) DEFAULT 0,
    percentual_economia DECIMAL(5,2) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'gerado', -- gerado, validado, aprovado
    data_geracao TIMESTAMPTZ DEFAULT NOW(),
    data_aprovacao TIMESTAMPTZ,
    aprovador_id UUID REFERENCES auth.users(id),
    
    -- Dados do relatório
    arquivo_url TEXT,
    hash_relatorio TEXT UNIQUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mora Automática (Penalidades)
CREATE TABLE IF NOT EXISTS public.mora_automatica (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transacao_id UUID REFERENCES public.transacoes_pagamento(id) ON DELETE CASCADE,
    split_mesa_id UUID REFERENCES public.split_mesa(id) ON DELETE CASCADE,
    
    -- Cálculo da mora
    valor_original DECIMAL(12,2) NOT NULL,
    dias_atraso INTEGER NOT NULL,
    multa_percentual DECIMAL(5,2) DEFAULT 10.00,
    multa_valor DECIMAL(12,2) GENERATED ALWAYS AS (valor_original * multa_percentual / 100) STORED,
    juros_percentual DECIMAL(5,2) DEFAULT 1.00,
    juros_valor DECIMAL(12,2) GENERATED ALWAYS AS (valor_original * juros_percentual / 100 * dias_atraso / 30) STORED,
    valor_total DECIMAL(12,2) GENERATED ALWAYS AS (valor_original + multa_valor + juros_valor) STORED,
    
    -- Status
    status TEXT DEFAULT 'pendente', -- pendente, aplicada, paga, cancelada
    data_calculo TIMESTAMPTZ DEFAULT NOW(),
    data_aplicacao TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    
    -- Vinculação
    tipo_origem TEXT NOT NULL, -- 'coordenacao_sb', 'comissao_corretor', 'parcela_cliente'
    origem_id UUID,
    
    -- Notificação
    notificacao_enviada BOOLEAN DEFAULT FALSE,
    data_notificacao TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES FINTECH
-- =====================================================

-- Trigger para gerar split automático ao aprovar transação
CREATE OR REPLACE FUNCTION public.gerar_split_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a transação foi aprovada e ainda não tem split
    IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
        -- Calcular valores do split
        DECLARE
            valor_total DECIMAL(12,2);
            percentual_corretor DECIMAL(5,2);
            percentual_incorporadora DECIMAL(5,2);
            valor_corretor DECIMAL(12,2);
            valor_incorporadora DECIMAL(12,2);
        BEGIN
            valor_total := NEW.valor_total;
            
            -- Buscar percentual de comissão do corretor
            SELECT comissao_percentual INTO percentual_corretor
            FROM public.brokers
            WHERE id = NEW.broker_id;
            
            -- Calcular percentuais
            percentual_incorporadora := 100.0 - 2.0 - COALESCE(percentual_corretor, 0.0);
            valor_corretor := valor_total * (COALESCE(percentual_corretor, 0.0) / 100.0);
            valor_incorporadora := valor_total * (percentual_incorporadora / 100.0);
            
            -- Criar split de mesa
            INSERT INTO public.split_mesa (
                transacao_id,
                percentual_corretor,
                valor_corretor,
                percentual_incorporadora,
                valor_incorporadora,
                status_sb,
                status_corretor,
                status_incorporadora
            ) VALUES (
                NEW.id,
                percentual_corretor,
                valor_corretor,
                percentual_incorporadora,
                valor_incorporadora,
                CASE WHEN NEW.retencao_tecnica = FALSE THEN 'processado' ELSE 'pendente' END,
                CASE WHEN NEW.retencao_tecnica = FALSE THEN 'processado' ELSE 'pendente' END,
                'processado' -- Incorporadora sempre recebe
            );
            
            -- Marcar split como processado
            NEW.split_processado := TRUE;
            NEW.split_data_processamento := NOW();
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_split_automatico
    AFTER UPDATE ON public.transacoes_pagamento
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_split_automatico();

-- Trigger para calcular mora automática
CREATE OR REPLACE FUNCTION public.calcular_mora_automatica()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se está em atraso e ainda não tem mora aplicada
    IF NEW.status = 'atrasado' AND OLD.status != 'atrasado' THEN
        -- Calcular dias de atraso
        DECLARE
            dias_atraso INTEGER;
            valor_original DECIMAL(12,2);
        BEGIN
            dias_atraso := EXTRACT(DAYS FROM (CURRENT_DATE - NEW.data_vencimento));
            valor_original := NEW.valor_total;
            
            -- Criar registro de mora automática
            INSERT INTO public.mora_automatica (
                transacao_id,
                valor_original,
                dias_atraso,
                tipo_origem,
                origem_id,
                status
            ) VALUES (
                NEW.id,
                valor_original,
                dias_atraso,
                'coordenacao_sb',
                NEW.id,
                'aplicada'
            );
            
            -- Atualizar valor total com mora
            NEW.valor_total := valor_original + (valor_original * 0.10) + (valor_original * 0.01 * dias_atraso / 30);
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_mora_automatica
    BEFORE UPDATE ON public.transacoes_pagamento
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_mora_automatica();

-- Trigger para gerar hash da NF
CREATE OR REPLACE FUNCTION public.gerar_hash_nf()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_nf = encode(
        sha256(
            NEW.numero_nf || 
            NEW.emitente_cnpj || 
            NEW.valor_nf::text || 
            NEW.data_emissao::text
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_hash_nf
    BEFORE INSERT ON public.notas_fiscais
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_nf();

-- Trigger para liberar retenção técnica
CREATE OR REPLACE FUNCTION public.liberar_retencao_tecnica()
RETURNS TRIGGER AS $$
BEGIN
    -- Se NF foi validada, liberar retenção técnica
    IF NEW.status = 'aprovada' AND OLD.status != 'aprovada' THEN
        -- Buscar transações vinculadas
        UPDATE public.transacoes_pagamento
        SET 
            retencao_tecnica = FALSE,
            condicao_liberacao = 'upload_nf',
            documento_liberacao_id = NEW.id,
            data_liberacao = NOW(),
            status_liberacao = 'liberado'
        WHERE transacao_id IN (
            SELECT id FROM public.transacoes_pagamento 
            WHERE broker_id = NEW.broker_id 
            AND status = 'aprovado'
            AND retencao_tecnica = TRUE
        );
        
        -- Liberar splits pendentes
        UPDATE public.split_mesa
        SET status_corretor = 'processado'
        WHERE transacao_id IN (
            SELECT id FROM public.transacoes_pagamento 
            WHERE broker_id = NEW.broker_id 
            AND status = 'aprovado'
            AND retencao_tecnica = FALSE
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_liberar_retencao_nf
    AFTER UPDATE ON public.notas_fiscais
    FOR EACH ROW
    EXECUTE FUNCTION public.liberar_retencao_tecnica();

-- =====================================================
-- FUNÇÕES DE RELATÓRIOS E ANÁLISE
-- =====================================================

-- Função para gerar relatório de bitributação
CREATE OR REPLACE FUNCTION public.gerar_relatorio_bitributacao(
    p_incorporadora_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    valor_total_intermediacoes DECIMAL(15,2) := 0;
    valor_comissoes_tradicionais DECIMAL(15,2) := 0;
    valor_comissoes_split DECIMAL(15,2) := 0;
    economia_pis_cofins DECIMAL(15,2) := 0;
    economia_iss DECIMAL(15,2) := 0;
    total_economia DECIMAL(15,2) := 0;
BEGIN
    -- Calcular valor total de intermediações
    SELECT COALESCE(SUM(valor_total), 0) INTO valor_total_intermediacoes
    FROM public.transacoes_pagamento
    WHERE incorporadora_id = p_incorporadora_id
    AND data_aprovacao::date BETWEEN p_data_inicio AND p_data_fim
    AND status = 'aprovado';
    
    -- Calcular comissões tradicionais (simulação)
    valor_comissoes_tradicionais := valor_total_intermediacoes * 0.04; -- 4% tradicional
    
    -- Calcular comissões com split
    SELECT COALESCE(SUM(valor_corretor), 0) INTO valor_comissoes_split
    FROM public.split_mesa sm
    JOIN public.transacoes_pagamento tp ON sm.transacao_id = tp.id
    WHERE tp.incorporadora_id = p_incorporadora_id
    AND tp.data_aprovacao::date BETWEEN p_data_inicio AND p_data_fim
    AND tp.status = 'aprovado';
    
    -- Calcular economia tributária
    economia_pis_cofins := valor_comissoes_tradicionais * 0.0365; -- 3.65% PIS/COFINS
    economia_iss := valor_comissoes_tradicionais * 0.05; -- 5% ISS
    total_economia := economia_pis_cofins + economia_iss;
    
    -- Construir resultado JSON
    resultado := jsonb_build_object(
        'periodo', jsonb_build_object('inicio', p_data_inicio, 'fim', p_data_fim),
        'valores', jsonb_build_object(
            'valor_total_intermediacoes', valor_total_intermediacoes,
            'valor_comissoes_tradicionais', valor_comissoes_tradicionais,
            'valor_comissoes_split', valor_comissoes_split,
            'economia_tributaria', total_economia
        ),
        'calculos_fiscais', jsonb_build_object(
            'economia_pis_cofins', economia_pis_cofins,
            'economia_iss', economia_iss,
            'percentual_economia', CASE 
                WHEN valor_comissoes_tradicionais > 0 THEN 
                    ROUND((total_economia / valor_comissoes_tradicionais) * 100, 2)
                ELSE 0 
            END
        ),
        'resumo', jsonb_build_object(
            'total_economia_tributaria', total_economia,
            'economia_percentual', CASE 
                WHEN valor_total_intermediacoes > 0 THEN 
                    ROUND((total_economia / valor_total_intermediacoes) * 100, 2)
                ELSE 0 
            END
        )
    );
    
    -- Inserir relatório na tabela
    INSERT INTO public.relatorios_bitributacao (
        incorporadora_id,
        period_inicio,
        period_fim,
        valor_total_intermediacoes,
        valor_comissoes_tradicionais,
        valor_comissoes_split,
        economia_pis_cofins,
        economia_iss,
        total_economia_tributaria,
        percentual_economia,
        status
    ) VALUES (
        p_incorporadora_id,
        p_data_inicio,
        p_data_fim,
        valor_total_intermediacoes,
        valor_comissoes_tradicionais,
        valor_comissoes_split,
        economia_pis_cofins,
        economia_iss,
        total_economia,
        CASE 
            WHEN valor_total_intermediacoes > 0 THEN 
                ROUND((total_economia / valor_total_intermediacoes) * 100, 2)
            ELSE 0 
        END,
        'gerado'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS E CONSULTAS OTIMIZADAS
-- =====================================================

-- View de Transações com Split
CREATE OR REPLACE VIEW public.transacoes_com_split AS
SELECT 
    tp.*,
    sm.percentual_sb,
    sm.valor_sb,
    sm.valor_corretor,
    sm.valor_incorporadora,
    sm.status_sb,
    sm.status_corretor,
    sm.status_incorporadora,
    b.nome as broker_nome,
    i.nome_fantasia as incorporadora_nome,
    l.nome as lead_nome,
    g.nome as gateway_nome,
    nf.numero_nf,
    nf.status as nf_status,
    nf.data_validacao as nf_data_validacao
FROM public.transacoes_pagamento tp
LEFT JOIN public.split_mesa sm ON tp.id = sm.transacao_id
LEFT JOIN public.brokers b ON tp.broker_id = b.id
LEFT JOIN public.incorporadoras_sb i ON tp.incorporadora_id = i.id
LEFT JOIN public.leads l ON tp.lead_id = l.id
LEFT JOIN public.gateway_pagamentos g ON tp.gateway_id = g.id
LEFT JOIN public.notas_fiscais nf ON tp.id = nf.transacao_id
ORDER BY tp.data_aprovacao DESC;

-- View de Retenções Técnicas
CREATE OR REPLACE VIEW public.retencoes_tecnicas AS
SELECT 
    tp.id as transacao_id,
    tp.valor_total,
    tp.tipo_transacao,
    tp.data_aprovacao,
    tp.retencao_tecnica,
    tp.condicao_liberacao,
    tp.status_liberacao,
    tp.data_liberacao,
    b.nome as broker_nome,
    i.nome_fantasia as incorporadora_nome,
    CASE 
        WHEN nf.id IS NOT NULL THEN 
            jsonb_build_object('tipo', 'nf', 'numero', nf.numero_nf, 'status', nf.status)
        WHEN bi.id IS NOT NULL THEN 
            jsonb_build_object('tipo', 'biometria', 'data', bi.data_validacao, 'status', bi.status)
        ELSE NULL
    END as documento_liberacao
FROM public.transacoes_pagamento tp
LEFT JOIN public.brokers b ON tp.broker_id = b.id
LEFT JOIN public.incorporadoras_sb i ON tp.incorporadora_id = i.id
LEFT JOIN public.notas_fiscais nf ON tp.documento_liberacao_id = nf.id
LEFT JOIN public.analises_credito bi ON tp.documento_liberacao_id = bi.id
WHERE tp.retencao_tecnica = TRUE
AND tp.status = 'aprovado'
AND tp.status_liberacao = 'pendente'
ORDER BY tp.data_aprovacao;

-- View de Dashboard FinTech
CREATE OR REPLACE VIEW public.dashboard_fintech AS
SELECT 
    i.id as incorporadora_id,
    i.nome_fantasia,
    COUNT(DISTINCT tp.id) as total_transacoes,
    COUNT(DISTINCT CASE WHEN tp.status = 'aprovado' THEN tp.id END) as transacoes_aprovadas,
    COALESCE(SUM(CASE WHEN tp.status = 'aprovado' THEN tp.valor_total END), 0) as valor_total_aprovado,
    COALESCE(SUM(sm.valor_sb), 0) as valor_comissoes_sb,
    COALESCE(SUM(sm.valor_corretor), 0) as valor_comissoes_corretores,
    COALESCE(SUM(sm.valor_incorporadora), 0) as valor_incorporadora,
    COUNT(DISTINCT CASE WHEN tp.retencao_tecnica = TRUE THEN tp.id END) as retencoes_tecnicas,
    COUNT(DISTINCT CASE WHEN tp.status_liberacao = 'liberado' THEN tp.id END) as liberacoes,
    COUNT(DISTINCT nf.id) as nfs_aprovadas,
    COALESCE(SUM(ma.valor_total), 0) as valor_multas,
    COALESCE(SUM(rb.total_economia_tributaria), 0) as economia_tributaria
FROM public.incorporadoras_sb i
LEFT JOIN public.transacoes_pagamento tp ON i.id = tp.incorporadora_id
LEFT JOIN public.split_mesa sm ON tp.id = sm.transacao_id
LEFT JOIN public.notas_fiscais nf ON tp.broker_id = nf.broker_id AND nf.status = 'aprovada'
LEFT JOIN public.mora_automatica ma ON tp.id = ma.transacao_id
LEFT JOIN public.mora_automatica ma2 ON tp.id = ma2.transacao_id AND ma2.status = 'aplicada'
LEFT JOIN public.relatorios_bitributacao rb ON i.id = rb.incorporadora_id AND rb.status = 'aprovado'
GROUP BY i.id, i.nome_fantasia;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transacoes_gateway ON public.transacoes_pagamento(gateway_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON public.transacoes_pagamento(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_broker ON public.transacoes_pagamento(broker_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data_pagamento ON public.transacoes_pagamento(data_aprovacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_retencao ON public.transacoes_pagamento(retencao_tecnica, status_liberacao);
CREATE INDEX IF NOT EXISTS idx_split_transacao ON public.split_mesa(transacao_id);
CREATE INDEX IF NOT EXISTS idx_split_status ON public.split_mesa(status_sb, status_corretor, status_incorporadora);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_broker ON public.notas_fiscais(broker_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_hash ON public.notas_fiscais(hash_nf);
CREATE INDEX IF NOT EXISTS idx_relatorios_incorporadora ON public.relatorios_bitributacao(incorporadora_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_periodo ON public.relatorios_bitributacao(period_inicio, period_fim);
CREATE INDEX IF NOT EXISTS idx_mora_transacao ON public.mora_automatica(transacao_id);
CREATE INDEX IF NOT EXISTS idx_mora_status ON public.mora_automatica(status);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir gateways de pagamento
INSERT INTO public.gateway_pagamentos (nome, tipo, split_habilitado, taxa_transacao, taxa_split, status) VALUES
('Stripe', 'cartao', TRUE, 2.99, 1.00, 'ativo'),
('Mercado Pago', 'pix', TRUE, 0.99, 0.50, 'ativo'),
('PicPay', 'pix', TRUE, 1.99, 0.75, 'ativo'),
('Gerencianet', 'boleto', TRUE, 2.99, 1.00, 'ativo'),
('PagSeguro', 'transferencia', TRUE, 1.49, 0.75, 'ativo');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V15 - FINTECH & GOVERNANÇA CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.gateway_pagamentos) as total_gateways,
       (SELECT COUNT(*) FROM public.transacoes_pagamento) as total_transacoes,
       (SELECT COUNT(*) FROM public.split_mesa) as total_splits,
       (SELECT COUNT(*) FROM public.notas_fiscais) as total_notas_fiscais,
       (SELECT COUNT(*) FROM public.relatorios_bitributacao) as total_relatorios,
       (SELECT COUNT(*) FROM public.mora_automatica) as total_moras;
