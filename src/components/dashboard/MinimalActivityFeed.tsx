
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { DashboardActivity } from '@/services/DashboardService';

interface MinimalActivityFeedProps {
  activities: DashboardActivity[];
}

export const MinimalActivityFeed: React.FC<MinimalActivityFeedProps> = ({ 
  activities 
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payroll': return '💰';
      case 'employee': return '👤';
      case 'report': return '📊';
      default: return '💳';
    }
  };

  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center space-x-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span>Actividad Reciente</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 py-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{activity.action}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-muted-foreground">por {activity.user}</p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay actividad reciente</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
