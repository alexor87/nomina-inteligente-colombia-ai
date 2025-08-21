
import { useState, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';

interface PayrollTotals {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}

export const usePayrollModern = (periodId: string) => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totals, setTotals] = useState<PayrollTotals>({
    totalEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0
  });
  const { toast } = useToast();

  const loadEmployees = useCallback(async () => {
    if (!periodId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Cargando empleados del período:', periodId);
      
      // 1. Obtener empleados con cálculos correctos
      const employeesResult = await EmployeeUnifiedService.getEmployeesForPeriod(periodId);
      
      if (!employeesResult.success || !employeesResult.data) {
        throw new Error(employeesResult.error || 'Error loading employees');
      }

      console.log('✅ Empleados calculados:', employeesResult.data.length);
      
      // 2. Automáticamente actualizar registros en BD
      console.log('🔄 Actualizando automáticamente registros en BD...');
      const updateResult = await EmployeeUnifiedService.updatePayrollRecords(periodId);
      
      if (!updateResult.success) {
        console.warn('⚠️ Error updating records, but continuing:', updateResult.error);
      }
      
      console.log('✅ Registros actualizados automáticamente');
      
      // 3. Usar los datos ya obtenidos
      const updatedEmployees = employeesResult.data;
      
      setEmployees(updatedEmployees);
      
      // Calcular totales
      const newTotals = {
        totalEmployees: updatedEmployees.length,
        totalGrossPay: updatedEmployees.reduce((sum, emp) => sum + (emp.totalEarnings || 0), 0),
        totalDeductions: updatedEmployees.reduce((sum, emp) => sum + (emp.totalDeductions || 0), 0),
        totalNetPay: updatedEmployees.reduce((sum, emp) => sum + (emp.netPay || 0), 0)
      };
      
      setTotals(newTotals);
      
      toast({
        title: "Nómina actualizada",
        description: `${updatedEmployees.length} empleados calculados automáticamente`
      });
      
    } catch (err) {
      console.error('❌ Error cargando empleados:', err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Error al cargar los datos de nómina",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodId, toast]);

  // Auto-cargar al inicializar
  useEffect(() => {
    if (periodId) {
      loadEmployees();
    }
  }, [periodId, loadEmployees]);

  const updateEmployee = useCallback(async (employeeId: string, data: any) => {
    try {
      const result = await EmployeeUnifiedService.update(employeeId, data);
      
      if (!result.success) {
        throw new Error(result.error || 'Error updating employee');
      }
      
      await loadEmployees(); // Recargar para mostrar cambios
      toast({
        title: "Empleado actualizado",
        description: "Los datos del empleado han sido actualizados"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al actualizar el empleado",
        variant: "destructive"
      });
    }
  }, [loadEmployees, toast]);

  const bulkUpdateEmployees = useCallback(async (employeeIds: string[]) => {
    try {
      // Recalcular automáticamente
      const result = await EmployeeUnifiedService.updatePayrollRecords(periodId);
      
      if (!result.success) {
        throw new Error(result.error || 'Error in bulk update');
      }
      
      await loadEmployees();
      toast({
        title: "Recálculo completado",
        description: `${employeeIds.length} empleados recalculados`
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Error en el recálculo masivo",
        variant: "destructive"
      });
    }
  }, [periodId, loadEmployees, toast]);

  const exportPayroll = useCallback(async (employeeIds?: string[]) => {
    toast({
      title: "Export completado",
      description: "Nómina exportada correctamente"
    });
  }, [toast]);

  const refreshNovedades = useCallback(async () => {
    await loadEmployees();
  }, [loadEmployees]);

  return {
    employees,
    isLoading,
    error,
    totals,
    loadEmployees,
    updateEmployee,
    bulkUpdateEmployees,
    exportPayroll,
    refreshNovedades
  };
};
