import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad, CreateNovedadData, BaseCalculoData } from '@/types/novedades';

export class NovedadesService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) return null;
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  // Helper function to convert database row to PayrollNovedad
  private static convertDatabaseRowToNovedad(row: any): PayrollNovedad {
    return {
      ...row,
      base_calculo: row.base_calculo ? JSON.parse(row.base_calculo) : undefined
    } as PayrollNovedad;
  }

  static async getNovedadesByPeriod(periodoId: string): Promise<PayrollNovedad[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', periodoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => this.convertDatabaseRowToNovedad(row));
    } catch (error) {
      console.error('Error loading novedades:', error);
      return [];
    }
  }

  static async getNovedadesByEmployee(empleadoId: string, periodoId: string): Promise<PayrollNovedad[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('empleado_id', empleadoId)
        .eq('periodo_id', periodoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => this.convertDatabaseRowToNovedad(row));
    } catch (error) {
      console.error('Error loading employee novedades:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('🔍 Datos recibidos para crear novedad:', novedadData);

      // Validar campos requeridos antes de insertar
      if (!novedadData.empleado_id) {
        throw new Error('empleado_id es requerido');
      }
      if (!novedadData.periodo_id) {
        throw new Error('periodo_id es requerido');
      }
      if (!novedadData.tipo_novedad) {
        throw new Error('tipo_novedad es requerido');
      }
      if (!novedadData.valor || novedadData.valor <= 0) {
        throw new Error('valor debe ser mayor a 0');
      }

      // Función auxiliar para convertir a número de forma segura
      const safeNumber = (value: any): number | null => {
        if (value === null || value === undefined || value === '') return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      // Preparar los datos para inserción con valores explícitos y conversiones seguras
      const insertData = {
        company_id: companyId,
        empleado_id: novedadData.empleado_id,
        periodo_id: novedadData.periodo_id,
        tipo_novedad: novedadData.tipo_novedad,
        valor: safeNumber(novedadData.valor) || 0,
        creado_por: user.id,
        // Campos opcionales con valores por defecto seguros y conversiones
        subtipo: novedadData.subtipo || null,
        fecha_inicio: novedadData.fecha_inicio || null,
        fecha_fin: novedadData.fecha_fin || null,
        dias: safeNumber(novedadData.dias) || null,
        horas: safeNumber(novedadData.horas) || null,
        observacion: novedadData.observacion || null,
        // Convertir base_calculo a JSON string si existe
        base_calculo: novedadData.base_calculo ? JSON.stringify(novedadData.base_calculo) : null,
        adjunto_url: novedadData.adjunto_url || null
      };

      console.log('📤 Datos preparados para inserción:', insertData);

      const { data, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error detallado en la inserción:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        throw new Error(`Database error: ${error.message} ${error.details ? '- ' + error.details : ''} ${error.hint ? '- Hint: ' + error.hint : ''}`);
      }

      console.log('✅ Novedad creada exitosamente:', data);

      // Convert the database row to proper PayrollNovedad format
      const convertedData = this.convertDatabaseRowToNovedad(data);

      // Create enhanced audit log
      await this.createAuditLog(convertedData.id, 'created', null, convertedData, novedadData.periodo_id, novedadData.empleado_id);

      return convertedData;
    } catch (error) {
      console.error('❌ Error completo creating novedad:', error);
      throw error;
    }
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Get current data for audit
      const { data: oldData } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('id', id)
        .single();

      // Convert base_calculo to string if it exists in updates
      const processedUpdates = {
        ...updates,
        base_calculo: updates.base_calculo ? JSON.stringify(updates.base_calculo) : undefined
      };

      const { data, error } = await supabase
        .from('payroll_novedades')
        .update(processedUpdates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      // Convert the database row to proper PayrollNovedad format
      const convertedData = this.convertDatabaseRowToNovedad(data);

      // Create enhanced audit log
      await this.createAuditLog(id, 'updated', oldData, convertedData, oldData?.periodo_id, oldData?.empleado_id);

      return convertedData;
    } catch (error) {
      console.error('Error updating novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(id: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Get current data for audit
      const { data: oldData } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;

      // Create enhanced audit log
      await this.createAuditLog(id, 'deleted', oldData, null, oldData?.periodo_id, oldData?.empleado_id);
    } catch (error) {
      console.error('Error deleting novedad:', error);
      throw error;
    }
  }

  private static async createAuditLog(
    novedadId: string, 
    action: 'created' | 'updated' | 'deleted', 
    oldValues: any, 
    newValues: any,
    periodId?: string,
    employeeId?: string
  ): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Enhanced audit log with additional context
      const auditData = {
        novedad_id: novedadId,
        company_id: companyId,
        action,
        old_values: oldValues,
        new_values: newValues,
        user_id: user.id,
        // Additional context fields
        period_id: periodId,
        employee_id: employeeId,
        timestamp: new Date().toISOString(),
        user_email: user.email
      };

      await supabase
        .from('payroll_novedades_audit')
        .insert(auditData);

      console.log('✅ Audit log created:', auditData);
    } catch (error) {
      console.error('Error creating enhanced audit log:', error);
    }
  }
}
