
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { PayrollDataIntegrityService, DataIntegrityReport } from '@/services/payroll-intelligent/PayrollDataIntegrityService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { useToast } from '@/hooks/use-toast';

interface DataIntegrityMonitorProps {
  onIssuesDetected?: (issues: number) => void;
  compact?: boolean;
}

export const DataIntegrityMonitor: React.FC<DataIntegrityMonitorProps> = ({
  onIssuesDetected,
  compact = false
}) => {
  const [report, setReport] = useState<DataIntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();

  const generateReport = async () => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      console.log('🔍 Generando reporte de integridad...');
      
      const integrityReport = await PayrollDataIntegrityService.generateIntegrityReport(companyId);
      setReport(integrityReport);
      
      // Notificar sobre problemas detectados
      const totalIssues = integrityReport.duplicatePeriods + 
                         integrityReport.orphanedPayrolls + 
                         integrityReport.missingPeriodIds + 
                         integrityReport.stateConsistencyIssues;
      
      onIssuesDetected?.(totalIssues);
      
      if (totalIssues > 0) {
        console.log(`⚠️ Se detectaron ${totalIssues} problemas de integridad`);
      } else {
        console.log('✅ Integridad de datos verificada - Sin problemas');
      }
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte de integridad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAutomaticCleanup = async () => {
    if (!companyId) return;
    
    try {
      setIsRunningCleanup(true);
      console.log('🧹 Ejecutando limpieza automática...');
      
      const result = await PayrollDataIntegrityService.runAutomaticCleanup(companyId);
      
      if (result.success) {
        toast({
          title: "✅ Limpieza Completada",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
        
        // Regenerar reporte después de la limpieza
        await generateReport();
      } else {
        toast({
          title: "Error en Limpieza",
          description: result.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ Error en limpieza automática:', error);
      toast({
        title: "Error",
        description: "Error ejecutando limpieza automática",
        variant: "destructive"
      });
    } finally {
      setIsRunningCleanup(false);
    }
  };

  // Generar reporte al montar el componente
  useEffect(() => {
    generateReport();
  }, [companyId]);

  if (!report) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-gray-500">
            <Shield className="h-5 w-5" />
            <span>Cargando monitor de integridad...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalIssues = report.duplicatePeriods + 
                     report.orphanedPayrolls + 
                     report.missingPeriodIds + 
                     report.stateConsistencyIssues;

  const getStatusIcon = () => {
    if (totalIssues === 0) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (totalIssues < 3) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getStatusColor = () => {
    if (totalIssues === 0) return "border-green-200 bg-green-50";
    if (totalIssues < 3) return "border-yellow-200 bg-yellow-50";
    return "border-red-200 bg-red-50";
  };

  if (compact) {
    return (
      <Card className={`${getStatusColor()} transition-colors`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="font-medium">
                {totalIssues === 0 ? 'Datos Íntegros' : `${totalIssues} Problemas`}
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={generateReport}
                disabled={isLoading}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {totalIssues > 0 && (
                <Button
                  onClick={runAutomaticCleanup}
                  disabled={isRunningCleanup}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className={`h-4 w-4 ${isRunningCleanup ? 'animate-pulse' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Monitor de Integridad</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge variant={totalIssues === 0 ? "default" : "destructive"}>
              {totalIssues === 0 ? 'Saludable' : `${totalIssues} Problemas`}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas de integridad */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{report.totalPeriods}</div>
            <div className="text-sm text-gray-600">Total Períodos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{report.duplicatePeriods}</div>
            <div className="text-sm text-gray-600">Duplicados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{report.orphanedPayrolls}</div>
            <div className="text-sm text-gray-600">Huérfanos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{report.missingPeriodIds}</div>
            <div className="text-sm text-gray-600">Sin Vínculo</div>
          </div>
        </div>

        {/* Recomendaciones */}
        {report.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Recomendaciones:</h4>
            <ul className="space-y-1">
              {report.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Acciones */}
        <div className="flex space-x-2 pt-4 border-t">
          <Button
            onClick={generateReport}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          {totalIssues > 0 && (
            <Button
              onClick={runAutomaticCleanup}
              disabled={isRunningCleanup}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className={`h-4 w-4 mr-2 ${isRunningCleanup ? 'animate-pulse' : ''}`} />
              {isRunningCleanup ? 'Limpiando...' : 'Limpieza Automática'}
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
