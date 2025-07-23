import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryService } from './PayrollHistoryService';

export interface ReopenPeriodRequest {
  periodo: string;
  companyId: string;
  userId: string;
  userEmail: string;
}

export interface ReopenAuditLog {
  periodo: string;
  action: 'reabierto' | 'cerrado_nuevamente';
  previousState: string;
  newState: string;
  hasVouchers: boolean;
  notes?: string;
}

export class PayrollReopenService {
  // Verificar si un usuario tiene permisos para reabrir períodos
  static async canUserReopenPeriods(userId: string, companyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .in('role', ['administrador']);

      if (error) {
        console.error('Error checking user permissions:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in canUserReopenPeriods:', error);
      return false;
    }
  }

  // Verificar si un período puede ser reabierto
  static async canReopenPeriod(periodo: string, companyId: string): Promise<{
    canReopen: boolean;
    reason?: string;
    hasVouchers: boolean;
  }> {
    try {
      // Verificar estado actual del período
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('estado, reportado_dian, editable, reabierto_por')
        .eq('company_id', companyId)
        .eq('periodo', periodo)
        .limit(1);

      if (payrollError) {
        return { canReopen: false, reason: 'Error verificando período', hasVouchers: false };
      }

      if (!payrollData || payrollData.length === 0) {
        return { canReopen: false, reason: 'Período no encontrado', hasVouchers: false };
      }

      const payroll = payrollData[0];

      // No se puede reabrir si ya fue reportado a DIAN
      if (payroll.reportado_dian) {
        return { 
          canReopen: false, 
          reason: 'No se puede reabrir un período ya reportado a DIAN',
          hasVouchers: false
        };
      }

      // Verificar si ya está reabierto
      if (payroll.reabierto_por) {
        return { 
          canReopen: false, 
          reason: 'El período ya está reabierto para edición',
          hasVouchers: false
        };
      }

      // Solo se puede reabrir si está en estado cerrado/procesado/pagado
      const canReopenStates = ['cerrada', 'procesada', 'pagada'];
      if (!canReopenStates.includes(payroll.estado)) {
        return { 
          canReopen: false, 
          reason: 'Solo se pueden reabrir períodos que estén cerrados',
          hasVouchers: false
        };
      }

      // Verificar si tiene comprobantes emitidos
      const { data: vouchersData, error: vouchersError } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .eq('company_id', companyId)
        .eq('periodo', periodo)
        .limit(1);

      if (vouchersError) {
        console.error('Error checking vouchers:', vouchersError);
      }

      const hasVouchers = vouchersData && vouchersData.length > 0;

      return {
        canReopen: true,
        hasVouchers
      };
    } catch (error) {
      console.error('Error in canReopenPeriod:', error);
      return { canReopen: false, reason: 'Error verificando período', hasVouchers: false };
    }
  }

  // Reabrir un período
  static async reopenPeriod(request: ReopenPeriodRequest): Promise<void> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar permisos
      const canReopen = await this.canUserReopenPeriods(request.userId, request.companyId);
      if (!canReopen) {
        throw new Error('No tienes permisos para reabrir períodos');
      }

      // Verificar si se puede reabrir
      const { canReopen: periodCanReopen, reason, hasVouchers } = await this.canReopenPeriod(
        request.periodo, 
        request.companyId
      );

      if (!periodCanReopen) {
        throw new Error(reason || 'No se puede reabrir este período');
      }

      // Actualizar el estado del período en payrolls
      const { error: updatePayrollError } = await supabase
        .from('payrolls')
        .update({
          estado: 'borrador',
          editable: true,
          reabierto_por: request.userId,
          fecha_reapertura: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('company_id', request.companyId)
        .eq('periodo', request.periodo);

      if (updatePayrollError) {
        throw new Error('Error actualizando el período: ' + updatePayrollError.message);
      }

      // Sincronizar con payroll_periods - crear o actualizar período activo
      await this.syncPayrollPeriod(request.periodo, request.companyId, request.userId);

      // Registrar log de auditoría
      await this.createAuditLog(request.companyId, {
        periodo: request.periodo,
        action: 'reabierto',
        previousState: 'cerrado',
        newState: 'reabierto',
        hasVouchers,
        notes: `Período reabierto por ${request.userEmail}`
      });

    } catch (error) {
      console.error('Error reopening period:', error);
      throw error;
    }
  }

  // Sincronizar período reabierto con payroll_periods
  private static async syncPayrollPeriod(periodo: string, companyId: string, userId: string): Promise<void> {
    try {
      // Obtener datos básicos del período desde payrolls
      const { data: payrollData } = await supabase
        .from('payrolls')
        .select('created_at')
        .eq('company_id', companyId)
        .eq('periodo', periodo)
        .limit(1)
        .single();

      if (!payrollData) {
        console.warn('No se encontraron datos del período en payrolls');
        return;
      }

      // Generar fechas basadas en el período (formato típico: "2024-01", "2024-02", etc.)
      const periodDate = new Date(periodo + '-01'); // Asumir primer día del mes
      const startDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
      const endDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

      // Verificar si ya existe un período activo en payroll_periods
      const { data: existingPeriod } = await supabase
        .from('payroll_periods')
        .select('id, estado')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .maybeSingle();

      if (existingPeriod) {
        // Actualizar el período existente
        const { error: updateError } = await supabase
          .from('payroll_periods')
          .update({
            fecha_inicio: startDate.toISOString().split('T')[0],
            fecha_fin: endDate.toISOString().split('T')[0],
            modificado_por: userId,
            modificado_en: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPeriod.id);

        if (updateError) {
          console.error('Error actualizando payroll_period:', updateError);
        }
      } else {
        // Crear nuevo período activo
        const { error: insertError } = await supabase
          .from('payroll_periods')
          .insert({
            company_id: companyId,
            fecha_inicio: startDate.toISOString().split('T')[0],
            fecha_fin: endDate.toISOString().split('T')[0],
            tipo_periodo: 'mensual',
            estado: 'borrador',
            modificado_por: userId
          });

        if (insertError) {
          console.error('Error creando payroll_period:', insertError);
        }
      }

      console.log('Período sincronizado correctamente para edición');
    } catch (error) {
      console.error('Error sincronizando payroll_period:', error);
    }
  }

  // Cerrar nuevamente un período
  static async closePeriodAgain(request: ReopenPeriodRequest): Promise<void> {
    try {
      // Actualizar el estado del período
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          estado: 'cerrada',
          editable: false,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', request.companyId)
        .eq('periodo', request.periodo);

      if (updateError) {
        throw new Error('Error cerrando el período: ' + updateError.message);
      }

      // Registrar log de auditoría
      await this.createAuditLog(request.companyId, {
        periodo: request.periodo,
        action: 'cerrado_nuevamente',
        previousState: 'reabierto',
        newState: 'cerrado',
        hasVouchers: false,
        notes: `Período cerrado nuevamente por ${request.userEmail}`
      });

    } catch (error) {
      console.error('Error closing period again:', error);
      throw new Error('Error al cerrar el período');
    }
  }

  // Crear log de auditoría
  private static async createAuditLog(companyId: string, log: ReopenAuditLog): Promise<void> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', currentUser.user.id)
        .single();

      const userName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
        : currentUser.user.email || 'Usuario';

      const { error } = await supabase
        .from('payroll_reopen_audit')
        .insert({
          company_id: companyId,
          periodo: log.periodo,
          user_id: currentUser.user.id,
          user_email: currentUser.user.email || '',
          action: log.action,
          previous_state: log.previousState,
          new_state: log.newState,
          has_vouchers: log.hasVouchers,
          notes: log.notes
        });

      if (error) {
        console.error('Error creating audit log:', error);
      }
    } catch (error) {
      console.error('Error in createAuditLog:', error);
    }
  }

  // Obtener logs de auditoría para un período
  static async getAuditLogs(companyId: string, periodo?: string) {
    try {
      let query = supabase
        .from('payroll_reopen_audit')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (periodo) {
        query = query.eq('periodo', periodo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      return [];
    }
  }
}
