
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
      console.warn('⚠️ base_calculo con JSON inválido, se ignora:', e);
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
 * ✅ Caché KISS en memoria para lecturas frecuentes
 */
type CacheEntry<T> = { data: T; expiresAt: number };
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

const companyPeriodCache = new Map<string, CacheEntry<AppPayrollNovedad[]>>();
const employeePeriodCache = new Map<string, CacheEntry<AppPayrollNovedad[]>>();

const getCache = <T>(map: Map<string, CacheEntry<T>>, key: string): T | null => {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }
  map.delete(key);
  return null;
};

const setCache = <T>(map: Map<string, CacheEntry<T>>, key: string, data: T) => {
  map.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

const invalidateAllCaches = () => {
  companyPeriodCache.clear();
  employeePeriodCache.clear();
};

const invalidateEmployeePeriod = (employeeId: string, periodId: string) => {
  employeePeriodCache.delete(`${employeeId}:${periodId}`);
};

const invalidateCompanyPeriod = (companyId: string, periodId: string) => {
  companyPeriodCache.delete(`${companyId}:${periodId}`);
};

/**
 * ✅ SERVICIO DE NOVEDADES REPARADO - FASE 3 CRÍTICA
 * Implementación real para conectar con base de datos
 */
export class NovedadesEnhancedService {
  
  // ✅ NUEVO: Método para obtener novedades por empresa y período (con caché y sin auto-fix)
  static async getNovedades(companyId: string, periodId: string): Promise<AppPayrollNovedad[]> {
    try {
      const cacheKey = `${companyId}:${periodId}`;
      const cached = getCache(companyPeriodCache, cacheKey);
      if (cached) {
        console.log('⚡ Cache hit getNovedades', { companyId, periodId, count: cached.length });
        return cached;
      }

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
      const mapped = (novedades || []).map(mapDbRowToApp);

      // Guardar en caché
      setCache(companyPeriodCache, cacheKey, mapped);
      return mapped;
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedades:', error);
      return [];
    }
  }
  
  // ✅ NUEVO: Obtener por empleado+período con caché y sin auto-fix
  static async getNovedadesByEmployee(employeeId: string, periodId: string): Promise<AppPayrollNovedad[]> {
    try {
      const cacheKey = `${employeeId}:${periodId}`;
      const cached = getCache(employeePeriodCache, cacheKey);
      if (cached) {
        console.log('⚡ Cache hit getNovedadesByEmployee', { employeeId, periodId, count: cached.length });
        return cached;
      }

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
      const mapped = (novedades || []).map(mapDbRowToApp);

      // Guardar en caché
      setCache(employeePeriodCache, cacheKey, mapped);
      return mapped;
      
    } catch (error) {
      console.error('💥 Error crítico en getNovedadesByEmployee:', error);
      return [];
    }
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<AppPayrollNovedad | null> {
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

      console.log('✅ Novedad creada exitosamente');
      const mapped = mapDbRowToApp(novedad);

      // ✅ Invalidar cachés específicos
      invalidateEmployeePeriod(novedad.empleado_id, novedad.periodo_id);
      invalidateCompanyPeriod(novedad.company_id, novedad.periodo_id);

      return mapped;
      
    } catch (error) {
      console.error('💥 Error crítico creando novedad:', error);
      throw error;
    }
  }

  static async updateNovedad(novedadId: string, updates: Partial<CreateNovedadData>): Promise<AppPayrollNovedad | null> {
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
      const mapped = mapDbRowToApp(novedad);

      // ✅ Invalidar cachés específicos
      invalidateEmployeePeriod(novedad.empleado_id, novedad.periodo_id);
      invalidateCompanyPeriod(novedad.company_id, novedad.periodo_id);

      return mapped;
      
    } catch (error) {
      console.error('💥 Error crítico actualizando novedad:', error);
      throw error;
    }
  }

  static async deleteNovedad(novedadId: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando novedad ${novedadId}`);
      
      // Obtener datos mínimos para invalidar caché
      const { data: existing } = await supabase
        .from('payroll_novedades')
        .select('id, empleado_id, periodo_id, company_id')
        .eq('id', novedadId)
        .maybeSingle();

      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', novedadId);

      if (error) {
        console.error('❌ Error eliminando novedad:', error);
        throw error;
      }

      console.log('✅ Novedad eliminada exitosamente');

      // ✅ Invalidar cachés específicos (si teníamos el registro)
      if (existing) {
        invalidateEmployeePeriod(existing.empleado_id, existing.periodo_id);
        invalidateCompanyPeriod(existing.company_id, existing.periodo_id);
      } else {
        // fallback
        invalidateAllCaches();
      }
      
    } catch (error) {
      console.error('💥 Error crítico eliminando novedad:', error);
      throw error;
    }
  }
}
