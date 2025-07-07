import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  RefreshCw,
  Bug,
  Calendar
} from 'lucide-react';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { BiWeeklyDiagnosticService, DiagnosticResult, PeriodDiagnostic } from '@/services/payroll-intelligent/BiWeeklyDiagnosticService';
import { PeriodNumberCalculationService } from '@/services/payroll-intelligent/PeriodNumberCalculationService';

export const PayrollDiagnosticPanel: React.FC = () => {
  const { companyId } = useCurrentCompany();
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [isApplyingCorrections, setIsApplyingCorrections] = useState(false);

  const runDiagnostic = async () => {
    if (!companyId) return;
    
    setIsRunningDiagnostic(true);
    try {
      // Ejecutar pruebas de diagnóstico en el servicio
      await PeriodNumberCalculationService.runDiagnosticTest();
      
      // Ejecutar diagnóstico completo
      const result = await BiWeeklyDiagnosticService.runCompleteDiagnostic(companyId);
      setDiagnosticResult(result);
    } catch (error) {
      console.error('Error ejecutando diagnóstico:', error);
      setDiagnosticResult({
        success: false,
        message: 'Error ejecutando diagnóstico',
        errors: [error.message]
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const applyCorrections = async () => {
    if (!companyId) return;
    
    setIsApplyingCorrections(true);
    try {
      const result = await BiWeeklyDiagnosticService.applyAutoCorrections(companyId);
      
      // Actualizar resultado con las correcciones aplicadas
      setDiagnosticResult(prevResult => ({
        ...result,
        data: {
          ...prevResult?.data,
          corrections: result.data
        }
      }));
      
      // Re-ejecutar diagnóstico para verificar correcciones
      setTimeout(() => runDiagnostic(), 1000);
      
    } catch (error) {
      console.error('Error aplicando correcciones:', error);
    } finally {
      setIsApplyingCorrections(false);
    }
  };

  const getStatusBadge = (diagnostic: PeriodDiagnostic) => {
    if (diagnostic.is_correct) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Correcto</Badge>;
    } else {
      return <Badge variant="destructive">Incorrecto</Badge>;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('Ninguna')) return 'text-green-600';
    if (recommendation.includes('Asignar')) return 'text-blue-600';
    if (recommendation.includes('Corregir')) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Diagnóstico del Sistema de Numeración
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Control Panel */}
        <div className="flex gap-3">
          <Button 
            onClick={runDiagnostic}
            disabled={isRunningDiagnostic || !companyId}
            className="flex items-center gap-2"
          >
            {isRunningDiagnostic ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isRunningDiagnostic ? 'Diagnosticando...' : 'Ejecutar Diagnóstico'}
          </Button>
          
          {diagnosticResult?.success && (
            <Button 
              onClick={applyCorrections}
              disabled={isApplyingCorrections}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isApplyingCorrections ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              {isApplyingCorrections ? 'Aplicando...' : 'Aplicar Correcciones'}
            </Button>
          )}
        </div>

        {/* Results */}
        {diagnosticResult && (
          <div className="space-y-4">
            
            {/* Status Alert */}
            <Alert className={diagnosticResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {diagnosticResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="font-medium">
                  {diagnosticResult.message}
                </AlertDescription>
              </div>
            </Alert>

            {/* Recommendations */}
            {diagnosticResult.data?.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {diagnosticResult.data.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className={getRecommendationColor(rec)}>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Calculation Test Results */}
            {diagnosticResult.data?.calculationTest && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Pruebas de Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {diagnosticResult.data.calculationTest.results.map((test: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span className="font-medium">{test.description}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Esperado: {test.expected} | Calculado: {test.calculated}
                          </span>
                          {test.isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 rounded bg-blue-50">
                    <span className="font-medium">
                      Resultado general: {diagnosticResult.data.calculationTest.allCorrect ? '✅ Todas las pruebas correctas' : '❌ Hay errores en el cálculo'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Periods Analysis */}
            {diagnosticResult.data?.existingPeriods && diagnosticResult.data.existingPeriods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Análisis de Períodos Existentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {diagnosticResult.data.existingPeriods.map((period: PeriodDiagnostic, index: number) => (
                      <div key={index} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{period.periodo}</span>
                          {getStatusBadge(period)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Fechas: {period.fecha_inicio} - {period.fecha_fin}</div>
                          <div>Número actual: {period.numero_periodo_anual || 'Sin asignar'}</div>
                          <div>Número calculado: {period.calculated_number}</div>
                          <div className={`font-medium ${getRecommendationColor(period.recommended_action)}`}>
                            Acción: {period.recommended_action}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Duplicates and Conflicts */}
            {diagnosticResult.data?.duplicateCheck && (
              <>
                {diagnosticResult.data.duplicateCheck.duplicates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-orange-600">Períodos Duplicados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        Se encontraron {diagnosticResult.data.duplicateCheck.duplicates.length} grupos de períodos duplicados.
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {diagnosticResult.data.duplicateCheck.conflicts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-red-600">Conflictos de Numeración</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        Se encontraron {diagnosticResult.data.duplicateCheck.conflicts.length} conflictos de numeración.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Errors */}
            {diagnosticResult.errors && diagnosticResult.errors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Errores encontrados:</div>
                    {diagnosticResult.errors.map((error, index) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
