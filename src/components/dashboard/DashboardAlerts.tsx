
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, X, Clock } from 'lucide-react';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  actionRequired: boolean;
  dueDate?: string;
}

interface DashboardAlertsProps {
  alerts: Alert[];
  onDismissAlert: (alertId: string) => void;
}

export const DashboardAlerts = ({ alerts, onDismissAlert }: DashboardAlertsProps) => {
  const getAlertConfig = (type: string, priority: string) => {
    if (priority === 'high') {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        icon: AlertTriangle,
        iconColor: 'text-red-600'
      };
    } else if (type === 'warning') {
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      };
    } else {
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        icon: Info,
        iconColor: 'text-blue-600'
      };
    }
  };

  const sortedAlerts = alerts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
  });

  return (
    <Card className="bg-white border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Alertas Importantes
          </span>
          <Badge variant="secondary" className="bg-gray-100">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay alertas pendientes</p>
            <p className="text-sm">Todo está funcionando correctamente</p>
          </div>
        ) : (
          sortedAlerts.slice(0, 5).map((alert) => {
            const config = getAlertConfig(alert.type, alert.priority);
            return (
              <div 
                key={alert.id}
                className={`flex items-start p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor} transition-all hover:shadow-sm`}
              >
                <config.icon className={`h-5 w-5 mr-3 mt-0.5 ${config.iconColor} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${config.textColor}`}>
                        {alert.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.description}
                      </p>
                      <div className="flex items-center mt-2 space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            alert.priority === 'high' ? 'border-red-300 text-red-700' :
                            alert.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                            'border-blue-300 text-blue-700'
                          }`}
                        >
                          {alert.priority === 'high' ? 'Crítico' : 
                           alert.priority === 'medium' ? 'Medio' : 'Bajo'}
                        </Badge>
                        {alert.actionRequired && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Acción requerida
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismissAlert(alert.id)}
                      className="ml-2 h-8 w-8 p-0 hover:bg-white/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {alerts.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-gray-600">
              Ver todas las alertas ({alerts.length - 5} más)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
