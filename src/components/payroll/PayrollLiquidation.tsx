
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollActions } from './liquidation/PayrollActions';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Users, FileText } from 'lucide-react';

export const PayrollLiquidation = () => {
  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    updateEmployee,
    recalculateAll,
    approvePeriod,
    refreshEmployees,
    isLoading
  } = usePayrollLiquidation();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fijo */}
      <PayrollPeriodHeader 
        period={currentPeriod}
        isLoading={isLoading}
        isValid={isValid}
        onApprove={approvePeriod}
      />

      {/* Estado de conexión */}
      <Card className="mx-6 mb-4 p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Módulo Conectado</h3>
              <p className="text-sm text-blue-700">
                Datos cargados desde la base de datos • Genera comprobantes automáticamente
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Users className="h-3 w-3 mr-1" />
              {employees.length} empleados
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <FileText className="h-3 w-3 mr-1" />
              Auto-comprobantes
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshEmployees}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumen en tarjetas */}
      <PayrollSummaryCards summary={summary} />

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tabla principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <PayrollTable
            employees={employees}
            onUpdateEmployee={updateEmployee}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Acciones flotantes */}
      <PayrollActions
        onRecalculate={recalculateAll}
        onToggleSummary={() => {}}
        showSummary={true}
      />
    </div>
  );
};
