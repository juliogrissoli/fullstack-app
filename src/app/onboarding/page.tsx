// 🏛️ SECURITY BROKER SB v7.0 - ONBOARDING
// Fluxo em 4 etapas para novos usuários

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface EtapaData {
  etapa1: {
    nome: string;
    telefone: string;
    creci: string;
    cidade: string;
    estado: string;
    bio: string;
  };
  etapa2: {
    foto_url: string | null;
  };
  etapa3: {
    slug: string;
  };
  etapa4: {
    cursoConcluido: boolean;
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [cursosObrigatorios, setCursosObrigatorios] = useState<any[]>([]);
  
  const [etapaData, setEtapaData] = useState<EtapaData>({
    etapa1: {
      nome: '',
      telefone: '',
      creci: '',
      cidade: '',
      estado: 'SP',
      bio: ''
    },
    etapa2: {
      foto_url: null
    },
    etapa3: {
      slug: ''
    },
    etapa4: {
      cursoConcluido: false
    }
  });

  useEffect(() => {
    carregarDadosUsuario();
    carregarCursosObrigatorios();
  }, []);

  const carregarDadosUsuario = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Carregar dados do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setEtapaData(prev => ({
          ...prev,
          etapa1: {
            nome: profile.nome || '',
            telefone: profile.telefone || '',
            creci: profile.creci || '',
            cidade: profile.cidade || '',
            estado: profile.estado || 'SP',
            bio: profile.bio || ''
          },
          etapa2: {
            foto_url: profile.foto_url || null
          },
          etapa3: {
            slug: profile.slug || ''
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do usuário');
    }
  };

  const carregarCursosObrigatorios = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('cursos')
        .select('*')
        .eq('obrigatorio', true)
        .order('ordem');

      setCursosObrigatorios(data || []);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const validarEtapa1 = (): boolean => {
    const { nome, telefone, creci, cidade, bio } = etapaData.etapa1;
    
    if (!nome || nome.length < 3) {
      toast.error('Nome deve ter pelo menos 3 caracteres');
      return false;
    }
    
    if (!telefone || !/^\(\d{2}\) \d{5}-\d{4}$/.test(telefone)) {
      toast.error('Telefone inválido');
      return false;
    }
    
    if (!creci || creci.length < 2) {
      toast.error('CRECI inválido');
      return false;
    }
    
    if (!cidade || cidade.length < 2) {
      toast.error('Cidade inválida');
      return false;
    }
    
    if (!bio || bio.length < 10) {
      toast.error('Bio deve ter pelo menos 10 caracteres');
      return false;
    }
    
    return true;
  };

  const validarEtapa3 = (): boolean => {
    const { slug } = etapaData.etapa3;
    
    if (!slug || slug.length < 3) {
      toast.error('Slug deve ter pelo menos 3 caracteres');
      return false;
    }
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Slug deve conter apenas letras minúsculas, números e hífens');
      return false;
    }
    
    return true;
  };

  const handleInputChange = (etapaNum: number, field: string, value: string) => {
    setEtapaData(prev => ({
      ...prev,
      [`etapa${etapaNum}`]: {
        ...prev[`etapa${etapaNum}` as keyof EtapaData],
        [field]: value
      }
    }));
  };

  const handleTelefoneChange = (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    handleInputChange(1, 'telefone', formatted);
  };

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    handleInputChange(3, 'slug', slug);
  };

  const uploadFoto = async (file: File) => {
    if (!file) return null;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Foto deve ter no máximo 5MB');
      return null;
    }

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
      return null;
    }
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const fotoUrl = await uploadFoto(file);
    
    if (fotoUrl) {
      handleInputChange(2, 'foto_url', fotoUrl);
      toast.success('Foto enviada com sucesso!');
    }
    
    setLoading(false);
  };

  const salvarEtapa = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const supabase = createClient();
      
      if (etapa === 1) {
        if (!validarEtapa1()) {
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            nome: etapaData.etapa1.nome,
            telefone: etapaData.etapa1.telefone,
            creci: etapaData.etapa1.creci,
            cidade: etapaData.etapa1.cidade,
            estado: etapaData.etapa1.estado,
            bio: etapaData.etapa1.bio
          })
          .eq('id', user.id);

        if (error) throw error;
      }
      
      if (etapa === 2 && etapaData.etapa2.foto_url) {
        const { error } = await supabase
          .from('profiles')
          .update({ foto_url: etapaData.etapa2.foto_url })
          .eq('id', user.id);

        if (error) throw error;
      }
      
      if (etapa === 3) {
        if (!validarEtapa3()) {
          setLoading(false);
          return;
        }

        // Verificar se slug já existe
        const { data: existingSlug } = await supabase
          .from('profiles')
          .select('slug')
          .eq('slug', etapaData.etapa3.slug)
          .neq('id', user.id)
          .single();

        if (existingSlug) {
          toast.error('Este slug já está em uso. Escolha outro.');
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update({ slug: etapaData.etapa3.slug })
          .eq('id', user.id);

        if (error) throw error;
      }

      if (etapa < 4) {
        setEtapa(etapa + 1);
        toast.success(`Etapa ${etapa} concluída!`);
      }

    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const iniciarCursoObrigatorio = async (cursoId: string) => {
    if (!user) return;

    try {
      const supabase = createClient();
      
      // Iniciar progresso do curso
      const { error } = await supabase
        .from('progresso_cursos')
        .upsert({
          corretor_id: user.id,
          curso_id: cursoId,
          concluido: false,
          percentual_progresso: 0
        });

      if (error) throw error;

      toast.success('Curso iniciado!');
      router.push(`/dashboard/academy/${cursoId}`);
    } catch (error) {
      console.error('Erro ao iniciar curso:', error);
      toast.error('Erro ao iniciar curso');
    }
  };

  const concluirOnboarding = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const supabase = createClient();
      
      // Marcar onboarding como concluído (poderíamos ter um campo no profile)
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: true })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Onboarding concluído com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao concluir onboarding:', error);
      toast.error('Erro ao concluir onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-500 mb-2">
            🏛️ Bem-vindo ao Security Broker SB
          </h1>
          <p className="text-gray-400">
            Vamos configurar seu perfil em 4 passos rápidos
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  etapa >= num
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(etapa / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Etapa 1: Dados Pessoais */}
        {etapa === 1 && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6">1. Confirme seus dados</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={etapaData.etapa1.nome}
                  onChange={(e) => handleInputChange(1, 'nome', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Telefone *</label>
                <input
                  type="tel"
                  value={etapaData.etapa1.telefone}
                  onChange={(e) => handleTelefoneChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CRECI *</label>
                <input
                  type="text"
                  value={etapaData.etapa1.creci}
                  onChange={(e) => handleInputChange(1, 'creci', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="12345-SP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado *</label>
                <select
                  value={etapaData.etapa1.estado}
                  onChange={(e) => handleInputChange(1, 'estado', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="BA">Bahia</option>
                  <option value="PR">Paraná</option>
                  <option value="RS">Rio Grande do Sul</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cidade *</label>
                <input
                  type="text"
                  value={etapaData.etapa1.cidade}
                  onChange={(e) => handleInputChange(1, 'cidade', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="São Paulo"
                />
              </div>
            </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Bio *</label>
                <textarea
                  value={etapaData.etapa1.bio}
                  onChange={(e) => handleInputChange(1, 'bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Fale um pouco sobre você e sua experiência no mercado imobiliário..."
                />
              </div>

              <button
                onClick={salvarEtapa}
                disabled={loading}
                className="w-full btn-gold-glow py-3 text-lg font-semibold mt-6 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Continuar'}
              </button>
            </div>
        )}

        {/* Etapa 2: Foto de Perfil */}
        {etapa === 2 && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6">2. Adicione sua foto</h2>
            
            <div className="text-center">
              {etapaData.etapa2.foto_url ? (
                <div className="mb-6">
                  <img
                    src={etapaData.etapa2.foto_url}
                    alt="Foto de perfil"
                    className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-yellow-500"
                  />
                  <p className="text-green-400">✓ Foto enviada com sucesso!</p>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl text-gray-500">👤</span>
                  </div>
                  <p className="text-gray-400">Envie uma foto profissional</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  {etapaData.etapa2.foto_url ? 'Alterar foto' : 'Enviar foto'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoUpload}
                  className="hidden"
                  id="foto-upload"
                />
                <label
                  htmlFor="foto-upload"
                  className="inline-block px-6 py-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition"
                >
                  {etapaData.etapa2.foto_url ? 'Escolher outra foto' : 'Escolher foto'}
                </label>
                <p className="text-sm text-gray-400 mt-2">
                  Formatos: JPG, PNG. Tamanho máximo: 5MB
                </p>
              </div>

              <button
                onClick={salvarEtapa}
                disabled={loading || !etapaData.etapa2.foto_url}
                className="w-full btn-gold-glow py-3 text-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {/* Etapa 3: Slug da Página Pública */}
        {etapa === 3 && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6">3. Defina seu link público</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                URL da sua página pública *
              </label>
              <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                <span className="px-4 text-gray-400">securitybroker.com.br/</span>
                <input
                  type="text"
                  value={etapaData.etapa3.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="flex-1 px-4 py-2 bg-transparent focus:outline-none"
                  placeholder="joao-silva"
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Use apenas letras minúsculas, números e hífens. Este será seu link único.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300">
                <strong>Exemplo:</strong> securitybroker.com.br/<span className="text-yellow-500">{etapaData.etapa3.slug || 'seu-nome'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Esta página mostrará seus imóveis e informações de contato para clientes.
              </p>
            </div>

            <button
              onClick={salvarEtapa}
              disabled={loading}
              className="w-full btn-gold-glow py-3 text-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Continuar'}
            </button>
          </div>
        )}

        {/* Etapa 4: Curso Obrigatório */}
        {etapa === 4 && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6">4. Faça o curso obrigatório</h2>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Para usar a plataforma, você precisa completar o curso "Onboarding Security Broker".
              </p>

              {cursosObrigatorios.map((curso) => (
                <div key={curso.id} className="bg-gray-700 rounded-lg p-6 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-yellow-500 mb-2">
                        {curso.titulo}
                      </h3>
                      <p className="text-gray-300 mb-2">{curso.descricao}</p>
                      <div className="flex items-center text-sm text-gray-400">
                        <span className="mr-4">⏱️ {curso.duracao_minutos} min</span>
                        <span>🏆 {curso.pontos_sb_score} pontos SB Score</span>
                      </div>
                    </div>
                    <button
                      onClick={() => iniciarCursoObrigatorio(curso.id)}
                      className="ml-4 btn-gold-glow px-6 py-2"
                    >
                      Iniciar Curso
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={concluirOnboarding}
              disabled={loading || !etapaData.etapa4.cursoConcluido}
              className="w-full btn-gold-glow py-3 text-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Finalizando...' : 'Ir para o Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
