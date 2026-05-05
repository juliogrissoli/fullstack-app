// 🏛️ SECURITY BROKER SB v7.0 - DASHBOARD CARD
// Componente reutilizável para cards do dashboard

interface DashboardCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  color?: string;
}

export default function DashboardCard({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'text-white' 
}: DashboardCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-sm font-semibold ${color}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
