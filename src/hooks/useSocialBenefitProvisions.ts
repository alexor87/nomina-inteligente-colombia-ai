import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeService } from '@/services/RealtimeService';
import { useToast } from '@/hooks/use-toast';
import { ProvisionsService } from '@/services/ProvisionsService';
import { ExcelExportService } from '@/services/ExcelExportService';
import type { BenefitType } from '@/types/social-benefits';
import type { ProvisionRecord, PeriodOption } from '@/services/ProvisionsService';

type Filters = {
  periodId: string | null;
  benefitType: BenefitType | 'all';
  search: string;
};

export const useSocialBenefitProvisions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<Filters>({
    periodId: null,
    benefitType: 'all',
    search: '',
  });

  // Load available periods (only closed ones)
  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['provisions-periods'],
    queryFn: ProvisionsService.fetchPeriods,
  });

  // Show message if no closed periods are available
  useEffect(() => {
    if (!loadingPeriods && periods && periods.length === 0) {
      toast({
        title: 'No hay períodos cerrados',
        description: 'Las provisiones solo se pueden calcular para períodos cerrados/liquidados.',
        variant: 'default',
      });
    }
  }, [loadingPeriods, periods, toast]);

  // Auto-select latest period if not set
  useEffect(() => {
    if (!loadingPeriods && periods && periods.length > 0 && !filters.periodId) {
      setFilters((prev) => ({ ...prev, periodId: periods[0].id }));
    }
  }, [loadingPeriods, periods, filters.periodId]);

  // Load provisions with better error handling
  const {
    data: provisions,
    isLoading: loadingProvisions,
    refetch,
    error: provisionsError,
  } = useQuery({
    queryKey: ['provisions', filters],
    queryFn: async () => {
      if (!filters.periodId) return [] as ProvisionRecord[];
      
      try {
        const result = await ProvisionsService.fetchProvisions(
          filters.periodId,
          filters.benefitType,
          filters.search
        );
        console.log('🔍 Provisions query result:', result.length, 'records');
        return result;
      } catch (error) {
        console.error('❌ Error fetching provisions:', error);
        throw error;
      }
    },
    enabled: !!filters.periodId,
    retry: 1,
  });

  // Show error message if provisions query fails
  useEffect(() => {
    if (provisionsError) {
      console.error('❌ Provisions query error:', provisionsError);
      toast({
        title: 'Error al cargar provisiones',
        description: 'No se pudieron cargar las provisiones. Verifique que el período esté cerrado y tenga datos.',
        variant: 'destructive',
      });
    }
  }, [provisionsError, toast]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = RealtimeService.subscribeToTable(
      'social_benefit_calculations',
      () => {
        console.log('🔄 Realtime provisions event -> refetch');
        queryClient.invalidateQueries({ queryKey: ['provisions'] });
        refetch();
      }
    );
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, refetch]);

  // Totals and breakdowns
  const totals = useMemo(() => {
    const list = provisions || [];
    const sum = (arr: ProvisionRecord[]) => arr.reduce((acc, r) => acc + (r.provision_amount || 0), 0);
    
    // Count unique employees instead of total records
    const uniqueEmployees = new Set(list.map(r => r.employee_cedula)).size;
    
    const byType = {
      cesantias: sum(list.filter((r) => r.benefit_type === 'cesantias')),
      intereses_cesantias: sum(list.filter((r) => r.benefit_type === 'intereses_cesantias')),
      prima: sum(list.filter((r) => r.benefit_type === 'prima')),
      vacaciones: sum(list.filter((r) => r.benefit_type === 'vacaciones')),
    };
    return {
      count: uniqueEmployees,
      total: sum(list),
      byType,
    };
  }, [provisions]);

  // Simple client-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1); // reset page on filters change
  }, [filters]);

  const paginated = useMemo(() => {
    const list = provisions || [];
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [provisions, page, pageSize]);

  const totalPages = useMemo(() => {
    const list = provisions || [];
    return Math.max(1, Math.ceil(list.length / pageSize));
  }, [provisions, pageSize]);

  // Recalculate provisions
  const [recalculating, setRecalculating] = useState(false);
  const recalculateCurrentPeriod = useCallback(async () => {
    if (!filters.periodId) return;
    setRecalculating(true);
    try {
      const data = await ProvisionsService.recalculateProvisions(filters.periodId);
      console.log('✅ provision-social-benefits result:', data);
      toast({
        title: 'Provisiones recalculadas',
        description: `Se registraron ${data.count || 0} provisiones del período cerrado seleccionado.`,
      });
      refetch();
    } catch (e: any) {
      console.error('❌ Error recalculando provisiones:', e);
      const errorMessage = e?.message || 'No fue posible recalcular las provisiones';
      toast({
        title: 'Error al recalcular',
        description: errorMessage.includes('period_not_closed') 
          ? 'Solo se pueden calcular provisiones para períodos cerrados'
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setRecalculating(false);
    }
  }, [filters.periodId, refetch, toast]);

  // Export Excel - NOW EXPORTS ONLY FILTERED DATA
  const exportExcel = useCallback(() => {
    const list = provisions || []; // This already contains filtered data
    if (list.length === 0) {
      toast({
        title: 'Sin datos para exportar',
        description: 'No hay registros de provisiones para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const formattedData = list.map((r) => ({
      'Período': r.period_name,
      'Empleado': r.employee_name,
      'Cédula': r.employee_cedula ?? '',
      'Tipo de Beneficio': r.benefit_type,
      'Días': r.days_count,
      'Salario Base': r.base_salary,
      'Promedio Variable': r.variable_average,
      'Auxilio Transporte / Conectividad': r.transport_allowance,
      'Otros Incluidos': r.other_included,
      'Valor Provisionado': r.provision_amount,
      'Método Cálculo': r.calculation_method ?? '',
      'Origen': r.source ?? '',
    }));

    try {
      ExcelExportService.exportToExcel(
        formattedData,
        `provisiones_${filters.periodId}`,
        'Provisiones'
      );
      
      // Improved success message showing filtered count
      const filterDescription = [];
      if (filters.benefitType !== 'all') {
        filterDescription.push(`tipo: ${filters.benefitType}`);
      }
      if (filters.search.trim()) {
        filterDescription.push(`búsqueda: "${filters.search}"`);
      }
      
      const filterInfo = filterDescription.length > 0 
        ? ` (filtrados por ${filterDescription.join(', ')})` 
        : '';
      
      toast({
        title: 'Exportación exitosa',
        description: `Se exportaron ${list.length} registros de provisiones${filterInfo}.`,
      });
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      toast({
        title: 'Error al exportar',
        description: 'No se pudo exportar el archivo de Excel.',
        variant: 'destructive',
      });
    }
  }, [provisions, filters, toast]);

  const setPeriodId = (periodId: string) => setFilters((prev) => ({ ...prev, periodId }));
  const setBenefitType = (benefitType: BenefitType | 'all') => setFilters((prev) => ({ ...prev, benefitType }));
  const setSearch = (search: string) => setFilters((prev) => ({ ...prev, search }));

  return {
    periods: periods || [],
    loadingPeriods,
    provisions: provisions || [],
    loadingProvisions,
    filters,
    setPeriodId,
    setBenefitType,
    setSearch,
    totals,
    page,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    paginated,
    recalculateCurrentPeriod,
    recalculating,
    exportExcel,
    refetch,
  };
};

// Export types for use in components
export type { ProvisionRecord, PeriodOption };
