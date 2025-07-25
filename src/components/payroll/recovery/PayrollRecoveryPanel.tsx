import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Activity
} from 'lucide-react';
import { usePayrollRecovery } from '@/hooks/usePayrollRecovery';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface PayrollRecoveryPanelProps {
  onClose?: () => void;
}

export const PayrollRecoveryPanel: React.FC<PayrollRecoveryPanelProps> = ({ onClose }) => {
  const { companyId } = useCurrentCompany();
  
  const {
    isAnalyzing,
    isRecovering,
    consistencyReport,
    recoveryPlans,
    recoveryResults,
    analyzeSystemHealth,
    executePlan,
    quickAutoRecovery,
    autoRepairIssues,
    clearResults,
    hasIssues,
    hasCriticalIssues,
    systemHealth,
    isReady
  } = usePayrollRecovery(companyId || '');

  // Análisis automático al cargar
  useEffect(() => {
    if (companyId && isReady) {
      analyzeSystemHealth();
    }
  }, [companyId, isReady, analyzeSystemHealth]);

  const getHealthIcon = () => {
    if (isAnalyzing) return <Activity className="w-5 h-5 animate-spin" />;
    
    switch (systemHealth) {
      case 'healthy': return <Heart className="w-5 h-5 text-green-500" />;
      case 'minor_issues': return <ShieldCheck className="w-5 h-5 text-yellow-500" />;
      case 'major_issues': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getHealthBadge = () => {
    if (isAnalyzing) {
      return <Badge variant="outline">Analizando...</Badge>;
    }

    switch (systemHealth) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Saludable</Badge>;
      case 'minor_issues':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Problemas Menores</Badge>;
      case 'major_issues':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Problemas Importantes</Badge>;
      case 'critical':
        return <Badge variant="destructive">Estado Crítico</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const handleQuickRecovery = async () => {
    if (!companyId) return;
    
    const userId = 'current-user'; // En producción, obtener del contexto de autenticación
    await quickAutoRecovery(userId);
  };

  const handleExecutePlan = async (plan: any) => {
    if (!companyId) return;
    
    const userId = 'current-user'; // En producción, obtener del contexto de autenticación
    await executePlan(plan, userId);
  };

  return (
    <div className="space-y-6">
      {/* Header con estado general */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getHealthIcon()}
              <div>
                <CardTitle className="text-lg">Sistema de Recuperación</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitoreo y reparación automática
                </p>
              </div>
            </div>
            {getHealthBadge()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Métricas del sistema */}
          {consistencyReport && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {consistencyReport.totalIssues}
                </div>
                <div className="text-xs text-muted-foreground">Total Problemas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {consistencyReport.criticalIssues}
                </div>
                <div className="text-xs text-muted-foreground">Críticos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {recoveryPlans.length}
                </div>
                <div className="text-xs text-muted-foreground">Planes Disponibles</div>
              </div>
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={analyzeSystemHealth}
              disabled={isAnalyzing || isRecovering}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Analizar
            </Button>

            {hasIssues && (
              <Button
                size="sm"
                onClick={handleQuickRecovery}
                disabled={isAnalyzing || isRecovering}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Recuperación Rápida
              </Button>
            )}

            {hasIssues && (
              <Button
                size="sm"
                variant="outline"
                onClick={autoRepairIssues}
                disabled={isAnalyzing || isRecovering || !consistencyReport}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Reparar Auto
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={clearResults}
              disabled={isAnalyzing || isRecovering}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de progreso durante operaciones */}
      {(isAnalyzing || isRecovering) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{isAnalyzing ? 'Analizando sistema...' : 'Ejecutando recuperación...'}</span>
                <span>{isAnalyzing ? '🔍' : '🔧'}</span>
              </div>
              <Progress value={isAnalyzing ? 45 : 75} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de problemas detectados */}
      {consistencyReport && consistencyReport.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Problemas Detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consistencyReport.issues.map((issue, index) => (
                <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>{issue.periodName}</strong>: {issue.description}
                      </div>
                      <Badge 
                        variant={issue.severity === 'critical' ? 'destructive' : 'outline'}
                        className="ml-2"
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planes de recuperación disponibles */}
      {recoveryPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Planes de Recuperación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recoveryPlans.map((plan) => (
                <div 
                  key={plan.periodId} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{plan.periodName}</div>
                      <div className="text-sm text-muted-foreground">
                        {plan.actions.length} acciones • {plan.estimatedDuration}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={plan.priority === 'critical' ? 'destructive' : 
                                plan.priority === 'high' ? 'outline' : 'secondary'}
                      >
                        {plan.priority}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleExecutePlan(plan)}
                        disabled={isRecovering}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Ejecutar
                      </Button>
                    </div>
                  </div>

                  {/* Acciones del plan */}
                  <div className="space-y-1">
                    {plan.actions.map((action, index) => (
                      <div key={action.id} className="text-sm flex items-center">
                        <Clock className="w-3 h-3 mr-2 text-muted-foreground" />
                        {action.description}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados de recuperaciones ejecutadas */}
      {Object.keys(recoveryResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Resultados de Recuperación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(recoveryResults).map(([planId, result]) => (
                <div key={planId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Plan {planId.slice(0, 8)}</span>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Exitoso' : 'Fallos'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {result.actionsCompleted}/{result.actionsTotal} acciones completadas
                    {result.duration && ` en ${Math.round(result.duration / 1000)}s`}
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado saludable */}
      {!hasIssues && consistencyReport && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Heart className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-700 mb-2">
              Sistema Saludable
            </h3>
            <p className="text-sm text-muted-foreground">
              No se detectaron problemas de consistencia en el sistema de nómina.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};