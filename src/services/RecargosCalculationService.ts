
/**
 * Servicio unificado para cálculo de recargos
 * KISS: Una sola función, una sola fórmula, factores estandarizados
 * Resultado debe coincidir exactamente con Aleluya
 */

export interface RecargoCalculationInput {
  salarioBase: number;
  tipoRecargo: 'nocturno' | 'dominical' | 'festivo' | 'nocturno_dominical' | 'nocturno_festivo';
  horas: number;
}

export interface RecargoCalculationResult {
  valorHora: number;
  factorRecargo: number;
  valorRecargo: number;
  detalleCalculo: string;
}

export class RecargosCalculationService {
  /**
   * Factores de recargo estandarizados según normativa colombiana
   */
  private static readonly FACTORES_RECARGO = {
    nocturno: 0.35,           // 35% recargo nocturno
    dominical: 0.80,          // 80% recargo dominical
    festivo: 0.75,            // 75% recargo festivo
    nocturno_dominical: 1.15, // 115% recargo nocturno dominical
    nocturno_festivo: 1.10    // 110% recargo nocturno festivo
  };

  /**
   * Calcula el valor del recargo usando la fórmula exacta de Aleluya
   * Fórmula: (salario ÷ 30 ÷ 7.3333) × factor × horas
   */
  static calcularRecargo(input: RecargoCalculationInput): RecargoCalculationResult {
    const { salarioBase, tipoRecargo, horas } = input;
    
    console.log('🧮 Calculando recargo unificado:', { salarioBase, tipoRecargo, horas });
    
    // Valor hora exacto como Aleluya: salario ÷ 30 ÷ 7.3333
    const valorHora = salarioBase / 30 / 7.3333;
    
    // Factor de recargo según tipo
    const factorRecargo = this.FACTORES_RECARGO[tipoRecargo];
    
    if (!factorRecargo) {
      throw new Error(`Tipo de recargo no válido: ${tipoRecargo}`);
    }
    
    // Valor del recargo = valor hora × factor × horas
    const valorRecargo = Math.round(valorHora * factorRecargo * horas);
    
    // Detalle del cálculo para auditoría
    const detalleCalculo = `(${salarioBase.toLocaleString()} ÷ 30 ÷ 7.3333) × ${(factorRecargo * 100).toFixed(0)}% × ${horas}h = ${valorRecargo.toLocaleString()}`;
    
    console.log('✅ Recargo calculado:', {
      valorHora: Math.round(valorHora),
      factorRecargo,
      valorRecargo,
      detalleCalculo
    });
    
    return {
      valorHora: Math.round(valorHora),
      factorRecargo,
      valorRecargo,
      detalleCalculo
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
        porcentaje: '80%',
        descripcion: 'Recargo dominical'
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
        porcentaje: '115%',
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
