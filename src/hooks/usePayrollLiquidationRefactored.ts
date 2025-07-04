
import { useEffect, useCallback } from 'react';
import { usePayrollLiquidationState } from './payroll-liquidation/usePayrollLiquidationState';
import { usePayrollLiquidationLogic } from './payroll-liquidation/usePayrollLiquidationLogic';
import { usePayrollLiquidationEffects } from './payroll-liquidation/usePayrollLiquidationEffects';

/**
 * ✅ HOOK PRINCIPAL REFACTORIZADO - CORRECCIÓN FASE 1
 * Combina hooks especializados con responsabilidades separadas
 */
export const usePayrollLiquidationRefactored = () => {
  const { state, actions } = usePayrollLiquidationState();
  const logic = usePayrollLiquidationLogic(state, actions);
  const effects = usePayrollLiquidationEffects(state, actions, logic);

  // Métodos de selección de empleados (lógica pura de UI)
  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    actions.setSelectedEmployees((prev: string[]) => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  }, [actions]);

  const toggleAllEmployees = useCallback(() => {
    const validEmployeeIds = state.employees
      .filter(emp => emp.status === 'valid')
      .map(emp => emp.id);
    
    if (state.selectedEmployees.length === validEmployeeIds.length) {
      actions.setSelectedEmployees([]);
    } else {
      actions.setSelectedEmployees(validEmployeeIds);
    }
  }, [state.employees, state.selectedEmployees, actions]);

  // Método para recalcular todos
  const recalculateAll = useCallback(async () => {
    if (!state.currentPeriod) return;

    try {
      actions.setIsProcessing(true);
      console.log('🔄 CORRECCIÓN FASE 1 - Recalculando todos los empleados...');
      
      // Recargar empleados desde cero
      await logic.loadEmployeesForPeriod(state.currentPeriod);
      
      // TODO: Implementar toast en el componente que usa este hook
      console.log('✅ Recálculo completado');
      
    } catch (error) {
      console.error('❌ Error recalculando todos:', error);
    } finally {
      actions.setIsProcessing(false);
    }
  }, [state.currentPeriod, logic, actions]);

  // Método para crear novedad (placeholder)
  const createNovedadForEmployee = useCallback(async (employeeId: string, novedadData: any) => {
    if (!state.currentPeriod) return;

    try {
      actions.setIsProcessing(true);
      console.log(`📋 CORRECCIÓN FASE 1 - Creando novedad para empleado: ${employeeId}`);
      
      // TODO: Implementar en facade cuando sea necesario
      console.log('✅ Novedad creada (placeholder)');
      
      // Recalcular empleado después de crear novedad
      await effects.recalculateAfterNovedadChange(employeeId);
      
    } catch (error) {
      console.error('❌ Error creando novedad:', error);
    } finally {
      actions.setIsProcessing(false);
    }
  }, [state.currentPeriod, effects, actions]);

  // Inicializar al montar
  useEffect(() => {
    logic.initializePeriod();
  }, [logic.initializePeriod]);

  // Estados calculados
  const canClosePeriod = state.currentPeriod?.estado === 'borrador' && 
                        state.selectedEmployees.length > 0 && 
                        state.employees.some(emp => emp.status === 'valid');
                        
  const isValidPeriod = state.currentPeriod !== null;
  const hasEmployees = state.employees.length > 0;

  return {
    // Estados
    ...state,
    
    // Acciones de lógica de negocio
    removeEmployeeFromPeriod: effects.removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange: effects.recalculateAfterNovedadChange,
    closePeriod: effects.closePeriod,
    createNewPeriod: logic.createNewPeriod,
    refreshPeriod: logic.initializePeriod,
    
    // Acciones de UI
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    
    // Estados calculados
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  };
};
