
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeService } from '@/services/RealtimeService';
import { useToast } from '@/hooks/use-toast';
import type { BenefitType } from '@/types/social-benefits';

export type ProvisionRecord = {
  company_id: string;
  period_id: string;
  employee_id: string;
  employee_name: string;
  employee_cedula: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  period_type: string;
  benefit_type: BenefitType;
  base_salary: number;
  variable_average: number;
  transport_allowance: number;
  other_included: number;
  days_count: number;
  provision_amount: number;
  calculation_method: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodOption = {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
};

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

  // Load available periods (company-scoped via RLS)
  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['provisions-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, tipo_periodo')
        .order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return (data || []) as PeriodOption[];
    },
  });

  // Auto-select latest period if not set
  useEffect(() => {
    if (!loadingPeriods && periods && periods.length > 0 && !filters.periodId) {
      setFilters((prev) => ({ ...prev, periodId: periods[0].id }));
    }
  }, [loadingPeriods, periods, filters.periodId]);

  // Load provisions with filters
  const {
    data: provisions,
    isLoading: loadingProvisions,
    refetch,
  } = useQuery({
    queryKey: ['provisions', filters],
    queryFn: async () => {
      if (!filters.periodId) return [] as ProvisionRecord[];

      let query = supabase
        .from('social_benefit_provisions_summary')
        .select('*')
        .eq('period_id', filters.periodId);

      if (filters.benefitType !== 'all') {
        query = query.eq('benefit_type', filters.benefitType);
      }

      if (filters.search && filters.search.trim().length > 0) {
        const s = filters.search.trim();
        query = query.or(`employee_name.ilike.%${s}%,employee_cedula.ilike.%${s}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProvisionRecord[];
    },
    enabled: !!filters.periodId,
  });

  // Subscribe to realtime changes and refetch on events
  useEffect(() => {
    const channel = RealtimeService.subscribeToTable(
      'social_benefit_provisions',
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

  // Recalculate provisions for the selected period via Edge Function
  const [recalculating, setRecalculating] = useState(false);
  const recalculateCurrentPeriod = useCallback(async () => {
    if (!filters.periodId) return;
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-social-benefits', {
        body: { period_id: filters.periodId },
      });
      if (error) throw error;
      console.log('✅ provision-social-benefits result:', data);
      toast({
        title: 'Provisiones recalculadas',
        description: 'Se registraron las provisiones del período seleccionado.',
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

  // Export CSV of current (filtered) list
  const exportCSV = useCallback(() => {
    const list = provisions || [];
    if (list.length === 0) return;

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
        // Basic CSV escaping
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
  }, [provisions, filters.periodId]);

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
