
/**
 * ✅ SERVICIO MARCADO COMO OBSOLETO - FASE 3
 * Redirige al servicio mejorado para evitar duplicación
 */

import { PayrollCalculationEnhancedService } from './PayrollCalculationEnhancedService';

export class PayrollCalculationUnifiedService {
  /**
   * @deprecated Usar PayrollCalculationEnhancedService directamente
   */
  static async calculateEmployeePayroll(params: {
    employee: any;
    period: any;
    novedades: any[];
  }) {
    console.warn('⚠️ PayrollCalculationUnifiedService está obsoleto. Usar PayrollCalculationEnhancedService');
    
    const { employee, period, novedades } = params;
    
    // Extraer valores de novedades
    let extraHours = 0;
    let bonuses = 0;
    let disabilities = 0;
    let absences = 0;
    
    for (const novedad of novedades) {
      const valor = Number(novedad.valor) || 0;
      
      switch (novedad.tipo_novedad) {
        case 'horas_extra':
        case 'recargo_nocturno':
        case 'recargo_dominical':
          extraHours += valor;
          break;
        case 'bonificacion':
        case 'bonificaciones':
        case 'comision':
        case 'prima':
          bonuses += valor;
          break;
        case 'incapacidades':
          disabilities += valor;
          break;
        case 'licencias':
        case 'ausencias':
          absences += Number(novedad.dias) || 0;
          break;
      }
    }

    // Usar el servicio mejorado
    const calculation = await PayrollCalculationEnhancedService.calculatePayroll({
      baseSalary: Number(employee.salario_base) || 0,
      workedDays: this.calculateCorrectWorkedDays(period),
      extraHours,
      disabilities,
      bonuses,
      absences,
      periodType: period.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
      empleadoId: employee.id,
      periodoId: period.id
    });

    return {
      extraHours,
      bonuses,
      disabilities,
      absences,
      grossPay: calculation.grossPay,
      deductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      transportAllowance: calculation.transportAllowance,
      workedDays: this.calculateCorrectWorkedDays(period)
    };
  }

  private static calculateCorrectWorkedDays(period: any): number {
    if (!period || !period.tipo_periodo) {
      return 30;
    }

    switch (period.tipo_periodo) {
      case 'quincenal':
        return 15;
      case 'semanal':
        return 7;
      case 'mensual':
        if (period.fecha_inicio && period.fecha_fin) {
          const startDate = new Date(period.fecha_inicio);
          const endDate = new Date(period.fecha_fin);
          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return Math.min(days, 31);
        }
        return 30;
      case 'personalizado':
        if (period.fecha_inicio && period.fecha_fin) {
          const startDate = new Date(period.fecha_inicio);
          const endDate = new Date(period.fecha_fin);
          return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return 30;
      default:
        return 30;
    }
  }
}
