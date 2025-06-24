
import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades';

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
      return (data || []) as PayrollNovedad[];
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
      return (data || []) as PayrollNovedad[];
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

      // Preparar los datos para inserción, eliminando campos undefined/null
      const insertData = {
        company_id: companyId,
        empleado_id: novedadData.empleado_id,
        periodo_id: novedadData.periodo_id,
        tipo_novedad: novedadData.tipo_novedad,
        valor: novedadData.valor || 0,
        creado_por: user.id,
        ...(novedadData.subtipo && { subtipo: novedadData.subtipo }),
        ...(novedadData.fecha_inicio && { fecha_inicio: novedadData.fecha_inicio }),
        ...(novedadData.fecha_fin && { fecha_fin: novedadData.fecha_fin }),
        ...(novedadData.dias && novedadData.dias > 0 && { dias: novedadData.dias }),
        ...(novedadData.horas && novedadData.horas > 0 && { horas: novedadData.horas }),
        ...(novedadData.observacion && { observacion: novedadData.observacion }),
        ...(novedadData.base_calculo && { base_calculo: novedadData.base_calculo }),
        ...(novedadData.adjunto_url && { adjunto_url: novedadData.adjunto_url })
      };

      console.log('📤 Datos preparados para inserción:', insertData);

      const { data, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error en la inserción:', error);
        throw error;
      }

      console.log('✅ Novedad creada exitosamente:', data);

      // Create audit log
      await this.createAuditLog(data.id, 'created', null, data);

      return data as PayrollNovedad;
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
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

      const { data, error } = await supabase
        .from('payroll_novedades')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await this.createAuditLog(id, 'updated', oldData, data);

      return data as PayrollNovedad;
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

      // Create audit log
      await this.createAuditLog(id, 'deleted', oldData, null);
    } catch (error) {
      console.error('Error deleting novedad:', error);
      throw error;
    }
  }

  private static async createAuditLog(
    novedadId: string, 
    action: 'created' | 'updated' | 'deleted', 
    oldValues: any, 
    newValues: any
  ): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('payroll_novedades_audit')
        .insert({
          novedad_id: novedadId,
          company_id: companyId,
          action,
          old_values: oldValues,
          new_values: newValues,
          user_id: user.id
        });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }
}
