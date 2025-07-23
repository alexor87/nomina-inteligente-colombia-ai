import { supabase } from '@/integrations/supabase/client';

export class PayrollReopenService {
  static async reopenPayrollPeriod(periodId: string): Promise<void> {
    try {
      console.log(`🔄 Reabriendo período de nómina con ID: ${periodId}`);

      // Paso 1: Validar que el período exista y esté cerrado
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('estado', 'cerrado')
        .single();

      if (periodError) {
        console.error('Error al buscar el período:', periodError);
        throw new Error('Error al buscar el período de nómina.');
      }

      if (!period) {
        throw new Error('El período de nómina no existe o no está cerrado.');
      }

      // Paso 2: Cambiar el estado del período a 'borrador'
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({ estado: 'borrador' })
        .eq('id', periodId);

      if (updateError) {
        console.error('Error al actualizar el estado del período:', updateError);
        throw new Error('No se pudo cambiar el estado del período a "borrador".');
      }

      // Paso 3: Revertir el estado de los payrolls asociados a 'borrador'
      const { error: payrollUpdateError } = await supabase
        .from('payrolls')
        .update({ estado: 'pendiente' })
        .eq('period_id', periodId);

      if (payrollUpdateError) {
        console.error('Error al actualizar el estado de los payrolls:', payrollUpdateError);
        throw new Error('No se pudo cambiar el estado de los payrolls a "pendiente".');
      }

      console.log(`✅ Período de nómina con ID ${periodId} reabierto exitosamente.`);
    } catch (error: any) {
      console.error('Error al reabrir el período de nómina:', error);
      throw new Error(error.message || 'Error al reabrir el período de nómina.');
    }
  }
}
