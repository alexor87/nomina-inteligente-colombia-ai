
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
  novedades_totals?: {
    totalDevengos: number;
    totalDeducciones: number;
    totalNeto: number;
    hasNovedades: boolean;
  };
}

export const usePayrollLiquidation = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadEmployees = async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
      
      // Create or get period for novedades
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      setCurrentPeriodId(periodId);
      
      // Load novedades for each employee
      const employeesWithNovedades = await Promise.all(
        employeesData.map(async (employee) => {
          const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
            employee.id,
            periodId
          );
          
          // Recalculate total_pagar with novedades
          const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
          const totalConNovedades = salarioProporcional + novedadesTotals.totalDevengos - novedadesTotals.totalDeducciones;
          
          return {
            ...employee,
            devengos: novedadesTotals.totalDevengos,
            deducciones: novedadesTotals.totalDeducciones,
            total_pagar: totalConNovedades,
            novedades_totals: novedadesTotals
          };
        })
      );
      
      setEmployees(employeesWithNovedades);
      
      toast({
        title: "Empleados cargados",
        description: `Se cargaron ${employeesWithNovedades.length} empleados activos`,
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

  const refreshEmployeeNovedades = async (employeeId: string) => {
    if (!currentPeriodId) return;
    
    try {
      const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
        employeeId,
        currentPeriodId
      );
      
      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          const salarioProporcional = (emp.salario_base / 30) * emp.dias_trabajados;
          const totalConNovedades = salarioProporcional + novedadesTotals.totalDevengos - novedadesTotals.totalDeducciones;
          
          return {
            ...emp,
            devengos: novedadesTotals.totalDevengos,
            deducciones: novedadesTotals.totalDeducciones,
            total_pagar: totalConNovedades,
            novedades_totals: novedadesTotals
          };
        }
        return emp;
      }));
    } catch (error) {
      console.error('Error refreshing employee novedades:', error);
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
        setCurrentPeriodId(null);
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
    currentPeriodId,
    loadEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades
  };
};
