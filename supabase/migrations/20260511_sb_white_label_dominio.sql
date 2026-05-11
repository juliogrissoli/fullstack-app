-- White Label: domínio personalizado para Associados PRO

ALTER TABLE brokers ADD COLUMN IF NOT EXISTS dominio_personalizado TEXT UNIQUE;

-- Taxa da Anjoimob sobre receita do associado white label
INSERT INTO config_split (nome_config, percentual, descricao, modulo) VALUES
('taxa_white_label', 10.0, 'Taxa da Anjoimob sobre receita de associado white label', 'expansao')
ON CONFLICT (nome_config) DO NOTHING;

-- Índice para lookup rápido no middleware
CREATE INDEX IF NOT EXISTS idx_brokers_dominio ON brokers(dominio_personalizado)
WHERE dominio_personalizado IS NOT NULL;
