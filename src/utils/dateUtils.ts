
/**
 * Valida que un rango de fechas sea válido
 * @param startDate - Fecha de inicio en formato YYYY-MM-DD
 * @param endDate - Fecha de fin en formato YYYY-MM-DD
 * @returns true si el rango es válido
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  if (!startDate || !endDate) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end >= start;
};

/**
 * Formatea una fecha para mostrar al usuario
 * @param dateString - Fecha en formato ISO
 * @returns Fecha formateada para display
 */
export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Calcula los días entre dos fechas (inclusivo)
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Número de días
 */
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};
