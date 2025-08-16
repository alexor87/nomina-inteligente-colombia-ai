import { supabase } from '@/integrations/supabase/client';
import { Database, Tables } from '@/integrations/supabase/types';
import { NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';

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

// ✅ Helper normativo: constitutividad por defecto según tipo (Art. 127 CST aplicado en config)
const getDefaultConstitutivoByType = (tipo: DatabaseNovedadType): boolean => {
  const devTypes = (NOVEDAD_CATEGORIES as any)?.devengados?.types || {};
  const cfg = devTypes[tipo as keyof typeof devTypes];
  return cfg?.constitutivo_default ?? false;
};

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

      // ✅ Auto-fix: corregir constitutividad para horas extra/recargos que quedaron en false por defecto previo
      const toFixIds: string[] = (novedades || [])
        .filter(n => {
          const shouldBeTrue = getDefaultConstitutivoByType(n.tipo_novedad as DatabaseNovedadType);
          const isHEoRecargo = n.tipo_novedad === 'horas_extra' || n.tipo_novedad === 'recargo_nocturno';
          const explicitFalse = n.constitutivo_salario === false;
          return isHEoRecargo && shouldBeTrue && explicitFalse;
        })
        .map(n => n.id as unknown as string);

      if (toFixIds.length > 0) {
        console.log('🛠️ Corrigiendo constitutividad en DB para registros:', toFixIds);
        const { error: updateError } = await supabase
          .from('payroll_novedades')
          .update({ constitutivo_salario: true })
          .in('id', toFixIds);

        if (updateError) {
          console.warn('⚠️ No se pudo aplicar auto-fix de constitutividad:', updateError);
        } else {
          // Reflejar el cambio en memoria
          (novedades || []).forEach(n => {
            if (toFixIds.includes(n.id as unknown as string)) {
              n.constitutivo_salario = true;
            }
          });
          console.log('✅ Auto-fix aplicado en constitutividad (horas extra / recargos = TRUE)');
        }
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

      // ✅ Auto-fix: igual que en getNovedades, corregir falsos heredados
      const toFixIds: string[] = (novedades || [])
        .filter(n => {
          const shouldBeTrue = getDefaultConstitutivoByType(n.tipo_novedad as DatabaseNovedadType);
          const isHEoRecargo = n.tipo_novedad === 'horas_extra' || n.tipo_novedad === 'recargo_nocturno';
          const explicitFalse = n.constitutivo_salario === false;
          return isHEoRecargo && shouldBeTrue && explicitFalse;
        })
        .map(n => n.id as unknown as string);

      if (toFixIds.length > 0) {
        console.log('🛠️ Corrigiendo constitutividad en DB para registros (empleado):', toFixIds);
        const { error: updateError } = await supabase
          .from('payroll_novedades')
          .update({ constitutivo_salario: true })
          .in('id', toFixIds);

        if (updateError) {
          console.warn('⚠️ No se pudo aplicar auto-fix de constitutividad (empleado):', updateError);
        } else {
          (novedades || []).forEach(n => {
            if (toFixIds.includes(n.id as unknown as string)) {
              n.constitutivo_salario = true;
            }
          });
          console.log('✅ Auto-fix aplicado (empleado) en constitutividad');
        }
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

      // ✅ Nuevo: determinar constitutivo por defecto según tipo SOLO cuando no viene explícito
      const constitutivo =
        typeof novedadData.constitutivo_salario === 'boolean'
          ? novedadData.constitutivo_salario
          : getDefaultConstitutivoByType(novedadData.tipo_novedad);

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
        constitutivo_salario: constitutivo // ✅ ya no "|| false", respeta explícito y aplica default normativo
      };

      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando novedad:', error);
        throw error;
      }

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

      console.log('✅ Novedad creada exitosamente');
      return novedad as PayrollNovedad;
      
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
