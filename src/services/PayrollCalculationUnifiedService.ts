
import { supabase } from '@/integrations/supabase/client';
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

export class PayrollCalculationUnifiedService {
  private static config: PayrollConfiguration | null = null;

  private static getConfiguration(): PayrollConfiguration {
    if (!this.config) {
      this.config = ConfigurationService.getConfiguration('2025');
    }
    return this.config;
  }

  /**
   * Método principal para calcular nómina - intenta usar backend primero, fallback a frontend
   */
  static async calculatePayroll(input: PayrollCalculationInput, useBackend = true): Promise<PayrollCalculationResult> {
    if (useBackend) {
      try {
        return await this.calculatePayrollBackend(input);
      } catch (error) {
        console.warn('Backend calculation failed, falling back to frontend:', error);
        return this.calculatePayrollFrontend(input);
      }
    }
    return this.calculatePayrollFrontend(input);
  }

  /**
   * Cálculo usando el backend (Edge Function)
   */
  private static async calculatePayrollBackend(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    const { data, error } = await supabase.functions.invoke('payroll-calculations', {
      body: {
        action: 'calculate',
        data: input
      }
    });

    if (error) {
      throw new Error('Error en el cálculo de nómina del backend');
    }

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido en el cálculo');
    }

    return data.data;
  }

  /**
   * Cálculo usando el frontend (fallback)
   */
  private static calculatePayrollFrontend(input: PayrollCalculationInput): PayrollCalculationResult {
    const config = this.getConfiguration();
    
    const periodDays = input.periodType === 'quincenal' ? 15 : 30;
    const monthlyDivisor = 30;
    const hourlyDivisor = 240;
    
    // Cálculo del salario base proporcional
    const dailySalary = input.baseSalary / monthlyDivisor;
    const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
    const regularPay = effectiveWorkedDays * dailySalary;

    // Cálculo de horas extra
    const hourlyRate = input.baseSalary / hourlyDivisor;
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
      totalPayrollCost: Math.round(totalPayrollCost)
    };
  }

  /**
   * Validación unificada
   */
  static validateEmployee(
    input: PayrollCalculationInput,
    eps?: string,
    afp?: string
  ): ValidationResult {
    const config = this.getConfiguration();
    const errors: string[] = [];
    const warnings: string[] = [];

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
      errors.push(`El salario base es menor al SMMLV (${this.formatCurrency(config.salarioMinimo)})`);
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

  /**
   * Cálculo por lotes
   */
  static async calculateBatch(inputs: PayrollCalculationInput[], useBackend = true): Promise<PayrollCalculationResult[]> {
    if (useBackend) {
      try {
        const { data, error } = await supabase.functions.invoke('payroll-calculations', {
          body: {
            action: 'batch-calculate',
            data: { inputs }
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        return data.data;
      } catch (error) {
        console.warn('Backend batch calculation failed, falling back to frontend:', error);
      }
    }

    // Fallback a cálculo frontend por lotes
    return Promise.all(inputs.map(input => this.calculatePayrollFrontend(input)));
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
    const config = this.getConfiguration();
    return {
      salarioMinimo: config.salarioMinimo,
      auxilioTransporte: config.auxilioTransporte,
      uvt: config.uvt,
      year: '2025'
    };
  }
}
