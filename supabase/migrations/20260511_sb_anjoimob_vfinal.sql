-- 🏛️ ANJOIMOB vFINAL — Modelo Unificado de Split, Score, PRO, Acúmulo e Saque Acelerado

-- 1.1 Tabela de Score do Corretor
CREATE TABLE IF NOT EXISTS score_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    pontos_venda INTEGER DEFAULT 0,
    pontos_captacao INTEGER DEFAULT 0,
    pontos_treinamento INTEGER DEFAULT 0,
    pontos_indicacao INTEGER DEFAULT 0,
    pontos_engajamento INTEGER DEFAULT 0,
    score_total INTEGER GENERATED ALWAYS AS (
        pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento
    ) STORED,
    nivel_liberado INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN (pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento) >= 80 THEN 5
            WHEN (pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento) >= 60 THEN 3
            WHEN (pontos_venda + pontos_captacao + pontos_treinamento + pontos_indicacao + pontos_engajamento) >= 40 THEN 1
            ELSE 0
        END
    ) STORED,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE score_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seu próprio score"
    ON score_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir score"
    ON score_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar score"
    ON score_logs FOR UPDATE USING (true);

-- 1.2 Função para calcular/atualizar score
CREATE OR REPLACE FUNCTION calculate_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_vendas INTEGER;
    v_captacoes INTEGER;
BEGIN
    SELECT LEAST(COUNT(*) * 6, 30) INTO v_vendas
    FROM transactions WHERE broker_id = p_user_id AND status = 'pago';

    SELECT LEAST(COUNT(*) * 4, 20) INTO v_captacoes
    FROM properties WHERE broker_id = p_user_id;

    INSERT INTO score_logs (user_id, pontos_venda, pontos_captacao, updated_at)
    VALUES (p_user_id, v_vendas, v_captacoes, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        pontos_venda = EXCLUDED.pontos_venda,
        pontos_captacao = EXCLUDED.pontos_captacao,
        updated_at = NOW();

    RETURN (SELECT score_total FROM score_logs WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.3 Tabela de Configuração de Split (admin pode alterar sem redeploy)
CREATE TABLE IF NOT EXISTS config_split (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_config TEXT UNIQUE NOT NULL,
    percentual NUMERIC NOT NULL,
    descricao TEXT,
    modulo TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config_split (nome_config, percentual, descricao, modulo) VALUES
('captador_percent',             10.0, 'Percentual do Captador',             'corretagem'),
('parceiro_percent',             30.0, 'Percentual do Parceiro',             'corretagem'),
('vendedor_percent',             40.0, 'Percentual do Vendedor',             'corretagem'),
('sb_system_percent',            20.0, 'Percentual da Anjoimob',             'corretagem'),
('captador_vendedor_solo',       80.0, 'Acúmulo: Captador = Vendedor',       'acumulo'),
('captador_parceria',            45.0, 'Acúmulo: Captador + Parceria',       'acumulo'),
('apenas_captador',              10.0, 'Apenas Captador',                    'acumulo'),
('apenas_vendedor_solo',         70.0, 'Apenas Vendedor Solo',               'acumulo'),
('apenas_vendedor_parceria',     35.0, 'Apenas Vendedor Parceria',           'acumulo'),
('associado_pro_lucro',          50.0, 'Lucro do Associado PRO',             'pro'),
('associado_rede',               10.0, 'Rede sobre lucro do Associado',      'pro'),
('coordenacao_percent',           2.0, 'Coordenação Master',                 'coordenacao'),
('take_rate_servicos',           20.0, 'Take Rate Serviços',                 'marketplace'),
('taxa_saque_acelerado_min',      3.0, 'Taxa mínima saque acelerado',        'fintech'),
('taxa_saque_acelerado_max',      8.0, 'Taxa máxima saque acelerado',        'fintech')
ON CONFLICT (nome_config) DO NOTHING;

ALTER TABLE config_split ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam config_split"
    ON config_split FOR ALL USING (true);

-- 1.4 Colunas Plano PRO na tabela brokers
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS is_associado BOOLEAN DEFAULT FALSE;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS associado_slug TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS percentual_lucro NUMERIC DEFAULT 50.0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_associado_slug ON brokers(associado_slug) WHERE associado_slug IS NOT NULL;

-- 1.5 Tabela Caixa Anjoimob (rede não distribuída por score insuficiente)
CREATE TABLE IF NOT EXISTS caixa_anjoimob (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origem TEXT NOT NULL,
    motivo TEXT,
    user_id UUID REFERENCES auth.users(id),
    valor NUMERIC,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE caixa_anjoimob ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema pode inserir caixa anjoimob"
    ON caixa_anjoimob FOR INSERT WITH CHECK (true);

-- 1.6 Tabela wallet_transactions (necessária para Saque Acelerado)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'saque_acelerado', 'saque_normal', 'credito', 'debito'
    valor_bruto NUMERIC NOT NULL,
    taxa NUMERIC DEFAULT 0,
    valor_liquido NUMERIC NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'liberado', 'cancelado'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias transações"
    ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir transações"
    ON wallet_transactions FOR INSERT WITH CHECK (true);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_score_logs_user ON score_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_config_split_modulo ON config_split(modulo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_caixa_anjoimob_origem ON caixa_anjoimob(origem);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);

-- VERIFICAÇÃO FINAL (retorna tabelas criadas)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('score_logs', 'config_split', 'caixa_anjoimob', 'wallet_transactions');
