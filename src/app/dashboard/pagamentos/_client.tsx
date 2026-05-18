'use client';

import { useState } from 'react';

interface Broker {
  stripe_account_id: string | null;
  stripe_verified: boolean | null;
  stripe_customer_id: string | null;
  plan: string | null;
  plano_ativo_ate: string | null;
  full_name: string | null;
  email: string | null;
}

interface Transacao {
  id: string;
  amount: number;
  currency: string;
  status: string;
  event_type: string | null;
  created_at: string;
}

interface Props {
  broker: Broker | null;
  transacoes: Transacao[];
}

const PLANO_LABELS: Record<string, { label: string; cor: string }> = {
  starter: { label: 'Starter', cor: 'text-gray-400' },
  pro: { label: 'PRO', cor: 'text-yellow-400' },
  imperial: { label: 'Imperial', cor: 'text-purple-400' },
};

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PagamentosClient({ broker, transacoes }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const plano = broker?.plan ?? 'starter';
  const planoInfo = PLANO_LABELS[plano] ?? PLANO_LABELS.starter;
  const connectado = !!broker?.stripe_account_id && broker?.stripe_verified;

  async function conectarStripe() {
    setLoading('connect');
    setMsg(null);
    const res = await fetch('/api/stripe/connect', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMsg(data.error ?? 'Erro ao conectar Stripe');
    setLoading(null);
  }

  async function upgradePlano(novoplano: 'pro' | 'imperial') {
    setLoading(novoplano);
    setMsg(null);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano: novoplano }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMsg(data.error ?? 'Erro ao iniciar checkout');
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold text-[#D4AF37] mb-8">💳 Pagamentos & Plano</h1>

      {msg && (
        <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300">{msg}</div>
      )}

      {/* Status do Plano */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Plano Atual</p>
          <p className={`text-3xl font-bold ${planoInfo.cor}`}>{planoInfo.label}</p>
          {broker?.plano_ativo_ate && (
            <p className="text-xs text-gray-500 mt-1">
              Ativo até {new Date(broker.plano_ativo_ate).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Stripe Connect</p>
          <p className={`text-2xl font-bold ${connectado ? 'text-green-400' : 'text-red-400'}`}>
            {connectado ? '✅ Conectado' : '❌ Não conectado'}
          </p>
          {!connectado && (
            <p className="text-xs text-gray-500 mt-1">Necessário para receber comissões</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Transações</p>
          <p className="text-3xl font-bold text-white">{transacoes.length}</p>
          <p className="text-xs text-gray-500 mt-1">últimos registros</p>
        </div>
      </div>

      {/* Stripe Connect */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-[#D4AF37] mb-4">🔗 Stripe Connect — Recebimento de Comissões</h2>
        <p className="text-gray-400 text-sm mb-6">
          Conecte sua conta Stripe para receber comissões de vendas diretamente, com split automático.
        </p>
        {connectado ? (
          <div className="flex items-center gap-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-green-300 text-sm">
              Conta verificada e ativa
            </div>
            <button
              onClick={conectarStripe}
              disabled={loading === 'connect'}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              {loading === 'connect' ? 'Carregando...' : 'Atualizar dados bancários'}
            </button>
          </div>
        ) : (
          <button
            onClick={conectarStripe}
            disabled={loading === 'connect'}
            className="bg-[#D4AF37] hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition"
          >
            {loading === 'connect' ? 'Carregando...' : '⚡ Conectar conta Stripe'}
          </button>
        )}
      </div>

      {/* Upgrade de Plano */}
      {plano !== 'imperial' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-[#D4AF37] mb-6">🚀 Upgrade de Plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plano === 'starter' && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-yellow-400 mb-2">Anjoimob PRO</h3>
                <p className="text-3xl font-bold text-white mb-1">R$ 297<span className="text-sm text-gray-400">/mês</span></p>
                <ul className="text-sm text-gray-300 space-y-1 my-4">
                  <li>✅ CRM avançado ilimitado</li>
                  <li>✅ Split automático de comissões</li>
                  <li>✅ Tours 360° ilimitados</li>
                  <li>✅ YARA IA integrada</li>
                  <li>✅ Código de indicação PRO</li>
                </ul>
                <button
                  onClick={() => upgradePlano('pro')}
                  disabled={loading === 'pro'}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition"
                >
                  {loading === 'pro' ? 'Carregando...' : 'Assinar PRO'}
                </button>
              </div>
            )}
            <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-purple-400 mb-2">Anjoimob Imperial</h3>
              <p className="text-3xl font-bold text-white mb-1">R$ 997<span className="text-sm text-gray-400">/mês</span></p>
              <ul className="text-sm text-gray-300 space-y-1 my-4">
                <li>✅ Tudo do PRO</li>
                <li>✅ White Label completo</li>
                <li>✅ Gestão de incorporadoras</li>
                <li>✅ API dedicada + webhooks</li>
                <li>✅ Suporte prioritário 24h</li>
              </ul>
              <button
                onClick={() => upgradePlano('imperial')}
                disabled={loading === 'imperial'}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-lg transition"
              >
                {loading === 'imperial' ? 'Carregando...' : 'Assinar Imperial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Transações */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-[#D4AF37] mb-4">📋 Histórico de Transações Stripe</h2>
        {transacoes.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma transação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">Data</th>
                  <th className="text-left py-2 px-3">Evento</th>
                  <th className="text-right py-2 px-3">Valor</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t) => (
                  <tr key={t.id} className="border-b border-gray-700/50">
                    <td className="py-2 px-3 text-gray-400">
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-gray-300">
                      {t.event_type ?? 'Transação'}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-green-400">
                      {formatBRL(t.amount)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        t.status === 'paid' || t.status === 'succeeded'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
