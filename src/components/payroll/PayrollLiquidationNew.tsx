
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Calculator, 
  CheckCircle, 
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Wrench
} from 'lucide-react';
import { usePayrollLiquidationNew } from '@/hooks/usePayrollLiquidationNew';
import { usePeriodValidation } from '@/hooks/usePeriodValidation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PayrollTableNew } from './PayrollTableNew';
import { PayrollSummaryStats } from './PayrollSummaryStats';

export const PayrollLiquidationNew = () => {
  const {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod,
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  } = usePayrollLiquidationNew();

  // Hook para corrección de períodos
  const { executeIntegralCorrection, isValidating } = usePeriodValidation();

  // Wrapper functions for button handlers
  const handleRefreshPeriod = () => refreshPeriod(0);
  const handleRetryInitialization = () => refreshPeriod(0);
  const handleForceRefresh = () => refreshPeriod(0);

  // Nueva función para ejecutar corrección integral CON REFRESH AUTOMÁTICO
  const handlePeriodCorrection = async () => {
    if (!currentPeriod?.company_id) return;
    
    await executeIntegralCorrection(currentPeriod.company_id);
    
    // Refrescar automáticamente los datos después de la corrección
    setTimeout(() => {
      refreshPeriod(0);
    }, 1000);
  };

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              🎯 Detectando período automáticamente
            </h3>
            <p className="text-gray-600">
              Analizando configuración y períodos existentes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado cuando se sugiere crear nuevo período
  if (periodStatus?.action === 'suggest_next' && !currentPeriod) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {periodStatus.nextPeriod ? 'Crear Siguiente Período' : 'Configuración Requerida'}
                </h2>
                <p className="text-gray-600">
                  {periodStatus.message}
                </p>
              </div>

              {periodStatus.nextPeriod && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Siguiente Período</h3>
                  <p className="text-blue-700">
                    {periodStatus.nextPeriod.startDate} - {periodStatus.nextPeriod.endDate}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Periodicidad: {periodStatus.nextPeriod.type}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                {periodStatus.nextPeriod ? (
                  <Button 
                    onClick={createNewPeriod}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Crear Nuevo Período
                  </Button>
                ) : (
                  <Button 
                    onClick={() => window.location.href = '/app/settings'}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ir a Configuración
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleRefreshPeriod}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>

              {/* Opciones de emergencia si hay error de detección */}
              {periodStatus.message.includes('Error') && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2">Opciones de Emergencia</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/app/payroll-history'}
                      className="mr-2"
                    >
                      Ver Historial de Nómina
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleForceRefresh}
                    >
                      Forzar Actualización
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!isValidPeriod) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error de Configuración
          </h3>
          <p className="text-gray-600 mb-4">
            No se pudo detectar o crear un período válido para la liquidación.
          </p>
          <div className="space-y-2">
            <Button onClick={handleRetryInitialization} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar Nuevamente
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/app/settings'}
            >
              Verificar Configuración
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header con botón Liquidar Nómina */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Liquidación de Nómina</h1>
            <p className="text-gray-600 mt-1">
              Sistema inteligente de liquidación con detección automática de períodos
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleRefreshPeriod}
              disabled={isProcessing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              variant="outline"
              onClick={recalculateAll}
              disabled={isProcessing || !hasEmployees}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Recalcular Todo
            </Button>

            {/* NUEVO: Botón de Corrección de Períodos */}
            <Button
              variant="outline"
              onClick={handlePeriodCorrection}
              disabled={isValidating || !currentPeriod}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Wrench className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              {isValidating ? 'Corrigiendo...' : 'Corregir Períodos'}
            </Button>

            {canClosePeriod && (
              <Button
                onClick={closePeriod}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Liquidar Nómina
              </Button>
            )}
          </div>
        </div>

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
                <Badge 
                  className={
                    currentPeriod.estado === 'borrador' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-green-100 text-green-800'
                  }
                >
                  {currentPeriod.estado === 'borrador' ? 'Borrador' : 'Cerrado'}
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

        {/* Nueva Tabla de Empleados con diseño mejorado */}
        {hasEmployees ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Empleados ({employees.length})
              </h3>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>{summary.validEmployees} empleados válidos</span>
              </div>
            </div>
            
            <PayrollTableNew
              employees={employees}
              onRemoveEmployee={removeEmployeeFromPeriod}
              onCreateNovedad={createNovedadForEmployee}
              periodId={currentPeriod?.id || ''}
              canEdit={currentPeriod?.estado === 'borrador'}
              selectedEmployees={selectedEmployees}
              onToggleEmployee={toggleEmployeeSelection}
              onToggleAll={toggleAllEmployees}
            />
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

        {/* Status Footer */}
        {periodStatus && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-blue-800 font-medium">Sistema Inteligente Activo</p>
                <p className="text-blue-600 text-sm">{periodStatus.message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* NUEVO: Card informativo sobre la corrección */}
        {isValidating && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <Wrench className="h-4 w-4 text-orange-600 animate-spin" />
              </div>
              <div>
                <p className="text-orange-800 font-medium">Corrección de Períodos en Proceso</p>
                <p className="text-orange-600 text-sm">
                  Ejecutando validación y corrección automática de fechas y nombres de períodos...
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
