
/**
 * Servicio unificado para cálculo de recargos
 * CORREGIDO: Factores totales según valores de Aleluya
 * ✅ IMPLEMENTA: Solo 3 tipos de recargo con factores exactos de Aleluya
 */

import { getHourlyDivisor } from '@/utils/jornadaLegal';

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
   * ✅ CORREGIDO: Factores totales según Aleluya (incluyen salario base)
   */
  private static getFactorRecargo(tipoRecargo: string, fechaPeriodo: Date): {
    factor: number;
    porcentaje: string;
    normativa: string;
  } {
    const fecha = fechaPeriodo || new Date();
    
    console.log(`📅 ALELUYA FACTORS: Calculando factor para ${tipoRecargo} en fecha: ${fecha.toISOString().split('T')[0]}`);
    
    switch (tipoRecargo) {
      case 'nocturno':
        // Recargo nocturno: Factor total 1.35 (base + 35%)
        return {
          factor: 1.35,
          porcentaje: '135%',
          normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% adicional)'
        };
        
      case 'dominical':
        // ✅ CORREGIDO: Recargo dominical con factores totales dinámicos
        if (fecha < new Date('2025-07-01')) {
          return {
            factor: 1.75, // Factor total (base + 75%)
            porcentaje: '175%',
            normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% adicional)'
          };
        } else if (fecha < new Date('2026-07-01')) {
          return {
            factor: 1.80, // Factor total (base + 80%)
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
        // ✅ CORREGIDO: Factor específico 1.15 según Aleluya (NO es suma simple)
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
   * ✅ CORREGIDO: Calcula el valor del recargo usando factores totales de Aleluya
   * Fórmula: (salario ÷ divisor_horario_legal) × factor_total × horas
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🎯 ALELUYA CALCULATION: Calculando con factores totales:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    // Usar divisor horario dinámico según jornada legal
    const divisorHorario = getHourlyDivisor(fechaPeriodo);
    const valorHora = salarioBase / divisorHorario;
    
    // Factor total según Aleluya
    const factorInfo = this.getFactorRecargo(tipoRecargo, fechaPeriodo);
    
    if (factorInfo.factor === 1.0 && tipoRecargo !== 'base') {
      throw new Error(`Tipo de recargo no válido: ${tipoRecargo}`);
    }
    
    // ✅ CORREGIDO: Valor del recargo = valor hora × factor total × horas
    const valorRecargo = Math.round(valorHora * factorInfo.factor * horas);
    
    // Detalle del cálculo con información normativa
    const detalleCalculo = `(${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${factorInfo.porcentaje} × ${horas}h = ${valorRecargo.toLocaleString()}`;
    
    console.log('✅ ALELUYA RESULT: Recargo calculado con factores totales:', {
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0],
      tipoRecargo,
      factorTotal: factorInfo.factor,
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
   * ✅ CORREGIDO: Obtiene el factor total para un tipo específico
   */
  static getFactorRecargoByDate(tipoRecargo: string, fechaPeriodo: Date = new Date()): number {
    const factorInfo = this.getFactorRecargo(tipoRecargo, fechaPeriodo);
    return factorInfo.factor;
  }

  /**
   * ✅ SIMPLIFICADO: Solo 3 tipos de recargo según requerimiento del usuario
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
