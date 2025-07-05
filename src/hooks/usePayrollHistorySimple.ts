
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PayrollHistorySimpleService } from '@/services/PayrollHistorySimpleService';
import { PayrollHistoryFilters } from '@/types/payroll-history';

/**
 * ✅ HOOK SIMPLE DE HISTORIAL - REPARACIÓN CRÍTICA COMPLETADA
 * Ahora usa arquitectura unificada y datos reales sincronizados
 */
export const usePayrollHistorySimple = () => {
  const [filters, setFilters] = useState<PayrollHistoryFilters>({
    dateRange: {},
    status: '',
    periodType: undefined,
    employeeSearch: ''
  });

  // ✅ CORRECCIÓN CRÍTICA: Usar servicio reparado
  const {
    data: periods = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payroll-history-unified-real'],
    queryFn: PayrollHistorySimpleService.getHistoryPeriods,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });

  // ✅ FILTRADO MEJORADO CON ARQUITECTURA UNIFICADA
  const filteredPeriods = periods.filter(period => {
    // Filtro por estado normalizado
    if (filters.status) {
      const statusMap = {
        'borrador': 'borrador',
        'active': 'active', 
        'cerrado': 'cerrado'
      };
      
      if (period.status !== statusMap[filters.status as keyof typeof statusMap]) {
        return false;
      }
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

    // Filtro por búsqueda
    if (filters.employeeSearch && filters.employeeSearch.trim()) {
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

  // ✅ MÉTRICAS CORREGIDAS
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
    // Métricas corregidas
    totalPeriods,
    filteredCount,
    closedPeriods,
    draftPeriods
  };
};
