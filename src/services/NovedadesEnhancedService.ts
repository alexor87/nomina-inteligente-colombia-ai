
import { supabase } from '@/integrations/supabase/client';

/**
 * ✅ SERVICIO DE NOVEDADES REPARADO - FASE 3 CRÍTICA
 * Implementación real para conectar con base de datos
 */
export class NovedadesEnhancedService {
  
  static async getNovedadesByEmployee(employeeId: string, periodId: string): Promise<any[]> {
    try {
      console.log(`🔍 Obteniendo novedades para empleado ${employeeId} en período ${periodId}`);
      
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('❌ Error obteniendo novedades:', error);
        return [];
      }

      console.log(`✅ Novedades encontradas: ${novedades?.length || 0}`);
      return novedades || [];
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedadesByEmployee:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: {
    empleado_id: string;
    periodo_id: string;
    tipo_novedad: string;
    valor: number;
    dias?: number;
    horas?: number;
    observacion?: string;
    company_id: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('➕ Creando nueva novedad:', novedadData);
      
      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert({
          empleado_id: novedadData.empleado_id,
          periodo_id: novedadData.periodo_id,
          tipo_novedad: novedadData.tipo_novedad,
          valor: novedadData.valor,
          dias: novedadData.dias,
          horas: novedadData.horas,
          observacion: novedadData.observacion,
          company_id: novedadData.company_id,
          creado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando novedad:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Novedad creada exitosamente');
      return { success: true, data: novedad };
      
    } catch (error) {
      console.error('💥 Error crítico creando novedad:', error);
      return { success: false, error: 'Error interno creando novedad' };
    }
  }

  static async updateNovedad(novedadId: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🔄 Actualizando novedad ${novedadId}:`, updates);
      
      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .update(updates)
        .eq('id', novedadId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando novedad:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Novedad actualizada exitosamente');
      return { success: true, data: novedad };
      
    } catch (error) {
      console.error('💥 Error crítico actualizando novedad:', error);
      return { success: false, error: 'Error interno actualizando novedad' };
    }
  }

  static async deleteNovedad(novedadId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️ Eliminando novedad ${novedadId}`);
      
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) {
        console.error('❌ Error eliminando novedad:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Novedad eliminada exitosamente');
      return { success: true };
      
    } catch (error) {
      console.error('💥 Error crítico eliminando novedad:', error);
      return { success: false, error: 'Error interno eliminando novedad' };
    }
  }
}
