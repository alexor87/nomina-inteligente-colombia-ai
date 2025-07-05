
/**
 * 🎯 HOOK ALELUYA - ULTRA-SIMPLIFICADO
 * Sin lógica inteligente, solo manejo de fechas seleccionadas por usuario
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollServiceAleluya, PayrollPeriod } from '@/services/PayrollServiceAleluya';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';

interface PayrollState {
  isLoading: boolean;
  isProcessing: boolean;
  currentPeriod: PayrollPeriod | null;
  employees: PayrollEmployee[];
  selectedEmployees: string[];
  summary: PayrollSummary;
  needsCreation: boolean;
  canLiquidate: boolean;
  message: string;
}

export const usePayrollAleluya = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<PayrollState>({
    isLoading: true,
    isProcessing: false,
    currentPeriod: null,
    employees: [],
    selectedEmployees: [],
    summary: {
      totalEmployees: 0,
      validEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      employerContributions: 0,
      totalPayrollCost: 0
    },
    needsCreation: false,
    canLiquidate: false,
    message: ''
  });

  /**
   * 🔄 INICIALIZAR - ULTRA-SIMPLE
   */
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      console.log('🔄 Inicializando hook ultra-simple...');
      const result = await PayrollServiceAleluya.loadCurrentPeriod();
      
      // Seleccionar empleados válidos automáticamente
      const validEmployeeIds = result.employees
        .filter(emp => emp.status === 'valid' || emp.status === 'incomplete')
        .map(emp => emp.id);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentPeriod: result.period,
        employees: result.employees,
        selectedEmployees: validEmployeeIds,
        summary: result.summary,
        needsCreation: result.needsCreation,
        canLiquidate: !result.needsCreation && validEmployeeIds.length > 0,
        message: result.message
      }));

      console.log('✅ Hook ultra-simple inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando hook:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        message: 'Error cargando nómina'
      }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error cargando nómina",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * 🏗️ CREAR PERÍODO CON FECHAS - ULTRA-SIMPLE
   */
  const createPeriodWithDates = useCallback(async (startDate: string, endDate: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      console.log('🏗️ Creando período ultra-simple:', startDate, '-', endDate);
      const result = await PayrollServiceAleluya.createPeriodWithDates(startDate, endDate);
      
      // Seleccionar empleados válidos automáticamente
      const validEmployeeIds = result.employees
        .filter(emp => emp.status === 'valid' || emp.status === 'incomplete')
        .map(emp => emp.id);
      
      // Calcular summary
      const summary = {
        totalEmployees: result.employees.length,
        validEmployees: validEmployeeIds.length,
        totalGrossPay: result.employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeductions: result.employees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNetPay: result.employees.reduce((sum, emp) => sum + emp.netPay, 0),
        employerContributions: result.employees.reduce((sum, emp) => sum + emp.employerContributions, 0),
        totalPayrollCost: result.employees.reduce((sum, emp) => sum + emp.grossPay + emp.employerContributions, 0)
      };
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentPeriod: result.period,
        employees: result.employees,
        selectedEmployees: validEmployeeIds,
        needsCreation: false,
        canLiquidate: validEmployeeIds.length > 0,
        message: result.message,
        summary
      }));

      toast({
        title: "✅ Período Creado",
        description: result.message,
        className: "border-green-200 bg-green-50"
      });

    } catch (error) {
      console.error('❌ Error creando período:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error creando período",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * 💰 LIQUIDAR NÓMINA - MANTENIDO
   */
  const liquidatePayroll = useCallback(async () => {
    if (!state.currentPeriod || state.selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar empleados para liquidar",
        variant: "destructive"
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      console.log('💰 Liquidando nómina...');
      const result = await PayrollServiceAleluya.liquidatePayroll(
        state.currentPeriod.id,
        state.selectedEmployees
      );

      setState(prev => ({ ...prev, isProcessing: false }));

      toast({
        title: "✅ Nómina Liquidada",
        description: result.message,
        className: "border-green-200 bg-green-50"
      });

      // Recargar datos después de liquidar
      await initialize();

    } catch (error) {
      console.error('❌ Error liquidando nómina:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error en liquidación",
        variant: "destructive"
      });
    }
  }, [state.currentPeriod, state.selectedEmployees, toast, initialize]);

  /**
   * 🔒 CERRAR PERÍODO - MANTENIDO
   */
  const closePeriod = useCallback(async () => {
    if (!state.currentPeriod) {
      toast({
        title: "Error",
        description: "No hay período para cerrar",
        variant: "destructive"
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      console.log('🔒 Cerrando período...');
      const result = await PayrollServiceAleluya.closePeriod(state.currentPeriod.id);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          currentPeriod: prev.currentPeriod ? 
            { ...prev.currentPeriod, estado: 'cerrado' } : null,
          canLiquidate: false
        }));

        toast({
          title: "✅ Período Cerrado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });

        // Recargar para detectar siguiente período
        setTimeout(() => initialize(), 2000);
      }

    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error cerrando período",
        variant: "destructive"
      });
    }
  }, [state.currentPeriod, toast, initialize]);

  /**
   * ✅ SELECCIÓN DE EMPLEADOS - MANTENIDO
   */
  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setState(prev => {
      const newSelected = prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId];
      
      return {
        ...prev,
        selectedEmployees: newSelected,
        canLiquidate: !prev.needsCreation && newSelected.length > 0
      };
    });
  }, []);

  const toggleAllEmployees = useCallback(() => {
    setState(prev => {
      const validEmployeeIds = prev.employees
        .filter(emp => emp.status === 'valid' || emp.status === 'incomplete')
        .map(emp => emp.id);
      
      const allSelected = prev.selectedEmployees.length === validEmployeeIds.length;
      const newSelected = allSelected ? [] : validEmployeeIds;
      
      return {
        ...prev,
        selectedEmployees: newSelected,
        canLiquidate: !prev.needsCreation && newSelected.length > 0
      };
    });
  }, []);

  // Inicializar al montar
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    // Estados principales
    ...state,
    
    // Acciones principales
    createPeriodWithDates, // ULTRA-SIMPLE: Crear período con fechas exactas
    liquidatePayroll,
    closePeriod,
    refresh: initialize,
    
    // Selección de empleados
    toggleEmployeeSelection,
    toggleAllEmployees,
    
    // Estados calculados
    hasActivePeriod: !!state.currentPeriod,
    selectedCount: state.selectedEmployees.length,
    totalEmployees: state.employees.length,
    canClosePeriod: state.currentPeriod?.estado === 'borrador' && state.selectedEmployees.length > 0
  };
};
