
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bug, 
  RefreshCw, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Settings
} from 'lucide-react';
import { BiWeeklyDiagnosticService } from '@/services/payroll-intelligent/BiWeeklyDiagnosticService';
import { PeriodSimpleFixService } from '@/services/payroll-intelligent/PeriodSimpleFixService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { useToast } from '@/hooks/use-toast';

export const PayrollDiagnosticPanel = () => {
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [lastDiagnosticTime, setLastDiagnosticTime] = useState<Date | null>(null);
  
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();

  const runDiagnostic = async () => {
    if (!companyId) return;
    
    setIsRunningDiagnostic(true);
    try {
      console.log('🔍 Ejecutando diagnóstico...');
      const result = await BiWeeklyDiagnosticService.runCompleteDiagnostic(companyId);
      
      setDiagnosticResult(result);
      setLastDiagnosticTime(new Date());
      
      toast({
        title: "Diagnóstico completado",
        description: result.message,
        className: result.success ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
      });
      
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      toast({
        title: "Error en diagnóstico",
        description: "No se pudo completar el diagnóstico",
        variant: "destructive"
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const fixAllIssues = async () => {
    if (!companyId) return;
    
    setIsFixing(true);
    try {
      console.log('🔧 Arreglando períodos automáticamente...');
      const result = await PeriodSimpleFixService.fixAllIssues(companyId);
      
      toast({
        title: result.success ? "✅ Períodos arreglados" : "⚠️ Corrección parcial",
        description: result.message,
        className: result.success ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
      });
      
      // Ejecutar diagnóstico nuevamente para ver los resultados
      await runDiagnostic();
      
    } catch (error) {
      console.error('Error arreglando períodos:', error);
      toast({
        title: "Error en corrección",
        description: "No se pudieron arreglar los períodos",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  // Ejecutar diagnóstico inicial
  useEffect(() => {
    if (companyId) {
      runDiagnostic();
    }
  }, [companyId]);

  const totalIssues = diagnosticResult?.data?.existingPeriods?.filter((p: any) => !p.is_correct)?.length || 0;
  const duplicates = diagnosticResult?.data?.duplicateCheck?.duplicates?.length || 0;
  const conflicts = diagnosticResult?.data?.duplicateCheck?.conflicts?.length || 0;
  const hasIssues = totalIssues > 0 || duplicates > 0 || conflicts > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-blue-600" />
              Diagnóstico de Períodos Quincenales
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastDiagnosticTime && (
                <span className="text-xs text-gray-500">
                  Actualizado: {lastDiagnosticTime.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostic}
                disabled={isRunningDiagnostic || isFixing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
                Diagnóstico
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Resumen del estado */}
          {diagnosticResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${
                totalIssues === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {totalIssues === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className="font-semibold">Numeración</h3>
                </div>
                <p className="text-2xl font-bold mb-1">
                  {totalIssues}
                </p>
                <p className="text-sm text-gray-600">
                  {totalIssues === 0 ? 'Todos correctos' : 'Períodos incorrectos'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                duplicates === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">Duplicados</h3>
                </div>
                <p className="text-2xl font-bold mb-1">
                  {duplicates}
                </p>
                <p className="text-sm text-gray-600">
                  {duplicates === 0 ? 'Sin duplicados' : 'Períodos duplicados'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                conflicts === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold">Conflictos</h3>
                </div>
                <p className="text-2xl font-bold mb-1">
                  {conflicts}
                </p>
                <p className="text-sm text-gray-600">
                  {conflicts === 0 ? 'Sin conflictos' : 'Conflictos de numeración'}
                </p>
              </div>
            </div>
          )}

          {/* Alerta y botón de corrección simple */}
          {hasIssues && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Se encontraron problemas en el sistema de períodos quincenales.</strong>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button
                  onClick={fixAllIssues}
                  disabled={isFixing || isRunningDiagnostic}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  {isFixing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Arreglando períodos...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-5 w-5 mr-2" />
                      🔧 Arreglar Períodos
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {!hasIssues && diagnosticResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>✅ Sistema funcionando correctamente</strong> - Todos los períodos quincenales están en orden.
              </AlertDescription>
            </Alert>
          )}

          {/* Resultados detallados */}
          {diagnosticResult?.data && (
            <Tabs defaultValue="periods" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="periods">
                  Períodos ({diagnosticResult.data.existingPeriods?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="tests">
                  Pruebas de Cálculo
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  Recomendaciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="periods" className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {diagnosticResult.data.existingPeriods?.map((period: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        period.is_correct 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{period.periodo}</h4>
                          <p className="text-xs text-gray-600">
                            {period.fecha_inicio} - {period.fecha_fin}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant={period.is_correct ? "secondary" : "destructive"}>
                              {period.is_correct ? "✓" : "✗"}
                            </Badge>
                            <span className="text-sm">
                              {period.numero_periodo_anual || 'null'} → {period.calculated_number}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {period.recommended_action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tests" className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {diagnosticResult.data.calculationTest?.results?.map((test: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        test.isCorrect 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{test.description}</h4>
                          <p className="text-xs text-gray-600">{test.startDate}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant={test.isCorrect ? "secondary" : "destructive"}>
                              {test.isCorrect ? "✓" : "✗"}
                            </Badge>
                            <span className="text-sm">
                              Esperado: {test.expected} | Calculado: {test.calculated}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-3">
                <div className="space-y-2">
                  {diagnosticResult.data.recommendations?.map((rec: string, index: number) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
