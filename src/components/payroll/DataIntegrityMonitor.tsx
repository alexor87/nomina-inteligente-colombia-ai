
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  TrendingUp
} from 'lucide-react';
import { PayrollDataIntegrityService, DataIntegrityReport } from '@/services/payroll-intelligent/PayrollDataIntegrityService';
import { useToast } from '@/hooks/use-toast';

interface DataIntegrityMonitorProps {
  companyId: string;
  onCleanupComplete?: () => void;
}

export const DataIntegrityMonitor: React.FC<DataIntegrityMonitorProps> = ({
  companyId,
  onCleanupComplete
}) => {
  const [report, setReport] = useState<DataIntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadIntegrityReport();
  }, [companyId]);

  const loadIntegrityReport = async () => {
    try {
      setIsLoading(true);
      const integrityReport = await PayrollDataIntegrityService.generateIntegrityReport(companyId);
      setReport(integrityReport);
    } catch (error) {
      console.error('Error loading integrity report:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte de integridad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runCleanup = async () => {
    try {
      setIsRunningCleanup(true);
      const result = await PayrollDataIntegrityService.runAutomaticCleanup(companyId);
      
      if (result.success) {
        toast({
          title: "✅ Limpieza Completada",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
        
        // Reload report after cleanup
        await loadIntegrityReport();
        onCleanupComplete?.();
      } else {
        toast({
          title: "Error en Limpieza",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast({
        title: "Error",
        description: "Error ejecutando limpieza automática",
        variant: "destructive"
      });
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const getHealthStatus = () => {
    if (!report) return { status: 'unknown', color: 'gray', label: 'Desconocido' };
    
    const totalIssues = report.duplicatePeriods + report.orphanedPayrolls + 
                       report.missingPeriodIds + report.stateConsistencyIssues;
    
    if (totalIssues === 0) {
      return { status: 'healthy', color: 'green', label: 'Saludable' };
    } else if (totalIssues <= 5) {
      return { status: 'warning', color: 'yellow', label: 'Atención' };
    } else {
      return { status: 'critical', color: 'red', label: 'Crítico' };
    }
  };

  const health = getHealthStatus();

  if (isLoading) {
    return (
      <Card className="border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span>Analizando integridad de datos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No se pudo cargar el reporte de integridad</p>
            <Button onClick={loadIntegrityReport} className="mt-2">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-${health.color}-200`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Monitor de Integridad de Datos
          <Badge className={`bg-${health.color}-100 text-${health.color}-800`}>
            {health.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{report.totalPeriods}</div>
            <div className="text-sm text-gray-600">Total Períodos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{report.duplicatePeriods}</div>
            <div className="text-sm text-gray-600">Duplicados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{report.orphanedPayrolls}</div>
            <div className="text-sm text-gray-600">Huérfanos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{report.stateConsistencyIssues}</div>
            <div className="text-sm text-gray-600">Estados Inválidos</div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recomendaciones
          </h4>
          <div className="space-y-2">
            {report.recommendations.map((rec, index) => (
              <Alert key={index} className={rec.includes('✅') ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                <AlertDescription className="flex items-center gap-2">
                  {rec.includes('✅') ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  {rec}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={loadIntegrityReport} 
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          {health.status !== 'healthy' && (
            <Button 
              onClick={runCleanup}
              disabled={isRunningCleanup}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunningCleanup ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Ejecutar Limpieza
            </Button>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          Último análisis: {new Date(report.timestamp).toLocaleString('es-ES')}
        </div>
      </CardContent>
    </Card>
  );
};
