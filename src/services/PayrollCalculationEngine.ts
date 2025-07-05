
/**
 * ✅ MOTOR DE CÁLCULOS DE NÓMINA - ARQUITECTURA CRÍTICA  
 * Motor de cálculos puro, sin efectos secundarios
 * Basado en legislación colombiana 2025
 */

export interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours?: number;
  bonuses?: number;
  absences?: number;
  transportAllowance?: number;
}

export interface PayrollCalculationResult {
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  transportAllowance: number;
  employerContributions: number;
  breakdown: {
    salaryBase: number;
    extraHours: number;
    bonuses: number;
    transportAllowance: number;
    healthEmployee: number;
    pensionEmployee: number;
    totalGross: number;
    totalDeductions: number;
    netPayable: number;
  };
}

export class PayrollCalculationEngine {
  
  // Constantes legales 2025
  private static readonly SMMLV_2025 = 1300000;
  private static readonly TRANSPORT_ALLOWANCE_2025 = 162000;
  private static readonly HEALTH_RATE = 0.04; // 4%
  private static readonly PENSION_RATE = 0.04; // 4%
  private static readonly EMPLOYER_HEALTH_RATE = 0.085; // 8.5%
  private static readonly EMPLOYER_PENSION_RATE = 0.12; // 12%
  private static readonly EMPLOYER_ARL_RATE = 0.00522; // 0.522%

  /**
   * Calcular nómina completa para un empleado
   */
  async calculateEmployeePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    try {
      console.log('🧮 Calculating payroll for:', input);
      
      // Cálculos base
      const proportionalSalary = this.calculateProportionalSalary(
        input.baseSalary, 
        input.workedDays
      );
      
      const extraHoursValue = input.extraHours ? 
        this.calculateExtraHours(input.baseSalary, input.extraHours) : 0;
      
      const transportAllowance = this.calculateTransportAllowance(input.baseSalary);
      
      const grossSalary = proportionalSalary + extraHoursValue + (input.bonuses || 0);
      const grossPay = grossSalary + transportAllowance;
      
      // Deducciones empleado
      const healthDeduction = grossSalary * PayrollCalculationEngine.HEALTH_RATE;
      const pensionDeduction = grossSalary * PayrollCalculationEngine.PENSION_RATE;
      const totalDeductions = healthDeduction + pensionDeduction;
      
      // Aportes empleador
      const employerHealth = grossSalary * PayrollCalculationEngine.EMPLOYER_HEALTH_RATE;
      const employerPension = grossSalary * PayrollCalculationEngine.EMPLOYER_PENSION_RATE;
      const employerARL = grossSalary * PayrollCalculationEngine.EMPLOYER_ARL_RATE;
      const employerContributions = employerHealth + employerPension + employerARL;
      
      const netPay = grossPay - totalDeductions;

      const result: PayrollCalculationResult = {
        grossPay: Math.round(grossPay),
        totalDeductions: Math.round(totalDeductions),
        netPay: Math.round(netPay),
        transportAllowance: Math.round(transportAllowance),
        employerContributions: Math.round(employerContributions),
        breakdown: {
          salaryBase: Math.round(proportionalSalary),
          extraHours: Math.round(extraHoursValue),
          bonuses: Math.round(input.bonuses || 0),
          transportAllowance: Math.round(transportAllowance),
          healthEmployee: Math.round(healthDeduction),
          pensionEmployee: Math.round(pensionDeduction),
          totalGross: Math.round(grossSalary),
          totalDeductions: Math.round(totalDeductions),
          netPayable: Math.round(netPay)
        }
      };

      console.log('✅ Calculation completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Error in payroll calculation:', error);
      throw new Error('Error calculando nómina: ' + (error as Error).message);
    }
  }

  /**
   * Calcular salario proporcional según días trabajados
   */
  private calculateProportionalSalary(baseSalary: number, workedDays: number): number {
    if (workedDays >= 30) return baseSalary;
    return (baseSalary / 30) * workedDays;
  }

  /**
   * Calcular valor de horas extra
   */
  private calculateExtraHours(baseSalary: number, hours: number): number {
    const hourlyRate = baseSalary / 240; // 240 horas mensuales (8h x 30 días)
    const extraHourRate = hourlyRate * 1.25; // 25% adicional
    return hours * extraHourRate;
  }

  /**
   * Calcular auxilio de transporte
   */
  private calculateTransportAllowance(baseSalary: number): number {
    // Solo aplica para salarios hasta 2 SMMLV
    if (baseSalary > (PayrollCalculationEngine.SMMLV_2025 * 2)) {
      return 0;
    }
    return PayrollCalculationEngine.TRANSPORT_ALLOWANCE_2025;
  }

  /**
   * Calcular lote de empleados (para optimización)
   */
  async calculateBatch(inputs: PayrollCalculationInput[]): Promise<PayrollCalculationResult[]> {
    return Promise.all(
      inputs.map(input => this.calculateEmployeePayroll(input))
    );
  }

  /**
   * Validar datos de entrada
   */
  static validateInput(input: PayrollCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.baseSalary <= 0) {
      errors.push('El salario base debe ser mayor a 0');
    }

    if (input.baseSalary < PayrollCalculationEngine.SMMLV_2025) {
      errors.push(`El salario no puede ser menor al SMMLV: $${PayrollCalculationEngine.SMMLV_2025.toLocaleString()}`);
    }

    if (input.workedDays < 0 || input.workedDays > 31) {
      errors.push('Los días trabajados deben estar entre 0 y 31');
    }

    if (input.extraHours && input.extraHours < 0) {
      errors.push('Las horas extra no pueden ser negativas');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
