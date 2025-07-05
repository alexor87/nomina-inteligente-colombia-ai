
/**
 * 📊 HOOK ALELUYA - ESTADO SIMPLIFICADO DE HISTORIAL
 * Reemplaza la arquitectura fragmentada con funcionalidades profesionales
 * Incluye edición, comprobantes y períodos pasados
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { HistoryServiceAleluya, HistoryPeriod, PeriodDetail } from '@/services/HistoryServiceAleluya';

interface HistoryState {
  isLoading: boolean;
  isProcessing: boolean;
  periods: HistoryPeriod[];
  selectedPeriod: PeriodDetail | null;
  filters: {
    status: string;
    type: string;
    search: string;
    dateFrom: string;
    dateTo: string;
  };
}

export const useHistoryAleluya = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<HistoryState>({
    isLoading: true,
    isProcessing: false,
    periods: [],
    selectedPeriod: null,
    filters: {
      status: '',
      type: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    }
  });

  /**
   * 📋 CARGAR HISTORIAL DE PERÍODOS
   */
  const loadHistory = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const periods = await HistoryServiceAleluya.getHistoryPeriods();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        periods
      }));

    } catch (error) {
      console.error('Error cargando historial:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error cargando historial",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * 👁️ VER DETALLE DE PERÍODO
   */
  const viewPeriodDetail = useCallback(async (periodId: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      const detail = await HistoryServiceAleluya.getPeriodDetail(periodId);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        selectedPeriod: detail
      }));

    } catch (error) {
      console.error('Error cargando detalle:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error cargando detalle",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * ✏️ EDITAR PERÍODO (REAPERTURA PROFESIONAL)
   */
  const editPeriod = useCallback(async (
    periodId: string,
    changes: {
      reason: string;
      employeeChanges?: Array<{
        employeeId: string;
        newSalary?: number;
        newDeductions?: number;
      }>;
    }
  ) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      const result = await HistoryServiceAleluya.editPeriod(periodId, changes);
      
      setState(prev => ({ ...prev, isProcessing: false }));

      if (result.success) {
        toast({
          title: "✅ Período Editado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });

        // Recargar historial
        await loadHistory();
      }

    } catch (error) {
      console.error('Error editando período:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error editando período",
        variant: "destructive"
      });
    }
  }, [toast, loadHistory]);

  /**
   * 📄 GENERAR COMPROBANTES
   */
  const generateVouchers = useCallback(async (periodId: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      const result = await HistoryServiceAleluya.generateVouchers(periodId);
      
      setState(prev => ({ ...prev, isProcessing: false }));

      if (result.success) {
        toast({
          title: "✅ Comprobantes Generados",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
      }

    } catch (error) {
      console.error('Error generando comprobantes:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error generando comprobantes",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * 📅 CREAR PERÍODO PASADO
   */
  const createPastPeriod = useCallback(async (periodData: {
    periodName: string;
    startDate: string;
    endDate: string;
    type: 'quincenal' | 'mensual' | 'semanal';
    employees: Array<{
      employeeId: string;
      baseSalary: number;
      grossPay: number;
      deductions: number;
      netPay: number;
    }>;
  }) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      const result = await HistoryServiceAleluya.createPastPeriod(periodData);
      
      setState(prev => ({ ...prev, isProcessing: false }));

      if (result.success) {
        toast({
          title: "✅ Período Pasado Creado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });

        // Recargar historial
        await loadHistory();
      }

    } catch (error) {
      console.error('Error creando período pasado:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error creando período pasado",
        variant: "destructive"
      });
    }
  }, [toast, loadHistory]);

  /**
   * 🔍 FILTROS
   */
  const updateFilters = useCallback((newFilters: Partial<typeof state.filters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {
        status: '',
        type: '',
        search: '',
        dateFrom: '',
        dateTo: ''
      }
    }));
  }, []);

  // Filtrar períodos
  const filteredPeriods = state.periods.filter(period => {
    if (state.filters.status && period.status !== state.filters.status) return false;
    if (state.filters.type && period.type !== state.filters.type) return false;
    if (state.filters.search && !period.period.toLowerCase().includes(state.filters.search.toLowerCase())) return false;
    if (state.filters.dateFrom && period.startDate < state.filters.dateFrom) return false;
    if (state.filters.dateTo && period.endDate > state.filters.dateTo) return false;
    return true;
  });

  // Inicializar al montar
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    // Estados
    ...state,
    filteredPeriods,
    
    // Acciones principales
    loadHistory,
    viewPeriodDetail,
    editPeriod,
    generateVouchers,
    createPastPeriod,
    
    // Filtros
    updateFilters,
    clearFilters,
    
    // Estados calculados
    totalPeriods: state.periods.length,
    filteredCount: filteredPeriods.length,
    closedPeriods: state.periods.filter(p => p.status === 'cerrado').length,
    draftPeriods: state.periods.filter(p => p.status === 'borrador').length,
    hasData: state.periods.length > 0
  };
};
