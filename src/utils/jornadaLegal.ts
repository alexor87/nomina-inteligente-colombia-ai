
/**
 * KISS: Utilidades de jornada legal y factores de recargo unificados
 * Una sola fuente de verdad para cálculos temporales
 */

// ✅ KISS: Fechas críticas de jornada legal en un solo lugar
const FECHA_PRIMERA_FASE = '2023-07-15'; // 48h → 46h
const FECHA_SEGUNDA_FASE = '2024-07-15'; // 46h → 44h  
const FECHA_TERCERA_FASE = '2025-07-01'; // 44h → 42h (CORREGIDA)
const FECHA_CUARTA_FASE = '2026-07-15'; // 42h → 40h

/**
 * ✅ KISS: Función principal para obtener horas semanales según fecha
 */
export function getWeeklyHours(fecha: Date): number {
  const fechaString = fecha.toISOString().split('T')[0];
  
  if (fechaString >= FECHA_CUARTA_FASE) return 40;
  if (fechaString >= FECHA_TERCERA_FASE) return 42;
  if (fechaString >= FECHA_SEGUNDA_FASE) return 44;
  if (fechaString >= FECHA_PRIMERA_FASE) return 46;
  return 48; // Antes de cualquier fase
}

/**
 * ✅ KISS: Función principal para obtener divisor horario mensual
 */
export function getHourlyDivisor(fecha: Date): number {
  const horasSemanales = getWeeklyHours(fecha);
  
  // KISS: Conversión directa semanal → mensual (4.33 semanas promedio)
  switch (horasSemanales) {
    case 48: return 230; // 48h × 4.33 ≈ 208, pero se usa 230 por convención
    case 46: return 220; // 46h × 4.33 ≈ 199, pero se usa 220 por convención  
    case 44: return 220; // 44h × 4.33 ≈ 190, pero se usa 220 por convención
    case 42: return 200; // 42h × 4.33 ≈ 182, pero se usa 200 por convención
    case 40: return 190; // 40h × 4.33 ≈ 173, pero se usa 190 por convención
    default: return 230;
  }
}

/**
 * ✅ KISS: Factor dominical/festivo progresivo según Ley 2466/2024
 * Una sola función unificada para frontend y backend
 */
export function getDominicalFactor(fecha: Date): number {
  const year = fecha.getFullYear();
  const fechaString = fecha.toISOString().split('T')[0];
  
  console.log(`🎯 KISS: Calculando factor dominical para ${fechaString}`);
  
  // ✅ CORRECCIÓN CRÍTICA: Implementación desde 1 julio 2025 (no 15 julio)
  if (year >= 2027) {
    console.log(`🎯 KISS: Factor 2027+ = 100%`);
    return 1.00; // 100% a partir de 2027
  }
  
  if (year === 2026) {
    console.log(`🎯 KISS: Factor 2026 = 90%`);
    return 0.90; // 90% en 2026
  }
  
  if (year === 2025) {
    // ✅ FECHA CRÍTICA CORREGIDA: 1 julio 2025 (no 15 julio)
    if (fechaString >= '2025-07-01') {
      console.log(`🎯 KISS: Factor desde 1-jul-2025 = 80%`);
      return 0.80; // 80% desde 1 julio 2025
    } else {
      console.log(`🎯 KISS: Factor antes 1-jul-2025 = 75%`);
      return 0.75; // 75% hasta 30 junio 2025
    }
  }
  
  // Antes de 2025
  console.log(`🎯 KISS: Factor anterior a 2025 = 75%`);
  return 0.75; // 75% antes de 2025
}

/**
 * ✅ KISS: Información de jornada para una fecha específica
 */
export function getJornadaInfo(fecha: Date) {
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
    ley,
    descripcion,
    fechaVigencia: fecha
  };
}
