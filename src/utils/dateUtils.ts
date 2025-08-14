/**
 * Utilidades de fechas para evitar problemas de UTC
 * Siguiendo el principio KISS: una función, una responsabilidad
 */

/**
 * Parsear una fecha string (YYYY-MM-DD) como fecha local
 * Evita problemas de UTC al crear fechas locales explícitamente
 */
export const parseLocalDate = (dateString: string): Date => {
  console.log('🔍 [DATEUTILS V4.0] parseLocalDate input:', dateString);
  
  if (!dateString) {
    console.error('❌ [DATEUTILS V4.0] parseLocalDate: dateString vacío');
    return new Date(NaN);
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  console.log('🔍 [DATEUTILS V4.0] parseLocalDate parsed:', { year, month, day });
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('❌ [DATEUTILS V4.0] parseLocalDate: valores NaN después de parsear');
    return new Date(NaN);
  }
  
  const date = new Date(year, month - 1, day); // mes es 0-indexado
  console.log('🔍 [DATEUTILS V4.0] parseLocalDate result:', date.toISOString());
  
  return date;
};

/**
 * Calcular días entre dos fechas (inclusivo)
 * Retorna el número de días incluyendo ambas fechas
 * ✅ V4.0: Corrección con logging defensivo exhaustivo
 */
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  console.log('🎯 [DATEUTILS V4.0] ===== CALCULATEDAYS INICIADO =====');
  console.log('🎯 [DATEUTILS V4.0] Input recibido:', {
    startDate,
    endDate,
    startType: typeof startDate,
    endType: typeof endDate,
    timestamp: new Date().toISOString()
  });

  if (!startDate || !endDate) {
    console.log('❌ [DATEUTILS V4.0] Fechas vacías:', { startDate, endDate });
    return 0;
  }
  
  console.log('🔍 [DATEUTILS V4.0] Parseando fechas...');
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  
  console.log('🔍 [DATEUTILS V4.0] Fechas parseadas:', {
    start: start.toISOString(),
    end: end.toISOString(),
    startValid: !isNaN(start.getTime()),
    endValid: !isNaN(end.getTime())
  });
  
  // Validar que las fechas sean válidas
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('❌ [DATEUTILS V4.0] Fechas inválidas después de parsear');
    return 0;
  }
  
  // ✅ V4.0: CORRECCIÓN CRÍTICA - Cálculo simplificado y correcto
  console.log('🔍 [DATEUTILS V4.0] Calculando diferencia...');
  
  // Obtener tiempo en milisegundos
  const startTime = start.getTime();
  const endTime = end.getTime();
  
  console.log('🔍 [DATEUTILS V4.0] Tiempos en ms:', {
    startTime,
    endTime,
    diferencia: endTime - startTime
  });
  
  // Calcular diferencia en días
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffInMs = endTime - startTime;
  const diffInDays = Math.floor(diffInMs / msPerDay) + 1; // +1 para incluir ambos días
  
  console.log('🔍 [DATEUTILS V4.0] Cálculo detallado:', {
    msPerDay,
    diffInMs,
    diffInDaysRaw: diffInMs / msPerDay,
    diffInDaysFloor: Math.floor(diffInMs / msPerDay),
    diffInDaysFinal: diffInDays,
    isValidResult: diffInDays >= 0
  });

  const finalResult = Math.max(0, diffInDays);
  
  console.log('🎯 [DATEUTILS V4.0] ===== RESULTADO FINAL =====');
  console.log('🎯 [DATEUTILS V4.0] Final result:', {
    startDate,
    endDate,
    calculatedDays: finalResult,
    expectedFor_2025_08_05_to_2025_08_08: 4,
    isCorrect: startDate === '2025-08-05' && endDate === '2025-08-08' ? finalResult === 4 : 'N/A',
    timestamp: new Date().toISOString()
  });
  
  return finalResult;
};

/**
 * Validar que un rango de fechas sea válido
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  if (!startDate || !endDate) return false;
  
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  
  return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
};

/**
 * Formatear fecha para display (DD/MM/YYYY)
 */
export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * Formatear fecha y hora para display (DD/MM/YYYY HH:mm)
 */
export const formatDateTimeForDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};
