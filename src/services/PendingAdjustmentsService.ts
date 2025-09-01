import { supabase } from '@/integrations/supabase/client';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PendingNovedad } from '@/types/pending-adjustments';

export interface PendingAdjustmentRecord {
  id: string;
  company_id: string;
  period_id: string;
  employee_id: string;
  employee_name: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  dias?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  observacion?: string;
  novedad_data: any; // Use any for database JSON compatibility
  created_at: string;
  updated_at: string;
}

export class PendingAdjustmentsService {
  // Save a pending adjustment to the database
  static async savePendingAdjustment(adjustment: PendingNovedad): Promise<PendingAdjustmentRecord | null> {
    try {
      const { data, error } = await supabase
        .from('pending_payroll_adjustments')
        .insert({
          period_id: adjustment.novedadData.periodo_id,
          employee_id: adjustment.employee_id,
          employee_name: adjustment.employee_name,
          tipo_novedad: adjustment.tipo_novedad,
          subtipo: adjustment.novedadData.subtipo,
          valor: adjustment.valor,
          dias: adjustment.novedadData.dias,
          fecha_inicio: adjustment.novedadData.fecha_inicio,
          fecha_fin: adjustment.novedadData.fecha_fin,
          observacion: adjustment.observacion,
          novedad_data: adjustment.novedadData as any,
          company_id: adjustment.novedadData.company_id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving pending adjustment:', error);
        throw error;
      }

      console.log('✅ Pending adjustment saved:', data);
      return data;
    } catch (error) {
      console.error('❌ PendingAdjustmentsService.savePendingAdjustment error:', error);
      throw error;
    }
  }

  // Get all pending adjustments for a period
  static async getPendingAdjustmentsForPeriod(periodId: string): Promise<PendingAdjustmentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('pending_payroll_adjustments')
        .select('*')
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting pending adjustments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ PendingAdjustmentsService.getPendingAdjustmentsForPeriod error:', error);
      return [];
    }
  }

  // Get pending adjustments for a specific employee in a period
  static async getPendingAdjustmentsForEmployee(employeeId: string, periodId: string): Promise<PendingAdjustmentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('pending_payroll_adjustments')
        .select('*')
        .eq('period_id', periodId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting employee pending adjustments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ PendingAdjustmentsService.getPendingAdjustmentsForEmployee error:', error);
      return [];
    }
  }

  // Delete a pending adjustment
  static async deletePendingAdjustment(adjustmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_payroll_adjustments')
        .delete()
        .eq('id', adjustmentId);

      if (error) {
        console.error('❌ Error deleting pending adjustment:', error);
        throw error;
      }

      console.log('✅ Pending adjustment deleted:', adjustmentId);
    } catch (error) {
      console.error('❌ PendingAdjustmentsService.deletePendingAdjustment error:', error);
      throw error;
    }
  }

  // Clear all pending adjustments for a period (used after applying them)
  static async clearPendingAdjustmentsForPeriod(periodId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_payroll_adjustments')
        .delete()
        .eq('period_id', periodId);

      if (error) {
        console.error('❌ Error clearing pending adjustments:', error);
        throw error;
      }

      console.log('✅ All pending adjustments cleared for period:', periodId);
    } catch (error) {
      console.error('❌ PendingAdjustmentsService.clearPendingAdjustmentsForPeriod error:', error);
      throw error;
    }
  }

  // Convert database record to PendingNovedad format
  static toPendingNovedad(record: PendingAdjustmentRecord): PendingNovedad {
    return {
      employee_id: record.employee_id,
      employee_name: record.employee_name,
      tipo_novedad: record.tipo_novedad,
      valor: record.valor,
      observacion: record.observacion,
      novedadData: record.novedad_data as CreateNovedadData
    };
  }
}