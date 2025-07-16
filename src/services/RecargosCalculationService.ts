
/**
 * Servicio unificado para cálculo de recargos
 * ✅ CORREGIDO: Factores como adicionales + fórmula especial nocturno dominical
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
   * ✅ CORREGIDO: Factores ADICIONALES (no totales) con transición 1 julio 2025
   */
  private static getFactorRecargoAdicional(tipoRecargo: string, fechaPeriodo: Date): {
    factorAdicional: number;
    porcentaje: string;
    normativa: string;
  } {
    const fecha = fechaPeriodo || new Date();
    
    console.log(`📅 FACTORES ADICIONALES: Calculando para ${tipoRecargo} en fecha: ${fecha.toISOString().split('T')[0]}`);
    
    switch (tipoRecargo) {
      case 'nocturno':
        // Recargo nocturno: 35% adicional
        return {
          factorAdicional: 0.35,
          porcentaje: '35%',
          normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% adicional)'
        };
        
      case 'dominical':
        // ✅ TRANSICIÓN 1 JULIO 2025: Factores ADICIONALES de recargo dominical
        if (fecha < new Date('2025-07-01')) {
          return {
            factorAdicional: 0.75, // 75% adicional
            porcentaje: '75%',
            normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% adicional)'
          };
        } else if (fecha < new Date('2026-07-01')) {
          return {
            factorAdicional: 0.80, // ✅ NUEVO: 80% adicional desde 1 julio 2025
            porcentaje: '80%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% adicional)'
          };
        } else if (fecha < new Date('2027-07-01')) {
          return {
            factorAdicional: 0.90, // 90% adicional
            porcentaje: '90%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% adicional)'
          };
        } else {
          return {
            factorAdicional: 1.00, // 100% adicional
            porcentaje: '100%',
            normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% adicional)'
          };
        }
        
      case 'nocturno_dominical':
        // ✅ Factor específico 1.15 para fórmula especial Aleluya
        return {
          factorAdicional: 1.15, // Factor específico para fórmula especial
          porcentaje: '115%',
          normativa: 'Recargo nocturno dominical - Factor específico según CST'
        };
        
      default:
        console.error(`❌ Tipo de recargo no válido: ${tipoRecargo}`);
        return {
          factorAdicional: 0.0,
          porcentaje: '0%',
          normativa: 'Tipo no válido'
        };
    }
  }

  /**
   * ✅ CORREGIDO: Calcula recargo usando factores adicionales + fórmula especial
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🎯 FACTORES ADICIONALES: Calculando recargo con factores corregidos:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    const factorInfo = this.getFactorRecargoAdicional(tipoRecargo, fechaPeriodo);
    
    if (!factorInfo || factorInfo.factorAdicional < 0) {
      throw new Error(`Error calculando factor para tipo de recargo: ${tipoRecargo}`);
    }
    
    let valorRecargo: number;
    let detalleCalculo: string;
    let valorHora: number;
    
    if (tipoRecargo === 'nocturno_dominical') {
      // ✅ FÓRMULA ESPECIAL ALELUYA: Salario × Factor × Horas ÷ (30 × 7.333)
      const divisorEspecial = 30 * 7.333; // 220
      valorRecargo = Math.round((salarioBase * factorInfo.factorAdicional * horas) / divisorEspecial);
      valorHora = salarioBase / divisorEspecial;
      detalleCalculo = `Nocturno Dominical (fórmula especial): (${salarioBase.toLocaleString()} × ${factorInfo.factorAdicional} × ${horas}h) ÷ (30 × 7.333) = ${valorRecargo.toLocaleString()}`;
      
      console.log('✅ FÓRMULA ESPECIAL: Nocturno Dominical calculado:', {
        salarioBase,
        factor: factorInfo.factorAdicional,
        horas,
        divisorEspecial,
        valorRecargo,
        detalleCalculo
      });
    } else {
      // ✅ FÓRMULA NORMAL: valorHora × (1 + factor_adicional) × horas
      const divisorHorario = getHourlyDivisorForRecargos(fechaPeriodo);
      valorHora = calcularValorHoraParaRecargos(salarioBase, fechaPeriodo);
      const factorTotal = 1 + factorInfo.factorAdicional;
      
      valorRecargo = Math.round(valorHora * factorTotal * horas);
      detalleCalculo = `${tipoRecargo}: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × (1 + ${factorInfo.porcentaje}) × ${horas}h = ${valorRecargo.toLocaleString()}`;
      
      console.log('✅ FÓRMULA NORMAL: Recargo calculado:', {
        fechaPeriodo: fechaPeriodo.toISOString().split('T')[0],
        tipoRecargo,
        divisorHorario,
        valorHora: Math.round(valorHora),
        factorAdicional: factorInfo.factorAdicional,
        factorTotal,
        valorRecargo,
        detalleCalculo
      });
    }
    
    return {
      valorHora: Math.round(valorHora),
      factorRecargo: factorInfo.factorAdicional,
      valorRecargo,
      detalleCalculo,
      jornadaInfo: {
        horasSemanales: getHourlyDivisorForRecargos(fechaPeriodo) === 220 ? 44 : 46,
        horasMensuales: getHourlyDivisorForRecargos(fechaPeriodo),
        divisorHorario: getHourlyDivisorForRecargos(fechaPeriodo),
        fechaVigencia: fechaPeriodo
      },
      factorInfo: {
        fechaVigencia: fechaPeriodo,
        normativaAplicable: factorInfo.normativa,
        factorOriginal: factorInfo.factorAdicional,
        porcentajeDisplay: factorInfo.porcentaje
      }
    };
  }

  /**
   * ✅ Obtiene el factor adicional para un tipo específico
   */
  static getFactorRecargoByDate(tipoRecargo: string, fechaPeriodo: Date = new Date()): number {
    const factorInfo = this.getFactorRecargoAdicional(tipoRecargo, fechaPeriodo);
    return factorInfo.factorAdicional;
  }

  /**
   * ✅ Solo 3 tipos de recargo con factores adicionales actualizados
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
        ...this.getFactorRecargoAdicional('nocturno', fechaPeriodo),
        descripcion: 'Recargo nocturno (10:00 PM - 6:00 AM)'
      },
      {
        tipo: 'dominical',
        ...this.getFactorRecargoAdicional('dominical', fechaPeriodo),
        descripcion: 'Recargo dominical (trabajo en domingo)'
      },
      {
        tipo: 'nocturno_dominical',
        ...this.getFactorRecargoAdicional('nocturno_dominical', fechaPeriodo),
        descripcion: 'Recargo nocturno dominical (domingo 10:00 PM - 6:00 AM)'
      }
    ].map(item => ({
      tipo: item.tipo,
      factor: item.factorAdicional,
      porcentaje: item.porcentaje,
      descripcion: item.descripcion,
      normativa: item.normativa
    }));
  }
}
