import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StalePayroll {
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  period_id: string;
  periodo: string;
  is_stale: boolean;
  updated_at: string;
}

export const useStalePayrollSync = () => {
  const [stalePayrolls, setStalePayrolls] = useState<StalePayroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const getStalePayrolls = async (companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'recalculate-stale-payrolls',
        {
          body: {
            action: 'get_stale_payrolls',
            data: { company_id: companyId }
          }
        }
      );

      if (error) {
        console.error('Error fetching stale payrolls:', error);
        toast.error('Error al obtener registros pendientes de sincronización');
        return;
      }

      setStalePayrolls(data.stale_payrolls || []);
    } catch (error) {
      console.error('Error fetching stale payrolls:', error);
      toast.error('Error al obtener registros pendientes de sincronización');
    } finally {
      setLoading(false);
    }
  };

  const syncStalePayrolls = async (companyId: string, periodId?: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'recalculate-stale-payrolls',
        {
          body: {
            action: 'recalculate_stale_payrolls',
            data: { 
              company_id: companyId,
              ...(periodId && { period_id: periodId })
            }
          }
        }
      );

      if (error) {
        console.error('Error syncing stale payrolls:', error);
        toast.error('Error al sincronizar los registros de nómina');
        return;
      }

      toast.success(
        `✅ ${data.message || 'Sincronización completada'}${
          data.errors?.length ? ` (${data.errors.length} errores)` : ''
        }`
      );

      // Refresh stale payrolls list
      await getStalePayrolls(companyId);

    } catch (error) {
      console.error('Error syncing stale payrolls:', error);
      toast.error('Error al sincronizar los registros de nómina');
    } finally {
      setSyncing(false);
    }
  };

  const autoSyncStalePayrolls = async (companyId: string, periodId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'recalculate-stale-payrolls',
        {
          body: {
            action: 'recalculate_stale_payrolls',
            data: { 
              company_id: companyId,
              ...(periodId && { period_id: periodId })
            }
          }
        }
      );

      if (error) {
        console.error('Error en auto-sincronización:', error);
        return false;
      }

      // Solo actualizar la lista silenciosamente, sin toasts
      await getStalePayrolls(companyId);
      return true;
      
    } catch (error) {
      console.error('Error en auto-sincronización:', error);
      return false;
    }
  };

  return {
    stalePayrolls,
    loading,
    syncing,
    getStalePayrolls,
    syncStalePayrolls,
    autoSyncStalePayrolls
  };
};