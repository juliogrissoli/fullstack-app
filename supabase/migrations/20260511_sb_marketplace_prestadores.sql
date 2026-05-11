-- Marketplace: Prestadores, Avaliações e Permutas

CREATE TABLE IF NOT EXISTS prestadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT,
    avaliacao DECIMAL DEFAULT 5.0,
    total_avaliacoes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prestadores visíveis"
    ON prestadores FOR SELECT USING (true);

CREATE POLICY "Usuário insere perfil"
    ON prestadores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário edita seu perfil"
    ON prestadores FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prestadores_categoria ON prestadores(categoria);
CREATE INDEX IF NOT EXISTS idx_prestadores_status ON prestadores(status);

-- Avaliações
CREATE TABLE IF NOT EXISTS avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestador_id UUID REFERENCES prestadores(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES auth.users(id),
    nota INTEGER CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliações visíveis"
    ON avaliacoes FOR SELECT USING (true);

CREATE POLICY "Cliente insere avaliação"
    ON avaliacoes FOR INSERT WITH CHECK (auth.uid() = cliente_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_prestador ON avaliacoes(prestador_id);

-- Trigger: recalcula média ao inserir ou atualizar avaliação
CREATE OR REPLACE FUNCTION recalcular_avaliacao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prestadores
    SET
        avaliacao = (
            SELECT COALESCE(AVG(nota), 5.0)
            FROM avaliacoes
            WHERE prestador_id = NEW.prestador_id
        ),
        total_avaliacoes = (
            SELECT COUNT(*) FROM avaliacoes WHERE prestador_id = NEW.prestador_id
        )
    WHERE id = NEW.prestador_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalcular_avaliacao ON avaliacoes;
CREATE TRIGGER trigger_recalcular_avaliacao
    AFTER INSERT OR UPDATE ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_avaliacao();

-- Permutas
CREATE TABLE IF NOT EXISTS permutas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL,
    descricao TEXT,
    valor_estimado DECIMAL,
    status TEXT DEFAULT 'aberto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permutas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permutas visíveis para autenticados"
    ON permutas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuário gerencia suas permutas"
    ON permutas FOR ALL TO authenticated USING (auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_permutas_status ON permutas(status);
CREATE INDEX IF NOT EXISTS idx_permutas_tipo ON permutas(tipo);
