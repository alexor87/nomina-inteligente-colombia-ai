
import { NovedadType } from '@/types/novedades-enhanced';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class NovedadValidationService {
  private static readonly SMMLV_2025 = 1300000;
  private static readonly MAX_HORAS_EXTRA_DIA = 12;
  private static readonly MAX_HORAS_EXTRA_SEMANA = 60;
  private static readonly MAX_DEDUCCION_PORCENTAJE = 0.5;

  static validateNovedad(
    tipo: NovedadType,
    valor: number,
    salarioBase: number,
    horas?: number,
    dias?: number,
    horasSemanales?: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (tipo) {
      case 'horas_extra':
        if (horas) {
          if (horas > this.MAX_HORAS_EXTRA_DIA) {
            errors.push(`Las horas extra no pueden superar ${this.MAX_HORAS_EXTRA_DIA} por día`);
          }
          if (horasSemanales && horasSemanales > this.MAX_HORAS_EXTRA_SEMANA) {
            errors.push(`Las horas extra no pueden superar ${this.MAX_HORAS_EXTRA_SEMANA} por semana`);
          }
        }
        break;

      case 'auxilio_conectividad':
        if (salarioBase > this.SMMLV_2025 * 2) {
          errors.push('El auxilio de conectividad solo aplica para salarios ≤ 2 SMMLV');
        }
        break;

      case 'fondo_solidaridad':
        const multiplicadorIBC = salarioBase / this.SMMLV_2025;
        if (multiplicadorIBC <= 4) {
          errors.push('El Fondo de Solidaridad Pensional solo aplica para IBC > 4 SMMLV');
        }
        break;

      // Validaciones para deducciones
      case 'embargo':
      case 'anticipo':
      case 'aporte_voluntario':
      case 'descuento_voluntario':
        const porcentajeDeduccion = valor / salarioBase;
        if (porcentajeDeduccion > this.MAX_DEDUCCION_PORCENTAJE) {
          errors.push('Las deducciones no pueden superar el 50% del salario neto');
        }
        break;
    }

    // Validaciones generales
    if (valor < 0) {
      errors.push('El valor no puede ser negativo');
    }

    if (horas && horas < 0) {
      errors.push('Las horas no pueden ser negativas');
    }

    if (dias && dias < 0) {
      errors.push('Los días no pueden ser negativos');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateAuxilioTransporte(salarioBase: number): boolean {
    return salarioBase <= this.SMMLV_2025 * 2;
  }

  static calculateFSP(ibc: number): number {
    const multiplicador = ibc / this.SMMLV_2025;
    
    if (multiplicador <= 4) return 0;
    if (multiplicador <= 16) return ibc * 0.01;
    if (multiplicador <= 17) return ibc * 0.012;
    if (multiplicador <= 18) return ibc * 0.014;
    if (multiplicador <= 19) return ibc * 0.016;
    if (multiplicador <= 20) return ibc * 0.018;
    return ibc * 0.02;
  }
}
