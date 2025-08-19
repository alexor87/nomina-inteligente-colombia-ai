
import { supabase } from '@/integrations/supabase/client';

export class PayrollAutomationService {
  /**
   * ✅ KISS: Procesar ausencias automáticamente durante liquidación
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
        .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'ausencia', 'incapacidad'])
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
              absence.tipo_novedad,
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
   * ✅ KISS: Calcular valor de ausencia según tipo
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
      case 'vacaciones':
      case 'licencia_remunerada':
        return dailySalary * days; // Pagado al 100%
      
      case 'incapacidad':
        // ✅ CORRECCIÓN NORMATIVA: Enfermedad general se reconoce al 66.67% todos los días.
        // Días 1 y 2: paga empleador. Día 3 en adelante: EPS. (Clasificación como devengo no salarial)
        return dailySalary * days * 0.6667;
      
      case 'ausencia':
      default:
        return 0; // No remunerada
    }
  }

  /**
   * ✅ KISS: Verificar si hay ausencias automáticas para un período
   */
  static async checkAutomaticAbsencesForPeriod(
    companyId: string,
    payrollStartDate: string,
    payrollEndDate: string
  ): Promise<{ 
    hasAbsences: boolean; 
    recordsCount: number; 
    employeesAffected: string[] 
  }> {
    try {
      const { data: absences, error } = await supabase
        .from('payroll_novedades')
        .select('empleado_id')
        .eq('company_id', companyId)
        .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'ausencia', 'incapacidad'])
        .gte('fecha_inicio', payrollStartDate)
        .lte('fecha_fin', payrollEndDate);

      if (error || !absences) {
        return { hasAbsences: false, recordsCount: 0, employeesAffected: [] };
      }

      const employeesAffected = [...new Set(absences.map(a => a.empleado_id))];

      return {
        hasAbsences: absences.length > 0,
        recordsCount: absences.length,
        employeesAffected
      };

    } catch (error) {
      console.error('Error checking automatic absences:', error);
      return { hasAbsences: false, recordsCount: 0, employeesAffected: [] };
    }
  }
}

