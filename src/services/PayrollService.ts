
import { PORCENTAJES_NOMINA, SALARIO_MINIMO_2024, AUXILIO_TRANSPORTE_2024 } from '@/constants';
import { PayrollCalculation, LegalValidation, Payroll } from '@/types';

export class PayrollService {
  /**
   * Calcula la nómina completa de un empleado
   */
  static calculatePayroll(calculation: PayrollCalculation): Omit<Payroll, 'id' | 'empleadoId' | 'empresaId' | 'periodo' | 'estado' | 'createdAt' | 'updatedAt'> {
    const {
      salarioBase,
      diasTrabajados,
      horasExtra = 0,
      recargoNocturno = 0,
      recargoDominical = 0,
      bonificaciones = 0
    } = calculation;

    // Cálculo del salario proporcional
    const salarioProporcional = (salarioBase * diasTrabajados) / 30;
    
    // Auxilio de transporte (solo para salarios <= 2 SMLV)
    const auxilioTransporte = salarioBase <= (SALARIO_MINIMO_2024 * 2) ? 
      (AUXILIO_TRANSPORTE_2024 * diasTrabajados) / 30 : 0;

    // Cálculo de horas extra
    const valorHoraExtra = (salarioBase / 240) * 1.25; // 25% recargo
    const pagoHorasExtra = horasExtra * valorHoraExtra;

    // Recargos (estos ya vienen calculados como valores en pesos)
    const pagoRecargoNocturno = recargoNocturno;
    const pagoRecargoDominical = recargoDominical;

    // Base para prestaciones sociales (salario + auxilio de transporte, sin horas extra ni recargos)
    const baseParaPrestaciones = salarioProporcional + auxilioTransporte;

    // Prestaciones sociales - se calculan sobre el salario base mensual, no proporcional
    const cesantias = (baseParaPrestaciones * PORCENTAJES_NOMINA.CESANTIAS) * (diasTrabajados / 30);
    const interesesCesantias = (cesantias * PORCENTAJES_NOMINA.INTERESES_CESANTIAS);
    const prima = (baseParaPrestaciones * PORCENTAJES_NOMINA.PRIMA) * (diasTrabajados / 30);
    const vacaciones = (salarioBase * PORCENTAJES_NOMINA.VACACIONES) * (diasTrabajados / 30);

    // Total devengado
    const totalDevengado = salarioProporcional + auxilioTransporte + pagoHorasExtra + 
                          pagoRecargoNocturno + pagoRecargoDominical + bonificaciones +
                          cesantias + interesesCesantias + prima + vacaciones;

    // Deducciones - se calculan sobre el salario base mensual completo, no proporcional
    const saludEmpleado = salarioBase * PORCENTAJES_NOMINA.SALUD_EMPLEADO;
    const pensionEmpleado = salarioBase * PORCENTAJES_NOMINA.PENSION_EMPLEADO;
    
    // Retención en la fuente (simplificado)
    const retencionFuente = this.calculateRetencionFuente(salarioBase);
    
    const totalDeducciones = saludEmpleado + pensionEmpleado + retencionFuente;
    const netoPagado = totalDevengado - totalDeducciones;

    return {
      salarioBase: salarioProporcional,
      diasTrabajados,
      horasExtra: pagoHorasExtra,
      recargoNocturno: pagoRecargoNocturno,
      recargoDominical: pagoRecargoDominical,
      auxilioTransporte,
      bonificaciones,
      cesantias,
      interesesCesantias,
      prima,
      vacaciones,
      saludEmpleado,
      pensionEmpleado,
      retencionFuente,
      otrasDeduciones: 0,
      totalDevengado,
      totalDeducciones,
      netoPagado
    };
  }

  /**
   * Validaciones legales de nómina
   */
  static validatePayroll(employee: any, payroll: PayrollCalculation): LegalValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar salario mínimo
    if (payroll.salarioBase < SALARIO_MINIMO_2024) {
      errors.push(`El salario base (${payroll.salarioBase.toLocaleString()}) es menor al salario mínimo legal vigente (${SALARIO_MINIMO_2024.toLocaleString()})`);
    }

    // Validar días trabajados
    if (payroll.diasTrabajados > 30) {
      errors.push('Los días trabajados no pueden ser mayores a 30');
    }

    if (payroll.diasTrabajados < 0) {
      errors.push('Los días trabajados no pueden ser negativos');
    }

    // Validar horas extra (máximo 2 por día)
    if (payroll.horasExtra && payroll.horasExtra > (payroll.diasTrabajados * 2)) {
      warnings.push('Las horas extra exceden el límite legal recomendado (2 horas por día)');
    }

    // Validar afiliaciones obligatorias
    if (!employee.eps) {
      errors.push('El empleado debe tener afiliación a EPS');
    }

    if (!employee.afp) {
      errors.push('El empleado debe tener afiliación a AFP');
    }

    if (!employee.arl) {
      errors.push('El empleado debe tener afiliación a ARL');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cálculo simplificado de retención en la fuente
   */
  private static calculateRetencionFuente(salarioBase: number): number {
    // Simplificado - en producción debe usar las tablas oficiales de la DIAN
    const uvt2024 = 47065; // UVT 2024
    const salarioEnUvt = salarioBase / uvt2024;
    
    if (salarioEnUvt < 95) return 0; // Exento
    if (salarioEnUvt < 150) return salarioBase * 0.02; // 2%
    if (salarioEnUvt < 360) return salarioBase * 0.04; // 4%
    
    return salarioBase * 0.06; // 6%
  }
}
