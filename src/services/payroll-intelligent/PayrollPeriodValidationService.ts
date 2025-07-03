
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriod } from '@/types/payroll';

export class PayrollPeriodValidationService {
  /**
   * Validar la creación de un nuevo período
   */
  static async validatePeriodCreation(
    startDate: string,
    endDate: string,
    companyId: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    correctedDates?: { startDate: string; endDate: string };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar fechas básicas
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      // 2. Verificar superposición con períodos existentes
      const { data: existingPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .neq('estado', 'borrador');

      if (error) {
        console.error('Error verificando períodos existentes:', error);
        warnings.push('No se pudo verificar superposición con períodos existentes');
      } else if (existingPeriods) {
        const overlapping = existingPeriods.find(period => {
          const periodStart = new Date(period.fecha_inicio).getTime();
          const periodEnd = new Date(period.fecha_fin).getTime();
          const newStart = start.getTime();
          const newEnd = end.getTime();
          
          return newStart <= periodEnd && newEnd >= periodStart;
        });

        if (overlapping) {
          errors.push(`El período se superpone con: ${overlapping.fecha_inicio} - ${overlapping.fecha_fin}`);
        }
      }

      // 3. Validar que solo hay un período abierto a la vez
      const openPeriodValidation = await this.validateSingleOpenPeriod(companyId);
      if (!openPeriodValidation.isValid && openPeriodValidation.openPeriod) {
        errors.push('Ya existe un período abierto. Cierra el período actual antes de crear uno nuevo.');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error en validación de período:', error);
      return {
        isValid: false,
        errors: ['Error interno de validación'],
        warnings: []
      };
    }
  }

  /**
   * Validar que solo hay un período abierto por empresa
   */
  static async validateSingleOpenPeriod(companyId: string): Promise<{
    isValid: boolean;
    openPeriod?: PayrollPeriod;
  }> {
    try {
      const { data: openPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'borrador');

      if (error) {
        console.error('Error verificando períodos abiertos:', error);
        return { isValid: false };
      }

      return {
        isValid: openPeriods.length <= 1,
        openPeriod: openPeriods.length > 0 ? openPeriods[0] as PayrollPeriod : undefined
      };

    } catch (error) {
      console.error('Error en validateSingleOpenPeriod:', error);
      return { isValid: false };
    }
  }

  /**
   * Validar cierre de período
   */
  static async validatePeriodClosure(periodId: string): Promise<{
    canClose: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Verificar que el período existe
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        errors.push('Período no encontrado');
        return { canClose: false, errors, warnings };
      }

      if (period.estado !== 'borrador') {
        errors.push('Solo se pueden cerrar períodos en estado borrador');
      }

      // Verificar que hay empleados procesados
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('id')
        .eq('period_id', periodId);

      if (payrollsError) {
        warnings.push('No se pudo verificar nóminas procesadas');
      } else if (!payrolls || payrolls.length === 0) {
        warnings.push('No hay empleados procesados en este período');
      }

      return {
        canClose: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error en validatePeriodClosure:', error);
      return {
        canClose: false,
        errors: ['Error interno de validación'],
        warnings: []
      };
    }
  }

  /**
   * Validar generación de comprobantes
   */
  static async validateVouchersGeneration(periodId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    voucherInfo?: {
      totalEmployees: number;
      vouchersGenerated: number;
      vouchersPending: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Contar empleados en el período
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('id, employee_id')
        .eq('period_id', periodId);

      if (payrollsError) {
        errors.push('No se pudo verificar nóminas del período');
        return { isValid: false, errors, warnings };
      }

      const totalEmployees = payrolls?.length || 0;

      // Contar comprobantes generados
      const { data: vouchers, error: vouchersError } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .in('payroll_id', payrolls?.map(p => p.id) || []);

      if (vouchersError) {
        warnings.push('No se pudo verificar comprobantes generados');
      }

      const vouchersGenerated = vouchers?.length || 0;
      const vouchersPending = totalEmployees - vouchersGenerated;

      if (vouchersPending > 0) {
        warnings.push(`Faltan ${vouchersPending} comprobantes por generar`);
      }

      return {
        isValid: true,
        errors,
        warnings,
        voucherInfo: {
          totalEmployees,
          vouchersGenerated,
          vouchersPending
        }
      };

    } catch (error) {
      console.error('Error en validateVouchersGeneration:', error);
      return {
        isValid: false,
        errors: ['Error verificando comprobantes'],
        warnings: []
      };
    }
  }
}
