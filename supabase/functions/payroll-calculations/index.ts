import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NovedadForIBC {
  valor: number;
  constitutivo_salario: boolean;
  tipo_novedad: string;
}

interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  periodDate?: string;
  novedades?: NovedadForIBC[];
}

interface NovedadCalculationInput {
  tipoNovedad: string;
  subtipo?: string;
  salarioBase: number;
  horas?: number;
  dias?: number;
  fechaPeriodo?: string;
  valorManual?: number;
  cuotas?: number;
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
  uvt: 47065, // ✅ UVT 2025 actualizado
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

// ✅ NUEVA TABLA DE RETENCIÓN EN LA FUENTE 2025 (actualizada)
const RETENCION_FUENTE_2025 = [
  { min: 0, max: 95, rate: 0, base: 0, description: 'Exento' },
  { min: 96, max: 150, rate: 19, base: 95, description: '19% sobre exceso de 95 UVT' },
  { min: 151, max: 360, rate: 28, base: 150, description: '28% sobre exceso de 150 UVT' },
  { min: 361, max: 640, rate: 33, base: 360, description: '33% sobre exceso de 360 UVT' },
  { min: 641, max: 945, rate: 35, base: 640, description: '35% sobre exceso de 640 UVT' },
  { min: 946, max: 2300, rate: 37, base: 945, description: '37% sobre exceso de 945 UVT' },
  { min: 2301, max: Infinity, rate: 39, base: 2300, description: '39% sobre exceso de 2300 UVT' }
];

// ✅ LÍMITES LEGALES PARA PRÉSTAMOS Y LIBRANZAS
const PRESTAMO_LIMITS = {
  libranza: { maxPercent: 30, description: 'Libranza - Máximo 30% del salario' },
  cooperativa: { maxPercent: 30, description: 'Cooperativa - Máximo 30% del salario' },
  empresa: { maxPercent: 50, description: 'Empresa - Máximo 50% del salario' },
  banco: { maxPercent: 30, description: 'Banco - Máximo 30% del salario' }
};

const JORNADAS_LEGALES = [
  {
    fechaString: '2026-07-15',
    horasSemanales: 42,
    descripcion: 'Jornada final según Ley 2101 de 2021'
  },
  {
    fechaString: '2025-07-15',
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

const HORAS_MENSUALES_POR_JORNADA: Record<number, number> = {
  48: 240,
  47: 235,
  46: 230,
  44: 220,
  42: 210
};

function getHorasParaRecargos(fechaStr?: string): number {
  const fechaComparar = fechaStr ? fechaStr.split('T')[0] : new Date().toISOString().split('T')[0];
  
  if (fechaComparar >= '2025-07-01') {
    return 220;
  }
  
  const jornadaInfo = getJornadaLegal(fechaStr);
  return jornadaInfo.horasMensuales;
}

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

function getFactorRecargoTotal(tipoRecargo: string, fechaPeriodo: Date): {
  factorTotal: number;
  porcentaje: string;
  normativa: string;
} {
  const fecha = fechaPeriodo || new Date();
  
  console.log(`🔍 [EDGE v2.0] DEBUG NOCTURNO DOMINICAL: tipoRecargo="${tipoRecargo}", fecha=${fecha.toISOString().split('T')[0]}`);
  
  switch (tipoRecargo) {
    case 'nocturno':
      return {
        factorTotal: 0.35,
        porcentaje: '35%',
        normativa: 'CST Art. 168 - Recargo nocturno ordinario (35% total)'
      };
      
    case 'dominical':
      if (fecha < new Date('2025-07-01')) {
        return {
          factorTotal: 0.75,
          porcentaje: '75%',
          normativa: 'Ley 789/2002 Art. 3 - Vigente hasta 30-jun-2025 (75% total)'
        };
      } else if (fecha < new Date('2026-07-01')) {
        return {
          factorTotal: 0.80,
          porcentaje: '80%',
          normativa: 'Ley 2466/2025 - Vigente 01-jul-2025 a 30-jun-2026 (80% total)'
        };
      } else if (fecha < new Date('2027-07-01')) {
        return {
          factorTotal: 0.90,
          porcentaje: '90%',
          normativa: 'Ley 2466/2025 - Vigente 01-jul-2026 a 30-jun-2027 (90% total)'
        };
      } else {
        return {
          factorTotal: 1.00,
          porcentaje: '100%',
          normativa: 'Ley 2466/2025 - Vigente desde 01-jul-2027 (100% total)'
        };
      }
      
    case 'nocturno_dominical':
      console.log(`✅ [EDGE v2.0] NOCTURNO DOMINICAL DETECTADO: Aplicando factor 1.15`);
      return {
        factorTotal: 1.15,
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

function getFactorHoraExtra(subtipo: string, fechaPeriodo?: string): number {
  const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
  
  switch (subtipo) {
    case 'diurnas':
      return 1.25;
      
    case 'nocturnas':
      return 1.75;
      
    case 'dominicales_diurnas':
    case 'festivas_diurnas':
      const factorDominicalDiurno = getFactorRecargoTotal('dominical', fechaObj);
      return 1 + 0.25 + factorDominicalDiurno.factorTotal;
      
    case 'dominicales_nocturnas':
    case 'festivas_nocturnas':
      const factorDominicalNocturno = getFactorRecargoTotal('dominical', fechaObj);
      return 1 + 0.75 + factorDominicalNocturno.factorTotal;
      
    default:
      console.error(`❌ Subtipo de horas extra no válido: ${subtipo}`);
      return 1.0;
  }
}

// ✅ NUEVA FUNCIÓN: Calcular retención en la fuente 2025
function calculateRetencionFuente2025(salarioMensual: number): { 
  valor: number; 
  detalle: string; 
  baseEnUvt: number;
  rangoAplicado: any;
} {
  const config = DEFAULT_CONFIG_2025;
  const baseEnUvt = salarioMensual / config.uvt;
  
  console.log('🏦 Calculando Retención en la Fuente 2025:', {
    salarioMensual,
    uvt: config.uvt,
    baseEnUvt: baseEnUvt.toFixed(2)
  });
  
  // Encontrar el rango correspondiente
  const rango = RETENCION_FUENTE_2025.find(r => 
    baseEnUvt >= r.min && baseEnUvt <= r.max
  );
  
  if (!rango || rango.rate === 0) {
    return {
      valor: 0,
      detalle: 'Salario no sujeto a retención en la fuente (menor a 95 UVT)',
      baseEnUvt,
      rangoAplicado: rango
    };
  }
  
  // Calcular retención
  const baseGravable = baseEnUvt - rango.base;
  const retencionEnUvt = baseGravable * (rango.rate / 100);
  const retencionEnPesos = Math.round(retencionEnUvt * config.uvt);
  
  console.log('💰 Retención calculada:', {
    rango: `${rango.min}-${rango.max} UVT`,
    porcentaje: `${rango.rate}%`,
    baseGravable: baseGravable.toFixed(2),
    retencionEnUvt: retencionEnUvt.toFixed(2),
    retencionEnPesos
  });
  
  return {
    valor: retencionEnPesos,
    detalle: `${rango.description}. Base: ${baseGravable.toFixed(2)} UVT × ${rango.rate}% = ${retencionEnPesos.toLocaleString()}`,
    baseEnUvt,
    rangoAplicado: rango
  };
}

// ✅ NUEVA FUNCIÓN: Validar límites de préstamos
function validatePrestamoLimits(valorCuota: number, salarioBase: number, tipoPrestamo: string): {
  isValid: boolean;
  maxAllowed: number;
  percentage: number;
  warning?: string;
} {
  const limit = PRESTAMO_LIMITS[tipoPrestamo as keyof typeof PRESTAMO_LIMITS];
  
  if (!limit) {
    return {
      isValid: false,
      maxAllowed: 0,
      percentage: 0,
      warning: 'Tipo de préstamo no válido'
    };
  }
  
  const maxAllowed = Math.round(salarioBase * (limit.maxPercent / 100));
  const percentage = (valorCuota / salarioBase) * 100;
  const isValid = valorCuota <= maxAllowed;
  
  return {
    isValid,
    maxAllowed,
    percentage,
    warning: !isValid ? `Excede el límite legal del ${limit.maxPercent}% (${limit.description})` : undefined
  };
}

// ✅ NUEVA FUNCIÓN: Calcular IBC incluyendo novedades constitutivas
function calculateIBC(baseSalary: number, novedades: NovedadForIBC[] = [], config: PayrollConfiguration): {
  ibcSalud: number;
  ibcPension: number;
  detalleCalculo: string;
} {
  console.log('🔍 [IBC v2.0] Calculando IBC:', {
    baseSalary,
    novedadesCount: novedades.length,
    novedades: novedades.map(n => ({ tipo: n.tipo_novedad, valor: n.valor, constitutivo: n.constitutivo_salario }))
  });

  // 1. Calcular ingresos constitutivos de salario
  const novedadesConstitutivas = novedades
    .filter(n => n.constitutivo_salario === true)
    .reduce((sum, n) => sum + Number(n.valor || 0), 0);

  const ingresosConstitutivos = baseSalary + novedadesConstitutivas;
  
  console.log('📊 [IBC v2.0] Ingresos constitutivos:', {
    salarioBase: baseSalary,
    novedadesConstitutivas,
    totalConstitutivo: ingresosConstitutivos
  });

  // 2. Aplicar límites legales
  const topeIbcPension = config.salarioMinimo * 25; // 25 SMMLV para pensión
  const minimoIbc = config.salarioMinimo; // Mínimo 1 SMMLV
  
  // Para salud: sin límite superior
  const ibcSalud = Math.max(ingresosConstitutivos, minimoIbc);
  
  // Para pensión: tope de 25 SMMLV
  const ibcPension = Math.min(Math.max(ingresosConstitutivos, minimoIbc), topeIbcPension);
  
  console.log('✅ [IBC v2.0] IBC calculados:', {
    ibcSalud,
    ibcPension,
    topeAplicado: ibcPension < ingresosConstitutivos,
    diferencia: ingresosConstitutivos - ibcPension
  });

  const detalleCalculo = `IBC Salud: $${ibcSalud.toLocaleString()} - IBC Pensión: $${ibcPension.toLocaleString()}${
    novedadesConstitutivas > 0 ? ` (incluye $${novedadesConstitutivas.toLocaleString()} en novedades constitutivas)` : ''
  }${
    ibcPension === topeIbcPension && ingresosConstitutivos > topeIbcPension ? 
    ` - Tope pensión aplicado (máx. 25 SMMLV)` : ''
  }`;

  return {
    ibcSalud,
    ibcPension,
    detalleCalculo
  };
}

// ✅ FUNCIÓN MEJORADA: Cálculo de novedades con nuevos tipos
function calculateNovedadUltraKiss(input: NovedadCalculationInput) {
  const { tipoNovedad, subtipo, salarioBase, horas, dias, fechaPeriodo, valorManual, cuotas } = input;
  
  let valor = 0;
  let factorCalculo = 0;
  let detalleCalculo = '';
  let validationResult: any = null;

  switch (tipoNovedad) {
    case 'horas_extra':
      if (horas && horas > 0 && subtipo) {
        const horasMensuales = getHorasMensuales(fechaPeriodo);
        const valorHoraOrdinaria = salarioBase / horasMensuales;
        const factor = getFactorHoraExtra(subtipo, fechaPeriodo);
        
        if (factor && factor > 0) {
          valor = Math.round(valorHoraOrdinaria * factor * horas);
          factorCalculo = factor;
          
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
        console.log(`🔍 [EDGE v2.0] SUBTIPO RECIBIDO: "${subtipo}"`);
        
        let tipoRecargoAleluya = 'nocturno';
        
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
        
        const fechaObj = fechaPeriodo ? new Date(fechaPeriodo) : new Date();
        const factorInfo = getFactorRecargoTotal(tipoRecargoAleluya, fechaObj);
        
        console.log(`📊 [EDGE v2.0] FACTOR INFO: factorTotal=${factorInfo.factorTotal}, porcentaje=${factorInfo.porcentaje}`);
        
        if (factorInfo.factorTotal <= 0) {
          console.error(`❌ [EDGE v2.0] Factor inválido para ${tipoRecargoAleluya}:`, factorInfo);
          detalleCalculo = `Error: Factor inválido para ${tipoRecargoAleluya}`;
          break;
        }
        
        const divisorAleluya = 30 * 7.333;
        const calculoDetallado = (salarioBase * factorInfo.factorTotal * horas) / divisorAleluya;
        valor = Math.round(calculoDetallado);
        factorCalculo = factorInfo.factorTotal;
        
        console.log(`🧮 [EDGE v2.0] CÁLCULO DETALLADO: (${salarioBase} × ${factorInfo.factorTotal} × ${horas}) ÷ ${divisorAleluya} = ${calculoDetallado} → ${valor}`);
        
        detalleCalculo = `${tipoRecargoAleluya} (fórmula Aleluya v2.0): (${salarioBase.toLocaleString()} × ${factorInfo.factorTotal} × ${horas}h) ÷ (30 × 7.333) = ${valor.toLocaleString()}`;
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
        
        if (subtipo === 'general' || subtipo === 'comun') {
          console.log(`🏥 [INCAPACIDAD v3.0] Calculando incapacidad general: ${dias} días, salario base: ${salarioBase}`);
          
          const valorDiarioCalculado = salarioDiario * 0.6667;
          const smldv = DEFAULT_CONFIG_2025.salarioMinimo / 30;
          const valorDiarioFinal = Math.max(valorDiarioCalculado, smldv);
          
          valor = Math.round(valorDiarioFinal * dias);
          factorCalculo = valorDiarioFinal / salarioDiario;
          
          console.log(`🧮 [INCAPACIDAD v3.0] CÁLCULO DETALLADO:`);
          console.log(`  - Salario diario: $${salarioDiario.toFixed(2)}`);
          console.log(`  - Valor al 66.67%: $${valorDiarioCalculado.toFixed(2)}`);
          console.log(`  - SMLDV 2025: $${smldv.toFixed(2)}`);
          console.log(`  - Valor diario final: $${valorDiarioFinal.toFixed(2)}`);
          console.log(`  - Total ${dias} días: $${valor}`);
          
          const tipoTope = valorDiarioFinal === smldv ? '(aplicando SMLDV como tope mínimo)' : '(66.67% del salario)';
          detalleCalculo = `Incapacidad general: ${dias} días × $${Math.round(valorDiarioFinal).toLocaleString()} ${tipoTope} = $${valor.toLocaleString()}`;
          
        } else if (subtipo === 'laboral') {
          valor = Math.round(salarioDiario * dias);
          factorCalculo = 1;
          detalleCalculo = `Incapacidad laboral: (${salarioBase.toLocaleString()} / 30) × 100% × ${dias} días = ${valor.toLocaleString()}`;
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

    // ✅ NUEVOS CASOS: Préstamos y deducciones
    case 'libranza':
      if (valorManual && valorManual > 0) {
        valor = valorManual;
        factorCalculo = valor / salarioBase;
        
        // Validar límites legales
        const validation = validatePrestamoLimits(valor, salarioBase, subtipo || 'libranza');
        validationResult = validation;
        
        let descripcionTipo = '';
        switch (subtipo) {
          case 'cooperativa':
            descripcionTipo = 'Cooperativa (máx. 30%)';
            break;
          case 'empresa':
            descripcionTipo = 'Empresa (máx. 50%)';
            break;
          case 'banco':
            descripcionTipo = 'Banco (máx. 30%)';
            break;
          default:
            descripcionTipo = 'Libranza (máx. 30%)';
        }
        
        const porcentaje = validation.percentage.toFixed(1);
        const estado = validation.isValid ? '✅' : '⚠️';
        
        detalleCalculo = `${estado} ${descripcionTipo}: $${valor.toLocaleString()} (${porcentaje}% del salario)`;
        
        if (cuotas && cuotas > 0) {
          detalleCalculo += ` - ${cuotas} cuotas restantes`;
        }
        
        if (!validation.isValid) {
          detalleCalculo += ` - ${validation.warning}`;
        }
      } else {
        detalleCalculo = 'Ingrese el valor de la cuota del préstamo';
      }
      break;

    case 'retencion_fuente':
      if (valorManual && valorManual > 0) {
        // Valor manual ingresado
        valor = valorManual;
        factorCalculo = valor / salarioBase;
        detalleCalculo = `Retención manual: $${valor.toLocaleString()} (${(factorCalculo * 100).toFixed(2)}% del salario)`;
      } else {
        // Cálculo automático usando tabla 2025
        const retencionResult = calculateRetencionFuente2025(salarioBase);
        valor = retencionResult.valor;
        factorCalculo = valor > 0 ? valor / salarioBase : 0;
        
        detalleCalculo = `Retención automática 2025: ${retencionResult.detalle}`;
        
        // Información adicional para debug
        validationResult = {
          baseEnUvt: retencionResult.baseEnUvt,
          rangoAplicado: retencionResult.rangoAplicado,
          uvt2025: DEFAULT_CONFIG_2025.uvt
        };
      }
      break;

    case 'deduccion_especial':
      if (valorManual && valorManual > 0) {
        valor = valorManual;
        factorCalculo = valor / salarioBase;
        
        let tipoDeduccion = 'Deducción especial';
        switch (subtipo) {
          case 'multa':
            tipoDeduccion = 'Multa disciplinaria';
            break;
          case 'descuento_nomina':
            tipoDeduccion = 'Descuento de nómina';
            break;
          case 'otros':
            tipoDeduccion = 'Otra deducción';
            break;
        }
        
        detalleCalculo = `${tipoDeduccion}: $${valor.toLocaleString()} (${(factorCalculo * 100).toFixed(2)}% del salario)`;
      } else {
        detalleCalculo = 'Ingrese el valor de la deducción especial';
      }
      break;

    case 'bonificacion':
    case 'comision':
    case 'prima':
    case 'otros_ingresos':
      if (valorManual && valorManual > 0) {
        valor = valorManual;
        factorCalculo = valor / salarioBase;
        detalleCalculo = `${tipoNovedad}: $${valor.toLocaleString()} (${(factorCalculo * 100).toFixed(2)}% del salario)`;
      } else {
        detalleCalculo = 'Ingrese el valor manualmente para este tipo de novedad';
      }
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

  const horasMensualesJornada = getHorasMensuales(fechaPeriodo);
  const horasSemanalesJornada = getHorasSemanales(fechaPeriodo);
  const horasRecargos = getHorasParaRecargos(fechaPeriodo);

  const result = {
    valor,
    factorCalculo,
    detalleCalculo,
    validationResult,
    jornadaInfo: {
      horasSemanales: horasSemanalesJornada,
      horasMensuales: horasMensualesJornada,
      divisorHorario: tipoNovedad === 'recargo_nocturno' ? horasRecargos : horasMensualesJornada,
      valorHoraOrdinaria: Math.round(salarioBase / (tipoNovedad === 'recargo_nocturno' ? horasRecargos : horasMensualesJornada)),
      ley: horasMensualesJornada === 230 ? 'Ley 2101 de 2021 (Tercera fase)' : 'Ley 2101 de 2021 (Cuarta fase)',
      descripcion: horasMensualesJornada === 230 ? 'Tercera fase de reducción (46h semanales)' : 'Cuarta fase de reducción (44h semanales)'
    }
  };
  
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
      descripcion: `Jornada de ${getHorasSemanales(input.periodDate)} horas semanales`
    }
  };
}

// ✅ FUNCIÓN PRINCIPAL ACTUALIZADA: Ahora calcula IBC correctamente
function calculatePayroll(input: PayrollCalculationInput) {
  const config = DEFAULT_CONFIG_2025;
  const horasMensuales = getHorasMensuales(input.periodDate);
  const horasSemanales = getHorasSemanales(input.periodDate);
  
  console.log('🚀 [PAYROLL v3.0] Iniciando cálculo con IBC correcto:', {
    baseSalary: input.baseSalary,
    novedadesCount: input.novedades?.length || 0
  });

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
  
  // ✅ CORREGIDO: Calcular IBC SOLO con salario base (SIN auxilio de transporte)
  const ibcCalculation = calculateIBC(input.baseSalary, input.novedades || [], config);
  
  // ✅ CORREGIDO: Usar IBC para calcular deducciones
  const healthDeduction = Math.round(ibcCalculation.ibcSalud * config.porcentajes.saludEmpleado);
  const pensionDeduction = Math.round(ibcCalculation.ibcPension * config.porcentajes.pensionEmpleado);
  const totalDeductions = healthDeduction + pensionDeduction;

  const netPay = grossPay - totalDeductions;

  // ✅ CORREGIDO: Aportes patronales también se calculan sobre IBC
  const employerHealth = Math.round(ibcCalculation.ibcSalud * config.porcentajes.saludEmpleador);
  const employerPension = Math.round(ibcCalculation.ibcPension * config.porcentajes.pensionEmpleador);
  const employerArl = Math.round(ibcCalculation.ibcSalud * config.porcentajes.arl);
  const employerCaja = Math.round(ibcCalculation.ibcSalud * config.porcentajes.cajaCompensacion);
  const employerIcbf = Math.round(ibcCalculation.ibcSalud * config.porcentajes.icbf);
  const employerSena = Math.round(ibcCalculation.ibcSalud * config.porcentajes.sena);

  const employerContributions = employerHealth + employerPension + employerArl + 
                                employerCaja + employerIcbf + employerSena;

  const totalPayrollCost = netPay + employerContributions;

  const result = {
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
    // ✅ NUEVO: Incluir IBC en el resultado
    ibc: ibcCalculation.ibcSalud,
    jornadaInfo: {
      horasSemanales,
      horasMensuales,
      divisorHorario: horasMensuales,
      valorHoraOrdinaria: Math.round(input.baseSalary / horasMensuales),
      ley: 'Ley 2101 de 2021',
      descripcion: `Jornada de ${horasSemanales} horas semanales`
    }
  };

  console.log('✅ [PAYROLL v3.0] Cálculo completado con IBC:', {
    ibc: result.ibc,
    healthDeduction: result.healthDeduction,
    pensionDeduction: result.pensionDeduction,
    detalleIBC: ibcCalculation.detalleCalculo
  });

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    console.log(`🚀 [EDGE v5.0] Request received: action="${action}"`);
    if (action === 'calculate' && data.novedades) {
      console.log(`📊 [EDGE v5.0] Novedades incluidas: ${data.novedades.length} items`);
    }

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
        console.log(`🎯 [EDGE v4.0] Calculating novedad: ${data.tipoNovedad} - ${data.subtipo}`);
        const novedadResult = calculateNovedadUltraKiss(data);
        console.log(`🎯 [EDGE v4.0] Novedad result: valor=${novedadResult.valor}, validation=${JSON.stringify(novedadResult.validationResult)}`);
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

      // ✅ NUEVA ACCIÓN: Calcular solo retención en la fuente
      case 'calculate-retencion-fuente':
        console.log(`🏦 [EDGE v4.0] Calculating retención fuente for salary: ${data.salarioBase}`);
        const retencionResult = calculateRetencionFuente2025(data.salarioBase);
        return new Response(JSON.stringify({ success: true, data: retencionResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      // ✅ NUEVA ACCIÓN: Validar límites de préstamos
      case 'validate-prestamo':
        console.log(`💳 [EDGE v4.0] Validating prestamo: ${data.valorCuota} for salary: ${data.salarioBase}`);
        const validationPrestamo = validatePrestamoLimits(data.valorCuota, data.salarioBase, data.tipoPrestamo);
        return new Response(JSON.stringify({ success: true, data: validationPrestamo }), {
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
