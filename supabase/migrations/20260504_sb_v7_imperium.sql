-- ============================================================
-- SECURITY BROKER SB v7.0 — MIGRAÇÃO COMPLETA IMPERIUM EDITION
-- Plataforma SaaS para Corretores Autônomos Brasileiros
-- Projeto: imobai-psi.vercel.app | Supabase: bxxbghiawmzcsdwmogds
-- ============================================================

-- EXTENSION NECESSÁRIA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PERFIS DE USUÁRIOS (PROFILES)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  creci TEXT,
  role TEXT DEFAULT 'corretor',
  plano_id UUID REFERENCES public.planos(id),
  sb_score INTEGER DEFAULT 85,
  slug TEXT UNIQUE,
  foto_url TEXT,
  bio TEXT,
  cidade TEXT,
  estado TEXT DEFAULT 'SP',
  indicado_por UUID REFERENCES public.profiles(id),
  codigo_indicacao TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  nivel_rede INTEGER DEFAULT 1,
  vgv_total NUMERIC(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_codigo_indicacao ON public.profiles(codigo_indicacao);
CREATE INDEX IF NOT EXISTS idx_profiles_indicado_por ON public.profiles(indicado_por);
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON public.profiles(estado);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_public_slug" ON public.profiles FOR SELECT USING (slug IS NOT NULL AND ativo = TRUE);

-- TRIGGER: auto criar profile ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, slug)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'nome', 'usuario'), '[^a-zA-Z0-9]', '', 'g'))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PLANOS DE ASSINATURA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC(10,2),
  preco_anual NUMERIC(10,2),
  features JSONB DEFAULT '[]',
  limite_imoveis INTEGER DEFAULT 10,
  limite_leads INTEGER DEFAULT 50,
  comissao_sb NUMERIC(5,2) DEFAULT 20.00,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_select_all" ON public.planos FOR SELECT USING (ativo = TRUE);

-- SEED: planos iniciais
INSERT INTO public.planos (nome, descricao, preco_mensal, preco_anual, features, limite_imoveis, limite_leads, ordem) VALUES
('Trial', '7 dias grátis para testar a plataforma', 0, 0,
  '["Dashboard completo", "Até 3 imóveis", "Até 10 leads", "SB Academy básico"]',
  3, 10, 1),
('Starter', 'Para corretores iniciantes', 97.00, 970.00,
  '["Dashboard completo", "Até 10 imóveis", "Até 50 leads", "SB Academy completo", "Rankings municipal"]',
  10, 50, 2),
('Pro', 'Para corretores estabelecidos', 197.00, 1970.00,
  '["Dashboard completo", "Imóveis ilimitados", "Leads ilimitados", "SB Academy completo", "Rankings estadual", "Rede multinível"]',
  999, 999, 3),
('Elite', 'Para corretores de alta performance', 397.00, 3970.00,
  '["Dashboard completo", "Imóveis ilimitados", "Leads ilimitados", "SB Academy completo", "Rankings nacional", "Rede multinível completa", "Suporte prioritário", "API access"]',
  999, 999, 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- IMÓVEIS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.imoveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'venda',
  preco NUMERIC(15,2),
  area NUMERIC(10,2),
  quartos INTEGER,
  banheiros INTEGER,
  vagas INTEGER,
  endereco TEXT,
  cidade TEXT,
  estado TEXT DEFAULT 'SP',
  cep TEXT,
  fotos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'disponivel',
  destaque BOOLEAN DEFAULT FALSE,
  vgv NUMERIC(15,2),
  link_rastreavel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_imoveis_corretor_id ON public.imoveis(corretor_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_status ON public.imoveis(status);
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade ON public.imoveis(cidade);
CREATE INDEX IF NOT EXISTS idx_imoveis_estado ON public.imoveis(estado);
CREATE INDEX IF NOT EXISTS idx_imoveis_destaque ON public.imoveis(destaque);
CREATE INDEX IF NOT EXISTS idx_imoveis_preco ON public.imoveis(preco);

-- RLS POLICIES
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imoveis_select_all" ON public.imoveis FOR SELECT USING (TRUE);
CREATE POLICY "imoveis_manage_own" ON public.imoveis FOR ALL USING (auth.uid() = corretor_id);

-- ============================================================
-- CRM LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  origem TEXT DEFAULT 'site',
  status TEXT DEFAULT 'novo',
  temperatura TEXT DEFAULT 'morno',
  notas TEXT,
  valor_estimado NUMERIC(15,2),
  utm_source TEXT,
  utm_medium TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_crm_leads_corretor_id ON public.crm_leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_temperatura ON public.crm_leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_crm_leads_origem ON public.crm_leads(origem);

-- RLS POLICIES
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_manage_own" ON public.crm_leads FOR ALL USING (auth.uid() = corretor_id);

-- ============================================================
-- ATENDIMENTOS (Governança Intelectual SHA-256)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  imovel_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
  tipo TEXT DEFAULT 'visita',
  descricao TEXT,
  valor_honorario NUMERIC(15,2),
  percentual_sb NUMERIC(5,2) DEFAULT 20.00,
  valor_sb NUMERIC(15,2) GENERATED ALWAYS AS (valor_honorario * percentual_sb / 100) STORED,
  status TEXT DEFAULT 'pendente',
  hash_sha256 TEXT,
  nexo_causal TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  data_atendimento TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_atendimentos_corretor_id ON public.atendimentos(corretor_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON public.atendimentos(status);
CREATE INDEX IF NOT EXISTS idx_atendimentos_data_atendimento ON public.atendimentos(data_atendimento);
CREATE INDEX IF NOT EXISTS idx_atendimentos_hash_sha256 ON public.atendimentos(hash_sha256);

-- RLS POLICIES
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atendimentos_manage_own" ON public.atendimentos FOR ALL USING (auth.uid() = corretor_id);

-- TRIGGER: gerar hash SHA-256 automaticamente
CREATE OR REPLACE FUNCTION public.gerar_hash_atendimento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.hash_sha256 = encode(
    sha256(
      NEW.corretor_id::text || 
      NEW.lead_id::text || 
      NEW.valor_honorario::text || 
      EXTRACT(EPOCH FROM NEW.data_atendimento)::text
    ),
    'hex'
  );
  NEW.nexo_causal = 'ATEND-' || substr(NEW.hash_sha256, 1, 8);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_hash_atendimento
  BEFORE INSERT OR UPDATE ON public.atendimentos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_hash_atendimento();

-- ============================================================
-- REDE MULTINÍVEL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rede_multinivel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id),
  beneficiario_id UUID REFERENCES public.profiles(id),
  atendimento_id UUID REFERENCES public.atendimentos(id),
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 5),
  percentual NUMERIC(5,2) NOT NULL,
  valor_base NUMERIC(15,2),
  valor_repasse NUMERIC(15,2) GENERATED ALWAYS AS (valor_base * percentual / 100) STORED,
  status TEXT DEFAULT 'pendente',
  pago_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_rede_multinivel_corretor_id ON public.rede_multinivel(corretor_id);
CREATE INDEX IF NOT EXISTS idx_rede_multinivel_beneficiario_id ON public.rede_multinivel(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_rede_multinivel_nivel ON public.rede_multinivel(nivel);
CREATE INDEX IF NOT EXISTS idx_rede_multinivel_status ON public.rede_multinivel(status);

-- RLS POLICIES
ALTER TABLE public.rede_multinivel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rede_select_own" ON public.rede_multinivel FOR SELECT 
  USING (auth.uid() = corretor_id OR auth.uid() = beneficiario_id);

-- FUNÇÃO: calcular repasses multinível automaticamente
CREATE OR REPLACE FUNCTION public.calcular_repasses_multinivel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nivel INTEGER := 1;
  v_atual UUID := NEW.corretor_id;
  v_pai UUID;
  v_percentuais NUMERIC[] := ARRAY[5.0, 4.0, 3.0, 2.0, 1.0]; -- 5 níveis
BEGIN
  LOOP
    EXIT WHEN v_nivel > 5;
    SELECT indicado_por INTO v_pai FROM public.profiles WHERE id = v_atual AND ativo = TRUE;
    EXIT WHEN v_pai IS NULL;
    
    INSERT INTO public.rede_multinivel 
      (corretor_id, beneficiario_id, atendimento_id, nivel, percentual, valor_base)
    VALUES 
      (NEW.corretor_id, v_pai, NEW.id, v_nivel, v_percentuais[v_nivel], NEW.valor_sb);
    
    v_atual := v_pai;
    v_nivel := v_nivel + 1;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_repasses_multinivel
  AFTER INSERT ON public.atendimentos
  FOR EACH ROW WHEN (NEW.status = 'concluido' AND NEW.valor_sb > 0)
  EXECUTE FUNCTION public.calcular_repasses_multinivel();

-- ============================================================
-- CURSOS (SB Academy)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  thumbnail_url TEXT,
  nivel TEXT DEFAULT 'iniciante',
  duracao_minutos INTEGER,
  pontos_sb_score INTEGER DEFAULT 5,
  obrigatorio BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0,
  publicado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.aulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  video_url TEXT,
  duracao_minutos INTEGER,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.progresso_cursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE,
  aula_id UUID REFERENCES public.aulas(id),
  concluido BOOLEAN DEFAULT FALSE,
  percentual_progresso INTEGER DEFAULT 0,
  certificado_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(corretor_id, curso_id)
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_cursos_publicados ON public.cursos(publicado);
CREATE INDEX IF NOT EXISTS idx_cursos_ordem ON public.cursos(ordem);
CREATE INDEX IF NOT EXISTS idx_aulas_curso_id ON public.aulas(curso_id);
CREATE INDEX IF NOT EXISTS idx_aulas_ordem ON public.aulas(ordem);
CREATE INDEX IF NOT EXISTS idx_progresso_cursos_corretor_id ON public.progresso_cursos(corretor_id);
CREATE INDEX IF NOT EXISTS idx_progresso_cursos_curso_id ON public.progresso_cursos(curso_id);

-- RLS POLICIES
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cursos_select_all" ON public.cursos FOR SELECT USING (publicado = TRUE);
CREATE POLICY "aulas_select_all" ON public.aulas FOR SELECT USING (TRUE);
CREATE POLICY "progresso_own" ON public.progresso_cursos FOR ALL USING (auth.uid() = corretor_id);

-- SEED: cursos iniciais
INSERT INTO public.cursos (titulo, descricao, nivel, duracao_minutos, pontos_sb_score, obrigatorio, ordem) VALUES
('Onboarding Security Broker', 'Bem-vindo à SB. Aprenda a usar a plataforma completa.', 'iniciante', 30, 10, TRUE, 1),
('CRECI e Legislação Imobiliária', 'Art. 722-729 CC, COFECI, CRECI e suas obrigações.', 'iniciante', 60, 15, TRUE, 2),
('Como Captar Imóveis de Qualidade', 'Técnicas avançadas de captação no mercado atual.', 'intermediario', 45, 10, FALSE, 3),
('Fechamento e Negociação', 'Psicologia da venda imobiliária e técnicas de fechamento.', 'avancado', 90, 20, FALSE, 4),
('Construindo sua Rede SB', 'Como crescer sua rede de indicações e multiplicar renda.', 'intermediario', 45, 15, FALSE, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RANKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id),
  periodo TEXT,
  posicao INTEGER,
  vgv_periodo NUMERIC(15,2),
  atendimentos_periodo INTEGER,
  sb_score_periodo INTEGER,
  badge TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_rankings_corretor_id ON public.rankings(corretor_id);
CREATE INDEX IF NOT EXISTS idx_rankings_periodo ON public.rankings(periodo);
CREATE INDEX IF NOT EXISTS idx_rankings_posicao ON public.rankings(posicao);

-- RLS POLICIES
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings_select_all" ON public.rankings FOR SELECT USING (TRUE);

-- ============================================================
-- FINANCEIRO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financeiro (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corretor_id UUID REFERENCES public.profiles(id),
  tipo TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(15,2) NOT NULL,
  status TEXT DEFAULT 'pendente',
  referencia_id UUID,
  referencia_tipo TEXT,
  pix_code TEXT,
  boleto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_financeiro_corretor_id ON public.financeiro(corretor_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_tipo ON public.financeiro(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_status ON public.financeiro(status);

-- RLS POLICIES
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financeiro_own" ON public.financeiro FOR ALL USING (auth.uid() = corretor_id);

-- ============================================================
-- GRANTS E PERMISSÕES
-- ============================================================

-- GRANTS para acesso público
GRANT SELECT ON public.imoveis TO anon;
GRANT SELECT ON public.imoveis TO authenticated;
GRANT SELECT ON public.cursos TO anon;
GRANT SELECT ON public.cursos TO authenticated;
GRANT SELECT ON public.planos TO anon;
GRANT SELECT ON public.planos TO authenticated;

-- GRANTS para usuários autenticados
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.crm_leads TO authenticated;
GRANT ALL ON public.atendimentos TO authenticated;
GRANT ALL ON public.rede_multinivel TO authenticated;
GRANT ALL ON public.progresso_cursos TO authenticated;
GRANT ALL ON public.financeiro TO authenticated;
GRANT ALL ON public.rankings TO authenticated;

-- ============================================================
-- FUNÇÕES ÚTEIS
-- ============================================================

-- Função para gerar código de indicação único
CREATE OR REPLACE FUNCTION public.gerar_codigo_indicacao()
RETURNS TEXT AS $$
BEGIN
  LOOP
    RETURN substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular SB Score baseado em atividades
CREATE OR REPLACE FUNCTION public.calcular_sb_score(p_corretor_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 85; -- Base score
  v_cursos_concluidos INTEGER;
  v_atendimentos_concluidos INTEGER;
  v_vgv_total NUMERIC;
BEGIN
  -- +10 pontos por curso concluído
  SELECT COUNT(*) INTO v_cursos_concluidos
  FROM public.progresso_cursos pc
  JOIN public.cursos c ON pc.curso_id = c.id
  WHERE pc.corretor_id = p_corretor_id AND pc.concluido = TRUE;
  
  v_score := v_score + (v_cursos_concluidos * 10);
  
  -- +5 pontos por atendimento concluído
  SELECT COUNT(*) INTO v_atendimentos_concluidos
  FROM public.atendimentos
  WHERE corretor_id = p_corretor_id AND status = 'concluido';
  
  v_score := v_score + (v_atendimentos_concluidos * 5);
  
  -- +1 ponto por cada R$ 10.000 de VGV
  SELECT COALESCE(SUM(vgv), 0) INTO v_vgv_total
  FROM public.atendimentos
  WHERE corretor_id = p_corretor_id AND status = 'concluido';
  
  v_score := v_score + (v_vgv_total / 10000)::INTEGER;
  
  -- Limitar score a 1000
  IF v_score > 1000 THEN
    v_score := 1000;
  END IF;
  
  -- Atualizar profile
  UPDATE public.profiles SET sb_score = v_score WHERE id = p_corretor_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View de perfil completo com estatísticas
CREATE OR REPLACE VIEW public.perfil_completo AS
SELECT 
  p.*,
  pl.nome as plano_nome,
  pl.preco_mensal,
  COUNT(DISTINCT i.id) as total_imoveis,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT a.id) as total_atendimentos,
  COALESCE(SUM(a.valor_honorario), 0) as total_honorarios,
  COALESCE(SUM(a.valor_sb), 0) as total_sb,
  COUNT(DISTINCT rm.beneficiario_id) as total_rede_indicados,
  COUNT(DISTINCT pc.curso_id) as total_cursos_concluidos
FROM public.profiles p
LEFT JOIN public.planos pl ON p.plano_id = pl.id
LEFT JOIN public.imoveis i ON p.id = i.corretor_id
LEFT JOIN public.crm_leads l ON p.id = l.corretor_id
LEFT JOIN public.atendimentos a ON p.id = a.corretor_id
LEFT JOIN public.rede_multinivel rm ON p.id = rm.corretor_id
LEFT JOIN public.progresso_cursos pc ON p.id = pc.corretor_id AND pc.concluido = TRUE
GROUP BY p.id, pl.nome, pl.preco_mensal;

-- ============================================================
-- TRIGGERS DE ATUALIZAÇÃO
-- ============================================================

-- Trigger para atualizar VGV total do corretor
CREATE OR REPLACE FUNCTION public.atualizar_vgv_corretor()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET vgv_total = (
      SELECT COALESCE(SUM(valor_honorario), 0)
      FROM public.atendimentos
      WHERE corretor_id = NEW.corretor_id AND status = 'concluido'
    )
    WHERE id = NEW.corretor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET vgv_total = (
      SELECT COALESCE(SUM(valor_honorario), 0)
      FROM public.atendimentos
      WHERE corretor_id = OLD.corretor_id AND status = 'concluido'
    )
    WHERE id = OLD.corretor_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_atualizar_vgv_corretor
  AFTER INSERT OR UPDATE OR DELETE ON public.atendimentos
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_vgv_corretor();

-- ============================================================
-- RESULTADO FINAL
-- ============================================================

SELECT 'MIGRAÇÃO SECURITY BROKER SB v7.0 IMPERIUM CONCLUÍDA ✅' AS status,
       (SELECT COUNT(*) FROM public.profiles) as total_perfis,
       (SELECT COUNT(*) FROM public.planos) as total_planos,
       (SELECT COUNT(*) FROM public.cursos) as total_cursos,
       (SELECT COUNT(*) FROM public.imoveis) as total_imoveis;
