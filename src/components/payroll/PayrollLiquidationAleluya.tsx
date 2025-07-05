
/**
 * 🎯 COMPONENTE ALELUYA - LIQUIDACIÓN DE NÓMINA UNIFICADA
 * Reemplaza la arquitectura fragmentada con UX profesional
 * Para contadores colombianos - Sin complejidad técnica expuesta
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Calculator,
  CheckCircle,
  Clock,
  Plus,
  Loader2
} from 'lucide-react';
import { PayrollTableNew } from './PayrollTableNew';
import { usePayrollAleluya } from '@/hooks/usePayrollAleluya';
import { formatCurrency } from '@/lib/utils';

/**
 * ✨ COMPONENTE PRINCIPAL - LIQUIDACIÓN ESTILO ALELUYA
 * Flujo simple: Crear → Liquidar → Cerrar (3 pasos claros)
 * Sin mensajes técnicos ni paneles de diagnóstico
 */
export const PayrollLiquidationAleluya = () => {
  const {
    // Estados principales
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    needsCreation,
    canLiquidate,
    canClosePeriod,
    message,
    
    // Acciones principales
    createPeriod,
    liquidatePayroll,
    closePeriod,
    toggleEmployeeSelection,
    toggleAllEmployees,
    
    // Estados calculados
    selectedCount,
    totalEmployees
  } = usePayrollAleluya();

  // Estado de carga inicial
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900">Cargando nómina...</h3>
          <p className="text-gray-600">Conectando con sistema de nómina</p>
        </div>
      </div>
    );
  }

  // Estado: Necesita crear período
  if (needsCreation) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <span>Nuevo Período de Nómina</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="bg-white rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Listo para crear período
                </h3>
                <p className="text-gray-600 mb-4">{message}</p>
                
                <Button
                  onClick={createPeriod}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creando período...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Crear Período de Nómina
                    </>
                  )}
                </Button>
              </div>
              
              <div className="text-sm text-gray-500">
                💡 Se cargarán automáticamente todos los empleados activos
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado principal: Período activo
  return (
    <div className="space-y-6">
      {/* Header del período */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-xl text-gray-900">
                  {currentPeriod?.periodo || 'Período Activo'}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {currentPeriod?.fecha_inicio} - {currentPeriod?.fecha_fin}
                </p>
              </div>
            </div>
            
            <Badge 
              variant={currentPeriod?.estado === 'cerrado' ? 'default' : 'secondary'}
              className={
                currentPeriod?.estado === 'cerrado' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }
            >
              {currentPeriod?.estado === 'cerrado' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Cerrado
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Borrador
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Empleados */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Empleados</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCount} / {totalEmployees}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Bruto */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bruto</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalGrossPay)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Neto */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Neto</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalNetPay)}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => liquidatePayroll()} // FIXED: Removed async/await syntax
                disabled={!canLiquidate || isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Liquidar Nómina
                  </>
                )}
              </Button>

              {canClosePeriod && (
                <Button
                  onClick={() => closePeriod()} // FIXED: Removed async/await syntax
                  disabled={isProcessing}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cerrar Período
                </Button>
              )}
            </div>
          </div>

          {/* Barra de progreso visual */}
          {selectedCount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Empleados seleccionados</span>
                <span>{selectedCount} de {totalEmployees}</span>
              </div>
              <Progress 
                value={(selectedCount / totalEmployees) * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensaje de estado */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">{message}</p>
        </div>
      )}

      {/* Tabla de empleados */}
      {employees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Empleados del Período</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PayrollTableNew
              employees={employees}
              onRemoveEmployee={() => {}} // Función simplificada
              onCreateNovedad={() => {}} // Función simplificada
              onRecalculate={() => {}} // Función simplificada
              periodId={currentPeriod?.id || ''}
              canEdit={currentPeriod?.estado === 'borrador'}
              selectedEmployees={selectedEmployees}
              onToggleEmployee={toggleEmployeeSelection}
              onToggleAll={toggleAllEmployees}
            />
          </CardContent>
        </Card>
      )}

      {/* Estado sin empleados */}
      {employees.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Users className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">
                No hay empleados en este período
              </h3>
              <p className="text-gray-600">
                Verifica que tengas empleados activos en tu empresa
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
