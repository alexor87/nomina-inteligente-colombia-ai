
/**
 * Servicio unificado para cálculo de recargos
 * KISS: Una sola función, una sola fórmula, factores estandarizados
 * CORREGIDO: Usa jornada legal dinámica con fórmula correcta
 * Resultado debe coincidir exactamente con Aleluya
 */

import { getHourlyDivisor } from '@/utils/jornadaLegal';

export interface RecargoCalculationInput {
  salarioBase: number;
  tipoRecargo: 'nocturno' | 'dominical' | 'festivo' | 'nocturno_dominical' | 'nocturno_festivo';
  horas: number;
  fechaPeriodo?: Date; // ✅ NUEVO: Para cálculo dinámico de jornada legal
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
}

export class RecargosCalculationService {
  /**
   * Factores de recargo estandarizados según normativa colombiana
   * ✅ CORREGIDO: Recargo dominical 75% (vigente hasta 1 julio 2025)
   * TODO: Cambiar manualmente a 80% el 1 de julio 2025
   */
  private static readonly FACTORES_RECARGO = {
    nocturno: 0.35,           // 35% recargo nocturno
    dominical: 0.75,          // ✅ CORREGIDO: 75% recargo dominical (hasta 1 julio 2025)
    festivo: 0.75,            // 75% recargo festivo
    nocturno_dominical: 1.10, // ✅ CORREGIDO: 110% recargo nocturno dominical (75% + 35%)
    nocturno_festivo: 1.10    // 110% recargo nocturno festivo (75% + 35%)
  };

  /**
   * Calcula el valor del recargo usando jornada legal dinámica
   * CORREGIDO: Usa getHourlyDivisor(fecha) para cálculo exacto según período
   * Fórmula: (salario ÷ divisor_horario_legal) × factor × horas
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🧮 Calculando recargo con jornada legal dinámica:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    // ✅ CORRECCIÓN PRINCIPAL: Usar divisor horario dinámico según jornada legal
    const divisorHorario = getHourlyDivisor(fechaPeriodo);
    const valorHora = salarioBase / divisorHorario;
    
    // Factor de recargo según tipo
    const factorRecargo = this.FACTORES_RECARGO[tipoRecargo];
    
    if (!factorRecargo) {
      throw new Error(`Tipo de recargo no válido: ${tipoRecargo}`);
    }
    
    // Valor del recargo = valor hora × factor × horas
    const valorRecargo = Math.round(valorHora * factorRecargo * horas);
    
    // Detalle del cálculo para auditoría con información de jornada
    const detalleCalculo = `(${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${(factorRecargo * 100).toFixed(0)}% × ${horas}h = ${valorRecargo.toLocaleString()}`;
    
    console.log('✅ Recargo calculado con jornada dinámica:', {
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0],
      divisorHorario,
      valorHora: Math.round(valorHora),
      factorRecargo,
      valorRecargo,
      detalleCalculo
    });
    
    return {
      valorHora: Math.round(valorHora),
      factorRecargo,
      valorRecargo,
      detalleCalculo,
      jornadaInfo: {
        horasSemanales: divisorHorario === 230 ? 46 : (divisorHorario === 220 ? 44 : 42),
        horasMensuales: divisorHorario,
        divisorHorario,
        fechaVigencia: fechaPeriodo
      }
    };
  }

  /**
   * Obtiene el factor de recargo para un tipo específico
   */
  static getFactorRecargo(tipoRecargo: string): number {
    return this.FACTORES_RECARGO[tipoRecargo as keyof typeof this.FACTORES_RECARGO] || 0;
  }

  /**
   * Obtiene todos los tipos de recargo disponibles con sus factores
   */
  static getTiposRecargo(): Array<{
    tipo: string;
    factor: number;
    porcentaje: string;
    descripcion: string;
  }> {
    return [
      {
        tipo: 'nocturno',
        factor: this.FACTORES_RECARGO.nocturno,
        porcentaje: '35%',
        descripcion: 'Recargo nocturno (10:00 PM - 6:00 AM)'
      },
      {
        tipo: 'dominical',
        factor: this.FACTORES_RECARGO.dominical,
        porcentaje: '75%', // ✅ CORREGIDO: Mostrar 75% actual
        descripcion: 'Recargo dominical (vigente hasta 1 julio 2025)'
      },
      {
        tipo: 'festivo',
        factor: this.FACTORES_RECARGO.festivo,
        porcentaje: '75%',
        descripcion: 'Recargo festivo'
      },
      {
        tipo: 'nocturno_dominical',
        factor: this.FACTORES_RECARGO.nocturno_dominical,
        porcentaje: '110%', // ✅ CORREGIDO: 110% (75% + 35%)
        descripcion: 'Recargo nocturno dominical'
      },
      {
        tipo: 'nocturno_festivo',
        factor: this.FACTORES_RECARGO.nocturno_festivo,
        porcentaje: '110%',
        descripcion: 'Recargo nocturno festivo'
      }
    ];
  }
}
