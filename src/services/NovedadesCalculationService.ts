
import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades-enhanced';

export interface NovedadesTotals {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  hasNovedades: boolean;
}

export class NovedadesCalculationService {
  private static cache = new Map<string, NovedadesTotals>();
  
  static async calculateEmployeeNovedadesTotals(employeeId: string, periodId: string): Promise<NovedadesTotals> {
    const cacheKey = `${employeeId}-${periodId}`;
    
    try {
      console.log(`🧮 Calculating novelties for employee ${employeeId} in period ${periodId}`);
      
      // Get regular novedades
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        console.error('❌ Error getting novelties:', novedadesError);
        return this.getEmptyTotals();
      }

      // Get current user company for vacation filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return this.getEmptyTotals();
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        console.error('❌ No company found for user');
        return this.getEmptyTotals();
      }

      // Get period dates to filter vacation periods
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin')
        .eq('id', periodId)
        .single();

      if (!period) {
        console.error('❌ Period not found');
        return this.getEmptyTotals();
      }

      // ✅ CAMBIO CRÍTICO: Solo incluir vacaciones/ausencias PENDIENTES que caigan en el período
      const { data: vacationPeriods, error: vacationError } = await supabase
        .from('employee_vacation_periods')
        .select(`
          *,
          employees!inner(salario_base)
        `)
        .eq('employee_id', employeeId)
        .eq('company_id', profile.company_id)
        .eq('status', 'pendiente')
        .gte('start_date', period.fecha_inicio)
        .lte('end_date', period.fecha_fin);

      if (vacationError) {
        console.error('❌ Error getting vacation periods:', vacationError);
      }

      const allNovedades = novedades || [];
      const allVacationPeriods = vacationPeriods || [];

      if (allNovedades.length === 0 && allVacationPeriods.length === 0) {
        console.log(`ℹ️ No novelties or vacation periods found for employee ${employeeId}`);
        const emptyTotals = this.getEmptyTotals();
        this.cache.set(cacheKey, emptyTotals);
        return emptyTotals;
      }

      console.log(`📊 Found ${allNovedades.length} novelties and ${allVacationPeriods.length} pending vacation periods:`, {
        novedades: allNovedades,
        vacationPeriods: allVacationPeriods
      });
      
      const totals = this.calculateTotalsFromNovedadesAndVacations(
        allNovedades as PayrollNovedad[], 
        allVacationPeriods
      );
      this.cache.set(cacheKey, totals);
      
      console.log(`✅ Totals calculated for ${employeeId}:`, totals);
      return totals;
      
    } catch (error) {
      console.error('💥 Critical error calculating novelties:', error);
      return this.getEmptyTotals();
    }
  }

  static async calculateAllEmployeesNovedadesTotals(employeeIds: string[], periodId: string): Promise<Record<string, NovedadesTotals>> {
    console.log(`🔄 Calculating novelties for ${employeeIds.length} employees`);
    
    const results: Record<string, NovedadesTotals> = {};
    
    // Process in parallel for better performance
    const promises = employeeIds.map(async (employeeId) => {
      const totals = await this.calculateEmployeeNovedadesTotals(employeeId, periodId);
      return { employeeId, totals };
    });

    const allResults = await Promise.all(promises);
    
    allResults.forEach(({ employeeId, totals }) => {
      results[employeeId] = totals;
    });

    return results;
  }

  private static calculateTotalsFromNovedadesAndVacations(
    novedades: PayrollNovedad[], 
    vacationPeriods: any[]
  ): NovedadesTotals {
    let totalDevengos = 0;
    let totalDeducciones = 0;

    // Process regular novedades
    novedades.forEach(novedad => {
      const valor = Number(novedad.valor) || 0;
      
      console.log(`💰 Processing novelty: ${novedad.tipo_novedad} = $${valor}`);
      
      if (this.isDevengado(novedad.tipo_novedad)) {
        totalDevengos += valor;
        console.log(`➕ Added to earnings: $${valor} (total: $${totalDevengos})`);
      } else if (this.isDeduccion(novedad.tipo_novedad)) {
        totalDeducciones += valor;
        console.log(`➖ Added to deductions: $${valor} (total: $${totalDeducciones})`);
      }
    });

    // Process vacation/absence periods
    vacationPeriods.forEach(period => {
      const salarioBase = period.employees?.salario_base || 0;
      const dias = period.days_count || 0;
      const valor = this.calculateVacationAbsenceValue(period.type, salarioBase, dias);
      
      console.log(`🏖️ Processing pending vacation/absence: ${period.type} = $${valor} (${dias} days) - PENDIENTE`);
      
      if (this.isVacationDevengo(period.type)) {
        totalDevengos += valor;
        console.log(`➕ Added vacation to earnings: $${valor} (total: $${totalDevengos})`);
      } else if (this.isVacationDeduccion(period.type)) {
        totalDeducciones += valor;
        console.log(`➖ Added absence to deductions: $${valor} (total: $${totalDeducciones})`);
      }
    });

    const totalNeto = totalDevengos - totalDeducciones;
    const hasItems = novedades.length > 0 || vacationPeriods.length > 0;

    const result = {
      totalDevengos,
      totalDeducciones,
      totalNeto,
      hasNovedades: hasItems
    };

    console.log(`📈 Final calculation result:`, result);
    return result;
  }

  private static calculateVacationAbsenceValue(type: string, salarioBase: number, dias: number): number {
    const dailySalary = salarioBase / 30;
    
    switch (type) {
      case 'vacaciones':
      case 'licencia_remunerada':
        // These are paid, so they're devengos
        return dailySalary * dias;
      
      case 'incapacidad':
        // First 2 days unpaid, rest paid at 66.67%
        const payableDays = Math.max(0, dias - 2);
        return dailySalary * payableDays * 0.6667;
      
      case 'ausencia':
      case 'licencia_no_remunerada':
        // These are deductions from salary
        return dailySalary * dias;
      
      default:
        return 0;
    }
  }

  private static isVacationDevengo(type: string): boolean {
    return ['vacaciones', 'licencia_remunerada', 'incapacidad'].includes(type);
  }

  private static isVacationDeduccion(type: string): boolean {
    return ['ausencia', 'licencia_no_remunerada'].includes(type);
  }

  private static isDevengado(tipoNovedad: string): boolean {
    const devengados = [
      'horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada',
      'incapacidad', 'bonificacion', 'bonificacion_salarial', 'bonificacion_no_salarial',
      'comision', 'prima', 'otros_ingresos', 'auxilio_conectividad', 'viaticos',
      'retroactivos', 'compensacion_ordinaria'
    ];
    return devengados.includes(tipoNovedad);
  }

  private static isDeduccion(tipoNovedad: string): boolean {
    const deducciones = [
      'libranza', 'multa', 'ausencia', 'descuento_voluntario', 'retencion_fuente',
      'fondo_solidaridad', 'salud', 'pension', 'arl', 'caja_compensacion',
      'icbf', 'sena', 'embargo', 'anticipo', 'aporte_voluntario'
    ];
    return deducciones.includes(tipoNovedad);
  }

  private static getEmptyTotals(): NovedadesTotals {
    return {
      totalDevengos: 0,
      totalDeducciones: 0,
      totalNeto: 0,
      hasNovedades: false
    };
  }

  static invalidateCache(employeeId?: string, periodId?: string) {
    if (employeeId && periodId) {
      const cacheKey = `${employeeId}-${periodId}`;
      this.cache.delete(cacheKey);
      console.log(`🗑️ Cache invalidated for ${cacheKey}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Complete cache invalidated');
    }
  }
}
