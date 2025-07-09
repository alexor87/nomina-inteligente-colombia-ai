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
   * ✅ NUEVO: Procesar ausencias automáticamente durante liquidación
   */
  static async processAbsencesForPeriod(
    companyId: string,
    periodId: string,
    payrollStartDate: string,
    payrollEndDate: string
  ): Promise<{ 
    success: boolean; 
    processed: number; 
    errors: string[]; 
  }> {
    console.log('🚫 Processing automatic absences for payroll period:', {
      companyId,
      periodId,
      payrollStartDate,
      payrollEndDate
    });

    let processed = 0;
    const errors: string[] = [];

    try {
      // 1. Obtener ausencias que cruzan con el período de nómina
      const { data: absences, error: absencesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', periodId)
        .eq('tipo_novedad', 'ausencia')
        .not('fecha_inicio', 'is', null)
        .not('fecha_fin', 'is', null);

      if (absencesError) {
        return { success: false, processed: 0, errors: [absencesError.message] };
      }

      // Las ausencias ya están registradas en payroll_novedades
      // Solo necesitamos calcular valores si no los tienen
      for (const absence of absences || []) {
        if (absence.valor === 0 || absence.valor === null) {
          try {
            const updatedValue = await this.calculateAbsenceValue(
              absence.empleado_id,
              absence.subtipo,
              absence.dias || 0
            );

            await supabase
              .from('payroll_novedades')
              .update({ valor: updatedValue })
              .eq('id', absence.id);

            processed++;
          } catch (error: any) {
            errors.push(`Error procesando ausencia ${absence.id}: ${error.message}`);
          }
        }
      }

      return { 
        success: true, 
        processed, 
        errors 
      };

    } catch (error: any) {
      console.error('💥 Error in processAbsencesForPeriod:', error);
      return { 
        success: false, 
        processed: 0, 
        errors: [error.message] 
      };
    }
  }

  /**
   * ✅ NUEVO: Calcular valor de ausencia según tipo
   */
  private static async calculateAbsenceValue(
    employeeId: string,
    absenceType: string,
    days: number
  ): Promise<number> {
    // Obtener salario del empleado
    const { data: employee, error } = await supabase
      .from('employees')
      .select('salario_base')
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      throw new Error(`No se pudo obtener salario del empleado ${employeeId}`);
    }

    const dailySalary = employee.salario_base / 30;

    // Calcular según tipo de ausencia
    switch (absenceType) {
      case 'licencia_remunerada':
      case 'licencia_maternidad':
      case 'licencia_paternidad':
        return dailySalary * days; // Pagado al 100%
      
      case 'incapacidad_eps':
        return dailySalary * days * 0.67; // 67% pagado por EPS (después de 3 días)
      
      case 'incapacidad_arl':
        return dailySalary * days * 1.0; // 100% pagado por ARL
      
      case 'calamidad_domestica':
        return dailySalary * Math.min(days, 5); // Máximo 5 días pagados
      
      case 'licencia_no_remunerada':
      default:
        return 0; // No remunerada
    }
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
