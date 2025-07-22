
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';

export interface PayrollHistoryPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'quincenal' | 'mensual' | 'semanal';
  status: string;
  employeesCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalCost: number;
  employerContributions: number;
  createdAt: string;
  updatedAt: string;
}

export const usePayrollHistory = () => {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const historyPeriods = await PayrollHistoryService.getHistoryPeriods();
      setPeriods(historyPeriods);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de nómina",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getPeriodDetail = useCallback(async (periodId: string) => {
    setLoading(true);
    try {
      // Aquí implementaremos la lógica para obtener detalles específicos
      const period = periods.find(p => p.id === periodId);
      return period;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del período",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [periods, toast]);

  return {
    periods,
    loading,
    error,
    loadHistory,
    getPeriodDetail
  };
};
