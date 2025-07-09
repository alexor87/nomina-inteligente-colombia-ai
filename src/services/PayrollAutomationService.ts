import { supabase } from '@/integrations/supabase/client';
import { VacationPeriodsService, VacationPeriod } from './VacationPeriodsService';

export class PayrollAutomationService {
  /**
   * ✅ KISS: Crear novedades automáticas de vacaciones para un período de nómina
   */
  static async createVacationNovelties(
    companyId: string,
    periodId: string,
    payrollStartDate: string,
    payrollEndDate: string
  ): Promise<{ 
    success: boolean; 
    created: number; 
    errors: string[]; 
  }> {
    console.log('🏖️ Creating automatic vacation novelties for payroll period:', {
      companyId,
      periodId,
      payrollStartDate,
      payrollEndDate
    });

    let created = 0;
    const errors: string[] = [];

    try {
      // 1. Obtener períodos de vacaciones confirmados que cruzan con el período de nómina
      const periodsResult = await VacationPeriodsService.getPeriodsForPayrollPeriod(
        companyId,
        payrollStartDate,
        payrollEndDate
      );

      if (!periodsResult.success || !periodsResult.data) {
        return { success: false, created: 0, errors: [periodsResult.error || 'No se pudieron obtener los períodos'] };
      }

      const vacationPeriods = periodsResult.data;
      console.log(`📋 Found ${vacationPeriods.length} confirmed vacation periods to process`);

      // 2. Procesar cada período de vacaciones confirmado
      for (const period of vacationPeriods) {
        try {
          await this.processVacationPeriod(period, periodId, payrollStartDate, payrollEndDate);
          created++;
          console.log(`✅ Processed confirmed vacation period ${period.id} for employee ${period.employee_id}`);
        } catch (error: any) {
          const errorMsg = `Error procesando período confirmado ${period.id}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      return { 
        success: true, 
        created, 
        errors 
      };

    } catch (error: any) {
      console.error('💥 Error in createVacationNovelties:', error);
      return { 
        success: false, 
        created, 
        errors: [error.message] 
      };
    }
  }

  /**
   * ✅ KISS: Procesar un período de vacaciones individual
   */
  private static async processVacationPeriod(
    period: VacationPeriod,
    periodId: string,
    payrollStartDate: string,
    payrollEndDate: string
  ): Promise<void> {
    // 1. Obtener datos del empleado para cálculo de salario
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('salario_base')
      .eq('id', period.employee_id)
      .single();

    if (employeeError || !employee) {
      throw new Error(`No se pudo obtener información del empleado ${period.employee_id}`);
    }

    // 2. Calcular días de cruce entre período de vacaciones y período de nómina
    const overlapDays = this.calculateOverlapDays(
      period.start_date,
      period.end_date,
      payrollStartDate,
      payrollEndDate
    );

    if (overlapDays <= 0) {
      console.log(`ℹ️ No overlap found for confirmed period ${period.id}`);
      return;
    }

    // 3. Calcular valor de la novedad
    const dailySalary = employee.salario_base / 30;
    const vacationValue = dailySalary * overlapDays;

    console.log(`💰 Vacation calculation for confirmed period:`, {
      employeeId: period.employee_id,
      overlapDays,
      dailySalary,
      vacationValue
    });

    // 4. Crear novedad de vacaciones
    const { error: noveltyError } = await supabase
      .from('payroll_novedades')
      .insert({
        company_id: period.company_id,
        empleado_id: period.employee_id,
        periodo_id: periodId,
        tipo_novedad: 'vacaciones',
        fecha_inicio: this.getMaxDate(period.start_date, payrollStartDate),
        fecha_fin: this.getMinDate(period.end_date, payrollEndDate),
        dias: overlapDays,
        valor: vacationValue,
        observacion: `Vacaciones confirmadas automáticas (Período: ${period.start_date} - ${period.end_date})`,
        creado_por: null // Sistema automático
      });

    if (noveltyError) {
      throw new Error(`Error creando novedad: ${noveltyError.message}`);
    }

    // 5. Marcar período confirmado como procesado
    await VacationPeriodsService.markAsProcessed(period.id, periodId);
  }

  /**
   * ✅ Calcular días de solapamiento entre dos rangos de fechas
   */
  private static calculateOverlapDays(
    vacationStart: string,
    vacationEnd: string,
    payrollStart: string,
    payrollEnd: string
  ): number {
    const vStart = new Date(vacationStart);
    const vEnd = new Date(vacationEnd);
    const pStart = new Date(payrollStart);
    const pEnd = new Date(payrollEnd);

    // Encontrar el rango de solapamiento
    const overlapStart = new Date(Math.max(vStart.getTime(), pStart.getTime()));
    const overlapEnd = new Date(Math.min(vEnd.getTime(), pEnd.getTime()));

    if (overlapStart > overlapEnd) {
      return 0; // No hay solapamiento
    }

    // Calcular días hábiles en el rango de solapamiento
    return VacationPeriodsService.calculateBusinessDays(
      overlapStart.toISOString().split('T')[0],
      overlapEnd.toISOString().split('T')[0]
    );
  }

  /**
   * Obtener la fecha mayor entre dos fechas
   */
  private static getMaxDate(date1: string, date2: string): string {
    return new Date(date1) > new Date(date2) ? date1 : date2;
  }

  /**
   * Obtener la fecha menor entre dos fechas
   */
  private static getMinDate(date1: string, date2: string): string {
    return new Date(date1) < new Date(date2) ? date1 : date2;
  }

  /**
   * ✅ KISS: Verificar si hay vacaciones automáticas para un período
   */
  static async checkAutomaticVacationsForPeriod(
    companyId: string,
    payrollStartDate: string,
    payrollEndDate: string
  ): Promise<{ 
    hasVacations: boolean; 
    periodsCount: number; 
    employeesAffected: string[] 
  }> {
    try {
      const periodsResult = await VacationPeriodsService.getPeriodsForPayrollPeriod(
        companyId,
        payrollStartDate,
        payrollEndDate
      );

      if (!periodsResult.success || !periodsResult.data) {
        return { hasVacations: false, periodsCount: 0, employeesAffected: [] };
      }

      const periods = periodsResult.data;
      const employeesAffected = [...new Set(periods.map(p => p.employee_id))];

      return {
        hasVacations: periods.length > 0,
        periodsCount: periods.length,
        employeesAffected
      };

    } catch (error) {
      console.error('Error checking automatic vacations:', error);
      return { hasVacations: false, periodsCount: 0, employeesAffected: [] };
    }
  }
}
