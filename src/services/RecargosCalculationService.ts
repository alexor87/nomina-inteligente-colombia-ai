
/**
 * Servicio unificado para cálculo de recargos
 * ✅ CORREGIDO: Lógica dual de transiciones implementada
 * - Jornada laboral: 15 julio 2025
 * - Recargos factores: 1 julio 2025
 */

import { getHourlyDivisorForRecargos, calcularValorHoraParaRecargos } from '@/utils/jornadaLegal';

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
   * ✅ CORREGIDO: Factores de recargos con transición 1 julio 2025
   */
  private static getFactorRecargo(tipoRecargo: string, fechaPeriodo: Date): {
    factor: number;
    porcentaje: string;
    normativa: string;
  } {
    const fecha = fechaPeriodo || new Date();
    
    console.log(`📅 RECARGO FACTORS: Calculando factor para ${tipoRecargo} en fecha: ${fecha.toISOString().split('T')[0]}`);
    
    switch (tipoRecargo) {
      case 'nocturno':
        // Recargo nocturno: Factor total 1.35 (base + 35%)
        return {
          factor: 1.35,
          porcentaje: '135%',
          normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% adicional)'
        };
        
      case 'dominical':
        // ✅ TRANSICIÓN 1 JULIO 2025: Factores de recargo dominical
        if (fecha < new Date('2025-07-01')) {
          return {
            factor: 1.75, // Factor total (base + 75%)
            porcentaje: '175%',
            normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% adicional)'
          };
        } else if (fecha < new Date('2026-07-01')) {
          return {
            factor: 1.80, // ✅ NUEVO: Factor total (base + 80%) desde 1 julio 2025
            porcentaje: '180%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% adicional)'
          };
        } else if (fecha < new Date('2027-07-01')) {
          return {
            factor: 1.90, // Factor total (base + 90%)
            porcentaje: '190%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% adicional)'
          };
        } else {
          return {
            factor: 2.00, // Factor total (base + 100%)
            porcentaje: '200%',
            normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% adicional)'
          };
        }
        
      case 'nocturno_dominical':
        // ✅ Factor específico 1.15 según Aleluya
        return {
          factor: 1.15,
          porcentaje: '115%',
          normativa: 'Recargo nocturno dominical - Factor específico según CST'
        };
        
      default:
        console.error(`❌ Tipo de recargo no válido: ${tipoRecargo}`);
        return {
          factor: 1.0,
          porcentaje: '100%',
          normativa: 'Tipo no válido'
        };
    }
  }

  /**
   * ✅ CORREGIDO: Calcula recargo usando divisor específico para recargos
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🎯 DUAL LOGIC CALCULATION: Calculando recargo con lógica dual:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    // ✅ USAR DIVISOR ESPECÍFICO PARA RECARGOS
    const divisorHorario = getHourlyDivisorForRecargos(fechaPeriodo);
    const valorHora = calcularValorHoraParaRecargos(salarioBase, fechaPeriodo);
    
    // ✅ FACTOR CON TRANSICIÓN 1 JULIO 2025
    const factorInfo = this.getFactorRecargo(tipoRecargo, fechaPeriodo);
    
    if (!factorInfo || factorInfo.factor <= 0) {
      throw new Error(`Error calculando factor para tipo de recargo: ${tipoRecargo}`);
    }
    
    // ✅ Valor del recargo = valor hora × factor total × horas
    const valorRecargo = Math.round(valorHora * factorInfo.factor * horas);
    
    // Detalle del cálculo con información normativa
    const detalleCalculo = `(${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${factorInfo.porcentaje} × ${horas}h = ${valorRecargo.toLocaleString()}`;
    
    console.log('✅ DUAL LOGIC RESULT: Recargo calculado con lógica dual:', {
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0],
      tipoRecargo,
      divisorHorarioRecargos: divisorHorario,
      factorTotal: factorInfo.factor,
      porcentajeDisplay: factorInfo.porcentaje,
      normativaAplicable: factorInfo.normativa,
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
   * ✅ Obtiene el factor total para un tipo específico
   */
  static getFactorRecargoByDate(tipoRecargo: string, fechaPeriodo: Date = new Date()): number {
    const factorInfo = this.getFactorRecargo(tipoRecargo, fechaPeriodo);
    return factorInfo.factor;
  }

  /**
   * ✅ Solo 3 tipos de recargo con factores actualizados
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
        tipo: 'nocturno_dominical',
        ...this.getFactorRecargo('nocturno_dominical', fechaPeriodo),
        descripcion: 'Recargo nocturno dominical (domingo 10:00 PM - 6:00 AM)'
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
