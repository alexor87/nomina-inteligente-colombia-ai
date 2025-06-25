
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, User, DollarSign, FileText, CreditCard } from 'lucide-react';

interface DashboardActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'payroll' | 'employee' | 'report' | 'payment';
}

interface DashboardActivityProps {
  activities: DashboardActivityItem[];
}

export const DashboardActivity = ({ activities }: DashboardActivityProps) => {
  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'payroll':
        return {
          icon: DollarSign,
          color: 'bg-green-100 text-green-700',
          bgColor: 'bg-green-50'
        };
      case 'employee':
        return {
          icon: User,
          color: 'bg-blue-100 text-blue-700',
          bgColor: 'bg-blue-50'
        };
      case 'report':
        return {
          icon: FileText,
          color: 'bg-purple-100 text-purple-700',
          bgColor: 'bg-purple-50'
        };
      case 'payment':
        return {
          icon: CreditCard,
          color: 'bg-orange-100 text-orange-700',
          bgColor: 'bg-orange-50'
        };
      default:
        return {
          icon: Activity,
          color: 'bg-gray-100 text-gray-700',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-white border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Activity className="h-5 w-5 mr-2 text-gray-600" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay actividad reciente</p>
            <p className="text-sm">Las acciones aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 8).map((activity) => {
              const config = getActivityConfig(activity.type);
              return (
                <div 
                  key={activity.id} 
                  className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                    <config.icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-').replace('-100', '-600')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-600">
                        por {activity.user}
                      </p>
                      <p className="text-xs text-gray-500 flex-shrink-0">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
