import { supabase } from '@/integrations/supabase/client';
import { AdjustmentData } from '@/components/payroll/corrections/ClosedPeriodAdjustmentModal';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { NovedadType } from '@/types/novedades-enhanced';

export interface PeriodCorrectionRecord {
  id: string;
  company_id: string;
  period_id: string;
  employee_id: string;
  correction_type: 'correctivo' | 'compensatorio';
  concept: string;
  previous_value?: number;
  new_value?: number;
  value_difference: number;
  justification: string;
  affected_novedad_id?: string;
  created_by: string;
  created_at: string;
}

export class ClosedPeriodAdjustmentService {
  /**
   * Handles adjustments to closed payroll periods
   */
  static async processAdjustment(
    periodId: string,
    employeeId: string,
    adjustmentData: AdjustmentData
  ): Promise<{ success: boolean; message: string; correctionId?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Get current user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      const companyId = profile.company_id;

      if (adjustmentData.adjustmentType === 'correctivo') {
        return await this.processCorrectiveAdjustment(
          companyId,
          periodId,
          employeeId,
          adjustmentData,
          user.id
        );
      } else {
        return await this.processCompensatoryAdjustment(
          companyId,
          employeeId,
          adjustmentData,
          user.id
        );
      }
    } catch (error) {
      console.error('Error processing adjustment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error procesando ajuste'
      };
    }
  }

  /**
   * Process corrective adjustment - modifies the closed period
   */
  private static async processCorrectiveAdjustment(
    companyId: string,
    periodId: string,
    employeeId: string,
    adjustmentData: AdjustmentData,
    userId: string
  ): Promise<{ success: boolean; message: string; correctionId?: string }> {
    // Create novedad in the closed period
    const novedad = await NovedadesEnhancedService.createNovedad({
      empleado_id: employeeId,
      periodo_id: periodId,
      company_id: companyId,
      tipo_novedad: adjustmentData.amount > 0 ? 'bonificacion' : ('descuento_voluntario' as NovedadType),
      subtipo: adjustmentData.amount > 0 ? undefined : 'especial',
      valor: Math.abs(adjustmentData.amount),
      observacion: `AJUSTE CORRECTIVO: ${adjustmentData.justification}`,
      constitutivo_salario: false
    });

    if (!novedad) {
      throw new Error('Error creando novedad correctiva');
    }

    // Record the correction in audit table
    const { data: correction, error: correctionError } = await supabase
      .from('payroll_period_corrections')
      .insert({
        company_id: companyId,
        period_id: periodId,
        employee_id: employeeId,
        correction_type: 'correctivo',
        concept: adjustmentData.concept,
        new_value: adjustmentData.amount,
        value_difference: adjustmentData.amount,
        justification: adjustmentData.justification,
        affected_novedad_id: novedad.id,
        created_by: userId
      })
      .select()
      .single();

    if (correctionError) {
      throw new Error('Error registrando corrección en auditoría');
    }

    // TODO: Mark existing vouchers for regeneration
    // This would be implemented based on voucher system requirements

    return {
      success: true,
      message: `Ajuste correctivo aplicado al período cerrado. Se ha registrado la corrección con ID: ${correction.id}`,
      correctionId: correction.id
    };
  }

  /**
   * Process compensatory adjustment - applies to next active period
   */
  private static async processCompensatoryAdjustment(
    companyId: string,
    employeeId: string,
    adjustmentData: AdjustmentData,
    userId: string
  ): Promise<{ success: boolean; message: string; correctionId?: string }> {
    // Find next active period
    const { data: activePeriod } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .in('estado', ['borrador', 'en_proceso'])
      .order('fecha_inicio', { ascending: true })
      .limit(1)
      .single();

    if (!activePeriod) {
      throw new Error('No hay períodos activos disponibles para aplicar el ajuste compensatorio');
    }

    // Create novedad in the active period
    const novedad2 = await NovedadesEnhancedService.createNovedad({
      empleado_id: employeeId,
      periodo_id: activePeriod.id,
      company_id: companyId,
      tipo_novedad: adjustmentData.amount > 0 ? 'bonificacion' : ('descuento_voluntario' as NovedadType),
      subtipo: adjustmentData.amount > 0 ? undefined : 'especial',
      valor: Math.abs(adjustmentData.amount),
      observacion: `AJUSTE COMPENSATORIO: ${adjustmentData.concept}. ${adjustmentData.justification || 'Aplicado en período activo'}`,
      constitutivo_salario: false
    });

    if (!novedad2) {
      throw new Error('Error creando novedad compensatoria');
    }

    // Record the correction in audit table
    const { data: correction, error: correctionError } = await supabase
      .from('payroll_period_corrections')
      .insert({
        company_id: companyId,
        period_id: activePeriod.id, // Note: period_id is the target period, not the original
        employee_id: employeeId,
        correction_type: 'compensatorio',
        concept: adjustmentData.concept,
        new_value: adjustmentData.amount,
        value_difference: adjustmentData.amount,
        justification: adjustmentData.justification || `Ajuste compensatorio aplicado en ${activePeriod.periodo}`,
        affected_novedad_id: novedad2.id,
        created_by: userId
      })
      .select()
      .single();

    if (correctionError) {
      throw new Error('Error registrando corrección en auditoría');
    }

    return {
      success: true,
      message: `Ajuste compensatorio aplicado en el período activo: ${activePeriod.periodo}`,
      correctionId: correction.id
    };
  }

  /**
   * Get correction history for a period
   */
  static async getCorrectionHistory(periodId: string): Promise<PeriodCorrectionRecord[]> {
    const { data, error } = await supabase
      .from('payroll_period_corrections')
      .select('*')
      .eq('period_id', periodId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching correction history:', error);
      return [];
    }

    return (data || []) as PeriodCorrectionRecord[];
  }

  /**
   * Check if a period is closed
   */
  static async isPeriodClosed(periodId: string): Promise<boolean> {
    const { data } = await supabase
      .from('payroll_periods_real')
      .select('estado')
      .eq('id', periodId)
      .single();

    return data?.estado === 'cerrado';
  }
}