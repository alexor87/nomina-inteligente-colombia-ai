
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationFacade } from '@/services/payroll-liquidation/PayrollLiquidationFacade';
import { PayrollLiquidationState } from '@/types/payroll-liquidation';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';

/**
 * ✅ HOOK DE LÓGICA DE NEGOCIO - CORRECCIÓN FASE 1
 * Contiene toda la lógica de negocio sin efectos secundarios de UI
 */
export const usePayrollLiquidationLogic = (
  state: PayrollLiquidationState,
  actions: any
) => {
  const { toast } = useToast();

  // Calcular resumen de empleados
  const updateSummary = useCallback((employeeList: PayrollEmployee[]) => {
    const validEmployees = employeeList.filter(emp => emp.status === 'valid');
    
    const newSummary: PayrollSummary = {
      totalEmployees: employeeList.length,
      validEmployees: validEmployees.length,
      totalGrossPay: validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0),
      totalDeductions: validEmployees.reduce((sum, emp) => sum + emp.deductions, 0),
      totalNetPay: validEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
      employerContributions: validEmployees.reduce((sum, emp) => sum + emp.employerContributions, 0),
      totalPayrollCost: validEmployees.reduce((sum, emp) => sum + emp.grossPay + emp.employerContributions, 0)
    };
    
    actions.setSummary(newSummary);
  }, [actions]);

  // Inicializar período actual
  const initializePeriod = useCallback(async () => {
    try {
      actions.setIsLoading(true);
      console.log('🚀 CORRECCIÓN FASE 1 - Inicializando período...');
      
      const result = await PayrollLiquidationFacade.detectCurrentPeriodSituation();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      actions.setPeriodStatus(result.data);
      
      if (result.data.currentPeriod) {
        actions.setCurrentPeriod(result.data.currentPeriod);
        await loadEmployeesForPeriod(result.data.currentPeriod);
      } else {
        console.log('⚠️ No hay período activo');
        actions.setEmployees([]);
        actions.setSelectedEmployees([]);
      }
      
    } catch (error) {
      console.error('💥 Error inicializando período:', error);
      toast({
        title: "Error",
        description: "Error inicializando el período de nómina",
        variant: "destructive"
      });
    } finally {
      actions.setIsLoading(false);
    }
  }, [actions, toast]);

  // Cargar empleados para período
  const loadEmployeesForPeriod = useCallback(async (period: any) => {
    try {
      actions.setIsProcessing(true);
      console.log('👥 CORRECCIÓN FASE 1 - Cargando empleados para período:', period.periodo);
      
      const result = await PayrollLiquidationFacade.loadEmployeesForActivePeriod(period);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      actions.setEmployees(result.data);
      
      // Seleccionar empleados válidos por defecto
      const validEmployeeIds = result.data
        .filter(emp => emp.status === 'valid')
        .map(emp => emp.id);
      actions.setSelectedEmployees(validEmployeeIds);
      
      // Actualizar contador en período
      const updateCountResult = await PayrollLiquidationFacade.updateEmployeeCount(
        period.id, 
        result.data.length
      );
      
      if (!updateCountResult.success) {
        console.warn('⚠️ Error actualizando contador:', updateCountResult.error);
      }
      
      // Calcular resumen
      updateSummary(result.data);
      
      console.log(`✅ CORRECCIÓN FASE 1 - Empleados cargados: ${result.data.length}`);
      
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      actions.setIsProcessing(false);
    }
  }, [actions, toast, updateSummary]);

  // Crear nuevo período
  const createNewPeriod = useCallback(async () => {
    try {
      actions.setIsLoading(true);
      console.log('🆕 CORRECCIÓN FASE 1 - Creando nuevo período...');
      
      const result = await PayrollLiquidationFacade.createNextPeriod();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data.period) {
        actions.setCurrentPeriod(result.data.period);
        await loadEmployeesForPeriod(result.data.period);
        
        toast({
          title: "✅ Período creado",
          description: result.data.message,
          className: "border-green-200 bg-green-50"
        });
      }
      
    } catch (error) {
      console.error('❌ Error creando período:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el nuevo período",
        variant: "destructive"
      });
    } finally {
      actions.setIsLoading(false);
    }
  }, [actions, loadEmployeesForPeriod, toast]);

  return {
    initializePeriod,
    loadEmployeesForPeriod,
    createNewPeriod,
    updateSummary
  };
};
