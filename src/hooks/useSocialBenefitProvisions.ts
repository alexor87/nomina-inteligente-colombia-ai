
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { useToast } from '@/hooks/use-toast';
import { ProvisionsService } from '@/services/ProvisionsService';
import type { BenefitType } from '@/types/social-benefits';

// Export types that components expect
export interface PeriodOption {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  tipo_periodo: string;
}

export interface ProvisionRecord {
  id: string;
  company_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  benefit_type: BenefitType;
  amount: number;
  estado: string;
  employee_name: string;
  employee_cedula: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  calculation_basis?: any;
  calculated_values?: any;
  employee?: {
    nombre: string;
    apellido: string;
    cedula: string;
  };
}

export interface ProvisionTotals {
  count: number;
  total: number;
  byType: {
    cesantias: number;
    intereses_cesantias: number;
    prima: number;
    vacaciones: number;
  };
}

interface Filters {
  periodId: string;
  benefitType: BenefitType | 'all';
  search: string;
}

export const useSocialBenefitProvisions = () => {
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<Filters>({
    periodId: '',
    benefitType: 'all',
    search: ''
  });
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [recalculating, setRecalculating] = useState(false);
  
  // ✅ NUEVO: Guard para auto-healing (evitar loops)
  const [autoHealingAttempted, setAutoHealingAttempted] = useState<Set<string>>(new Set());

  // Load periods
  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['payroll-periods', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin, estado, tipo_periodo')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });
        
      if (error) throw error;
      return data as PeriodOption[];
    },
    enabled: !!companyId
  });

  // Load provisions
  const { data: provisions = [], isLoading: loadingProvisions, refetch } = useQuery({
    queryKey: ['social-benefit-provisions', companyId, filters.periodId, filters.benefitType, filters.search],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('social_benefit_calculations')
        .select(`
          id,
          company_id,
          employee_id,
          benefit_type,
          amount,
          period_start,
          period_end,
          estado,
          created_at,
          updated_at,
          notes,
          calculation_basis,
          calculated_values,
          employee:employees(nombre, apellido, cedula)
        `)
        .eq('company_id', companyId);

      if (filters.periodId) {
        const selectedPeriod = periods.find(p => p.id === filters.periodId);
        if (selectedPeriod) {
          query = query
            .eq('period_start', selectedPeriod.fecha_inicio)
            .eq('period_end', selectedPeriod.fecha_fin);
        }
      }

      if (filters.benefitType && filters.benefitType !== 'all') {
        query = query.eq('benefit_type', filters.benefitType);
      }

      if (filters.search) {
        // Search by employee name or cedula
        query = query.or(`employee.nombre.ilike.%${filters.search}%,employee.apellido.ilike.%${filters.search}%,employee.cedula.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('period_start', { ascending: false });
      
      if (error) throw error;
      
      // Transform to expected format
      return (data || []).map(item => ({
        id: item.id,
        company_id: item.company_id,
        employee_id: item.employee_id,
        period_start: item.period_start,
        period_end: item.period_end,
        benefit_type: item.benefit_type,
        amount: item.amount,
        estado: item.estado,
        created_at: item.created_at,
        updated_at: item.updated_at,
        notes: item.notes,
        calculation_basis: item.calculation_basis,
        calculated_values: item.calculated_values,
        employee_name: item.employee ? `${item.employee.nombre} ${item.employee.apellido}` : '',
        employee_cedula: item.employee?.cedula || '',
        employee: item.employee
      })) as ProvisionRecord[];
    },
    enabled: !!companyId
  });

  // ✅ NUEVO: Auto-healing effect - detectar períodos cerrados sin provisiones
  useEffect(() => {
    if (!companyId || !periods.length || loadingProvisions) return;

    const performAutoHealing = async () => {
      for (const period of periods) {
        // Solo procesar períodos cerrados que no hayan sido intentados
        if (period.estado !== 'cerrado' || autoHealingAttempted.has(period.id)) {
          continue;
        }

        // Verificar si este período tiene provisiones
        const periodProvisions = provisions.filter(p => 
          p.period_start === period.fecha_inicio && 
          p.period_end === period.fecha_fin
        );

        if (periodProvisions.length > 0) {
          continue; // Ya tiene provisiones
        }

        // Verificar si tiene payrolls procesados
        const { data: payrolls, error: payrollError } = await supabase
          .from('payrolls')
          .select('id')
          .eq('company_id', companyId)
          .eq('period_id', period.id);

        if (payrollError) {
          console.error('❌ Error verificando payrolls para auto-healing:', payrollError);
          continue;
        }

        if (!payrolls || payrolls.length === 0) {
          continue; // No hay payrolls, no es problema
        }

        // Período cerrado + con payrolls + sin provisiones = necesita auto-healing
        console.log('🔧 Auto-healing detectado para período:', period.periodo);
        
        // Marcar como intentado para evitar loops
        setAutoHealingAttempted(prev => new Set(prev).add(period.id));

        try {
          const { data: provisionResp, error: provisionErr } = await supabase.functions.invoke('provision-social-benefits', {
            body: { period_id: period.id }
          });

          if (provisionErr) {
            console.error('❌ Error en auto-healing:', provisionErr);
            continue;
          }

          console.log('✅ Auto-healing exitoso para período:', period.periodo, provisionResp);
          
          // Refetch silencioso
          queryClient.invalidateQueries({ queryKey: ['social-benefit-provisions'] });
          
          // Toast discreto
          const count = provisionResp?.count || 0;
          if (count > 0) {
            toast({
              title: "Provisiones restauradas",
              description: `Se registraron automáticamente ${count} provisiones para el período ${period.periodo}.`,
              className: "border-green-200 bg-green-50"
            });
          }
        } catch (error) {
          console.error('❌ Error inesperado en auto-healing:', error);
        }
      }
    };

    // Ejecutar auto-healing después de un pequeño delay para evitar múltiples ejecuciones
    const timer = setTimeout(performAutoHealing, 1000);
    return () => clearTimeout(timer);
  }, [companyId, periods, provisions, loadingProvisions, autoHealingAttempted, toast, queryClient]);

  const totals: ProvisionTotals = useMemo(() => {
    if (!provisions.length) return {
      count: 0,
      total: 0,
      byType: {
        cesantias: 0,
        intereses_cesantias: 0,
        prima: 0,
        vacaciones: 0
      }
    };

    const byType = provisions.reduce((acc, provision) => {
      const amount = Number(provision.amount) || 0;
      acc[provision.benefit_type as keyof typeof acc] = (acc[provision.benefit_type as keyof typeof acc] || 0) + amount;
      return acc;
    }, {
      cesantias: 0,
      intereses_cesantias: 0,
      prima: 0,
      vacaciones: 0
    });

    const total = Object.values(byType).reduce((sum, val) => sum + val, 0);

    return {
      count: provisions.length,
      total,
      byType
    };
  }, [provisions]);

  const totalPages = Math.ceil(provisions.length / pageSize);
  const paginated = provisions.slice((page - 1) * pageSize, page * pageSize);

  const setPeriodId = useCallback((periodId: string) => {
    setFilters(prev => ({ ...prev, periodId }));
    setPage(1);
  }, []);

  const setBenefitType = useCallback((benefitType: BenefitType | 'all') => {
    setFilters(prev => ({ ...prev, benefitType }));
    setPage(1);
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setPage(1);
  }, []);

  const recalculateCurrentPeriod = useCallback(async () => {
    if (!filters.periodId || recalculating) return;

    try {
      setRecalculating(true);
      await ProvisionsService.recalculateProvisions(filters.periodId);
      await refetch();
      toast({
        title: "Provisiones recalculadas",
        description: "Las provisiones han sido recalculadas exitosamente."
      });
    } catch (error) {
      console.error('Error recalculando provisiones:', error);
      toast({
        title: "Error",
        description: "No se pudieron recalcular las provisiones.",
        variant: "destructive"
      });
    } finally {
      setRecalculating(false);
    }
  }, [filters.periodId, recalculating, refetch, toast]);

  const exportCSV = useCallback(() => {
    if (!provisions.length) return;

    const csvData = provisions.map(provision => ({
      Empleado: provision.employee_name,
      Cedula: provision.employee_cedula,
      'Tipo de Prestación': provision.benefit_type,
      Valor: provision.amount,
      'Período Inicio': provision.period_start,
      'Período Fin': provision.period_end,
      Estado: provision.estado
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `provisiones-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [provisions]);

  return {
    periods,
    loadingPeriods,
    provisions,
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
    refetch
  };
};
