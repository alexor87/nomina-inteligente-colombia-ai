
/**
 * Servicio de cálculo de nómina SIMPLE y DIRECTO
 * ÚNICA fuente de verdad para todos los cálculos
 * Principio KISS: Keep It Simple, Stupid
 */

import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025 } from '@/constants';

export interface SimplePayrollInput {
  salarioBase: number;
  diasTrabajados: number;
}

export interface SimplePayrollResult {
  salarioBase: number;
  diasTrabajados: number;
  salarioProporcional: number;
  auxilioTransporte: number;
  totalDevengado: number;
  ibc: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  totalDeducciones: number;
  netoPagar: number;
}

export class PayrollCalculationSimple {
  /**
   * Cálculo SIMPLE y DIRECTO de nómina
   * Todos los valores calculados en un solo lugar
   */
  static calculate(input: SimplePayrollInput): SimplePayrollResult {
    console.log('🎯 PayrollCalculationSimple: Calculando nómina simple:', input);

    // ✅ 1. SALARIO PROPORCIONAL: (salario_base / 30) * dias_trabajados
    const salarioProporcional = (input.salarioBase / 30) * input.diasTrabajados;

    // ✅ 2. AUXILIO DE TRANSPORTE: Solo si salario ≤ 2 SMMLV
    const limiteAuxilio = SALARIO_MINIMO_2025 * 2; // $2,847,000
    let auxilioTransporte = 0;
    
    if (input.salarioBase <= limiteAuxilio) {
      auxilioTransporte = (AUXILIO_TRANSPORTE_2025 / 30) * input.diasTrabajados;
    }

    // ✅ 3. TOTAL DEVENGADO
    const totalDevengado = salarioProporcional + auxilioTransporte;

    // ✅ 4. IBC = salario_proporcional + auxilio_transporte
    const ibc = salarioProporcional + auxilioTransporte;

    // ✅ 5. DEDUCCIONES: IBC * 4% (salud) + IBC * 4% (pensión)
    const saludEmpleado = ibc * 0.04;
    const pensionEmpleado = ibc * 0.04;
    const totalDeducciones = saludEmpleado + pensionEmpleado;

    // ✅ 6. NETO A PAGAR
    const netoPagar = totalDevengado - totalDeducciones;

    const result: SimplePayrollResult = {
      salarioBase: input.salarioBase,
      diasTrabajados: input.diasTrabajados,
      salarioProporcional: Math.round(salarioProporcional),
      auxilioTransporte: Math.round(auxilioTransporte),
      totalDevengado: Math.round(totalDevengado),
      ibc: Math.round(ibc),
      saludEmpleado: Math.round(saludEmpleado),
      pensionEmpleado: Math.round(pensionEmpleado),
      totalDeducciones: Math.round(totalDeducciones),
      netoPagar: Math.round(netoPagar)
    };

    console.log('✅ PayrollCalculationSimple: Resultado calculado:', {
      empleado: `Salario: $${input.salarioBase.toLocaleString()}`,
      proporcional: `$${result.salarioProporcional.toLocaleString()}`,
      auxilio: `$${result.auxilioTransporte.toLocaleString()}`,
      ibc: `$${result.ibc.toLocaleString()}`,
      deducciones: `$${result.totalDeducciones.toLocaleString()}`,
      neto: `$${result.netoPagar.toLocaleString()}`
    });

    return result;
  }

  /**
   * Validar si un empleado debe recibir auxilio de transporte
   */
  static shouldReceiveTransportAllowance(salarioBase: number): boolean {
    const limiteAuxilio = SALARIO_MINIMO_2025 * 2; // $2,847,000
    return salarioBase <= limiteAuxilio;
  }

  /**
   * Información de configuración actual
   */
  static getConfigurationInfo() {
    return {
      salarioMinimo: SALARIO_MINIMO_2025,
      auxilioTransporte: AUXILIO_TRANSPORTE_2025,
      limiteAuxilio: SALARIO_MINIMO_2025 * 2,
      porcentajes: {
        salud: 0.04,
        pension: 0.04
      },
      year: '2025'
    };
  }
}
