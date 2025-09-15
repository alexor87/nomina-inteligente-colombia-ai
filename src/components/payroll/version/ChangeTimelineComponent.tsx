import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ArrowRight, 
  User, 
  Calendar, 
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { PayrollVersionData } from '@/services/PayrollVersionService';
import { VersionSummaryMetrics } from '@/services/PeriodVersionComparisonService';

interface ChangeTimelineComponentProps {
  initialVersion: PayrollVersionData | null;
  currentVersion: PayrollVersionData | null;
  metrics: VersionSummaryMetrics;
  periodName: string;
}

export const ChangeTimelineComponent: React.FC<ChangeTimelineComponentProps> = ({
  initialVersion,
  currentVersion,
  metrics,
  periodName
}) => {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const timelineEvents = [
    ...(initialVersion ? [{
      id: 'initial',
      title: 'Liquidación Initial',
      description: 'Se creó la liquidación inicial del período',
      timestamp: initialVersion.created_at,
      type: 'initial' as const,
      user: initialVersion.created_by || 'Sistema',
      details: initialVersion.changes_summary || 'Liquidación automática inicial'
    }] : []),
    ...(currentVersion && currentVersion.id !== initialVersion?.id ? [{
      id: 'current',
      title: 'Cambios Aplicados',
      description: `Se aplicaron cambios que afectaron ${metrics.employeesWithChanges} empleados`,
      timestamp: currentVersion.created_at,
      type: 'modification' as const,
      user: currentVersion.created_by || 'Usuario',
      details: currentVersion.changes_summary || 'Cambios manuales aplicados'
    }] : [])
  ];

  const getEventIcon = (type: 'initial' | 'modification') => {
    switch (type) {
      case 'initial':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'modification':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventColor = (type: 'initial' | 'modification') => {
    switch (type) {
      case 'initial':
        return 'bg-success/10 border-success/20';
      case 'modification':
        return 'bg-warning/10 border-warning/20';
      default:
        return 'bg-muted/10 border-muted/20';
    }
  };

  if (timelineEvents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay eventos en el historial para este período.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Cronología de Cambios - {periodName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline Overview */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Período de Cambios</p>
              <p className="text-sm text-muted-foreground">
                {timelineEvents.length > 1 
                  ? `${formatDateTime(timelineEvents[0].timestamp)} → ${formatDateTime(timelineEvents[timelineEvents.length - 1].timestamp)}`
                  : formatDateTime(timelineEvents[0].timestamp)
                }
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {timelineEvents.length} evento{timelineEvents.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Timeline Events */}
        <div className="space-y-6">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative">
              {/* Timeline Line */}
              {index < timelineEvents.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-muted-foreground/20"></div>
              )}
              
              {/* Event Card */}
              <div className={`p-4 rounded-lg border ${getEventColor(event.type)}`}>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-background rounded-full border">
                    {getEventIcon(event.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {event.type === 'initial' ? 'Automático' : 'Manual'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateTime(event.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{event.user}</span>
                      </div>
                    </div>
                    
                    {event.details && (
                      <div className="flex items-start gap-2 p-2 bg-background/50 rounded border">
                        <FileText className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">{event.details}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Impact Summary */}
        {metrics.employeesWithChanges > 0 && (
          <div className="p-4 bg-info/5 border border-info/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-info/10 rounded">
                <ArrowRight className="h-4 w-4 text-info" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-info">Resultado de los Cambios</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• {metrics.employeesWithChanges} empleados afectados</p>
                  <p>• Impacto económico total: {metrics.totalImpactAmount >= 0 ? '+' : ''}{
                    new Intl.NumberFormat('es-CO', { 
                      style: 'currency', 
                      currency: 'COP',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0 
                    }).format(metrics.totalImpactAmount)
                  }</p>
                  {metrics.novedadesAdded > 0 && <p>• {metrics.novedadesAdded} novedades agregadas</p>}
                  {metrics.novedadesRemoved > 0 && <p>• {metrics.novedadesRemoved} novedades eliminadas</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};