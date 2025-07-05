
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Search,
  FileText,
  Shield
} from 'lucide-react';
import { usePayrollLiquidationRobust } from '@/hooks/usePayrollLiquidationRobust';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PayrollSummaryStats } from './PayrollSummaryStats';
import { DataIntegrityMonitor } from './DataIntegrityMonitor';

export const PayrollLiquidationRobust = () => {
  const {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    summary,
    periodStatus,
    diagnostic,
    createSuggestedPeriod,
    runManualDiagnosis,
    refreshDiagnosis,
    canCreatePeriod,
    needsDiagnosis,
    isEmergency,
    hasActivePeriod,
    hasEmployees
  } = usePayrollLiquidationRobust();

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 PayrollLiquidationRobust - Estado actual:', {
      isLoading,
      hasActivePeriod,
      hasEmployees,
      employeesCount: employees.length,
      currentPeriod: currentPeriod?.periodo,
      periodStatus: periodStatus?.action
    });
  }, [isLoading, hasActivePeriod, hasEmployees, employees.length, currentPeriod, periodStatus]);

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              🔍 Diagnóstico Inteligente
            </h3>
            <p className="text-gray-600">
              Analizando períodos existentes y detectando configuración...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado de emergencia
  if (isEmergency) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center border-red-200">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Error Crítico Detectado
                </h2>
                <p className="text-gray-600">
                  {periodStatus?.message}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={runManualDiagnosis}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Ejecutar Diagnóstico
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={refreshDiagnosis}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Estado que requiere diagnóstico
  if (needsDiagnosis) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center border-yellow-200 bg-yellow-50">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-yellow-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Situación Compleja Detectada
                </h2>
                <p className="text-gray-600">
                  {periodStatus?.message}
                </p>
              </div>

              {diagnostic && (
                <div className="bg-white p-4 rounded-lg text-left">
                  <h3 className="font-medium text-gray-900 mb-2">Resumen del Diagnóstico:</h3>
                  <div className="space-y-2 text-sm">
                    <p>📊 Total períodos: {diagnostic.totalPeriods}</p>
                    <p>⚠️ Problemas: {diagnostic.issues.length}</p>
                    <p>💡 Recomendaciones: {diagnostic.recommendations.length}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={runManualDiagnosis}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Diagnóstico Completo
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={refreshDiagnosis}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Estado para crear período sugerido
  if (canCreatePeriod) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Crear Nuevo Período
                </h2>
                <p className="text-gray-600">
                  {periodStatus?.message}
                </p>
              </div>

              {periodStatus?.nextPeriod && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Período Sugerido:</h3>
                  <p className="text-green-700">
                    {periodStatus.nextPeriod.startDate} - {periodStatus.nextPeriod.endDate}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Tipo: {periodStatus.nextPeriod.type}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={createSuggestedPeriod}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Crear Período
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={runManualDiagnosis}
                  disabled={isProcessing}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Ver Diagnóstico
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Estado normal con período activo
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Liquidación de Nómina Robusta
            </h1>
            <p className="text-gray-600 mt-1">
              Sistema con diagnóstico inteligente y detección automática
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={refreshDiagnosis}
              disabled={isProcessing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              variant="outline"
              onClick={runManualDiagnosis}
              disabled={isProcessing}
            >
              <Search className="h-4 w-4 mr-2" />
              Diagnóstico
            </Button>
          </div>
        </div>

        {/* Data Integrity Monitor */}
        {currentPeriod && (
          <DataIntegrityMonitor 
            companyId={currentPeriod.company_id}
            onCleanupComplete={refreshDiagnosis}
          />
        )}

        {/* Información del Período */}
        {currentPeriod && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {currentPeriod.periodo}
                  </h3>
                  <p className="text-gray-600">
                    {currentPeriod.fecha_inicio} - {currentPeriod.fecha_fin}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge className="bg-green-100 text-green-800">
                  Período Activo
                </Badge>
                
                <Badge variant="secondary">
                  {currentPeriod.tipo_periodo}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Resumen Estadístico */}
        <PayrollSummaryStats summary={summary} isLoading={isProcessing} />

        {/* Lista de Empleados o mensaje */}
        {hasEmployees ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Empleados Cargados ({employees.length})
              </h3>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Sistema Robusto ✓
              </Badge>
            </div>
            
            {/* Debug information */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Estado del Sistema:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Total Empleados:</span>
                  <span className="font-medium ml-2">{employees.length}</span>
                </div>
                <div>
                  <span className="text-blue-600">Válidos:</span>
                  <span className="font-medium ml-2">{summary.validEmployees}</span>
                </div>
                <div>
                  <span className="text-blue-600">Total Bruto:</span>
                  <span className="font-medium ml-2">${summary.totalGrossPay.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-blue-600">Total Neto:</span>
                  <span className="font-medium ml-2">${summary.totalNetPay.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ✅ Empleados Procesados Exitosamente
              </h3>
              <p className="text-gray-600 mb-4">
                Se han cargado y procesado {employees.length} empleados para el período {currentPeriod?.periodo}
              </p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span>• Cálculos automáticos</span>
                <span>• Novedades aplicadas</span>
                <span>• Deducciones calculadas</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay empleados activos
            </h3>
            <p className="text-gray-600">
              Agrega empleados activos para poder generar la liquidación de nómina.
            </p>
          </Card>
        )}

        {/* Status del Sistema */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-blue-800 font-medium">Sistema Robusto Activo</p>
              <p className="text-blue-600 text-sm">
                Diagnóstico automático completado ✓ | Empleados: {employees.length} | Estado: {currentPeriod?.estado} | Integridad de datos monitoreada
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
