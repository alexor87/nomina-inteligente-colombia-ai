import { supabase } from '@/integrations/supabase/client';
import { PendingNovedad } from '@/types/pending-adjustments';

// Interface for the data required to apply adjustments with re-liquidation
interface PendingAdjustmentData {
  periodId: string;
  periodo: string;
  companyId: string;
  employeeGroups: {
    employeeId: string;
    employeeName: string;
    novedades: PendingNovedad[];
  }[];
  justification: string;
}

// Interface for the result of applying adjustments with re-liquidation
interface AdjustmentResult {
  success: boolean;
  message: string;
  employeesAffected?: number;
  adjustmentsApplied?: number;
  correctionsApplied?: number;
  vouchersRegenerated?: number;
  periodReopened?: boolean;
}

export class PendingNovedadesService {
  
  /**
   * Apply pending adjustments including deletions and creations
   */
  static async applyPendingAdjustments(data: PendingAdjustmentData): Promise<AdjustmentResult> {
    try {
      console.log('🔄 Applying pending adjustments with full re-liquidation...', {
        period: data.periodo,
        employees: data.employeeGroups.length,
        totalAdjustments: data.employeeGroups.reduce((sum, group) => sum + group.novedades.length, 0)
      });

      // Validate company_id
      if (!data.companyId) {
        throw new Error('Company ID is required');
      }

      let adjustmentsApplied = 0;
      let deletionsApplied = 0;

      // First, process deletions and creations
      for (const group of data.employeeGroups) {
        try {
          // Process each adjustment for this employee
          for (const novedad of group.novedades) {
            const novedadData = novedad.novedadData as any;
            
            if (novedadData.action === 'delete') {
              // Handle deletion by removing the original novedad
              if (novedadData.novedad_id) {
                const { error: deleteError } = await supabase
                  .from('payroll_novedades')
                  .delete()
                  .eq('id', novedadData.novedad_id)
                  .eq('company_id', data.companyId);

                if (deleteError) {
                  console.error('Error deleting novedad:', deleteError);
                  continue;
                }
                deletionsApplied++;
              }
            } else {
              // Handle creation (existing logic)
              const { error: novedadError } = await supabase
                .from('payroll_novedades')
                .insert({
                  company_id: data.companyId,
                  empleado_id: novedad.employee_id,
                  periodo_id: data.periodId,
                  tipo_novedad: novedad.novedadData.tipo_novedad as any,
                  subtipo: novedad.novedadData.subtipo,
                  valor: novedad.novedadData.valor || novedad.valor,
                  observacion: `${novedad.novedadData.observacion || novedad.observacion || ''} - Ajuste aplicado: ${data.justification}`.trim(),
                  fecha_inicio: novedad.novedadData.fecha_inicio,
                  fecha_fin: novedad.novedadData.fecha_fin,
                  dias: novedad.novedadData.dias,
                  horas: novedad.novedadData.horas,
                  constitutivo_salario: novedad.novedadData.constitutivo_salario,
                  base_calculo: typeof novedad.novedadData.base_calculo === 'object' 
                    ? JSON.stringify(novedad.novedadData.base_calculo) 
                    : novedad.novedadData.base_calculo,
                  creado_por: (await supabase.auth.getUser()).data.user?.id
                });

              if (novedadError) {
                console.error('Error creating novedad:', novedadError);
                continue;
              }

              adjustmentsApplied++;
            }
          }
        } catch (employeeError) {
          console.error(`Error processing employee ${group.employeeId}:`, employeeError);
        }
      }

      // Now trigger the complete re-liquidation via Edge Function
      const affectedEmployeeIds = data.employeeGroups.map(g => g.employeeId);
      
      const { data: reliquidationResult, error: reliquidationError } = await supabase.functions.invoke(
        'reliquidate-period-adjustments',
        {
          body: {
            periodId: data.periodId,
            affectedEmployeeIds,
            justification: data.justification,
            options: {
              reliquidateScope: 'affected',
              regenerateVouchers: false, // Don't auto-regenerate, just mark as needing regeneration
              sendEmails: false,
              source: 'payroll_history' // Identify this as coming from payroll history module
            }
          }
        }
      );

      if (reliquidationError) {
        console.error('❌ Re-liquidation error:', reliquidationError);
        throw new Error(`Re-liquidation failed: ${reliquidationError.message}`);
      }

      console.log('✅ Re-liquidation completed:', reliquidationResult);

      // 🧹 Clean up applied pending adjustments from the database so they don't reappear on reload
      try {
        if (affectedEmployeeIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('pending_payroll_adjustments')
            .delete()
            .eq('period_id', data.periodId)
            .in('employee_id', affectedEmployeeIds);

          if (deleteError) {
            console.warn('⚠️ Applied successfully but failed to clean pending records:', deleteError);
          } else {
            console.log(`🧹 Cleaned pending adjustments for ${affectedEmployeeIds.length} employee(s) in period ${data.periodo}`);
          }
        }
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup of pending adjustments failed:', cleanupError);
      }

      return {
        success: true,
        message: `Successfully applied ${adjustmentsApplied} adjustments and ${deletionsApplied} deletions, then re-liquidated ${reliquidationResult.employeesAffected} employees`,
        employeesAffected: reliquidationResult.employeesAffected,
        adjustmentsApplied: adjustmentsApplied + deletionsApplied,
        correctionsApplied: reliquidationResult.correctionsApplied,
        vouchersRegenerated: reliquidationResult.vouchersRegenerated,
        periodReopened: reliquidationResult.periodReopened
      };

    } catch (error) {
      console.error('❌ Error applying adjustments:', error);
      return {
        success: false,
        message: `Error applying adjustments: ${error.message}`
      };
    }
  }

  /**
   * Create audit notification for the adjustment
   */
  static async createAdjustmentNotification(
    periodId: string,
    employeeCount: number,
    adjustmentCount: number
  ): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.data.user.id)
        .single();

      if (!profile?.company_id) return;

      await supabase
        .from('user_notifications')
        .insert({
          user_id: user.data.user.id,
          company_id: profile.company_id,
          type: 'period_adjustment',
          title: 'Re-liquidación completada',
          message: `Se aplicaron ${adjustmentCount} ajustes y se reliquidaron ${employeeCount} empleado(s). Los comprobantes han sido marcados para regeneración.`,
          reference_id: periodId
        });

    } catch (error) {
      console.error('Error creating adjustment notification:', error);
    }
  }
}

export type { PendingAdjustmentData, AdjustmentResult };