
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeService } from '@/services/RealtimeService';
import { useToast } from '@/hooks/use-toast';
import { ProvisionsService } from '@/services/ProvisionsService';
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

  // Load available periods
  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['provisions-periods'],
    queryFn: ProvisionsService.fetchPeriods,
  });

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
        description: 'No se pudieron cargar las provisiones. Verifique que el período tenga datos.',
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
    const byType = {
      cesantias: sum(list.filter((r) => r.benefit_type === 'cesantias')),
      intereses_cesantias: sum(list.filter((r) => r.benefit_type === 'intereses_cesantias')),
      prima: sum(list.filter((r) => r.benefit_type === 'prima')),
    };
    return {
      count: list.length,
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
        description: `Se registraron ${data.count || 0} provisiones del período seleccionado.`,
      });
      refetch();
    } catch (e: any) {
      console.error('❌ Error recalculando provisiones:', e);
      toast({
        title: 'Error al recalcular',
        description: e?.message || 'No fue posible recalcular las provisiones',
        variant: 'destructive',
      });
    } finally {
      setRecalculating(false);
    }
  }, [filters.periodId, refetch, toast]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const list = provisions || [];
    if (list.length === 0) {
      toast({
        title: 'Sin datos para exportar',
        description: 'No hay registros de provisiones para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'period_name',
      'employee_name',
      'employee_cedula',
      'benefit_type',
      'days_count',
      'base_salary',
      'variable_average',
      'transport_allowance',
      'other_included',
      'provision_amount',
      'calculation_method',
      'source',
    ];

    const rows = list.map((r) => ([
      r.period_name,
      r.employee_name,
      r.employee_cedula ?? '',
      r.benefit_type,
      r.days_count,
      r.base_salary,
      r.variable_average,
      r.transport_allowance,
      r.other_included,
      r.provision_amount,
      r.calculation_method ?? '',
      r.source ?? '',
    ]));

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provisiones_${filters.periodId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [provisions, filters.periodId, toast]);

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
    exportCSV,
    refetch,
  };
};

// Export types for use in components
export type { ProvisionRecord, PeriodOption };
