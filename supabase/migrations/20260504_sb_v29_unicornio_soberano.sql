-- 🦄 SECURITY BROKER SB v29 - O UNICÓRNIO SOBERANO
-- Schema completo para Controle de Ecossistema e Fusão Final de Todos os Módulos

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- YARA PREDICTIVE (PUDDING AI LAYER)
-- =====================================================

-- Motor de Deep Intent para Processamento de Pedidos Complexos
CREATE TABLE IF NOT EXISTS public.deep_intent_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    request_id TEXT UNIQUE NOT NULL,
    investor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    tipo_investidor TEXT NOT NULL, -- 'high_net_worth', 'institutional', 'retail', 'family_office'
    
    -- Deep Intent Analysis
    intent_primary TEXT NOT NULL, -- 'roi_analysis', 'solo_land', 'zoning_analysis', 'portfolio_optimization'
    intent_secondary TEXT[] DEFAULT '{}',
    complexity_level INTEGER DEFAULT 1, -- 1-10
    
    -- Parâmetros do Pedido
    parameters JSONB DEFAULT '{}',
    investment_amount DECIMAL(15,2) DEFAULT 0.00,
    target_roi DECIMAL(5,2) DEFAULT 0.00,
    risk_tolerance TEXT DEFAULT 'moderate', -- 'conservative', 'moderate', 'aggressive'
    
    -- Análise AI
    ai_processed BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    ai_recommendations JSONB DEFAULT '{}',
    ai_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Resultados
    processed_at TIMESTAMPTZ,
    response_data JSONB DEFAULT '{}',
    matching_opportunities UUID[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_request TEXT UNIQUE
);

-- AVM (Automated Valuation Model) para Precificação Instantânea
CREATE TABLE IF NOT EXISTS public.avm_valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    property_id UUID REFERENCES public.unidades_projetos(id) ON DELETE CASCADE,
    valuation_id TEXT UNIQUE NOT NULL,
    valuation_type TEXT NOT NULL, -- 'urban', 'rural', 'commercial', 'industrial'
    
    -- Dados do Imóvel
    property_type TEXT NOT NULL, -- 'apartment', 'house', 'land', 'commercial', 'rural'
    area_total DECIMAL(10,2) NOT NULL,
    area_util DECIMAL(10,2) DEFAULT 0.00,
    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    parking_spaces INTEGER DEFAULT 0,
    
    -- Localização
    address TEXT NOT NULL,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    coordinates POINT,
    
    -- Valores AVM
    market_value DECIMAL(15,2) NOT NULL,
    min_value DECIMAL(15,2) NOT NULL,
    max_value DECIMAL(15,2) NOT NULL,
    confidence_level DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    
    -- Comparações
    comparable_properties UUID[] DEFAULT '{}',
    comparable_count INTEGER DEFAULT 0,
    avg_price_per_sqm DECIMAL(10,2) DEFAULT 0.00,
    
    -- Ajustes
    location_adjustment DECIMAL(5,2) DEFAULT 0.00,
    condition_adjustment DECIMAL(5,2) DEFAULT 0.00,
    market_adjustment DECIMAL(5,2) DEFAULT 0.00,
    
    -- Status
    valuation_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
    valuation_date DATE DEFAULT CURRENT_DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_valuation TEXT UNIQUE
);

-- Lookalike para Investidores de Alta Renda
CREATE TABLE IF NOT EXISTS public.investor_lookalike (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    source_investor_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    lookalike_group_id UUID NOT NULL,
    
    -- Perfil de Alta Renda
    income_bracket TEXT NOT NULL, -- '100k-250k', '250k-500k', '500k-1M', '1M+'
    net_worth_range TEXT NOT NULL, -- '1M-5M', '5M-10M', '10M-50M', '50M+'
    investment_capacity DECIMAL(15,2) NOT NULL,
    
    -- Comportamento
    investment_preferences TEXT[] DEFAULT '{}',
    risk_profile TEXT DEFAULT 'moderate',
    investment_horizon TEXT DEFAULT 'medium_term', -- 'short_term', 'medium_term', 'long_term'
    
    -- Localização
    primary_location POINT NOT NULL,
    search_radius_km INTEGER DEFAULT 5,
    preferred_neighborhoods TEXT[] DEFAULT '{}',
    
    -- Matching Score
    lookalike_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    similarity_factors JSONB DEFAULT '{}',
    
    -- Oportunidades
    matched_opportunities UUID[] DEFAULT '{}',
    contact_attempts INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Status
    lookalike_status TEXT DEFAULT 'active', -- 'active', 'paused', 'converted', 'declined'
    last_contact_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_lookalike TEXT UNIQUE
);

-- =====================================================
-- BIOMETRIA FACIAL 3D & NEXO CAUSAL (ART. 725 CC)
-- =====================================================

-- Biometria Facial 3D
CREATE TABLE IF NOT EXISTS public.biometria_facial_3d (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    user_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    biometric_id TEXT UNIQUE NOT NULL,
    
    -- Dados Biométricos 3D
    face_model_3d TEXT, -- Armazenamento do modelo 3D
    face_scan_data JSONB DEFAULT '{}',
    facial_landmarks JSONB DEFAULT '{}',
    face_vector DECIMAL[] DEFAULT '{}',
    
    -- Validação
    verification_confidence DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    liveness_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    anti_spoofing_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    
    -- Status
    biometric_status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'revoked'
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    last_verification TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_biometric TEXT UNIQUE
);

-- Nexo Causal (Art. 725 CC) com Hash SHA-256
CREATE TABLE IF NOT EXISTS public.nexo_causal_art725 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    nexo_id TEXT UNIQUE NOT NULL,
    contract_id UUID REFERENCES public.contratos_locacao(id) ON DELETE CASCADE,
    service_order_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Art. 725 CC
    authorization_type TEXT NOT NULL, -- 'procura', 'servico', 'ambos'
    authorization_scope TEXT NOT NULL, -- 'especific', 'geral', 'limitado'
    authorization_duration INTEGER DEFAULT 365, -- dias
    
    -- Documento Legal
    authorization_document TEXT,
    document_hash TEXT NOT NULL,
    digital_signature TEXT,
    signature_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Interações com Hash
    interaction_logs JSONB DEFAULT '{}', -- Todas as interações com hash
    chat_interactions UUID[] DEFAULT '{}',
    visit_interactions UUID[] DEFAULT '{}',
    payment_interactions UUID[] DEFAULT '{}',
    
    -- Validação
    verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'expired'
    verification_date TIMESTAMPTZ,
    verification_method TEXT, -- 'biometric', 'digital', 'manual'
    
    -- Status
    nexo_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'revoked', 'expired'
    expiry_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_nexo TEXT UNIQUE
);

-- =====================================================
-- FINTECH & REVENUE STACK (12 FRENTES)
-- =====================================================

-- Split Financeiro Unificado
CREATE TABLE IF NOT EXISTS public.revenue_stack_unified (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    transaction_id TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'revenue', 'expense', 'split'
    
    -- 12 Fronts de Revenue
    front_1_venda_match DECIMAL(15,2) DEFAULT 0.00,
    front_2_recorrencia_5x5 DECIMAL(15,2) DEFAULT 0.00,
    front_3_short_stay DECIMAL(15,2) DEFAULT 0.00,
    front_4_administracao DECIMAL(15,2) DEFAULT 0.00,
    front_5_marketplace_servicos DECIMAL(15,2) DEFAULT 0.00,
    front_6_land_banking DECIMAL(15,2) DEFAULT 0.00,
    front_7_equity_fundo DECIMAL(15,2) DEFAULT 0.00,
    front_8_selo_juris DECIMAL(15,2) DEFAULT 0.00,
    front_9_data_sub DECIMAL(15,2) DEFAULT 0.00,
    front_10_antecipacao DECIMAL(15,2) DEFAULT 0.00,
    front_11_seguros DECIMAL(15,2) DEFAULT 0.00,
    front_12_financiamento_bancario DECIMAL(15,2) DEFAULT 0.00,
    
    -- Totais
    total_revenue DECIMAL(15,2) GENERATED ALWAYS AS (
        front_1_venda_match + front_2_recorrencia_5x5 + front_3_short_stay + 
        front_4_administracao + front_5_marketplace_servicos + front_6_land_banking + 
        front_7_equity_fundo + front_8_selo_juris + front_9_data_sub + 
        front_10_antecipacao + front_11_seguros + front_12_financiamento_bancario
    ) STORED,
    
    -- Split para Corretores Autônomos (Regra 70/30)
    autonomous_broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    split_70_percent DECIMAL(15,2) DEFAULT 0.00,
    split_30_percent DECIMAL(15,2) DEFAULT 0.00,
    split_withdrawal_status TEXT DEFAULT 'available', -- 'available', 'withdrawn', 'blocked'
    
    -- Status
    transaction_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_transaction TEXT UNIQUE
);

-- =====================================================
-- WHITE LABEL & GOVERNANÇA (6% a 10%)
-- =====================================================

-- Imobiliárias Sócias com Autonomia
CREATE TABLE IF NOT EXISTS public.imobiliarias_socias_v29 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    partnership_level TEXT NOT NULL, -- 'basic', 'premium', 'enterprise', 'strategic'
    
    -- Autonomia de Gestão
    management_autonomy BOOLEAN DEFAULT true,
    independent_operations BOOLEAN DEFAULT true,
    custom_branding BOOLEAN DEFAULT false,
    
    -- Royalties Tecnológicos para SB
    royalty_percentage DECIMAL(5,2) NOT NULL, -- 6% a 10%
    royalty_base TEXT NOT NULL, -- 'revenue', 'profit', 'gross'
    royalty_payment_terms TEXT DEFAULT 'monthly',
    
    -- Roleta de Leads Yara
    lead_distribution_enabled BOOLEAN DEFAULT true,
    meritocratic_scoring BOOLEAN DEFAULT true,
    lead_score_weight DECIMAL(5,2) DEFAULT 50.0, -- peso do score na roleta
    
    -- Configurações
    max_leads_per_month INTEGER DEFAULT 100,
    lead_conversion_target DECIMAL(5,2) DEFAULT 20.0, -- %
    performance_threshold DECIMAL(5,2) DEFAULT 80.0, -- %
    
    -- Métricas
    total_leads_received INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Status
    partnership_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'terminated'
    partnership_start_date DATE DEFAULT CURRENT_DATE,
    partnership_end_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_partnership TEXT UNIQUE
);

-- Roleta de Leads Yara com Distribuição Meritocrática
CREATE TABLE IF NOT EXISTS public.roleta_leads_yara_v29 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    lead_id UUID REFERENCES public.leads_imobiliaria(id) ON DELETE CASCADE,
    imobiliaria_id UUID REFERENCES public.imobiliarias_parceiras(id) ON DELETE CASCADE,
    
    -- Scoring Meritocrático
    performance_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    conversion_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    response_time_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    quality_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
    
    -- Score Composto
    composite_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (performance_score * 0.4 + conversion_score * 0.3 + 
         response_time_score * 0.2 + quality_score * 0.1)
    ) STORED,
    
    -- Distribuição
    roulette_weight DECIMAL(5,2) DEFAULT 50.0, -- peso na roleta
    distribution_priority INTEGER DEFAULT 1, -- 1-10
    last_distributed_at TIMESTAMPTZ,
    
    -- Resultados
    lead_status TEXT DEFAULT 'pending', -- 'pending', 'distributed', 'accepted', 'rejected', 'converted'
    distribution_date TIMESTAMPTZ,
    response_date TIMESTAMPTZ,
    conversion_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_distribution TEXT UNIQUE
);

-- =====================================================
-- REINO SB (PROPÓSITO 1%) - VERSÃO FINAL
-- =====================================================

-- Tesouro Reino SB V29 (Consolidado)
CREATE TABLE IF NOT EXISTS public.tesouro_reino_sb_v29 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    mes_referencia DATE UNIQUE NOT NULL,
    
    -- Faturamento Consolidado (12 Fronts)
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
    
    -- Totais
    faturamento_bruto_total DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_venda_match + faturamento_recorrencia_5x5 + faturamento_short_stay + 
        faturamento_administracao + faturamento_marketplace_servicos + faturamento_land_banking + 
        faturamento_equity_fundo + faturamento_selo_juris + faturamento_data_sub + 
        faturamento_antecipacao + faturamento_seguros + faturamento_financiamento_bancario
    ) STORED,
    
    -- Deduções
    custos_operacionais DECIMAL(15,2) DEFAULT 0.00,
    splits_distribuidos DECIMAL(15,2) DEFAULT 0.00,
    royalties_pagos DECIMAL(15,2) DEFAULT 0.00,
    
    -- Faturamento Líquido
    faturamento_liquido DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_bruto_total - custos_operacionais - splits_distribuidos - royalties_pagos
    ) STORED,
    
    -- Contribuição Social (1%)
    percentual_contribuicao DECIMAL(5,2) DEFAULT 1.00,
    valor_contribuicao DECIMAL(15,2) GENERATED ALWAYS AS (
        faturamento_liquido * percentual_contribuicao / 100
    ) STORED,
    
    -- Status
    status_contribuicao TEXT DEFAULT 'provisionado', -- 'provisionado', 'destinado', 'auditado'
    data_calculo DATE DEFAULT CURRENT_DATE,
    data_provisionamento DATE,
    data_destinacao DATE,
    
    -- Responsáveis
    responsavel_calculo_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    responsavel_aprovacao_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    
    -- Observações
    observacoes TEXT,
    auditoria_observacoes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_tesouro TEXT UNIQUE
);

-- Dashboard de Transparência para Sócios
CREATE TABLE IF NOT EXISTS public.dashboard_transparencia_socios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    dashboard_id TEXT UNIQUE NOT NULL,
    socio_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Métricas de Impacto Social
    total_contribuicoes DECIMAL(15,2) DEFAULT 0.00,
    total_projetos_financiados INTEGER DEFAULT 0,
    total_pessoas_beneficiadas INTEGER DEFAULT 0,
    total_familias_ajudadas INTEGER DEFAULT 0,
    
    -- Projetos Ativos
    projetos_moradia INTEGER DEFAULT 0,
    projetos_templos INTEGER DEFAULT 0,
    projetos_acolhimento INTEGER DEFAULT 0,
    projetos_praças INTEGER DEFAULT 0,
    projetos_escolas INTEGER DEFAULT 0,
    
    -- Detalhamento de Recursos
    recursos_moradia DECIMAL(15,2) DEFAULT 0.00,
    recursos_templos DECIMAL(15,2) DEFAULT 0.00,
    recursos_acolhimento DECIMAL(15,2) DEFAULT 0.00,
    recursos_praças DECIMAL(15,2) DEFAULT 0.00,
    recursos_escolas DECIMAL(15,2) DEFAULT 0.00,
    
    -- Transparência
    logs_publicos INTEGER DEFAULT 0,
    documentos_verificados INTEGER DEFAULT 0,
    auditorias_realizadas INTEGER DEFAULT 0,
    
    -- Acesso
    ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
    nivel_acesso TEXT DEFAULT 'basico', -- 'basico', 'completo', 'administrativo'
    
    -- Status
    dashboard_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'restricted'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_dashboard TEXT UNIQUE
);

-- =====================================================
-- SUCESSÃO E SEGURANÇA (LGPD)
-- =====================================================

-- Beneficiário de Rede (Herança Digital)
CREATE TABLE IF NOT EXISTS public.beneficiario_rede (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    beneficiario_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    titular_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Herança Digital
    inheritance_type TEXT NOT NULL, -- 'full', 'partial', 'specific'
    inheritance_scope JSONB DEFAULT '{}',
    inheritance_conditions TEXT,
    
    -- Acessos Herdados
    inherited_permissions TEXT[] DEFAULT '{}', -- 'read', 'write', 'admin', 'financial'
    inherited_assets JSONB DEFAULT '{}',
    inherited_contracts UUID[] DEFAULT '{}',
    
    -- Validação
    verification_method TEXT NOT NULL, -- 'document', 'biometric', 'legal', 'blockchain'
    verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    verification_date DATE,
    
    -- Trava LGPD (2 anos)
    lgpd_lock_active BOOLEAN DEFAULT true,
    lgpd_lock_expiry DATE GENERATED ALWAYS AS (
        (CURRENT_DATE + INTERVAL '2 years')
    ) STORED,
    data_ativacao_lock DATE DEFAULT CURRENT_DATE,
    
    -- Criptografia
    encryption_key_id TEXT,
    encrypted_data TEXT,
    decryption_attempts INTEGER DEFAULT 0,
    
    -- Status
    inheritance_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'revoked'
    activation_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hash
    hash_inheritance TEXT UNIQUE
);

-- Chat Interno com Criptografia
CREATE TABLE IF NOT EXISTS public.chat_interno_criptografado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    message_id TEXT UNIQUE NOT NULL,
    chat_room_id UUID NOT NULL,
    sender_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    
    -- Mensagem
    message_content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'file', 'image', 'video'
    
    -- Criptografia
    encryption_method TEXT DEFAULT 'AES-256',
    encryption_key_id TEXT,
    encrypted_content TEXT NOT NULL,
    decryption_key_expires TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 years'),
    
    -- Hash SHA-256 para cada interação
    message_hash TEXT NOT NULL,
    interaction_hash TEXT NOT NULL,
    
    -- Controle LGPD
    lgpd_protected BOOLEAN DEFAULT true,
    auto_delete_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 years'),
    deletion_requested BOOLEAN DEFAULT false,
    
    -- Status
    message_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'deleted'
    read_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Trigger para gerar hash de Deep Intent
CREATE OR REPLACE FUNCTION public.gerar_hash_deep_intent()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_request := encode(sha256(
        NEW.request_id || 
        NEW.investor_id::TEXT || 
        NEW.intent_primary || 
        NEW.parameters::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_deep_intent
    BEFORE INSERT ON public.deep_intent_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_deep_intent();

-- Trigger para gerar hash de AVM
CREATE OR REPLACE FUNCTION public.gerar_hash_avm()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_valuation := encode(sha256(
        NEW.valuation_id || 
        NEW.property_id::TEXT || 
        NEW.property_type || 
        NEW.market_value::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_avm
    BEFORE INSERT ON public.avm_valuations
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_avm();

-- Trigger para gerar hash de Lookalike
CREATE OR REPLACE FUNCTION public.gerar_hash_lookalike()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_lookalike := encode(sha256(
        NEW.source_investor_id::TEXT || 
        NEW.lookalike_group_id::TEXT || 
        NEW.income_bracket || 
        NEW.primary_location::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_lookalike
    BEFORE INSERT ON public.investor_lookalike
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_lookalike();

-- Trigger para gerar hash de Biometria 3D
CREATE OR REPLACE FUNCTION public.gerar_hash_biometria_3d()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_biometric := encode(sha256(
        NEW.user_id::TEXT || 
        NEW.biometric_id || 
        NEW.face_model_3d || 
        NEW.enrollment_date::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_biometria_3d
    BEFORE INSERT ON public.biometria_facial_3d
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_biometria_3d();

-- Trigger para gerar hash de Nexo Causal
CREATE OR REPLACE FUNCTION public.gerar_hash_nexo_causal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_nexo := encode(sha256(
        NEW.nexo_id || 
        NEW.user_id::TEXT || 
        NEW.authorization_type || 
        NEW.document_hash || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_nexo_causal
    BEFORE INSERT ON public.nexo_causal_art725
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_nexo_causal();

-- Trigger para gerar hash de Revenue Stack
CREATE OR REPLACE FUNCTION public.gerar_hash_revenue_stack()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_transaction := encode(sha256(
        NEW.transaction_id || 
        NEW.transaction_date::TEXT || 
        NEW.total_revenue::TEXT || 
        NEW.autonomous_broker_id::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_revenue_stack
    BEFORE INSERT ON public.revenue_stack_unified
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_revenue_stack();

-- Trigger para gerar hash de Tesouro V29
CREATE OR REPLACE FUNCTION public.gerar_hash_tesouro_v29()
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

CREATE TRIGGER trigger_gerar_hash_tesouro_v29
    BEFORE INSERT ON public.tesouro_reino_sb_v29
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_tesouro_v29();

-- Trigger para gerar hash de Dashboard Transparência
CREATE OR REPLACE FUNCTION public.gerar_hash_dashboard_transparencia()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_dashboard := encode(sha256(
        NEW.dashboard_id || 
        NEW.socio_id::TEXT || 
        NEW.total_contribuicoes::TEXT || 
        NEW.total_projetos_financiados::TEXT || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_dashboard_transparencia
    BEFORE INSERT ON public.dashboard_transparencia_socios
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_dashboard_transparencia();

-- Trigger para gerar hash de Beneficiário de Rede
CREATE OR REPLACE FUNCTION public.gerar_hash_beneficiario_rede()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hash_inheritance := encode(sha256(
        NEW.beneficiario_id::TEXT || 
        NEW.titular_id::TEXT || 
        NEW.inheritance_type || 
        NEW.verification_status || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_beneficiario_rede
    BEFORE INSERT ON public.beneficiario_rede
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_beneficiario_rede();

-- Trigger para gerar hash de Chat Interno
CREATE OR REPLACE FUNCTION public.gerar_hash_chat_interno()
RETURNS TRIGGER AS $$
BEGIN
    NEW.message_hash := encode(sha256(
        NEW.message_id || 
        NEW.sender_id::TEXT || 
        NEW.recipient_id::TEXT || 
        NEW.message_content || 
        NEW.created_at::TEXT
    ), 'hex');
    
    NEW.interaction_hash := encode(sha256(
        NEW.chat_room_id || 
        NEW.sender_id::TEXT || 
        NEW.encrypted_content || 
        NEW.created_at::TEXT
    ), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_gerar_hash_chat_interno
    BEFORE INSERT ON public.chat_interno_criptografado
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_hash_chat_interno();

-- =====================================================
-- FUNÇÕES DE NEGÓCIO AVANÇADAS
-- =====================================================

-- Função para processar Deep Intent
CREATE OR REPLACE FUNCTION public.processar_deep_intent(
    p_request_id TEXT,
    p_investor_id UUID,
    p_intent_primary TEXT,
    p_parameters JSONB DEFAULT '{}',
    p_investment_amount DECIMAL DEFAULT 0.00
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    request_record RECORD;
BEGIN
    -- Inserir request
    INSERT INTO public.deep_intent_requests (
        request_id,
        investor_id,
        intent_primary,
        parameters,
        investment_amount,
        ai_processed,
        ai_confidence,
        ai_score,
        processed_at
    ) VALUES (
        p_request_id,
        p_investor_id,
        p_intent_primary,
        p_parameters,
        p_investment_amount,
        true,
        95.50,
        88.75,
        NOW()
    )
    RETURNING * INTO request_record;
    
    -- Processar com AI (simulado)
    resultado := jsonb_build_object(
        'sucesso', true,
        'request_id', request_record.id,
        'intent_primary', request_record.intent_primary,
        'ai_confidence', request_record.ai_confidence,
        'ai_score', request_record.ai_score,
        'recommendations', jsonb_build_object(
            'investment_type', 'high_yield_fund',
            'risk_level', 'moderate',
            'expected_roi', 12.5,
            'time_horizon', '36_months'
        ),
        'matching_opportunities', ARRAY[uuid_generate_v4(), uuid_generate_v4()],
        'processed_at', request_record.processed_at
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para AVM instantâneo
CREATE OR REPLACE FUNCTION public.avm_instantaneo(
    p_property_id UUID,
    p_property_type TEXT,
    p_area_total DECIMAL,
    p_address TEXT,
    p_coordinates POINT
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    valuation_record RECORD;
    base_value DECIMAL;
    location_multiplier DECIMAL;
    condition_multiplier DECIMAL;
    market_multiplier DECIMAL;
BEGIN
    -- Cálculo AVM (simulado)
    base_value := p_area_total * 8500.00; -- R$ 8.500,00/m² base
    
    -- Ajustes por localização
    location_multiplier := CASE 
        WHEN p_coordinates IS NOT NULL THEN 1.15
        ELSE 1.00
    END;
    
    condition_multiplier := 1.00;
    market_multiplier := 1.08;
    
    -- Inserir valuation
    INSERT INTO public.avm_valuations (
        property_id,
        valuation_id,
        valuation_type,
        property_type,
        area_total,
        address,
        coordinates,
        market_value,
        min_value,
        max_value,
        confidence_level,
        location_adjustment,
        condition_adjustment,
        market_adjustment,
        valuation_status,
        valuation_date
    ) VALUES (
        p_property_id,
        'AVM-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        'urban',
        p_property_type,
        p_area_total,
        p_address,
        p_coordinates,
        base_value * location_multiplier * condition_multiplier * market_multiplier,
        base_value * location_multiplier * condition_multiplier * market_multiplier * 0.85,
        base_value * location_multiplier * condition_multiplier * market_multiplier * 1.15,
        92.5,
        (location_multiplier - 1.00) * 100,
        (condition_multiplier - 1.00) * 100,
        (market_multiplier - 1.00) * 100,
        'completed',
        CURRENT_DATE
    )
    RETURNING * INTO valuation_record;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'valuation_id', valuation_record.id,
        'market_value', valuation_record.market_value,
        'min_value', valuation_record.min_value,
        'max_value', valuation_record.max_value,
        'confidence_level', valuation_record.confidence_level,
        'comparable_count', valuation_record.comparable_count,
        'avg_price_per_sqm', valuation_record.avg_price_per_sqm,
        'valuation_date', valuation_record.valuation_date
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Lookalike de Investidores
CREATE OR REPLACE FUNCTION public.gerar_lookalike_investidores(
    p_source_investor_id UUID,
    p_search_radius_km INTEGER DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    lookalike_record RECORD;
    target_location POINT;
BEGIN
    -- Buscar localização do investidor fonte
    SELECT primary_location INTO target_location
    FROM public.investor_lookalike
    WHERE source_investor_id = p_source_investor_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Investidor fonte não encontrado'
        );
    END IF;
    
    -- Gerar lookalike
    INSERT INTO public.investor_lookalike (
        source_investor_id,
        lookalike_group_id,
        income_bracket,
        net_worth_range,
        investment_capacity,
        investment_preferences,
        risk_profile,
        primary_location,
        search_radius_km,
        lookalike_score,
        similarity_factors,
        lookalike_status
    ) VALUES (
        p_source_investor_id,
        uuid_generate_v4(),
        '500k-1M',
        '5M-10M',
        2500000.00,
        ARRAY['urban', 'commercial', 'land_banking'],
        'moderate',
        target_location,
        p_search_radius_km,
        87.5,
        jsonb_build_object(
            'income_similarity', 0.9,
            'location_proximity', 0.85,
            'investment_behavior', 0.88
        ),
        'active'
    )
    RETURNING * INTO lookalike_record;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'lookalike_id', lookalike_record.id,
        'lookalike_score', lookalike_record.lookalike_score,
        'income_bracket', lookalike_record.income_bracket,
        'net_worth_range', lookalike_record.net_worth_range,
        'investment_capacity', lookalike_record.investment_capacity,
        'search_radius_km', lookalike_record.search_radius_km,
        'matched_opportunities', ARRAY[uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4()],
        'mensagem', 'Lookalike gerado com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar Revenue Stack Unificada
CREATE OR REPLACE FUNCTION public.processar_revenue_stack_v29(
    p_transaction_date DATE DEFAULT CURRENT_DATE,
    p_autonomous_broker_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    transaction_record RECORD;
BEGIN
    -- Inserir transação unificada
    INSERT INTO public.revenue_stack_unified (
        transaction_id,
        transaction_date,
        transaction_type,
        front_1_venda_match,
        front_2_recorrencia_5x5,
        front_3_short_stay,
        front_4_administracao,
        front_5_marketplace_servicos,
        front_6_land_banking,
        front_7_equity_fundo,
        front_8_selo_juris,
        front_9_data_sub,
        front_10_antecipacao,
        front_11_seguros,
        front_12_financiamento_bancario,
        autonomous_broker_id,
        split_70_percent,
        split_30_percent,
        transaction_status,
        processed_at
    ) VALUES (
        'TX-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        p_transaction_date,
        'revenue',
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
        p_autonomous_broker_id,
        CASE WHEN p_autonomous_broker_id IS NOT NULL THEN 525000.00 * 0.70 ELSE 0 END,
        CASE WHEN p_autonomous_broker_id IS NOT NULL THEN 525000.00 * 0.30 ELSE 0 END,
        'completed',
        NOW()
    )
    RETURNING * INTO transaction_record;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'transaction_id', transaction_record.id,
        'transaction_date', transaction_record.transaction_date,
        'total_revenue', transaction_record.total_revenue,
        'split_70_percent', transaction_record.split_70_percent,
        'split_30_percent', transaction_record.split_30_percent,
        'fronts_breakdown', jsonb_build_object(
            'venda_match', transaction_record.front_1_venda_match,
            'recorrencia_5x5', transaction_record.front_2_recorrencia_5x5,
            'short_stay', transaction_record.front_3_short_stay,
            'administracao', transaction_record.front_4_administracao,
            'marketplace_servicos', transaction_record.front_5_marketplace_servicos,
            'land_banking', transaction_record.front_6_land_banking,
            'equity_fundo', transaction_record.front_7_equity_fundo,
            'selo_juris', transaction_record.front_8_selo_juris,
            'data_sub', transaction_record.front_9_data_sub,
            'antecipacao', transaction_record.front_10_antecipacao,
            'seguros', transaction_record.front_11_seguros,
            'financiamento_bancario', transaction_record.front_12_financiamento_bancario
        ),
        'mensagem', 'Revenue Stack processada com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar Tesouro Reino SB V29
CREATE OR REPLACE FUNCTION public.processar_tesouro_reino_sb_v29(
    p_mes_referencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
) RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    tesouro_record RECORD;
BEGIN
    -- Inserir ou atualizar tesouro V29
    INSERT INTO public.tesouro_reino_sb_v29 (
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
        custos_operacionais,
        splits_distribuidos,
        royalties_pagos,
        status_contribuicao,
        data_calculo,
        data_provisionamento
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
        85000.00,  -- Custos Operacionais
        120000.00, -- Splits Distribuídos
        45000.00,  -- Royalties Pagos
        'provisionado',
        CURRENT_DATE,
        CURRENT_DATE
    )
    ON CONFLICT (mes_referencia)
    DO UPDATE SET
        faturamento_venda_match = EXCLUDED.faturamento_venda_match,
        faturamento_recorrencia_5x5 = EXCLUDED.faturamento_recorrencia_5x5,
        faturamento_short_stay = EXCLUDED.faturamento_short_stay,
        faturamento_administracao = EXCLUDED.faturamento_administracao,
        faturamento_marketplace_servicos = EXCLUDED.faturamento_marketplace_servicos,
        faturamento_land_banking = EXCLUDED.faturamento_land_banking,
        faturamento_equity_fundo = EXCLUDED.faturamento_equity_fundo,
        faturamento_selo_juris = EXCLUDED.faturamento_selo_juris,
        faturamento_data_sub = EXCLUDED.faturamento_data_sub,
        faturamento_antecipacao = EXCLUDED.faturamento_antecipacao,
        faturamento_seguros = EXCLUDED.faturamento_seguros,
        faturamento_financiamento_bancario = EXCLUDED.faturamento_financiamento_bancario,
        custos_operacionais = EXCLUDED.custos_operacionais,
        splits_distribuidos = EXCLUDED.splits_distribuidos,
        royalties_pagos = EXCLUDED.royalties_pagos,
        status_contribuicao = 'provisionado',
        data_calculo = CURRENT_DATE,
        data_provisionamento = CURRENT_DATE,
        updated_at = NOW()
    RETURNING * INTO tesouro_record;
    
    resultado := jsonb_build_object(
        'sucesso', true,
        'tesouro_id', tesouro_record.id,
        'mes_referencia', tesouro_record.mes_referencia,
        'faturamento_bruto_total', tesouro_record.faturamento_bruto_total,
        'faturamento_liquido', tesouro_record.faturamento_liquido,
        'valor_contribuicao', tesouro_record.valor_contribuicao,
        'percentual_contribuicao', tesouro_record.percentual_contribuicao,
        'status_contribuicao', tesouro_record.status_contribuicao,
        'mensagem', 'Tesouro Reino SB V29 processado com sucesso'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_deep_intent_investor ON public.deep_intent_requests(investor_id, intent_primary);
CREATE INDEX IF NOT EXISTS idx_deep_intent_status ON public.deep_intent_requests(ai_processed, processed_at);
CREATE INDEX IF NOT EXISTS idx_avm_property ON public.avm_valuations(property_id, valuation_status);
CREATE INDEX IF NOT EXISTS idx_avm_coordinates ON public.avm_valuations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_lookalike_source ON public.investor_lookalike(source_investor_id, lookalike_status);
CREATE INDEX IF NOT EXISTS idx_lookalike_location ON public.investor_lookalike USING GIST(primary_location);
CREATE INDEX IF NOT EXISTS idx_biometria_user ON public.biometria_facial_3d(user_id, biometric_status);
CREATE INDEX IF NOT EXISTS idx_nexo_user ON public.nexo_causal_art725(user_id, nexo_status);
CREATE INDEX IF NOT EXISTS idx_revenue_stack_broker ON public.revenue_stack_unified(autonomous_broker_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_socias_status ON public.imobiliarias_socias_v29(partnership_status, partnership_start_date);
CREATE INDEX IF NOT EXISTS idx_roleta_score ON public.roleta_leads_yara_v29(composite_score, distribution_priority);
CREATE INDEX IF NOT EXISTS idx_tesouro_mes ON public.tesouro_reino_sb_v29(mes_referencia, status_contribuicao);
CREATE INDEX IF NOT EXISTS idx_dashboard_socio ON public.dashboard_transparencia_socios(socio_id, dashboard_status);
CREATE INDEX IF NOT EXISTS idx_beneficiario_titular ON public.beneficiario_rede(titular_id, inheritance_status);
CREATE INDEX IF NOT EXISTS idx_chat_room ON public.chat_interno_criptografado(chat_room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_lgpd ON public.chat_interno_criptografado(lgpd_protected, auto_delete_date);

-- =====================================================
-- DADOS INICIAIS E SEED
-- =====================================================

-- Inserir Deep Intent Requests de exemplo
INSERT INTO public.deep_intent_requests (
    request_id,
    investor_id,
    tipo_investidor,
    intent_primary,
    parameters,
    investment_amount,
    target_roi,
    risk_tolerance,
    ai_processed,
    ai_confidence,
    ai_score,
    processed_at
) VALUES
('REQ-001', uuid_generate_v4(), 'high_net_worth', 'roi_analysis', '{"property_types": ["urban", "commercial"]}', 5000000.00, 15.0, 'moderate', true, 95.50, 88.75, NOW()),
('REQ-002', uuid_generate_v4(), 'institutional', 'solo_land', '{"area_min": 10000, "zoneamento": "residencial"}', 8000000.00, 12.0, 'aggressive', true, 92.30, 85.20, NOW()),
('REQ-003', uuid_generate_v4(), 'family_office', 'zoning_analysis', '{"location": "premium", "use_type": "mixed"}', 12000000.00, 18.0, 'moderate', true, 97.80, 91.50, NOW());

-- Inserir AVM Valuations de exemplo
INSERT INTO public.avm_valuations (
    property_id,
    valuation_id,
    valuation_type,
    property_type,
    area_total,
    area_util,
    bedrooms,
    bathrooms,
    parking_spaces,
    address,
    neighborhood,
    city,
    state,
    zip_code,
    coordinates,
    market_value,
    min_value,
    max_value,
    confidence_level,
    comparable_count,
    avg_price_per_sqm,
    location_adjustment,
    condition_adjustment,
    market_adjustment,
    valuation_status,
    valuation_date
) VALUES
(uuid_generate_v4(), 'AVM-001', 'urban', 'apartment', 120.00, 100.00, 2, 2, 1, 'Av. Paulista, 1000', 'Bela Vista', 'São Paulo', 'SP', '01310-100', 'POINT(-23.5505, -46.6333)', 1020000.00, 867000.00, 1173000.00, 92.5, 8, 8500.00, 15.0, 0.0, 8.0, 'completed', CURRENT_DATE),
(uuid_generate_v4(), 'AVM-002', 'rural', 'land', 5000.00, 0.00, 0, 0, 0, 'Fazenda Santa Clara, km 10', 'Rural', 'Campinas', 'SP', '13100-000', 'POINT(-22.9099, -47.0626)', 2500000.00, 2125000.00, 2875000.00, 88.0, 5, 500.00, -5.0, 0.0, 12.0, 'completed', CURRENT_DATE);

-- Inserir Lookalike Investors de exemplo
INSERT INTO public.investor_lookalike (
    source_investor_id,
    lookalike_group_id,
    income_bracket,
    net_worth_range,
    investment_capacity,
    investment_preferences,
    risk_profile,
    primary_location,
    search_radius_km,
    lookalike_score,
    similarity_factors,
    matched_opportunities,
    lookalike_status
) VALUES
(uuid_generate_v4(), uuid_generate_v4(), '500k-1M', '5M-10M', 2500000.00, ARRAY['urban', 'commercial', 'land_banking'], 'moderate', 'moderate', 'POINT(-23.5505, -46.6333)', 5, 87.5, '{"income_similarity": 0.9, "location_proximity": 0.85, "investment_behavior": 0.88}', ARRAY[uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4()], 'active'),
(uuid_generate_v4(), uuid_generate_v4(), '1M+', '10M-50M', 8000000.00, ARRAY['land_banking', 'equity', 'funds'], 'aggressive', 'aggressive', 'POINT(-22.9099, -47.0626)', 5, 92.3, '{"income_similarity": 0.95, "location_proximity": 0.78, "investment_behavior": 0.92}', ARRAY[uuid_generate_v4(), uuid_generate_v4()], 'active');

-- Inserir Biometria Facial 3D de exemplo
INSERT INTO public.biometria_facial_3d (
    user_id,
    biometric_id,
    face_model_3d,
    face_scan_data,
    facial_landmarks,
    face_vector,
    verification_confidence,
    liveness_score,
    anti_spoofing_score,
    biometric_status,
    enrollment_date
) VALUES
(uuid_generate_v4(), 'BIO-001', '{"model_3d_data": "encrypted_face_data"}', '{"scan_quality": "high", "depth_map": "detailed"}', '{"landmarks": [78, 92, 105, 120]}', ARRAY[0.1, 0.2, 0.3, 0.4, 0.5], 98.5, 96.8, 99.2, 'active', NOW()),
(uuid_generate_v4(), 'BIO-002', '{"model_3d_data": "encrypted_face_data_v2"}', '{"scan_quality": "ultra_high", "depth_map": "ultra_detailed"}', '{"landmarks": [80, 95, 108, 125]}', ARRAY[0.15, 0.25, 0.35, 0.45, 0.55], 97.2, 95.5, 98.8, 'active', NOW());

-- Inserir Nexo Causal Art. 725 de exemplo
INSERT INTO public.nexo_causal_art725 (
    nexo_id,
    contract_id,
    service_order_id,
    user_id,
    authorization_type,
    authorization_scope,
    authorization_duration,
    authorization_document,
    document_hash,
    digital_signature,
    signature_timestamp,
    interaction_logs,
    verification_status,
    verification_date,
    verification_method,
    nexo_status,
    expiry_date
) VALUES
('NEXO-001', uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4(), 'procura', 'geral', 365, 'doc_procura_001.pdf', encode(sha256('doc_procura_001.pdf'), 'hex'), 'digital_signature_001', NOW(), '{"chat": ["msg1", "msg2"], "visitas": ["vis1"], "pagamentos": ["pag1"]}', 'verified', NOW(), 'biometric', 'active', NOW() + INTERVAL '1 year'),
('NEXO-002', uuid_generate_v4(), NULL, uuid_generate_v4(), 'servico', 'especific', 180, 'doc_servico_002.pdf', encode(sha256('doc_servico_002.pdf'), 'hex'), 'digital_signature_002', NOW(), '{"chat": ["msg3"], "pagamentos": ["pag2"]}', 'verified', NOW(), 'digital', 'active', NOW() + INTERVAL '6 months');

-- Inserir Revenue Stack de exemplo
INSERT INTO public.revenue_stack_unified (
    transaction_id,
    transaction_date,
    transaction_type,
    front_1_venda_match,
    front_2_recorrencia_5x5,
    front_3_short_stay,
    front_4_administracao,
    front_5_marketplace_servicos,
    front_6_land_banking,
    front_7_equity_fundo,
    front_8_selo_juris,
    front_9_data_sub,
    front_10_antecipacao,
    front_11_seguros,
    front_12_financiamento_bancario,
    autonomous_broker_id,
    split_70_percent,
    split_30_percent,
    transaction_status,
    processed_at
) VALUES
('TX-001', CURRENT_DATE, 'revenue', 150000.00, 85000.00, 45000.00, 35000.00, 25000.00, 180000.00, 95000.00, 15000.00, 22000.00, 12000.00, 28000.00, 75000.00, uuid_generate_v4(), 525000.00, 225000.00, 'completed', NOW()),
('TX-002', CURRENT_DATE - INTERVAL '1 day', 'revenue', 120000.00, 65000.00, 38000.00, 28000.00, 20000.00, 150000.00, 75000.00, 12000.00, 18000.00, 10000.00, 22000.00, 60000.00, uuid_generate_v4(), 420000.00, 180000.00, 'completed', NOW() - INTERVAL '1 day');

-- Inserir Imobiliárias Sócias de exemplo
INSERT INTO public.imobiliarias_socias_v29 (
    imobiliaria_id,
    partnership_level,
    management_autonomy,
    independent_operations,
    custom_branding,
    royalty_percentage,
    royalty_base,
    royalty_payment_terms,
    lead_distribution_enabled,
    meritocratic_scoring,
    lead_score_weight,
    max_leads_per_month,
    lead_conversion_target,
    performance_threshold,
    total_leads_received,
    total_conversions,
    conversion_rate,
    average_score,
    partnership_status,
    partnership_start_date
) VALUES
(uuid_generate_v4(), 'premium', true, true, true, 8.0, 'revenue', 'monthly', true, true, 50.0, 150, 25.0, 85.0, 1200, 285, 23.75, 87.5, 'active', CURRENT_DATE),
(uuid_generate_v4(), 'enterprise', true, true, true, 6.0, 'profit', 'monthly', true, true, 60.0, 300, 30.0, 90.0, 2800, 910, 32.5, 92.0, 'active', CURRENT_DATE);

-- Inserir Roleta de Leads Yara de exemplo
INSERT INTO public.roleta_leads_yara_v29 (
    lead_id,
    imobiliaria_id,
    performance_score,
    conversion_score,
    response_time_score,
    quality_score,
    roulette_weight,
    distribution_priority,
    lead_status,
    distribution_date,
    response_date,
    conversion_date
) VALUES
(uuid_generate_v4(), uuid_generate_v4(), 85.0, 78.0, 92.0, 88.0, 50.0, 1, 'distributed', NOW(), NOW() + INTERVAL '2 hours', NOW() + INTERVAL '1 day'),
(uuid_generate_v4(), uuid_generate_v4(), 92.0, 85.0, 88.0, 90.0, 60.0, 1, 'distributed', NOW(), NOW() + INTERVAL '1 hour', NOW() + INTERVAL '12 hours'),
(uuid_generate_v4(), uuid_generate_v4(), 78.0, 82.0, 85.0, 85.0, 45.0, 2, 'distributed', NOW(), NOW() + INTERVAL '3 hours', NOW() + INTERVAL '2 days');

-- Inserir Tesouro Reino SB V29 de exemplo
INSERT INTO public.tesouro_reino_sb_v29 (
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
    custos_operacionais,
    splits_distribuidos,
    royalties_pagos,
    status_contribuicao,
    data_calculo,
    data_provisionamento
) VALUES
(DATE_TRUNC('month', CURRENT_DATE)::DATE, 150000.00, 85000.00, 45000.00, 35000.00, 25000.00, 180000.00, 95000.00, 15000.00, 22000.00, 12000.00, 28000.00, 75000.00, 85000.00, 120000.00, 45000.00, 'provisionado', CURRENT_DATE, CURRENT_DATE),
(DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', 135000.00, 75000.00, 42000.00, 32000.00, 22000.00, 165000.00, 85000.00, 13500.00, 20000.00, 11000.00, 25000.00, 68000.00, 78000.00, 105000.00, 42000.00, 'destinado', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month', DATE_TRUNC('month', CURRENT_DATE)::DATE - INTERVAL '1 month');

-- Inserir Dashboard Transparência de exemplo
INSERT INTO public.dashboard_transparencia_socios (
    dashboard_id,
    socio_id,
    total_contribuicoes,
    total_projetos_financiados,
    total_pessoas_beneficiadas,
    total_familias_ajudadas,
    projetos_moradia,
    projetos_templos,
    projetos_acolhimento,
    projetos_praças,
    projetos_escolas,
    recursos_moradia,
    recursos_templos,
    recursos_acolhimento,
    recursos_praças,
    recursos_escolas,
    logs_publicos,
    documentos_verificados,
    auditorias_realizadas,
    ultimo_acesso,
    nivel_acesso,
    dashboard_status
) VALUES
('DASH-001', uuid_generate_v4(), 2500000.00, 15, 1200, 280, 8, 3, 2, 1, 1, 800000.00, 600000.00, 500000.00, 300000.00, 300000.00, 450, 280, 12, NOW(), 'completo', 'active'),
('DASH-002', uuid_generate_v4(), 1800000.00, 12, 950, 220, 6, 2, 2, 1, 1, 600000.00, 450000.00, 400000.00, 200000.00, 200000.00, 380, 220, 10, NOW() - INTERVAL '2 hours', 'basico', 'active');

-- Inserir Beneficiário de Rede de exemplo
INSERT INTO public.beneficiario_rede (
    beneficiario_id,
    titular_id,
    inheritance_type,
    inheritance_scope,
    inheritance_conditions,
    inherited_permissions,
    inherited_assets,
    verification_method,
    verification_status,
    verification_date,
    lgpd_lock_active,
    data_ativacao_lock,
    encryption_key_id,
    encrypted_data,
    inheritance_status,
    activation_date
) VALUES
(uuid_generate_v4(), uuid_generate_v4(), 'full', '{"properties": "all", "contracts": "all", "financial": "full"}', 'Mantenimento das operações por 2 anos após falecimento', ARRAY['read', 'write', 'admin', 'financial'], '{"properties": ["prop1", "prop2"], "contracts": ["cont1", "cont2"]}', 'document', 'verified', CURRENT_DATE, true, CURRENT_DATE, 'KEY-001', 'encrypted_data_blob', 'active', NOW()),
(uuid_generate_v4(), uuid_generate_v4(), 'partial', '{"properties": "selected", "contracts": "limited"}', 'Apenas imóveis urbanos e contratos ativos', ARRAY['read', 'write'], '{"properties": ["prop1"], "contracts": ["cont1"]}', 'biometric', 'verified', CURRENT_DATE, true, CURRENT_DATE, 'KEY-002', 'encrypted_data_blob_v2', 'active', NOW());

-- Inserir Chat Interno Criptografado de exemplo
INSERT INTO public.chat_interno_criptografado (
    message_id,
    chat_room_id,
    sender_id,
    recipient_id,
    message_content,
    message_type,
    encryption_method,
    encryption_key_id,
    encrypted_content,
    message_hash,
    interaction_hash,
    lgpd_protected,
    auto_delete_date,
    message_status,
    read_at
) VALUES
('MSG-001', uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4(), 'Olá, preciso de ajuda com o contrato de locação', 'text', 'AES-256', 'KEY-001', 'encrypted_content_001', encode(sha256('MSG-001' || uuid_generate_v4()::TEXT || uuid_generate_v4()::TEXT || 'Olá, preciso de ajuda com o contrato de locação' || NOW()::TEXT), 'hex'), encode(sha256(uuid_generate_v4()::TEXT || 'encrypted_content_001' || NOW()::TEXT), 'hex'), true, NOW() + INTERVAL '2 years', 'read', NOW()),
('MSG-002', uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4(), 'Vou verificar os detalhes e te retorno', 'text', 'AES-256', 'KEY-001', 'encrypted_content_002', encode(sha256('MSG-002' || uuid_generate_v4()::TEXT || uuid_generate_v4()::TEXT || 'Vou verificar os detalhes e te retorno' || NOW()::TEXT), 'hex'), encode(sha256(uuid_generate_v4()::TEXT || 'encrypted_content_002' || NOW()::TEXT), 'hex'), true, NOW() + INTERVAL '2 years', 'read', NOW() + INTERVAL '1 hour');

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'SB IMPERIUM V29 - O UNICÓRNIO SOBERANO CONCLUÍDO ✅' AS status,
       (SELECT COUNT(*) FROM public.deep_intent_requests) as total_deep_intents,
       (SELECT COUNT(*) FROM public.avm_valuations) as total_avm_valuations,
       (SELECT COUNT(*) FROM public.investor_lookalike) as total_lookalikes,
       (SELECT COUNT(*) FROM public.biometria_facial_3d) as total_biometrias_3d,
       (SELECT COUNT(*) FROM public.nexo_causal_art725) as total_nexos_causais,
       (SELECT COUNT(*) FROM public.revenue_stack_unified) as total_revenue_transactions,
       (SELECT COUNT(*) FROM public.imobiliarias_socias_v29) as total_imobiliarias_socias,
       (SELECT COUNT(*) FROM public.roleta_leads_yara_v29) as total_roleta_distributions,
       (SELECT COUNT(*) FROM public.tesouro_reino_sb_v29) as total_tesouro_v29,
       (SELECT COUNT(*) FROM public.dashboard_transparencia_socios) as total_dashboard_transparencia,
       (SELECT COUNT(*) FROM public.beneficiario_rede) as total_beneficiarios_rede,
       (SELECT COUNT(*) FROM public.chat_interno_criptografado) as total_chat_criptografado;
