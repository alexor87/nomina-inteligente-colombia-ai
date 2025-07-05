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
  auxilio_transporte: number;
  // Deducciones detalladas para auditoría DIAN/UGPP
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  deducciones_novedades: number;
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
      console.log('🔄 usePayrollLiquidation - Loading employees for period:', { startDate, endDate });
      
      const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
      
      // Create or get period for novedades
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      setCurrentPeriodId(periodId);
      
      console.log('📋 usePayrollLiquidation - Period ID set:', periodId);
      
      // Load novedades for each employee
      const employeesWithNovedades = await Promise.all(
        employeesData.map(async (employee) => {
          console.log(`🔄 usePayrollLiquidation - Loading novedades for employee: ${employee.nombre}`);
          
          const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
            employee.id,
            periodId
          );
          
          console.log(`📊 usePayrollLiquidation - Novedades totals for ${employee.nombre}:`, novedadesTotals);
          
          // Preservar las deducciones de ley calculadas y sumar las de novedades
          const totalDeducciones = employee.salud_empleado + employee.pension_empleado + 
                                 employee.fondo_solidaridad + employee.retencion_fuente + 
                                 novedadesTotals.totalDeducciones;
          
          // Recalculate total_pagar with detailed deductions
          const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
          const totalConNovedades = salarioProporcional + employee.auxilio_transporte + 
                                  novedadesTotals.totalDevengos - totalDeducciones;
          
          const updatedEmployee = {
            ...employee,
            devengos: novedadesTotals.totalDevengos,
            deducciones: totalDeducciones,
            deducciones_novedades: novedadesTotals.totalDeducciones,
            total_pagar: totalConNovedades,
            novedades_totals: novedadesTotals
          };
          
          console.log(`✅ usePayrollLiquidation - Final employee data for ${employee.nombre}:`, {
            devengos: updatedEmployee.devengos,
            deducciones: updatedEmployee.deducciones,
            total_pagar: updatedEmployee.total_pagar,
            hasNovedades: updatedEmployee.novedades_totals?.hasNovedades
          });
          
          return updatedEmployee;
        })
      );
      
      setEmployees(employeesWithNovedades);
      
      toast({
        title: "Empleados cargados",
        description: `Se cargaron ${employeesWithNovedades.length} empleados activos con deducciones detalladas`,
      });
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error loading employees:', error);
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
    if (!currentPeriodId) {
      console.warn('⚠️ usePayrollLiquidation - No current period ID when refreshing novedades');
      return;
    }
    
    console.log('🔄 usePayrollLiquidation - Refreshing novedades for employee:', employeeId);
    console.log('📋 usePayrollLiquidation - Using period ID:', currentPeriodId);
    
    try {
      const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
        employeeId,
        currentPeriodId
      );
      
      console.log('📊 usePayrollLiquidation - New novedades totals:', novedadesTotals);
      
      setEmployees(prev => {
        const updatedEmployees = prev.map(emp => {
          if (emp.id === employeeId) {
            console.log(`🔄 usePayrollLiquidation - Updating employee ${emp.nombre} with new novedades`);
            console.log('📊 usePayrollLiquidation - Previous employee state:', {
              devengos: emp.devengos,
              deducciones: emp.deducciones,
              total_pagar: emp.total_pagar
            });
            
            // Preservar las deducciones de ley y agregar las de novedades
            const totalDeducciones = emp.salud_empleado + emp.pension_empleado + 
                                   emp.fondo_solidaridad + emp.retencion_fuente + 
                                   novedadesTotals.totalDeducciones;
            
            const salarioProporcional = (emp.salario_base / 30) * emp.dias_trabajados;
            const totalConNovedades = salarioProporcional + emp.auxilio_transporte + 
                                    novedadesTotals.totalDevengos - totalDeducciones;
            
            const updatedEmployee = {
              ...emp,
              devengos: novedadesTotals.totalDevengos,
              deducciones: totalDeducciones,
              deducciones_novedades: novedadesTotals.totalDeducciones,
              total_pagar: totalConNovedades,
              novedades_totals: novedadesTotals
            };
            
            console.log('✅ usePayrollLiquidation - New employee state:', {
              devengos: updatedEmployee.devengos,
              deducciones: updatedEmployee.deducciones,
              total_pagar: updatedEmployee.total_pagar,
              hasNovedades: updatedEmployee.novedades_totals?.hasNovedades
            });
            
            return updatedEmployee;
          }
          return emp;
        });
        
        console.log('🔄 usePayrollLiquidation - State updated, employees array length:', updatedEmployees.length);
        return updatedEmployees;
      });
      
      console.log('✅ usePayrollLiquidation - Employee novedades refreshed successfully');
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error refreshing employee novedades:', error);
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
          description: `Se liquidaron ${employees.length} empleados con deducciones detalladas para auditoría`,
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

  const updateEmployeeSalary = async (employeeId: string, newSalary: number) => {
    try {
      // Update employee salary in the state
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, salario_base: newSalary } : emp
      ));
      
      console.log(`✅ usePayrollLiquidation - Employee salary updated: ${employeeId} -> ${newSalary}`);
    } catch (error) {
      console.error('❌ usePayrollLiquidation - Error updating employee salary:', error);
      throw error;
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
    refreshEmployeeNovedades,
    updateEmployeeSalary
  };
};
