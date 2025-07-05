
/**
 * ✅ HOOK UNIFICADO DE DOMINIO DE NÓMINA - ARQUITECTURA CRÍTICA
 * Hook principal que reemplaza múltiples hooks fragmentados
 * Maneja liquidación e historial de forma unificada
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollDomainService, PayrollPeriod, PayrollEmployee, PeriodDetectionResult } from '@/services/PayrollDomainService';

export interface PayrollDomainState {
  isLoading: boolean;
  currentPeriod: PayrollPeriod | null;
  employees: PayrollEmployee[];
  history: PayrollPeriod[];
  periodSituation: PeriodDetectionResult | null;
}

export const usePayrollDomain = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<PayrollDomainState>({
    isLoading: false,
    currentPeriod: null,
    employees: [],
    history: [],
    periodSituation: null
  });

  /**
   * Detectar situación actual del período
   */
  const detectPeriodSituation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const situation = await PayrollDomainService.detectCurrentPeriodSituation();
      
      setState(prev => ({
        ...prev,
        periodSituation: situation,
        currentPeriod: situation.currentPeriod
      }));

      toast({
        title: "Estado del período detectado",
        description: situation.message,
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Error detecting period situation:', error);
      toast({
        title: "Error",
        description: "No se pudo detectar el estado del período",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  /**
   * Crear nuevo período
   */
  const createPeriod = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await PayrollDomainService.createNextPeriod();
      
      if (result.success && result.period) {
        setState(prev => ({
          ...prev,
          currentPeriod: result.period!,
          periodSituation: {
            ...prev.periodSituation!,
            currentPeriod: result.period!,
            needsCreation: false,
            canContinue: true
          }
        }));

        toast({
          title: "✅ Período creado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('❌ Error creating period:', error);
      toast({
        title: "❌ Error creando período",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  /**
   * Cargar empleados para liquidación
   */
  const loadEmployees = useCallback(async (periodId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const employees = await PayrollDomainService.loadEmployeesForLiquidation(periodId);
      
      setState(prev => ({ ...prev, employees }));

    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  /**
   * Cargar historial de períodos
   */
  const loadHistory = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const history = await PayrollDomainService.getPayrollHistory();
      
      setState(prev => ({ ...prev, history }));

    } catch (error) {
      console.error('❌ Error loading history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  /**
   * Cerrar período
   */
  const closePeriod = useCallback(async (periodId: string) => {
    if (!periodId) {
      toast({
        title: "Error",
        description: "No hay período para cerrar",
        variant: "destructive"
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await PayrollDomainService.closePeriod(periodId);
      
      if (result.success) {
        // Actualizar estado local
        setState(prev => ({
          ...prev,
          currentPeriod: prev.currentPeriod ? 
            { ...prev.currentPeriod, estado: 'closed' } : null
        }));

        toast({
          title: "✅ Período cerrado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });

        // Recargar situación del período
        await detectPeriodSituation();
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('❌ Error closing period:', error);
      toast({
        title: "❌ Error cerrando período",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast, detectPeriodSituation]);

  return {
    // Estado
    ...state,
    
    // Acciones
    detectPeriodSituation,
    createPeriod,
    loadEmployees,
    loadHistory,
    closePeriod
  };
};
