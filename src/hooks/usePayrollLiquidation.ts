
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { PayrollEmployee } from '@/types/payroll';

interface DBEmployee {
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
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const { toast } = useToast();

  // Transform DB employee to PayrollEmployee
  const transformEmployee = (dbEmployee: DBEmployee): PayrollEmployee => ({
    id: dbEmployee.id,
    name: `${dbEmployee.nombre} ${dbEmployee.apellido}`,
    position: 'Empleado', // Default position, could be enhanced later
    baseSalary: dbEmployee.salario_base,
    workedDays: dbEmployee.dias_trabajados,
    extraHours: 0, // Will be calculated from novedades
    disabilities: 0,
    bonuses: dbEmployee.devengos,
    absences: 0,
    grossPay: dbEmployee.total_pagar + dbEmployee.deducciones,
    deductions: dbEmployee.deducciones,
    netPay: dbEmployee.total_pagar,
    status: 'valid',
    errors: [],
    transportAllowance: dbEmployee.auxilio_transporte,
    employerContributions: 0
  });

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
      
      // Transform to PayrollEmployee format
      const transformedEmployees = employeesWithNovedades.map(transformEmployee);
      setEmployees(transformedEmployees);
      
      toast({
        title: "Empleados cargados",
        description: `Se cargaron ${transformedEmployees.length} empleados activos con deducciones detalladas`,
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
      
      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          console.log(`🔄 usePayrollLiquidation - Updating employee ${emp.name} with new novedades`);
          
          const updatedEmployee = {
            ...emp,
            bonuses: novedadesTotals.totalDevengos,
            deductions: novedadesTotals.totalDeducciones,
            netPay: emp.grossPay - novedadesTotals.totalDeducciones + novedadesTotals.totalDevengos
          };
          
          console.log('✅ usePayrollLiquidation - New employee state:', {
            bonuses: updatedEmployee.bonuses,
            deductions: updatedEmployee.deductions,
            netPay: updatedEmployee.netPay
          });
          
          return updatedEmployee;
        }
        return emp;
      }));
      
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
      // Convert PayrollEmployee back to expected format for service
      const dbEmployees = employees.map(emp => ({
        id: emp.id,
        nombre: emp.name.split(' ')[0] || emp.name,
        apellido: emp.name.split(' ').slice(1).join(' ') || '',
        salario_base: emp.baseSalary,
        total_pagar: emp.netPay,
        devengos: emp.bonuses,
        deducciones: emp.deductions,
        dias_trabajados: emp.workedDays,
        auxilio_transporte: emp.transportAllowance,
        salud_empleado: 0,
        pension_empleado: 0,
        fondo_solidaridad: 0,
        retencion_fuente: 0,
        deducciones_novedades: 0
      }));
      
      const result = await PayrollLiquidationService.liquidatePayroll(dbEmployees, startDate, endDate);
      
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
        emp.id === employeeId ? { ...emp, baseSalary: newSalary } : emp
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
