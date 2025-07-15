
/**
 * Servicio unificado para cálculo de recargos con factores progresivos
 * KISS: Una función principal que determina factores dinámicamente por fecha
 * CORREGIDO: Implementa Ley 2466/2024 con factores progresivos desde 1 julio 2025
 */

import { getHourlyDivisor, getDominicalFactor, getJornadaInfo } from '@/utils/jornadaLegal';

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
   * ✅ KISS: Factores base estandarizados
   */
  private static readonly FACTORES_BASE = {
    nocturno: 0.35,    // 35% recargo nocturno (fijo)
    // dominical y festivo son dinámicos por fecha (getDominicalFactor)
    // nocturno_dominical y nocturno_festivo son multiplicativos
  };

  /**
   * ✅ KISS: Función principal de cálculo con factores dinámicos unificados
   * Corrige la lógica multiplicativa para recargos combinados
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas, fechaPeriodo = new Date() } = input;
    
    console.log('🧮 KISS: Calculando recargo con factores progresivos unificados:', { 
      salarioBase, 
      tipoRecargo, 
      horas, 
      fechaPeriodo: fechaPeriodo.toISOString().split('T')[0] 
    });
    
    // ✅ KISS: Usar divisor horario dinámico unificado
    const divisorHorario = getHourlyDivisor(fechaPeriodo);
    const valorHora = salarioBase / divisorHorario;
    
    let factorRecargo: number;
    let detalleCalculo: string;
    
    // ✅ KISS: Lógica principal simplificada con casos específicos
    switch (tipoRecargo) {
      case 'nocturno':
        factorRecargo = this.FACTORES_BASE.nocturno;
        detalleCalculo = `Recargo nocturno: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × 35% × ${horas} horas = ${Math.round(valorHora * factorRecargo * horas).toLocaleString()}`;
        break;
        
      case 'dominical':
        // ✅ KISS: Factor dinámico unificado
        factorRecargo = getDominicalFactor(fechaPeriodo);
        const porcentajeDominical = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Recargo dominical: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeDominical}% × ${horas} horas = ${Math.round(valorHora * factorRecargo * horas).toLocaleString()}`;
        break;
        
      case 'festivo':
        // ✅ KISS: Festivo usa la misma lógica progresiva que dominical
        factorRecargo = getDominicalFactor(fechaPeriodo);
        const porcentajeFestivo = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Recargo festivo: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeFestivo}% × ${horas} horas = ${Math.round(valorHora * factorRecargo * horas).toLocaleString()}`;
        break;
        
      case 'nocturno_dominical':
        // ✅ CORRECCIÓN MULTIPLICATIVA: 1.35 × factor_dominical_fecha
        const factorDominicalNocturno = getDominicalFactor(fechaPeriodo);
        factorRecargo = 1.35 * factorDominicalNocturno; // Multiplicativo, no suma
        const porcentajeND = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Recargo nocturno dominical: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeND}% × ${horas} horas = ${Math.round(valorHora * factorRecargo * horas).toLocaleString()}`;
        console.log(`🎯 RECARGO: Nocturno Dominical = 1.35 × ${(factorDominicalNocturno * 100).toFixed(0)}% = ${porcentajeND}%`);
        break;
        
      case 'nocturno_festivo':
        // ✅ CORRECCIÓN MULTIPLICATIVA: 1.35 × factor_festivo_fecha
        const factorFestivoNocturno = getDominicalFactor(fechaPeriodo);
        factorRecargo = 1.35 * factorFestivoNocturno; // Multiplicativo, no suma
        const porcentajeNF = (factorRecargo * 100).toFixed(0);
        detalleCalculo = `Recargo nocturno festivo: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeNF}% × ${horas} horas = ${Math.round(valorHora * factorRecargo * horas).toLocaleString()}`;
        console.log(`🎯 RECARGO: Nocturno Festivo = 1.35 × ${(factorFestivoNocturno * 100).toFixed(0)}% = ${porcentajeNF}%`);
        break;
        
      default:
        throw new Error(`Tipo de recargo no válido: ${tipoRecargo}`);
    }
    
    // Valor del recargo = valor hora × factor × horas
    const valorRecargo = Math.round(valorHora * factorRecargo * horas);
    
    console.log('✅ KISS: Recargo calculado con factores dinámicos unificados:', {
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
        ...getJornadaInfo(fechaPeriodo),
        fechaVigencia: fechaPeriodo
      }
    };
  }

  /**
   * ✅ KISS: Obtiene el factor de recargo para un tipo y fecha específicos (unificado)
   */
  static getFactorRecargo(tipoRecargo: string, fecha: Date = new Date()): number {
    switch (tipoRecargo) {
      case 'nocturno':
        return this.FACTORES_BASE.nocturno;
      case 'dominical':
      case 'festivo':
        return getDominicalFactor(fecha);
      case 'nocturno_dominical':
      case 'nocturno_festivo':
        return 1.35 * getDominicalFactor(fecha);
      default:
        return 0;
    }
  }

  /**
   * ✅ KISS: Información de tipos de recargo con factores dinámicos unificados
   */
  static getTiposRecargo(fecha: Date = new Date()): Array<{
    tipo: string;
    factor: number;
    porcentaje: string;
    descripcion: string;
  }> {
    const factorDominical = getDominicalFactor(fecha);
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
