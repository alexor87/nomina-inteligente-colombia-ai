
/**
 * Servicio de cálculo de nómina mejorado con soporte para jornada legal dinámica
 * según la Ley 2101 de 2021 y cálculo correcto de deducciones
 * CORREGIDO: Usa lógica de Aleluya (valor_mensual / 30) × días_trabajados
 */

import { ConfigurationService, PayrollConfiguration } from './ConfigurationService';
import { PayrollPeriodService } from './PayrollPeriodService';
import { DeductionCalculationService } from './DeductionCalculationService';
import { getJornadaLegal, getHourlyDivisor, getJornadaTooltip } from '@/utils/jornadaLegal';

export interface PayrollCalculationInputEnhanced {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  periodDate?: Date; // Nueva propiedad para cálculos históricos
  empleadoId?: string; // Para incluir novedades en el cálculo
  periodoId?: string; // Para incluir novedades en el cálculo
}

export interface PayrollCalculationResultEnhanced {
  regularPay: number;
  extraPay: number;
  transportAllowance: number;
  grossPay: number;
  healthDeduction: number;
  pensionDeduction: number;
  retencionFuente: number;
  novedadesDeducciones: number;
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
  // Información de jornada y cálculos
  jornadaInfo: {
    horasSemanales: number;
    horasMensuales: number;
    divisorHorario: number;
    valorHoraOrdinaria: number;
    tooltip: string;
    ley: string;
  };
  // Información detallada de deducciones
  deductionDetails: {
    ibcSalud: number;
    ibcPension: number;
    baseRetencion: number;
    novedadesDetalle: Array<{
      tipo: string;
      valor: number;
      descripcion: string;
    }>;
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
    let maxDays: number;
    switch (input.periodType) {
      case 'semanal':
        maxDays = 7;
        break;
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

    // Validaciones de horas extra con jornada legal dinámica
    const maxHorasExtraSemanales = (jornadaLegal.horasSemanales * 0.25); // 25% adicional máximo recomendado
    let horasExtraSemanalesEstimadas: number;
    
    switch (input.periodType) {
      case 'semanal':
        horasExtraSemanalesEstimadas = input.extraHours;
        break;
      case 'quincenal':
        horasExtraSemanalesEstimadas = input.extraHours / 2;
        break;
      case 'mensual':
        horasExtraSemanalesEstimadas = input.extraHours / 4;
        break;
      default:
        horasExtraSemanalesEstimadas = input.extraHours / 4;
    }
    
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

  static async calculatePayroll(input: PayrollCalculationInputEnhanced): Promise<PayrollCalculationResultEnhanced> {
    const config = this.getCurrentConfig();
    const periodDate = input.periodDate || new Date();
    const jornadaLegal = getJornadaLegal(periodDate);
    const hourlyDivisor = getHourlyDivisor(periodDate);
    
    // ✅ CORRECCIÓN ALELUYA: Usar siempre divisor 30 y luego proporcional por días
    console.log(`🔧 CÁLCULO ALELUYA - Período: ${input.periodType}, Días: ${input.workedDays}`);
    
    // Cálculo del salario base proporcional COMO ALELUYA: (salario / 30) × días
    const dailySalary = input.baseSalary / 30; // Siempre usar 30 como Aleluya
    const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
    const regularPay = dailySalary * effectiveWorkedDays;
    
    console.log(`💰 Salario diario: $${dailySalary.toFixed(2)}, Días efectivos: ${effectiveWorkedDays}, Salario regular: $${regularPay.toFixed(2)}`);

    // Cálculo de horas extra usando jornada legal dinámica
    const hourlyRate = input.baseSalary / hourlyDivisor; // Usar divisor dinámico
    const valorHoraOrdinaria = hourlyRate;
    const extraPay = input.extraHours * hourlyRate * 1.25;

    // ✅ CORRECCIÓN ALELUYA: Auxilio de transporte proporcional
    let transportAllowance = 0;
    if (input.baseSalary <= (config.salarioMinimo * 2)) {
      // COMO ALELUYA: (auxilio_mensual / 30) × días_trabajados
      const dailyTransportAllowance = config.auxilioTransporte / 30;
      transportAllowance = Math.round(dailyTransportAllowance * input.workedDays);
      
      console.log(`🚌 Auxilio diario: $${dailyTransportAllowance.toFixed(2)}, Auxilio total: $${transportAllowance}`);
    }

    // Total devengado
    const grossPay = regularPay + extraPay + input.bonuses + transportAllowance;
    
    console.log(`📊 Total devengado: $${grossPay.toFixed(2)} (Regular: ${regularPay.toFixed(2)} + Extra: ${extraPay.toFixed(2)} + Bonos: ${input.bonuses} + Auxilio: ${transportAllowance})`);

    // ✅ CORRECCIÓN CRÍTICA: Usar salario proporcional para cálculo de deducciones
    const salarioBaseParaDeducciones = input.periodType === 'quincenal' ? 
      input.baseSalary / 2 : // Para quincenal, usar la mitad del salario
      input.baseSalary; // Para mensual, usar salario completo
      
    console.log(`🎯 CORRECCIÓN DEDUCCIONES - Período: ${input.periodType}, Salario original: $${input.baseSalary}, Salario para deducciones: $${salarioBaseParaDeducciones}`);

    // Calcular deducciones correctamente usando el salario proporcional
    const deductionResult = await DeductionCalculationService.calculateDeductions({
      salarioBase: salarioBaseParaDeducciones,
      totalDevengado: grossPay,
      auxilioTransporte: transportAllowance,
      periodType: input.periodType,
      empleadoId: input.empleadoId,
      periodoId: input.periodoId
    });

    // Neto pagado
    const netPay = grossPay - deductionResult.totalDeducciones;
    
    console.log(`💳 Neto a pagar: $${netPay.toFixed(2)} (Devengado: ${grossPay.toFixed(2)} - Deducciones: ${deductionResult.totalDeducciones.toFixed(2)})`);

    // Base para aportes patronales (sin auxilio de transporte)
    const payrollBase = regularPay + extraPay + input.bonuses;

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
      healthDeduction: Math.round(deductionResult.saludEmpleado),
      pensionDeduction: Math.round(deductionResult.pensionEmpleado),
      retencionFuente: Math.round(deductionResult.retencionFuente),
      novedadesDeducciones: Math.round(deductionResult.novedadesDeducciones),
      totalDeductions: Math.round(deductionResult.totalDeducciones),
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
      },
      deductionDetails: {
        ibcSalud: deductionResult.ibcSalud,
        ibcPension: deductionResult.ibcPension,
        baseRetencion: deductionResult.detalleCalculo.baseRetencion,
        novedadesDetalle: deductionResult.detalleCalculo.novedadesDetalle
      }
    };
  }

  static async calculateBatch(inputs: PayrollCalculationInputEnhanced[]): Promise<PayrollCalculationResultEnhanced[]> {
    const results = await Promise.all(inputs.map(input => this.calculatePayroll(input)));
    return results;
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
    deductionInfo: {
      topeIbc: number;
      porcentajes: {
        saludEmpleado: number;
        pensionEmpleado: number;
      };
    };
  } {
    const config = this.getCurrentConfig();
    const jornadaLegal = getJornadaLegal(fecha);
    const deductionInfo = DeductionCalculationService.getConfigurationInfo();
    
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
      },
      deductionInfo: {
        topeIbc: deductionInfo.topeIbc,
        porcentajes: deductionInfo.porcentajes
      }
    };
  }
}
