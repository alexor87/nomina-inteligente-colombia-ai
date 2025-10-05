/**
 * ✅ TEMPORAL TYPES - Unified temporal parameter system
 * 
 * Centralizes all temporal query types and parameters
 * Used across the entire Maya Intelligence system
 */

export enum TemporalType {
  SPECIFIC_PERIOD = 'specific_period',
  SPECIFIC_MONTH = 'specific_month',
  FULL_YEAR = 'full_year',
  LAST_N_MONTHS = 'last_n_months',
  QUARTER = 'quarter',
  SEMESTER = 'semester',
  MONTH_RANGE = 'month_range',
  CUSTOM_DATE_RANGE = 'custom_date_range'
}

/**
 * Unified temporal parameters interface
 * ALL aggregation services accept this format
 */
export interface TemporalParams {
  type: TemporalType;
  year?: number;
  month?: string;
  quarter?: number;
  semester?: number;
  monthCount?: number;
  startDate?: string;
  endDate?: string;
  periodIds?: string[];
}

/**
 * Result of period resolution from database
 */
export interface ResolvedPeriods {
  periods: Array<{
    id: string;
    periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
  }>;
  displayName: string;
  temporalType: TemporalType;
}

/**
 * Month name mapping (Spanish)
 */
export const MONTH_NAMES: Record<string, number> = {
  'enero': 1,
  'febrero': 2,
  'marzo': 3,
  'abril': 4,
  'mayo': 5,
  'junio': 6,
  'julio': 7,
  'agosto': 8,
  'septiembre': 9,
  'octubre': 10,
  'noviembre': 11,
  'diciembre': 12
};

/**
 * Reverse mapping for display
 */
export const MONTH_NAMES_REVERSE: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre'
};
