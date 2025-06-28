
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
        periodo_id: novedadData.periodo_id, // Keep using periodo_id as expected by the database
        tipo_novedad: novedadData.tipo_novedad,
        valor: novedadData.valor,
        horas: novedadData.horas,
        dias: novedadData.dias,
        observacion: novedadData.observacion,
        fecha_inicio: novedadData.fecha_inicio,
        fecha_fin: novedadData.fecha_fin,
        base_calculo: novedadData.base_calculo ? JSON.stringify(novedadData.base_calculo) : undefined,
        creado_por: user.id
      };

      console.log('📤 Inserting novedad with data:', insertData);
      
      const { data, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select(`
          id,
          company_id,
          empleado_id,
          periodo_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          base_calculo,
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
        company_id: data.company_id,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_id,
        tipo_novedad: data.tipo_novedad,
        valor: Number(data.valor || 0),
        horas: Number(data.horas || 0),
        dias: data.dias || 0,
        observacion: data.observacion || '',
        fecha_inicio: data.fecha_inicio || '',
        fecha_fin: data.fecha_fin || '',
        base_calculo: data.base_calculo ? JSON.parse(data.base_calculo) : undefined,
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
          company_id,
          empleado_id,
          periodo_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          base_calculo,
          created_at,
          updated_at
        `)
        .eq('company_id', companyId)
        .eq('empleado_id', empleadoId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading novedades:', error);
        throw error;
      }

      console.log('📊 Loaded novedades:', data);

      return (data || []).map(novedad => ({
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        valor: Number(novedad.valor || 0),
        horas: Number(novedad.horas || 0),
        dias: novedad.dias || 0,
        observacion: novedad.observacion || '',
        fecha_inicio: novedad.fecha_inicio || '',
        fecha_fin: novedad.fecha_fin || '',
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
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

      // Transform updates to match database schema
      const dbUpdates: any = { ...updates };
      if (updates.base_calculo) {
        dbUpdates.base_calculo = JSON.stringify(updates.base_calculo);
      }

      const { data, error } = await supabase
        .from('payroll_novedades')
        .update(dbUpdates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select(`
          id,
          company_id,
          empleado_id,
          periodo_id,
          tipo_novedad,
          valor,
          horas,
          dias,
          observacion,
          fecha_inicio,
          fecha_fin,
          base_calculo,
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
        company_id: data.company_id,
        empleado_id: data.empleado_id,
        periodo_id: data.periodo_id,
        tipo_novedad: data.tipo_novedad,
        valor: Number(data.valor || 0),
        horas: Number(data.horas || 0),
        dias: data.dias || 0,
        observacion: data.observacion || '',
        fecha_inicio: data.fecha_inicio || '',
        fecha_fin: data.fecha_fin || '',
        base_calculo: data.base_calculo ? JSON.parse(data.base_calculo) : undefined,
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
