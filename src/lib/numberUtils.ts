
/**
 * Normaliza strings de números que pueden tener diferentes formatos locales
 * Ejemplos:
 * - "50.000" (formato alemán/europeo para 50000) -> 50000
 * - "50,000" (formato US para 50000) -> 50000
 * - "50.000,50" (formato europeo para 50000.50) -> 50000.50
 * - "50,000.50" (formato US para 50000.50) -> 50000.50
 * - "1.500" (ambiguo, pero interpretamos como 1500 por contexto de nómina) -> 1500
 */
export function normalizeNumberString(value: string): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remover espacios y caracteres no numéricos excepto puntos, comas y signos
  let cleaned = value.replace(/[^\d,.-]/g, '');
  
  // Si está vacío después de limpiar, retornar 0
  if (!cleaned) {
    return 0;
  }

  // Casos especiales para formatos comunes
  
  // Formato europeo con punto como separador de miles y coma como decimal
  // Ejemplo: "1.500,50" -> 1500.50
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
  
  // Formato US con coma como separador de miles y punto como decimal  
  // Ejemplo: "1,500.50" -> 1500.50
  if (/^\d{1,3}(,\d{3})*\.\d+$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
    return parseFloat(cleaned);
  }
  
  // Formato europeo solo con punto como separador de miles (sin decimales)
  // Ejemplo: "50.000" -> 50000 (asumimos que es separador de miles, no decimal)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
    return parseInt(cleaned, 10);
  }
  
  // Formato US solo con coma como separador de miles (sin decimales)
  // Ejemplo: "50,000" -> 50000
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
    return parseInt(cleaned, 10);
  }
  
  // Casos simples sin separadores de miles
  // Ejemplo: "50000" -> 50000, "50.5" -> 50.5, "50,5" -> 50.5
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Solo coma, probablemente decimal europeo: "50,5" -> 50.5
    cleaned = cleaned.replace(',', '.');
    return parseFloat(cleaned);
  }
  
  // Solo punto o número simple
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

/**
 * Convierte cualquier valor a número, manejando strings con formatos locales
 */
export function toNumber(value: any): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    return normalizeNumberString(value);
  }
  
  return 0;
}

/**
 * Convierte a entero, útil para días
 */
export function toInteger(value: any): number {
  const num = toNumber(value);
  return Math.floor(num);
}
