
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollActions } from './liquidation/PayrollActions';
import { usePayrollLiquidationBackend } from '@/hooks/usePayrollLiquidationBackend';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Users, FileText, Settings, Server } from 'lucide-react';

export const PayrollLiquidationBackend = () => {
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
  } = usePayrollLiquidationBackend();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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

      <Card className="mx-6 mb-4 p-4 bg-green-50 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Server className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-900">Cálculos en el Servidor (Backend)</h3>
              <p className="text-sm text-green-700">
                {currentPeriod ? (
                  <>Período {currentPeriod.tipo_periodo} • Todos los cálculos procesados en Supabase Edge Functions</>
                ) : (
                  'Configurando período de nómina...'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Server className="h-3 w-3 mr-1" />
              Backend
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Users className="h-3 w-3 mr-1" />
              {employees.length} empleados
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
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

      <PayrollSummaryCards summary={summary} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <PayrollTable
            employees={employees}
            onUpdateEmployee={updateEmployee}
            isLoading={isLoading}
            canEdit={canEdit}
          />
        </div>
      </div>

      <PayrollActions
        onRecalculate={recalculateAll}
        onToggleSummary={() => {}}
        showSummary={true}
        canEdit={canEdit}
      />
    </div>
  );
};
