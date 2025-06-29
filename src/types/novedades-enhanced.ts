import { getJornadaLegal, getHourlyDivisor } from '@/utils/jornadaLegal';

// Enhanced NovedadType that includes all database types
export type NovedadType =
  | 'horas_extra'
  | 'recargo_nocturno'
  | 'vacaciones'
  | 'licencia_remunerada'
  | 'incapacidad'
  | 'bonificacion'
  | 'comision'
  | 'prima'
  | 'otros_ingresos'
  | 'libranza'
  | 'multa'
  | 'ausencia'
  | 'descuento_voluntario'
  | 'retencion_fuente'
  | 'fondo_solidaridad'
  | 'salud'
  | 'pension'
  | 'arl'
  | 'caja_compensacion'
  | 'icbf'
  | 'sena';

export const NOVEDAD_CATEGORIES: Record<NovedadType, 'devengado' | 'deduccion'> = {
  horas_extra: 'devengado',
  recargo_nocturno: 'devengado',
  vacaciones: 'devengado',
  licencia_remunerada: 'devengado',
  incapacidad: 'devengado',
  bonificacion: 'devengado',
  comision: 'devengado',
  prima: 'devengado',
  otros_ingresos: 'devengado',
  libranza: 'deduccion',
  multa: 'deduccion',
  ausencia: 'deduccion',
  descuento_voluntario: 'deduccion',
  retencion_fuente: 'deduccion',
  fondo_solidaridad: 'deduccion',
  salud: 'deduccion',
  pension: 'deduccion',
  arl: 'deduccion',
  caja_compensacion: 'deduccion',
  icbf: 'deduccion',
  sena: 'deduccion'
};

export interface PayrollNovedad {
  id: string;
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: NovedadType;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  base_calculo?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateNovedadData {
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: NovedadType;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  base_calculo?: any;
  subtipo?: string;
}

export interface BaseCalculoData {
  salario_base: number;
  tipo_calculo: string;
  detalle_calculo: string;
  factor_calculo: number;
  jornada_legal?: {
    horas_semanales: number;
    divisor_horario: number;
    ley: string;
    fecha_vigencia: string;
  };
}

export interface CalculationResult {
  valor: number;
  baseCalculo: BaseCalculoData;
}

/**
 * Versión mejorada de calcularValorNovedad que considera la jornada legal dinámica
 */
export const calcularValorNovedadEnhanced = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number,
  fechaPeriodo: Date = new Date() // Nueva propiedad para cálculos históricos
): CalculationResult => {
  const jornadaLegal = getJornadaLegal(fechaPeriodo);
  const hourlyDivisor = getHourlyDivisor(fechaPeriodo);
  const valorHoraOrdinaria = salarioBase / hourlyDivisor;
  const valorDiario = salarioBase / 30;

  console.log(`💰 Calculando novedad ${tipoNovedad} con jornada de ${jornadaLegal.horasSemanales}h semanales`);
  console.log(`📊 Valor hora ordinaria: ${valorHoraOrdinaria} (divisor: ${hourlyDivisor})`);

  const result: CalculationResult = {
    valor: 0,
    baseCalculo: {
      salario_base: salarioBase,
      tipo_calculo: tipoNovedad,
      detalle_calculo: '',
      factor_calculo: 1.0,
      jornada_legal: {
        horas_semanales: jornadaLegal.horasSemanales,
        divisor_horario: hourlyDivisor,
        ley: jornadaLegal.ley,
        fecha_vigencia: fechaPeriodo.toISOString().split('T')[0]
      }
    }
  };

  try {
    switch (tipoNovedad) {
      case 'horas_extra':
        if (!horas || horas <= 0) {
          throw new Error('Las horas extra deben ser mayor a 0');
        }

        let recargo = 0.25; // 25% por defecto
        let descripcionRecargo = 'diurnas (25%)';

        if (subtipo) {
          switch (subtipo) {
            case 'nocturnas':
              recargo = 0.75;
              descripcionRecargo = 'nocturnas (75%)';
              break;
            case 'dominicales_diurnas':
              recargo = 1.0;
              descripcionRecargo = 'dominicales diurnas (100%)';
              break;
            case 'dominicales_nocturnas':
              recargo = 1.5;
              descripcionRecargo = 'dominicales nocturnas (150%)';
              break;
            case 'festivas_diurnas':
              recargo = 1.0;
              descripcionRecargo = 'festivas diurnas (100%)';
              break;
            case 'festivas_nocturnas':
              recargo = 1.5;
              descripcionRecargo = 'festivas nocturnas (150%)';
              break;
          }
        }

        result.valor = horas * valorHoraOrdinaria * (1 + recargo);
        result.baseCalculo.factor_calculo = (1 + recargo);
        result.baseCalculo.detalle_calculo = 
          `${horas} horas extra ${descripcionRecargo} × $${Math.round(valorHoraOrdinaria)} × ${(1 + recargo)} = $${Math.round(result.valor)}. ` +
          `Jornada legal: ${jornadaLegal.horasSemanales}h semanales según ${jornadaLegal.ley}`;
        break;

      case 'recargo_nocturno':
        if (!horas || horas <= 0) {
          throw new Error('Las horas de recargo nocturno deben ser mayor a 0');
        }
        
        result.valor = horas * valorHoraOrdinaria * 0.35; // 35% recargo nocturno
        result.baseCalculo.factor_calculo = 0.35;
        result.baseCalculo.detalle_calculo = 
          `${horas} horas recargo nocturno × $${Math.round(valorHoraOrdinaria)} × 0.35 = $${Math.round(result.valor)}. ` +
          `Jornada legal: ${jornadaLegal.horasSemanales}h semanales según ${jornadaLegal.ley}`;
        break;

      case 'vacaciones':
        if (!dias || dias <= 0) {
          throw new Error('Los días de vacaciones deben ser mayor a 0');
        }
        
        result.valor = dias * valorDiario;
        result.baseCalculo.factor_calculo = 1.0;
        result.baseCalculo.detalle_calculo = 
          `${dias} días de vacaciones × $${Math.round(valorDiario)} = $${Math.round(result.valor)}`;
        break;

      case 'incapacidad':
        if (!dias || dias <= 0) {
          throw new Error('Los días de incapacidad deben ser mayor a 0');
        }

        let porcentajeIncapacidad = 0.667; // 66.7% por defecto (EPS)
        let entidadPagadora = 'EPS';

        if (subtipo === 'laboral') {
          porcentajeIncapacidad = 1.0; // 100% ARL
          entidadPagadora = 'ARL';
        } else if (subtipo === 'maternidad') {
          porcentajeIncapacidad = 1.0; // 100% EPS
          entidadPagadora = 'EPS';
        }

        result.valor = dias * valorDiario * porcentajeIncapacidad;
        result.baseCalculo.factor_calculo = porcentajeIncapacidad;
        result.baseCalculo.detalle_calculo = 
          `${dias} días incapacidad × $${Math.round(valorDiario)} × ${porcentajeIncapacidad} (${entidadPagadora}) = $${Math.round(result.valor)}`;
        break;

      case 'licencia_remunerada':
        if (!dias || dias <= 0) {
          throw new Error('Los días de licencia deben ser mayor a 0');
        }
        
        result.valor = dias * valorDiario;
        result.baseCalculo.factor_calculo = 1.0;
        result.baseCalculo.detalle_calculo = 
          `${dias} días licencia remunerada × $${Math.round(valorDiario)} = $${Math.round(result.valor)}`;
        break;

      case 'bonificacion':
      case 'comision':
      case 'prima':
      case 'otros_ingresos':
        // Para estos tipos, normalmente se ingresa el valor directamente
        // pero si se especifican días u horas, se puede calcular
        if (dias && dias > 0) {
          result.valor = dias * valorDiario;
          result.baseCalculo.factor_calculo = 1.0;
          result.baseCalculo.detalle_calculo = `${dias} días × $${Math.round(valorDiario)} = $${Math.round(result.valor)}`;
        } else if (horas && horas > 0) {
          result.valor = horas * valorHoraOrdinaria;
          result.baseCalculo.factor_calculo = 1.0;
          result.baseCalculo.detalle_calculo = 
            `${horas} horas × $${Math.round(valorHoraOrdinaria)} = $${Math.round(result.valor)}. ` +
            `Jornada legal: ${jornadaLegal.horasSemanales}h semanales según ${jornadaLegal.ley}`;
        } else {
          result.baseCalculo.detalle_calculo = 'Valor a ingresar manualmente';
        }
        break;

      // Deducciones
      case 'libranza':
      case 'multa':
      case 'descuento_voluntario':
      case 'retencion_fuente':
      case 'fondo_solidaridad':
      case 'salud':
      case 'pension':
      case 'arl':
      case 'caja_compensacion':
      case 'icbf':
      case 'sena':
        result.baseCalculo.detalle_calculo = 'Valor fijo de deducción';
        break;

      case 'ausencia':
        if (!dias || dias <= 0) {
          throw new Error('Los días de ausencia deben ser mayor a 0');
        }
        
        result.valor = dias * valorDiario;
        result.baseCalculo.factor_calculo = 1.0;
        result.baseCalculo.detalle_calculo = 
          `${dias} días ausencia × $${Math.round(valorDiario)} = $${Math.round(result.valor)} (deducción)`;
        break;

      default:
        throw new Error(`Tipo de novedad no soportado: ${tipoNovedad}`);
    }

    // Validar que el valor sea positivo para devengados
    if (result.valor < 0) {
      result.valor = 0;
    }

    console.log(`✅ Cálculo completado: $${result.valor}`);
    return result;

  } catch (error) {
    console.error('❌ Error en cálculo de novedad:', error);
    result.baseCalculo.detalle_calculo = `Error: ${error.message}`;
    return result;
  }
};

// Export the enhanced function as the main one
export { calcularValorNovedadEnhanced as calcularValorNovedad };
