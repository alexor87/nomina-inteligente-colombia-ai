import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SimulationResult } from '@/types/simulation';

interface SimulationCardProps {
  result: SimulationResult;
  onAction?: (action: string) => void;
}

export const SimulationCard = ({ result, onAction }: SimulationCardProps) => {
  const { scenario, comparison, roi, recommendations, risks } = result;

  const getRiskColor = () => {
    switch (roi.riskLevel) {
      case 'low':
        return 'bg-secondary text-secondary-foreground';
      case 'medium':
        return 'bg-primary text-primary-foreground';
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    return comparison.totalCostChange > 0 ? TrendingUp : TrendingDown;
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-background to-muted/20 border-2">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">
              🎯 {scenario.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {scenario.description}
            </p>
          </div>
          <Badge className={getRiskColor()}>
            {roi.riskLevel === 'low' && '🟢 Bajo riesgo'}
            {roi.riskLevel === 'medium' && '🟡 Riesgo medio'}
            {roi.riskLevel === 'high' && '🔴 Riesgo alto'}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cambio en empleados */}
        {comparison.employeeCountChange !== 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Empleados</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {comparison.employeeCountChange > 0 ? '+' : ''}
                {comparison.employeeCountChange}
              </span>
            </div>
          </div>
        )}

        {/* Cambio en costo mensual */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Costo Mensual</span>
          </div>
          <div className="flex items-baseline gap-1">
            <TrendIcon className={`h-5 w-5 ${comparison.totalCostChange > 0 ? 'text-destructive' : 'text-secondary'}`} />
            <span className="text-2xl font-bold">
              {Math.abs(comparison.totalCostChangePercentage).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {comparison.totalCostChange > 0 ? '+' : ''}
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0
            }).format(comparison.monthlyCostIncrease)}
          </p>
        </div>

        {/* Impacto anual */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Impacto Anual</span>
          </div>
          <div className="space-y-1">
            <span className="text-xl font-bold block">
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0,
                notation: 'compact'
              }).format(Math.abs(comparison.annualCostIncrease))}
            </span>
            <p className="text-xs text-muted-foreground">
              por año
            </p>
          </div>
        </div>

        {/* Período de retorno */}
        {roi.paybackPeriod && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Retorno</span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-bold block">
                {roi.paybackPeriod}
              </span>
              <p className="text-xs text-muted-foreground">
                meses
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Confianza del análisis</span>
          <span className="text-sm font-bold">{roi.confidence}%</span>
        </div>
        <Progress value={roi.confidence} className="h-2" />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle className="h-4 w-4 text-secondary" />
            Recomendaciones
          </div>
          <ul className="space-y-2">
            {recommendations.slice(0, 3).map((rec, index) => (
              <li key={index} className="text-sm text-muted-foreground pl-6 relative">
                <span className="absolute left-0">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Riesgos a considerar
          </div>
          <ul className="space-y-2">
            {risks.slice(0, 3).map((risk, index) => (
              <li key={index} className="text-sm text-muted-foreground pl-6 relative">
                <span className="absolute left-0">⚠️</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <button
          onClick={() => onAction?.('view_timeline')}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver proyección mensual →
        </button>
        <button
          onClick={() => onAction?.('export')}
          className="text-xs font-medium text-primary hover:underline"
        >
          Exportar simulación →
        </button>
        <button
          onClick={() => onAction?.('compare')}
          className="text-xs font-medium text-primary hover:underline"
        >
          Comparar escenarios →
        </button>
      </div>
    </Card>
  );
};
