
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationFacade } from '@/services/payroll-liquidation/PayrollLiquidationFacade';
import { PayrollLiquidationState } from '@/types/payroll-liquidation';

/**
 * ✅ HOOK DE EFECTOS SECUNDARIOS - CORRECCIÓN FASE 1
 * Maneja operaciones que afectan el estado externo (API, base de datos)
 */
export const usePayrollLiquidationEffects = (
  state: PayrollLiquidationState,
  actions: any,
  logic: any
) => {
  const { toast } = useToast();

  // Remover empleado del período
  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    if (!state.currentPeriod) return;

    try {
      actions.setIsProcessing(true);
      console.log(`🗑️ CORRECCIÓN FASE 1 - Removiendo empleado: ${employeeId}`);
      
      const result = await PayrollLiquidationFacade.removeEmployeeFromPeriod(
        employeeId, 
        state.currentPeriod.id
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Actualizar lista local
      const updatedEmployees = state.employees.filter(emp => emp.id !== employeeId);
      actions.setEmployees(updatedEmployees);
      
      // Actualizar selección
      actions.setSelectedEmployees((prev: string[]) => prev.filter(id => id !== employeeId));
      
      // Actualizar resumen
      logic.updateSummary(updatedEmployees);
      
      // Actualizar contador en BD
      const updateCountResult = await PayrollLiquidationFacade.updateEmployeeCount(
        state.currentPeriod.id, 
        updatedEmployees.length
      );
      
      if (!updateCountResult.success) {
        console.warn('⚠️ Error actualizando contador:', updateCountResult.error);
      }
      
      toast({
        title: "✅ Empleado removido",
        description: "El empleado ha sido removido del período exitosamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo remover el empleado",
        variant: "destructive"
      });
    } finally {
      actions.setIsProcessing(false);
    }
  }, [state.currentPeriod, state.employees, actions, logic, toast]);

  // Recalcular empleado después de cambio en novedad
  const recalculateAfterNovedadChange = useCallback(async (employeeId: string) => {
    if (!state.currentPeriod) return;

    try {
      actions.setIsProcessing(true);
      console.log(`🔄 CORRECCIÓN FASE 1 - Recalculando empleado: ${employeeId}`);
      
      const result = await PayrollLiquidationFacade.recalculateAfterNovedadChange(
        employeeId,
        state.currentPeriod.id
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data) {
        // Actualizar empleado en la lista
        const updatedEmployees = state.employees.map(emp => 
          emp.id === employeeId ? result.data! : emp
        );
        
        actions.setEmployees(updatedEmployees);
        logic.updateSummary(updatedEmployees);
        
        toast({
          title: "✅ Empleado recalculado",
          description: "Los cálculos han sido actualizados exitosamente",
          className: "border-blue-200 bg-blue-50"
        });
      }
      
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo recalcular el empleado",
        variant: "destructive"
      });
    } finally {
      actions.setIsProcessing(false);
    }
  }, [state.currentPeriod, state.employees, actions, logic, toast]);

  // Cerrar período con manejo seguro de tipos
  const closePeriod = useCallback(async () => {
    if (!state.currentPeriod) {
      toast({
        title: "Error",
        description: "No hay período activo para cerrar",
        variant: "destructive"
      });
      return;
    }

    const selectedEmployeesList = state.employees.filter(emp => 
      state.selectedEmployees.includes(emp.id) && emp.status === 'valid'
    );

    if (selectedEmployeesList.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un empleado válido",
        variant: "destructive"
      });
      return;
    }

    try {
      actions.setIsProcessing(true);
      actions.setClosureStep('validation');
      actions.setRollbackExecuted(false);
      actions.setPostClosureResult(null);
      
      console.log('🔒 CORRECCIÓN FASE 1 - Iniciando cierre con tipos seguros...');
      
      // Simular progreso de pasos
      const steps = ['validation', 'snapshot', 'closure', 'verification'] as const;
      
      for (const step of steps) {
        actions.setClosureStep(step);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await PayrollLiquidationFacade.closePeriod(
        state.currentPeriod,
        selectedEmployeesList
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Actualizar estado del período localmente
      actions.setCurrentPeriod((prev: any) => ({ ...prev, estado: 'cerrado' }));
      actions.setClosureStep('completed');
      
      // Manejar resultado post-cierre de forma segura
      if (result.data.postClosureResult) {
        actions.setPostClosureResult(result.data.postClosureResult);
        
        if (result.data.postClosureResult.nextPeriodSuggestion) {
          const nextPeriod = result.data.postClosureResult.nextPeriodSuggestion;
          console.log('📅 CORRECCIÓN FASE 1 - Siguiente período sugerido:', nextPeriod);
          
          toast({
            title: "✅ Período cerrado exitosamente",
            description: `Siguiente período sugerido: ${nextPeriod.startDate} - ${nextPeriod.endDate}`,
            className: "border-green-200 bg-green-50"
          });
        } else {
          toast({
            title: "✅ Período cerrado exitosamente",
            description: result.data.message,
            className: "border-green-200 bg-green-50"
          });
        }
      } else {
        toast({
          title: "✅ Período cerrado exitosamente",
          description: result.data.message,
          className: "border-green-200 bg-green-50"
        });
      }
      
      // Reinicializar para mostrar el estado actualizado
      setTimeout(() => {
        logic.initializePeriod();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      actions.setClosureStep('error');
      actions.setRollbackExecuted(true);
      
      toast({
        title: "Error cerrando período",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      actions.setIsProcessing(false);
    }
  }, [state.currentPeriod, state.employees, state.selectedEmployees, actions, logic, toast]);

  return {
    removeEmployeeFromPeriod,
    recalculateAfterNovedadChange,
    closePeriod
  };
};
