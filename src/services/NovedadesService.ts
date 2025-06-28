
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

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('📝 Creating novedad with data:', novedadData);

      // Validate that periodo_id is a valid UUID and exists in payroll_periods_real
      const { data: periodExists, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('id', novedadData.periodo_id)
        .eq('company_id', companyId)
        .single();

      if (periodError || !periodExists) {
        console.error('Period validation failed:', periodError);
        throw new Error(`Invalid period ID: ${novedadData.periodo_id}`);
      }

      console.log('✅ Period validated successfully:', periodExists.id);

      const insertData = {
        company_id: companyId,
        empleado_id: novedadData.empleado_id,
        periodo_real_id: novedadData.periodo_id, // Using the new column
        tipo_novedad: novedadData.tipo_novedad,
        valor: novedadData.valor,
        horas: novedadData.horas,
        dias: novedadData.dias,
        observacion: novedadData.observacion,
        fecha_inicio: novedadData.fecha_inicio,
        fecha_fin: novedadData.fecha_fin,
        creado_por: user.id
      };

      console.log('📤 Inserting novedad with data:', insertData);
      
      const { data, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select(`
          id,
          empleado_id,
          periodo_real_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('❌ Error inserting novedad:', error);
        throw error;
      }

      console.log('✅ Novedad created successfully:', data);
      
      return {
        id: data.id,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_real_id, // Map back to the expected field name
        tipo_novedad: data.tipo_novedad,
        valor: Number(data.valor || 0),
        horas: Number(data.horas || 0),
        dias: data.dias || 0,
        observacion: data.observacion || '',
        fecha_inicio: data.fecha_inicio || '',
        fecha_fin: data.fecha_fin || '',
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
      throw error;
    }
  }

  static async getNovedadesByEmployee(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      console.log('🔍 Loading novedades for employee:', empleadoId, 'period:', periodId);

      const { data, error } = await supabase
        .from('payroll_novedades')
        .select(`
          id,
          empleado_id,
          periodo_real_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          created_at,
          updated_at
        `)
        .eq('company_id', companyId)
        .eq('empleado_id', empleadoId)
        .eq('periodo_real_id', periodId) // Using the new column
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading novedades:', error);
        throw error;
      }

      console.log('📊 Loaded novedades:', data);

      return (data || []).map(novedad => ({
        id: novedad.id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_real_id, // Map back to expected field name
        tipo_novedad: novedad.tipo_novedad,
        valor: Number(novedad.valor || 0),
        horas: Number(novedad.horas || 0),
        dias: novedad.dias || 0,
        observacion: novedad.observacion || '',
        fecha_inicio: novedad.fecha_inicio || '',
        fecha_fin: novedad.fecha_fin || '',
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      }));
    } catch (error) {
      console.error('Error loading novedades:', error);
      throw error;
    }
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('📝 Updating novedad:', id, 'with updates:', updates);

      const { data, error } = await supabase
        .from('payroll_novedades')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select(`
          id,
          empleado_id,
          periodo_real_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Error updating novedad:', error);
        throw error;
      }

      console.log('✅ Novedad updated successfully:', data);

      return {
        id: data.id,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_real_id,
        tipo_novedad: data.tipo_novedad,
        valor: Number(data.valor || 0),
        horas: Number(data.horas || 0),
        dias: data.dias || 0,
        observacion: data.observacion || '',
        fecha_inicio: data.fecha_inicio || '',
        fecha_fin: data.fecha_fin || '',
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error updating novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(id: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('🗑️ Deleting novedad:', id);

      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting novedad:', error);
        throw error;
      }

      console.log('✅ Novedad deleted successfully');
    } catch (error) {
      console.error('Error deleting novedad:', error);
      throw error;
    }
  }
}
