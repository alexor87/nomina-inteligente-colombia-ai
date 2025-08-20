import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades-enhanced';

export interface NovedadesTotals {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  hasNovedades: boolean;
}

// ✅ NUEVO: Interface para el backend profesional
interface BackendNovedadesTotalsInput {
  salarioBase: number;
  fechaPeriodo?: string;
  novedades: Array<{
    tipo_novedad: string;
    subtipo?: string;
    valor?: number;
    dias?: number;
    horas?: number;
    constitutivo_salario?: boolean;
  }>;
}

interface BackendNovedadesTotalsResult {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  breakdown: Array<{
    tipo_novedad: string;
    subtipo?: string;
    valorCalculado: number;
    valorOriginal?: number;
    esDevengo: boolean;
    detalleCalculo?: string;
  }>;
}

const cache = new Map<string, NovedadesTotals>();

class NovedadesCalculationServiceClass {
  private generateCacheKey(employeeId: string, periodId: string): string {
    return `${employeeId}-${periodId}`;
  }

  invalidateCache(employeeId?: string, periodId?: string): void {
    if (employeeId && periodId) {
      const key = this.generateCacheKey(employeeId, periodId);
      cache.delete(key);
      console.log(`🗑️ Invalidating cache for employee ${employeeId} in period ${periodId}`);
    } else {
      cache.clear();
      console.log('🗑️ Invalidating ALL cache entries');
    }
  }

  // ✅ REFACTORED: Obtener salario base del empleado
  private async getEmployeeSalary(employeeId: string): Promise<number> {
    console.log('🔎 Fetching employee salary for backend calculation:', employeeId);
    const { data, error } = await supabase
      .from('employees')
      .select('salario_base')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.warn('⚠️ Could not fetch employee salary:', error);
      return 0;
    }

    const salary = Number(data?.salario_base || 0);
    console.log('💰 Employee salary fetched:', salary);
    return salary;
  }

  // ✅ REFACTORED: Obtener fecha del período
  private async getPeriodDate(periodId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('payroll_periods_real')
      .select('fecha_inicio')
      .eq('id', periodId)
      .single();

    if (error || !data) {
      console.warn('⚠️ Could not fetch period date:', error);
      return undefined;
    }

    return data.fecha_inicio;
  }

  // ✅ PROFESIONAL: Calcular totales usando backend centralizado - NUEVA IMPLEMENTACIÓN
  async calculateEmployeeNovedadesTotals(employeeId: string, periodId: string): Promise<NovedadesTotals> {
    const cacheKey = this.generateCacheKey(employeeId, periodId);

    if (cache.has(cacheKey)) {
      console.log(`✅ Cache hit for employee ${employeeId} in period ${periodId}`);
      return cache.get(cacheKey)!;
    }

    try {
      console.log(`🧮 PROFESSIONAL: Calculating novedades totals via backend for employee ${employeeId} in period ${periodId}`);
      
      // Obtener datos necesarios
      const [employeeSalary, fechaPeriodo, novedades] = await Promise.all([
        this.getEmployeeSalary(employeeId),
        this.getPeriodDate(periodId),
        this.getEmployeeNovedades(employeeId, periodId)
      ]);

      if (employeeSalary <= 0) {
        console.warn('⚠️ Invalid employee salary, returning zeros');
        return {
          totalDevengos: 0,
          totalDeducciones: 0,
          totalNeto: 0,
          hasNovedades: false
        };
      }

      // ✅ BACKEND CALL: Usar el endpoint profesional con breakdown
      const backendInput: BackendNovedadesTotalsInput = {
        salarioBase: employeeSalary,
        fechaPeriodo,
        novedades: novedades.map(novedad => ({
          tipo_novedad: novedad.tipo_novedad,
          subtipo: novedad.subtipo,
          valor: novedad.valor,
          dias: (novedad as any).dias,
          horas: (novedad as any).horas,
          constitutivo_salario: novedad.tipo_novedad === 'horas_extra' || novedad.tipo_novedad === 'recargo_nocturno'
        }))
      };

      console.log('📞 BACKEND CALL: Calling professional calculation service with breakdown:', {
        employeeId,
        salarioBase: backendInput.salarioBase,
        novedadesCount: backendInput.novedades.length
      });

      const { data: backendResponse, error: backendError } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate-novedades-totals',
          data: backendInput
        }
      });

      if (backendError) {
        console.error('❌ Backend calculation error:', backendError);
        throw new Error('Error en el cálculo backend de novedades');
      }

      if (!backendResponse.success) {
        throw new Error(backendResponse.error || 'Error desconocido en cálculo backend');
      }

      const backendResult = backendResponse.data as BackendNovedadesTotalsResult;
      
      // ✅ NUEVO: Log del breakdown para debugging
      console.log('📊 BACKEND BREAKDOWN:', {
        employeeId,
        breakdown: backendResult.breakdown?.map(item => ({
          tipo: item.tipo_novedad,
          subtipo: item.subtipo,
          valorOriginal: item.valorOriginal,
          valorCalculado: item.valorCalculado,
          detalle: item.detalleCalculo
        }))
      });
      
      const totals: NovedadesTotals = {
        totalDevengos: backendResult.totalDevengos,
        totalDeducciones: backendResult.totalDeducciones,
        totalNeto: backendResult.totalNeto,
        hasNovedades: novedades.length > 0
      };

      console.log('✅ PROFESSIONAL: Backend totals calculated with normative values:', {
        employeeId,
        totalDevengos: totals.totalDevengos,
        totalDeducciones: totals.totalDeducciones,
        totalNeto: totals.totalNeto,
        hasNovedades: totals.hasNovedades,
        breakdownItems: backendResult.breakdown.length
      });

      cache.set(cacheKey, totals);
      return totals;

    } catch (error) {
      console.error('❌ Error calculating employee novedades totals via backend:', error);
      return {
        totalDevengos: 0,
        totalDeducciones: 0,
        totalNeto: 0,
        hasNovedades: false
      };
    }
  }

  // ✅ NUEVO: Método para obtener breakdown detallado (opcional, para UI avanzada)
  async getEmployeeNovedadesBreakdown(employeeId: string, periodId: string): Promise<any[]> {
    try {
      const [employeeSalary, fechaPeriodo, novedades] = await Promise.all([
        this.getEmployeeSalary(employeeId),
        this.getPeriodDate(periodId),
        this.getEmployeeNovedades(employeeId, periodId)
      ]);

      if (employeeSalary <= 0 || novedades.length === 0) {
        return [];
      }

      const backendInput: BackendNovedadesTotalsInput = {
        salarioBase: employeeSalary,
        fechaPeriodo,
        novedades: novedades.map(novedad => ({
          tipo_novedad: novedad.tipo_novedad,
          subtipo: novedad.subtipo,
          valor: novedad.valor,
          dias: (novedad as any).dias,
          horas: (novedad as any).horas,
          constitutivo_salario: novedad.tipo_novedad === 'horas_extra' || novedad.tipo_novedad === 'recargo_nocturno'
        }))
      };

      const { data: backendResponse } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate-novedades-totals',
          data: backendInput
        }
      });

      return backendResponse?.success ? (backendResponse.data?.breakdown || []) : [];
    } catch (error) {
      console.error('❌ Error getting novedades breakdown:', error);
      return [];
    }
  }

  async calculateAllEmployeesNovedadesTotals(employeeIds: string[], periodId: string): Promise<Record<string, NovedadesTotals>> {
    const totals: Record<string, NovedadesTotals> = {};

    if (!employeeIds || employeeIds.length === 0) {
      console.log('No employee IDs provided, skipping calculation');
      return totals;
    }

    console.log(`📊 PROFESSIONAL: Calculating novedades totals via backend for ${employeeIds.length} employees in period ${periodId}`);

    // ✅ PROFESIONAL: Usar backend para cada empleado
    for (const employeeId of employeeIds) {
      try {
        const employeeTotals = await this.calculateEmployeeNovedadesTotals(employeeId, periodId);
        totals[employeeId] = employeeTotals;
      } catch (error) {
        console.error(`❌ Error calculating backend totals for employee ${employeeId}:`, error);
        totals[employeeId] = {
          totalDevengos: 0,
          totalDeducciones: 0,
          totalNeto: 0,
          hasNovedades: false
        };
      }
    }

    return totals;
  }

  async getEmployeeNovedades(employeeId: string, periodId: string): Promise<PayrollNovedad[]> {
    if (!employeeId || !periodId) {
      console.log('❌ Missing employeeId or periodId for novedades fetch');
      return [];
    }

    try {
      console.log(`📋 Fetching novedades for employee ${employeeId} in period ${periodId}`);
      
      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employee novedades:', error);
        throw error;
      }

      // ✅ Transform the data to match PayrollNovedad interface
      const transformedData: PayrollNovedad[] = (data || []).map(item => ({
        ...item,
        base_calculo: typeof (item as any).base_calculo === 'string'
          ? JSON.parse((item as any).base_calculo || '{}')
          : (item as any).base_calculo || undefined
      }));

      console.log(`✅ Found ${transformedData.length} novedades for employee`);
      return transformedData;
    } catch (error) {
      console.error('❌ Error in getEmployeeNovedades:', error);
      return [];
    }
  }
}

export const NovedadesCalculationService = new NovedadesCalculationServiceClass();
