
import { useState } from 'react';
import { PayrollPeriodHeader } from './liquidation/PayrollPeriodHeader';
import { PayrollTable } from './liquidation/PayrollTable';
import { PayrollSummaryCards } from './liquidation/PayrollSummaryCards';
import { PayrollActions } from './liquidation/PayrollActions';
import { usePayrollLiquidation } from '@/hooks/usePayrollLiquidation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Users, FileText, Settings, CheckCircle2 } from 'lucide-react';

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

  // Wrapper function to match PayrollTable's expected signature
  const handleUpdateEmployee = (id: string, updates: Partial<any>) => {
    const field = Object.keys(updates)[0];
    const value = updates[field];
    if (field && typeof value === 'number') {
      updateEmployee(id, field, value);
    }
  };

  // Si no hay periodo, mostrar estado de carga
  if (!currentPeriod) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                Configurando período de nómina
              </h3>
              <p className="text-gray-600">
                El sistema está detectando el mejor período para ti...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Estado de conexión mejorado con información inteligente */}
      <Card className="mx-6 mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                Sistema Inteligente Activo
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </h3>
              <p className="text-sm text-blue-700">
                {currentPeriod ? (
                  <>
                    Período {currentPeriod.tipo_periodo} detectado automáticamente • 
                    {employees.length} empleados cargados • 
                    Comprobantes automáticos habilitados
                  </>
                ) : (
                  'Configurando período de nómina inteligente...'
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
              className="border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
            onUpdateEmployee={handleUpdateEmployee}
            onRecalculate={recalculateAll}
            isLoading={isLoading}
            canEdit={canEdit}
            periodoId={currentPeriod?.id || ''}
          />
        </div>
      </div>

      {/* Acciones flotantes mejoradas */}
      <PayrollActions
        onRecalculate={recalculateAll}
        onToggleSummary={() => {}}
        showSummary={true}
        canEdit={canEdit}
      />
    </div>
  );
};
