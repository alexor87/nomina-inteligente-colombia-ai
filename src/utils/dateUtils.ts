
/**
 * Utilidades de fechas para evitar problemas de UTC
 * Siguiendo el principio KISS: una función, una responsabilidad
 */

/**
 * Parsear una fecha string (YYYY-MM-DD) como fecha local
 * Evita problemas de UTC al crear fechas locales explícitamente
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // mes es 0-indexado
};

/**
 * Calcular días entre dos fechas (inclusivo)
 * Retorna el número de días incluyendo ambas fechas
 */
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  
  // Validar que las fechas sean válidas
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Calcular diferencia
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
  
  return Math.max(0, diffDays);
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
