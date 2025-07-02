
// Estados unificados para toda la aplicación de nómina
export const UNIFIED_PAYROLL_STATES = {
  // Estados principales
  BORRADOR: 'borrador',
  CERRADO: 'cerrado', 
  PROCESADA: 'procesada',
  PAGADA: 'pagada',
  
  // Estados adicionales
  EDITADO: 'editado',
  REABIERTO: 'reabierto',
  CON_ERRORES: 'con_errores',
  CANCELADO: 'cancelado'
} as const;

export type UnifiedPayrollState = typeof UNIFIED_PAYROLL_STATES[keyof typeof UNIFIED_PAYROLL_STATES];

// Estados para mostrar en la UI del historial
export const HISTORY_DISPLAY_STATES = {
  REVISION: 'revision',      // Para borrador, editado, reabierto
  CERRADO: 'cerrado',        // Para cerrado, procesada, pagada
  CON_ERRORES: 'con_errores', // Para con_errores
  CANCELADO: 'cancelado'     // Para cancelado
} as const;

export type HistoryDisplayState = typeof HISTORY_DISPLAY_STATES[keyof typeof HISTORY_DISPLAY_STATES];

// Mapeo unificado de estados DB → Estados UI
export const UNIFIED_STATE_MAPPING: Record<string, HistoryDisplayState> = {
  [UNIFIED_PAYROLL_STATES.BORRADOR]: HISTORY_DISPLAY_STATES.REVISION,
  [UNIFIED_PAYROLL_STATES.EDITADO]: HISTORY_DISPLAY_STATES.REVISION,
  [UNIFIED_PAYROLL_STATES.REABIERTO]: HISTORY_DISPLAY_STATES.REVISION,
  [UNIFIED_PAYROLL_STATES.CERRADO]: HISTORY_DISPLAY_STATES.CERRADO,
  [UNIFIED_PAYROLL_STATES.PROCESADA]: HISTORY_DISPLAY_STATES.CERRADO,
  [UNIFIED_PAYROLL_STATES.PAGADA]: HISTORY_DISPLAY_STATES.CERRADO,
  [UNIFIED_PAYROLL_STATES.CON_ERRORES]: HISTORY_DISPLAY_STATES.CON_ERRORES,
  [UNIFIED_PAYROLL_STATES.CANCELADO]: HISTORY_DISPLAY_STATES.CANCELADO
};

// Estados que permiten edición
export const EDITABLE_STATES = [
  UNIFIED_PAYROLL_STATES.BORRADOR,
  UNIFIED_PAYROLL_STATES.EDITADO,
  UNIFIED_PAYROLL_STATES.REABIERTO
];

// Estados que permiten reapertura
export const REOPENABLE_STATES = [
  UNIFIED_PAYROLL_STATES.CERRADO,
  UNIFIED_PAYROLL_STATES.PROCESADA
];

// Estados considerados como "cerrados/finalizados"
export const CLOSED_STATES = [
  UNIFIED_PAYROLL_STATES.CERRADO,
  UNIFIED_PAYROLL_STATES.PROCESADA,
  UNIFIED_PAYROLL_STATES.PAGADA
];

// Estados considerados como "activos/trabajables"
export const ACTIVE_STATES = [
  UNIFIED_PAYROLL_STATES.BORRADOR,
  UNIFIED_PAYROLL_STATES.EDITADO,
  UNIFIED_PAYROLL_STATES.REABIERTO
];

// Función utilitaria para verificar si un estado es válido
export const isValidPayrollState = (state: string): state is UnifiedPayrollState => {
  return Object.values(UNIFIED_PAYROLL_STATES).includes(state as UnifiedPayrollState);
};

// Función utilitaria para obtener el estado de UI
export const getDisplayState = (dbState: string): HistoryDisplayState => {
  return UNIFIED_STATE_MAPPING[dbState] || HISTORY_DISPLAY_STATES.CON_ERRORES;
};

// Función utilitaria para verificar si es editable
export const isEditable = (state: string): boolean => {
  return EDITABLE_STATES.includes(state as UnifiedPayrollState);
};

// Función utilitaria para verificar si puede reabrirse
export const canReopen = (state: string): boolean => {
  return REOPENABLE_STATES.includes(state as UnifiedPayrollState);
};

// Función utilitaria para verificar si está cerrado
export const isClosed = (state: string): boolean => {
  return CLOSED_STATES.includes(state as UnifiedPayrollState);
};

// Función utilitaria para verificar si está activo
export const isActive = (state: string): boolean => {
  return ACTIVE_STATES.includes(state as UnifiedPayrollState);
};
