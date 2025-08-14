
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
      console.log('🚨 [SERVICE V8.3] ===== PLAN V8.3 QUIRÚRGICO - MÁXIMO LOGGING =====');
      console.log('🚨 [SERVICE V8.3] Datos RAW recibidos en createNovedad:', JSON.stringify(novedadData, null, 2));
      console.log('🚨 [SERVICE V8.3] Análisis específico V8.3 QUIRÚRGICO:', {
        'tipo_novedad': novedadData.tipo_novedad,
        'dias_recibidos': novedadData.dias,
        'dias_type': typeof novedadData.dias,
        'dias_is_zero': novedadData.dias === 0,
        'dias_is_undefined': novedadData.dias === undefined,
        'dias_is_null': novedadData.dias === null,
        'dias_is_positive': novedadData.dias > 0,
        'valor_recibido': novedadData.valor,
        'empleado_id': novedadData.empleado_id,
        'periodo_id': novedadData.periodo_id,
        'fecha_inicio': novedadData.fecha_inicio,
        'fecha_fin': novedadData.fecha_fin,
        'company_id': novedadData.company_id,
        'constitutivo_salario': novedadData.constitutivo_salario,
        'constitutivo_salario_type': typeof novedadData.constitutivo_salario,
        'plan_version': 'V8.3_QUIRURGICO',
        timestamp: new Date().toISOString()
      });

      // ✅ V8.3 VALIDACIÓN QUIRÚRGICA ANTES DE INSERTAR
      if (novedadData.tipo_novedad === 'incapacidad') {
        console.log('🏥 [SERVICE V8.3] ===== INCAPACIDAD DETECTADA - VALIDACIÓN QUIRÚRGICA =====');
        console.log('🏥 [SERVICE V8.3] Validación pre-inserción quirúrgica exhaustiva:', {
          dias_recibidos: novedadData.dias,
          es_undefined: novedadData.dias === undefined,
          es_null: novedadData.dias === null,
          es_zero: novedadData.dias === 0,
          es_negativo: novedadData.dias < 0,
          es_positivo: novedadData.dias > 0,
          tipo_datos: typeof novedadData.dias,
          valor_recibido: novedadData.valor,
          fechas: `${novedadData.fecha_inicio} - ${novedadData.fecha_fin}`,
          plan_version: 'V8.3_QUIRURGICO',
          timestamp: new Date().toISOString()
        });
        
        if (novedadData.dias === undefined || novedadData.dias === null || novedadData.dias <= 0) {
          console.error('🚨 [SERVICE V8.3] CRÍTICO: Incapacidad llegó al servicio con días inválidos:', {
            dias_recibidos: novedadData.dias,
            valor_recibido: novedadData.valor,
            fechas: `${novedadData.fecha_inicio} - ${novedadData.fecha_fin}`,
            error_location: 'NovedadesEnhancedService.createNovedad V8.3',
            datos_completos: novedadData,
            plan_version: 'V8.3_QUIRURGICO',
            timestamp: new Date().toISOString()
          });
          
          throw new Error(`[V8.3 QUIRÚRGICO CRÍTICO] Incapacidad recibida en servicio con días inválidos (${novedadData.dias}). Plan V8.3 falló. Datos: ${JSON.stringify({dias: novedadData.dias, fechas: {inicio: novedadData.fecha_inicio, fin: novedadData.fecha_fin}})}`);
        }

        console.log('✅ [SERVICE V8.3] Incapacidad validada correctamente en servicio quirúrgico:', {
          dias: novedadData.dias,
          valor: novedadData.valor,
          fechas: `${novedadData.fecha_inicio} - ${novedadData.fecha_fin}`,
          paso_validacion: true,
          plan_version: 'V8.3_QUIRURGICO'
        });
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

      console.log('💾 [SERVICE V8.3] ===== DATOS FINALES QUIRÚRGICOS PARA INSERCIÓN BD =====');
      console.log('💾 [SERVICE V8.3] insertData COMPLETO V8.3:', JSON.stringify(insertData, null, 2));
      console.log('💾 [SERVICE V8.3] Verificación final pre-inserción QUIRÚRGICA V8.3:', {
        'tipo_novedad_final': insertData.tipo_novedad,
        'dias_final': insertData.dias,
        'dias_final_type': typeof insertData.dias,
        'dias_final_positive': insertData.dias > 0,
        'valor_final': insertData.valor,
        'fechas_finales': `${insertData.fecha_inicio} - ${insertData.fecha_fin}`,
        'company_id_final': insertData.company_id,
        'constitutivo_salario_final': insertData.constitutivo_salario,
        'constitutivo_salario_type': typeof insertData.constitutivo_salario,
        'validation_pass': insertData.tipo_novedad === 'incapacidad' ? (insertData.dias > 0) : true,
        'plan_version': 'V8.3_QUIRURGICO',
        timestamp: new Date().toISOString()
      });

      // ✅ V8.3: VALIDACIÓN QUIRÚRGICA FINAL ANTES DE INSERT
      if (insertData.tipo_novedad === 'incapacidad' && insertData.dias <= 0) {
        console.error('🚨 [SERVICE V8.3] ÚLTIMA VALIDACIÓN QUIRÚRGICA FALLÓ:', {
          insertData_dias: insertData.dias,
          error: 'Días <= 0 detectados justo antes del INSERT quirúrgico',
          plan_version: 'V8.3_QUIRURGICO',
          timestamp: new Date().toISOString()
        });
        throw new Error(`Error crítico V8.3 quirúrgico: Incapacidad a punto de insertar con días <= 0 (${insertData.dias})`);
      }

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

      console.log('✅ [SERVICE V8.3] ===== INSERCIÓN QUIRÚRGICA EXITOSA =====');
      console.log('✅ [SERVICE V8.3] Novedad guardada en BD V8.3:', JSON.stringify(novedad, null, 2));
      console.log('✅ [SERVICE V8.3] Verificación post-inserción QUIRÚRGICA V8.3:', {
        'id_generado': novedad.id,
        'dias_en_bd': novedad.dias,
        'valor_en_bd': novedad.valor,
        'tipo_en_bd': novedad.tipo_novedad,
        'fechas_en_bd': `${novedad.fecha_inicio} - ${novedad.fecha_fin}`,
        'constitutivo_salario_bd': novedad.constitutivo_salario,
        'success_validation': novedad.tipo_novedad === 'incapacidad' ? (novedad.dias > 0) : true,
        'plan_version': 'V8.3_QUIRURGICO',
        'resultado_quirurgico': novedad.dias > 0 ? 'EXITOSO' : 'FALLÓ',
        timestamp: new Date().toISOString()
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
