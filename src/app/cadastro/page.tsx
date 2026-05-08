// 🏛️ SECURITY BROKER SB v7.0 - CADASTRO
// Formulário de cadastro com validação e indicação

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registrarIndicacao, validarCodigoIndicacao } from '@/lib/multinivel';
import toast from 'react-hot-toast';

interface FormData {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  creci: string;
  role: 'corretor' | 'gestor' | 'diretor';
  codigoIndicacao: string;
}

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>('');
  
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    creci: '',
    role: 'corretor',
    codigoIndicacao: searchParams.get('indica') || ''
  });

  const [erros, setErros] = useState<Partial<FormData>>({});

  useEffect(() => {
    const plano = searchParams.get('plano');
    if (plano) {
      setPlanoSelecionado(plano);
    }
  }, [searchParams]);

  const validarEtapa1 = (): boolean => {
    const novosErros: Partial<FormData> = {};

    if (!formData.nome || formData.nome.length < 3) {
      novosErros.nome = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      novosErros.email = 'Email inválido';
    }

    if (!formData.senha || formData.senha.length < 6) {
      novosErros.senha = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.senha !== formData.confirmarSenha) {
      novosErros.confirmarSenha = 'Senhas não conferem';
    }

    if (!formData.telefone || !/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      novosErros.telefone = 'Telefone inválido';
    }

    if (!formData.creci || formData.creci.length < 2) {
      novosErros.creci = 'CRECI inválido';
    }

    if (formData.codigoIndicacao && !validarCodigoIndicacao(formData.codigoIndicacao)) {
      novosErros.codigoIndicacao = 'Código de indicação inválido';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo quando usuário digitar
    if (erros[name as keyof FormData]) {
      setErros(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    setFormData(prev => ({ ...prev, telefone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarEtapa1()) {
      toast.error('Corrija os erros antes de continuar');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome,
            telefone: formData.telefone,
            creci: formData.creci,
            role: formData.role,
            plano: planoSelecionado || 'basic',
            trial_inicio: new Date().toISOString(),
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // 2. Registrar indicação se houver código
      if (formData.codigoIndicacao) {
        await registrarIndicacao(supabase, authData.user.id, formData.codigoIndicacao);
        toast.success('Indicação registrada com sucesso!');
      }

      // 3. Enviar email de boas-vindas
      await fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          nome: formData.nome
        })
      });

      toast.success('Cadastro realizado! Bem-vindo ao Security Broker SB.');

      // 4. Redirecionar: onboarding → depois dashboard (7 dias trial automático)
      router.push(`/onboarding?plano=${planoSelecionado || 'basic'}`);

    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast.error('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-500 mb-2">🏛️ Security Broker SB</h1>
          <p className="text-gray-400">Crie sua conta gratuita</p>
        </div>

        {/* Formulário */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Dados Pessoais</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      erros.nome ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="João Silva"
                  />
                  {erros.nome && (
                    <p className="text-red-400 text-sm mt-1">{erros.nome}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      erros.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="joao@exemplo.com"
                  />
                  {erros.email && (
                    <p className="text-red-400 text-sm mt-1">{erros.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleTelefoneChange}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      erros.telefone ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="(11) 98765-4321"
                  />
                  {erros.telefone && (
                    <p className="text-red-400 text-sm mt-1">{erros.telefone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="creci" className="block text-sm font-medium mb-2">
                    CRECI *
                  </label>
                  <input
                    type="text"
                    id="creci"
                    name="creci"
                    value={formData.creci}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      erros.creci ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="12345-SP"
                  />
                  {erros.creci && (
                    <p className="text-red-400 text-sm mt-1">{erros.creci}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Senha */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Senha</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="senha" className="block text-sm font-medium mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    value={formData.senha}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      erros.senha ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {erros.senha && (
                    <p className="text-red-400 text-sm mt-1">{erros.senha}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmarSenha" className="block text-sm font-medium mb-2">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    id="confirmarSenha"
                    name="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      erros.confirmarSenha ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Confirme sua senha"
                  />
                  {erros.confirmarSenha && (
                    <p className="text-red-400 text-sm mt-1">{erros.confirmarSenha}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tipo de Conta */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                Tipo de Conta
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="corretor">Corretor Autônomo</option>
                <option value="gestor">Gestor de Imobiliária</option>
                <option value="diretor">Diretor</option>
              </select>
            </div>

            {/* Código de Indicação */}
            <div>
              <label htmlFor="codigoIndicacao" className="block text-sm font-medium mb-2">
                Código de Indicação (Opcional)
              </label>
              <input
                type="text"
                id="codigoIndicacao"
                name="codigoIndicacao"
                value={formData.codigoIndicacao}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  erros.codigoIndicacao ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="ABC12345"
              />
              {erros.codigoIndicacao && (
                <p className="text-red-400 text-sm mt-1">{erros.codigoIndicacao}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">
                Se foi indicado por alguém, digite o código de 8 caracteres
              </p>
            </div>

            {/* Termos */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="termos"
                required
                className="mt-1 mr-2 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-yellow-500"
              />
              <label htmlFor="termos" className="text-sm text-gray-300">
                Li e aceito os{' '}
                <Link href="/termos" className="text-yellow-500 hover:text-yellow-400">
                  Termos de Uso
                </Link>
                {' '}e a{' '}
                <Link href="/privacidade" className="text-yellow-500 hover:text-yellow-400">
                  Política de Privacidade
                </Link>
              </label>
            </div>

            {/* Botão de Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold-glow py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cadastrando...' : 'Criar Conta Grátis'}
            </button>
          </form>

          {/* Link para Login */}
          <div className="text-center mt-6">
            <p className="text-gray-400">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-yellow-500 hover:text-yellow-400">
                Entrar
              </Link>
            </p>
          </div>
        </div>

        {/* Benefícios */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold mb-4">Comece grátis com:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
            <div>✓ 7 dias de teste</div>
            <div>✓ Até 3 imóveis</div>
            <div>✓ Até 10 leads</div>
            <div>✓ SB Academy básico</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-white">Carregando...</div></div>}>
      <CadastroForm />
    </Suspense>
  );
}
