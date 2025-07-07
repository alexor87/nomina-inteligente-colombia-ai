
import { supabase } from '@/integrations/supabase/client';

export interface PeriodCleanupResult {
  success: boolean;
  duplicatesRemoved: number;
  ghostPeriodsRemoved: number;
  invalidPeriodsFixed: number;
  errors: string[];
  summary: string;
}

export interface DiagnosticResult {
  duplicatePeriods: Array<{
    periodo: string;
    count: number;
    periods: Array<{
      id: string;
      fecha_inicio: string;
      fecha_fin: string;
      estado: string;
      created_at: string;
    }>;
  }>;
  ghostPeriods: Array<{
    id: string;
    periodo: string;
    estado: string;
    empleados_count: number;
    last_activity_at: string;
  }>;
  invalidPeriods: Array<{
    id: string;
    periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
    issue: string;
  }>;
}

export class PayrollPeriodCleanupService {
  
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async diagnosePeriodIssues(): Promise<DiagnosticResult> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    console.log('🔍 Diagnosticando problemas de períodos para empresa:', companyId);

    // 1. Buscar períodos duplicados por nombre
    const { data: allPeriods } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    const duplicatePeriods: DiagnosticResult['duplicatePeriods'] = [];
    const periodGroups = new Map<string, typeof allPeriods>();

    if (allPeriods) {
      allPeriods.forEach(period => {
        const key = period.periodo;
        if (!periodGroups.has(key)) {
          periodGroups.set(key, []);
        }
        periodGroups.get(key)!.push(period);
      });

      periodGroups.forEach((periods, periodo) => {
        if (periods.length > 1) {
          duplicatePeriods.push({
            periodo,
            count: periods.length,
            periods: periods.map(p => ({
              id: p.id,
              fecha_inicio: p.fecha_inicio,
              fecha_fin: p.fecha_fin,
              estado: p.estado,
              created_at: p.created_at
            }))
          });
        }
      });
    }

    // 2. Buscar períodos fantasma (sin empleados y abandonados)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días atrás
    const { data: ghostPeriods } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .in('estado', ['borrador', 'en_proceso'])
      .or(`empleados_count.eq.0,last_activity_at.lt.${cutoffDate.toISOString()}`);

    // 3. Buscar períodos con fechas inválidas
    const invalidPeriods: DiagnosticResult['invalidPeriods'] = [];
    if (allPeriods) {
      allPeriods.forEach(period => {
        const startDate = new Date(period.fecha_inicio);
        const endDate = new Date(period.fecha_fin);
        
        if (startDate > endDate) {
          invalidPeriods.push({
            id: period.id,
            periodo: period.periodo,
            fecha_inicio: period.fecha_inicio,
            fecha_fin: period.fecha_fin,
            issue: 'Fecha de inicio posterior a fecha de fin'
          });
        }

        // Detectar períodos con nombres inconsistentes con fechas
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const expectedMonth = monthNames[startMonth];
        
        if (!period.periodo.includes(expectedMonth) || !period.periodo.includes(startYear.toString())) {
          invalidPeriods.push({
            id: period.id,
            periodo: period.periodo,
            fecha_inicio: period.fecha_inicio,
            fecha_fin: period.fecha_fin,
            issue: `Nombre del período (${period.periodo}) no coincide con las fechas`
          });
        }
      });
    }

    return {
      duplicatePeriods,
      ghostPeriods: (ghostPeriods || []).map(p => ({
        id: p.id,
        periodo: p.periodo,
        estado: p.estado,
        empleados_count: p.empleados_count || 0,
        last_activity_at: p.last_activity_at || ''
      })),
      invalidPeriods
    };
  }

  static async executeAggressiveCleanup(): Promise<PeriodCleanupResult> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    console.log('🧹 Ejecutando limpieza agresiva de períodos para empresa:', companyId);

    const result: PeriodCleanupResult = {
      success: false,
      duplicatesRemoved: 0,
      ghostPeriodsRemoved: 0,
      invalidPeriodsFixed: 0,
      errors: [],
      summary: ''
    };

    try {
      // PASO 1: Eliminar períodos fantasma
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: ghostPeriods, error: ghostError } = await supabase
        .from('payroll_periods_real')
        .delete()
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .or(`empleados_count.eq.0,last_activity_at.lt.${cutoffDate.toISOString()}`)
        .select();

      if (ghostError) {
        result.errors.push(`Error eliminando períodos fantasma: ${ghostError.message}`);
      } else {
        result.ghostPeriodsRemoved = ghostPeriods?.length || 0;
        console.log(`✅ Eliminados ${result.ghostPeriodsRemoved} períodos fantasma`);
      }

      // PASO 2: Limpiar duplicados manteniendo el más reciente válido
      const { data: allPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (allPeriods) {
        const periodGroups = new Map<string, typeof allPeriods>();
        allPeriods.forEach(period => {
          const key = period.periodo;
          if (!periodGroups.has(key)) {
            periodGroups.set(key, []);
          }
          periodGroups.get(key)!.push(period);
        });

        for (const [periodo, periods] of periodGroups) {
          if (periods.length > 1) {
            // Mantener el período con estado cerrado o el más reciente
            const toKeep = periods.find(p => p.estado === 'cerrado') || periods[0];
            const toDelete = periods.filter(p => p.id !== toKeep.id);

            for (const period of toDelete) {
              const { error: deleteError } = await supabase
                .from('payroll_periods_real')
                .delete()
                .eq('id', period.id);

              if (deleteError) {
                result.errors.push(`Error eliminando duplicado ${period.id}: ${deleteError.message}`);
              } else {
                result.duplicatesRemoved++;
                console.log(`✅ Eliminado período duplicado: ${period.periodo} (${period.id})`);
              }
            }
          }
        }
      }

      // PASO 3: Corregir períodos con nombres incorrectos
      const { data: invalidPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId);

      if (invalidPeriods) {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        for (const period of invalidPeriods) {
          const startDate = new Date(period.fecha_inicio);
          const endDate = new Date(period.fecha_fin);
          
          // Corregir fechas invertidas
          if (startDate > endDate) {
            const { error: fixError } = await supabase
              .from('payroll_periods_real')
              .update({
                fecha_inicio: period.fecha_fin,
                fecha_fin: period.fecha_inicio
              })
              .eq('id', period.id);

            if (!fixError) {
              result.invalidPeriodsFixed++;
            }
          }

          // Corregir nombres inconsistentes
          const startMonth = startDate.getMonth();
          const startYear = startDate.getFullYear();
          const expectedMonth = monthNames[startMonth];
          
          if (!period.periodo.includes(expectedMonth) || !period.periodo.includes(startYear.toString())) {
            let correctName = '';
            
            // Detectar si es quincenal
            if (startDate.getDate() === 1 && endDate.getDate() === 15) {
              correctName = `1 - 15 ${expectedMonth} ${startYear}`;
            } else if (startDate.getDate() === 16) {
              correctName = `16 - ${endDate.getDate()} ${expectedMonth} ${startYear}`;
            } else {
              correctName = `${expectedMonth} ${startYear}`;
            }

            const { error: nameError } = await supabase
              .from('payroll_periods_real')
              .update({ periodo: correctName })
              .eq('id', period.id);

            if (!nameError) {
              result.invalidPeriodsFixed++;
              console.log(`✅ Corregido nombre: ${period.periodo} → ${correctName}`);
            }
          }
        }
      }

      result.success = result.errors.length === 0;
      result.summary = `Limpieza completada: ${result.duplicatesRemoved} duplicados, ${result.ghostPeriodsRemoved} fantasma, ${result.invalidPeriodsFixed} corregidos`;
      
      console.log('🎉 Limpieza agresiva completada:', result);
      return result;

    } catch (error) {
      result.errors.push(`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      result.summary = 'Error durante la limpieza';
      console.error('💥 Error en limpieza agresiva:', error);
      return result;
    }
  }

  static async fixSpecificPeriod(periodId: string, correctStartDate: string, correctEndDate: string): Promise<boolean> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) return false;

    try {
      const startDate = new Date(correctStartDate);
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      
      const month = monthNames[startDate.getMonth()];
      const year = startDate.getFullYear();
      let correctName = '';

      if (startDate.getDate() === 1 && new Date(correctEndDate).getDate() === 15) {
        correctName = `1 - 15 ${month} ${year}`;
      } else if (startDate.getDate() === 16) {
        correctName = `16 - ${new Date(correctEndDate).getDate()} ${month} ${year}`;
      } else {
        correctName = `${month} ${year}`;
      }

      const { error } = await supabase
        .from('payroll_periods_real')
        .update({
          fecha_inicio: correctStartDate,
          fecha_fin: correctEndDate,
          periodo: correctName
        })
        .eq('id', periodId)
        .eq('company_id', companyId);

      return !error;
    } catch (error) {
      console.error('Error fixing specific period:', error);
      return false;
    }
  }
}
