
import { ConfigurationService, PayrollConfiguration } from './ConfigurationService';

export interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
}

export interface PayrollCalculationResult {
  regularPay: number;
  extraPay: number;
  transportAllowance: number;
  grossPay: number;
  healthDeduction: number;
  pensionDeduction: number;
  totalDeductions: number;
  netPay: number;
  employerHealth: number;
  employerPension: number;
  employerArl: number;
  employerCaja: number;
  employerIcbf: number;
  employerSena: number;
  employerContributions: number;
  totalPayrollCost: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PayrollCalculationService {
  private static config: PayrollConfiguration = ConfigurationService.getConfiguration('2025');

  static updateConfiguration(year: string = '2025'): void {
    this.config = ConfigurationService.getConfiguration(year);
  }

  static validateEmployee(
    input: PayrollCalculationInput,
    eps?: string,
    afp?: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones obligatorias
    if (!eps) errors.push('Falta afiliación a EPS');
    if (!afp) errors.push('Falta afiliación a AFP');

    // Validaciones de días trabajados
    const maxDays = input.periodType === 'quincenal' ? 15 : 30;
    if (input.workedDays > maxDays) {
      errors.push(`Días trabajados (${input.workedDays}) exceden el período ${input.periodType} (máximo ${maxDays})`);
    }
    if (input.workedDays < 0) {
      errors.push('Los días trabajados no pueden ser negativos');
    }

    // Validaciones de horas extra
    if (input.extraHours > 60) {
      warnings.push('Horas extra excesivas (más de 60 horas)');
    }
    if (input.extraHours < 0) {
      errors.push('Las horas extra no pueden ser negativas');
    }

    // Validaciones de incapacidades
    if (input.disabilities > input.workedDays) {
      errors.push('Los días de incapacidad no pueden ser mayores a los días trabajados');
    }
    if (input.disabilities < 0) {
      errors.push('Los días de incapacidad no pueden ser negativos');
    }

    // Validaciones de salario
    if (input.baseSalary < this.config.salarioMinimo) {
      errors.push(`El salario base (${this.formatCurrency(input.baseSalary)}) es menor al SMMLV (${this.formatCurrency(this.config.salarioMinimo)})`);
    }

    // Advertencias
    if (input.baseSalary >= this.config.salarioMinimo * 10) {
      warnings.push('Salario alto - verificar cálculo de aportes');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    // Cálculo del salario base proporcional
    const dailySalary = input.baseSalary / 30;
    const regularPay = Math.max(0, (input.workedDays - input.disabilities) * dailySalary);

    // Cálculo de horas extra (25% de recargo)
    const hourlyRate = input.baseSalary / 240; // 240 horas laborales al mes
    const extraPay = input.extraHours * hourlyRate * 1.25;

    // Auxilio de transporte (solo si devenga máximo 2 SMMLV)
    const transportAllowance = input.baseSalary <= (this.config.salarioMinimo * 2) ? 
      Math.round((this.config.auxilioTransporte * input.workedDays) / 30) : 0;

    // Total devengado
    const grossPay = regularPay + extraPay + input.bonuses + transportAllowance;

    // Deducciones del empleado (sobre el devengado)
    const healthDeduction = grossPay * this.config.porcentajes.saludEmpleado;
    const pensionDeduction = grossPay * this.config.porcentajes.pensionEmpleado;
    const totalDeductions = healthDeduction + pensionDeduction;

    // Neto a pagar
    const netPay = grossPay - totalDeductions;

    // Aportes del empleador (sobre el devengado)
    const employerHealth = grossPay * this.config.porcentajes.saludEmpleador;
    const employerPension = grossPay * this.config.porcentajes.pensionEmpleador;
    const employerArl = grossPay * this.config.porcentajes.arl;
    const employerCaja = grossPay * this.config.porcentajes.cajaCompensacion;
    const employerIcbf = grossPay * this.config.porcentajes.icbf;
    const employerSena = grossPay * this.config.porcentajes.sena;

    const employerContributions = employerHealth + employerPension + employerArl + 
                                  employerCaja + employerIcbf + employerSena;

    // Costo total de nómina
    const totalPayrollCost = netPay + employerContributions;

    return {
      regularPay: Math.round(regularPay),
      extraPay: Math.round(extraPay),
      transportAllowance,
      grossPay: Math.round(grossPay),
      healthDeduction: Math.round(healthDeduction),
      pensionDeduction: Math.round(pensionDeduction),
      totalDeductions: Math.round(totalDeductions),
      netPay: Math.round(netPay),
      employerHealth: Math.round(employerHealth),
      employerPension: Math.round(employerPension),
      employerArl: Math.round(employerArl),
      employerCaja: Math.round(employerCaja),
      employerIcbf: Math.round(employerIcbf),
      employerSena: Math.round(employerSena),
      employerContributions: Math.round(employerContributions),
      totalPayrollCost: Math.round(totalPayrollCost)
    };
  }

  static calculateBatch(inputs: PayrollCalculationInput[]): PayrollCalculationResult[] {
    return inputs.map(input => this.calculatePayroll(input));
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Método para obtener información de configuración actual
  static getConfigurationInfo(): {
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    year: string;
  } {
    return {
      salarioMinimo: this.config.salarioMinimo,
      auxilioTransporte: this.config.auxilioTransporte,
      uvt: this.config.uvt,
      year: '2025'
    };
  }
}
