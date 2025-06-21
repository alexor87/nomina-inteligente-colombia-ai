
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon, 
  color = 'blue' 
}: MetricCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  const changeColor = change && change > 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${changeColor}`}>
              {change > 0 ? '+' : ''}{change}% desde el mes pasado
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};
