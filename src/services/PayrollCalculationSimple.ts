/**
 * @deprecated Re-export stub - use PayrollCalculationService directly
 */
import { PayrollCalculationService } from './PayrollCalculationService';

export interface SimplePayrollInput {
  salarioBase: number;
  diasTrabajados: number;
  year?: string;
}

export interface SimplePayrollResult {
  salarioBase: number;
  auxilioTransporte: number;
  totalDevengado: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  totalDeducciones: number;
  netoPagar: number;
}

/**
 * @deprecated Use backend calculations via useNovedadBackendCalculation
 */
export class PayrollCalculationSimple {
  static readonly SMMLV_2025 = 1423500;
  static readonly TRANSPORT_2025 = 200000;

  static calculate(input: SimplePayrollInput): SimplePayrollResult {
    console.warn('⚠️ PayrollCalculationSimple is deprecated. Use backend calculations.');
    const salario = input.salarioBase;
    const auxTransporte = salario <= 2 * this.SMMLV_2025 ? this.TRANSPORT_2025 : 0;
    const saludEmpleado = salario * 0.04;
    const pensionEmpleado = salario * 0.04;
    const totalDevengado = salario + auxTransporte;
    const totalDeducciones = saludEmpleado + pensionEmpleado;
    return {
      salarioBase: salario,
      auxilioTransporte: auxTransporte,
      totalDevengado,
      saludEmpleado,
      pensionEmpleado,
      totalDeducciones,
      netoPagar: totalDevengado - totalDeducciones,
    };
  }

  static shouldReceiveTransportAllowance(salary: number): boolean {
    return salary <= 2 * this.SMMLV_2025;
  }

  static getConfigurationInfo() {
    return {
      smmlv: this.SMMLV_2025,
      transportAllowance: this.TRANSPORT_2025,
      year: '2025',
    };
  }

  static calculateWorkedDays = PayrollCalculationService.calculateWorkedDays;
}
