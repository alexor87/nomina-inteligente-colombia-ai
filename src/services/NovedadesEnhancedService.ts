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
      console.log('🚨 [SERVICE V6.0] ===== LOGGING DEFENSIVO ACTIVADO =====');
      console.log('🚨 [SERVICE V6.0] Datos RAW recibidos en createNovedad:', JSON.stringify(novedadData, null, 2));
      console.log('🚨 [SERVICE V6.0] Análisis específico V6.0:', {
        'tipo_novedad': novedadData.tipo_novedad,
        'dias_recibidos': novedadData.dias,
        'dias_type': typeof novedadData.dias,
        'dias_is_zero': novedadData.dias === 0,
        'dias_is_undefined': novedadData.dias === undefined,
        'valor_recibido': novedadData.valor,
        'empleado_id': novedadData.empleado_id,
        'periodo_id': novedadData.periodo_id,
        'fecha_inicio': novedadData.fecha_inicio,
        'fecha_fin': novedadData.fecha_fin,
        timestamp: new Date().toISOString()
      });

      // ✅ V6.0 VALIDACIÓN CRÍTICA ANTES DE INSERTAR
      if (novedadData.tipo_novedad === 'incapacidad') {
        console.log('🏥 [SERVICE V6.0] INCAPACIDAD DETECTADA - Validación pre-inserción');
        
        if (novedadData.dias === undefined || novedadData.dias === null || novedadData.dias <= 0) {
          console.error('🚨 [SERVICE V6.0] CRÍTICO: Incapacidad llegó al servicio con días inválidos:', {
            dias_recibidos: novedadData.dias,
            valor_recibido: novedadData.valor,
            fechas: `${novedadData.fecha_inicio} - ${novedadData.fecha_fin}`,
            error_location: 'NovedadesEnhancedService.createNovedad',
            timestamp: new Date().toISOString()
          });
          
          throw new Error(`[V6.0] CRÍTICO: Incapacidad recibida en servicio con días inválidos (${novedadData.dias}). Verificar sincronización modal-servicio.`);
        }

        console.log('✅ [SERVICE V6.0] Incapacidad validada en servicio:', {
          dias: novedadData.dias,
          valor: novedadData.valor,
          fechas: `${novedadData.fecha_inicio} - ${novedadData.fecha_fin}`
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
        constitutivo_salario: novedadData.constitutivo_salario || false
      };

      console.log('💾 [SERVICE V6.0] ===== DATOS FINALES PARA INSERCIÓN =====');
      console.log('💾 [SERVICE V6.0] insertData completo:', JSON.stringify(insertData, null, 2));
      console.log('💾 [SERVICE V6.0] Verificación final pre-inserción:', {
        'tipo_novedad_final': insertData.tipo_novedad,
        'dias_final': insertData.dias,
        'valor_final': insertData.valor,
        'fechas_finales': `${insertData.fecha_inicio} - ${insertData.fecha_fin}`,
        'company_id_final': insertData.company_id,
        timestamp: new Date().toISOString()
      });

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('❌ [SERVICE V6.0] Error insertando en BD:', error);
        console.error('❌ [SERVICE V6.0] Datos que causaron error:', insertData);
        throw error;
      }

      console.log('✅ [SERVICE V6.0] ===== INSERCIÓN EXITOSA =====');
      console.log('✅ [SERVICE V6.0] Novedad guardada en BD:', JSON.stringify(novedad, null, 2));
      console.log('✅ [SERVICE V6.0] Verificación post-inserción:', {
        'id_generado': novedad.id,
        'dias_en_bd': novedad.dias,
        'valor_en_bd': novedad.valor,
        'tipo_en_bd': novedad.tipo_novedad,
        timestamp: new Date().toISOString()
      });

      // Log manual audit action for business context
      try {
        const { PayrollAuditEnhancedService } = await import('@/services/PayrollAuditEnhancedService');
        await PayrollAuditEnhancedService.logManualAction(novedad.id, 'ADJUSTMENT', {
          reason: 'Novedad creada desde interfaz de ajustes',
          source: 'adjustment',
          metadata: {
            original_data: insertData,
            user_context: 'PayrollHistoryDetailPage',
            timestamp: new Date().toISOString()
          }
        });
      } catch (auditError) {
        console.warn('⚠️ No se pudo registrar acción de auditoría:', auditError);
      }

      console.log('✅ [SERVICE V6.0] Novedad creada exitosamente con logging defensivo');
      return novedad as PayrollNovedad;
      
    } catch (error) {
      console.error('💥 [SERVICE V6.0] Error crítico creando novedad:', error);
      console.error('💥 [SERVICE V6.0] Stack trace:', error.stack);
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
