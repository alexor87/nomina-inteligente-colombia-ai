import { getJornadaLegal, getHourlyDivisor, calcularValorHoraExtra } from '@/utils/jornadaLegal';

// Enhanced NovedadType that matches database exactly
export type NovedadType =
  | 'horas_extra'
  | 'recargo_nocturno'
  | 'vacaciones'
  | 'licencia_remunerada'
  | 'incapacidad'
  | 'bonificacion'
  | 'bonificacion_salarial'
  | 'bonificacion_no_salarial'
  | 'comision'
  | 'prima'
  | 'otros_ingresos'
  | 'auxilio_conectividad'
  | 'viaticos'
  | 'retroactivos'
  | 'compensacion_ordinaria'
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
  | 'sena'
  | 'embargo'
  | 'anticipo'
  | 'aporte_voluntario';

export const NOVEDAD_CATEGORIES: Record<NovedadType, 'devengado' | 'deduccion'> = {
  horas_extra: 'devengado',
  recargo_nocturno: 'devengado',
  vacaciones: 'devengado',
  licencia_remunerada: 'devengado',
  incapacidad: 'devengado',
  bonificacion: 'devengado',
  bonificacion_salarial: 'devengado',
  bonificacion_no_salarial: 'devengado',
  comision: 'devengado',
  prima: 'devengado',
  otros_ingresos: 'devengado',
  auxilio_conectividad: 'devengado',
  viaticos: 'devengado',
  retroactivos: 'devengado',
  compensacion_ordinaria: 'devengado',
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
  sena: 'deduccion',
  embargo: 'deduccion',
  anticipo: 'deduccion',
  aporte_voluntario: 'deduccion'
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
  company_id: string; // ✅ AGREGADO - Requerido por el servicio
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
 * Calcula el FSP con tarifas escalonadas según la normativa colombiana
 */
const calcularFSP = (ibc: number, smmlv: number): number => {
  const multiplicadorIBC = ibc / smmlv;
  
  if (multiplicadorIBC <= 4) return 0;
  if (multiplicadorIBC <= 16) return ibc * 0.01;
  if (multiplicadorIBC <= 17) return ibc * 0.012;
  if (multiplicadorIBC <= 18) return ibc * 0.014;
  if (multiplicadorIBC <= 19) return ibc * 0.016;
  if (multiplicadorIBC <= 20) return ibc * 0.018;
  return ibc * 0.02;
};

/**
 * Validaciones legales obligatorias
 */
const validarLimitesLegales = (
  tipoNovedad: NovedadType,
  valor: number,
  horas?: number,
  salarioBase?: number
): { esValido: boolean; mensajes: string[] } => {
  const mensajes: string[] = [];
  let esValido = true;

  switch (tipoNovedad) {
    case 'horas_extra':
      if (horas && horas > 12) {
        esValido = false;
        mensajes.push('Las horas extra no pueden superar 12 por día');
      }
      break;
    
    case 'auxilio_conectividad':
      if (salarioBase && salarioBase > 2600000) { // 2 SMMLV aprox
        esValido = false;
        mensajes.push('El auxilio de conectividad solo aplica para salarios ≤ 2 SMMLV');
      }
      break;
  }

  return { esValido, mensajes };
};

/**
 * Calcula el valor hora ordinaria para recargos usando la fórmula correcta
 * Según el artículo: salario / 30 / 7.3333
 */
const calcularValorHoraRecargo = (salarioBase: number): number => {
  return salarioBase / 30 / 7.3333;
};

/**
 * Versión mejorada de calcularValorNovedad que considera la jornada legal dinámica
 */
export const calcularValorNovedadEnhanced = (
  tipoNovedad: NovedadType,
  subtipo: string | undefined,
  salarioBase: number,
  dias?: number,
  horas?: number,
  fechaPeriodo: Date = new Date()
): CalculationResult => {
  const jornadaLegal = getJornadaLegal(fechaPeriodo);
  const hourlyDivisor = getHourlyDivisor(fechaPeriodo);
  const valorHoraOrdinaria = salarioBase / hourlyDivisor;
  const valorDiario = salarioBase / 30;
  const valorHoraExtra = calcularValorHoraExtra(salarioBase, fechaPeriodo);
  const valorHoraRecargo = calcularValorHoraRecargo(salarioBase);

  console.log(`💰 Calculando novedad ${tipoNovedad} con jornada de ${jornadaLegal.horasSemanales}h semanales`);

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

  // Validar límites legales
  const validacion = validarLimitesLegales(tipoNovedad, 0, horas, salarioBase);
  if (!validacion.esValido) {
    result.baseCalculo.detalle_calculo = `Error: ${validacion.mensajes.join(', ')}`;
    return result;
  }

  try {
    switch (tipoNovedad) {
      case 'horas_extra':
        if (!horas || horas <= 0) {
          throw new Error('Las horas extra deben ser mayor a 0');
        }

        // MULTIPLICADORES CORREGIDOS según especificación
        let recargo = 0.25; // 25% por defecto (1.25 total)
        let descripcionRecargo = 'diurnas (1.25x)';

        if (subtipo && subtipo !== 'diurnas') {
          switch (subtipo) {
            case 'nocturnas':
              recargo = 0.75; // 75% (1.75x total)
              descripcionRecargo = 'nocturnas (1.75x)';
              break;
            case 'dominicales_diurnas':
              recargo = 1.05; // 105% (2.05x total)
              descripcionRecargo = 'dominicales diurnas (2.05x)';
              break;
            case 'dominicales_nocturnas':
              recargo = 1.55; // 155% (2.55x total)
              descripcionRecargo = 'dominicales nocturnas (2.55x)';
              break;
            case 'festivas_diurnas':
              recargo = 1.05; // 105% (2.05x total)
              descripcionRecargo = 'festivas diurnas (2.05x)';
              break;
            case 'festivas_nocturnas':
              recargo = 1.55; // 155% (2.55x total)
              descripcionRecargo = 'festivas nocturnas (2.55x)';
              break;
          }
        }

        result.valor = horas * valorHoraExtra * (1 + recargo);
        result.baseCalculo.factor_calculo = (1 + recargo);
        result.baseCalculo.detalle_calculo = 
          `${horas} horas extra ${descripcionRecargo} × $${Math.round(valorHoraExtra)} × ${(1 + recargo)} = $${Math.round(result.valor)}`;
        break;

      case 'recargo_nocturno':
        if (!horas || horas <= 0) {
          throw new Error('Las horas de recargo deben ser mayor a 0');
        }
        
        let factorRecargo = 0.35;
        let descripcionTipoRecargo = 'nocturno (35%)';
        
        if (subtipo) {
          switch (subtipo) {
            case 'nocturno':
              factorRecargo = 0.35;
              descripcionTipoRecargo = 'nocturno (35%)';
              break;
            case 'dominical':
              factorRecargo = 0.80;
              descripcionTipoRecargo = 'dominical (80%)';
              break;
            case 'nocturno_dominical':
              factorRecargo = 1.15;
              descripcionTipoRecargo = 'nocturno dominical (115%)';
              break;
            case 'festivo':
              factorRecargo = 0.75;
              descripcionTipoRecargo = 'festivo (75%)';
              break;
            case 'nocturno_festivo':
              factorRecargo = 1.10;
              descripcionTipoRecargo = 'nocturno festivo (110%)';
              break;
          }
        }
        
        result.valor = horas * valorHoraRecargo * factorRecargo;
        result.baseCalculo.factor_calculo = factorRecargo;
        result.baseCalculo.detalle_calculo = 
          `${horas} horas recargo ${descripcionTipoRecargo} × $${Math.round(valorHoraRecargo)} × ${factorRecargo} = $${Math.round(result.valor)}`;
        break;

      case 'fondo_solidaridad':
        // Implementar FSP con tarifas escalonadas
        const smmlv = 1300000; // 2025
        const fspCalculado = calcularFSP(salarioBase, smmlv);
        result.valor = fspCalculado;
        result.baseCalculo.detalle_calculo = 
          `FSP calculado según IBC: $${Math.round(fspCalculado)} (IBC: ${(salarioBase/smmlv).toFixed(2)} SMMLV)`;
        break;

      case 'auxilio_conectividad':
        if (salarioBase <= 2600000) { // 2 SMMLV aprox
          result.valor = dias ? (dias * 50000 / 30) : 50000; // Valor mensual ejemplo
          result.baseCalculo.detalle_calculo = 'Auxilio de conectividad digital';
        } else {
          throw new Error('Auxilio de conectividad solo aplica para salarios ≤ 2 SMMLV');
        }
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

        let porcentajeIncapacidad = 0.667; // 66.7% por defecto (EPS común)
        let entidadPagadora = 'EPS';
        let tipoIncapacidad = 'común';

        if (subtipo === 'laboral') {
          porcentajeIncapacidad = 1.0; // 100% ARL
          entidadPagadora = 'ARL';
          tipoIncapacidad = 'laboral';
        } else if (subtipo === 'maternidad') {
          porcentajeIncapacidad = 1.0; // 100% EPS
          entidadPagadora = 'EPS';
          tipoIncapacidad = 'maternidad';
        } else if (subtipo === 'comun') {
          porcentajeIncapacidad = 0.667; // 66.7% EPS
          entidadPagadora = 'EPS';
          tipoIncapacidad = 'común';
        }

        result.valor = dias * valorDiario * porcentajeIncapacidad;
        result.baseCalculo.factor_calculo = porcentajeIncapacidad;
        result.baseCalculo.detalle_calculo = 
          `${dias} días incapacidad ${tipoIncapacidad} × $${Math.round(valorDiario)} × ${porcentajeIncapacidad} (${entidadPagadora}) = $${Math.round(result.valor)}`;
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
      case 'salud':
      case 'pension':
      case 'arl':
      case 'caja_compensacion':
      case 'icbf':
      case 'sena':
      case 'ausencia':
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
        if (['bonificacion_salarial', 'bonificacion_no_salarial', 'viaticos', 'retroactivos', 'compensacion_ordinaria', 'embargo', 'anticipo', 'aporte_voluntario'].includes(tipoNovedad)) {
          result.baseCalculo.detalle_calculo = `${tipoNovedad.replace('_', ' ')} - Valor a ingresar manualmente`;
        } else {
          throw new Error(`Tipo de novedad no soportado: ${tipoNovedad}`);
        }
    }

    if (result.valor < 0) {
      result.valor = 0;
    }

    console.log(`✅ Cálculo completado: $${Math.round(result.valor).toLocaleString()}`);
    return result;

  } catch (error) {
    console.error('❌ Error en cálculo de novedad:', error);
    result.baseCalculo.detalle_calculo = `Error: ${error.message}`;
    return result;
  }
};

// Export the enhanced function as the main one
export { calcularValorNovedadEnhanced as calcularValorNovedad };
