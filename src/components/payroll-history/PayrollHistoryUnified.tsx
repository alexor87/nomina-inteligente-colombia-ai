
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  AlertTriangle,
  CheckCircle,
  Wrench,
  Play
} from 'lucide-react';
import { CriticalRepairPanel } from '@/components/system/CriticalRepairPanel';
import { PayrollHistoryPageSimple } from './PayrollHistoryPageSimple';
import { usePayrollHistorySimple } from '@/hooks/usePayrollHistorySimple';
import { useCriticalRepair } from '@/hooks/useCriticalRepair';

/**
 * ✅ COMPONENTE UNIFICADO DE HISTORIAL - REPARACIÓN CRÍTICA INTEGRADA
 * Incluye diagnóstico automático y panel de reparación
 */
export const PayrollHistoryUnified = () => {
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [systemReady, setSystemReady] = useState(false);
  
  const {
    periods,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refreshHistory
  } = usePayrollHistorySimple();

  const {
    diagnosis,
    runDiagnosis,
    runCriticalRepair,
    isRepairing,
    isDiagnosing
  } = useCriticalRepair();

  // Ejecutar diagnóstico automático al cargar
  useEffect(() => {
    console.log('🚀 PayrollHistoryUnified - Ejecutando diagnóstico automático...');
    runDiagnosis();
  }, [runDiagnosis]);

  // Evaluar si el sistema está listo
  useEffect(() => {
    if (diagnosis) {
      const hasPeriods = diagnosis.periodCount > 0;
      const hasAuth = diagnosis.authentication;
      const hasCompany = !!diagnosis.companyId;
      
      const ready = hasAuth && hasCompany && hasPeriods;
      setSystemReady(ready);
      
      console.log('📊 Estado del historial:', {
        hasAuth,
        hasCompany,
        hasPeriods,
        ready,
        periodsFromHook: periods.length
      });
    }
  }, [diagnosis, periods]);

  const handleAutoRepair = async () => {
    console.log('🔧 Iniciando reparación automática del historial...');
    const result = await runCriticalRepair();
    
    if (result?.success) {
      // Recargar datos después de la reparación
      setTimeout(() => {
        refreshHistory();
        runDiagnosis();
      }, 1000);
    }
  };

  const getSystemStatus = () => {
    if (!diagnosis) return { color: 'yellow', label: 'Diagnosticando...', icon: AlertTriangle };
    if (diagnosis.issues.length === 0 && periods.length > 0) return { color: 'green', label: 'Historial OK', icon: CheckCircle };
    return { color: 'red', label: 'Sin historial', icon: AlertTriangle };
  };

  const status = getSystemStatus();

  return (
    <div className="space-y-6">
      {/* Header de diagnóstico crítico */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <History className="h-5 w-5 text-purple-600" />
            <span>Estado del Historial de Nómina</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Estado general */}
            <div className="flex items-center space-x-2">
              <status.icon className={`h-4 w-4 ${
                status.color === 'green' ? 'text-green-600' : 
                status.color === 'red' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <Badge variant={status.color === 'green' ? 'default' : 'destructive'}>
                {status.label}
              </Badge>
            </div>

            {/* Períodos */}
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {periods.length} períodos en historial
              </span>
            </div>

            {/* Base de datos */}
            {diagnosis && (
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  {diagnosis.periodCount} períodos en BD
                </span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex space-x-2">
              {!systemReady && (
                <Button
                  onClick={handleAutoRepair}
                  disabled={isRepairing}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isRepairing ? (
                    <>
                      <Wrench className="h-3 w-3 mr-1 animate-spin" />
                      Reparando...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-3 w-3 mr-1" />
                      Reparar Auto
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={() => setShowRepairPanel(!showRepairPanel)}
                variant="outline"
                size="sm"
              >
                {showRepairPanel ? 'Ocultar Panel' : 'Panel Avanzado'}
              </Button>
            </div>
          </div>

          {/* Problemas encontrados */}
          {diagnosis && diagnosis.issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Problemas detectados:</strong>
                <ul className="list-disc list-inside mt-1">
                  {diagnosis.issues.slice(0, 3).map((issue, index) => (
                    <li key={index} className="text-sm">{issue}</li>
                  ))}
                  {diagnosis.issues.length > 3 && (
                    <li className="text-sm">... y {diagnosis.issues.length - 3} más</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Sistema OK */}
          {systemReady && periods.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Historial funcionando correctamente con {periods.length} períodos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Panel de reparación avanzado */}
      {showRepairPanel && (
        <CriticalRepairPanel />
      )}

      {/* Componente de historial principal */}
      {systemReady && periods.length > 0 ? (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Play className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Historial de Nómina</h2>
          </div>
          <PayrollHistoryPageSimple />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <h3 className="text-lg font-semibold">Sin historial disponible</h3>
              <p className="text-gray-600">
                No hay períodos de nómina en el historial. 
                Usa el botón "Reparar Auto" para crear datos de prueba y períodos iniciales.
              </p>
              {isDiagnosing && (
                <p className="text-sm text-purple-600">Diagnosticando historial...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
