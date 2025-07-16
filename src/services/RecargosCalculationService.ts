
/**
 * ✅ KISS: Servicio simplificado para cálculo de recargos
 * - Eliminado cache compartido problemático
 * - Factores totales directos
 * - Sin dependencias cruzadas
 */

export interface RecargoCalculationInput {
  salarioBase: number;
  tipoRecargo: 'nocturno' | 'dominical' | 'nocturno_dominical';
  horas: number;
  fechaPeriodo?: Date;
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
   * ✅ KISS: Factores totales directos sin cache
   */
  private static getFactorRecargoTotal(tipoRecargo: string, fechaPeriodo: Date): {
    factorTotal: number;
    porcentaje: string;
    normativa: string;
  } {
    const fecha = fechaPeriodo || new Date();
    
    switch (tipoRecargo) {
      case 'nocturno':
        return {
          factorTotal: 0.35,
          porcentaje: '35%',
          normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% total)'
        };
        
      case 'dominical':
        if (fecha < new Date('2025-07-01')) {
          return {
            factorTotal: 0.75,
            porcentaje: '75%',
            normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% total)'
          };
        } else if (fecha < new Date('2026-07-01')) {
          return {
            factorTotal: 0.80,
            porcentaje: '80%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% total)'
          };
        } else if (fecha < new Date('2027-07-01')) {
          return {
            factorTotal: 0.90,
            porcentaje: '90%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% total)'
          };
        } else {
          return {
            factorTotal: 1.00,
            porcentaje: '100%',
            normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% total)'
          };
        }
        
      case 'nocturno_dominical':
        return {
          factorTotal: 1.15,
          porcentaje: '115%',
          normativa: 'Recargo nocturno dominical - Factor total según CST'
        };
        
      default:
        return {
          factorTotal: 0.0,
          porcentaje: '0%',
          normativa: 'Tipo no válido'
        };
    }
  }

  /**
   * ✅ KISS: Cálculo directo sin cache
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    const factorInfo = this.getFactorRecargoTotal(tipoRecargo, fechaPeriodo);
    
    if (factorInfo.factorTotal <= 0) {
      throw new Error(`Error calculando factor para tipo de recargo: ${tipoRecargo}`);
    }
    
    // ✅ FÓRMULA UNIFICADA: Salario × Factor × Horas ÷ (30 × 7.333)
    const divisorAleluya = 30 * 7.333;
    const valorRecargo = Math.round((salarioBase * factorInfo.factorTotal * horas) / divisorAleluya);
    const valorHora = salarioBase / divisorAleluya;
    const detalleCalculo = `${tipoRecargo}: (${salarioBase.toLocaleString()} × ${factorInfo.factorTotal} × ${horas}h) ÷ ${divisorAleluya} = ${valorRecargo.toLocaleString()}`;
    
    return {
      valorHora: Math.round(valorHora),
      factorRecargo: factorInfo.factorTotal,
      valorRecargo,
      detalleCalculo,
      jornadaInfo: {
        horasSemanales: 44,
        horasMensuales: 220,
        divisorHorario: 220,
        fechaVigencia: fechaPeriodo
      },
      factorInfo: {
        fechaVigencia: fechaPeriodo,
        normativaAplicable: factorInfo.normativa,
        factorOriginal: factorInfo.factorTotal,
        porcentajeDisplay: factorInfo.porcentaje
      }
    };
  }

  /**
   * ✅ KISS: Solo 3 tipos de recargo
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
        ...this.getFactorRecargoTotal('nocturno', fechaPeriodo),
        descripcion: 'Recargo nocturno (10:00 PM - 6:00 AM)'
      },
      {
        tipo: 'dominical',
        ...this.getFactorRecargoTotal('dominical', fechaPeriodo),
        descripcion: 'Recargo dominical (trabajo en domingo)'
      },
      {
        tipo: 'nocturno_dominical',
        ...this.getFactorRecargoTotal('nocturno_dominical', fechaPeriodo),
        descripcion: 'Recargo nocturno dominical (domingo 10:00 PM - 6:00 AM)'
      }
    ].map(item => ({
      tipo: item.tipo,
      factor: item.factorTotal,
      porcentaje: item.porcentaje,
      descripcion: item.descripcion,
      normativa: item.normativa
    }));
  }

  static getFactorRecargoByDate(tipoRecargo: string, fechaPeriodo: Date = new Date()): number {
    const factorInfo = this.getFactorRecargoTotal(tipoRecargo, fechaPeriodo);
    return factorInfo.factorTotal;
  }
}
