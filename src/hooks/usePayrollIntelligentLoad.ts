
import { useState, useCallback } from 'react';
import { PayrollAutoSaveService } from '@/services/PayrollAutoSaveService';
import { logger } from '@/lib/logger';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { PayrollEmployee } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';

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
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  deducciones_novedades: number;
}

export const usePayrollIntelligentLoad = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const transformEmployee = (dbEmployee: DBEmployee): PayrollEmployee => ({
    id: dbEmployee.id,
    name: `${dbEmployee.nombre} ${dbEmployee.apellido}`,
    position: 'Empleado',
    baseSalary: dbEmployee.salario_base,
    workedDays: dbEmployee.dias_trabajados,
    extraHours: 0,
    disabilities: 0,
    bonuses: dbEmployee.devengos,
    absences: 0,
    grossPay: dbEmployee.total_pagar + dbEmployee.deducciones,
    deductions: dbEmployee.deducciones,
    netPay: dbEmployee.total_pagar,
    status: 'valid',
    errors: [],
    transportAllowance: dbEmployee.auxilio_transporte,
    employerContributions: 0,
    healthDeduction: dbEmployee.salud_empleado,
    pensionDeduction: dbEmployee.pension_empleado
  });

  const intelligentLoad = useCallback(async (
    startDate: string, 
    endDate: string
  ): Promise<{
    employees: PayrollEmployee[];
    periodId: string;
    isRecovery: boolean;
  }> => {
    setIsLoading(true);
    
    try {
      logger.log('🧠 INTELLIGENT LOAD: Starting intelligent payroll load for dates:', { startDate, endDate });
      
      // PASO 1: Asegurar que el período existe
      const periodId = await PayrollLiquidationService.ensurePeriodExists(startDate, endDate);
      logger.log('📋 Period ID confirmed:', periodId);
      
      // PASO 2: DETECCIÓN INTELIGENTE - ¿Existen empleados en payrolls para este período?
      const existingPayrolls = await PayrollAutoSaveService.loadDraftEmployeesFiltered(periodId);
      
      if (existingPayrolls.length > 0) {
        logger.log('🔄 RECOVERY MODE: Found existing payroll data, loading from payrolls table');
        logger.log('👥 Existing employees in payrolls:', existingPayrolls.map(emp => emp.name));
        
        // Enriquecer con novedades
        const employeesWithNovedades = await Promise.all(
          existingPayrolls.map(async (employee) => {
            const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
              employee.id,
              periodId
            );
            
            return {
              ...employee,
              bonuses: novedadesTotals.totalDevengos,
              deductions: employee.deductions + novedadesTotals.totalDeducciones,
              netPay: employee.grossPay + novedadesTotals.totalDevengos - (employee.deductions + novedadesTotals.totalDeducciones)
            };
          })
        );
        
        toast({
          title: "Liquidación recuperada",
          description: `Se recuperaron ${employeesWithNovedades.length} empleados de la liquidación existente`,
          className: "border-blue-200 bg-blue-50"
        });
        
        return {
          employees: employeesWithNovedades,
          periodId,
          isRecovery: true
        };
        
      } else {
        logger.log('🆕 FRESH LOAD MODE: No existing payroll data, loading fresh from employees table');
        
        // Cargar empleados frescos desde employees
        const employeesData = await PayrollLiquidationService.loadEmployeesForPeriod(startDate, endDate);
        
        // Procesar con novedades
        const employeesWithNovedades = await Promise.all(
          employeesData.map(async (employee) => {
            const novedadesTotals = await NovedadesCalculationService.calculateEmployeeNovedadesTotals(
              employee.id,
              periodId
            );
            
            const totalDeducciones = employee.salud_empleado + employee.pension_empleado + 
                                   employee.fondo_solidaridad + employee.retencion_fuente + 
                                   novedadesTotals.totalDeducciones;
            
            const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
            const totalConNovedades = salarioProporcional + employee.auxilio_transporte + 
                                    novedadesTotals.totalDevengos - totalDeducciones;
            
            return {
              ...employee,
              devengos: novedadesTotals.totalDevengos,
              deducciones: totalDeducciones,
              deducciones_novedades: novedadesTotals.totalDeducciones,
              total_pagar: totalConNovedades
            };
          })
        );
        
        const transformedEmployees = employeesWithNovedades.map(transformEmployee);
        
        toast({
          title: "Empleados cargados",
          description: `Se cargaron ${transformedEmployees.length} empleados activos para nueva liquidación`,
        });
        
        return {
          employees: transformedEmployees,
          periodId,
          isRecovery: false
        };
      }
      
    } catch (error) {
      logger.error('❌ Error in intelligent load:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
      
      return {
        employees: [],
        periodId: '',
        isRecovery: false
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast, transformEmployee]);

  return {
    intelligentLoad,
    isLoading
  };
};
