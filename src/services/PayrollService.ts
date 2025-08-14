
import { ConfigurationService } from '@/services/ConfigurationService';
import { PORCENTAJES_NOMINA, SALARIO_MINIMO_2024, AUXILIO_TRANSPORTE_2024 } from '@/constants';
import { PayrollCalculation, LegalValidation, Payroll } from '@/types';

export class PayrollService {
  /**
   * Calcula la nómina completa de un empleado
   */
  static calculatePayroll(calculation: PayrollCalculation): PayrollCalculation {
    // Obtener configuración actual
    const config = ConfigurationService.getConfiguration();
    
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
    const auxilioTransporte = salarioBase <= (config.salarioMinimo * 2) ? 
      (config.auxilioTransporte * diasTrabajados) / 30 : 0;

    // Cálculo de horas extra
    const valorHoraExtra = (salarioBase / 240) * 1.25; // 25% recargo
    const pagoHorasExtra = horasExtra * valorHoraExtra;

    // Recargos (estos ya vienen calculados como valores en pesos)
    const pagoRecargoNocturno = recargoNocturno;
    const pagoRecargoDominical = recargoDominical;

    // Base para prestaciones sociales (salario proporcional + auxilio de transporte)
    const baseParaPrestaciones = salarioProporcional + auxilioTransporte;

    // PROVISIONES DEL EMPLEADOR (NO se pagan al empleado, se apartan)
    const cesantias = (baseParaPrestaciones * config.porcentajes.cesantias);
    const interesesCesantias = (cesantias * config.porcentajes.interesesCesantias) / 12; // Mensual
    const prima = (baseParaPrestaciones * config.porcentajes.prima);
    const vacaciones = (salarioProporcional * config.porcentajes.vacaciones);

    // TOTAL A PAGAR AL EMPLEADO (sin provisiones)
    const totalDevengado = salarioProporcional + auxilioTransporte + pagoHorasExtra + 
                          pagoRecargoNocturno + pagoRecargoDominical + bonificaciones;

    // Deducciones - se calculan sobre el salario proporcional según días trabajados
    const saludEmpleado = salarioProporcional * config.porcentajes.saludEmpleado;
    const pensionEmpleado = salarioProporcional * config.porcentajes.pensionEmpleado;
    
    // Retención en la fuente (simplificado)
    const retencionFuente = this.calculateRetencionFuente(salarioBase, config.uvt);
    
    const totalDeducciones = saludEmpleado + pensionEmpleado + retencionFuente;
    const netoPagado = totalDevengado - totalDeducciones;

    return {
      employeeId: '', // Will be set by caller
      baseSalary: salarioBase,
      deductions: totalDeducciones,
      bonuses: bonificaciones,
      netPay: netoPagado,
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
      otrasDeducciones: 0,
      totalDevengado,
      totalDeducciones,
      netoPagado
    };
  }

  /**
   * Validaciones legales de nómina
   */
  static validatePayroll(employee: any, payroll: PayrollCalculation): LegalValidation {
    const config = ConfigurationService.getConfiguration();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar salario mínimo
    if (payroll.salarioBase < config.salarioMinimo) {
      errors.push(`El salario base (${payroll.salarioBase.toLocaleString()}) es menor al salario mínimo legal vigente (${config.salarioMinimo.toLocaleString()})`);
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
  private static calculateRetencionFuente(salarioBase: number, uvt: number): number {
    // Simplificado - en producción debe usar las tablas oficiales de la DIAN
    const salarioEnUvt = salarioBase / uvt;
    
    if (salarioEnUvt < 95) return 0; // Exento
    if (salarioEnUvt < 150) return salarioBase * 0.02; // 2%
    if (salarioEnUvt < 360) return salarioBase * 0.04; // 4%
    
    return salarioBase * 0.06; // 6%
  }
}
