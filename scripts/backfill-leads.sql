-- Backfill do decision_engine para leads sem entrada
-- Lógica idêntica ao trigger calcular_score_lead (criar-triggers.mjs)
-- Seguro para re-execução: usa NOT EXISTS para evitar duplicatas

INSERT INTO decision_engine (lead_id, lead_score, decision_path)
SELECT
    l.id,
    (
        CASE
            WHEN l.financial_capacity >= 200000 THEN 40
            WHEN l.financial_capacity >= 100000 THEN 25
            WHEN l.financial_capacity >= 50000  THEN 10
            ELSE 0
        END +
        CASE
            WHEN l.monthly_income >= 15000 THEN 30
            WHEN l.monthly_income >= 8000  THEN 20
            WHEN l.monthly_income >= 4000  THEN 10
            ELSE 0
        END +
        CASE
            WHEN l.decision_urgency = 'urgente' THEN 30
            WHEN l.decision_urgency = 'medio'   THEN 15
            ELSE 5
        END
    ) AS lead_score,
    CASE
        WHEN (
            CASE WHEN l.financial_capacity >= 200000 THEN 40 WHEN l.financial_capacity >= 100000 THEN 25 WHEN l.financial_capacity >= 50000 THEN 10 ELSE 0 END +
            CASE WHEN l.monthly_income >= 15000 THEN 30 WHEN l.monthly_income >= 8000 THEN 20 WHEN l.monthly_income >= 4000 THEN 10 ELSE 0 END +
            CASE WHEN l.decision_urgency = 'urgente' THEN 30 WHEN l.decision_urgency = 'medio' THEN 15 ELSE 5 END
        ) >= 70 THEN 'ATACAR'
        WHEN (
            CASE WHEN l.financial_capacity >= 200000 THEN 40 WHEN l.financial_capacity >= 100000 THEN 25 WHEN l.financial_capacity >= 50000 THEN 10 ELSE 0 END +
            CASE WHEN l.monthly_income >= 15000 THEN 30 WHEN l.monthly_income >= 8000 THEN 20 WHEN l.monthly_income >= 4000 THEN 10 ELSE 0 END +
            CASE WHEN l.decision_urgency = 'urgente' THEN 30 WHEN l.decision_urgency = 'medio' THEN 15 ELSE 5 END
        ) >= 40 THEN 'NUTRIR'
        ELSE 'REJEITAR'
    END AS decision_path
FROM leads l
WHERE NOT EXISTS (
    SELECT 1 FROM decision_engine de WHERE de.lead_id = l.id
);

-- Sincronizar leads.score com o valor calculado
UPDATE leads l
SET score = de.lead_score
FROM decision_engine de
WHERE de.lead_id = l.id
  AND (l.score IS NULL OR l.score = 0);

-- Verificação pós-execução
SELECT
    COUNT(*)                                           AS total,
    COUNT(CASE WHEN decision_path = 'ATACAR'   THEN 1 END) AS atacar,
    COUNT(CASE WHEN decision_path = 'NUTRIR'   THEN 1 END) AS nutrir,
    COUNT(CASE WHEN decision_path = 'REJEITAR' THEN 1 END) AS rejeitar
FROM decision_engine;
