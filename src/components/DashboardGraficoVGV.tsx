// 🏛️ SECURITY BROKER SB v7.0 - DASHBOARD GRÁFICO VGV
// Gráfico de área com Recharts para mostrar VGV mensal

'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardGraficoVGVProps {
  dados: Record<string, number>;
}

export default function DashboardGraficoVGV({ dados }: DashboardGraficoVGVProps) {
  // Transformar dados para o formato do Recharts
  const chartData = Object.entries(dados).map(([mes, valor]) => ({
    mes,
    valor,
  }));

  const formatarMoeda = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="mes" 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tickFormatter={formatarMoeda}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #D4AF37',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#D4AF37' }}
            formatter={(value: number) => [formatarMoeda(value), 'VGV']}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="#D4AF37"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValor)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
