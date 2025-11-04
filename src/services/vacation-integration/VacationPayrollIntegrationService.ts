import { supabase } from '@/integrations/supabase/client';
import { VacationIntegrationResult, VacationProcessingOptions } from '@/types/vacation-integration';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';

export class VacationPayrollIntegrationService {
  static async processVacationsForPayroll(options: VacationProcessingOptions): Promise<VacationIntegrationResult> {
    try {
      console.log('🔄 Processing vacations for payroll period:', options);

      // ✅ NUEVA LÓGICA: Buscar ausencias que INTERSECTAN con el período (no solo las incluidas completamente)
      const { data: intersectingVacations, error: vacationError } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('company_id', options.companyId)
        .eq('status', 'pendiente')
        .lte('start_date', options.endDate)    // Comienza antes o durante el período
        .gte('end_date', options.startDate);   // Termina después o durante el período

      if (vacationError) {
        throw new Error(`Error fetching vacation periods: ${vacationError.message}`);
      }

      if (!intersectingVacations || intersectingVacations.length === 0) {
        return {
          processedVacations: 0,
          createdNovedades: 0,
          conflicts: [],
          success: true,
          message: 'No vacation periods found to process'
        };
      }

      console.log(`📊 Found ${intersectingVacations.length} intersecting vacation periods`);

      // ✅ NUEVA FUNCIÓN: Procesar cada ausencia calculando días proporcionales
      const processedVacations: string[] = [];
      let totalProcessedDays = 0;

      for (const vacation of intersectingVacations) {
        const periodDays = this.calculatePeriodIntersectionDays(
          vacation.start_date,
          vacation.end_date,
          options.startDate,
          options.endDate
        );

        if (periodDays > 0) {
          console.log(`📅 Vacation ${vacation.id}: ${periodDays} days in period ${options.startDate} - ${options.endDate}`);
          
          // Verificar si todos los períodos de esta ausencia han sido procesados
          const isFullyProcessed = await this.checkIfVacationFullyProcessed(
            vacation.id,
            vacation.start_date,
            vacation.end_date,
            options.periodId
          );

          // Solo actualizar el estado si todos los períodos han sido procesados
          if (isFullyProcessed) {
            const { error: updateError } = await supabase
              .from('employee_vacation_periods')
              .update({
                status: 'liquidada',
                processed_in_period_id: options.periodId,
                updated_at: new Date().toISOString()
              })
              .eq('id', vacation.id);

            if (updateError) {
              console.error(`Error updating vacation ${vacation.id}:`, updateError);
            } else {
              console.log(`✅ Vacation ${vacation.id} marked as fully processed`);
            }
          } else {
            // Registrar que este período ha procesado parte de la ausencia
            await this.registerPartialProcessing(vacation.id, options.periodId, periodDays);
            console.log(`📝 Registered partial processing for vacation ${vacation.id} in period ${options.periodId}`);
          }

          processedVacations.push(vacation.id);
          totalProcessedDays += periodDays;
        }
      }

      // Invalidar cache para empleados afectados
      const affectedEmployees = [...new Set(intersectingVacations.map(v => v.employee_id))];
      affectedEmployees.forEach(employeeId => {
        NovedadesCalculationService.invalidateCache(employeeId, options.periodId);
      });

      console.log(`✅ Processed ${processedVacations.length} vacation intersections with ${totalProcessedDays} total days`);

      return {
        processedVacations: processedVacations.length,
        createdNovedades: 0,
        conflicts: [],
        success: true,
        message: `Successfully processed ${processedVacations.length} vacation/absence intersections (${totalProcessedDays} days total)`
      };

    } catch (error) {
      console.error('❌ Error processing vacations for payroll:', error);
      return {
        processedVacations: 0,
        createdNovedades: 0,
        conflicts: [],
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ✅ NUEVA FUNCIÓN: Calcular días de intersección entre ausencia y período
  private static calculatePeriodIntersectionDays(
    vacationStart: string,
    vacationEnd: string,
    periodStart: string,
    periodEnd: string
  ): number {
    const vacStartDate = new Date(vacationStart);
    const vacEndDate = new Date(vacationEnd);
    const perStartDate = new Date(periodStart);
    const perEndDate = new Date(periodEnd);

    // Calcular la intersección
    const intersectionStart = new Date(Math.max(vacStartDate.getTime(), perStartDate.getTime()));
    const intersectionEnd = new Date(Math.min(vacEndDate.getTime(), perEndDate.getTime()));

    // Si no hay intersección, retornar 0
    if (intersectionStart > intersectionEnd) {
      return 0;
    }

    // Calcular días de intersección (inclusive)
    const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    console.log(`🔍 Intersection calculation:`, {
      vacation: `${vacationStart} - ${vacationEnd}`,
      period: `${periodStart} - ${periodEnd}`,
      intersection: `${intersectionStart.toISOString().split('T')[0]} - ${intersectionEnd.toISOString().split('T')[0]}`,
      days: diffDays
    });

    return Math.max(0, diffDays);
  }

  // ✅ CORRECCIÓN: Verificar si una ausencia ha sido completamente procesada considerando períodos esperados
  private static async checkIfVacationFullyProcessed(
    vacationId: string,
    vacationStart: string,
    vacationEnd: string,
    currentPeriodId: string
  ): Promise<boolean> {
    try {
      // 1. Obtener la periodicidad configurada de la empresa
      const { data: vacation } = await supabase
        .from('employee_vacation_periods')
        .select('company_id')
        .eq('id', vacationId)
        .single();

      if (!vacation) {
        console.error('Vacation not found:', vacationId);
        return false;
      }

      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', vacation.company_id)
        .single();

      const periodicity = (companySettings?.periodicity || 'quincenal') as 'mensual' | 'quincenal' | 'semanal';

      // 2. Generar TODOS los períodos esperados (no solo los que existen en BD)
      const expectedPeriods = this.generateExpectedPeriods(
        vacationStart,
        vacationEnd,
        periodicity
      );

      console.log(`📊 Expected ${expectedPeriods.length} periods for vacation ${vacationId} (${periodicity})`);

      // 3. Buscar períodos reales que intersectan
      const { data: realPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, fecha_inicio, fecha_fin')
        .lte('fecha_inicio', vacationEnd)
        .gte('fecha_fin', vacationStart);

      // 4. Verificar cobertura: contar cuántos períodos esperados YA fueron procesados
      let processedExpectedPeriods = 0;

      for (const expectedPeriod of expectedPeriods) {
        // Buscar si hay un período real que cubra este período esperado
        const matchingReal = realPeriods?.find(real =>
          real.fecha_inicio === expectedPeriod.startDate &&
          real.fecha_fin === expectedPeriod.endDate
        );

        if (matchingReal) {
          // Si este es el período actual, ya está siendo procesado ahora
          if (matchingReal.id === currentPeriodId) {
            processedExpectedPeriods++;
          } else {
            // Verificar si ya fue procesado anteriormente
            const isProcessed = await this.isPeriodProcessedForVacation(vacationId, matchingReal.id);
            if (isProcessed) {
              processedExpectedPeriods++;
            }
          }
        }
        // Si no hay matchingReal, este período esperado NO ha sido procesado
      }

      // Solo está completamente procesada si TODOS los períodos esperados han sido procesados
      const fullyProcessed = processedExpectedPeriods >= expectedPeriods.length;

      console.log(`📊 Vacation ${vacationId} coverage:`, {
        periodicity,
        expectedPeriods: expectedPeriods.length,
        processedPeriods: processedExpectedPeriods,
        fullyProcessed,
        details: expectedPeriods.map(ep => ({
          period: `${ep.startDate} - ${ep.endDate}`,
          hasReal: realPeriods?.some(rp => rp.fecha_inicio === ep.startDate && rp.fecha_fin === ep.endDate)
        }))
      });

      return fullyProcessed;
    } catch (error) {
      console.error('Error checking vacation processing status:', error);
      // En caso de error, NO marcar como procesada (mantener 'pendiente')
      return false;
    }
  }

  // ✅ NUEVO: Genera los períodos teóricos que DEBERÍAN cubrir una ausencia
  private static generateExpectedPeriods(
    startDate: string,
    endDate: string,
    periodicity: 'mensual' | 'quincenal' | 'semanal'
  ): Array<{ startDate: string; endDate: string }> {
    const periods: Array<{ startDate: string; endDate: string }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let currentYear = start.getFullYear();
    let currentMonth = start.getMonth();

    while (currentYear < end.getFullYear() || 
           (currentYear === end.getFullYear() && currentMonth <= end.getMonth())) {
      
      if (periodicity === 'quincenal') {
        // Primera quincena: 1-15
        const q1Start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const q1End = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
        periods.push({ startDate: q1Start, endDate: q1End });

        // Segunda quincena: 16-fin de mes
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const q2Start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-16`;
        const q2End = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        periods.push({ startDate: q2Start, endDate: q2End });
      } else if (periodicity === 'mensual') {
        // Período mensual: 1-fin de mes
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const mStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const mEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        periods.push({ startDate: mStart, endDate: mEnd });
      }

      currentMonth++;
      if (currentMonth === 12) {
        currentMonth = 0;
        currentYear++;
      }
    }

    // Filtrar solo los que intersectan con el rango de la ausencia
    const filtered = periods.filter(period => {
      const pStart = new Date(period.startDate);
      const pEnd = new Date(period.endDate);
      return pStart <= end && pEnd >= start;
    });

    return filtered;
  }

  // ✅ FUNCIÓN AUXILIAR: Calcular días totales de una ausencia
  private static calculateTotalVacationDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // ✅ FUNCIÓN AUXILIAR: Verificar si un período ya procesó una ausencia
  private static async isPeriodProcessedForVacation(vacationId: string, periodId: string): Promise<boolean> {
    // Esto se puede implementar con una tabla de tracking o verificando el campo processed_in_period_id
    // Por simplicidad, verificamos si la ausencia tiene el período registrado
    const { data, error } = await supabase
      .from('employee_vacation_periods')
      .select('processed_in_period_id, status')
      .eq('id', vacationId)
      .single();

    if (error || !data) {
      return false;
    }

    // Si está liquidada y el período coincide, ya fue procesada
    return data.status === 'liquidada' && data.processed_in_period_id === periodId;
  }

  // ✅ FUNCIÓN AUXILIAR: Registrar procesamiento parcial (para tracking futuro)
  private static async registerPartialProcessing(
    vacationId: string,
    periodId: string,
    processedDays: number
  ): Promise<void> {
    // Por ahora, solo loggeamos. En el futuro se podría implementar una tabla de tracking
    console.log(`📝 Partial processing registered:`, {
      vacationId,
      periodId,
      processedDays,
      timestamp: new Date().toISOString()
    });
  }

  static async detectVacationConflicts(companyId: string, startDate: string, endDate: string) {
    try {
      const { data: overlappingVacations, error } = await supabase
        .from('employee_vacation_periods')
        .select(`
          *,
          employees!inner(nombre, apellido)
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelada')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (error) {
        console.error('Error detecting vacation conflicts:', error);
        return [];
      }

      return overlappingVacations || [];
    } catch (error) {
      console.error('Error in detectVacationConflicts:', error);
      return [];
    }
  }

  static calculateVacationValue(type: string, salary: number, days: number): number {
    const dailySalary = salary / 30;
    
    switch (type) {
      case 'vacaciones':
      case 'licencia_remunerada':
        return dailySalary * days;
      
      case 'incapacidad':
        const payableDays = Math.max(0, days - 2);
        return dailySalary * payableDays * 0.6667;
      
      case 'ausencia':
      case 'licencia_no_remunerada':
        return dailySalary * days;
      
      default:
        return 0;
    }
  }
}
