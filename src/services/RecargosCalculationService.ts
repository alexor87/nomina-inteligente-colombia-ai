/**
 * ⚠️ SERVICIO COMPLETAMENTE ELIMINADO - SOLO BACKEND
 * @deprecated Todos los cálculos de recargos se realizan exclusivamente en el backend
 * @removed RecargosCalculationService completo eliminado
 * 
 * ✅ USAR: useNovedadBackendCalculation hook
 * ✅ BACKEND: supabase/functions/payroll-calculations
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
  static calcularRecargo(): never {
    throw new Error('🚫 RecargosCalculationService eliminado - usar solo backend calculations');
  }

  static getTiposRecargo(): never {
    throw new Error('🚫 RecargosCalculationService eliminado - usar solo backend calculations');
  }

  static getFactorRecargoByDate(): never {
    throw new Error('🚫 RecargosCalculationService eliminado - usar solo backend calculations');
  }
}