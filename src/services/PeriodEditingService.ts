import { supabase } from '@/integrations/supabase/client';
import { 
  EditingSession, 
  EditingChanges, 
  ValidationResult, 
  EditingSessionCreate,
  PeriodSnapshot,
  NovedadData 
} from '@/types/period-editing';

export class PeriodEditingService {
  
  /**
   * Crear sesión de edición y snapshot temporal
   */
  static async startEditingSession(periodId: string): Promise<EditingSession> {
    try {
      // Verificar que el período esté cerrado
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError) throw periodError;
      
      if (period.estado !== 'cerrado') {
        throw new Error('Solo se pueden editar períodos cerrados');
      }

      // Verificar que no haya otra sesión activa
      const canEdit = await this.validateEditingLock(periodId);
      if (!canEdit) {
        throw new Error('El período ya está siendo editado por otro usuario');
      }

      // Obtener datos del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Crear snapshot temporal
      await this.createTemporarySnapshot(periodId, period.company_id);

      // Crear sesión de edición
      const sessionId = crypto.randomUUID();
      const editingSession: EditingSession = {
        id: sessionId,
        periodId,
        companyId: period.company_id,
        userId: user.id,
        startedAt: new Date().toISOString(),
        changes: {
          employees: { added: [], removed: [] },
          novedades: { added: [], modified: [], deleted: [] },
          payrollData: {}
        },
        status: 'active'
      };

      // Guardar sesión en la base de datos
      const { error: sessionError } = await supabase
        .from('period_edit_sessions')
        .insert({
          id: sessionId,
          period_id: periodId,
          company_id: period.company_id,
          user_id: user.id,
          status: 'active',
          changes: editingSession.changes,
          created_at: new Date().toISOString()
        });

      if (sessionError) throw sessionError;

      return editingSession;
    } catch (error) {
      console.error('Error creating editing session:', error);
      throw error;
    }
  }

  /**
   * Crear snapshot temporal de datos del período
   */
  static async createTemporarySnapshot(periodId: string, companyId: string): Promise<void> {
    try {
      // Obtener datos completos del período
      const [
        { data: employees },
        { data: payrolls },
        { data: novedades },
        { data: periodData }
      ] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', companyId),
        supabase.from('payrolls').select('*').eq('period_id', periodId),
        supabase.from('payroll_novedades').select('*').eq('periodo_id', periodId),
        supabase.from('payroll_periods_real').select('*').eq('id', periodId).single()
      ]);

      const snapshot: PeriodSnapshot = {
        periodId,
        companyId,
        employees: employees || [],
        payrolls: payrolls || [],
        novedades: novedades || [],
        periodData: periodData || {},
        snapshotAt: new Date().toISOString()
      };

      // Guardar snapshot
      const { error } = await supabase
        .from('period_edit_snapshots')
        .insert({
          period_id: periodId,
          company_id: companyId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          snapshot_data: snapshot,
          session_id: crypto.randomUUID()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Aplicar todos los cambios atómicamente
   */
  static async applyChanges(sessionId: string): Promise<void> {
    try {
      // Obtener sesión
      const { data: session, error: sessionError } = await supabase
        .from('period_edit_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Validar cambios antes de aplicar
      const validation = await this.validateBusinessRules(session.changes);
      if (!validation.isValid) {
        throw new Error(`Validación fallida: ${validation.errors.join(', ')}`);
      }

      // Marcar sesión como guardando
      await supabase
        .from('period_edit_sessions')
        .update({ status: 'saving' })
        .eq('id', sessionId);

      // Aplicar cambios usando función de base de datos
      const { data, error } = await supabase.functions.invoke('apply-period-changes', {
        body: { sessionId, changes: session.changes }
      });

      if (error) throw error;

      // Marcar sesión como completada
      await supabase
        .from('period_edit_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Limpiar snapshot temporal
      await this.cleanupSnapshot(session.period_id);

    } catch (error) {
      // Marcar sesión como error
      await supabase
        .from('period_edit_sessions')
        .update({ 
          status: 'cancelled',
          error_message: error instanceof Error ? error.message : 'Error desconocido'
        })
        .eq('id', sessionId);
      
      throw error;
    }
  }

  /**
   * Descartar cambios y restaurar estado original
   */
  static async discardChanges(sessionId: string): Promise<void> {
    try {
      // Obtener sesión
      const { data: session, error: sessionError } = await supabase
        .from('period_edit_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Marcar sesión como cancelada
      await supabase
        .from('period_edit_sessions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Limpiar snapshot temporal
      await this.cleanupSnapshot(session.period_id);

    } catch (error) {
      console.error('Error discarding changes:', error);
      throw error;
    }
  }

  /**
   * Validar que no haya conflictos de concurrencia
   */
  static async validateEditingLock(periodId: string): Promise<boolean> {
    try {
      const { data: activeSessions } = await supabase
        .from('period_edit_sessions')
        .select('*')
        .eq('period_id', periodId)
        .eq('status', 'active');
        
      return (activeSessions?.length || 0) === 0;
    } catch (error) {
      console.error('Error validating editing lock:', error);
      return false;
    }
  }

  /**
   * Validar reglas de negocio
   */
  static async validateBusinessRules(changes: EditingChanges): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar empleados removidos
      for (const employeeId of changes.employees.removed) {
        const hasPayments = await this.checkEmployeeHasPayments(employeeId);
        if (hasPayments) {
          errors.push(`No se puede eliminar empleado con pagos procesados`);
        }
      }

      // Validar novedades
      for (const novedad of changes.novedades.added) {
        if (novedad.valor === undefined || novedad.valor === null) {
          errors.push(`La novedad debe tener un valor definido`);
        }
        
        if (novedad.fecha_inicio && novedad.fecha_fin) {
          const startDate = new Date(novedad.fecha_inicio);
          const endDate = new Date(novedad.fecha_fin);
          
          if (startDate > endDate) {
            errors.push(`La fecha de inicio no puede ser mayor a la fecha de fin`);
          }
        }
      }

      return { 
        isValid: errors.length === 0, 
        errors,
        warnings 
      };
    } catch (error) {
      return { 
        isValid: false, 
        errors: ['Error durante la validación'] 
      };
    }
  }

  /**
   * Verificar si un empleado tiene pagos procesados
   */
  private static async checkEmployeeHasPayments(employeeId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('payrolls')
        .select('id')
        .eq('employee_id', employeeId)
        .neq('estado', 'borrador')
        .limit(1);
        
      return (data?.length || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpiar snapshot temporal
   */
  private static async cleanupSnapshot(periodId: string): Promise<void> {
    try {
      await supabase
        .from('period_edit_snapshots')
        .delete()
        .eq('period_id', periodId);
    } catch (error) {
      console.error('Error cleaning up snapshot:', error);
    }
  }

  /**
   * Limpiar sesiones abandonadas (más de 1 hora)
   */
  static async cleanupAbandonedSessions(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      await supabase
        .from('period_edit_sessions')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('created_at', oneHourAgo);
    } catch (error) {
      console.error('Error cleaning up abandoned sessions:', error);
    }
  }

  /**
   * Obtener sesión activa para un período
   */
  static async getActiveSession(periodId: string): Promise<EditingSession | null> {
    try {
      const { data, error } = await supabase
        .from('period_edit_sessions')
        .select('*')
        .eq('period_id', periodId)
        .eq('status', 'active')
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        periodId: data.period_id,
        companyId: data.company_id,
        userId: data.user_id,
        startedAt: data.created_at,
        changes: data.changes,
        status: data.status
      };
    } catch (error) {
      return null;
    }
  }
}