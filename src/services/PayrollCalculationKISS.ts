
/**
 * ✅ SERVICIO ÚNICO DE CÁLCULO DE NÓMINA - PRINCIPIO KISS
 * Reemplaza todos los servicios complejos existentes
 */

import { IBCCalculationService } from './IBCCalculationService';
import { ConfigurationService } from './ConfigurationService';

export interface PayrollInputKISS {
  salarioBase: number;
  diasTrabajados: number;
  novedades: Array<{
    tipo_novedad: string;
    valor: number;
    constitutivo_salario: boolean;
  }>;
  year?: string;
}

export interface PayrollResultKISS {
  // Devengado
  salarioBase: number;
  salarioProporcional: number;
  auxilioTransporte: number;
  novedadesPositivas: number;
  totalDevengado: number;
  
  // IBC y Deducciones
  ibc: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  novedadesNegativas: number;
  totalDeducciones: number;
  
  // Neto
  netoPagar: number;
  
  // Detalles
  aplicoLimitesIBC: boolean;
  detallesIBC: any;
}

export class PayrollCalculationKISS {
  /**
   * ✅ CÁLCULO COMPLETO DE NÓMINA EN UNA SOLA FUNCIÓN
   * Simple, directo y fácil de entender
   */
  static calculate(input: PayrollInputKISS): PayrollResultKISS {
    const year = input.year || '2025';
    const config = ConfigurationService.getConfiguration(year);
    
    console.log('🎯 PayrollCalculationKISS: Iniciando cálculo:', {
      empleado: `Salario: $${input.salarioBase.toLocaleString()}`,
      dias: input.diasTrabajados,
      novedades: input.novedades.length
    });

    // ✅ 1. DEVENGADO: Salario proporcional
    const salarioProporcional = (input.salarioBase / 30) * input.diasTrabajados;

    // ✅ 2. DEVENGADO: Auxilio de transporte (solo si salario ≤ 2 SMMLV)
    const limiteAuxilio = config.salarioMinimo * 2;
    const auxilioTransporte = input.salarioBase <= limiteAuxilio 
      ? (config.auxilioTransporte / 30) * input.diasTrabajados 
      : 0;

    // ✅ 3. DEVENGADO: Separar novedades positivas y negativas
    const novedadesPositivas = input.novedades
      .filter(n => Number(n.valor) > 0)
      .reduce((sum, n) => sum + Number(n.valor), 0);

    const novedadesNegativas = Math.abs(input.novedades
      .filter(n => Number(n.valor) < 0)
      .reduce((sum, n) => sum + Number(n.valor), 0));

    const totalDevengado = salarioProporcional + auxilioTransporte + novedadesPositivas;

    // ✅ 4. IBC: Usar el servicio especializado
    const ibcResult = IBCCalculationService.calculateIBC({
      salarioBase: salarioProporcional, // IBC sobre salario proporcional
      novedades: input.novedades,
      year
    });

    // ✅ 5. DEDUCCIONES: Calcular sobre IBC
    const deducciones = IBCCalculationService.calculateDeductions(ibcResult.ibcFinal, year);
    const totalDeducciones = deducciones.total + novedadesNegativas;

    // ✅ 6. NETO A PAGAR
    const netoPagar = totalDevengado - totalDeducciones;

    const result: PayrollResultKISS = {
      salarioBase: input.salarioBase,
      salarioProporcional: Math.round(salarioProporcional),
      auxilioTransporte: Math.round(auxilioTransporte),
      novedadesPositivas: Math.round(novedadesPositivas),
      totalDevengado: Math.round(totalDevengado),
      
      ibc: ibcResult.ibcFinal,
      saludEmpleado: deducciones.salud,
      pensionEmpleado: deducciones.pension,
      novedadesNegativas: Math.round(novedadesNegativas),
      totalDeducciones: Math.round(totalDeducciones),
      
      netoPagar: Math.round(netoPagar),
      
      aplicoLimitesIBC: ibcResult.aplicoLimites,
      detallesIBC: ibcResult.detalles
    };

    console.log('✅ PayrollCalculationKISS: Resultado:', {
      devengado: `$${result.totalDevengado.toLocaleString()}`,
      ibc: `$${result.ibc.toLocaleString()}`,
      deducciones: `$${result.totalDeducciones.toLocaleString()}`,
      neto: `$${result.netoPagar.toLocaleString()}`
    });

    return result;
  }
}
