
import { supabase } from '@/integrations/supabase/client';
import { VacationIntegrationResult, VacationProcessingOptions } from '@/types/vacation-integration';
import { NovedadesCalculationService } from '@/services/NovedadesCalculationService';

export class VacationPayrollIntegrationService {
  static async processVacationsForPayroll(options: VacationProcessingOptions): Promise<VacationIntegrationResult> {
    try {
      console.log('🔄 Processing vacations for payroll period:', options);

      // Get pending vacation periods that fall within the payroll period
      const { data: pendingVacations, error: vacationError } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('company_id', options.companyId)
        .eq('status', 'pendiente')
        .gte('start_date', options.startDate)
        .lte('end_date', options.endDate);

      if (vacationError) {
        throw new Error(`Error fetching vacation periods: ${vacationError.message}`);
      }

      if (!pendingVacations || pendingVacations.length === 0) {
        return {
          processedVacations: 0,
          createdNovedades: 0,
          conflicts: [],
          success: true,
          message: 'No vacation periods found to process'
        };
      }

      // ✅ CAMBIO CRÍTICO: Cambiar status de 'pendiente' a 'liquidado' (masculino)
      const { error: updateError } = await supabase
        .from('employee_vacation_periods')
        .update({
          status: 'liquidada',
          processed_in_period_id: options.periodId,
          updated_at: new Date().toISOString()
        })
        .in('id', pendingVacations.map(v => v.id));

      if (updateError) {
        throw new Error(`Error updating vacation periods: ${updateError.message}`);
      }

      // Invalidate cache for affected employees
      const affectedEmployees = [...new Set(pendingVacations.map(v => v.employee_id))];
      affectedEmployees.forEach(employeeId => {
        NovedadesCalculationService.invalidateCache(employeeId, options.periodId);
      });

      console.log(`✅ Processed ${pendingVacations.length} vacation periods for ${affectedEmployees.length} employees`);

      return {
        processedVacations: pendingVacations.length,
        createdNovedades: 0, // We're not creating separate novedades, just processing existing vacation periods
        conflicts: [],
        success: true,
        message: `Successfully processed ${pendingVacations.length} vacation/absence periods`
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
