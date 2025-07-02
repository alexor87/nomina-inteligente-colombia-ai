
import { supabase } from '@/integrations/supabase/client';

// Usar tipos directos de la base de datos en lugar de los tipos enhanced
export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: 'horas_extra' | 'recargo_nocturno' | 'vacaciones' | 'licencia_remunerada' | 'incapacidad' | 'bonificacion' | 'comision' | 'prima' | 'otros_ingresos' | 'salud' | 'pension' | 'fondo_solidaridad' | 'retencion_fuente' | 'libranza' | 'ausencia' | 'multa' | 'descuento_voluntario';
  valor?: number;
  dias?: number;
  horas?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  observacion?: string;
  base_calculo?: any;
  subtipo?: string;
}

export interface PayrollNovedad {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: 'horas_extra' | 'recargo_nocturno' | 'vacaciones' | 'licencia_remunerada' | 'incapacidad' | 'bonificacion' | 'comision' | 'prima' | 'otros_ingresos' | 'salud' | 'pension' | 'fondo_solidaridad' | 'retencion_fuente' | 'libranza' | 'ausencia' | 'multa' | 'descuento_voluntario';
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  base_calculo?: string;
  subtipo?: string;
  created_at: string;
  updated_at: string;
}

export class NovedadesBackupService {
  // Este servicio mantiene toda la funcionalidad de novedades intacta
  // para ser usado en el nuevo módulo de liquidación
  
  static async createNovedad(data: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      console.log('🚀 Creating novedad with data:', data);
      
      // Obtener company_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario');
      
      const { data: result, error } = await supabase
        .from('payroll_novedades')
        .insert({
          company_id: profile.company_id,
          empleado_id: data.empleado_id,
          periodo_id: data.periodo_id,
          tipo_novedad: data.tipo_novedad,
          valor: data.valor || 0,
          dias: data.dias,
          horas: data.horas,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          observacion: data.observacion,
          base_calculo: data.base_calculo ? JSON.stringify(data.base_calculo) : null,
          subtipo: data.subtipo,
          creado_por: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating novedad:', error);
        throw error;
      }

      console.log('✅ Novedad created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in createNovedad:', error);
      throw error;
    }
  }

  static async getNovedadesByEmployee(employeeId: string, periodoId: string): Promise<PayrollNovedad[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting novedades by employee:', error);
      return [];
    }
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_novedades')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error deleting novedad:', error);
      throw error;
    }
  }
}
