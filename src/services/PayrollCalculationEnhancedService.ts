
/**
 * Servicio de cálculo de nómina mejorado con soporte para jornada legal dinámica
 * según la Ley 2101 de 2021
 */

import { ConfigurationService, PayrollConfiguration } from './ConfigurationService';
import { PayrollPeriodService } from './PayrollPeriodService';
import { getJornadaLegal, getHourlyDivisor, getJornadaTooltip } from '@/utils/jornadaLegal';

export interface PayrollCalculationInputEnhanced {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  periodDate?: Date; // Nueva propiedad para cálculos históricos
}

export interface PayrollCalculationResultEnhanced {
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
  // Nuevas propiedades para información de jornada
  jornadaInfo: {
    horasSemanales: number;
    horasMensuales: number;
    divisorHorario: number;
    valorHoraOrdinaria: number;
    tooltip: string;
    ley: string;
  };
}

export interface ValidationResultEnhanced {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  jornadaInfo?: {
    horasSemanales: number;
    tooltip: string;
  };
}

export class PayrollCalculationEnhancedService {
  private static getCurrentConfig(year: string = '2025'): PayrollConfiguration {
    return ConfigurationService.getConfiguration(year);
  }

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
    input: PayrollCalculationInputEnhanced,
    eps?: string,
    afp?: string
  ): ValidationResultEnhanced {
    const config = this.getCurrentConfig();
    const errors: string[] = [];
    const warnings: string[] = [];
    const periodDate = input.periodDate || new Date();
    const jornadaLegal = getJornadaLegal(periodDate);

    // Validaciones obligatorias
    if (!eps) errors.push('Falta afiliación a EPS');
    if (!afp) errors.push('Falta afiliación a AFP');

    // Determinar días máximos según el tipo de período
    const maxDays = input.periodType === 'quincenal' ? 15 : 30;

    // Validaciones de días trabajados
    if (input.workedDays > maxDays) {
      errors.push(`Días trabajados (${input.workedDays}) exceden el período ${input.periodType} (máximo ${maxDays})`);
    }
    if (input.workedDays < 0) {
      errors.push('Los días trabajados no pueden ser negativos');
    }

    // Validaciones de horas extra con jornada legal dinámica
    const maxHorasExtraSemanales = (jornadaLegal.horasSemanales * 0.25); // 25% adicional máximo recomendado
    const horasExtraSemanalesEstimadas = input.extraHours / (input.periodType === 'quincenal' ? 2 : 4);
    
    if (horasExtraSemanalesEstimadas > maxHorasExtraSemanales) {
      warnings.push(`Horas extra excesivas para jornada de ${jornadaLegal.horasSemanales}h semanales (máximo recomendado: ${maxHorasExtraSemanales}h/semana)`);
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
      warnings,
      jornadaInfo: {
        horasSemanales: jornadaLegal.horasSemanales,
        tooltip: getJornadaTooltip(periodDate)
      }
    };
  }

  static calculatePayroll(input: PayrollCalculationInputEnhanced): PayrollCalculationResultEnhanced {
    const config = this.getCurrentConfig();
    const periodDate = input.periodDate || new Date();
    const jornadaLegal = getJornadaLegal(periodDate);
    const hourlyDivisor = getHourlyDivisor(periodDate);
    
    // Determinar días del período según la configuración
    let periodDays: number;
    let monthlyDivisor: number;
    
    switch (input.periodType) {
      case 'quincenal':
        periodDays = 15;
        monthlyDivisor = 30;
        break;
      case 'mensual':
        periodDays = 30;
        monthlyDivisor = 30;
        break;
      default:
        periodDays = 30;
        monthlyDivisor = 30;
    }
    
    // Cálculo del salario base proporcional
    const dailySalary = input.baseSalary / monthlyDivisor;
    const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
    const regularPay = effectiveWorkedDays * dailySalary;

    // Cálculo de horas extra usando jornada legal dinámica
    const hourlyRate = input.baseSalary / hourlyDivisor; // Usar divisor dinámico
    const valorHoraOrdinaria = hourlyRate;
    const extraPay = input.extraHours * hourlyRate * 1.25;

    // Auxilio de transporte
    let transportAllowance = 0;
    if (input.baseSalary <= (config.salarioMinimo * 2)) {
      if (input.periodType === 'quincenal') {
        transportAllowance = Math.round((config.auxilioTransporte / 2) * (input.workedDays / periodDays));
      } else {
        transportAllowance = Math.round(config.auxilioTransporte * (input.workedDays / periodDays));
      }
    }

    // Base para aportes
    const payrollBase = regularPay + extraPay + input.bonuses;

    // Deducciones del empleado
    const healthDeduction = payrollBase * config.porcentajes.saludEmpleado;
    const pensionDeduction = payrollBase * config.porcentajes.pensionEmpleado;
    const totalDeductions = healthDeduction + pensionDeduction;

    // Total devengado
    const grossPay = payrollBase + transportAllowance;
    const netPay = grossPay - totalDeductions;

    // Aportes del empleador
    const employerHealth = payrollBase * config.porcentajes.saludEmpleador;
    const employerPension = payrollBase * config.porcentajes.pensionEmpleador;
    const employerArl = payrollBase * config.porcentajes.arl;
    const employerCaja = payrollBase * config.porcentajes.cajaCompensacion;
    const employerIcbf = payrollBase * config.porcentajes.icbf;
    const employerSena = payrollBase * config.porcentajes.sena;

    const employerContributions = employerHealth + employerPension + employerArl + 
                                  employerCaja + employerIcbf + employerSena;
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
      totalPayrollCost: Math.round(totalPayrollCost),
      jornadaInfo: {
        horasSemanales: jornadaLegal.horasSemanales,
        horasMensuales: jornadaLegal.horasMensuales,
        divisorHorario: hourlyDivisor,
        valorHoraOrdinaria: Math.round(valorHoraOrdinaria),
        tooltip: getJornadaTooltip(periodDate),
        ley: jornadaLegal.ley
      }
    };
  }

  static calculateBatch(inputs: PayrollCalculationInputEnhanced[]): PayrollCalculationResultEnhanced[] {
    return inputs.map(input => this.calculatePayroll(input));
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  static getConfigurationInfo(fecha: Date = new Date()): {
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    year: string;
    jornadaLegal: {
      horasSemanales: number;
      divisorHorario: number;
      ley: string;
      tooltip: string;
    };
  } {
    const config = this.getCurrentConfig();
    const jornadaLegal = getJornadaLegal(fecha);
    
    return {
      salarioMinimo: config.salarioMinimo,
      auxilioTransporte: config.auxilioTransporte,
      uvt: config.uvt,
      year: '2025',
      jornadaLegal: {
        horasSemanales: jornadaLegal.horasSemanales,
        divisorHorario: getHourlyDivisor(fecha),
        ley: jornadaLegal.ley,
        tooltip: getJornadaTooltip(fecha)
      }
    };
  }
}
