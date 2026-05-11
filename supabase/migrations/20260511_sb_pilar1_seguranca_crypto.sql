-- Pilar 1 — Infraestrutura e Segurança: criptografia de dados sensíveis

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criptografar dado sensível usando chave no app.encryption_key (set via ALTER DATABASE)
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(
            input_text,
            current_setting('app.encryption_key')
        ),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Descriptografar
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_text, 'base64'),
        current_setting('app.encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Colunas criptografadas na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf_encrypted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_encrypted TEXT;

-- Trigger: criptografa CPF automaticamente ao inserir/atualizar
CREATE OR REPLACE FUNCTION encrypt_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cpf IS NOT NULL THEN
        NEW.cpf_encrypted = encrypt_sensitive_data(NEW.cpf);
        NEW.cpf = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_encrypt_profile ON profiles;
CREATE TRIGGER trigger_encrypt_profile
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_profile_data();

-- Configurar chave de criptografia no banco (substituir pelo valor real)
-- ATENÇÃO: execute este comando separadamente com a chave real:
-- ALTER DATABASE postgres SET "app.encryption_key" = 'SUA_CHAVE_AQUI_32_CHARS_MINIMO';
