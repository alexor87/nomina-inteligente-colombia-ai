
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollActions } from './liquidation/PayrollActions';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Users, FileText, Settings } from 'lucide-react';

export const PayrollLiquidation = () => {
  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    canEdit,
    isEditingPeriod,
    setIsEditingPeriod,
    updateEmployee,
    updatePeriod,
    recalculateAll,
    approvePeriod,
    refreshEmployees,
    isLoading
  } = usePayrollLiquidation();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fijo con período editable */}
      <PayrollPeriodHeader 
        period={currentPeriod}
        isLoading={isLoading}
        isValid={isValid}
        canEdit={canEdit}
        isEditingPeriod={isEditingPeriod}
        setIsEditingPeriod={setIsEditingPeriod}
        onApprove={approvePeriod}
        onUpdatePeriod={updatePeriod}
      />

      {/* Estado de conexión y configuración */}
      <Card className="mx-6 mb-4 p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Módulo Conectado</h3>
              <p className="text-sm text-blue-700">
                {currentPeriod ? (
                  <>Período {currentPeriod.tipo_periodo} • Datos cargados desde Supabase • Genera comprobantes automáticamente</>
                ) : (
                  'Configurando período de nómina...'
                )}
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
            {currentPeriod && (
              <Badge 
                variant="secondary" 
                className={
                  currentPeriod.estado === 'borrador' 
                    ? "bg-yellow-100 text-yellow-800"
                    : currentPeriod.estado === 'aprobado'
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                <Settings className="h-3 w-3 mr-1" />
                {currentPeriod.estado}
              </Badge>
            )}
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
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* Acciones flotantes */}
      <PayrollActions
        onRecalculate={recalculateAll}
        onToggleSummary={() => {}}
        showSummary={true}
        canEdit={canEdit}
      />
    </div>
  );
};
