-- 🏛️ SECURITY BROKER SB - VIEW FUNÇÃO SOCIAL DE JESUS
-- Criação de view para estatísticas de impacto social

-- 📊 VIEW: view_funcao_social_stats
-- Calcula estatísticas em tempo real da Função Social de Jesus
-- Fórmula: SUM(valor_liquido_sb * 0.01)

CREATE OR REPLACE VIEW view_funcao_social_stats AS
SELECT 
    -- 💰 TOTAL FATURAMENTO LÍQUIDO SB
    COALESCE(SUM(
        CASE 
            WHEN status = 'finalizada' AND valor_liquido_sb > 0 
            THEN valor_liquido_sb 
            ELSE 0 
        END
    ), 0) as total_faturamento,
    
    -- 🙏 TOTAL FUNÇÃO SOCIAL DE JESUS (1% do faturamento)
    COALESCE(SUM(
        CASE 
            WHEN status = 'finalizada' AND valor_liquido_sb > 0 
            THEN valor_liquido_sb * 0.01 
            ELSE 0 
        END
    ), 0) as total_funcao_social,
    
    -- 📈 TOTAL DE TRANSAÇÕES FINALIZADAS
    COALESCE(COUNT(
        CASE 
            WHEN status = 'finalizada' 
            THEN 1 
            ELSE NULL 
        END
    ), 0) as total_transacoes,
    
    -- 📅 DATA DA PRIMEIRA TRANSAÇÃO
    MIN(
        CASE 
            WHEN status = 'finalizada' 
            THEN created_at 
            ELSE NULL 
        END
    ) as data_primeira_transacao,
    
    -- 📅 DATA DA ÚLTIMA TRANSAÇÃO
    MAX(
        CASE 
            WHEN status = 'finalizada' 
            THEN created_at 
            ELSE NULL 
        END
    ) as data_ultima_transacao,
    
    -- 🎯 MÉDIA DE VALOR POR TRANSAÇÃO
    COALESCE(AVG(
        CASE 
            WHEN status = 'finalizada' AND valor_liquido_sb > 0 
            THEN valor_liquido_sb 
            ELSE NULL 
        END
    ), 0) as media_valor_transacao,
    
    -- 📊 MÉDIA DE FUNÇÃO SOCIAL POR TRANSAÇÃO
    COALESCE(AVG(
        CASE 
            WHEN status = 'finalizada' AND valor_liquido_sb > 0 
            THEN valor_liquido_sb * 0.01 
            ELSE NULL 
        END
    ), 0) as media_funcao_social_transacao,
    
    -- 🏆 MAIOR CONTRIBUIÇÃO INDIVIDUAL
    COALESCE(MAX(
        CASE 
            WHEN status = 'finalizada' AND valor_liquido_sb > 0 
            THEN valor_liquido_sb * 0.01 
            ELSE 0 
        END
    ), 0) as maior_contribuicao,
    
    -- 📈 TOTAL DE MARCOS DE R$ 10.000 ALCANÇADOS
    FLOOR(
        COALESCE(SUM(
            CASE 
                WHEN status = 'finalizada' AND valor_liquido_sb > 0 
                THEN valor_liquido_sb * 0.01 
                ELSE 0 
            END
        ), 0) / 10000
    ) as total_marcos_10k,
    
    -- 🕐 TIMESTAMP DA ATUALIZAÇÃO
    NOW() as data_atualizacao

FROM transacoes_financiamento 
WHERE 1=1;

-- 📋 TABELA DE MARCOS DA FUNÇÃO SOCIAL
-- Registra cada marco de R$ 10.000 alcançado

CREATE TABLE IF NOT EXISTS funcao_social_marcos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valor_marco DECIMAL(15,2) NOT NULL, -- Valor do marco (ex: 10000, 20000, 30000...)
    data_alcancado TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_transacoes INTEGER NOT NULL DEFAULT 0,
    total_faturamento DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 🏛️ METADADOS DE AUDITORIA
    broker_id UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    
    -- 📊 ÍNDICES PARA PERFORMANCE
    CONSTRAINT funcao_social_marcos_valor_marco_unique UNIQUE (valor_marco)
);

-- 📊 ÍNDICES PARA OTIMIZAÇÃO

-- Índice na tabela de transações para performance da view
CREATE INDEX IF NOT EXISTS idx_transacoes_financiamento_status_valor 
ON transacoes_financiamento(status, valor_liquido_sb) 
WHERE status = 'finalizada';

-- Índice na tabela de transações para datas
CREATE INDEX IF NOT EXISTS idx_transacoes_financiamento_created_at 
ON transacoes_financiamento(created_at) 
WHERE status = 'finalizada';

-- Índice na tabela de marcos para consultas
CREATE INDEX IF NOT EXISTS idx_funcao_social_marcos_data_alcancado 
ON funcao_social_marcos(data_alcancado DESC);

-- Índice na tabela de marcos para valor
CREATE INDEX IF NOT EXISTS idx_funcao_social_marcos_valor 
ON funcao_social_marcos(valor_marco DESC);

-- 🔧 TRIGGER PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_funcao_social_marcos
BEFORE UPDATE ON funcao_social_marcos
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 🏛️ POLÍTICAS DE SEGURANÇA (RLS)

-- Habilitar RLS na tabela de marcos
ALTER TABLE funcao_social_marcos ENABLE ROW LEVEL SECURITY;

-- Política para admins (full access)
CREATE POLICY "Admins full access funcao_social_marcos" ON funcao_social_marcos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Política para brokers (read only)
CREATE POLICY "Brokers read access funcao_social_marcos" ON funcao_social_marcos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('broker', 'admin')
  )
);

-- 📊 FUNÇÃO PARA REGISTRAR AUTOMATICAMENTE MARCOS
CREATE OR REPLACE FUNCTION registrar_marco_funcao_social()
RETURNS TRIGGER AS $$
DECLARE
    total_atual DECIMAL(15,2);
    proximo_marco INTEGER;
    marco_atual INTEGER;
BEGIN
    -- Calcular total atual da função social
    SELECT COALESCE(SUM(valor_liquido_sb * 0.01), 0) 
    INTO total_atual
    FROM transacoes_financiamento 
    WHERE status = 'finalizada';
    
    -- Calcular próximo marco
    proximo_marco = (FLOOR(total_atual / 10000) + 1) * 10000;
    
    -- Verificar se atingiu novo marco
    IF total_atual >= proximo_marco - (10000 * 0.01) THEN -- 99% do marco
        marco_atual = FLOOR(total_atual / 10000) * 10000;
        
        -- Inserir novo marco se não existir
        INSERT INTO funcao_social_marcos (
            valor_marco, 
            total_transacoes,
            total_faturamento,
            broker_id,
            ip_address,
            user_agent
        )
        SELECT 
            marco_atual,
            COUNT(*) FILTER (WHERE status = 'finalizada'),
            COALESCE(SUM(valor_liquido_sb), 0),
            auth.uid(),
            inet_client_addr(),
            current_setting('request.headers')::json->>'user-agent'
        FROM transacoes_financiamento
        WHERE status = 'finalizada'
        ON CONFLICT (valor_marco) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔧 TRIGGER PARA REGISTRAR MARCOS AUTOMATICAMENTE
CREATE TRIGGER trigger_registrar_marco_funcao_social
AFTER INSERT OR UPDATE ON transacoes_financiamento
FOR EACH ROW
WHEN (NEW.status = 'finalizada')
EXECUTE FUNCTION registrar_marco_funcao_social();

-- 📋 COMENTÁRIOS DE DOCUMENTAÇÃO

COMMENT ON VIEW view_funcao_social_stats IS '🏛️ Security Broker SB - View com estatísticas em tempo real da Função Social de Jesus. Calcula 1% do faturamento líquido de todas as transações finalizadas.';

COMMENT ON TABLE funcao_social_marcos IS '🏛️ Security Broker SB - Registra cada marco de R$ 10.000 alcançado pela Função Social de Jesus. Usado para notificações e histórico de impacto.';

COMMENT ON COLUMN funcao_social_marcos.valor_marco IS '💰 Valor do marco alcançado (ex: 10000, 20000, 30000...)';

COMMENT ON COLUMN funcao_social_marcos.data_alcancado IS '📅 Data e hora em que o marco foi alcançado';

COMMENT ON COLUMN funcao_social_marcos.total_transacoes IS '📈 Número total de transações no momento do marco';

COMMENT ON COLUMN funcao_social_marcos.total_faturamento IS '💵 Faturamento total acumulado no momento do marco';

-- 🎯 VIEW ADICIONAL: HISTÓRICO DE MARCOS
CREATE OR REPLACE VIEW view_funcao_social_historico_marcos AS
SELECT 
    valor_marco,
    data_alcancado,
    total_transacoes,
    total_faturamento,
    EXTRACT(EPOCH FROM (data_alcancado - LAG(data_alcancado) OVER (ORDER BY data_alcancado))) / 86400 as dias_entre_marcos,
    LAG(valor_marco) OVER (ORDER BY data_alcancado) as marco_anterior,
    (valor_marco - LAG(valor_marco) OVER (ORDER BY data_alcancado)) as crescimento_marco
FROM funcao_social_marcos
ORDER BY data_alcancado DESC;

COMMENT ON VIEW view_funcao_social_historico_marcos IS '🏛️ Security Broker SB - View com histórico detalhado dos marcos alcançados pela Função Social de Jesus, incluindo tempo entre marcos e crescimento.';

-- ✅ MIGRATION COMPLETA
-- A view view_funcao_social_stats está pronta para uso pelo componente SocialImpactMeter
