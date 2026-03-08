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
  static calculate(input: SimplePayrollInput): SimplePayrollResult {
    console.warn('⚠️ PayrollCalculationSimple is deprecated. Use backend calculations.');
    const SMMLV_2025 = 1423500;
    const TRANSPORT = 200000;
    const salario = input.salarioBase;
    const auxTransporte = salario <= 2 * SMMLV_2025 ? TRANSPORT : 0;
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

  static calculateWorkedDays = PayrollCalculationService.calculateWorkedDays;
}
