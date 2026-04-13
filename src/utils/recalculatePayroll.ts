import { supabase } from '@/integrations/supabase/client';
import { PayrollRecalculationService } from '@/services/PayrollRecalculationService';
import { toast } from 'sonner';
import { getUserFriendlyError } from './errorMessages';
import { useEmployeeNovedadesCacheStore } from '@/stores/employeeNovedadesCacheStore';

export const recalculateCurrentPeriod = async (periodId: string) => {
  try {
    // Get current user's company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profileError || !profile?.company_id) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    console.log('🔄 Iniciando recálculo de nómina para período:', periodId);
    toast.loading('Recalculando valores de nómina...', { id: 'recalc' });

    // Execute IBC recalculation with updated logic
    const result = await PayrollRecalculationService.recalculateIBC(
      periodId, 
      profile.company_id
    );

    if (result.success) {
      toast.success(
        `✅ Recálculo completado: ${result.employees_processed} empleados procesados`, 
        { id: 'recalc', duration: 5000 }
      );
      
      // ✅ REACTIVE: Trigger recalculation via store instead of full page reload
      useEmployeeNovedadesCacheStore.getState().setLastRefreshTime(Date.now());
      console.log('⏰ Recálculo completado, lastRefreshTime actualizado para disparar UI refresh');
    } else {
      throw new Error(result.error || 'Error en recálculo');
    }

  } catch (error: any) {
    console.error('❌ Error en recálculo:', error);
    toast.error(getUserFriendlyError(error), { id: 'recalc' });
  }
};

// Execute immediately for the current period
export const executeRecalculation = () => {
  const periodId = '570c775d-a680-425c-9566-d6e38ae7f729';
  recalculateCurrentPeriod(periodId);
};