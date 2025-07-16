import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  periodDate?: string;
}

interface NovedadCalculationInput {
  tipoNovedad: string;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  fechaPeriodo?: string;
}

interface JornadaLegalInfo {
  horasSemanales: number;
  horasMensuales: number;
  fechaVigencia: Date;
  descripcion: string;
  ley: string;
}

interface PayrollConfiguration {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  porcentajes: {
    saludEmpleado: number;
    pensionEmpleado: number;
    saludEmpleador: number;
    pensionEmpleador: number;
    arl: number;
    cajaCompensacion: number;
    icbf: number;
    sena: number;
    cesantias: number;
    interesesCesantias: number;
    prima: number;
    vacaciones: number;
  };
}

const DEFAULT_CONFIG_2025: PayrollConfiguration = {
  salarioMinimo: 1300000,
  auxilioTransporte: 200000,
  uvt: 47065,
  porcentajes: {
    saludEmpleado: 0.04,
    pensionEmpleado: 0.04,
    saludEmpleador: 0.085,
    pensionEmpleador: 0.12,
    arl: 0.00522,
    cajaCompensacion: 0.04,
    icbf: 0.03,
    sena: 0.02,
    cesantias: 0.0833,
    interesesCesantias: 0.12,
    prima: 0.0833,
    vacaciones: 0.0417,
  }
};

// ✅ LÓGICA DUAL: Fechas separadas para jornada laboral y recargos
const JORNADAS_LEGALES = [
  {
    fechaString: '2026-07-15',
    horasSemanales: 42,
    descripcion: 'Jornada final según Ley 2101 de 2021'
  },
  {
    fechaString: '2025-07-15', // ✅ JORNADA LABORAL: 15 julio 2025
    horasSemanales: 44,
    descripcion: 'Cuarta fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaString: '2024-07-15',
    horasSemanales: 46,
    descripcion: 'Tercera fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaString: '2023-07-15',
    horasSemanales: 47,
    descripcion: 'Segunda fase de reducción - Ley 2101 de 2021'
  },
  {
    fechaString: '1950-01-01',
    horasSemanales: 48,
    descripcion: 'Jornada máxima tradicional - Código Sustantivo del Trabajo'
  }
];

// Tabla fija de horas mensuales por jornada semanal
const HORAS_MENSUALES_POR_JORNADA: Record<number, number> = {
  48: 240,
  47: 235,
  46: 230,
  44: 220,
  42: 210
};

/**
 * ✅ FUNCIÓN CORREGIDA: Horas específicas para cálculo de RECARGOS
 * Usa transición del 1 de julio de 2025 (220h desde esa fecha)
 */
function getHorasParaRecargos(fechaStr?: string): number {
  const fechaComparar = fechaStr ? fechaStr.split('T')[0] : new Date().toISOString().split('T')[0];
  
  console.log(`🎯 Backend RECARGOS: Calculando horas para recargos en fecha: "${fechaComparar}"`);
  
  // ✅ CORRECCIÓN: Usar 220h desde 1 julio 2025 para recargos
  if (fechaComparar >= '2025-07-01') {
    console.log(`🎯 Backend RECARGOS: Desde 1 julio 2025 → 220h mensuales`);
    return 220;
  }
  
  // Para fechas anteriores, usar jornada legal normal
  const jornadaInfo = getJornadaLegal(fechaStr);
  console.log(`🎯 Backend RECARGOS: Jornada normal anterior → ${jornadaInfo.horasMensuales}h mensuales`);
  return jornadaInfo.horasMensuales;
}

/**
 * ✅ Función de jornada legal para salario base (sin cambios)
 */
function getJornadaLegal(fechaStr?: string) {
  const fechaComparar = fechaStr ? fechaStr.split('T')[0] : new Date().toISOString().split('T')[0];
  
  console.log(`🎯 Backend JORNADA: Calculando jornada laboral para fecha: "${fechaComparar}"`);
  
  let jornadaVigente = null;
  
  for (const jornada of JORNADAS_LEGALES) {
    const esVigente = fechaComparar >= jornada.fechaString;
    console.log(`   🔍 Comparando "${fechaComparar}" >= "${jornada.fechaString}" (${jornada.horasSemanales}h) = ${esVigente}`);
    
    if (esVigente) {
      jornadaVigente = jornada;
      break;
    }
  }

  if (!jornadaVigente) {
    const jornadaTradicional = JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];
    const horasMensuales = HORAS_MENSUALES_POR_JORNADA[jornadaTradicional.horasSemanales];
    console.log(`⚠️ Backend: No se encontró jornada vigente, usando tradicional: ${jornadaTradicional.horasSemanales}h = ${horasMensuales}h mensuales`);
    
    return {
      horasSemanales: jornadaTradicional.horasSemanales,
      horasMensuales: horasMensuales,
      fechaVigencia: new Date(jornadaTradicional.fechaString),
      descripcion: jornadaTradicional.descripcion,
      ley: 'Código Sustantivo del Trabajo'
    };
  }

  const horasMensuales = HORAS_MENSUALES_POR_JORNADA[jornadaVigente.horasSemanales];
  console.log(`✅ Backend JORNADA: Fecha "${fechaComparar}" → ${jornadaVigente.horasSemanales}h semanales = ${horasMensuales}h mensuales`);

  return {
    horasSemanales: jornadaVigente.horasSemanales,
    horasMensuales: horasMensuales,
    fechaVigencia: new Date(jornadaVigente.fechaString),
    descripcion: jornadaVigente.descripcion,
    ley: 'Ley 2101 de 2021'
  };
}

function getHorasMensuales(fechaStr?: string): number {
  const jornadaInfo = getJornadaLegal(fechaStr);
  console.log(`🎯 Backend: Horas mensuales para ${fechaStr || 'fecha actual'}: ${jornadaInfo.horasMensuales}h`);
  return jornadaInfo.horasMensuales;
}

function getHorasSemanales(fechaStr?: string): number {
  const jornadaInfo = getJornadaLegal(fechaStr);
  console.log(`🎯 Backend: Horas semanales para ${fechaStr || 'fecha actual'}: ${jornadaInfo.horasSemanales}h`);
  return jornadaInfo.horasSemanales;
}

// ✅ CORREGIDO: Factores ADICIONALES (no totales) con TRANSICIÓN 1 JULIO 2025
function getFactorRecargoAdicional(tipoRecargo: string, fechaPeriodo: Date): {
  factorAdicional: number;
  porcentaje: string;
  normativa: string;
} {
  const fecha = fechaPeriodo || new Date();
  
  console.log(`📅 FACTORES ADICIONALES: Calculando para ${tipoRecargo} en fecha: ${fecha.toISOString().split('T')[0]}`);
  
  switch (tipoRecargo) {
    case 'nocturno':
      return {
        factorAdicional: 0.35, // 35% adicional
        porcentaje: '35%',
        normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% adicional)'
      };
      
    case 'dominical':
      // ✅ TRANSICIÓN DE RECARGOS: 1 JULIO 2025
      if (fecha < new Date('2025-07-01')) {
        return {
          factorAdicional: 0.75, // 75% adicional
          porcentaje: '75%',
          normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% adicional)'
        };
      } else if (fecha < new Date('2026-07-01')) {
        return {
          factorAdicional: 0.80, // ✅ NUEVO: 80% adicional desde 1 julio 2025
          porcentaje: '80%',
          normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% adicional)'
        };
      } else if (fecha < new Date('2027-07-01')) {
        return {
          factorAdicional: 0.90, // 90% adicional
          porcentaje: '90%',
          normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% adicional)'
        };
      } else {
        return {
          factorAdicional: 1.00, // 100% adicional
          porcentaje: '100%',
          normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% adicional)'
        };
      }
      
    case 'nocturno_dominical':
      return {
        factorAdicional: 1.15, // Factor específico para fórmula especial
        porcentaje: '115%',
        normativa: 'Recargo nocturno dominical - Factor específico según CST'
      };
      
    default:
      console.error(`❌ Backend: Tipo de recargo no válido: ${tipoRecargo}`);
      return {
        factorAdicional: 0.0,
        porcentaje: '0%',
        normativa: 'Tipo no válido'
      };
  }
}

// Factores de horas extra según legislación colombiana
const HORAS_EXTRA_FACTORS = {
  diurnas: 1.25,
  nocturnas: 1.75,
  dominicales_diurnas: 2.0,
  dominicales_nocturnas: 2.5,
  festivas_diurnas: 2.0,
  festivas_nocturnas: 2.5
} as const;

// ✅ FUNCIÓN CORREGIDA: Cálculo con factores adicionales + fórmula especial
function calculateNovedadUltraKiss(input: NovedadCalculationInput) {
  const { tipoNovedad, subtipo, salarioBase, horas, dias, fechaPeriodo } = input;
  
  console.log('🚀 FACTORES ADICIONALES: *** INICIANDO CÁLCULO CORREGIDO ***');
  console.log('🚀 FACTORES ADICIONALES: Input completo:', JSON.stringify(input, null, 2));
  
  let valor = 0;
  let factorCalculo = 0;
  let detalleCalculo = '';

  switch (tipoNovedad) {
    case 'horas_extra':
      if (horas && horas > 0 && subtipo) {
        console.log('🚀 FACTORES ADICIONALES: *** PROCESANDO HORAS EXTRA ***');
        
        // ✅ Usar horas mensuales normales para horas extra
        const horasMensuales = getHorasMensuales(fechaPeriodo);
        const valorHoraOrdinaria = salarioBase / horasMensuales;
        const factor = HORAS_EXTRA_FACTORS[subtipo as keyof typeof HORAS_EXTRA_FACTORS];
        
        if (factor) {
          valor = Math.round(valorHoraOrdinaria * factor * horas);
          factorCalculo = factor;
          detalleCalculo = `Horas extra ${subtipo}: (${salarioBase.toLocaleString()} ÷ ${horasMensuales}) × ${factor} × ${horas} horas = ${valor.toLocaleString()}`;
          
          console.log('🚀 FACTORES ADICIONALES: *** CÁLCULO HORAS EXTRA DETALLADO ***');
          console.log('🚀 FACTORES ADICIONALES: Horas mensuales (jornada laboral):', horasMensuales);
          console.log('🚀 FACTORES ADICIONALES: Valor final calculado:', valor);
        } else {
          detalleCalculo = 'Subtipo de horas extra no válido';
        }
      } else {
        detalleCalculo = 'Ingrese horas y seleccione subtipo';
      }
      break;

    case 'recargo_nocturno':
      if (horas && horas > 0) {
        console.log('🚀 FACTORES ADICIONALES: *** PROCESANDO RECARGO CON FACTORES ADICIONALES ***');
        console.log('🚀 FACTORES ADICIONALES: Tipo novedad:', tipoNovedad);
        console.log('🚀 FACTORES ADICIONALES: Subtipo recibido:', subtipo);
        console.log('🚀 FACTORES ADICIONALES: Fecha período:', fechaPeriodo);
        
        // ✅ USAR HORAS ESPECÍFICAS PARA RECARGOS (220h desde 1 julio)
        const horasRecargos = getHorasParaRecargos(fechaPeriodo);
        const valorHoraOrdinaria = salarioBase / horasRecargos;
        
        let tipoRecargoAleluya = 'nocturno';
        if (subtipo === 'dominical') {
          tipoRecargoAleluya = 'dominical';
        } else if (subtipo === 'nocturno_dominical') {
          tipoRecargoAleluya = 'nocturno_dominical';
        }
        
        console.log('🚀 FACTORES ADICIONALES: Tipo recargo mapeado:', tipoRecargoAleluya);
        
        // ✅ FACTORES ADICIONALES CON TRANSICIÓN 1 JULIO 2025
        const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
        const factorInfo = getFactorRecargoAdicional(tipoRecargoAleluya, fechaObj);
        
        if (tipoRecargoAleluya === 'nocturno_dominical') {
          // ✅ FÓRMULA ESPECIAL ALELUYA: Salario × Factor × Horas ÷ (30 × 7.333)
          const divisorEspecial = 30 * 7.333; // 220
          valor = Math.round((salarioBase * factorInfo.factorAdicional * horas) / divisorEspecial);
          factorCalculo = factorInfo.factorAdicional;
          detalleCalculo = `Nocturno Dominical (fórmula especial): (${salarioBase.toLocaleString()} × ${factorInfo.factorAdicional} × ${horas}h) ÷ (30 × 7.333) = ${valor.toLocaleString()}`;
          
          console.log('🚀 FACTORES ADICIONALES: *** FÓRMULA ESPECIAL NOCTURNO DOMINICAL ***');
          console.log('🚀 FACTORES ADICIONALES: Divisor especial (30 × 7.333):', divisorEspecial);
          console.log('🚀 FACTORES ADICIONALES: Factor específico:', factorInfo.factorAdicional);
          console.log('🚀 FACTORES ADICIONALES: Valor final fórmula especial:', valor);
        } else {
          // ✅ FÓRMULA NORMAL: valorHora × (1 + factor_adicional) × horas
          const factorTotal = 1 + factorInfo.factorAdicional;
          valor = Math.round(valorHoraOrdinaria * factorTotal * horas);
          factorCalculo = factorInfo.factorAdicional;
          detalleCalculo = `Recargo ${tipoRecargoAleluya}: (${salarioBase.toLocaleString()} ÷ ${horasRecargos}) × (1 + ${factorInfo.porcentaje}) × ${horas} horas = ${valor.toLocaleString()}`;
          
          console.log('🚀 FACTORES ADICIONALES: *** RESULTADO RECARGO FACTORES ADICIONALES ***');
          console.log('🚀 FACTORES ADICIONALES: Horas para recargos:', horasRecargos);
          console.log('🚀 FACTORES ADICIONALES: Valor hora ordinaria:', Math.round(valorHoraOrdinaria));
          console.log('🚀 FACTORES ADICIONALES: Factor adicional aplicado:', factorInfo.factorAdicional);
          console.log('🚀 FACTORES ADICIONALES: Factor total (1 + adicional):', factorTotal);
          console.log('🚀 FACTORES ADICIONALES: Valor final calculado:', valor);
        }
        
        console.log('🚀 FACTORES ADICIONALES: Normativa:', factorInfo.normativa);
        
        // ✅ VALIDACIÓN ESPECÍFICA ALELUYA CON FACTORES ADICIONALES
        if (salarioBase === 1718661 && horas === 1) {
          const fechaNormalizada = fechaPeriodo ? fechaPeriodo.split('T')[0] : '';
          
          if (fechaNormalizada >= '2025-07-01') {
            // Desde 1 julio 2025: usar 220h para recargos
            if (tipoRecargoAleluya === 'dominical' && Math.abs(valor - 6250) < 100) {
              console.log('✅ FACTORES ADICIONALES SUCCESS: Dominical desde 1 julio correcto ~$6,250:', valor);
            } else if (tipoRecargoAleluya === 'nocturno_dominical' && Math.abs(valor - 8984) < 100) {
              console.log('✅ FACTORES ADICIONALES SUCCESS: Nocturno Dominical correcto ~$8,984:', valor);
            } else if (tipoRecargoAleluya === 'nocturno' && Math.abs(valor - 2734) < 100) {
              console.log('✅ FACTORES ADICIONALES SUCCESS: Nocturno correcto ~$2,734:', valor);
            }
          }
        }
      } else {
        detalleCalculo = 'Ingrese las horas de recargo';
      }
      break;

    // ... keep existing code (other novedad types like vacaciones, incapacidad, etc) the same
    case 'vacaciones':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `Vacaciones: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
      } else {
        detalleCalculo = 'Ingrese los días de vacaciones';
      }
      break;

    case 'incapacidad':
      if (dias && dias > 0 && subtipo) {
        const salarioDiario = salarioBase / 30;
        
        if (subtipo === 'general') {
          const diasPagados = Math.max(0, dias - 3);
          if (diasPagados > 0) {
            valor = Math.round(salarioDiario * 0.667 * diasPagados);
            factorCalculo = 0.667;
            detalleCalculo = `Incapacidad general: (${salarioBase.toLocaleString()} / 30) × 66.7% × ${diasPagados} días (desde día 4) = ${valor.toLocaleString()}`;
          } else {
            detalleCalculo = 'Incapacidad general: EPS paga desde el día 4';
          }
        } else if (subtipo === 'laboral') {
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `Incapacidad laboral: (${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
        } else if (subtipo === 'maternidad') {
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `Incapacidad maternidad: (${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
        }
      } else {
        detalleCalculo = 'Ingrese días y seleccione tipo de incapacidad';
      }
      break;

    case 'licencia_remunerada':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        detalleCalculo = `Licencia remunerada: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
      } else {
        detalleCalculo = 'Ingrese los días de licencia';
      }
      break;

    case 'licencia_no_remunerada':
      valor = 0;
      factorCalculo = 0;
      if (dias && dias > 0) {
        detalleCalculo = `Licencia no remunerada: ${dias} días sin remuneración (Art. 51 CST). Suspende acumulación de prestaciones sociales.`;
      } else {
        detalleCalculo = 'Licencia no remunerada: Sin remuneración por definición legal';
      }
      break;

    case 'ausencia':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        
        let tipoAusencia = '';
        switch (subtipo) {
          case 'injustificada':
            tipoAusencia = 'Ausencia injustificada';
            break;
          case 'abandono_puesto':
            tipoAusencia = 'Abandono del puesto';
            break;
          case 'suspension_disciplinaria':
            tipoAusencia = 'Suspensión disciplinaria';
            break;
          case 'tardanza_excesiva':
            tipoAusencia = 'Tardanza excesiva';
            break;
          default:
            tipoAusencia = 'Ausencia';
        }
        
        detalleCalculo = `${tipoAusencia}: Descuento de (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()} (Art. 57 CST)`;
      } else {
        detalleCalculo = 'Ingrese los días de ausencia injustificada';
      }
      break;

    case 'bonificacion':
    case 'comision':
    case 'prima':
    case 'otros_ingresos':
      detalleCalculo = 'Ingrese el valor manualmente para este tipo de novedad';
      break;

    case 'fondo_solidaridad':
      if (salarioBase >= (DEFAULT_CONFIG_2025.salarioMinimo * 4)) {
        valor = Math.round(salarioBase * 0.01);
        factorCalculo = 0.01;
        detalleCalculo = `Fondo de solidaridad: ${salarioBase.toLocaleString()} × 1% = ${valor.toLocaleString()}`;
      } else {
        detalleCalculo = 'Fondo de solidaridad aplica para salarios >= 4 SMMLV';
      }
      break;

    default:
      detalleCalculo = 'Tipo de novedad no reconocido';
  }

  // ✅ INFORMACIÓN FINAL: Distinguir entre horas jornada laboral y recargos
  const horasMensualesJornada = getHorasMensuales(fechaPeriodo);
  const horasSemanalesJornada = getHorasSemanales(fechaPeriodo);
  const horasRecargos = getHorasParaRecargos(fechaPeriodo);

  const result = {
    valor,
    factorCalculo,
    detalleCalculo,
    jornadaInfo: {
      horasSemanales: horasSemanalesJornada,
      horasMensuales: horasMensualesJornada,
      divisorHorario: tipoNovedad === 'recargo_nocturno' ? horasRecargos : horasMensualesJornada,
      valorHoraOrdinaria: Math.round(salarioBase / (tipoNovedad === 'recargo_nocturno' ? horasRecargos : horasMensualesJornada)),
      ley: horasMensualesJornada === 230 ? 'Ley 2101 de 2021 (Tercera fase)' : 'Ley 2101 de 2021 (Cuarta fase)',
      descripcion: horasMensualesJornada === 230 ? 'Tercera fase de reducción (46h semanales)' : 'Cuarta fase de reducción (44h semanales)'
    }
  };

  console.log('🚀 FACTORES ADICIONALES: *** RESULTADO FINAL CON FACTORES ADICIONALES ***');
  console.log('🚀 FACTORES ADICIONALES:', JSON.stringify(result, null, 2));
  
  return result;
}

function validateEmployee(input: PayrollCalculationInput, eps?: string, afp?: string) {
  const config = DEFAULT_CONFIG_2025;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!eps) errors.push('Falta afiliación a EPS');
  if (!afp) errors.push('Falta afiliación a AFP');

  let maxDays: number;
  switch (input.periodType) {
    case 'semanal':
      maxDays = 7;
      break;
    case 'quincenal':
      maxDays = 15;
      break;
    case 'mensual':
      maxDays = 30;
      break;
    default:
      maxDays = 30;
  }

  if (input.workedDays > maxDays) {
    errors.push(`Días trabajados (${input.workedDays}) exceden el período ${input.periodType} (máximo ${maxDays})`);
  }
  if (input.workedDays < 0) {
    errors.push('Los días trabajados no pueden ser negativos');
  }

  const horasSemanales = getHorasSemanales(input.periodDate);
  const maxHorasExtraSemanales = horasSemanales * 0.25;
  let horasExtraSemanalesEstimadas: number;
  
  switch (input.periodType) {
    case 'semanal':
      horasExtraSemanalesEstimadas = input.extraHours;
      break;
    case 'quincenal':
      horasExtraSemanalesEstimadas = input.extraHours / 2;
      break;
    case 'mensual':
      horasExtraSemanalesEstimadas = input.extraHours / 4;
      break;
    default:
      horasExtraSemanalesEstimadas = input.extraHours / 4;
  }
  
  if (horasExtraSemanalesEstimadas > maxHorasExtraSemanales) {
    warnings.push(`Horas extra excesivas para jornada de ${horasSemanales}h semanales (máximo recomendado: ${maxHorasExtraSemanales}h/semana)`);
  }
  if (input.extraHours < 0) {
    errors.push('Las horas extra no pueden ser negativas');
  }

  if (input.disabilities > input.workedDays) {
    errors.push('Los días de incapacidad no pueden ser mayores a los días trabajados');
  }
  if (input.disabilities < 0) {
    errors.push('Los días de incapacidad no pueden ser negativos');
  }

  if (input.baseSalary < config.salarioMinimo) {
    errors.push(`El salario base es menor al SMMLV`);
  }

  if (input.baseSalary >= config.salarioMinimo * 10) {
    warnings.push('Salario alto - verificar cálculo de aportes');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    jornadaInfo: {
      horasSemanales,
      ley: 'Ley 2101 de 2021',
      descripcion: `Jornada de ${horasSemanales} horas semanales`
    }
  };
}

function calculatePayroll(input: PayrollCalculationInput) {
  const config = DEFAULT_CONFIG_2025;
  const horasMensuales = getHorasMensuales(input.periodDate);
  const horasSemanales = getHorasSemanales(input.periodDate);
  
  console.log(`🔧 EDGE FUNCTION - Período: ${input.periodType}, Días: ${input.workedDays}`);
  
  const dailySalary = input.baseSalary / 30;
  const effectiveWorkedDays = Math.max(0, input.workedDays - input.disabilities - input.absences);
  const regularPay = Math.round(dailySalary * effectiveWorkedDays);

  const hourlyRate = input.baseSalary / horasMensuales;
  const extraPay = Math.round(input.extraHours * hourlyRate * 1.25);

  let transportAllowance = 0;
  if (input.baseSalary <= (config.salarioMinimo * 2)) {
    const dailyTransportAllowance = config.auxilioTransporte / 30;
    transportAllowance = Math.round(dailyTransportAllowance * input.workedDays);
  }

  const grossSalary = regularPay + extraPay + input.bonuses;
  const grossPay = grossSalary + transportAllowance;
  
  const payrollBase = regularPay + extraPay + input.bonuses;
  const healthDeduction = Math.round(payrollBase * config.porcentajes.saludEmpleado);
  const pensionDeduction = Math.round(payrollBase * config.porcentajes.pensionEmpleado);
  const totalDeductions = healthDeduction + pensionDeduction;

  const netPay = grossPay - totalDeductions;

  const employerHealth = Math.round(payrollBase * config.porcentajes.saludEmpleador);
  const employerPension = Math.round(payrollBase * config.porcentajes.pensionEmpleador);
  const employerArl = Math.round(payrollBase * config.porcentajes.arl);
  const employerCaja = Math.round(payrollBase * config.porcentajes.cajaCompensacion);
  const employerIcbf = Math.round(payrollBase * config.porcentajes.icbf);
  const employerSena = Math.round(payrollBase * config.porcentajes.sena);

  const employerContributions = employerHealth + employerPension + employerArl + 
                                employerCaja + employerIcbf + employerSena;

  const totalPayrollCost = netPay + employerContributions;

  return {
    regularPay,
    extraPay,
    transportAllowance,
    grossPay,
    healthDeduction,
    pensionDeduction,
    totalDeductions,
    netPay,
    employerHealth,
    employerPension,
    employerArl,
    employerCaja,
    employerIcbf,
    employerSena,
    employerContributions,
    totalPayrollCost,
    jornadaInfo: {
      horasSemanales,
      horasMensuales,
      divisorHorario: horasMensuales,
      valorHoraOrdinaria: Math.round(input.baseSalary / horasMensuales),
      ley: 'Ley 2101 de 2021',
      descripcion: `Jornada de ${horasSemanales} horas semanales`
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case 'calculate':
        const calculation = calculatePayroll(data);
        return new Response(JSON.stringify({ success: true, data: calculation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'validate':
        const validation = validateEmployee(data, data.eps, data.afp);
        return new Response(JSON.stringify({ success: true, data: validation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'batch-calculate':
        const batchResults = data.inputs.map((input: PayrollCalculationInput) => calculatePayroll(input));
        return new Response(JSON.stringify({ success: true, data: batchResults }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'calculate-novedad':
        console.log('🚀 FACTORES ADICIONALES: *** RECIBIDA SOLICITUD NOVEDAD CON FACTORES ADICIONALES ***');
        console.log('🚀 FACTORES ADICIONALES: Action:', action);
        console.log('🚀 FACTORES ADICIONALES: Data recibida:', JSON.stringify(data, null, 2));
        const novedadResult = calculateNovedadUltraKiss(data);
        console.log('🚀 FACTORES ADICIONALES: *** ENVIANDO RESPUESTA CON FACTORES ADICIONALES ***');
        console.log('🚀 FACTORES ADICIONALES: Respuesta:', JSON.stringify(novedadResult, null, 2));
        return new Response(JSON.stringify({ success: true, data: novedadResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get-jornada-legal':
        const jornadaInfo = getJornadaLegal(data.fecha);
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            horasSemanales: jornadaInfo.horasSemanales,
            horasMensuales: jornadaInfo.horasMensuales,
            divisorHorario: jornadaInfo.horasMensuales,
            ley: jornadaInfo.ley,
            descripcion: jornadaInfo.descripcion
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in payroll calculations function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
