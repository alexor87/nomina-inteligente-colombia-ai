import { useState, useCallback } from 'react';
import { PayrollEmployee, BaseEmployeeData } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';
import { calculateEmployeeBackend } from '@/utils/payrollCalculationsBackend';
import { useEmployeeData } from './useEmployeeData';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';

interface LiquidationResult {
  periodData: any;
  summary: any;
}

export const usePayrollLiquidation = () => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriodId, setCurrentPeriodId] = useState<string>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [liquidationResult, setLiquidationResult] = useState<LiquidationResult | null>(null);

  const { employees: allEmployees, loadEmployees: loadAllEmployees } = useEmployeeData();
  const { toast } = useToast();

  const loadEmployees = useCallback(async (startDate: string, endDate: string, year?: string) => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando empleados para liquidación con año:', { startDate, endDate, year });
      
      await loadAllEmployees();
      
      if (allEmployees.length === 0) {
        console.log('⚠️ No hay empleados disponibles para cargar');
        setEmployees([]);
        return;
      }

      const currentYear = year || new Date().getFullYear().toString();
      console.log('📅 Usando año para cálculos:', currentYear);

      const baseEmployeesData: BaseEmployeeData[] = allEmployees.map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`.trim(),
        position: emp.cargo || 'No especificado',
        baseSalary: emp.salarioBase || 0,
        workedDays: 15,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        eps: emp.eps || 'No asignada',
        afp: emp.afp || 'No asignada',
        novedades: []
      }));

      const calculatedEmployees = await Promise.all(
        baseEmployeesData.map(emp => calculateEmployeeBackend(emp, 'quincenal', currentYear))
      );

      setEmployees(calculatedEmployees);
      
      console.log('✅ Empleados cargados y calculados:', {
        total: calculatedEmployees.length,
        conAuxilioTransporte: calculatedEmployees.filter(e => e.transportAllowance > 0).length,
        totalNeto: calculatedEmployees.reduce((sum, e) => sum + e.netPay, 0),
        year: currentYear
      });

    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [allEmployees, loadAllEmployees, toast]);

  const addEmployees = useCallback(async (employeeIds: string[]) => {
    try {
      const newEmployees = allEmployees.filter(emp => 
        employeeIds.includes(emp.id) && !employees.some(e => e.id === emp.id)
      );

      if (newEmployees.length === 0) return;

      const baseEmployeesData: BaseEmployeeData[] = newEmployees.map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`.trim(),
        position: emp.cargo || 'No especificado',
        baseSalary: emp.salarioBase || 0,
        workedDays: 15,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        eps: emp.eps || 'No asignada',
        afp: emp.afp || 'No asignada',
        novedades: []
      }));

      const calculatedEmployees = await Promise.all(
        baseEmployeesData.map(emp => calculateEmployeeBackend(emp, 'quincenal'))
      );

      setEmployees(prev => [...prev, ...calculatedEmployees]);

      toast({
        title: "Empleados agregados",
        description: `Se agregaron ${calculatedEmployees.length} empleados a la liquidación`,
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error adding employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive"
      });
    }
  }, [allEmployees, employees, toast]);

  const removeEmployee = useCallback((employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    toast({
      title: "Empleado removido",
      description: "El empleado ha sido removido de la liquidación",
      className: "border-orange-200 bg-orange-50"
    });
  }, [toast]);

  const liquidatePayroll = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsLiquidating(true);
      
      const result = await PayrollLiquidationService.processLiquidation({
        employees,
        startDate,
        endDate,
        periodType: 'quincenal'
      });

      setLiquidationResult(result);
      setShowSuccessModal(true);

      console.log('✅ Liquidación completada:', result);

    } catch (error) {
      console.error('❌ Error en liquidación:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la liquidación: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive"
      });
    } finally {
      setIsLiquidating(false);
    }
  }, [employees, toast]);

  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const baseData: BaseEmployeeData = {
        id: employee.id,
        name: employee.name,
        position: employee.position,
        baseSalary: employee.baseSalary,
        workedDays: employee.workedDays,
        extraHours: employee.extraHours,
        disabilities: employee.disabilities,
        bonuses: employee.bonuses,
        absences: employee.absences,
        eps: employee.eps,
        afp: employee.afp,
        novedades: employee.novedades || []
      };

      const recalculatedEmployee = await calculateEmployeeBackend(baseData, 'quincenal');

      setEmployees(prev => 
        prev.map(emp => emp.id === employeeId ? recalculatedEmployee : emp)
      );

      console.log('✅ Empleado recalculado después de cambio en novedades:', recalculatedEmployee);
    } catch (error) {
      console.error('❌ Error refrescando novedades del empleado:', error);
    }
  }, [employees]);

  const closeSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setLiquidationResult(null);
  }, []);

  return {
    employees,
    isLoading,
    isLiquidating,
    currentPeriodId,
    loadEmployees,
    addEmployees,
    removeEmployee,
    liquidatePayroll,
    refreshEmployeeNovedades,
    showSuccessModal,
    liquidationResult,
    closeSuccessModal
  };
};
