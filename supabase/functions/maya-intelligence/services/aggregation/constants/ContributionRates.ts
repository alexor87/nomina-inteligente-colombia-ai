/**
 * Colombian Legal Contribution Rates (2025)
 * Based on Colombian labor law
 */

export const CONTRIBUTION_RATES = {
  // Health (Salud)
  HEALTH_EMPLOYEE: 0.04, // 4%
  HEALTH_EMPLOYER: 0.085, // 8.5%
  HEALTH_TOTAL: 0.125, // 12.5%
  
  // Pension (Pensión)
  PENSION_EMPLOYEE: 0.04, // 4%
  PENSION_EMPLOYER: 0.12, // 12%
  PENSION_TOTAL: 0.16, // 16%
  
  // ARL (Occupational Risk Insurance)
  ARL_MIN: 0.00522, // 0.522% (Risk Level I)
  ARL_MAX: 0.06960, // 6.96% (Risk Level V)
  
  // Parafiscales
  ICBF: 0.03, // 3%
  SENA: 0.02, // 2%
  CAJA_COMPENSACION: 0.04, // 4%
  
  // Social Benefits
  CESANTIAS: 0.0833, // 8.33%
  INTERESES_CESANTIAS: 0.12, // 12% annual on cesantías
  PRIMA: 0.0833, // 8.33%
  VACACIONES: 0.0417, // 4.17%
} as const;

/**
 * Minimum wage and transport allowance (2025)
 * Should be updated annually
 */
export const LEGAL_VALUES = {
  SALARIO_MINIMO: 1423500,
  AUXILIO_TRANSPORTE: 200000,
  UVT: 49799,
} as const;

/**
 * Calculate total employer contributions percentage
 */
export function getTotalEmployerContribution(): number {
  return (
    CONTRIBUTION_RATES.HEALTH_EMPLOYER +
    CONTRIBUTION_RATES.PENSION_EMPLOYER +
    CONTRIBUTION_RATES.ARL_MIN + // Using minimum ARL
    CONTRIBUTION_RATES.ICBF +
    CONTRIBUTION_RATES.SENA +
    CONTRIBUTION_RATES.CAJA_COMPENSACION +
    CONTRIBUTION_RATES.CESANTIAS +
    CONTRIBUTION_RATES.PRIMA +
    CONTRIBUTION_RATES.VACACIONES
  );
}

/**
 * Calculate total employee deductions percentage
 */
export function getTotalEmployeeDeductions(): number {
  return (
    CONTRIBUTION_RATES.HEALTH_EMPLOYEE +
    CONTRIBUTION_RATES.PENSION_EMPLOYEE
  );
}
