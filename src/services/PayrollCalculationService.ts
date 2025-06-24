
import { ConfigurationService, PayrollConfiguration } from './ConfigurationService';
import { PayrollPeriodService } from './PayrollPeriodService';

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
  private static getCurrentConfig(year: string = '2025'): PayrollConfiguration {
    return ConfigurationService.getConfiguration(year);
  }

  static updateConfiguration(year: string = '2025'): void {
    console.log(`Configuration will be loaded dynamically for year: ${year}`);
  }

  // Obtener periodicidad configurada por el usuario
  static async getUserConfiguredPeriodicity(): Promise<'quincenal' | 'mensual' | 'semanal'> {
    try {
      const companySettings = await PayrollPeriodService.getCompanySettings();
      return companySettings?.periodicity as 'quincenal' | 'mensual' | 'semanal' || 'mensual';
    } catch (error) {
      console.warn('Could not load company periodicity, defaulting to mensual:', error);
      return 'mensual';
    }
  }

  static validateEmployee(
    input: PayrollCalculationInput,
    eps?: string,
    afp?: string
  ): ValidationResult {
    const config = this.getCurrentConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones obligatorias
    if (!eps) errors.push('Falta afiliación a EPS');
    if (!afp) errors.push('Falta afiliación a AFP');

    // Determinar días máximos según el tipo de período
    let maxDays: number;
    switch (input.periodType) {
      case 'quincenal':
        maxDays = 15;
        break;
      case 'mensual':
        maxDays = 30;
        break;
      default:
        maxDays = 30;
    }

    // Validaciones de días trabajados
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
    if (input.baseSalary < config.salarioMinimo) {
      errors.push(`El salario base (${this.formatCurrency(input.baseSalary)}) es menor al SMMLV (${this.formatCurrency(config.salarioMinimo)})`);
    }

    // Advertencias
    if (input.baseSalary >= config.salarioMinimo * 10) {
      warnings.push('Salario alto - verificar cálculo de aportes');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const config = this.getCurrentConfig();
    
    // Determinar días del período según la configuración
    let periodDays: number;
    let monthlyDivisor: number; // Para calcular salario diario
    let hourlyDivisor: number; // Para calcular valor hora ordinaria
    
    switch (input.periodType) {
      case 'quincenal':
        periodDays = 15;
        monthlyDivisor = 30; // Siempre se calcula sobre base mensual
        hourlyDivisor = 240; // 8 horas x 30 días
        break;
      case 'mensual':
        periodDays = 30;
        monthlyDivisor = 30;
        hourlyDivisor = 240;
        break;
      default:
        periodDays = 30;
        monthlyDivisor = 30;
        hourlyDivisor = 240;
    }
    
    // Cálculo del salario base proporcional
    const dailySalary = input.baseSalary / monthlyDivisor;
    const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
    const regularPay = effectiveWorkedDays * dailySalary;

    // Cálculo de horas extra (25% de recargo sobre valor hora ordinaria)
    const hourlyRate = input.baseSalary / hourlyDivisor;
    const extraPay = input.extraHours * hourlyRate * 1.25;

    // Auxilio de transporte - Solo si devenga máximo 2 SMMLV
    let transportAllowance = 0;
    if (input.baseSalary <= (config.salarioMinimo * 2)) {
      if (input.periodType === 'quincenal') {
        // Para quincenal: la mitad del auxilio mensual, proporcional a días trabajados
        transportAllowance = Math.round((config.auxilioTransporte / 2) * (input.workedDays / periodDays));
      } else {
        // Para mensual: auxilio completo proporcional a días trabajados
        transportAllowance = Math.round(config.auxilioTransporte * (input.workedDays / periodDays));
      }
    }

    // Base para aportes (salario devengado sin auxilio de transporte)
    const payrollBase = regularPay + extraPay + input.bonuses;

    // Deducciones del empleado (sobre base de cotización)
    const healthDeduction = payrollBase * config.porcentajes.saludEmpleado;
    const pensionDeduction = payrollBase * config.porcentajes.pensionEmpleado;
    const totalDeductions = healthDeduction + pensionDeduction;

    // Total devengado (incluye auxilio de transporte)
    const grossPay = payrollBase + transportAllowance;

    // Neto a pagar
    const netPay = grossPay - totalDeductions;

    // Aportes del empleador (sobre base de cotización, no sobre auxilio de transporte)
    const employerHealth = payrollBase * config.porcentajes.saludEmpleador;
    const employerPension = payrollBase * config.porcentajes.pensionEmpleador;
    const employerArl = payrollBase * config.porcentajes.arl;
    const employerCaja = payrollBase * config.porcentajes.cajaCompensacion;
    const employerIcbf = payrollBase * config.porcentajes.icbf;
    const employerSena = payrollBase * config.porcentajes.sena;

    const employerContributions = employerHealth + employerPension + employerArl + 
                                  employerCaja + employerIcbf + employerSena;

    // Costo total de nómina
    const totalPayrollCost = netPay + employerContributions;

    return {
      regularPay: Math.round(regularPay),
      extraPay: Math.round(extraPay),
      transportAllowance: Math.round(transportAllowance),
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

  static getConfigurationInfo(): {
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    year: string;
  } {
    const config = this.getCurrentConfig();
    return {
      salarioMinimo: config.salarioMinimo,
      auxilioTransporte: config.auxilioTransporte,
      uvt: config.uvt,
      year: '2025'
    };
  }
}
