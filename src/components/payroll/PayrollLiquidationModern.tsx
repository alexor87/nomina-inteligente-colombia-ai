import { PayrollModernHeader } from './modern/PayrollModernHeader';
import { PayrollInlineFilters } from './modern/PayrollInlineFilters';
import { PayrollModernTable } from './modern/PayrollModernTable';
import { usePayrollLiquidationIntelligentEnhanced } from '@/hooks/usePayrollLiquidationIntelligentEnhanced';
import { EmployeeCRUDService } from '@/services/EmployeeCRUDService';
import { useToast } from '@/hooks/use-toast';

export const PayrollLiquidationModern = () => {
  const { toast } = useToast();
  const {
    currentPeriod,
    employees,
    summary,
    isValid,
    canEdit,
    updateEmployee,
    recalculateAll,
    approvePeriod,
    refreshEmployees,
    isLoading,
    deleteEmployee: deleteEmployeeFromState
  } = usePayrollLiquidationIntelligentEnhanced();

  const handleUpdateEmployee = (id: string, updates: Partial<any>) => {
    const field = Object.keys(updates)[0];
    const value = updates[field];
    if (field && typeof value === 'number') {
      updateEmployee(id, field, value);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      // Eliminar de la base de datos
      await EmployeeCRUDService.delete(employeeId);
      
      // Eliminar del estado local
      deleteEmployeeFromState(employeeId);
      
      toast({
        title: "🗑️ Empleado eliminado",
        description: "El empleado ha sido eliminado exitosamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error al eliminar empleado",
        description: error instanceof Error ? error.message : "No se pudo eliminar el empleado",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMultipleEmployees = async (employeeIds: string[]) => {
    try {
      // Eliminar cada empleado de la base de datos
      for (const employeeId of employeeIds) {
        await EmployeeCRUDService.delete(employeeId);
      }
      
      // Refrescar la lista de empleados para obtener los datos actualizados
      refreshEmployees();
      
      toast({
        title: "🗑️ Empleados eliminados",
        description: `Se eliminaron ${employeeIds.length} empleados exitosamente`,
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error deleting multiple employees:', error);
      toast({
        title: "Error al eliminar empleados",
        description: error instanceof Error ? error.message : "No se pudieron eliminar algunos empleados",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (!currentPeriod) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando liquidación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PayrollModernHeader
        period={currentPeriod}
        summary={summary}
      />

      <PayrollInlineFilters
        onLiquidate={recalculateAll}
        isLoading={isLoading}
      />

      <PayrollModernTable
        employees={employees}
        onUpdateEmployee={handleUpdateEmployee}
        onRecalculate={recalculateAll}
        isLoading={isLoading}
        canEdit={canEdit}
        periodoId={currentPeriod?.id || ''}
        onRefreshEmployees={refreshEmployees}
        onDeleteEmployee={handleDeleteEmployee}
        onDeleteMultipleEmployees={handleDeleteMultipleEmployees}
      />
    </div>
  );
};
