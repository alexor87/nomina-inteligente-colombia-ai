import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Info,
  Target
} from 'lucide-react';
import { VersionSummaryMetrics, EmployeeVersionChange, PeriodVersionComparisonService } from '@/services/PeriodVersionComparisonService';

interface BusinessImpactSummaryProps {
  metrics: VersionSummaryMetrics;
  employeeChanges: EmployeeVersionChange[];
}

export const BusinessImpactSummary: React.FC<BusinessImpactSummaryProps> = ({
  metrics,
  employeeChanges
}) => {
  const getMostImpactedEmployees = () => {
    return employeeChanges
      .filter(change => Math.abs(change.impactAmount) > 0)
      .sort((a, b) => Math.abs(b.impactAmount) - Math.abs(a.impactAmount))
      .slice(0, 3);
  };

  const getBusinessRecommendations = () => {
    const recommendations = [];
    
    if (metrics.totalImpactAmount > 0) {
      recommendations.push({
        type: 'info' as const,
        title: 'Incremento en Nómina',
        description: `El costo total de nómina aumentó en ${PeriodVersionComparisonService.formatCurrency(metrics.totalImpactAmount)}. Verifique el presupuesto disponible.`
      });
    } else if (metrics.totalImpactAmount < 0) {
      recommendations.push({
        type: 'success' as const,
        title: 'Reducción en Nómina',
        description: `Se redujo el costo total en ${PeriodVersionComparisonService.formatCurrency(Math.abs(metrics.totalImpactAmount))}. Esto puede generar ahorro presupuestario.`
      });
    }

    if (metrics.novedadesAdded > 0) {
      recommendations.push({
        type: 'warning' as const,
        title: 'Novedades Agregadas',
        description: `Se agregaron ${metrics.novedadesAdded} novedades. Revise que estén correctamente justificadas y autorizadas.`
      });
    }

    if (metrics.employeesWithChanges > metrics.totalEmployeesCurrent * 0.3) {
      recommendations.push({
        type: 'warning' as const,
        title: 'Cambios Masivos',
        description: `Más del 30% de empleados fueron afectados. Considere comunicar estos cambios al equipo.`
      });
    }

    return recommendations;
  };

  const getImpactLevel = () => {
    const impactPercentage = Math.abs(metrics.totalImpactAmount) / (metrics.totalEmployeesCurrent * 1000000); // Assuming avg salary 1M
    
    if (impactPercentage > 0.1) return { level: 'high', color: 'text-destructive', label: 'Alto Impacto' };
    if (impactPercentage > 0.05) return { level: 'medium', color: 'text-warning', label: 'Impacto Medio' };
    return { level: 'low', color: 'text-success', label: 'Bajo Impacto' };
  };

  const mostImpactedEmployees = getMostImpactedEmployees();
  const recommendations = getBusinessRecommendations();
  const impactLevel = getImpactLevel();

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Resumen Ejecutivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Empleados Afectados</span>
              </div>
              <p className="text-2xl font-bold text-primary">{metrics.employeesWithChanges}</p>
              <p className="text-xs text-muted-foreground">
                de {metrics.totalEmployeesCurrent} total
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Impacto Total</span>
              </div>
              <p className={`text-2xl font-bold ${
                metrics.totalImpactAmount >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {metrics.totalImpactAmount >= 0 ? '+' : ''}
                {PeriodVersionComparisonService.formatCurrency(metrics.totalImpactAmount)}
              </p>
              <Badge variant="outline" className={impactLevel.color}>
                {impactLevel.label}
              </Badge>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Novedades</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium text-success">+{metrics.novedadesAdded}</span> agregadas
                </p>
                <p className="text-sm">
                  <span className="font-medium text-destructive">-{metrics.novedadesRemoved}</span> eliminadas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Impacted Employees */}
      {mostImpactedEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Empleados con Mayor Impacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostImpactedEmployees.map((employee, index) => (
                <div key={employee.employeeId} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{employee.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {PeriodVersionComparisonService.getChangeTypeLabel(employee.changeType)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {employee.impactAmount > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`font-medium ${
                      employee.impactAmount >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {employee.impactAmount >= 0 ? '+' : ''}
                      {PeriodVersionComparisonService.formatCurrency(employee.impactAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Recomendaciones de Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec, index) => (
              <Alert key={index} className={
                rec.type === 'success' ? 'bg-success/10 border-success/20' :
                rec.type === 'warning' ? 'bg-warning/10 border-warning/20' :
                rec.type === 'error' ? 'bg-destructive/10 border-destructive/20' :
                'bg-info/10 border-info/20'
              }>
                {rec.type === 'success' && <CheckCircle className="h-4 w-4 text-success" />}
                {rec.type === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
                {rec.type === 'info' && <Info className="h-4 w-4 text-info" />}
                <AlertDescription>
                  <strong>{rec.title}:</strong> {rec.description}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Próximos Pasos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p>Revisar y validar todos los cambios realizados</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p>Comunicar cambios significativos a los empleados afectados</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p>Actualizar presupuestos y proyecciones financieras</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p>Documentar justificaciones para auditorías futuras</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};