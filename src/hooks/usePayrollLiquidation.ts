
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
}

export const usePayrollLiquidation = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const { toast } = useToast();

  const loadEmployees = async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
      setEmployees(employeesData);
      
      toast({
        title: "Empleados cargados",
        description: `Se cargaron ${employeesData.length} empleados activos`,
      });
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    toast({
      title: "Empleado removido",
      description: "El empleado ha sido removido de esta liquidación",
    });
  };

  const liquidatePayroll = async (startDate: string, endDate: string) => {
    setIsLiquidating(true);
    try {
      const result = await PayrollLiquidationService.liquidatePayroll(employees, startDate, endDate);
      
      if (result.success) {
        toast({
          title: "✅ Liquidación completada",
          description: `Se liquidaron ${employees.length} empleados correctamente`,
          className: "border-green-200 bg-green-50"
        });
        
        // Reset state
        setEmployees([]);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error liquidating payroll:', error);
      toast({
        title: "Error en liquidación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  };

  return {
    employees,
    isLoading,
    isLiquidating,
    loadEmployees,
    removeEmployee,
    liquidatePayroll
  };
};
