
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PayrollHistorySimpleService } from '@/services/PayrollHistorySimpleService';
import { PayrollHistoryPeriod, PayrollHistoryFilters } from '@/types/payroll-history';

/**
 * ✅ HOOK SIMPLE DE HISTORIAL - FASE 2 REPARACIÓN CRÍTICA
 * Conecta con el servicio sincronizado y funciona con datos reales
 */
export const usePayrollHistorySimple = () => {
  const [filters, setFilters] = useState<PayrollHistoryFilters>({
    dateRange: {},
    status: '',
    periodType: undefined,
    employeeSearch: ''
  });

  // ✅ CORRECCIÓN CRÍTICA: Usar el servicio real sincronizado
  const {
    data: periods = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payroll-history-simple-real'],
    queryFn: PayrollHistorySimpleService.getHistoryPeriods,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });

  // ✅ FILTRADO INTELIGENTE CON DATOS REALES
  const filteredPeriods = periods.filter(period => {
    // Filtro por estado
    if (filters.status && period.status !== filters.status) {
      return false;
    }

    // Filtro por tipo de período
    if (filters.periodType && period.type !== filters.periodType) {
      return false;
    }

    // Filtro por rango de fechas - desde
    if (filters.dateRange.from) {
      const periodDate = new Date(period.startDate);
      const fromDate = new Date(filters.dateRange.from);
      if (periodDate < fromDate) {
        return false;
      }
    }

    // Filtro por rango de fechas - hasta
    if (filters.dateRange.to) {
      const periodDate = new Date(period.endDate);
      const toDate = new Date(filters.dateRange.to);
      if (periodDate > toDate) {
        return false;
      }
    }

    // Filtro por búsqueda de empleados (placeholder - se implementará en detalle)
    if (filters.employeeSearch && filters.employeeSearch.trim()) {
      // Por ahora solo filtramos por nombre del período
      const search = filters.employeeSearch.toLowerCase();
      if (!period.period.toLowerCase().includes(search)) {
        return false;
      }
    }

    return true;
  });

  const updateFilters = (newFilters: Partial<PayrollHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      dateRange: {},
      status: '',
      periodType: undefined,
      employeeSearch: ''
    });
  };

  // ✅ MÉTRICAS ÚTILES
  const totalPeriods = periods.length;
  const filteredCount = filteredPeriods.length;
  const closedPeriods = periods.filter(p => p.status === 'cerrado').length;
  const draftPeriods = periods.filter(p => p.status === 'borrador').length;

  return {
    periods: filteredPeriods,
    allPeriods: periods,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch,
    // Métricas
    totalPeriods,
    filteredCount,
    closedPeriods,
    draftPeriods
  };
};
