
/**
 * ✅ SERVICIO ÚNICO DE CÁLCULO DE IBC - PRINCIPIO KISS
 * Una sola fuente de verdad para todos los cálculos de IBC
 */

import { ConfigurationService } from './ConfigurationService';

export interface IBCInput {
  salarioBase: number;
  novedades: Array<{
    tipo_novedad: string;
    valor: number;
    constitutivo_salario: boolean;
  }>;
  year?: string;
}

export interface IBCResult {
  ibcFinal: number;
  salarioBase: number;
  novedadesConstitutivas: number;
  novedadesNoConstitutivas: number;
  aplicoLimites: boolean;
  detalles: {
    salarioBaseUsado: number;
    sumaNovedadesConstitutivas: number;
    ibcAntesLimites: number;
    limiteMinimo: number;
    limiteMaximo: number;
  };
}

export class IBCCalculationService {
  /**
   * ✅ CÁLCULO SIMPLE Y DIRECTO DEL IBC
   * Única función que calcula IBC correctamente
   */
  static calculateIBC(input: IBCInput): IBCResult {
    const year = input.year || '2025';
    const config = ConfigurationService.getConfiguration(year);
    
    console.log('📊 IBCCalculationService: Calculando IBC:', {
      salarioBase: input.salarioBase,
      novedadesCount: input.novedades.length,
      year: year
    });

    // ✅ 1. SEPARAR NOVEDADES CONSTITUTIVAS DE NO CONSTITUTIVAS
    const novedadesConstitutivas = input.novedades
      .filter(n => n.constitutivo_salario === true)
      .reduce((sum, n) => sum + Number(n.valor || 0), 0);

    const novedadesNoConstitutivas = input.novedades
      .filter(n => n.constitutivo_salario === false)
      .reduce((sum, n) => sum + Number(n.valor || 0), 0);

    // ✅ 2. CALCULAR IBC = SALARIO BASE + NOVEDADES CONSTITUTIVAS
    const ibcAntesLimites = input.salarioBase + novedadesConstitutivas;

    // ✅ 3. APLICAR LÍMITES NORMATIVOS (1 a 25 SMMLV)
    const limiteMinimo = config.salarioMinimo;
    const limiteMaximo = config.salarioMinimo * 25;
    
    const ibcFinal = Math.max(limiteMinimo, Math.min(ibcAntesLimites, limiteMaximo));
    const aplicoLimites = ibcFinal !== ibcAntesLimites;

    const result: IBCResult = {
      ibcFinal,
      salarioBase: input.salarioBase,
      novedadesConstitutivas,
      novedadesNoConstitutivas,
      aplicoLimites,
      detalles: {
        salarioBaseUsado: input.salarioBase,
        sumaNovedadesConstitutivas: novedadesConstitutivas,
        ibcAntesLimites,
        limiteMinimo,
        limiteMaximo
      }
    };

    console.log('✅ IBCCalculationService: IBC calculado:', {
      ibcFinal: result.ibcFinal,
      aplicoLimites: result.aplicoLimites,
      constitutivas: novedadesConstitutivas,
      noConstitutivas: novedadesNoConstitutivas
    });

    return result;
  }

  /**
   * ✅ VALIDACIÓN SIMPLE DE CONSTITUTIVIDAD
   * Solo las reglas básicas más importantes
   */
  static isConstitutive(tipoNovedad: string): boolean {
    // ✅ CONSTITUTIVAS (entran al IBC)
    const constitutivas = [
      'horas_extra',      // Horas extra SÍ son constitutivas (Art. 127 CST)
      'recargo_nocturno', // Recargos nocturnos SÍ son constitutivos
      'comision',         // Comisiones habituales
      'prima',            // Primas extralegales habituales
      'vacaciones',       // Vacaciones disfrutadas
      'licencia_remunerada' // Licencias remuneradas
    ];

    // ✅ NO CONSTITUTIVAS (no entran al IBC)
    const noConstitutivas = [
      'auxilio_transporte', // Auxilio legal de transporte
      'incapacidad',       // Incapacidades (valor EPS/ARL)
      'ausencia',          // Ausencias (descuentos)
      'licencia_no_remunerada' // Licencias no remuneradas
    ];

    if (constitutivas.includes(tipoNovedad)) return true;
    if (noConstitutivas.includes(tipoNovedad)) return false;

    // Por defecto: conservador (no constitutivo)
    return false;
  }

  /**
   * ✅ CÁLCULO DE DEDUCCIONES BASADO EN IBC
   */
  static calculateDeductions(ibc: number, year: string = '2025'): {
    salud: number;
    pension: number;
    total: number;
  } {
    const config = ConfigurationService.getConfiguration(year);
    
    const salud = ibc * config.porcentajes.saludEmpleado;
    const pension = ibc * config.porcentajes.pensionEmpleado;
    
    return {
      salud: Math.round(salud),
      pension: Math.round(pension),
      total: Math.round(salud + pension)
    };
  }
}
