
/**
 * ✅ COMPONENTE UNIFICADO DE LIQUIDACIÓN - ARQUITECTURA CRÍTICA REPARADA
 * Componente principal que reemplaza PayrollLiquidationNew y otros
 * Usa la nueva arquitectura de servicios unificada
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Users, DollarSign, Calculator } from 'lucide-react';
import { usePayrollDomain } from '@/hooks/usePayrollDomain';
import { formatCurrency } from '@/lib/utils';

export const PayrollLiquidationUnified = () => {
  const {
    isLoading,
    currentPeriod,
    employees,
    periodSituation,
    detectPeriodSituation,
    createPeriod,
    loadEmployees,
    closePeriod
  } = usePayrollDomain();

  // Detectar situación del período al cargar
  useEffect(() => {
    detectPeriodSituation();
  }, [detectPeriodSituation]);

  // Cargar empleados cuando hay período activo
  useEffect(() => {
    if (currentPeriod?.id) {
      loadEmployees(currentPeriod.id);
    }
  }, [currentPeriod?.id, loadEmployees]);

  // Calcular totales
  const totals = {
    employees: employees.length,
    grossPay: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
    deductions: employees.reduce((sum, emp) => sum + emp.deductions, 0),
    netPay: employees.reduce((sum, emp) => sum + emp.netPay, 0)
  };

  if (isLoading && !periodSituation) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Detectando estado del período...</span>
        </div>
      </div>
    );
  }

  // Caso: Necesita crear período
  if (periodSituation?.needsCreation) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Crear Nuevo Período</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              No hay período activo para liquidar nómina.
            </p>
            <Button 
              onClick={createPeriod}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando período...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Período de Nómina
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del período actual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Liquidación de Nómina</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Período: {currentPeriod?.periodo}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={currentPeriod?.estado === 'draft' ? 'secondary' : 'default'}
              >
                {currentPeriod?.estado === 'draft' ? 'Borrador' : 'Activo'}
              </Badge>
              {currentPeriod?.estado !== 'closed' && (
                <Button 
                  onClick={() => currentPeriod?.id && closePeriod(currentPeriod.id)}
                  disabled={isLoading}
                  variant="outline"
                >
                  Cerrar Período
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Empleados</p>
                <p className="text-2xl font-bold">{totals.employees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Devengado</p>
                <p className="text-lg font-bold">{formatCurrency(totals.grossPay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deducciones</p>
                <p className="text-lg font-bold">{formatCurrency(totals.deductions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Neto</p>
                <p className="text-lg font-bold">{formatCurrency(totals.netPay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados en Liquidación</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Cargando empleados...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center p-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay empleados para liquidar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((employee) => (
                <div 
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h4 className="font-medium">{employee.name}</h4>
                    <p className="text-sm text-gray-600">{employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(employee.netPay)}</p>
                    <p className="text-xs text-gray-500">
                      Devengado: {formatCurrency(employee.grossPay)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
