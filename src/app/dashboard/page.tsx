// 🏛️ SECURITY BROKER SB v7.0 - DASHBOARD
// Dashboard Bancário Gold Edition com métricas em tempo real

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/multinivel';
import DashboardGraficoVGV from '@/components/DashboardGraficoVGV';
import DashboardCard from '@/components/DashboardCard';
import SocialImpactMeter from '@/components/admin/SocialImpactMeter';
import LGPDComplianceBadge from '@/components/LGPDComplianceBadge';
import ClosingScript from '@/components/ClosingScript';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Buscar dados do usuário logado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Buscar perfil completo
  const { data: profile } = await supabase
    .from('perfil_completo')
    .select('*')
    .eq('id', user.id)
    .single();

  // Buscar estatísticas
  const { data: atendimentos } = await supabase
    .from('atendimentos')
    .select('valor_honorario, valor_sb, status, data_atendimento')
    .eq('corretor_id', user.id)
    .order('data_atendimento', { ascending: false })
    .limit(10);

  // Buscar dados da rede multinível
  const { data: rede } = await supabase
    .from('rede_multinivel')
    .select('valor_repasse, status, nivel')
    .eq('beneficiario_id', user.id);

  // Buscar leads recentes
  const { data: leads } = await supabase
    .from('crm_leads')
    .select('nome, email, telefone, status, created_at')
    .eq('corretor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Buscar imóveis
  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, titulo, preco, status, created_at')
    .eq('corretor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Calcular métricas
  const totalHonorarios = atendimentos?.reduce((sum, a) => sum + (a.valor_honorario || 0), 0) || 0;
  const totalSB = atendimentos?.reduce((sum, a) => sum + (a.valor_sb || 0), 0) || 0;
  const totalRepasses = rede?.reduce((sum, r) => sum + (r.valor_repasse || 0), 0) || 0;
  const repassesPendentes = rede?.filter(r => r.status === 'pendente').reduce((sum, r) => sum + (r.valor_repasse || 0), 0) || 0;
  
  const atendimentosConcluidos = atendimentos?.filter(a => a.status === 'concluido').length || 0;
  const totalLeads = leads?.length || 0;
  const totalImoveis = imoveis?.length || 0;

  // Dados para gráfico VGV últimos 6 meses
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
  
  const { data: vgvMensal } = await supabase
    .from('atendimentos')
    .select('valor_honorario, data_atendimento')
    .eq('corretor_id', user.id)
    .eq('status', 'concluido')
    .gte('data_atendimento', seisMesesAtras.toISOString())
    .order('data_atendimento');

  // Agrupar por mês
  const vgvPorMes = vgvMensal?.reduce((acc: any, atendimento) => {
    const mes = new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    acc[mes] = (acc[mes] || 0) + (atendimento.valor_honorario || 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-yellow-500">
                🏛️ Dashboard Bancário Gold Edition
              </h1>
              <p className="text-gray-400">
                Bem-vindo, {profile?.nome || 'Corretor'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">SB Score</p>
                <p className="text-2xl font-bold text-yellow-500">{profile?.sb_score || 85}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Plano</p>
                <p className="text-lg font-semibold">{profile?.plano_nome || 'Trial'}</p>
              </div>
              <button className="btn-gold-glow px-4 py-2">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="VGV Total"
            value={formatarMoeda(totalHonorarios)}
            icon="💰"
            trend={atendimentosConcluidos > 0 ? '+12%' : '0%'}
            color="text-green-400"
          />
          <DashboardCard
            title="Corretores na Rede"
            value={profile?.total_rede_indicados?.toString() || '0'}
            icon="👥"
            trend="+5 novos"
            color="text-blue-400"
          />
          <DashboardCard
            title="SB Score"
            value={profile?.sb_score?.toString() || '85'}
            icon="🏆"
            trend="+8 pontos"
            color="text-yellow-400"
          />
          <DashboardCard
            title="Atendimentos"
            value={atendimentosConcluidos.toString()}
            icon="🤝"
            trend="+3 esta semana"
            color="text-purple-400"
          />
        </div>

        {/* 🏛️ MEDIDÔMETRO DE IMPACTO SOCIAL */}
        <div className="mb-8">
          <SocialImpactMeter />
        </div>

        {/* Gráfico e Repasses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Gráfico VGV */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">VGV últimos 6 meses</h2>
            <DashboardGraficoVGV dados={vgvPorMes} />
          </div>

          {/* Repasses Multinível */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Repasses Multinível</h2>
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">A Receber</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {formatarMoeda(repassesPendentes)}
                </p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Recebido</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatarMoeda(totalRepasses - repassesPendentes)}
                </p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total da Rede</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatarMoeda(totalRepasses)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Extrato de Honorários */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Extrato de Honorários</h2>
            <button className="text-yellow-500 hover:text-yellow-400 text-sm">
              Ver todos
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Data</th>
                  <th className="text-left py-3 px-4">Descrição</th>
                  <th className="text-left py-3 px-4">Valor</th>
                  <th className="text-left py-3 px-4">SB (20%)</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {atendimentos?.map((atendimento, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-3 px-4">
                      {new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">Atendimento imobiliário</td>
                    <td className="py-3 px-4 font-semibold">
                      {formatarMoeda(atendimento.valor_honorario)}
                    </td>
                    <td className="py-3 px-4 text-yellow-500">
                      {formatarMoeda(atendimento.valor_sb)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        atendimento.status === 'concluido' 
                          ? 'bg-green-900 text-green-300'
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {atendimento.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grid de informações secundárias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads Recentes */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Leads Recentes</h2>
              <button className="text-yellow-500 hover:text-yellow-400 text-sm">
                Ver todos
              </button>
            </div>
            <div className="space-y-3">
              {leads?.map((lead, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                  <div>
                    <p className="font-semibold">{lead.nome}</p>
                    <p className="text-sm text-gray-400">{lead.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    lead.status === 'novo' 
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Imóveis Recentes */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Imóveis Recentes</h2>
              <button className="text-yellow-500 hover:text-yellow-400 text-sm">
                Ver todos
              </button>
            </div>
            <div className="space-y-3">
              {imoveis?.map((imovel, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                  <div>
                    <p className="font-semibold">{imovel.titulo}</p>
                    <p className="text-sm text-gray-400">
                      {formatarMoeda(imovel.preco)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    imovel.status === 'disponivel' 
                      ? 'bg-green-900 text-green-300'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {imovel.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scripts de Fechamento */}
        <div className="mt-8">
          <ClosingScript />
        </div>

        {/* Botão de Ação */}
        <div className="mt-8 text-center">
          <button className="btn-gold-glow px-8 py-4 text-lg">
            📄 Gerar Dossiê de Cobrança (SHA-256)
          </button>
        </div>

        {/* Selo LGPD Compliant */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              © 2024 SB Imperium v14.0 - Sistema Soberano de Decisão Patrimonial
            </div>
            <LGPDComplianceBadge showDetails={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
