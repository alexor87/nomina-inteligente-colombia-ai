import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SocialBenefitsLiquidationService, PendingPeriod } from '@/services/SocialBenefitsLiquidationService';

interface UsePendingPeriodsReturn {
  periods: PendingPeriod[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  periodsByType: {
    prima: PendingPeriod[];
    cesantias: PendingPeriod[];
    intereses_cesantias: PendingPeriod[];
  };
  stats: {
    totalPending: number;
    overdueCount: number;
    urgentCount: number;
    totalAmount: number;
  };
}

export function usePendingPeriods(): UsePendingPeriodsReturn {
  const { profile } = useAuth();
  const [periods, setPeriods] = useState<PendingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = profile?.company_id;

  const fetchPeriods = useCallback(async () => {
    if (!companyId) {
      setPeriods([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SocialBenefitsLiquidationService.getPendingPeriods(companyId);

    if (result.success && result.periods) {
      setPeriods(result.periods);
    } else {
      setError(result.error || 'Error cargando períodos');
      setPeriods([]);
    }

    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Agrupar períodos por tipo
  const periodsByType = {
    prima: periods.filter(p => p.benefitType === 'prima'),
    cesantias: periods.filter(p => p.benefitType === 'cesantias'),
    intereses_cesantias: periods.filter(p => p.benefitType === 'intereses_cesantias')
  };

  // Calcular estadísticas
  const stats = {
    totalPending: periods.length,
    overdueCount: periods.filter(p => p.status === 'overdue').length,
    urgentCount: periods.filter(p => p.status === 'urgent').length,
    totalAmount: periods.reduce((sum, p) => sum + p.totalAmount, 0)
  };

  return {
    periods,
    isLoading,
    error,
    refetch: fetchPeriods,
    periodsByType,
    stats
  };
}
