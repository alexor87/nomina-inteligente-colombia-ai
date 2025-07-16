
/**
 * Servicio unificado para cálculo de recargos
 * KISS: Una sola función, una sola fórmula, factores estandarizados
 * CORREGIDO: Usa jornada legal dinámica con fórmula correcta
 * ✅ IMPLEMENTA: Factores dinámicos según normativa colombiana vigente
 */

import { getHourlyDivisor } from '@/utils/jornadaLegal';

export interface RecargoCalculationInput {
  salarioBase: number;
  tipoRecargo: 'nocturno' | 'dominical' | 'festivo' | 'nocturno_dominical' | 'nocturno_festivo';
  horas: number;
  fechaPeriodo?: Date; // ✅ REQUERIDO: Para cálculo dinámico de factores
}

export interface RecargoCalculationResult {
  valorHora: number;
  factorRecargo: number;
  valorRecargo: number;
  detalleCalculo: string;
  jornadaInfo?: {
    horasSemanales: number;
    horasMensuales: number;
    divisorHorario: number;
    fechaVigencia: Date;
  };
  factorInfo?: {
    fechaVigencia: Date;
    normativaAplicable: string;
    factorOriginal: number;
    porcentajeDisplay: string;
  };
}

export class RecargosCalculationService {
  /**
   * ✅ FASE 1 & 2: Factores dinámicos según normativa colombiana
   * Cumple: CST arts. 160, 179; Ley 2101/2021; Ley 789/2002; Decreto 1072/2015
   */
  private static getFactorRecargo(tipoRecargo: string, fechaPeriodo: Date): {
    factor: number;
    porcentaje: string;
    normativa: string;
  } {
    const fecha = fechaPeriodo || new Date();
    
    console.log(`📅 Calculando factor de recargo para ${tipoRecargo} en fecha: ${fecha.toISOString().split('T')[0]}`);
    
    switch (tipoRecargo) {
      case 'nocturno':
        // Recargo nocturno ordinario: SIEMPRE 35% (CST Art. 168)
        return {
          factor: 0.35,
          porcentaje: '35%',
          normativa: 'CST Art. 168 - Recargo nocturno ordinario'
        };
        
      case 'dominical':
        // ✅ CORREGIDO: Recargo dominical dinámico según fechas
        if (fecha < new Date('2025-07-01')) {
          return {
            factor: 0.75,
            porcentaje: '75%',
            normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025'
          };
        } else if (fecha < new Date('2026-07-01')) {
          return {
            factor: 0.80,
            porcentaje: '80%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026'
          };
        } else if (fecha < new Date('2027-07-01')) {
          return {
            factor: 0.90,
            porcentaje: '90%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027'
          };
        } else {
          return {
            factor: 1.00,
            porcentaje: '100%',
            normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027'
          };
        }
        
      case 'festivo':
        // Recargo festivo: SIEMPRE 75% (CST Art. 179)
        return {
          factor: 0.75,
          porcentaje: '75%',
          normativa: 'CST Art. 179 - Recargo festivo'
        };
        
      case 'nocturno_dominical':
        // ✅ CORREGIDO: Nocturno + Dominical (suma de porcentajes)
        const dominicalInfo = this.getFactorRecargo('dominical', fecha);
        const factorCombinado = 0.35 + dominicalInfo.factor; // 35% nocturno + dominical correspondiente
        
        return {
          factor: factorCombinado,
          porcentaje: `${Math.round((factorCombinado) * 100)}%`,
          normativa: `Nocturno (35%) + Dominical (${dominicalInfo.porcentaje}) = ${Math.round(factorCombinado * 100)}%`
        };
        
      case 'nocturno_festivo':
        // Nocturno + Festivo: 35% + 75% = 110%
        return {
          factor: 1.10,
          porcentaje: '110%',
          normativa: 'Nocturno (35%) + Festivo (75%) = 110%'
        };
        
      default:
        console.error(`❌ Tipo de recargo no válido: ${tipoRecargo}`);
        return {
          factor: 0,
          porcentaje: '0%',
          normativa: 'Tipo no válido'
        };
    }
  }

  /**
   * ✅ FASE 1: Calcula el valor del recargo usando jornada legal dinámica y factores correctos
   * Fórmula: (salario ÷ divisor_horario_legal) × factor_dinámico × horas
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🧮 Calculando recargo con factores dinámicos:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    // ✅ MANTENER: Usar divisor horario dinámico según jornada legal
    const divisorHorario = getHourlyDivisor(fechaPeriodo);
    const valorHora = salarioBase / divisorHorario;
    
    // ✅ NUEVO: Factor dinámico según fecha y normativa
    const factorInfo = this.getFactorRecargo(tipoRecargo, fechaPeriodo);
    
    if (factorInfo.factor === 0) {
      throw new Error(`Tipo de recargo no válido: ${tipoRecargo}`);
    }
    
    // Valor del recargo = valor hora × factor dinámico × horas
    const valorRecargo = Math.round(valorHora * factorInfo.factor * horas);
    
    // Detalle del cálculo con información normativa
    const detalleCalculo = `(${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${factorInfo.porcentaje} × ${horas}h = ${valorRecargo.toLocaleString()}`;
    
    console.log('✅ Recargo calculado con factores dinámicos:', {
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0],
      tipoRecargo,
      factorAplicado: factorInfo.factor,
      porcentajeDisplay: factorInfo.porcentaje,
      normativaAplicable: factorInfo.normativa,
      divisorHorario,
      valorHora: Math.round(valorHora),
      valorRecargo,
      detalleCalculo
    });
    
    return {
      valorHora: Math.round(valorHora),
      factorRecargo: factorInfo.factor,
      valorRecargo,
      detalleCalculo,
      jornadaInfo: {
        horasSemanales: divisorHorario === 230 ? 46 : (divisorHorario === 220 ? 44 : 42),
        horasMensuales: divisorHorario,
        divisorHorario,
        fechaVigencia: fechaPeriodo
      },
      factorInfo: {
        fechaVigencia: fechaPeriodo,
        normativaAplicable: factorInfo.normativa,
        factorOriginal: factorInfo.factor,
        porcentajeDisplay: factorInfo.porcentaje
      }
    };
  }

  /**
   * ✅ FASE 1: Obtiene el factor de recargo para un tipo específico (con fecha)
   */
  static getFactorRecargoByDate(tipoRecargo: string, fechaPeriodo: Date = new Date()): number {
    const factorInfo = this.getFactorRecargo(tipoRecargo, fechaPeriodo);
    return factorInfo.factor;
  }

  /**
   * ✅ FASE 3: Obtiene todos los tipos de recargo disponibles con factores dinámicos
   */
  static getTiposRecargo(fechaPeriodo: Date = new Date()): Array<{
    tipo: string;
    factor: number;
    porcentaje: string;
    descripcion: string;
    normativa: string;
  }> {
    return [
      {
        tipo: 'nocturno',
        ...this.getFactorRecargo('nocturno', fechaPeriodo),
        descripcion: 'Recargo nocturno (10:00 PM - 6:00 AM)'
      },
      {
        tipo: 'dominical',
        ...this.getFactorRecargo('dominical', fechaPeriodo),
        descripcion: 'Recargo dominical (trabajo en domingo)'
      },
      {
        tipo: 'festivo',
        ...this.getFactorRecargo('festivo', fechaPeriodo),
        descripcion: 'Recargo festivo (trabajo en día festivo)'
      },
      {
        tipo: 'nocturno_dominical',
        ...this.getFactorRecargo('nocturno_dominical', fechaPeriodo),
        descripcion: 'Recargo nocturno dominical (domingo 10:00 PM - 6:00 AM)'
      },
      {
        tipo: 'nocturno_festivo',
        ...this.getFactorRecargo('nocturno_festivo', fechaPeriodo),
        descripcion: 'Recargo nocturno festivo (festivo 10:00 PM - 6:00 AM)'
      }
    ].map(item => ({
      tipo: item.tipo,
      factor: item.factor,
      porcentaje: item.porcentaje,
      descripcion: item.descripcion,
      normativa: item.normativa
    }));
  }
}
