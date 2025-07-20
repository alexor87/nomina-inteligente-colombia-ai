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

  // ✅ NUEVA FUNCIÓN: Verificar si una ausencia ha sido completamente procesada
  private static async checkIfVacationFullyProcessed(
    vacationId: string,
    vacationStart: string,
    vacationEnd: string,
    currentPeriodId: string
  ): Promise<boolean> {
    try {
      // Obtener todos los períodos que intersectan con esta ausencia
      const { data: intersectingPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('id, fecha_inicio, fecha_fin')
        .lte('fecha_inicio', vacationEnd)
        .gte('fecha_fin', vacationStart);

      if (error || !intersectingPeriods) {
        console.error('Error checking intersecting periods:', error);
        return true; // En caso de error, procesar la ausencia
      }

      // Verificar si todos los períodos intersectantes han procesado esta ausencia
      let totalProcessedDays = 0;
      const vacationTotalDays = this.calculateTotalVacationDays(vacationStart, vacationEnd);

      for (const period of intersectingPeriods) {
        const periodDays = this.calculatePeriodIntersectionDays(
          vacationStart,
          vacationEnd,
          period.fecha_inicio,
          period.fecha_fin
        );

        if (period.id === currentPeriodId) {
          // Este es el período actual, contar sus días
          totalProcessedDays += periodDays;
        } else {
          // Verificar si este período ya procesó esta ausencia
          const isProcessed = await this.isPeriodProcessedForVacation(vacationId, period.id);
          if (isProcessed) {
            totalProcessedDays += periodDays;
          }
        }
      }

      const fullyProcessed = totalProcessedDays >= vacationTotalDays;
      console.log(`📊 Vacation ${vacationId} processing status:`, {
        totalDays: vacationTotalDays,
        processedDays: totalProcessedDays,
        fullyProcessed
      });

      return fullyProcessed;
    } catch (error) {
      console.error('Error checking vacation processing status:', error);
      return true; // En caso de error, procesar la ausencia
    }
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
