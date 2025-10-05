/**
 * Centralized Novedad Type Constants
 * ✅ Fixed: Correct enum values from database
 */

export const NOVEDAD_TYPES = {
  // Overtime and surcharges - CORRECTED VALUES
  HORAS_EXTRA: 'horas_extra' as const,
  RECARGO_NOCTURNO: 'recargo_nocturno' as const,
  
  // Absences and leaves
  VACACIONES: 'vacaciones' as const,
  INCAPACIDAD: 'incapacidad' as const,
  LICENCIA_REMUNERADA: 'licencia_remunerada' as const,
  LICENCIA_NO_REMUNERADA: 'licencia_no_remunerada' as const,
  AUSENCIA: 'ausencia' as const,
  
  // Benefits
  BONIFICACION: 'bonificacion' as const,
  COMISION: 'comision' as const,
  AUXILIO: 'auxilio' as const,
  
  // Deductions
  PRESTAMO: 'prestamo' as const,
  EMBARGO: 'embargo' as const,
  OTRO_DESCUENTO: 'otro_descuento' as const,
  
  // Other
  OTRO_DEVENGADO: 'otro_devengado' as const,
} as const;

/**
 * Functional groups for easier querying
 */
export const NOVEDAD_GROUPS = {
  OVERTIME_TYPES: [
    NOVEDAD_TYPES.HORAS_EXTRA,
    NOVEDAD_TYPES.RECARGO_NOCTURNO,
  ],
  
  ABSENCE_TYPES: [
    NOVEDAD_TYPES.VACACIONES,
    NOVEDAD_TYPES.INCAPACIDAD,
    NOVEDAD_TYPES.LICENCIA_REMUNERADA,
    NOVEDAD_TYPES.LICENCIA_NO_REMUNERADA,
    NOVEDAD_TYPES.AUSENCIA,
  ],
  
  EARNING_TYPES: [
    NOVEDAD_TYPES.BONIFICACION,
    NOVEDAD_TYPES.COMISION,
    NOVEDAD_TYPES.AUXILIO,
    NOVEDAD_TYPES.OTRO_DEVENGADO,
  ],
  
  DEDUCTION_TYPES: [
    NOVEDAD_TYPES.PRESTAMO,
    NOVEDAD_TYPES.EMBARGO,
    NOVEDAD_TYPES.OTRO_DESCUENTO,
  ],
} as const;

/**
 * Incapacity subtypes
 */
export const INCAPACITY_SUBTYPES = {
  GENERAL: 'general' as const,
  LABORAL: 'laboral' as const,
  MATERNIDAD: 'maternidad' as const,
} as const;

/**
 * Display names for novedad types
 */
export const NOVEDAD_DISPLAY_NAMES: Record<string, string> = {
  [NOVEDAD_TYPES.HORAS_EXTRA]: 'Horas Extra',
  [NOVEDAD_TYPES.RECARGO_NOCTURNO]: 'Recargo Nocturno',
  [NOVEDAD_TYPES.VACACIONES]: 'Vacaciones',
  [NOVEDAD_TYPES.INCAPACIDAD]: 'Incapacidad',
  [NOVEDAD_TYPES.LICENCIA_REMUNERADA]: 'Licencia Remunerada',
  [NOVEDAD_TYPES.LICENCIA_NO_REMUNERADA]: 'Licencia No Remunerada',
  [NOVEDAD_TYPES.AUSENCIA]: 'Ausencia',
  [NOVEDAD_TYPES.BONIFICACION]: 'Bonificación',
  [NOVEDAD_TYPES.COMISION]: 'Comisión',
  [NOVEDAD_TYPES.AUXILIO]: 'Auxilio',
  [NOVEDAD_TYPES.PRESTAMO]: 'Préstamo',
  [NOVEDAD_TYPES.EMBARGO]: 'Embargo',
  [NOVEDAD_TYPES.OTRO_DESCUENTO]: 'Otro Descuento',
  [NOVEDAD_TYPES.OTRO_DEVENGADO]: 'Otro Devengado',
};
