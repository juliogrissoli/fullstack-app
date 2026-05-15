import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
CREATE OR REPLACE FUNCTION calcular_score_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_decisao TEXT := 'REJEITAR';
BEGIN
    IF NEW.financial_capacity >= 200000 THEN v_score := v_score + 40;
    ELSIF NEW.financial_capacity >= 100000 THEN v_score := v_score + 25;
    ELSIF NEW.financial_capacity >= 50000 THEN v_score := v_score + 10;
    END IF;

    IF NEW.monthly_income >= 15000 THEN v_score := v_score + 30;
    ELSIF NEW.monthly_income >= 8000 THEN v_score := v_score + 20;
    ELSIF NEW.monthly_income >= 4000 THEN v_score := v_score + 10;
    END IF;

    IF NEW.decision_urgency = 'urgente' THEN v_score := v_score + 30;
    ELSIF NEW.decision_urgency = 'medio' THEN v_score := v_score + 15;
    ELSE v_score := v_score + 5;
    END IF;

    IF v_score >= 70 THEN v_decisao := 'ATACAR';
    ELSIF v_score >= 40 THEN v_decisao := 'NUTRIR';
    END IF;

    INSERT INTO decision_engine (lead_id, lead_score, decision_path)
    VALUES (NEW.id, v_score, v_decisao);

    UPDATE leads SET score = v_score WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_score_lead ON leads;
CREATE TRIGGER trigger_score_lead
    AFTER INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION calcular_score_lead();

DROP TRIGGER IF EXISTS trigger_orquestrador ON leads;
CREATE OR REPLACE FUNCTION notificar_orquestrador()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://www.anjoimob.com/api/agentes/webhook',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object('evento', 'lead_criado', 'lead_id', NEW.id)::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_orquestrador
    AFTER INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION notificar_orquestrador();
`;

const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ error: 'rpc not available' }));

if (error) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });
  console.log('Status:', res.status, await res.text());
} else {
  console.log('Triggers criados com sucesso!');
}
