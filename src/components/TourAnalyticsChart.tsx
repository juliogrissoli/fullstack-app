'use client';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

interface DataPoint {
    dia: string;
    visitas: number;
    conversoes: number;
}

export default function TourAnalyticsChart({ data }: { data: DataPoint[] }) {
    const formatted = data.map(d => ({
        ...d,
        dia: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        }),
    }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatted} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="dia"
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        axisLine={{ stroke: '#4B5563' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #4B5563',
                            borderRadius: '8px',
                            fontSize: '13px',
                        }}
                        labelStyle={{ color: '#D4AF37', marginBottom: 4, fontWeight: 600 }}
                        itemStyle={{ color: '#E5E7EB' }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }}
                        formatter={(value) => value === 'visitas' ? 'Visitas' : 'Intenção alta'}
                    />
                    <Line
                        type="monotone"
                        dataKey="visitas"
                        name="visitas"
                        stroke="#6B7280"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#6B7280' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="conversoes"
                        name="conversoes"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#D4AF37' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
