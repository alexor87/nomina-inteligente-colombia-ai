
/**
 * Servicio unificado para cálculo de recargos con factores progresivos
 * KISS: Una función principal que determina factores dinámicamente por fecha
 * CORREGIDO: Implementa Ley 2466/2024 con factores progresivos desde 1 julio 2025
 */

import { getHourlyDivisor } from '@/utils/jornadaLegal';

export interface RecargoCalculationInput {
  salarioBase: number;
  tipoRecargo: 'nocturno' | 'dominical' | 'festivo' | 'nocturno_dominical' | 'nocturno_festivo';
  horas: number;
  fechaPeriodo?: Date; // ✅ CRÍTICO: Para cálculo dinámico de factores progresivos
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
   * ✅ KISS: Función principal para obtener factores progresivos según fecha
   * Implementa Ley 2466/2024 - Factores progresivos para dominical/festivo
   */
  private static getDominicalFactor(fecha: Date): number {
    const year = fecha.getFullYear();
    const fechaString = fecha.toISOString().split('T')[0];
    
    console.log(`🎯 RECARGO: Calculando factor dominical para ${fechaString}`);
    
    // ✅ CORRECCIÓN CRÍTICA: Implementación desde 1 julio 2025 (no 15 julio)
    if (year >= 2027) {
      console.log(`🎯 RECARGO: Factor 2027+ = 100%`);
      return 1.00; // 100% a partir de 2027
    }
    
    if (year === 2026) {
      console.log(`🎯 RECARGO: Factor 2026 = 90%`);
      return 0.90; // 90% en 2026
    }
    
    if (year === 2025) {
      // ✅ FECHA CRÍTICA CORREGIDA: 1 julio 2025 (no 15 julio)
      if (fechaString >= '2025-07-01') {
        console.log(`🎯 RECARGO: Factor desde 1-jul-2025 = 80%`);
        return 0.80; // 80% desde 1 julio 2025
      } else {
        console.log(`🎯 RECARGO: Factor antes 1-jul-2025 = 75%`);
        return 0.75; // 75% hasta 30 junio 2025
      }
    }
    
    // Antes de 2025
    console.log(`🎯 RECARGO: Factor anterior a 2025 = 75%`);
    return 0.75; // 75% antes de 2025
  }

  /**
   * ✅ KISS: Factores base estandarizados
   */
  private static readonly FACTORES_BASE = {
    nocturno: 0.35,    // 35% recargo nocturno (fijo)
    // dominical y festivo son dinámicos por fecha
    // nocturno_dominical y nocturno_festivo son multiplicativos
  };

  /**
   * ✅ KISS: Función principal de cálculo con factores dinámicos
   * Corrige la lógica multiplicativa para recargos combinados
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🧮 KISS: Calculando recargo con factores progresivos:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    // Usar divisor horario dinámico según jornada legal
    const divisorHorario = getHourlyDivisor(fechaPeriodo);
    const valorHora = salarioBase / divisorHorario;
    
    let factorRecargo: number;
    let detalleCalculo: string;
    
    // ✅ KISS: Lógica principal simplificada con casos específicos
    switch (tipoRecargo) {
      case 'nocturno':
        factorRecargo = this.FACTORES_BASE.nocturno;
        detalleCalculo = `Nocturno: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × 35% × ${horas}h`;
        break;
        
      case 'dominical':
        factorRecargo = this.getDominicalFactor(fechaPeriodo);
        const porcentajeDominical = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Dominical: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${porcentajeDominical}% × ${horas}h`;
        break;
        
      case 'festivo':
        // ✅ KISS: Festivo usa la misma lógica progresiva que dominical
        factorRecargo = this.getDominicalFactor(fechaPeriodo);
        const porcentajeFestivo = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Festivo: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${porcentajeFestivo}% × ${horas}h`;
        break;
        
      case 'nocturno_dominical':
        // ✅ CORRECCIÓN MULTIPLICATIVA: 1.35 × factor_dominical_fecha
        const factorDominicalNocturno = this.getDominicalFactor(fechaPeriodo);
        factorRecargo = 1.35 * factorDominicalNocturno; // Multiplicativo, no suma
        const porcentajeND = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Nocturno Dominical: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${porcentajeND}% × ${horas}h`;
        console.log(`🎯 RECARGO: Nocturno Dominical = 1.35 × ${(factorDominicalNocturno * 100).toFixed(0)}% = ${porcentajeND}%`);
        break;
        
      case 'nocturno_festivo':
        // ✅ CORRECCIÓN MULTIPLICATIVA: 1.35 × factor_festivo_fecha
        const factorFestivoNocturno = this.getDominicalFactor(fechaPeriodo);
        factorRecargo = 1.35 * factorFestivoNocturno; // Multiplicativo, no suma
        const porcentajeNF = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Nocturno Festivo: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}h) × ${porcentajeNF}% × ${horas}h`;
        console.log(`🎯 RECARGO: Nocturno Festivo = 1.35 × ${(factorFestivoNocturno * 100).toFixed(0)}% = ${porcentajeNF}%`);
        break;
        
      default:
        throw new Error(`Tipo de recargo no válido: ${tipoRecargo}`);
    }
    
    // Valor del recargo = valor hora × factor × horas
    const valorRecargo = Math.round(valorHora * factorRecargo * horas);
    
    console.log('✅ KISS: Recargo calculado con factores dinámicos:', {
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
   * ✅ KISS: Obtiene el factor de recargo para un tipo y fecha específicos
   */
  static getFactorRecargo(tipoRecargo: string, fecha: Date = new Date()): number {
    switch (tipoRecargo) {
      case 'nocturno':
        return this.FACTORES_BASE.nocturno;
      case 'dominical':
      case 'festivo':
        return this.getDominicalFactor(fecha);
      case 'nocturno_dominical':
      case 'nocturno_festivo':
        return 1.35 * this.getDominicalFactor(fecha);
      default:
        return 0;
    }
  }

  /**
   * ✅ KISS: Información de tipos de recargo con factores dinámicos
   */
  static getTiposRecargo(fecha: Date = new Date()): Array<{
    tipo: string;
    factor: number;
    porcentaje: string;
    descripcion: string;
  }> {
    const factorDominical = this.getDominicalFactor(fecha);
    const factorNocturnoDominical = 1.35 * factorDominical;
    const factorNocturnoFestivo = 1.35 * factorDominical;
    
    return [
      {
        tipo: 'nocturno',
        factor: this.FACTORES_BASE.nocturno,
        porcentaje: '35%',
        descripcion: 'Recargo nocturno (10:00 PM - 6:00 AM)'
      },
      {
        tipo: 'dominical',
        factor: factorDominical,
        porcentaje: `${(factorDominical * 100).toFixed(0)}%`,
        descripcion: 'Recargo dominical (progresivo por Ley 2466/2024)'
      },
      {
        tipo: 'festivo',
        factor: factorDominical,
        porcentaje: `${(factorDominical * 100).toFixed(0)}%`,
        descripcion: 'Recargo festivo (progresivo por Ley 2466/2024)'
      },
      {
        tipo: 'nocturno_dominical',
        factor: factorNocturnoDominical,
        porcentaje: `${(factorNocturnoDominical * 100).toFixed(0)}%`,
        descripcion: 'Recargo nocturno dominical (multiplicativo)'
      },
      {
        tipo: 'nocturno_festivo',
        factor: factorNocturnoFestivo,
        porcentaje: `${(factorNocturnoFestivo * 100).toFixed(0)}%`,
        descripcion: 'Recargo nocturno festivo (multiplicativo)'
      }
    ];
  }
}
