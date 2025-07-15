
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ KISS: Función unificada para factores progresivos (idéntica a frontend)
function getDominicalFactor(fecha: string): number {
  const year = parseInt(fecha.split('-')[0]);
  
  console.log(`🎯 Backend: Calculando factor dominical para ${fecha}`);
  
  if (year >= 2027) {
    console.log(`🎯 Backend: Factor 2027+ = 100%`);
    return 1.00;
  }
  
  if (year === 2026) {
    console.log(`🎯 Backend: Factor 2026 = 90%`);
    return 0.90;
  }
  
  if (year === 2025) {
    if (fecha >= '2025-07-01') {
      console.log(`🎯 Backend: Factor desde 1-jul-2025 = 80%`);
      return 0.80;
    } else {
      console.log(`🎯 Backend: Factor antes 1-jul-2025 = 75%`);
      return 0.75;
    }
  }
  
  console.log(`🎯 Backend: Factor anterior a 2025 = 75%`);
  return 0.75;
}

// ✅ KISS: Función unificada para horas semanales (idéntica a frontend)
function getWeeklyHours(fecha: string): number {
  if (fecha >= '2026-07-15') return 40;
  if (fecha >= '2025-07-01') return 42; // ✅ CORREGIDA
  if (fecha >= '2024-07-15') return 44;
  if (fecha >= '2023-07-15') return 46;
  return 48;
}

// ✅ KISS: Función unificada para divisor horario (idéntica a frontend)
function getHourlyDivisor(fecha: string): number {
  const horasSemanales = getWeeklyHours(fecha);
  
  switch (horasSemanales) {
    case 48: return 230;
    case 46: return 220;
    case 44: return 220;
    case 42: return 200;
    case 40: return 190;
    default: return 230;
  }
}

// ✅ KISS: Información de jornada unificada
function getJornadaInfo(fecha: string) {
  const horasSemanales = getWeeklyHours(fecha);
  const divisorHorario = getHourlyDivisor(fecha);
  
  let ley: string;
  let descripcion: string;
  
  if (horasSemanales === 48) {
    ley = "Ley original";
    descripcion = "Jornada tradicional (48h semanales)";
  } else if (horasSemanales === 46) {
    ley = "Ley 2101 de 2021 (Primera fase)";
    descripcion = "Primera fase de reducción (46h semanales)";
  } else if (horasSemanales === 44) {
    ley = "Ley 2101 de 2021 (Segunda fase)";
    descripcion = "Segunda fase de reducción (44h semanales)";
  } else if (horasSemanales === 42) {
    ley = "Ley 2101 de 2021 (Tercera fase)";
    descripcion = "Tercera fase de reducción (42h semanales)";
  } else {
    ley = "Ley 2101 de 2021 (Cuarta fase)";
    descripcion = "Cuarta fase de reducción (40h semanales)";
  }
  
  return {
    horasSemanales,
    horasMensuales: divisorHorario,
    divisorHorario,
    valorHoraOrdinaria: 0, // Se calculará después
    ley,
    descripcion
  };
}

// ✅ KISS: Función principal de cálculo de recargos
function calcularRecargoNocturno(data: any) {
  const { salarioBase, subtipo, horas, fechaPeriodo } = data;
  
  console.log('🚀 KISS Backend: *** PROCESANDO RECARGO NOCTURNO ***');
  console.log('🚀 KISS Backend: Input completo:', JSON.stringify(data, null, 2));
  
  const fechaNormalizada = fechaPeriodo.split('T')[0]; // Normalizar fecha
  console.log('🚀 KISS Backend: Fecha normalizada:', fechaNormalizada);
  
  const divisorHorario = getHourlyDivisor(fechaNormalizada);
  const valorHoraOrdinaria = Math.round(salarioBase / divisorHorario);
  
  let factorRecargo: number;
  let detalleCalculo: string;
  
  // ✅ KISS: Mapeo directo de subtipos con factores unificados
  switch (subtipo) {
    case 'nocturno':
      factorRecargo = 0.35; // 35% fijo
      detalleCalculo = `Recargo nocturno: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × 35% × ${horas} horas = ${Math.round(valorHoraOrdinaria * factorRecargo * horas).toLocaleString()}`;
      break;
      
    case 'dominical':
      // ✅ KISS: Factor dinámico unificado para dominical puro
      factorRecargo = getDominicalFactor(fechaNormalizada);
      const porcentajeDominical = (factorRecargo * 100).toFixed(0);
      detalleCalculo = `Recargo dominical: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeDominical}% × ${horas} horas = ${Math.round(valorHoraOrdinaria * factorRecargo * horas).toLocaleString()}`;
      console.log(`🎯 Backend RECARGO: Dominical puro = ${porcentajeDominical}%`);
      break;
      
    case 'festivo':
      // ✅ KISS: Festivo usa la misma lógica que dominical
      factorRecargo = getDominicalFactor(fechaNormalizada);
      const porcentajeFestivo = (factorRecargo * 100).toFixed(0);
      detalleCalculo = `Recargo festivo: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeFestivo}% × ${horas} horas = ${Math.round(valorHoraOrdinaria * factorRecargo * horas).toLocaleString()}`;
      console.log(`🎯 Backend RECARGO: Festivo = ${porcentajeFestivo}%`);
      break;
      
    case 'nocturno_dominical':
      // ✅ CORRECCIÓN MULTIPLICATIVA: 1.35 × factor_dominical
      const factorDominicalBase = getDominicalFactor(fechaNormalizada);
      factorRecargo = 1.35 * factorDominicalBase;
      const porcentajeND = (factorRecargo * 100).toFixed(0);
      detalleCalculo = `Recargo nocturno dominical: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeND}% × ${horas} horas = ${Math.round(valorHoraOrdinaria * factorRecargo * horas).toLocaleString()}`;
      console.log(`🎯 Backend RECARGO: Nocturno Dominical = 1.35 × ${(factorDominicalBase * 100).toFixed(0)}% = ${porcentajeND}%`);
      break;
      
    case 'nocturno_festivo':
      // ✅ CORRECCIÓN MULTIPLICATIVA: 1.35 × factor_festivo
      const factorFestivoBase = getDominicalFactor(fechaNormalizada);
      factorRecargo = 1.35 * factorFestivoBase;
      const porcentajeNF = (factorRecargo * 100).toFixed(0);
      detalleCalculo = `Recargo nocturno festivo: (${salarioBase.toLocaleString()} ÷ ${divisorHorario}) × ${porcentajeNF}% × ${horas} horas = ${Math.round(valorHoraOrdinaria * factorRecargo * horas).toLocaleString()}`;
      console.log(`🎯 Backend RECARGO: Nocturno Festivo = 1.35 × ${(factorFestivoBase * 100).toFixed(0)}% = ${porcentajeNF}%`);
      break;
      
    default:
      throw new Error(`Subtipo de recargo no válido: ${subtipo}`);
  }
  
  console.log('🚀 KISS Backend: Factor calculado:', factorRecargo);
  
  const valorFinal = Math.round(valorHoraOrdinaria * factorRecargo * horas);
  console.log('🚀 KISS Backend: Valor final:', valorFinal);
  
  const jornadaInfo = getJornadaInfo(fechaNormalizada);
  jornadaInfo.valorHoraOrdinaria = valorHoraOrdinaria;
  
  return {
    valor: valorFinal,
    factorCalculo: factorRecargo,
    detalleCalculo,
    jornadaInfo
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 KISS Backend: *** RECIBIDA SOLICITUD NOVEDAD ***');
    
    const { action, data } = await req.json();
    console.log('🚀 KISS Backend: Action:', action);
    console.log('🚀 KISS Backend: Data recibida:', JSON.stringify(data, null, 2));

    if (action === 'calculate-novedad') {
      console.log('🚀 KISS Backend: *** INICIANDO CÁLCULO NOVEDAD ***');
      
      let result;
      
      // ✅ KISS: Procesamiento directo por tipo de novedad
      if (data.tipoNovedad === 'recargo_nocturno') {
        result = calcularRecargoNocturno(data);
      } else {
        throw new Error(`Tipo de novedad no soportado: ${data.tipoNovedad}`);
      }
      
      console.log('🚀 KISS Backend: *** RESULTADO FINAL ***');
      console.log('🚀 KISS Backend:', JSON.stringify(result, null, 2));
      
      console.log('🚀 KISS Backend: *** ENVIANDO RESPUESTA ***');
      console.log('🚀 KISS Backend: Respuesta:', JSON.stringify(result, null, 2));
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);

  } catch (error) {
    console.error('❌ KISS Backend Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
