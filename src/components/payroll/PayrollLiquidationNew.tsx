
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
  TrendingUp
} from 'lucide-react';
import { usePayrollLiquidationNew } from '@/hooks/usePayrollLiquidationNew';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PayrollEmployeeTable } from './PayrollEmployeeTable';
import { PayrollSummaryStats } from './PayrollSummaryStats';

export const PayrollLiquidationNew = () => {
  const {
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    summary,
    periodStatus,
    updateEmployee,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod,
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  } = usePayrollLiquidationNew();

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
                  Período Actual Cerrado
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
                
                <Button 
                  variant="outline" 
                  onClick={refreshPeriod}
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
          <Button onClick={refreshPeriod} disabled={isProcessing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Intentar Nuevamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
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
              onClick={refreshPeriod}
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

            {canClosePeriod && (
              <Button
                onClick={closePeriod}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Cerrar Período
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

        {/* Tabla de Empleados */}
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
            
            <PayrollEmployeeTable
              employees={employees}
              onUpdateEmployee={updateEmployee}
              isLoading={isProcessing}
              canEdit={currentPeriod?.estado === 'borrador'}
              currentPeriod={currentPeriod}
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
      </div>
    </div>
  );
};
