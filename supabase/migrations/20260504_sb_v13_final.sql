-- 🏛️ SECURITY BROKER SB v13 - CONSOLIDAÇÃO TOTAL (ECOSSISTEMA INTEGRADO)
-- Schema completo para Land Banking, Permuta e Match de Áreas

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELAS PRINCIPAIS DO ECOSSISTEMA INTEGRADO
-- =====================================================

-- Incorporadoras e Construtoras (SB)
CREATE TABLE IF NOT EXISTS public.incorporadoras_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id TEXT UNIQUE NOT NULL, -- PROJETO_ID conforme regra de soberania
    nome_fantasia TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    status TEXT DEFAULT 'ativa', -- ativa, suspenso, encerrada
    plano TEXT DEFAULT 'basico', -- basico, premium, imperial
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_ativacao TIMESTAMPTZ,
    data_ultimo_pagamento TIMESTAMPTZ,
    proximo_vencimento TIMESTAMPTZ,
    valor_setup DECIMAL(10,2),
    valor_mensalidade DECIMAL(10,2),
    wallet_creditos DECIMAL(15,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Empreendimentos SB
CREATE TABLE IF NOT EXISTS public.empreendimentos_sb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    projeto_id TEXT NOT NULL, -- PROJETO_ID
    nome TEXT NOT NULL,
    descricao TEXT,
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    coordenadas GEOGRAPHY(POINT, 4326), -- Para análise geográfica
    total_unidades INTEGER NOT NULL,
    unidades_disponiveis INTEGER NOT NULL,
    area_total_m2 DECIMAL(10,2),
    vgv_estimado DECIMAL(15,2),
    status TEXT DEFAULT 'planejamento', -- planejamento, pre_lancamento, lancamento, construcao, entregue
    data_pre_lancamento DATE,
    data_lancamento DATE,
    data_entrega_prevista DATE,
    valor_medio_unidade DECIMAL(10,2),
    dna_negocio JSONB DEFAULT '{}', -- DNA do Ativo com tipos de negócio
    gap_bairro JSONB DEFAULT '{}', -- Gap do Bairro (demanda vs disponibilidade)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DNA do Ativo (Tipos de Negócio)
CREATE TABLE IF NOT EXISTS public.dna_ativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empreendimento_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    tipo_negocio TEXT NOT NULL, -- permuta_fisica, permuta_financeira, venda_vista, hibrido, estruturado
    configuracoes JSONB DEFAULT '{}', -- Configurações específicas do tipo
    percentuais JSONB DEFAULT '{}', -- Percentuais de cada componente
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banco de Permutas (Clientes finais)
CREATE TABLE IF NOT EXISTS public.banco_permutas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    tipo_imovel TEXT NOT NULL, -- casa, apartamento, terreno, comercial
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    coordenadas GEOGRAPHY(POINT, 4326),
    area_m2 DECIMAL(8,2) NOT NULL,
    valor_mercado DECIMAL(12,2) NOT NULL,
    valor_aval DECIMAL(12,2),
    documentos JSONB DEFAULT '{}', -- Documentos do imóvel
    status TEXT DEFAULT 'disponivel', -- disponivel, em_analise, matched, vendido
    preferencia_negocio JSONB DEFAULT '{}', -- Preferências de negócio do cliente
    data_cadastro TIMESTAMPTZ DEFAULT NOW(),
    data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- Matches de Permuta (Cruzamento automático)
CREATE TABLE IF NOT EXISTS public.matches_permuta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    empreendimento_id UUID REFERENCES public.empreendimentos_sb(id) ON DELETE CASCADE,
    permuta_id UUID REFERENCES public.banco_permutas(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    score_match DECIMAL(5,2) NOT NULL, -- 0-100 score de compatibilidade
    tipo_match TEXT NOT NULL, -- fisica, financeira, hibrido, estruturado
    detalhes_match JSONB DEFAULT '{}', -- Detalhes do match
    status TEXT DEFAULT 'pendente', -- pendente, confirmado, rejeitado, concluido
    percentual_sb DECIMAL(5,2) DEFAULT 15.0, -- 10% a 20% para SB
    valor_intermediacao DECIMAL(12,2),
    data_match TIMESTAMPTZ DEFAULT NOW(),
    data_confirmacao TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corretores/Brokers SB
CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    creci TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'ativo', -- ativo, suspenso, inativo
    comissao_percentual DECIMAL(5,2) DEFAULT 4.00,
    pastas_100 INTEGER DEFAULT 0,
    total_vendido DECIMAL(15,2) DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 0, -- Score de performance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads/Clientes (LGPD Compliance)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf TEXT NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento DATE,
    renda_mensal DECIMAL(10,2),
    profissao TEXT,
    status TEXT DEFAULT 'novo', -- novo, qualificado, em_analise, aprovado, rejeitado, convertido
    origem TEXT DEFAULT 'manual', -- manual, yara_ia, importacao
    duplicidade_detectada BOOLEAN DEFAULT FALSE,
    preferencia_definida BOOLEAN DEFAULT FALSE,
    broker_eleito_id UUID REFERENCES public.brokers(id),
    data_primeiro_contato TIMESTAMPTZ DEFAULT NOW(),
    data_bloqueio_lgpd DATE, -- Para LGPD 2 anos
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastas de Documentos (Dossiê)
CREATE TABLE IF NOT EXISTS public.pastas_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'iniciada', -- iniciada, em_progresso, pendente, completa, rejeitada
    progresso_percentual INTEGER DEFAULT 0,
    documentos JSONB DEFAULT '{}', -- {rg: {url: '', status: 'pendente'}, cpf: {...}}
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_conclusao TIMESTAMPTZ,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análise de Crédito
CREATE TABLE IF NOT EXISTS public.analises_credito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    pasta_id UUID REFERENCES public.pastas_documentos(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pendente', -- pendente, em_analise, aprovado, rejeitado
    score_risco INTEGER, -- 0-100
    limite_aprovado DECIMAL(12,2),
    parcela_maxima DECIMAL(10,2),
    prazo_maximo INTEGER,
    taxa_juros DECIMAL(5,2),
    observacoes TEXT,
    data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
    data_analise TIMESTAMPTZ,
    analista_id UUID REFERENCES auth.users(id),
    biometria_autorizada BOOLEAN DEFAULT FALSE,
    ip_autorizacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas e Comissões (Contratos Reais)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    match_permuta_id UUID REFERENCES public.matches_permuta(id), -- Se for permuta
    valor_venda DECIMAL(12,2) NOT NULL,
    tipo_negocio TEXT NOT NULL, -- venda_vista, permuta_fisica, permuta_financeira, hibrido, estruturado
    detalhes_negocio JSONB DEFAULT '{}', -- Detalhes específicos do tipo de negócio
    data_venda TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pendente', -- pendente, confirmada, cancelada, concluida
    forma_pagamento TEXT,
    entrada_percentual DECIMAL(5,2),
    parcelas INTEGER,
    taxa_juros DECIMAL(5,2),
    comissao_corretor DECIMAL(12,2),
    comissao_gestao DECIMAL(12,2), -- 2% Split de Gestão
    comissao_sb DECIMAL(12,2),
    success_fee DECIMAL(12,2),
    biometria_assinatura BOOLEAN DEFAULT FALSE,
    ip_assinatura TEXT,
    hash_contrato TEXT, -- SHA-256 do contrato
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Split de Comissões (Motor Financeiro)
CREATE TABLE IF NOT EXISTS public.comissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    valor_total DECIMAL(12,2) NOT NULL,
    percentual_gestao DECIMAL(5,2) DEFAULT 2.00, -- 2% Split de Gestão
    valor_gestao DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_gestao / 100) STORED,
    percentual_corretor DECIMAL(5,2) DEFAULT 4.00,
    valor_corretor DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_corretor / 100) STORED,
    percentual_sb DECIMAL(5,2) DEFAULT 6.00,
    valor_sb DECIMAL(12,2) GENERATED ALWAYS AS (valor_total * percentual_sb / 100) STORED,
    status TEXT DEFAULT 'pendente', -- pendente, processado, pago, atrasado
    data_vencimento TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    multa_atraso DECIMAL(12,2) DEFAULT 0, -- 10% Penalidade de Mora
    juros_atraso DECIMAL(12,2) DEFAULT 0, -- 1% ao mês
    valor_total_recebido DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet de Créditos (20% do faturamento B2B)
CREATE TABLE IF NOT EXISTS public.wallet_creditos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- leads, ads, marketing, bonus, match
    valor DECIMAL(10,2) NOT NULL,
    origem TEXT, -- faturamento_b2b, deposito, bonus, match_confirmado
    status TEXT DEFAULT 'disponivel', -- disponivel, usado, expirado
    data_expiracao DATE,
    data_uso TIMESTAMPTZ,
    referencia_id UUID, -- ID da venda, match ou depósito
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aportes e Setup (D+10/D+30)
CREATE TABLE IF NOT EXISTS public.aportes_setup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    tipo TEXT NOT NULL, -- setup, estruturacao
    data_aporte TIMESTAMPTZ DEFAULT NOW(),
    data_vencimento TIMESTAMPTZ,
    status TEXT DEFAULT 'pendente', -- pendente, pago, vencido, cancelado
    metodo_pagamento TEXT,
    referencia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yara IA - Qualificação de Leads
CREATE TABLE IF NOT EXISTS public.yara_ia_analises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    score_qualificacao INTEGER, -- 0-100
    probabilidade_conversao DECIMAL(5,2), -- 0-100%
    perfil_comportamental JSONB,
    recomendacoes JSONB,
    status TEXT DEFAULT 'pendente', -- pendente, analisado, qualificado, rejeitado
    data_analise TIMESTAMPTZ DEFAULT NOW(),
    modelo_versao TEXT DEFAULT 'v2.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nexo Causal Jurídico (Art. 725 CC)
CREATE TABLE IF NOT EXISTS public.nexo_causal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    acao TEXT NOT NULL, -- cadastro, contato, analise, venda, match_confirmado
    hash_sha256 TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    dados_acao JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificações e Push
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinatario_id UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id),
    broker_id UUID REFERENCES public.brokers(id),
    incorporadora_id UUID REFERENCES public.incorporadoras_sb(id),
    tipo TEXT NOT NULL, -- info, alerta, duplicidade, preferencia, match
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    status TEXT DEFAULT 'nao_lida', -- nao_lida, lida, arquivada
    data_envio TIMESTAMPTZ DEFAULT NOW(),
    data_leitura TIMESTAMPTZ,
    push_enviado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Auditoria (LGPD)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id),
    acao TEXT NOT NULL,
    tabela_afetada TEXT,
    registro_id TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    user_agent TEXT,
    data_bloqueio DATE, -- Para LGPD 2 anos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DO ECOSSISTEMA
-- =====================================================

-- Trigger para gerar hash SHA-256 do Nexo Causal
CREATE OR REPLACE FUNCTION public.gerar_nexo_causal_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_sha256 = encode(
        sha256(NEW.lead_id::text || NEW.broker_id::text || NEW.acao::text || EXTRACT(EPOCH FROM NEW.created_at)::text),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_nexo_causal_hash
    BEFORE INSERT ON public.nexo_causal
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_nexo_causal_hash();

-- Trigger para atualizar progresso da pasta e gatilho de crédito
CREATE OR REPLACE FUNCTION public.atualizar_progresso_pasta()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular progresso baseado nos documentos
    DECLARE
        total_documentos INTEGER := 0;
        documentos_completos INTEGER := 0;
        progresso INTEGER := 0;
    BEGIN
        -- Se documentos foram atualizados
        IF TG_OP = 'UPDATE' AND OLD.documentos IS DISTINCT FROM NEW.documentos THEN
            -- Contar documentos (simplificado - adaptar conforme estrutura real)
            total_documentos := jsonb_array_length(NEW.documentos);
            
            -- Contar documentos completos
            SELECT COUNT(*) INTO documentos_completos
            FROM jsonb_each_text(NEW.documentos) 
            WHERE value = 'completo';
            
            -- Calcular progresso
            IF total_documentos > 0 THEN
                progresso := (documentos_completos * 100) / total_documentos;
            END IF;
            
            NEW.progresso_percentual := progresso;
            NEW.ultima_atualizacao := NOW();
            
            -- Se atingiu 100%, marcar como completa e disparar gatilho
            IF progresso = 100 THEN
                NEW.status := 'completa';
                NEW.data_conclusao := NOW();
                
                -- Gatilho automático para análise de crédito
                INSERT INTO public.analises_credito (lead_id, pasta_id, status)
                VALUES (NEW.lead_id, NEW.id, 'em_analise');
                
                -- Notificar broker
                INSERT INTO public.notificacoes (
                    broker_id,
                    lead_id,
                    tipo,
                    titulo,
                    mensagem
                ) VALUES (
                    NEW.broker_id,
                    NEW.lead_id,
                    'info',
                    'Pasta 100% Completa',
                    'Pasta de documentos atingiu 100%. Análise de crédito iniciada automaticamente.'
                );
            END IF;
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_pasta
    BEFORE UPDATE ON public.pastas_documentos
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_progresso_pasta();

-- Trigger para detectar duplicidade de CPF (OUROBOROS 2.0)
CREATE OR REPLACE FUNCTION public.verificar_duplicidade_cpf()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se CPF já existe com outro broker
    IF EXISTS (
        SELECT 1 FROM public.leads 
        WHERE cpf = NEW.cpf 
        AND id != COALESCE(NEW.id::text, '00000000-0000-0000-0000-000000000000')::uuid
        AND broker_eleito_id IS NULL
    ) THEN
        NEW.duplicidade_detectada := TRUE;
        
        -- Criar notificação de duplicidade para incorporadora
        INSERT INTO public.notificacoes (
            lead_id,
            tipo,
            titulo,
            mensagem
        ) VALUES (
            NEW.id,
            'duplicidade',
            'Duplicidade de CPF Detectada',
            'Cliente com CPF já cadastrado no ecossistema. Prioridade para quem atingir 100% da pasta.'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_verificar_duplicidade
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.verificar_duplicidade_cpf();

-- Trigger para calcular comissões e split de gestão
CREATE OR REPLACE FUNCTION public.calcular_comissoes_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular valores de comissão
    NEW.comissao_corretor := NEW.valor_venda * 0.04; -- 4% corretor
    NEW.comissao_gestao := NEW.valor_venda * 0.02; -- 2% Split de Gestão
    NEW.comissao_sb := NEW.valor_venda * 0.06; -- 6% SB
    
    -- Gerar hash do contrato
    NEW.hash_contrato := encode(
        sha256(NEW.id::text || NEW.valor_venda::text || NEW.lead_id::text || EXTRACT(EPOCH FROM NEW.data_venda)::text),
        'hex'
    );
    
    -- Inserir na tabela de comissões
    INSERT INTO public.comissoes (
        venda_id,
        corretor_id,
        valor_total,
        data_vencimento
    ) VALUES (
        NEW.id,
        NEW.broker_id,
        NEW.valor_venda,
        NEW.data_venda + INTERVAL '5 days' -- Vencimento em 5 dias
    );
    
    -- Gerar Nexo Causal
    INSERT INTO public.nexo_causal (
        lead_id,
        broker_id,
        acao,
        ip_address,
        user_agent,
        dados_acao
    ) VALUES (
        NEW.lead_id,
        NEW.broker_id,
        'venda',
        NEW.ip_assinatura,
        'SB Sistema',
        json_build_object('valor_venda', NEW.valor_venda, 'tipo_negocio', NEW.tipo_negocio)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calcular_comissoes
    BEFORE INSERT ON public.vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_comissoes_venda();

-- Trigger para penalidade de mora automática
CREATE OR REPLACE FUNCTION public.aplicar_penalidade_mora()
RETURNS TRIGGER AS $$
BEGIN
    -- Se está atrasado e ainda não foi aplicada penalidade
    IF NEW.status = 'atrasado' AND OLD.status != 'atrasado' THEN
        NEW.multa_atraso := NEW.valor_corretor * 0.10; -- 10% de multa
        NEW.juros_atraso := NEW.valor_corretor * 0.01; -- 1% de juros
        NEW.valor_total_recebido := NEW.valor_corretor + NEW.multa_atraso + NEW.juros_atraso;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_penalidade_mora
    BEFORE UPDATE ON public.comissoes
    FOR EACH ROW
    EXECUTE FUNCTION public.aplicar_penalidade_mora();

-- Trigger para monetização de match (10%-20% para SB)
CREATE OR REPLACE FUNCTION public.monetizar_match()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular valor da intermediação (10%-20% para SB)
    DECLARE
        percentual_sb DECIMAL(5,2) := 15.0; -- Padrão 15%
        valor_intermediacao DECIMAL(12,2);
    BEGIN
        -- Se o match foi confirmado
        IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
            -- Calcular valor da intermediação
            valor_intermediacao := NEW.valor_intermediacao * (percentual_sb / 100.0);
            
            -- Adicionar crédito à wallet da incorporadora
            INSERT INTO public.wallet_creditos (
                incorporadora_id,
                tipo,
                valor,
                origem,
                status,
                referencia_id
            ) VALUES (
                NEW.incorporadora_id,
                'match',
                valor_intermediacao,
                'match_confirmado',
                'disponivel',
                NEW.id
            );
            
            -- Notificar sobre monetização
            INSERT INTO public.notificacoes (
                incorporadora_id,
                tipo,
                titulo,
                mensagem
            ) VALUES (
                NEW.incorporadora_id,
                'match',
                'Match Monetizado',
                format('Match confirmado. R$ %s creditados para sua wallet.', valor_intermediacao)
            );
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_monetizar_match
    BEFORE UPDATE ON public.matches_permuta
    FOR EACH ROW
    EXECUTE FUNCTION public.monetizar_match();

-- =====================================================
-- FUNÇÕES DE MATCH E ANÁLISE
-- =====================================================

-- Função para calcular score de match entre empreendimento e permuta
CREATE OR REPLACE FUNCTION public.calcular_score_match(
    p_empreendimento_id UUID,
    p_permuta_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    score DECIMAL(5,2) := 0.0;
    empreendimento RECORD;
    permuta RECORD;
    distancia_km DECIMAL(8,2);
BEGIN
    -- Buscar dados do empreendimento
    SELECT * INTO empreendimento 
    FROM public.empreendimentos_sb 
    WHERE id = p_empreendimento_id;
    
    -- Buscar dados da permuta
    SELECT * INTO permuta 
    FROM public.banco_permutas 
    WHERE id = p_permuta_id;
    
    -- Calcular distância geográfica
    SELECT ST_Distance(
        empreendimento.coordenadas::geography,
        permuta.coordenadas::geography
    ) / 1000 INTO distancia_km; -- Converter para km
    
    -- Score baseado em múltiplos fatores
    score := 0.0;
    
    -- Proximidade geográfica (40%)
    IF distancia_km <= 5.0 THEN
        score := score + 40.0;
    ELSIF distancia_km <= 10.0 THEN
        score := score + 30.0;
    ELSIF distancia_km <= 20.0 THEN
        score := score + 20.0;
    END IF;
    
    -- Compatibilidade de área (30%)
    IF permuta.area_m2 >= empreendimento.area_total_m2 * 0.8 AND 
       permuta.area_m2 <= empreendimento.area_total_m2 * 1.2 THEN
        score := score + 30.0;
    ELSIF permuta.area_m2 >= empreendimento.area_total_m2 * 0.5 AND 
           permuta.area_m2 <= empreendimento.area_total_m2 * 1.5 THEN
        score := score + 20.0;
    END IF;
    
    -- Compatibilidade de valor (30%)
    IF permuta.valor_mercado >= empreendimento.valor_medio_unidade * 0.8 AND 
       permuta.valor_mercado <= empreendimento.valor_medio_unidade * 1.2 THEN
        score := score + 30.0;
    ELSIF permuta.valor_mercado >= empreendimento.valor_medio_unidade * 0.5 AND 
           permuta.valor_mercado <= empreendimento.valor_medio_unidade * 1.5 THEN
        score := score + 20.0;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular Gap do Bairro
CREATE OR REPLACE FUNCTION public.calcular_gap_bairro(p_bairro TEXT, p_cidade TEXT)
RETURNS JSONB AS $$
DECLARE
    gap_result JSONB;
    demanda_total INTEGER := 0;
    oferta_total INTEGER := 0;
    detalhes_gap JSONB := '[]'::jsonb;
BEGIN
    -- Calcular demanda (leads interessados no bairro)
    SELECT COUNT(*) INTO demanda_total
    FROM public.leads l
    JOIN public.pastas_documentos pd ON l.id = pd.lead_id
    WHERE pd.progresso_percentual >= 50
    AND l.status IN ('qualificado', 'em_analise', 'aprovado');
    
    -- Calcular oferta (unidades disponíveis no bairro)
    SELECT COUNT(*) INTO oferta_total
    FROM public.unidades u
    JOIN public.empreendimentos_sb e ON u.empreendimento_id = e.id
    WHERE e.bairro = p_bairro
    AND e.cidade = p_cidade
    AND u.status = 'disponivel';
    
    -- Construir JSON do gap
    gap_result := jsonb_build_object(
        'bairro', p_bairro,
        'cidade', p_cidade,
        'demanda_total', demanda_total,
        'oferta_total', oferta_total,
        'gap_numerico', (demanda_total - oferta_total),
        'gap_percentual', CASE 
            WHEN oferta_total > 0 THEN 
                ROUND(((demanda_total - oferta_total)::DECIMAL / oferta_total) * 100, 2)
            ELSE 
                NULL 
        END,
        'status_gap', CASE 
            WHEN demanda_total > oferta_total THEN 'excesso_demanda'
            WHEN demanda_total < oferta_total THEN 'excesso_oferta'
            ELSE 'equilibrado'
        END,
        'oportunidades', detalhes_gap
    );
    
    RETURN gap_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS E CONSULTAS OTIMIZADAS
-- =====================================================

-- View de Matches Disponíveis
CREATE OR REPLACE VIEW public.matches_disponiveis AS
SELECT 
    mp.*,
    e.nome as empreendimento_nome,
    e.bairro as empreendimento_bairro,
    e.cidade as empreendimento_cidade,
    p.endereco as permuta_endereco,
    p.area_m2 as permuta_area,
    p.valor_mercado as permuta_valor,
    b.nome as broker_nome,
    i.nome_fantasia as incorporadora_nome
FROM public.matches_permuta mp
JOIN public.empreendimentos_sb e ON mp.empreendimento_id = e.id
JOIN public.banco_permutas p ON mp.permuta_id = p.id
JOIN public.brokers b ON mp.broker_id = b.id
JOIN public.incorporadoras_sb i ON mp.incorporadora_id = i.id
WHERE mp.status = 'pendente'
AND mp.score_match >= 50.0;

-- View de Gap do Bairro
CREATE OR REPLACE VIEW public.gap_bairros AS
SELECT 
    e.bairro,
    e.cidade,
    COUNT(DISTINCT e.id) as empreendimentos_count,
    COUNT(DISTINCT u.id) as unidades_disponiveis,
    COUNT(DISTINCT l.id) as leads_interessados,
    public.calcular_gap_bairro(e.bairro, e.cidade) as gap_analise
FROM public.empreendimentos_sb e
LEFT JOIN public.unidades u ON e.id = u.empreendimento_id AND u.status = 'disponivel'
LEFT JOIN public.leads l ON l.status IN ('qualificado', 'em_analise', 'aprovado')
GROUP BY e.bairro, e.cidade
ORDER BY (COUNT(DISTINCT l.id) - COUNT(DISTINCT u.id)) DESC;

-- View de Performance de Brokers
CREATE OR REPLACE VIEW public.performance_brokers AS
SELECT 
    b.id,
    b.nome,
    b.creci,
    COUNT(DISTINCT pd.id) as total_pastas,
    COUNT(DISTINCT CASE WHEN pd.progresso_percentual = 100 THEN pd.id END) as pastas_100,
    COUNT(DISTINCT v.id) as total_vendas,
    COALESCE(SUM(v.valor_venda), 0) as total_vendido,
    ROUND(
        (COUNT(DISTINCT CASE WHEN pd.progresso_percentual = 100 THEN pd.id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT pd.id), 0)) * 100, 2
    ) as taxa_conversao,
    ROUND(
        (COUNT(DISTINCT CASE WHEN pd.progresso_percentual = 100 THEN pd.id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT v.id), 0)) * 100, 2
    ) as performance_score
FROM public.brokers b
LEFT JOIN public.pastas_documentos pd ON b.id = pd.broker_id
LEFT JOIN public.vendas v ON b.id = v.broker_id
GROUP BY b.id, b.nome, b.creci
ORDER BY performance_score DESC;

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.incorporadoras_sb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empreendimentos_sb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_permutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches_permuta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastas_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aportes_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yara_ia_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexo_causal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para Leads (visibilidade controlada com LGPD)
CREATE POLICY "leads_public_view" ON public.leads
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (duplicidade_detectada = FALSE OR 
         preferencia_definida = TRUE OR 
         created_by = auth.uid())
    );

CREATE POLICY "leads_own_insert" ON public.leads
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "leads_own_update" ON public.leads
    FOR UPDATE USING (created_by = auth.uid() OR auth.role() IN ('admin', 'diretor'));

-- Políticas para Matches (visibilidade por incorporadora)
CREATE POLICY "matches_incorporadora_view" ON public.matches_permuta
    FOR SELECT USING (
        incorporadora_id IN (SELECT id FROM public.incorporadoras_sb WHERE created_by = auth.uid()) OR
        broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Banco de Permutas
CREATE POLICY "permutas_incorporadora_view" ON public.banco_permutas
    FOR SELECT USING (
        incorporadora_id IN (SELECT id FROM public.incorporadoras_sb WHERE created_by = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Comissões (visibilidade do próprio broker)
CREATE POLICY "comissoes_own_select" ON public.comissoes
    FOR SELECT USING (
        corretor_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Wallet (visibilidade da incorporadora)
CREATE POLICY "wallet_incorporadora_view" ON public.wallet_creditos
    FOR SELECT USING (
        incorporadora_id IN (SELECT id FROM public.incorporadoras_sb WHERE created_by = auth.uid()) OR
        auth.role() IN ('admin', 'diretor')
    );

-- Políticas para Audit Logs (apenas admin)
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
    FOR ALL USING (auth.role() IN ('admin', 'diretor'));

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leads_cpf ON public.leads(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_duplicidade ON public.leads(duplicidade_detectada);
CREATE INDEX IF NOT EXISTS idx_leads_preferencia ON public.leads(preferencia_definida);
CREATE INDEX IF NOT EXISTS idx_permutas_bairro ON public.banco_permutas(bairro);
CREATE INDEX IF NOT EXISTS idx_permutas_status ON public.banco_permutas(status);
CREATE INDEX IF NOT EXISTS idx_permutas_coordenadas ON public.banco_permutas USING GIST (coordenadas);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches_permuta(status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON public.matches_permuta(score_match);
CREATE INDEX IF NOT EXISTS idx_empreendimentos_bairro ON public.empreendimentos_sb(bairro);
CREATE INDEX IF NOT EXISTS idx_empreendimentos_coordenadas ON public.empreendimentos_sb USING GIST (coordenadas);
CREATE INDEX IF NOT EXISTS idx_pastas_progresso ON public.pastas_documentos(progresso_percentual);
CREATE INDEX IF NOT EXISTS idx_pastas_status ON public.pastas_documentos(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON public.comissoes(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_vencimento ON public.comissoes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_nexo_causal_hash ON public.nexo_causal(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON public.notificacoes(status);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir dados de exemplo
INSERT INTO public.incorporadoras_sb (
    id, projeto_id, nome_fantasia, razao_social, cnpj, plano, valor_setup, valor_mensalidade
) VALUES 
(
    uuid_generate_v4(),
    'PROJETO_SB_001',
    'SB Incorporações Imperial',
    'SB Incorporações Ltda',
    '12.345.678/0001-90',
    'imperial',
    135000.00,
    25000.00
),
(
    uuid_generate_v4(),
    'PROJETO_SB_002',
    'SB Land Banking',
    'SB Land Banking Ltda',
    '98.765.432/0001-10',
    'premium',
    55000.00,
    15000.00
);

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V13 - ECOSSISTEMA INTEGRADO CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.incorporadoras_sb) as total_incorporadoras,
       (SELECT COUNT(*) FROM public.empreendimentos_sb) as total_empreendimentos,
       (SELECT COUNT(*) FROM public.brokers) as total_brokers,
       (SELECT COUNT(*) FROM public.leads) as total_leads,
       (SELECT COUNT(*) FROM public.banco_permutas) as total_permutas,
       (SELECT COUNT(*) FROM public.matches_permuta) as total_matches,
       (SELECT COUNT(*) FROM public.vendas) as total_vendas,
       (SELECT COUNT(*) FROM public.comissoes) as total_comissoes,
       (SELECT COUNT(*) FROM public.wallet_creditos) as total_creditos;
