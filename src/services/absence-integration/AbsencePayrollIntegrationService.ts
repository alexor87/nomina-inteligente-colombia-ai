import { supabase } from '@/integrations/supabase/client';
import { VacationIntegrationResult, VacationProcessingOptions } from '@/types/vacation-integration';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';
import { calculateBusinessDays } from '@/utils/businessDayCalculator';

export class AbsencePayrollIntegrationService {
  static async processAbsencesForPayroll(options: VacationProcessingOptions): Promise<VacationIntegrationResult> {
    try {
      console.log('Processing absences for payroll period:', options);

      const { data: intersectingAbsences, error: absenceError } = await supabase
        .from('employee_absences')
        .select('*, employees(dias_descanso)')
        .eq('company_id', options.companyId)
        .eq('status', 'pendiente')
        .lte('start_date', options.endDate)
        .gte('end_date', options.startDate);

      if (absenceError) {
        throw new Error(`Error fetching absence periods: ${absenceError.message}`);
      }

      if (!intersectingAbsences || intersectingAbsences.length === 0) {
        return {
          processedVacations: 0,
          createdNovedades: 0,
          conflicts: [],
          success: true,
          message: 'No absence periods found to process'
        };
      }

      console.log(`Found ${intersectingAbsences.length} intersecting absence periods`);

      const processedAbsences: string[] = [];
      let totalProcessedDays = 0;

      for (const absence of intersectingAbsences) {
        const restDays = (absence as any).employees?.dias_descanso || ['sabado', 'domingo'];
        const periodDays = this.calculatePeriodIntersectionDays(
          absence.start_date,
          absence.end_date,
          options.startDate,
          options.endDate,
          absence.type,
          restDays
        );

        if (periodDays > 0) {
          console.log(`Absence ${absence.id}: ${periodDays} days in period ${options.startDate} - ${options.endDate}`);

          const isFullyProcessed = await this.checkIfAbsenceFullyProcessed(
            absence.id,
            absence.start_date,
            absence.end_date,
            options.periodId
          );

          if (isFullyProcessed) {
            const { error: updateError } = await supabase
              .from('employee_absences')
              .update({
                status: 'liquidada',
                processed_in_period_id: options.periodId,
                updated_at: new Date().toISOString()
              })
              .eq('id', absence.id);

            if (updateError) {
              console.error(`Error updating absence ${absence.id}:`, updateError);
            } else {
              console.log(`Absence ${absence.id} marked as fully processed`);
            }
          } else {
            await this.registerPartialProcessing(absence.id, options.periodId, periodDays);
            console.log(`Registered partial processing for absence ${absence.id} in period ${options.periodId}`);
          }

          processedAbsences.push(absence.id);
          totalProcessedDays += periodDays;
        }
      }

      const affectedEmployees = [...new Set(intersectingAbsences.map(v => v.employee_id))];
      affectedEmployees.forEach(employeeId => {
        NovedadesCalculationService.invalidateCache(employeeId, options.periodId);
      });

      console.log(`Processed ${processedAbsences.length} absence intersections with ${totalProcessedDays} total days`);

      return {
        processedVacations: processedAbsences.length,
        createdNovedades: 0,
        conflicts: [],
        success: true,
        message: `Successfully processed ${processedAbsences.length} absence intersections (${totalProcessedDays} days total)`
      };

    } catch (error) {
      console.error('Error processing absences for payroll:', error);
      return {
        processedVacations: 0,
        createdNovedades: 0,
        conflicts: [],
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static calculatePeriodIntersectionDays(
    absenceStart: string,
    absenceEnd: string,
    periodStart: string,
    periodEnd: string,
    absenceType?: string,
    restDays: string[] = ['sabado', 'domingo']
  ): number {
    const absStartDate = new Date(absenceStart);
    const absEndDate = new Date(absenceEnd);
    const perStartDate = new Date(periodStart);
    const perEndDate = new Date(periodEnd);

    const intersectionStart = new Date(Math.max(absStartDate.getTime(), perStartDate.getTime()));
    const intersectionEnd = new Date(Math.min(absEndDate.getTime(), perEndDate.getTime()));

    if (intersectionStart > intersectionEnd) {
      return 0;
    }

    const intStartStr = intersectionStart.toISOString().split('T')[0];
    const intEndStr = intersectionEnd.toISOString().split('T')[0];

    // Vacaciones: contar días HÁBILES (excluye días de descanso del empleado y festivos colombianos)
    // Otros tipos (incapacidad, etc.): contar días calendario
    let diffDays: number;
    if (absenceType === 'vacaciones') {
      diffDays = calculateBusinessDays(intStartStr, intEndStr, restDays);
    } else {
      const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    console.log(`Intersection calculation:`, {
      absence: `${absenceStart} - ${absenceEnd}`,
      period: `${periodStart} - ${periodEnd}`,
      intersection: `${intStartStr} - ${intEndStr}`,
      days: diffDays,
      type: absenceType || 'unknown',
      method: absenceType === 'vacaciones' ? 'business_days' : 'calendar_days'
    });

    return Math.max(0, diffDays);
  }

  private static async checkIfAbsenceFullyProcessed(
    absenceId: string,
    absenceStart: string,
    absenceEnd: string,
    currentPeriodId: string
  ): Promise<boolean> {
    try {
      const { data: absence } = await supabase
        .from('employee_absences')
        .select('company_id')
        .eq('id', absenceId)
        .single();

      if (!absence) {
        console.error('Absence not found:', absenceId);
        return false;
      }

      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', absence.company_id)
        .single();

      const periodicity = (companySettings?.periodicity || 'quincenal') as 'mensual' | 'quincenal' | 'semanal';

      const expectedPeriods = this.generateExpectedPeriods(
        absenceStart,
        absenceEnd,
        periodicity
      );

      console.log(`Expected ${expectedPeriods.length} periods for absence ${absenceId} (${periodicity})`);

      const { data: realPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, fecha_inicio, fecha_fin')
        .lte('fecha_inicio', absenceEnd)
        .gte('fecha_fin', absenceStart);

      let processedExpectedPeriods = 0;

      for (const expectedPeriod of expectedPeriods) {
        const matchingReal = realPeriods?.find(real =>
          real.fecha_inicio === expectedPeriod.startDate &&
          real.fecha_fin === expectedPeriod.endDate
        );

        if (matchingReal) {
          if (matchingReal.id === currentPeriodId) {
            processedExpectedPeriods++;
          } else {
            const isProcessed = await this.isPeriodProcessedForAbsence(absenceId, matchingReal.id);
            if (isProcessed) {
              processedExpectedPeriods++;
            }
          }
        }
      }

      const fullyProcessed = processedExpectedPeriods >= expectedPeriods.length;

      console.log(`Absence ${absenceId} coverage:`, {
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
      console.error('Error checking absence processing status:', error);
      return false;
    }
  }

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
        const q1Start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const q1End = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
        periods.push({ startDate: q1Start, endDate: q1End });

        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const q2Start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-16`;
        const q2End = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        periods.push({ startDate: q2Start, endDate: q2End });
      } else if (periodicity === 'mensual') {
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

    const filtered = periods.filter(period => {
      const pStart = new Date(period.startDate);
      const pEnd = new Date(period.endDate);
      return pStart <= end && pEnd >= start;
    });

    return filtered;
  }

  private static calculateTotalAbsenceDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private static async isPeriodProcessedForAbsence(absenceId: string, periodId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('employee_absences')
      .select('processed_in_period_id, status')
      .eq('id', absenceId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.status === 'liquidada' && data.processed_in_period_id === periodId;
  }

  private static async registerPartialProcessing(
    absenceId: string,
    periodId: string,
    processedDays: number
  ): Promise<void> {
    console.log(`Partial processing registered:`, {
      absenceId,
      periodId,
      processedDays,
      timestamp: new Date().toISOString()
    });
  }

  static async detectAbsenceConflicts(companyId: string, startDate: string, endDate: string) {
    try {
      const { data: overlappingAbsences, error } = await supabase
        .from('employee_absences')
        .select(`
          *,
          employees!inner(nombre, apellido)
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelada')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (error) {
        console.error('Error detecting absence conflicts:', error);
        return [];
      }

      return overlappingAbsences || [];
    } catch (error) {
      console.error('Error in detectAbsenceConflicts:', error);
      return [];
    }
  }

  static calculateAbsenceValue(type: string, salary: number, days: number): number {
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
