import { isColombianHoliday, getColombianHolidaysWithNames } from './colombianHolidays';

/**
 * Mapeo de nombres de días a getDay() (0=domingo, 1=lunes, ..., 6=sábado)
 */
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

/**
 * Verifica si una fecha es día de descanso del empleado.
 */
function isRestDay(date: Date, restDayNumbers: Set<number>): boolean {
  return restDayNumbers.has(date.getDay());
}

/**
 * Convierte array de nombres de días a Set de números.
 */
function restDaysToNumbers(restDays: string[]): Set<number> {
  const numbers = new Set<number>();
  for (const day of restDays) {
    const num = DAY_NAME_TO_NUMBER[day.toLowerCase()];
    if (num !== undefined) numbers.add(num);
  }
  return numbers;
}

/**
 * Verifica si una fecha es día NO laborable (descanso o festivo).
 */
function isNonWorkingDay(date: Date, restDayNumbers: Set<number>): boolean {
  return isRestDay(date, restDayNumbers) || isColombianHoliday(date);
}

/**
 * Dado fecha inicio + N días hábiles → calcula fecha fin.
 *
 * El primer día (startDate) cuenta como día hábil si no es descanso/festivo.
 * Avanza día a día hasta completar N días hábiles.
 *
 * @param startDate - Fecha de inicio (ISO string YYYY-MM-DD)
 * @param businessDays - Número de días hábiles solicitados
 * @param restDays - Días de descanso del empleado (ej: ['sabado', 'domingo'])
 * @returns Fecha fin (ISO string YYYY-MM-DD)
 */
export function calculateEndDate(
  startDate: string,
  businessDays: number,
  restDays: string[] = ['sabado', 'domingo']
): string {
  if (businessDays <= 0) return startDate;

  const restDayNumbers = restDaysToNumbers(restDays);
  const current = new Date(startDate + 'T12:00:00'); // Mediodía para evitar timezone issues
  let count = 0;

  while (count < businessDays) {
    if (!isNonWorkingDay(current, restDayNumbers)) {
      count++;
    }
    if (count < businessDays) {
      current.setDate(current.getDate() + 1);
    }
  }

  return current.toISOString().split('T')[0];
}

/**
 * Dado fecha inicio + fecha fin → calcula N días hábiles.
 *
 * Cuenta los días entre startDate y endDate (inclusive) que NO son descanso ni festivo.
 *
 * @param startDate - Fecha de inicio (ISO string YYYY-MM-DD)
 * @param endDate - Fecha de fin (ISO string YYYY-MM-DD)
 * @param restDays - Días de descanso del empleado (ej: ['sabado', 'domingo'])
 * @returns Número de días hábiles
 */
export function calculateBusinessDays(
  startDate: string,
  endDate: string,
  restDays: string[] = ['sabado', 'domingo']
): number {
  const restDayNumbers = restDaysToNumbers(restDays);
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  let count = 0;

  while (current <= end) {
    if (!isNonWorkingDay(current, restDayNumbers)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Desglose detallado del período de vacaciones.
 */
export interface VacationBreakdown {
  calendarDays: number;      // Total días calendario
  businessDays: number;      // Días hábiles
  restDaysCount: number;     // Días de descanso excluidos
  holidaysCount: number;     // Festivos excluidos
  holidayNames: string[];    // Nombres de festivos que caen en el rango
  endDate: string;           // Fecha fin calculada
}

/**
 * Calcula el desglose completo de un período de vacaciones.
 */
export function getVacationBreakdown(
  startDate: string,
  businessDays: number,
  restDays: string[] = ['sabado', 'domingo']
): VacationBreakdown {
  if (businessDays <= 0) {
    return {
      calendarDays: 0,
      businessDays: 0,
      restDaysCount: 0,
      holidaysCount: 0,
      holidayNames: [],
      endDate: startDate,
    };
  }

  const endDate = calculateEndDate(startDate, businessDays, restDays);
  const restDayNumbers = restDaysToNumbers(restDays);
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  let calendarDays = 0;
  let restDaysCount = 0;
  let holidaysCount = 0;
  const holidayNames: string[] = [];

  // Obtener festivos con nombres para los años involucrados
  const startYear = current.getFullYear();
  const endYear = end.getFullYear();

  const allHolidaysWithNames: { date: Date; name: string }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    allHolidaysWithNames.push(...getColombianHolidaysWithNames(y));
  }

  while (current <= end) {
    calendarDays++;

    const isRest = isRestDay(current, restDayNumbers);
    const holidayMatch = allHolidaysWithNames.find(
      h => h.date.getFullYear() === current.getFullYear() &&
           h.date.getMonth() === current.getMonth() &&
           h.date.getDate() === current.getDate()
    );

    if (isRest) {
      restDaysCount++;
    } else if (holidayMatch) {
      holidaysCount++;
      holidayNames.push(holidayMatch.name);
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    calendarDays,
    businessDays,
    restDaysCount,
    holidaysCount,
    holidayNames,
    endDate,
  };
}
