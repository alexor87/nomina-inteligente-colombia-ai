/**
 * Festivos de Colombia — Ley 51 de 1983 + Ley Emiliani (Ley 35 de 2014)
 *
 * 18 festivos anuales:
 * - 6 fijos (no se trasladan)
 * - 2 móviles basados en Pascua (Jueves/Viernes Santo)
 * - 10 trasladables al lunes siguiente (Ley Emiliani)
 */

/**
 * Calcula la fecha de Pascua para un año dado usando el algoritmo de Butcher/Meeus.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Traslada una fecha al lunes siguiente si no cae en lunes (Ley Emiliani).
 */
function moveToNextMonday(date: Date): Date {
  const day = date.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  if (day === 1) return date; // Ya es lunes
  const daysToAdd = day === 0 ? 1 : (8 - day); // Dom→+1, Mar→+6, Mié→+5, etc.
  const result = new Date(date);
  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Suma días a una fecha.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Cache de festivos por año para evitar recalcular
const holidayCache = new Map<number, Date[]>();
const holidayWithNamesCache = new Map<number, { date: Date; name: string }[]>();

/**
 * Retorna todos los festivos colombianos para un año dado.
 * Cada festivo es un Date a las 00:00 hora local.
 * Usa cache interno para evitar recálculos.
 */
export function getColombianHolidays(year: number): Date[] {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = getEasterDate(year);
  const holidays: Date[] = [];

  // ═══════════════════════════════════════════════
  // FESTIVOS FIJOS (no se trasladan)
  // ═══════════════════════════════════════════════
  holidays.push(new Date(year, 0, 1));   // Año Nuevo
  holidays.push(new Date(year, 4, 1));   // Día del Trabajo
  holidays.push(new Date(year, 6, 20));  // Independencia de Colombia
  holidays.push(new Date(year, 7, 7));   // Batalla de Boyacá
  holidays.push(new Date(year, 11, 8));  // Inmaculada Concepción
  holidays.push(new Date(year, 11, 25)); // Navidad

  // ═══════════════════════════════════════════════
  // FESTIVOS MÓVILES (basados en Pascua, no se trasladan)
  // ═══════════════════════════════════════════════
  holidays.push(addDays(easter, -3)); // Jueves Santo
  holidays.push(addDays(easter, -2)); // Viernes Santo

  // ═══════════════════════════════════════════════
  // FESTIVOS LEY EMILIANI (se trasladan al lunes siguiente)
  // ═══════════════════════════════════════════════
  holidays.push(moveToNextMonday(new Date(year, 0, 6)));   // Reyes Magos
  holidays.push(moveToNextMonday(new Date(year, 2, 19)));  // San José
  holidays.push(moveToNextMonday(addDays(easter, 39)));    // Ascensión del Señor
  holidays.push(moveToNextMonday(addDays(easter, 60)));    // Corpus Christi
  holidays.push(moveToNextMonday(addDays(easter, 68)));    // Sagrado Corazón
  holidays.push(moveToNextMonday(new Date(year, 5, 29)));  // San Pedro y San Pablo
  holidays.push(moveToNextMonday(new Date(year, 7, 15)));  // Asunción de la Virgen
  holidays.push(moveToNextMonday(new Date(year, 9, 12)));  // Día de la Raza
  holidays.push(moveToNextMonday(new Date(year, 10, 1)));  // Todos los Santos
  holidays.push(moveToNextMonday(new Date(year, 10, 11))); // Independencia de Cartagena

  const sorted = holidays.sort((a, b) => a.getTime() - b.getTime());
  holidayCache.set(year, sorted);
  return sorted;
}

/**
 * Verifica si una fecha es festivo colombiano.
 */
export function isColombianHoliday(date: Date, year?: number): boolean {
  const y = year ?? date.getFullYear();
  const holidays = getColombianHolidays(y);
  return holidays.some(h =>
    h.getFullYear() === date.getFullYear() &&
    h.getMonth() === date.getMonth() &&
    h.getDate() === date.getDate()
  );
}

/**
 * Nombres de los festivos colombianos para un año dado.
 */
export function getColombianHolidaysWithNames(year: number): { date: Date; name: string }[] {
  const cached = holidayWithNamesCache.get(year);
  if (cached) return cached;

  const easter = getEasterDate(year);

  const result = [
    { date: new Date(year, 0, 1), name: 'Año Nuevo' },
    { date: moveToNextMonday(new Date(year, 0, 6)), name: 'Reyes Magos' },
    { date: moveToNextMonday(new Date(year, 2, 19)), name: 'San José' },
    { date: addDays(easter, -3), name: 'Jueves Santo' },
    { date: addDays(easter, -2), name: 'Viernes Santo' },
    { date: new Date(year, 4, 1), name: 'Día del Trabajo' },
    { date: moveToNextMonday(addDays(easter, 39)), name: 'Ascensión del Señor' },
    { date: moveToNextMonday(addDays(easter, 60)), name: 'Corpus Christi' },
    { date: moveToNextMonday(addDays(easter, 68)), name: 'Sagrado Corazón' },
    { date: moveToNextMonday(new Date(year, 5, 29)), name: 'San Pedro y San Pablo' },
    { date: new Date(year, 6, 20), name: 'Independencia de Colombia' },
    { date: new Date(year, 7, 7), name: 'Batalla de Boyacá' },
    { date: moveToNextMonday(new Date(year, 7, 15)), name: 'Asunción de la Virgen' },
    { date: moveToNextMonday(new Date(year, 9, 12)), name: 'Día de la Raza' },
    { date: moveToNextMonday(new Date(year, 10, 1)), name: 'Todos los Santos' },
    { date: moveToNextMonday(new Date(year, 10, 11)), name: 'Independencia de Cartagena' },
    { date: new Date(year, 11, 8), name: 'Inmaculada Concepción' },
    { date: new Date(year, 11, 25), name: 'Navidad' },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  holidayWithNamesCache.set(year, result);
  return result;
}
