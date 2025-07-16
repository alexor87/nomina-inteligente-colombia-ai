
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { PayrollNovedad, BaseCalculoData } from '@/types/novedades-enhanced';

// ✅ USAR TIPO DIRECTO DE LA BASE DE DATOS PARA EVITAR CONFLICTOS
type DatabaseNovedadType = Database['public']['Enums']['novedad_type'];

export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: DatabaseNovedadType;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  base_calculo?: any;
  subtipo?: string;
  company_id: string; // ✅ Required field
  constitutivo_salario?: boolean;
}

// ✅ REMOVIDO: Usar solo el tipo de novedades-enhanced.ts

/**
 * ✅ SERVICIO DE NOVEDADES REPARADO - FASE 3 CRÍTICA
 * Implementación real para conectar con base de datos
 */
export class NovedadesEnhancedService {
  
  // ✅ NUEVO: Método para obtener novedades por empresa y período
  static async getNovedades(companyId: string, periodId: string): Promise<PayrollNovedad[]> {
    try {
      console.log(`🔍 Obteniendo novedades para empresa ${companyId} en período ${periodId}`);
      
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('❌ Error obteniendo novedades:', error);
        return [];
      }

      console.log(`✅ Novedades encontradas: ${novedades?.length || 0}`);
      
      // Transformar datos de Supabase a PayrollNovedad
      return (novedades || []).map(novedad => ({
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        subtipo: novedad.subtipo,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        dias: novedad.dias,
        horas: novedad.horas,
        valor: novedad.valor || 0,
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        observacion: novedad.observacion,
        adjunto_url: novedad.adjunto_url,
        creado_por: novedad.creado_por,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      } as PayrollNovedad));
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedades:', error);
      return [];
    }
  }
  
  static async getNovedadesByEmployee(employeeId: string, periodId: string): Promise<PayrollNovedad[]> {
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
      
      // Transformar datos de Supabase a PayrollNovedad
      return (novedades || []).map(novedad => ({
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        subtipo: novedad.subtipo,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        dias: novedad.dias,
        horas: novedad.horas,
        valor: novedad.valor || 0,
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        observacion: novedad.observacion,
        adjunto_url: novedad.adjunto_url,
        creado_por: novedad.creado_por,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      } as PayrollNovedad));
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedadesByEmployee:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      console.log('➕ Creando nueva novedad:', novedadData);
      
      // ✅ CORRECCIÓN: Usar el tipo correcto y obtener company_id si no viene
      let companyId = novedadData.company_id;
      
      if (!companyId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          companyId = profile?.company_id;
        }
      }

      if (!companyId) {
        throw new Error('No se pudo determinar la empresa');
      }

      const insertData = {
        empleado_id: novedadData.empleado_id,
        periodo_id: novedadData.periodo_id,
        tipo_novedad: novedadData.tipo_novedad,
        valor: novedadData.valor,
        dias: novedadData.dias,
        horas: novedadData.horas,
        observacion: novedadData.observacion,
        company_id: companyId,
        creado_por: (await supabase.auth.getUser()).data.user?.id,
        fecha_inicio: novedadData.fecha_inicio,
        fecha_fin: novedadData.fecha_fin,
        base_calculo: novedadData.base_calculo,
        constitutivo_salario: novedadData.constitutivo_salario || false
      };

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando novedad:', error);
        throw error;
      }

      console.log('✅ Novedad creada exitosamente');
      
      // Transformar datos de Supabase a PayrollNovedad
      return {
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        subtipo: novedad.subtipo,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        dias: novedad.dias,
        horas: novedad.horas,
        valor: novedad.valor || 0,
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        observacion: novedad.observacion,
        adjunto_url: novedad.adjunto_url,
        creado_por: novedad.creado_por,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      } as PayrollNovedad;
      
    } catch (error) {
      console.error('💥 Error crítico creando novedad:', error);
      throw error;
    }
  }

  static async updateNovedad(novedadId: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    try {
      console.log(`🔄 Actualizando novedad ${novedadId}:`, updates);
      
      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .update(updates as any)
        .eq('id', novedadId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando novedad:', error);
        throw error;
      }

      console.log('✅ Novedad actualizada exitosamente');
      
      // Transformar datos de Supabase a PayrollNovedad
      return {
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad,
        subtipo: novedad.subtipo,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        dias: novedad.dias,
        horas: novedad.horas,
        valor: novedad.valor || 0,
        base_calculo: novedad.base_calculo ? JSON.parse(novedad.base_calculo) : undefined,
        observacion: novedad.observacion,
        adjunto_url: novedad.adjunto_url,
        creado_por: novedad.creado_por,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      } as PayrollNovedad;
      
    } catch (error) {
      console.error('💥 Error crítico actualizando novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(novedadId: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando novedad ${novedadId}`);
      
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) {
        console.error('❌ Error eliminando novedad:', error);
        throw error;
      }

      console.log('✅ Novedad eliminada exitosamente');
      
    } catch (error) {
      console.error('💥 Error crítico eliminando novedad:', error);
      throw error;
    }
  }
}
