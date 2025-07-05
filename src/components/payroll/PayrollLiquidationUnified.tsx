
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Wrench,
  Play
} from 'lucide-react';
import { CriticalRepairPanel } from '@/components/system/CriticalRepairPanel';
import { PayrollLiquidationNew } from './PayrollLiquidationNew';
import { usePayrollDomain } from '@/hooks/usePayrollDomain';
import { useCriticalRepair } from '@/hooks/useCriticalRepair';

/**
 * ✅ COMPONENTE UNIFICADO DE LIQUIDACIÓN - REPARACIÓN CRÍTICA INTEGRADA
 * Incluye diagnóstico automático y panel de reparación
 */
export const PayrollLiquidationUnified = () => {
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [systemReady, setSystemReady] = useState(false);
  
  const {
    periodStatus,
    employees,
    isLoading: isLoadingPayroll,
    error: payrollError,
    refreshPeriod
  } = usePayrollDomain();

  const {
    diagnosis,
    runDiagnosis,
    runCriticalRepair,
    isRepairing,
    isDiagnosing
  } = useCriticalRepair();

  // Ejecutar diagnóstico automático al cargar
  useEffect(() => {
    console.log('🚀 PayrollLiquidationUnified - Ejecutando diagnóstico automático...');
    runDiagnosis();
  }, [runDiagnosis]);

  // Evaluar si el sistema está listo
  useEffect(() => {
    if (diagnosis) {
      const hasEmployees = diagnosis.employeeCount > 0 && diagnosis.activeEmployeeCount > 0;
      const hasPeriods = diagnosis.periodCount > 0;
      const hasAuth = diagnosis.authentication;
      const hasCompany = !!diagnosis.companyId;
      
      const ready = hasAuth && hasCompany && hasEmployees && hasPeriods;
      setSystemReady(ready);
      
      console.log('📊 Estado del sistema:', {
        hasAuth,
        hasCompany,
        hasEmployees,
        hasPeriods,
        ready
      });
    }
  }, [diagnosis]);

  const handleAutoRepair = async () => {
    console.log('🔧 Iniciando reparación automática...');
    const result = await runCriticalRepair();
    
    if (result?.success) {
      // Recargar datos después de la reparación
      setTimeout(() => {
        refreshPeriod();
        runDiagnosis();
      }, 1000);
    }
  };

  const getSystemStatus = () => {
    if (!diagnosis) return { color: 'yellow', label: 'Diagnosticando...', icon: AlertTriangle };
    if (diagnosis.issues.length === 0) return { color: 'green', label: 'Sistema OK', icon: CheckCircle };
    return { color: 'red', label: 'Requiere reparación', icon: AlertTriangle };
  };

  const status = getSystemStatus();

  return (
    <div className="space-y-6">
      {/* Header de diagnóstico crítico */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <span>Estado del Sistema de Nómina</span>
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

            {/* Empleados */}
            {diagnosis && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  {diagnosis.activeEmployeeCount} empleados activos
                </span>
              </div>
            )}

            {/* Períodos */}
            {diagnosis && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {diagnosis.activePeriodCount} períodos activos
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
                  className="bg-blue-600 hover:bg-blue-700"
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
          {systemReady && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Sistema funcionando correctamente. Puedes proceder con la liquidación.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Panel de reparación avanzado */}
      {showRepairPanel && (
        <CriticalRepairPanel />
      )}

      {/* Componente de liquidación principal */}
      {systemReady ? (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Play className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Liquidación de Nómina</h2>
          </div>
          <PayrollLiquidationNew />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <h3 className="text-lg font-semibold">Sistema no está listo</h3>
              <p className="text-gray-600">
                El sistema requiere reparación antes de poder proceder con la liquidación.
                Usa el botón "Reparar Auto" arriba o el panel avanzado para solucionar los problemas.
              </p>
              {isDiagnosing && (
                <p className="text-sm text-blue-600">Diagnosticando sistema...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
