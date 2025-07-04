
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PayrollHistorySimpleService } from '@/services/PayrollHistorySimpleService';
import { PayrollHistoryPeriod, PayrollHistoryFilters } from '@/types/payroll-history';

/**
 * ✅ HOOK SIMPLE DE HISTORIAL - CORRECCIÓN FASE 1
 * Funciona con datos existentes sin complejidad innecesaria
 */
export const usePayrollHistorySimple = () => {
  const [filters, setFilters] = useState<PayrollHistoryFilters>({
    dateRange: {},
    status: '',
    periodType: undefined,
    employeeSearch: ''
  });

  // Obtener períodos de historial
  const {
    data: periods = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payroll-history-simple'],
    queryFn: PayrollHistorySimpleService.getHistoryPeriods,
    refetchOnWindowFocus: false
  });

  // Filtrar períodos según los filtros aplicados
  const filteredPeriods = periods.filter(period => {
    // Filtro por estado
    if (filters.status && period.status !== filters.status) {
      return false;
    }

    // Filtro por tipo de período
    if (filters.periodType && period.type !== filters.periodType) {
      return false;
    }

    // Filtro por rango de fechas
    if (filters.dateRange.from) {
      const periodDate = new Date(period.startDate);
      const fromDate = new Date(filters.dateRange.from);
      if (periodDate < fromDate) {
        return false;
      }
    }

    if (filters.dateRange.to) {
      const periodDate = new Date(period.endDate);
      const toDate = new Date(filters.dateRange.to);
      if (periodDate > toDate) {
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

  return {
    periods: filteredPeriods,
    allPeriods: periods,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch
  };
};
