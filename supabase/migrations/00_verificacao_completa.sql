-- ============================================================
-- ANJOIMOB — VERIFICAÇÃO COMPLETA DO BANCO
-- Execute no Supabase SQL Editor após rodar todos os migrations
-- ============================================================

-- 1. Extensões habilitadas
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'vector', 'postgis');

-- 2. Tabelas novas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'score_logs', 'config_split', 'caixa_anjoimob',
    'wallet_transactions',
    'doc_vault', 'banco_areas',
    'prestadores', 'avaliacoes', 'permutas',
    'property_embeddings'
);

-- 3. Colunas adicionadas em tabelas existentes
SELECT column_name, table_name FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    (table_name = 'brokers'  AND column_name IN ('is_associado', 'associado_slug', 'percentual_lucro', 'dominio_personalizado'))
    OR (table_name = 'profiles' AND column_name IN ('cpf_encrypted', 'doc_encrypted'))
);

-- 4. Funções criadas
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'calculate_score', 'search_properties',
    'encrypt_sensitive_data', 'decrypt_sensitive_data',
    'encrypt_profile_data', 'recalcular_avaliacao_prestador'
);

-- 5. Políticas RLS por tabela
SELECT tablename, count(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 6. Triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- 7. Configurações de split (deve ter 25 linhas)
SELECT nome_config, percentual, descricao, modulo
FROM config_split
ORDER BY modulo, nome_config;

-- 8. Chave de criptografia configurada (retorna erro se não configurada)
SELECT current_setting('app.encryption_key', true) AS encryption_key_set;
