
/**
 * Servicio unificado para cálculo de recargos
 * ✅ CORREGIDO: Factores TOTALES + fórmula unificada Aleluya
 * - Jornada laboral: 15 julio 2025
 * - Recargos factores: 1 julio 2025
 * - Fórmula unificada: Salario × Factor × Horas ÷ (30 × 7.333)
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
   * ✅ CORREGIDO: Factores TOTALES (no adicionales) según Aleluya
   */
  private static getFactorRecargoTotal(tipoRecargo: string, fechaPeriodo: Date): {
    factorTotal: number;
    porcentaje: string;
    normativa: string;
  } {
    const fecha = fechaPeriodo || new Date();
    
    console.log(`📅 FACTORES TOTALES: Calculando para ${tipoRecargo} en fecha: ${fecha.toISOString().split('T')[0]}`);
    
    switch (tipoRecargo) {
      case 'nocturno':
        // Recargo nocturno: 35% total
        return {
          factorTotal: 0.35,
          porcentaje: '35%',
          normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% total)'
        };
        
      case 'dominical':
        // ✅ TRANSICIÓN 1 JULIO 2025: Factores TOTALES de recargo dominical
        if (fecha < new Date('2025-07-01')) {
          return {
            factorTotal: 0.75, // 75% total
            porcentaje: '75%',
            normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% total)'
          };
        } else if (fecha < new Date('2026-07-01')) {
          return {
            factorTotal: 0.80, // ✅ ALELUYA: 80% total desde 1 julio 2025
            porcentaje: '80%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% total)'
          };
        } else if (fecha < new Date('2027-07-01')) {
          return {
            factorTotal: 0.90, // 90% total
            porcentaje: '90%',
            normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% total)'
          };
        } else {
          return {
            factorTotal: 1.00, // 100% total
            porcentaje: '100%',
            normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% total)'
          };
        }
        
      case 'nocturno_dominical':
        // ✅ Factor total específico 1.15 para Aleluya
        return {
          factorTotal: 1.15, // Factor total específico
          porcentaje: '115%',
          normativa: 'Recargo nocturno dominical - Factor total según CST'
        };
        
      default:
        console.error(`❌ Tipo de recargo no válido: ${tipoRecargo}`);
        return {
          factorTotal: 0.0,
          porcentaje: '0%',
          normativa: 'Tipo no válido'
        };
    }
  }

  /**
   * ✅ CORREGIDO: Calcula recargo usando factores totales + fórmula unificada Aleluya
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🎯 FACTORES TOTALES: Calculando recargo con fórmula Aleluya:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    const factorInfo = this.getFactorRecargoTotal(tipoRecargo, fechaPeriodo);
    
    if (!factorInfo || factorInfo.factorTotal < 0) {
      throw new Error(`Error calculando factor para tipo de recargo: ${tipoRecargo}`);
    }
    
    // ✅ FÓRMULA UNIFICADA ALELUYA: Salario × Factor × Horas ÷ (30 × 7.333) para TODOS
    const divisorAleluya = 30 * 7.333; // 219.99
    const valorRecargo = Math.round((salarioBase * factorInfo.factorTotal * horas) / divisorAleluya);
    const valorHora = salarioBase / divisorAleluya;
    const detalleCalculo = `${tipoRecargo} (fórmula Aleluya): (${salarioBase.toLocaleString()} × ${factorInfo.factorTotal} × ${horas}h) ÷ (30 × 7.333) = ${valorRecargo.toLocaleString()}`;
    
    console.log('✅ FÓRMULA ALELUYA: Recargo calculado:', {
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0],
      tipoRecargo,
      divisorAleluya,
      valorHora: Math.round(valorHora),
      factorTotal: factorInfo.factorTotal,
      valorRecargo,
      detalleCalculo
    });
    
    return {
      valorHora: Math.round(valorHora),
      factorRecargo: factorInfo.factorTotal,
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
        factorOriginal: factorInfo.factorTotal,
        porcentajeDisplay: factorInfo.porcentaje
      }
    };
  }

  /**
   * ✅ Obtiene el factor total para un tipo específico
   */
  static getFactorRecargoByDate(tipoRecargo: string, fechaPeriodo: Date = new Date()): number {
    const factorInfo = this.getFactorRecargoTotal(tipoRecargo, fechaPeriodo);
    return factorInfo.factorTotal;
  }

  /**
   * ✅ Solo 3 tipos de recargo con factores totales actualizados
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
}
