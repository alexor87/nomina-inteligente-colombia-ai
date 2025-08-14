
import { supabase } from '@/integrations/supabase/client';
import { Database, Tables } from '@/integrations/supabase/types';

// ✅ USAR TIPO DIRECTO DE LA BASE DE DATOS
type DatabaseNovedadType = Database['public']['Enums']['novedad_type'] | 'deduccion_especial';
type PayrollNovedad = Tables<'payroll_novedades'>;

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

/**
 * ✅ SERVICIO DE NOVEDADES - PLAN V8.3 QUIRÚRGICO
 * Implementación con logging exhaustivo para debugging
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
      return (novedades || []);
      
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
      return (novedades || []) as PayrollNovedad[];
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedadesByEmployee:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    try {
      console.log('💾 [SERVICE V8.5] ===== PLAN V8.5 - RASTREO DEFINITIVO =====');
      console.log('💾 [SERVICE V8.5] Datos recibidos COMPLETOS:', JSON.stringify(novedadData, null, 2));
      console.log('💾 [SERVICE V8.5] Campos críticos:', { 
        tipo_novedad: novedadData.tipo_novedad, 
        dias: novedadData.dias, 
        valor: novedadData.valor,
        'typeof dias': typeof novedadData.dias,
        'dias === undefined': novedadData.dias === undefined,
        'dias === null': novedadData.dias === null,
        'dias === 0': novedadData.dias === 0
      });

      // ✅ V8.5: Validación crítica con logging detallado
      if (novedadData.tipo_novedad === 'incapacidad') {
        console.log('🏥 [SERVICE V8.5] ===== VALIDACIÓN INCAPACIDAD =====');
        console.log('🏥 [SERVICE V8.5] Días recibidos para incapacidad:', {
          valor: novedadData.dias,
          tipo: typeof novedadData.dias,
          es_valido: novedadData.dias && novedadData.dias > 0
        });
        
        if (!novedadData.dias || novedadData.dias <= 0) {
          console.error('❌ [SERVICE V8.5] CRÍTICO: Incapacidad sin días válidos');
          console.error('❌ [SERVICE V8.5] Datos problemáticos:', {
            dias_recibido: novedadData.dias,
            datos_completos: JSON.stringify(novedadData, null, 2)
          });
          throw new Error(`Incapacidades requieren días válidos (recibido: ${novedadData.dias})`);
        }
      }
      
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

      // ✅ V8.3 CONSTRUCCIÓN QUIRÚRGICA: Corrección del campo boolean constitutivo_salario
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
        subtipo: novedadData.subtipo,
        // ✅ V8.3 CORRECCIÓN QUIRÚRGICA: Conversión robusta a boolean
        constitutivo_salario: Boolean(novedadData.constitutivo_salario)
      };

      console.log('💾 [SERVICE V8.5] ===== DATOS PREPARADOS PARA INSERCIÓN =====');
      console.log('💾 [SERVICE V8.5] insertData COMPLETO:', JSON.stringify(insertData, null, 2));
      console.log('💾 [SERVICE V8.5] Campos críticos a insertar:', {
        tipo_novedad: insertData.tipo_novedad,
        dias: insertData.dias,
        valor: insertData.valor,
        'typeof dias': typeof insertData.dias,
        'dias > 0': insertData.dias > 0,
        empleado_id: insertData.empleado_id,
        periodo_id: insertData.periodo_id
      });

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('❌ [SERVICE V8.3] Error insertando en BD:', error);
        console.error('❌ [SERVICE V8.3] Datos que causaron error V8.3:', insertData);
        console.error('❌ [SERVICE V8.3] Error específico V8.3 quirúrgico:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          constitutivo_salario_value: insertData.constitutivo_salario,
          constitutivo_salario_type: typeof insertData.constitutivo_salario,
          plan_version: 'V8.3_QUIRURGICO'
        });
        throw error;
      }

      console.log('✅ [SERVICE V8.5] ===== NOVEDAD CREADA EXITOSAMENTE =====');
      console.log('✅ [SERVICE V8.5] Datos insertados en BD:', {
        id: novedad.id,
        tipo_novedad: novedad.tipo_novedad,
        dias: novedad.dias,
        valor: novedad.valor,
        'dias_en_bd': novedad.dias,
        'typeof dias_en_bd': typeof novedad.dias,
        'dias_correctos': novedad.tipo_novedad === 'incapacidad' ? novedad.dias === 4 : true,
        novedad_completa: JSON.stringify(novedad, null, 2)
      });

      // Log manual audit action for business context
      try {
        const { PayrollAuditEnhancedService } = await import('@/services/PayrollAuditEnhancedService');
        await PayrollAuditEnhancedService.logManualAction(novedad.id, 'ADJUSTMENT', {
          reason: 'Novedad creada desde interfaz de ajustes - Plan V8.3 Quirúrgico',
          source: 'adjustment',
          metadata: {
            original_data: insertData,
            user_context: 'PayrollHistoryDetailPage',
            plan_version: 'V8.3_QUIRURGICO',
            timestamp: new Date().toISOString()
          }
        });
      } catch (auditError) {
        console.warn('⚠️ No se pudo registrar acción de auditoría:', auditError);
      }

      console.log('✅ [SERVICE V8.3] Novedad creada exitosamente con Plan V8.3 Quirúrgico');
      return novedad as PayrollNovedad;
      
    } catch (error) {
      console.error('💥 [SERVICE V8.3] Error crítico creando novedad V8.3:', error);
      console.error('💥 [SERVICE V8.3] Stack trace V8.3:', error.stack);
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
      return novedad as PayrollNovedad;
      
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
