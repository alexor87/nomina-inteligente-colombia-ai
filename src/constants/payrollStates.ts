
// Shared constants for payroll states across all services
export const PAYROLL_STATES = {
  BORRADOR: 'borrador',
  CERRADO: 'cerrado',
  PROCESADA: 'procesada',
  PAGADA: 'pagada',
  CON_ERRORES: 'con_errores',
  EDITADO: 'editado',
  REABIERTO: 'reabierto'
} as const;

export const HISTORY_DISPLAY_STATES = {
  REVISION: 'revision',
  CERRADO: 'cerrado',
  CON_ERRORES: 'con_errores',
  EDITADO: 'editado',
  REABIERTO: 'reabierto'
} as const;

// Mapping from database states to display states
export const STATE_MAPPING: Record<string, string> = {
  [PAYROLL_STATES.BORRADOR]: HISTORY_DISPLAY_STATES.REVISION,
  [PAYROLL_STATES.CERRADO]: HISTORY_DISPLAY_STATES.CERRADO,
  [PAYROLL_STATES.PROCESADA]: HISTORY_DISPLAY_STATES.CERRADO,
  [PAYROLL_STATES.PAGADA]: HISTORY_DISPLAY_STATES.CERRADO,
  [PAYROLL_STATES.CON_ERRORES]: HISTORY_DISPLAY_STATES.CON_ERRORES,
  [PAYROLL_STATES.EDITADO]: HISTORY_DISPLAY_STATES.EDITADO,
  [PAYROLL_STATES.REABIERTO]: HISTORY_DISPLAY_STATES.REABIERTO
};
