
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
      console.log('🔍 [V9.0] ===== SERVICIO RECIBIÓ DATOS PARA GUARDAR =====');
      console.log('🔍 [V9.0] novedadData completo:', JSON.stringify(novedadData, null, 2));
      
      // Validación simple para incapacidades
      if (novedadData.tipo_novedad === 'incapacidad' && (!novedadData.dias || novedadData.dias <= 0)) {
        console.error('🔍 [V9.0] validación falló para incapacidad:', {
          dias: novedadData.dias,
          tipo: typeof novedadData.dias
        });
        throw new Error(`Incapacidades requieren días válidos (recibido: ${novedadData.dias})`);
      }
      
      // Obtener company_id si no viene
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

      // 🔧 [V10.0] CONVERSIÓN EXPLÍCITA DE TIPOS - SOLUCIÓN QUIRÚRGICA
      const diasFinal = Number(novedadData.dias) || 0;
      const valorFinal = Number(novedadData.valor) || 0;
      
      console.log('🔧 [V10.0] CONVERSIÓN DE TIPOS:', {
        dias_original: novedadData.dias,
        dias_tipo: typeof novedadData.dias,
        dias_final: diasFinal,
        valor_original: novedadData.valor,
        valor_tipo: typeof novedadData.valor,
        valor_final: valorFinal
      });

      // 🔧 [V10.0] VALIDACIÓN ESTRICTA PARA INCAPACIDADES
      if (novedadData.tipo_novedad === 'incapacidad') {
        if (diasFinal <= 0) {
          console.error('🚨 [V10.0] VALIDACIÓN FALLÓ - Días inválidos:', {
            diasFinal,
            valorFinal,
            tipo: novedadData.tipo_novedad
          });
          throw new Error(`Incapacidad requiere días válidos. Recibido: ${diasFinal}`);
        }
        if (valorFinal <= 0) {
          console.error('🚨 [V10.0] VALIDACIÓN FALLÓ - Valor inválido:', {
            diasFinal,
            valorFinal,
            tipo: novedadData.tipo_novedad
          });
          throw new Error(`Incapacidad requiere valor válido. Recibido: ${valorFinal}`);
        }
        console.log('✅ [V10.0] VALIDACIÓN EXITOSA para incapacidad:', {
          diasFinal,
          valorFinal,
          esTipoIncapacidad: true
        });
      }

      const insertData = {
        empleado_id: novedadData.empleado_id,
        periodo_id: novedadData.periodo_id,
        tipo_novedad: novedadData.tipo_novedad,
        valor: valorFinal, // 🔧 [V10.0] VALOR CONVERTIDO EXPLÍCITAMENTE
        dias: diasFinal,   // 🔧 [V10.0] DÍAS CONVERTIDOS EXPLÍCITAMENTE
        horas: novedadData.horas ? Number(novedadData.horas) : null,
        observacion: novedadData.observacion,
        company_id: companyId,
        creado_por: (await supabase.auth.getUser()).data.user?.id,
        fecha_inicio: novedadData.fecha_inicio,
        fecha_fin: novedadData.fecha_fin,
        base_calculo: novedadData.base_calculo,
        subtipo: novedadData.subtipo,
        constitutivo_salario: Boolean(novedadData.constitutivo_salario)
      };

      console.log('🔍 [V9.0] insertData que se enviará a BD:', JSON.stringify(insertData, null, 2));

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData as any)
        .select()
        .single();

      console.log('🔍 [V9.0] respuesta de BD:', { novedad, error });

      if (error) {
        console.error('Error insertando novedad:', error);
        throw error;
      }

      // Log audit action
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
