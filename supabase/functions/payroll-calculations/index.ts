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

// ✅ CORREGIDO: Salario mínimo 2025 según normativa colombiana
const DEFAULT_CONFIG_2025: PayrollConfiguration = {
  salarioMinimo: 1423500, // ✅ ACTUALIZADO: Salario mínimo 2025
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
  
  // ✅ CORRECCIÓN: Usar 220h desde 1 julio 2025 para recargos
  if (fechaComparar >= '2025-07-01') {
    return 220;
  }
  
  // Para fechas anteriores, usar jornada legal normal
  const jornadaInfo = getJornadaLegal(fechaStr);
  return jornadaInfo.horasMensuales;
}

/**
 * ✅ Función de jornada legal para salario base (sin cambios)
 */
function getJornadaLegal(fechaStr?: string) {
  const fechaComparar = fechaStr ? fechaStr.split('T')[0] : new Date().toISOString().split('T')[0];
  
  let jornadaVigente = null;
  
  for (const jornada of JORNADAS_LEGALES) {
    const esVigente = fechaComparar >= jornada.fechaString;
    
    if (esVigente) {
      jornadaVigente = jornada;
      break;
    }
  }

  if (!jornadaVigente) {
    const jornadaTradicional = JORNADAS_LEGALES[JORNADAS_LEGALES.length - 1];
    const horasMensuales = HORAS_MENSUALES_POR_JORNADA[jornadaTradicional.horasSemanales];
    
    return {
      horasSemanales: jornadaTradicional.horasSemanales,
      horasMensuales: horasMensuales,
      fechaVigencia: new Date(jornadaTradicional.fechaString),
      descripcion: jornadaTradicional.descripcion,
      ley: 'Código Sustantivo del Trabajo'
    };
  }

  const horasMensuales = HORAS_MENSUALES_POR_JORNADA[jornadaVigente.horasSemanales];

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
  return jornadaInfo.horasMensuales;
}

function getHorasSemanales(fechaStr?: string): number {
  const jornadaInfo = getJornadaLegal(fechaStr);
  return jornadaInfo.horasSemanales;
}

// ✅ CORREGIDO: Factores TOTALES (no adicionales) según Aleluya - VERSIÓN ACTUALIZADA 2025
function getFactorRecargoTotal(tipoRecargo: string, fechaPeriodo: Date): {
  factorTotal: number;
  porcentaje: string;
  normativa: string;
} {
  const fecha = fechaPeriodo || new Date();
  
  // ✅ DEBUG ESPECÍFICO - VERSIÓN ACTUALIZADA
  console.log(`🔍 [EDGE v2.0] DEBUG NOCTURNO DOMINICAL: tipoRecargo="${tipoRecargo}", fecha=${fecha.toISOString().split('T')[0]}`);
  
  switch (tipoRecargo) {
    case 'nocturno':
      return {
        factorTotal: 0.35, // Factor total 35%
        porcentaje: '35%',
        normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% total)'
      };
      
    case 'dominical':
      // ✅ TRANSICIÓN DE RECARGOS: 1 JULIO 2025 - FACTORES TOTALES
      if (fecha < new Date('2025-07-01')) {
        return {
          factorTotal: 0.75, // Factor total 75%
          porcentaje: '75%',
          normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% total)'
        };
      } else if (fecha < new Date('2026-07-01')) {
        return {
          factorTotal: 0.80, // ✅ ALELUYA: Factor total 80% desde 1 julio 2025
          porcentaje: '80%',
          normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% total)'
        };
      } else if (fecha < new Date('2027-07-01')) {
        return {
          factorTotal: 0.90, // Factor total 90%
          porcentaje: '90%',
          normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% total)'
        };
      } else {
        return {
          factorTotal: 1.00, // Factor total 100%
          porcentaje: '100%',
          normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% total)'
        };
      }
      
    case 'nocturno_dominical':
      // ✅ DEBUG Y APLICACIÓN: Factor total específico para Aleluya - ACTUALIZADO
      console.log(`✅ [EDGE v2.0] NOCTURNO DOMINICAL DETECTADO: Aplicando factor 1.15`);
      return {
        factorTotal: 1.15, // Factor total específico para Aleluya
        porcentaje: '115%',
        normativa: 'Recargo nocturno dominical - Factor total según CST (Actualizado 2025)'
      };
      
    default:
      console.error(`❌ [EDGE v2.0] Backend: Tipo de recargo no válido: ${tipoRecargo}`);
      return {
        factorTotal: 0.0,
        porcentaje: '0%',
        normativa: 'Tipo no válido'
      };
  }
}

// ✅ FUNCIÓN DINÁMICA NORMATIVA COLOMBIANA: Calcula factores combinando porcentajes según fecha
function getFactorHoraExtra(subtipo: string, fechaPeriodo?: string): number {
  const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
  
  switch (subtipo) {
    case 'diurnas':
      return 1.25; // 1 + 0.25 (25% extra)
      
    case 'nocturnas':
      return 1.75; // 1 + 0.75 (75% extra)
      
    case 'dominicales_diurnas':
    case 'festivas_diurnas':
      // ✅ NORMATIVA: 1 + 25% extra + factor dominical dinámico
      const factorDominicalDiurno = getFactorRecargoTotal('dominical', fechaObj);
      return 1 + 0.25 + factorDominicalDiurno.factorTotal;
      
    case 'dominicales_nocturnas':
    case 'festivas_nocturnas':
      // ✅ NORMATIVA: 1 + 75% extra + factor dominical dinámico
      const factorDominicalNocturno = getFactorRecargoTotal('dominical', fechaObj);
      return 1 + 0.75 + factorDominicalNocturno.factorTotal;
      
    default:
      console.error(`❌ Subtipo de horas extra no válido: ${subtipo}`);
      return 1.0;
  }
}

// ✅ FUNCIÓN CORREGIDA: Cálculo con factores totales + fórmula unificada Aleluya - VERSIÓN ACTUALIZADA
function calculateNovedadUltraKiss(input: NovedadCalculationInput) {
  const { tipoNovedad, subtipo, salarioBase, horas, dias, fechaPeriodo } = input;
  
  let valor = 0;
  let factorCalculo = 0;
  let detalleCalculo = '';

  switch (tipoNovedad) {
    case 'horas_extra':
      if (horas && horas > 0 && subtipo) {
        // ✅ Usar horas mensuales normales para horas extra
        const horasMensuales = getHorasMensuales(fechaPeriodo);
        const valorHoraOrdinaria = salarioBase / horasMensuales;
        const factor = getFactorHoraExtra(subtipo, fechaPeriodo);
        
        if (factor && factor > 0) {
          valor = Math.round(valorHoraOrdinaria * factor * horas);
          factorCalculo = factor;
          
          // ✅ DETALLE NORMATIVO: Mostrar descomposición del factor según la ley
          let detalleNormativo = '';
          if (subtipo === 'dominicales_diurnas' || subtipo === 'festivas_diurnas') {
            const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
            const factorDominical = getFactorRecargoTotal('dominical', fechaObj);
            detalleNormativo = ` (1.00 + 0.25 + ${factorDominical.factorTotal} dominical = ${factor})`;
          } else if (subtipo === 'dominicales_nocturnas' || subtipo === 'festivas_nocturnas') {
            const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
            const factorDominical = getFactorRecargoTotal('dominical', fechaObj);
            detalleNormativo = ` (1.00 + 0.75 + ${factorDominical.factorTotal} dominical = ${factor})`;
          }
          
          detalleCalculo = `Horas extra ${subtipo}: (${salarioBase.toLocaleString()} ÷ ${horasMensuales}) × ${factor}${detalleNormativo} × ${horas} horas = ${valor.toLocaleString()}`;
        } else {
          detalleCalculo = 'Error: Factor de horas extra inválido para el subtipo especificado';
        }
      } else {
        detalleCalculo = 'Ingrese horas y seleccione subtipo';
      }
      break;

    case 'recargo_nocturno':
      if (horas && horas > 0) {
        // ✅ DEBUG: Log del subtipo recibido - VERSIÓN ACTUALIZADA
        console.log(`🔍 [EDGE v2.0] SUBTIPO RECIBIDO: "${subtipo}"`);
        
        // ✅ CORRECCIÓN CRÍTICA: Mapear correctamente los subtipos - ACTUALIZADO
        let tipoRecargoAleluya = 'nocturno'; // Valor por defecto
        
        if (subtipo === 'dominical') {
          tipoRecargoAleluya = 'dominical';
          console.log(`🔄 [EDGE v2.0] MAPEO: subtipo "dominical" → tipoRecargoAleluya "dominical"`);
        } else if (subtipo === 'nocturno_dominical') {
          tipoRecargoAleluya = 'nocturno_dominical';
          console.log(`🔄 [EDGE v2.0] MAPEO CRÍTICO: subtipo "nocturno_dominical" → tipoRecargoAleluya "nocturno_dominical"`);
        } else if (subtipo === 'nocturno' || subtipo === undefined) {
          tipoRecargoAleluya = 'nocturno';
          console.log(`🔄 [EDGE v2.0] MAPEO: subtipo "${subtipo}" → tipoRecargoAleluya "nocturno"`);
        }
        
        console.log(`🎯 [EDGE v2.0] TIPO RECARGO FINAL: "${tipoRecargoAleluya}"`);
        
        // ✅ FACTORES TOTALES CON TRANSICIÓN 1 JULIO 2025 - ACTUALIZADO
        const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
        const factorInfo = getFactorRecargoTotal(tipoRecargoAleluya, fechaObj);
        
        console.log(`📊 [EDGE v2.0] FACTOR INFO: factorTotal=${factorInfo.factorTotal}, porcentaje=${factorInfo.porcentaje}`);
        
        // ✅ VERIFICACIÓN CRÍTICA: Validar que tenemos un factor válido - ACTUALIZADO
        if (factorInfo.factorTotal <= 0) {
          console.error(`❌ [EDGE v2.0] Factor inválido para ${tipoRecargoAleluya}:`, factorInfo);
          detalleCalculo = `Error: Factor inválido para ${tipoRecargoAleluya}`;
          break;
        }
        
        // ✅ FÓRMULA UNIFICADA ALELUYA: Salario × Factor × Horas ÷ (30 × 7.333) para TODOS - ACTUALIZADO
        const divisorAleluya = 30 * 7.333; // 219.99
        const calculoDetallado = (salarioBase * factorInfo.factorTotal * horas) / divisorAleluya;
        valor = Math.round(calculoDetallado);
        factorCalculo = factorInfo.factorTotal;
        
        console.log(`🧮 [EDGE v2.0] CÁLCULO DETALLADO: (${salarioBase} × ${factorInfo.factorTotal} × ${horas}) ÷ ${divisorAleluya} = ${calculoDetallado} → ${valor}`);
        
        detalleCalculo = `${tipoRecargoAleluya} (fórmula Aleluya v2.0): (${salarioBase.toLocaleString()} × ${factorInfo.factorTotal} × ${horas}h) ÷ (30 × 7.333) = ${valor.toLocaleString()}`;
        
        // ✅ VALIDACIÓN ESPECÍFICA ALELUYA CON FACTORES TOTALES - ACTUALIZADO
        if (salarioBase === 1718661 && horas === 1) {
          const fechaNormalizada = fechaPeriodo ? fechaPeriodo.split('T')[0] : '';
          
          if (fechaNormalizada >= '2025-07-01') {
            if (tipoRecargoAleluya === 'dominical' && Math.abs(valor - 6250) < 100) {
              console.log('✅ [EDGE v2.0] DOMINICAL SUCCESS: Exacto $6,250:', valor);
            } else if (tipoRecargoAleluya === 'nocturno_dominical' && Math.abs(valor - 8984) < 100) {
              console.log('✅ [EDGE v2.0] NOCTURNO DOMINICAL SUCCESS: Exacto $8,984:', valor);
            } else if (tipoRecargoAleluya === 'nocturno' && Math.abs(valor - 2734) < 100) {
              console.log('✅ [EDGE v2.0] NOCTURNO SUCCESS: Exacto $2,734:', valor);
            } else {
              console.log(`⚠️ [EDGE v2.0] VALIDACIÓN: ${tipoRecargoAleluya} = $${valor} (esperado diferente)`);
            }
          }
        }
      } else {
        detalleCalculo = 'Ingrese las horas de recargo';
      }
      break;

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
          // ✅ NUEVA LÓGICA: Cálculo desde día 1 según normativa colombiana
          console.log(`🏥 [INCAPACIDAD v3.0] Calculando incapacidad general: ${dias} días, salario base: ${salarioBase}`);
          
          // Calcular valor diario al 66.67%
          const valorDiarioCalculado = salarioDiario * 0.6667;
          
          // ✅ TOPE MÍNIMO: SMLDV 2025 = $1.423.500 / 30 = $47.450
          const smldv = DEFAULT_CONFIG_2025.salarioMinimo / 30;
          
          // Aplicar el mayor entre el cálculo y el SMLDV
          const valorDiarioFinal = Math.max(valorDiarioCalculado, smldv);
          
          // Aplicar a TODOS los días (desde día 1)
          valor = Math.round(valorDiarioFinal * dias);
          factorCalculo = valorDiarioFinal / salarioDiario; // Factor efectivo aplicado
          
          console.log(`🧮 [INCAPACIDAD v3.0] CÁLCULO DETALLADO:`);
          console.log(`  - Salario diario: $${salarioDiario.toFixed(2)}`);
          console.log(`  - Valor al 66.67%: $${valorDiarioCalculado.toFixed(2)}`);
          console.log(`  - SMLDV 2025: $${smldv.toFixed(2)}`);
          console.log(`  - Valor diario final: $${valorDiarioFinal.toFixed(2)}`);
          console.log(`  - Total ${dias} días: $${valor}`);
          
          // ✅ DETALLE NORMATIVO COMPLETO
          const tipoTope = valorDiarioFinal === smldv ? '(aplicando SMLDV como tope mínimo)' : '(66.67% del salario)';
          detalleCalculo = `Incapacidad general: ${dias} días × $${Math.round(valorDiarioFinal).toLocaleString()} ${tipoTope} = $${valor.toLocaleString()}`;
          
          // ✅ VALIDACIÓN CON CASOS DE PRUEBA
          if (salarioBase === 1200000 && dias === 3 && Math.abs(valor - 142350) < 100) {
            console.log('✅ [INCAPACIDAD v3.0] CASO 1 SUCCESS: $1.200.000 × 3 días = $142.350');
          } else if (salarioBase === 2000000 && dias === 5 && Math.abs(valor - 237250) < 100) {
            console.log('✅ [INCAPACIDAD v3.0] CASO 2 SUCCESS: $2.000.000 × 5 días = $237.250');
          }
          
        } else if (subtipo === 'laboral') {
          // Incapacidades laborales: 100% desde día 1
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `Incapacidad laboral: (${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
        }
        // ✅ REMOVIDO: case 'maternidad' (ahora está en licencia_remunerada)
      } else {
        detalleCalculo = 'Ingrese días y seleccione tipo de incapacidad';
      }
      break;

    case 'licencia_remunerada':
      if (dias && dias > 0) {
        const salarioDiario = salarioBase / 30;
        valor = Math.round(salarioDiario * dias);
        factorCalculo = 1;
        
        // ✅ NUEVA LÓGICA: Manejo específico para maternidad
        if (subtipo === 'maternidad') {
          detalleCalculo = `Licencia de maternidad: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()} (Ley 1822/2017 - Pago EPS)`;
          console.log('✅ [MATERNIDAD] Calculada como licencia remunerada:', { dias, valor });
        } else {
          detalleCalculo = `Licencia remunerada: (${salarioBase.toLocaleString()} / 30) × ${dias} días = ${valor.toLocaleString()}`;
        }
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
  
  // ✅ DEBUG FINAL: Log del resultado para casos específicos
  if (tipoNovedad === 'incapacidad' && subtipo === 'general') {
    console.log(`🏁 [INCAPACIDAD v3.0] RESULTADO FINAL: valor=$${result.valor}, días=${dias}, base=$${salarioBase}`);
  }
  
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
    errors.push('Las horas extra no pueden ser negativos');
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

    console.log(`🚀 [EDGE v3.0] Request received: action="${action}", tipoNovedad="${data?.tipoNovedad}", subtipo="${data?.subtipo}"`);

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
        console.log(`🎯 [EDGE v3.0] Calculating novedad: ${data.tipoNovedad} - ${data.subtipo}`);
        const novedadResult = calculateNovedadUltraKiss(data);
        console.log(`🎯 [EDGE v3.0] Novedad result: valor=${novedadResult.valor}`);
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
