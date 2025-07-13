
/**
 * ✅ MOTOR DE CÁLCULOS DE NÓMINA - SOLO BACKEND
 * ⚠️ ELIMINADOS TODOS LOS CÁLCULOS FRONTEND
 * Todos los cálculos ahora se realizan exclusivamente en el backend
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
  
  // Constantes legales 2025 - SOLO para referencia
  private static readonly SMMLV_2025 = 1300000;
  private static readonly TRANSPORT_ALLOWANCE_2025 = 162000;

  /**
   * ⚠️ MÉTODO DEPRECADO - USAR BACKEND
   * @deprecated Todos los cálculos se realizan ahora en el backend
   */
  async calculateEmployeePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    console.error('❌ PayrollCalculationEngine.calculateEmployeePayroll está deprecado');
    console.error('🔄 Usar PayrollCalculationEnhancedService o backend calculations');
    
    throw new Error('PayrollCalculationEngine deprecado. Usar backend calculations.');
  }

  /**
   * ⚠️ MÉTODO DEPRECADO - USAR BACKEND
   * @deprecated Usar backend para cálculos de salario proporcional
   */
  private calculateProportionalSalary(baseSalary: number, workedDays: number): number {
    console.error('❌ calculateProportionalSalary eliminado del frontend');
    throw new Error('Usar backend para cálculos de salario proporcional');
  }

  /**
   * ⚠️ MÉTODO ELIMINADO - USAR BACKEND
   * @deprecated Las horas extra se calculan exclusivamente en el backend con jornada legal dinámica
   */
  private calculateExtraHours(baseSalary: number, hours: number): number {
    console.error('❌ calculateExtraHours eliminado del frontend');
    console.error('🔄 Usar useNovedadBackendCalculation para horas extra');
    throw new Error('Cálculos de horas extra movidos al backend');
  }

  /**
   * ⚠️ MÉTODO ELIMINADO - USAR BACKEND
   * @deprecated Auxilio de transporte se calcula en el backend
   */
  private calculateTransportAllowance(baseSalary: number): number {
    console.error('❌ calculateTransportAllowance eliminado del frontend');
    throw new Error('Usar backend para auxilio de transporte');
  }

  /**
   * Validar datos de entrada - ÚNICO método que permanece
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
