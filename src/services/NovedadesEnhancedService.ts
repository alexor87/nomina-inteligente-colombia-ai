
import { supabase } from '@/integrations/supabase/client';
import { Database, Tables } from '@/integrations/supabase/types';
import { NOVEDAD_CATEGORIES, PayrollNovedad as AppPayrollNovedad, BaseCalculoData } from '@/types/novedades-enhanced';

// ✅ USAR TIPO DIRECTO DE LA BASE DE DATOS
type DatabaseNovedadType = Database['public']['Enums']['novedad_type'] | 'deduccion_especial';
type DbNovedadRow = Tables<'payroll_novedades'>;

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

// ✅ Helpers de mapeo/parsing KISS
const parseBaseCalculo = (bc: unknown): BaseCalculoData | undefined => {
  if (!bc) return undefined;
  if (typeof bc === 'string') {
    try {
      return JSON.parse(bc);
    } catch (e) {
      return undefined;
    }
  }
  return bc as BaseCalculoData;
};

const mapDbRowToApp = (n: any): AppPayrollNovedad => {
  return {
    id: n.id,
    company_id: n.company_id,
    empleado_id: n.empleado_id,
    periodo_id: n.periodo_id,
    tipo_novedad: n.tipo_novedad,
    subtipo: n.subtipo || undefined,
    fecha_inicio: n.fecha_inicio || undefined,
    fecha_fin: n.fecha_fin || undefined,
    dias: typeof n.dias === 'number' ? n.dias : n.dias ?? undefined,
    horas: typeof n.horas === 'number' ? n.horas : n.horas ?? undefined,
    valor: Number(n.valor || 0),
    base_calculo: parseBaseCalculo(n.base_calculo),
    observacion: n.observacion || undefined,
    adjunto_url: n.adjunto_url || undefined,
    creado_por: n.creado_por || undefined,
    created_at: n.created_at,
    updated_at: n.updated_at,
  };
};

/**
 * ✅ SERVICIO DE NOVEDADES SIMPLIFICADO - SIN CACHE COMPLEJO
 * Implementación directa sin cache en memoria que causaba bloqueos
 */
export class NovedadesEnhancedService {
  
  // ✅ Obtener novedades por empresa y período (simplificado)
  static async getNovedades(companyId: string, periodId: string): Promise<AppPayrollNovedad[]> {
    try {
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('❌ Error obteniendo novedades:', error);
        return [];
      }

      const mapped = (novedades || []).map(mapDbRowToApp);
      return mapped;
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedades:', error);
      return [];
    }
  }
  
  // ✅ Obtener por empleado+período (simplificado)
  static async getNovedadesByEmployee(employeeId: string, periodId: string): Promise<AppPayrollNovedad[]> {
    try {
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('❌ Error obteniendo novedades:', error);
        return [];
      }

      const mapped = (novedades || []).map(mapDbRowToApp);
      return mapped;
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedadesByEmployee:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<AppPayrollNovedad | null> {
    try {
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
        constitutivo_salario: constitutivo
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

      return mapDbRowToApp(novedad);
      
    } catch (error) {
      console.error('💥 Error crítico creando novedad:', error);
      throw error;
    }
  }

  static async updateNovedad(novedadId: string, updates: Partial<CreateNovedadData>): Promise<AppPayrollNovedad | null> {
    try {
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

      return mapDbRowToApp(novedad);
      
    } catch (error) {
      console.error('💥 Error crítico actualizando novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(novedadId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) {
        console.error('❌ Error eliminando novedad:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('💥 Error crítico eliminando novedad:', error);
      throw error;
    }
  }
}
