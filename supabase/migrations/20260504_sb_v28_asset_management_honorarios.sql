-- 🏛️ SECURITY BROKER SB v28 - ASSET MANAGEMENT & HONORÁRIOS
-- Schema completo para Gestão de Ativos e Tabela Referencial de Honorários CRECI

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- TABELA DE HONORÁRIOS INTEGRADA (CRECI)
-- =====================================================

-- Tabela Referencial de Honorários CRECI
CREATE TABLE IF NOT EXISTS public.tabela_honorarios_creci (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    tipo_servico TEXT NOT NULL, -- 'venda', 'locacao', 'administracao', 'parecer'
    subtipo_servico TEXT NOT NULL, -- 'urbana', 'rural', 'judicial', 'tradicional', 'temporada', 'carteira', 'escrito', 'verbal'
    
    -- Percentuais de Honorários
    percentual_minimo DECIMAL(5,2) NOT NULL,
    percentual_maximo DECIMAL(5,2) NOT NULL,
    percentual_padrao DECIMAL(5,2) NOT NULL,
    
    -- Valores Fixos
    valor_minimo DECIMAL(15,2) DEFAULT 0.00,
    valor_padrao DECIMAL(15,2) DEFAULT 0.00,
    
    -- Condições Especiais
    condicao_especial TEXT, -- Ex: "para carteiras > R$ 100k/mês", "mínimo R$ 650,00"
    valor_condicao DECIMAL(15,2) DEFAULT 0.00,
    
    -- Base de Cálculo
    base_calculo TEXT NOT NULL, -- 'valor_imovel', 'valor_aluguel', 'valor_transacao', 'anuidade_creci'
    
    -- Notas e Observações
    nota_referencia TEXT, -- Ex: "Nota 4 da Tabela: Partes iguais, salvo ajuste escrito no App"
    observacoes TEXT,
    
    -- Status
    status_tabela TEXT DEFAULT 'ativa', -- 'ativa', 'inativa', 'revisada', 'suspensa'
    data_vigencia_inicio DATE DEFAULT CURRENT_DATE,
    data_vigencia_fim DATE,
    
    -- Hash
    hash_tabela TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_percentual_valido CHECK (percentual_minimo <= percentual_maximo AND percentual_minimo <= percentual_padrao AND percentual_padrao <= percentual_maximo)
);

-- =====================================================
-- MÓDULO DE LOCAÇÃO & SHORT-STAY
-- =====================================================

-- Contratos de Locação
CREATE TABLE IF NOT EXISTS public.contratos_locacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    numero_contrato TEXT UNIQUE NOT NULL,
    tipo_locacao TEXT NOT NULL, -- 'tradicional', 'temporada', 'residencial', 'comercial'
    tipo_imovel TEXT NOT NULL, -- 'apartamento', 'casa', 'sala', 'terreno', 'kitnet', 'studio'
    
    -- Partes
    proprietario_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    locatario_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    corretor_captador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    corretor_locador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Imóvel
    imovel_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    endereco_completo TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    coordenada_imovel POINT,
    
    -- Valores
    valor_aluguel DECIMAL(15,2) NOT NULL,
    valor_condominio DECIMAL(15,2) DEFAULT 0.00,
    valor_iptu DECIMAL(15,2) DEFAULT 0.00,
    valor_seguro DECIMAL(15,2) DEFAULT 0.00,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (valor_aluguel + valor_condominio + valor_iptu + valor_seguro) STORED,
    
    -- Honorários
    percentual_honorarios DECIMAL(5,2) NOT NULL,
    valor_honorarios DECIMAL(15,2) GENERATED ALWAYS AS (valor_aluguel * percentual_honorarios / 100) STORED,
    
    -- Período
    data_inicio_contrato DATE NOT NULL,
    data_fim_contrato DATE,
    data_vencimento_aluguel INTEGER, -- dia do mês
    prazo_minimo_meses INTEGER DEFAULT 12,
    prazo_detalhes TEXT, -- Ex: "12 meses + 12 meses de permanência"
    
    -- Garantias
    tipo_garantia TEXT, -- 'fiador', 'seguro_fianca', 'caucao', 'deposito', 'sem_garantia'
    valor_garantia DECIMAL(15,2) DEFAULT 0.00,
    fiador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Status
    status_contrato TEXT DEFAULT 'ativo', -- 'ativo', 'suspenso', 'encerrado', 'rescindido', 'renovado'
    data_encerramento DATE,
    motivo_encerramento TEXT,
    
    -- Documentos
    documento_contrato TEXT,
    documentos_anexos TEXT[] DEFAULT '{}',
    
    -- Hash
    hash_contrato TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-in Geofencing
CREATE TABLE IF NOT EXISTS public.checkin_geofencing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    contrato_locacao_id UUID REFERENCES public.contratos_locacao(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Tipo de Check-in
    tipo_acesso TEXT NOT NULL, -- 'entrada', 'saida', 'visita', 'vistoria'
    
    -- Geolocalização
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    precisao_gps DECIMAL(5,2) DEFAULT 0.00, -- metros
    endereco_verificado TEXT,
    
    -- Timestamp
    data_hora_acesso TIMESTAMPTZ DEFAULT NOW(),
    timestamp_acesso TEXT GENERATED ALWAYS AS (EXTRACT(EPOCH FROM data_hora_acesso)::TEXT) STORED,
    hash_timestamp TEXT NOT NULL,
    
    -- Reconhecimento Facial
    foto_usuario TEXT,
    biometria_facial_id TEXT,
    confianca_reconhecimento DECIMAL(5,2) DEFAULT 0.00, -- 0 a 100
    status_reconhecimento TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
    
    -- Validação
    geofence_validado BOOLEAN DEFAULT false,
    distancia_permitida INTEGER DEFAULT 100, -- metros
    distancia_real INTEGER DEFAULT 0,
    
    -- Observações
    observacoes TEXT,
    anomalia_detectada TEXT,
    
    -- Hash
    hash_checkin TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vistoria Auditada
CREATE TABLE IF NOT EXISTS public.vistoria_auditada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    contrato_locacao_id UUID REFERENCES public.contratos_locacao(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    vistoriador_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Tipo de Vistoria
    tipo_vistoria TEXT NOT NULL, -- 'entrada', 'saida', 'periodica', 'especial'
    motivo_vistoria TEXT,
    
    -- Data e Hora
    data_vistoria DATE NOT NULL,
    hora_inicio TIME,
    hora_fim TIME,
    duracao_minutos INTEGER,
    
    -- Localização
    latitude_vistoria DECIMAL(10,8),
    longitude_vistoria DECIMAL(11,8),
    endereco_vistoria TEXT,
    
    -- Evidências
    fotos_vistoria TEXT[] DEFAULT '{}',
    videos_vistoria TEXT[] DEFAULT '{}',
    documentos_vistoria TEXT[] DEFAULT '{}',
    
    -- Timestamp das Evidências
    timestamp_fotos TEXT[] DEFAULT '{}',
    timestamp_videos TEXT[] DEFAULT '{}',
    
    -- Checklist de Vistoria
    checklist_completo JSONB DEFAULT '{}',
    itens_verificados TEXT[] DEFAULT '{}',
    itens_anomalias TEXT[] DEFAULT '{}',
    
    -- Laudo
    laudo_vistoria TEXT,
    status_laudo TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado', 'observacoes'
    data_laudo DATE,
    
    -- Valores
    custo_vistoria DECIMAL(15,2) DEFAULT 0.00,
    valor_reparos DECIMAL(15,2) DEFAULT 0.00,
    
    -- Responsáveis
    responsavel_vistoria TEXT,
    testemunhas TEXT[] DEFAULT '{}',
    
    -- Hash
    hash_vistoria TEXT UNIQUE,
    hash_laudos TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seguros Imobiliários
CREATE TABLE IF NOT EXISTS public.seguros_imobiliarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    contrato_locacao_id UUID REFERENCES public.contratos_locacao(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    seguradora_id UUID REFERENCES public.seguradoras(id) ON DELETE SET NULL,
    corretor_seguros_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Tipo de Seguro
    tipo_seguro TEXT NOT NULL, -- 'incendio', 'responsabilidade_civil', 'eletrico', 'conteudo', 'vida'
    modalidade_seguro TEXT, -- 'basico', 'completo', 'premium'
    
    -- Dados do Seguro
    apolice_numero TEXT UNIQUE,
    data_emissao DATE,
    data_inicio_vigencia DATE,
    data_fim_vigencia DATE,
    
    -- Valores
    valor_segurado DECIMAL(15,2) NOT NULL,
    premio_seguro DECIMAL(15,2) NOT NULL,
    franquia DECIMAL(15,2) DEFAULT 0.00,
    
    -- Comissões
    percentual_comissao DECIMAL(5,2) DEFAULT 10.0,
    valor_comissao DECIMAL(15,2) GENERATED ALWAYS AS (premio_seguro * percentual_comissao / 100) STORED,
    
    -- Split de Comissão
    corretor_captador_percent DECIMAL(5,2) DEFAULT 50.0,
    corretor_seguros_percent DECIMAL(5,2) DEFAULT 50.0,
    imobiliaria_percent DECIMAL(5,2) DEFAULT 0.0,
    
    -- Cobertura
    cobertura_detalhes JSONB DEFAULT '{}',
    exclusoes TEXT[] DEFAULT '{}',
    
    -- Status
    status_seguro TEXT DEFAULT 'ativo', -- 'ativo', 'cancelado', 'suspenso', 'sinistro'
    data_cancelamento DATE,
    motivo_cancelamento TEXT,
    
    -- Sinistros
    sinistros_registrados INTEGER DEFAULT 0,
    valor_sinistros DECIMAL(15,2) DEFAULT 0.00,
    
    -- Documentos
    apolice_documento TEXT,
    documentos_anexos TEXT[] DEFAULT '{}',
    
    -- Hash
    hash_seguro TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FLUXO DE ORDEM DE SERVIÇO (OS)
-- =====================================================

-- Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    numero_os TEXT UNIQUE NOT NULL,
    tipo_servico TEXT NOT NULL, -- 'venda', 'locacao', 'administracao', 'parecer', 'consultoria'
    subtipo_servico TEXT,
    
    -- Cliente
    cliente_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    nome_cliente TEXT,
    documento_cliente TEXT,
    
    -- Imóvel
    imovel_id UUID REFERENCES public.unidades_projetos(id) ON DELETE SET NULL,
    endereco_servico TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    
    -- Serviço Solicitado
    descricao_servico TEXT NOT NULL,
    escopo_servico TEXT,
    objetivos_servico TEXT,
    
    -- Profissional Responsável
    profissional_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    
    -- Honorários
    tipo_honorario TEXT NOT NULL, -- 'percentual', 'fixo', 'hora'
    valor_honorario DECIMAL(15,2) NOT NULL,
    percentual_honorario DECIMAL(5,2) DEFAULT 0.00,
    base_calculo_honorario TEXT,
    
    -- Prazos
    data_solicitacao DATE DEFAULT CURRENT_DATE,
    data_inicio_prevista DATE,
    data_entrega_prevista DATE,
    prazo_dias INTEGER DEFAULT 30,
    
    -- Status
    status_os TEXT DEFAULT 'aberta', -- 'aberta', 'em_andamento', 'concluida', 'cancelada', 'suspensa'
    data_conclusao DATE,
    motivo_cancelamento TEXT,
    
    -- Documentação
    autorizacao_procura TEXT, -- Art. 725 CC
    documento_autorizacao TEXT,
    data_autorizacao DATE,
    
    -- Entrega
    documentos_entregues TEXT[] DEFAULT '{}',
    data_entrega DATE,
    status_entrega TEXT DEFAULT 'pendente', -- 'pendente', 'bloqueada', 'liberada', 'entregue'
    
    -- Pagamento
    valor_total_servico DECIMAL(15,2) NOT NULL,
    valor_pago DECIMAL(15,2) DEFAULT 0.00,
    status_pagamento TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'parcial', 'atrasado'
    data_pagamento DATE,
    
    -- Bloqueio de Entrega
    bloqueio_entrega BOOLEAN DEFAULT true,
    motivo_bloqueio TEXT DEFAULT 'Aguardando confirmação de pagamento',
    data_liberacao_bloqueio DATE,
    
    -- Hash
    hash_os TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos Técnicos
CREATE TABLE IF NOT EXISTS public.documentos_tecnicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    profissional_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Tipo de Documento
    tipo_documento TEXT NOT NULL, -- 'parecer', 'relatorio', 'laudo', 'pericia', 'avaliacao'
    titulo_documento TEXT NOT NULL,
    
    -- Conteúdo
    conteudo_documento TEXT,
    resumo_documento TEXT,
    conclusoes TEXT,
    recomendacoes TEXT,
    
    -- Metodologia
    metodologia_utilizada TEXT,
    fontes_consultadas TEXT[] DEFAULT '{}',
    
    -- Valores
    valor_avaliado DECIMAL(15,2) DEFAULT 0.00,
    valor_mercado DECIMAL(15,2) DEFAULT 0.00,
    valor_venal DECIMAL(15,2) DEFAULT 0.00,
    
    -- Anexos
    arquivos_anexos TEXT[] DEFAULT '{}',
    imagens_anexas TEXT[] DEFAULT '{}',
    videos_anexos TEXT[] DEFAULT '{}',
    
    -- Status
    status_documento TEXT DEFAULT 'em_elaboracao', -- 'em_elaboracao', 'revisao', 'aprovado', 'bloqueado', 'liberado'
    data_conclusao DATE,
    data_aprovacao DATE,
    
    -- Bloqueio de Entrega
    bloqueio_entrega BOOLEAN DEFAULT true,
    motivo_bloqueio TEXT DEFAULT 'Aguardando confirmação de pagamento',
    data_liberacao_bloqueio DATE,
    
    -- Assinatura Digital
    assinatura_digital TEXT,
    hash_assinatura TEXT,
    data_assinatura DATE,
    
    -- Hash
    hash_documento TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DIVISÃO DE HONORÁRIOS (MATCH DE LOCAÇÃO)
-- =====================================================

-- Divisão de Honorários de Locação
CREATE TABLE IF NOT EXISTS public.divisao_honorarios_locacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamento
    contrato_locacao_id UUID REFERENCES public.contratos_locacao(id) ON DELETE CASCADE,
    
    -- Honorários Totais
    valor_total_honorarios DECIMAL(15,2) NOT NULL,
    base_calculo_honorarios TEXT NOT NULL, -- 'valor_aluguel', 'valor_total'
    
    -- Participantes
    corretor_captador_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    corretor_locador_id UUID REFERENCES public.brokers(id) ON DELETE NULL,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE SET NULL,
    
    -- Divisão Padrão (Nota 4 da Tabela)
    divisao_padrao BOOLEAN DEFAULT true, -- true = partes iguais
    ajuste_escrito BOOLEAN DEFAULT false,
    
    -- Percentuais de Divisão
    corretor_captador_percent DECIMAL(5,2) DEFAULT 50.0,
    corretor_locador_percent DECIMAL(5,2) DEFAULT 50.0,
    imobiliaria_percent DECIMAL(5,2) DEFAULT 0.0,
    
    -- Valores Calculados
    corretor_captador_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total_honorarios * corretor_captador_percent / 100) STORED,
    corretor_locador_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total_honorarios * corretor_locador_percent / 100) STORED,
    imobiliaria_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total_honorarios * imobiliaria_percent / 100) STORED,
    
    -- Ajuste Escrito
    motivo_ajuste TEXT,
    documento_ajuste TEXT,
    data_ajuste DATE,
    
    -- Status
    status_divisao TEXT DEFAULT 'pendente', -- 'pendente', 'calculada', 'aprovada', 'distribuida'
    data_calculo DATE,
    data_distribuicao DATE,
    
    -- Comprovação
    comprovante_distribuicao TEXT[] DEFAULT '{}',
    
    -- Hash
    hash_divisao TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_total_percent CHECK (corretor_captador_percent + corretor_locador_percent + imobiliaria_percent = 100.0)
);

-- =====================================================
-- PROPÓSITO SOCIAL (REVISÃO V27)
-- =====================================================

-- Atualização do Tesouro Reino SB para incluir Locação
ALTER TABLE public.tesouro_reino_sb 
ADD COLUMN IF NOT EXISTS faturamento_vendas DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS faturamento_locacoes DECIMAL(15,2) DEFAULT 0.00,
DROP COLUMN IF EXISTS faturamento_bruto,
ADD COLUMN faturamento_bruto DECIMAL(15,2) GENERATED ALWAYS AS (faturamento_vendas + faturamento_locacoes) STORED;

-- View atualizada para incluir locação
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
    COUNT(DISTINCT CASE WHEN lts.visibilidade_publica = true THEN lts.id END) as total_logs_publicos,
    COUNT(DISTINCT cl.id) as total_contratos_locacao,
    COUNT(DISTINCT CASE WHEN cl.status_contrato = 'ativo' THEN cl.id END) as total_contratos_ativos,
    COALESCE(SUM(cl.valor_honorarios), 0) as total_honorarios_locacao
FROM public.tesouro_reino_sb tr
LEFT JOIN public.projetos_sociais ps ON tr.mes_referencia BETWEEN ps.data_inicio_planejado AND COALESCE(ps.data_fim_real, ps.data_fim_planejado)
LEFT JOIN public.servicos_pro_bono sp ON true
LEFT JOIN public.selos_parceiro_solidario sps ON true
LEFT JOIN public.logs_transparencia_social lts ON true
LEFT JOIN public.contratos_locacao cl ON DATE_TRUNC('month', cl.created_at)::DATE = tr.mes_referencia
GROUP BY tr.id, tr.mes_referencia, tr.faturamento_vendas, tr.faturamento_locacoes, tr.faturamento_bruto, tr.custos_operacionais, tr.splits_distribuidos, tr.faturamento_liquido, tr.percentual_contribuicao, tr.valor_contribuicao, tr.status_contribuicao, tr.data_calculo, tr.data_provisionamento, tr.data_destinacao, tr.observacoes, tr.responsavel_calculo_id, tr.hash_tesouro, tr.created_at, tr.updated_at
ORDER BY tr.mes_referencia DESC;

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash da tabela de honorários
CREATE OR REPLACE FUNCTION public.gerar_hash_tabela_honorarios()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_tabela := encode(sha256(
        NEW.tipo_servico || 
        NEW.subtipo_servico || 
        NEW.percentual_padrao::TEXT || 
        NEW.base_calculo || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_tabela_honorarios
    BEFORE INSERT ON public.tabela_honorarios_creci
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_tabela_honorarios();

-- Trigger para gerar hash de contrato de locação
CREATE OR REPLACE FUNCTION public.gerar_hash_contrato_locacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_contrato := encode(sha256(
        NEW.numero_contrato || 
        NEW.proprietario_id::TEXT || 
        NEW.locatario_id::TEXT || 
        NEW.valor_aluguel::TEXT || 
        NEW.percentual_honorarios::TEXT || 
        NEW.data_inicio_contrato::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_contrato_locacao
    BEFORE INSERT ON public.contratos_locacao
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_contrato_locacao();

-- Trigger para gerar hash de check-in geofencing
CREATE OR REPLACE FUNCTION public.gerar_hash_checkin_geofencing()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar timestamp SHA-256
    NEW.hash_timestamp := encode(sha256(
        NEW.usuario_id::TEXT || 
        NEW.tipo_acesso || 
        NEW.latitude::TEXT || 
        NEW.longitude::TEXT || 
        NEW.data_hora_acesso::TEXT
    ), 'hex');
    
    -- Gerar hash completo
    NEW.hash_checkin := encode(sha256(
        NEW.usuario_id::TEXT || 
        NEW.tipo_acesso || 
        NEW.latitude::TEXT || 
        NEW.longitude::TEXT || 
        NEW.data_hora_acesso::TEXT || 
        NEW.foto_usuario || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_checkin_geofencing
    BEFORE INSERT ON public.checkin_geofencing
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_checkin_geofencing();

-- Trigger para gerar hash de vistoria auditada
CREATE OR REPLACE FUNCTION public.gerar_hash_vistoria_auditada()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_vistoria := encode(sha256(
        NEW.contrato_locacao_id::TEXT || 
        NEW.tipo_vistoria || 
        NEW.data_vistoria::TEXT || 
        NEW.vistoriador_id::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    IF NEW.laudo_vistoria IS NOT NULL THEN
        NEW.hash_laudos := encode(sha256(
            NEW.laudo_vistoria || 
            NEW.data_laudo::TEXT || 
            NEW.created_at::TEXT
        ), 'hex');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_vistoria_auditada
    BEFORE INSERT OR UPDATE ON public.vistoria_auditada
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_vistoria_auditada();

-- Trigger para gerar hash de ordem de serviço
CREATE OR REPLACE FUNCTION public.gerar_hash_ordem_servico()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_os := encode(sha256(
        NEW.numero_os || 
        NEW.tipo_servico || 
        NEW.cliente_id::TEXT || 
        NEW.valor_honorario::TEXT || 
        NEW.data_solicitacao::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_ordem_servico
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_ordem_servico();

-- Trigger para gerar hash de documento técnico
CREATE OR REPLACE FUNCTION public.gerar_hash_documento_tecnico()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_documento := encode(sha256(
        NEW.ordem_servico_id::TEXT || 
        NEW.tipo_documento || 
        NEW.titulo_documento || 
        NEW.conteudo_documento || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_documento_tecnico
    BEFORE INSERT ON public.documentos_tecnicos
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_documento_tecnico();

-- Trigger para gerar hash de divisão de honorários
CREATE OR REPLACE FUNCTION public.gerar_hash_divisao_honorarios_locacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_divisao := encode(sha256(
        NEW.contrato_locacao_id::TEXT || 
        NEW.valor_total_honorarios::TEXT || 
        NEW.corretor_captador_percent::TEXT || 
        NEW.corretor_locador_percent::TEXT || 
        NEW.imobiliaria_percent::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_divisao_honorarios_locacao
    BEFORE INSERT ON public.divisao_honorarios_locacao
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_divisao_honorarios_locacao();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO
-- =====================================================

-- Função para consultar honorários CRECI
CREATE OR REPLACE FUNCTION public.consultar_honorarios_creci(
    p_tipo_servico TEXT,
    p_subtipo_servico TEXT,
    p_valor_transacao DECIMAL DEFAULT 0.00,
    p_valor_condicao DECIMAL DEFAULT 0.00
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    honorario RECORD;
    valor_calculado DECIMAL;
    valor_final DECIMAL;
BEGIN
    -- Buscar honorários na tabela
    SELECT * INTO honorario
    FROM public.tabela_honorarios_creci
    WHERE tipo_servico = p_tipo_servico
    AND subtipo_servico = p_subtipo_servico
    AND status_tabela = 'ativa'
    AND (data_vigencia_fim IS NULL OR data_vigencia_fim >= CURRENT_DATE)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Honorários não encontrados para o tipo de serviço'
        );
    END IF;
    
    -- Calcular valor baseado no tipo de serviço
    CASE honorario.base_calculo
        WHEN 'valor_imovel' THEN
            valor_calculado := p_valor_transacao * honorario.percentual_padrao / 100;
        WHEN 'valor_aluguel' THEN
            valor_calculado := p_valor_transacao * honorario.percentual_padrao / 100;
        WHEN 'valor_transacao' THEN
            valor_calculado := p_valor_transacao * honorario.percentual_padrao / 100;
        WHEN 'anuidade_creci' THEN
            valor_calculado := honorario.valor_padrao;
        ELSE
            valor_calculado := honorario.valor_padrao;
    END CASE;
    
    -- Aplicar condições especiais
    IF honorario.condicao_especial IS NOT NULL THEN
        IF honorario.condicao_especial LIKE '%carteira%' AND p_valor_condicao > 100000 THEN
            valor_calculado := p_valor_transacao * 5.0 / 100; -- 5% para carteiras > R$ 100k/mês
        ELSIF honorario.condicao_especial LIKE '%mínimo%' AND valor_calculado < honorario.valor_minimo THEN
            valor_calculado := honorario.valor_minimo;
        END IF;
    END IF;
    
    -- Aplicar valor mínimo se existir
    IF honorario.valor_minimo > 0 AND valor_calculado < honorario.valor_minimo THEN
        valor_calculado := honorario.valor_minimo;
    END IF;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'tipo_servico', honorario.tipo_servico,
        'subtipo_servico', honorario.subtipo_servico,
        'percentual_minimo', honorario.percentual_minimo,
        'percentual_maximo', honorario.percentual_maximo,
        'percentual_aplicado', honorario.percentual_padrao,
        'valor_minimo', honorario.valor_minimo,
        'valor_calculado', valor_calculado,
        'base_calculo', honorario.base_calculo,
        'condicao_especial', honorario.condicao_especial,
        'nota_referencia', honorario.nota_referencia
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular divisão de honorários de locação
CREATE OR REPLACE FUNCTION public.calcular_divisao_honorarios_locacao(
    p_contrato_locacao_id UUID,
    p_ajuste_escrito BOOLEAN DEFAULT false,
    p_corretor_captador_percent DECIMAL DEFAULT 50.0,
    p_corretor_locador_percent DECIMAL DEFAULT 50.0,
    p_imobiliaria_percent DECIMAL DEFAULT 0.0
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    contrato RECORD;
    divisao_id UUID;
    total_percent DECIMAL;
BEGIN
    -- Buscar dados do contrato
    SELECT * INTO contrato
    FROM public.contratos_locacao
    WHERE id = p_contrato_locacao_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Contrato de locação não encontrado'
        );
    END IF;
    
    -- Validar percentuais
    total_percent := p_corretor_captador_percent + p_corretor_locador_percent + p_imobiliaria_percent;
    IF total_percent != 100.0 THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Percentuais devem somar 100%'
        );
    END IF;
    
    -- Inserir divisão de honorários
    INSERT INTO public.divisao_honorarios_locacao (
        contrato_locacao_id,
        valor_total_honorarios,
        base_calculo_honorarios,
        corretor_captador_id,
        corretor_locador_id,
        imobiliaria_id,
        divisao_padrao,
        ajuste_escrito,
        corretor_captador_percent,
        corretor_locador_percent,
        imobiliaria_percent,
        status_divisao,
        data_calculo
    ) VALUES (
        p_contrato_locacao_id,
        contrato.valor_honorarios,
        'valor_aluguel',
        contrato.corretor_captador_id,
        contrato.corretor_locador_id,
        contrato.imobiliaria_id,
        NOT p_ajuste_escrito,
        p_ajuste_escrito,
        p_corretor_captador_percent,
        p_corretor_locador_percent,
        p_imobiliaria_percent,
        'calculada',
        CURRENT_DATE
    )
    RETURNING id INTO divisao_id;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'divisao_id', divisao_id,
        'contrato_id', p_contrato_locacao_id,
        'valor_total_honorarios', contrato.valor_honorarios,
        'divisao_padrao', NOT p_ajuste_escrito,
        'ajuste_escrito', p_ajuste_escrito,
        'corretor_captador_percent', p_corretor_captador_percent,
        'corretor_locador_percent', p_corretor_locador_percent,
        'imobiliaria_percent', p_imobiliaria_percent,
        'corretor_captador_valor', contrato.valor_honorarios * p_corretor_captador_percent / 100,
        'corretor_locador_valor', contrato.valor_honorarios * p_corretor_locador_percent / 100,
        'imobiliaria_valor', contrato.valor_honorarios * p_imobiliaria_percent / 100,
        'mensagem', 'Divisão de honorários calculada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar contribuição social atualizada (Venda + Locação)
CREATE OR REPLACE FUNCTION public.processar_contribuicao_social_v28(
    p_mes_referencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    tesouro_id UUID;
    faturamento_vendas DECIMAL;
    faturamento_locacoes DECIMAL;
    custos_operacionais DECIMAL;
    splits_distribuidos DECIMAL;
    valor_contribuicao DECIMAL;
BEGIN
    -- Calcular faturamento de vendas
    SELECT COALESCE(SUM(total_faturamento), 0) INTO faturamento_vendas
    FROM public.dashboard_master_monetizacao
    WHERE mes_referencia = p_mes_referencia;
    
    -- Calcular faturamento de locações
    SELECT COALESCE(SUM(valor_honorarios), 0) INTO faturamento_locacoes
    FROM public.contratos_locacao
    WHERE DATE_TRUNC('month', created_at)::DATE = p_mes_referencia;
    
    -- Calcular custos operacionais do mês
    SELECT COALESCE(SUM(custos_operacionais), 0) INTO custos_operacionais
    FROM public.dashboard_master_monetografia
    WHERE mes_referencia = p_mes_referencia;
    
    -- Calcular splits distribuídos do mês
    SELECT COALESCE(SUM(valor_total), 0) INTO splits_distribuidos
    FROM public.split_4_vias
    WHERE DATE_TRUNC('month', created_at)::DATE = p_mes_referencia;
    
    -- Inserir ou atualizar tesouro
    INSERT INTO public.tesouro_reino_sb (
        mes_referencia,
        faturamento_vendas,
        faturamento_locacoes,
        custos_operacionais,
        splits_distribuidos,
        status_contribuicao,
        data_provisionamento
    ) VALUES (
        p_mes_referencia,
        faturamento_vendas,
        faturamento_locacoes,
        custos_operacionais,
        splits_distribuidos,
        'provisionado',
        CURRENT_DATE
    )
    ON CONFLICT (mes_referencia)
    DO UPDATE SET
        faturamento_vendas = EXCLUDED.faturamento_vendas,
        faturamento_locacoes = EXCLUDED.faturamento_locacoes,
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
        'faturamento_vendas', faturamento_vendas,
        'faturamento_locacoes', faturamento_locacoes,
        'faturamento_bruto', faturamento_vendas + faturamento_locacoes,
        'custos_operacionais', custos_operacionais,
        'splits_distribuidos', splits_distribuidos,
        'faturamento_liquido', (faturamento_vendas + faturamento_locacoes) - custos_operacionais - splits_distribuidos,
        'valor_contribuicao', valor_contribuicao,
        'mensagem', 'Contribuição social V28 processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tabela_honorarios_tipo ON public.tabela_honorarios_creci(tipo_servico, subtipo_servico);
CREATE INDEX IF NOT EXISTS idx_tabela_honorarios_status ON public.tabela_honorarios_creci(status_tabela, data_vigencia_inicio);
CREATE INDEX IF NOT EXISTS idx_contratos_locacao_numero ON public.contratos_locacao(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_locacao_status ON public.contratos_locacao(status_contrato, data_inicio_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_locacao_imovel ON public.contratos_locacao(imovel_id);
CREATE INDEX IF NOT EXISTS idx_contratos_locacao_partes ON public.contratos_locacao(proprietario_id, locatario_id);
CREATE INDEX IF NOT EXISTS idx_checkin_geofencing_usuario ON public.checkin_geofencing(usuario_id, data_hora_acesso);
CREATE INDEX IF NOT EXISTS idx_checkin_geofencing_tipo ON public.checkin_geofencing(tipo_acesso, status_reconhecimento);
CREATE INDEX IF NOT EXISTS idx_vistoria_auditada_contrato ON public.vistoria_auditada(contrato_locacao_id);
CREATE INDEX IF NOT EXISTS idx_vistoria_auditada_data ON public.vistoria_auditada(data_vistoria);
CREATE INDEX IF NOT EXISTS idx_seguros_imobiliarios_apolice ON public.seguros_imobiliarios(apolice_numero);
CREATE INDEX IF NOT EXISTS idx_seguros_imobiliarios_contrato ON public.seguros_imobiliarios(contrato_locacao_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON public.ordens_servico(numero_os);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status_os, data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente ON public.ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_os ON public.documentos_tecnicos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_status ON public.documentos_tecnicos(status_documento, bloqueio_entrega);
CREATE INDEX IF NOT EXISTS idx_divisao_honorarios_contrato ON public.divisao_honorarios_locacao(contrato_locacao_id);
CREATE INDEX IF NOT EXISTS idx_divisao_honorarios_status ON public.divisao_honorarios_locacao(status_divisao, data_calculo);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Tabela Referencial de Honorários CRECI
INSERT INTO public.tabela_honorarios_creci (
    tipo_servico,
    subtipo_servico,
    percentual_minimo,
    percentual_maximo,
    percentual_padrao,
    valor_minimo,
    base_calculo,
    condicao_especial,
    nota_referencia,
    observacoes
) VALUES
-- Venda
('venda', 'urbana', 6.0, 8.0, 6.0, 0.00, 'valor_imovel', NULL, 'Tabela CRECI - Venda Urbana', 'Honorários para venda de imóveis urbanos'),
('venda', 'rural', 8.0, 10.0, 8.0, 0.00, 'valor_imovel', NULL, 'Tabela CRECI - Venda Rural', 'Honorários para venda de imóveis rurais'),
('venda', 'judicial', 5.0, 5.0, 5.0, 0.00, 'valor_imovel', NULL, 'Tabela CRECI - Venda Judicial', 'Honorários para venda judicial de imóveis'),

-- Locação
('locacao', 'tradicional', 100.0, 100.0, 100.0, 0.00, 'valor_aluguel', NULL, 'Nota 4 da Tabela: Partes iguais, salvo ajuste escrito no App', '1 aluguel para locação tradicional'),
('locacao', 'temporada', 30.0, 30.0, 30.0, 0.00, 'valor_aluguel', 'Temporada até 90 dias', 'Nota 4 da Tabela: Partes iguais, salvo ajuste escrito no App', '30% do valor para temporada até 90 dias'),

-- Administração
('administracao', 'carteira', 5.0, 10.0, 8.0, 0.00, 'valor_aluguel', 'para carteiras > R$ 100k/mês', 'Administração de carteiras de aluguel', '8% a 10% ou 5% a 10% para carteiras > R$ 100k/mês'),
('administracao', 'padrao', 8.0, 10.0, 8.0, 0.00, 'valor_aluguel', NULL, 'Administração padrão de imóveis', '8% a 10% para administração padrão'),

-- Pareceres
('parecer', 'escrito', 1.0, 1.0, 1.0, 650.00, 'valor_transacao', 'mínimo R$ 650,00', 'Tabela CRECI - Parecer Escrito', '1% com mínimo de R$ 650,00 para parecer escrito'),
('parecer', 'verbal', 0.0, 0.0, 0.0, 0.00, 'anuidade_creci', '1 anuidade CRECI para verbal', 'Tabela CRECI - Parecer Verbal', '1 anuidade CRECI para parecer verbal');

-- Inserir seguradora padrão
INSERT INTO public.seguradoras (id, nome_fantasia, razao_social, cnpj, status_seguradora) VALUES
(uuid_generate_v4(), 'SB Seguros', 'SB Seguros Imobiliários Ltda', '12345678901234', 'ativa')
ON CONFLICT DO NOTHING;

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V28 - ASSET MANAGEMENT & HONORÁRIOS CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.tabela_honorarios_creci) as total_honorarios_creci,
       (SELECT COUNT(*) FROM public.contratos_locacao) as total_contratos_locacao,
       (SELECT COUNT(*) FROM public.checkin_geofencing) as total_checkins,
       (SELECT COUNT(*) FROM public.vistoria_auditada) as total_vistorias,
       (SELECT COUNT(*) FROM public.seguros_imobiliarios) as total_seguros,
       (SELECT COUNT(*) FROM public.ordens_servico) as total_ordens_servico,
       (SELECT COUNT(*) FROM public.documentos_tecnicos) as total_documentos_tecnicos,
       (SELECT COUNT(*) FROM public.divisao_honorarios_locacao) as total_divisoes_honorarios;
