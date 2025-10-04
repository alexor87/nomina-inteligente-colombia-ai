// ============================================================================
// MAYA Context Patterns Configuration
// ============================================================================
// Centralized configuration for response patterns and context mappings
// Allows easy extension of conversational contexts without modifying core code

export interface ResponsePattern {
  patterns: RegExp[];
  contextType: string;
  structure: 'DetailedCard' | 'Metric' | 'List' | 'Table' | 'Confirmation';
  description?: string;
}

export interface ContextMapping {
  intentType: string;
  confidence: number;
  description?: string;
}

// ============================================================================
// RESPONSE PATTERNS - Detect types of Maya responses
// ============================================================================

export const RESPONSE_PATTERNS: Record<string, ResponsePattern> = {
  EMPLOYEE_DETAILED_CARD: {
    patterns: [
      /👤\s*\*\*[A-ZÁÉÍÓÚÑ\s]+\*\*/i,
      /💼\s*Cargo:/i,
      /🛡️\s*Seguridad\s+Social:/i,
    ],
    contextType: 'EMPLOYEE_INFO',
    structure: 'DetailedCard',
    description: 'Detailed employee information card'
  },

  SALARY_RESPONSE: {
    patterns: [
      /💰\s*Salario\s+Base:/i,
      /\$\s*[\d,]+.*mes/i,
    ],
    contextType: 'SALARY_INFO',
    structure: 'Metric',
    description: 'Employee salary information'
  },

  PAYROLL_TOTAL_RESPONSE: {
    patterns: [
      /Total\s+pagado/i,
      /💵.*\$\s*[\d,]+/i,
      /Registros\s+de\s+nómina:/i,
    ],
    contextType: 'PAYROLL_INFO',
    structure: 'Metric',
    description: 'Total payroll paid to employee'
  },

  EMPLOYEE_LIST_RESPONSE: {
    patterns: [
      /Empleados\s+encontrados:/i,
      /encontré\s+\d+\s+empleado/i,
      /📋\s*Lista\s+de\s+empleados/i,
    ],
    contextType: 'LIST_RESPONSE',
    structure: 'List',
    description: 'List of employees'
  },

  VOUCHER_SENT_CONFIRMATION: {
    patterns: [
      /✅\s*Comprobante.*enviado/i,
      /📧\s*Email.*enviado/i,
    ],
    contextType: 'CONFIRMATION',
    structure: 'Confirmation',
    description: 'Voucher sent confirmation'
  },

  VOUCHER_CONFIRMATION_BUTTONS: {
    patterns: [
      /Enviar\s+a\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
      /📧.*Enviar/i,
      /👁️.*Vista\s+Previa/i,
    ],
    contextType: 'VOUCHER_CONFIRMATION_PENDING',
    structure: 'Confirmation',
    description: 'Voucher confirmation buttons shown'
  },

  BENEFIT_INFO_RESPONSE: {
    patterns: [
      /Prestaciones\s+sociales/i,
      /Prima\s+de\s+servicios/i,
      /Cesantías/i,
    ],
    contextType: 'BENEFIT_INFO',
    structure: 'DetailedCard',
    description: 'Social benefits information'
  },

  REPORT_RESPONSE: {
    patterns: [
      /Reporte\s+de/i,
      /Análisis\s+de/i,
      /📊\s*Estadísticas/i,
    ],
    contextType: 'REPORT_INFO',
    structure: 'Table',
    description: 'Report or analysis'
  },

  TOTAL_PAYROLL_COST_RESPONSE: {
    patterns: [
      /Costo\s+Total\s+de\s+Nómina/i,
      /💰\s*Devengado\s+Total:/i,
      /🎯\s*COSTO\s+TOTAL/i,
    ],
    contextType: 'AGGREGATION_PAYROLL_COST',
    structure: 'Metric',
    description: 'Response with total payroll cost'
  },

  SECURITY_CONTRIBUTIONS_RESPONSE: {
    patterns: [
      /Aportes\s+a\s+Seguridad\s+Social/i,
      /🏥\s*EPS:/i,
      /💼\s*Pensión:/i,
    ],
    contextType: 'AGGREGATION_SECURITY_CONTRIBUTIONS',
    structure: 'Metric',
    description: 'Response with security contributions'
  },

  HIGHEST_COST_EMPLOYEES_RESPONSE: {
    patterns: [
      /Empleados\s+con\s+Mayor\s+Costo/i,
      /Top\s+\d+\s+empleados/i,
    ],
    contextType: 'AGGREGATION_HIGHEST_COST',
    structure: 'List',
    description: 'Response with highest cost employees'
  },

  INCAPACITY_DAYS_RESPONSE: {
    patterns: [
      /Días\s+de\s+Incapacidad/i,
      /Total\s+días\s+incapacidad/i,
      /incapacidad(?:es)?\s+(?:registrada|detectada)/i,
      /Total\s+de\s+Incapacidad(?:es)?/i,
      /🏥.*incapacidad(?:es)?/i,
      /\d+\s+(?:días?|día)\s+(?:de\s+)?incapacidad/i,
    ],
    contextType: 'AGGREGATION_INCAPACITY_DAYS',
    structure: 'Metric',
    description: 'Response with incapacity days (positive or negative)'
  },

  OVERTIME_HOURS_RESPONSE: {
    patterns: [
      /Horas\s+Extra/i,
      /Total\s+horas\s+extra/i,
    ],
    contextType: 'AGGREGATION_OVERTIME_HOURS',
    structure: 'Metric',
    description: 'Response with overtime hours'
  }
};

// ============================================================================
// CONTEXT TO INTENT MAPPING - Map context types to intent types
// ============================================================================

export const CONTEXT_TO_INTENT_MAP: Record<string, ContextMapping> = {
  'EMPLOYEE_INFO': {
    intentType: 'EMPLOYEE_SEARCH',
    confidence: 0.95,
    description: 'User wants detailed info about another employee'
  },

  'SALARY_INFO': {
    intentType: 'EMPLOYEE_SALARY',
    confidence: 0.95,
    description: 'User wants salary info about another employee'
  },

  'PAYROLL_INFO': {
    intentType: 'EMPLOYEE_PAID_TOTAL',
    confidence: 0.95,
    description: 'User wants payroll totals for another employee'
  },

  'LIST_RESPONSE': {
    intentType: 'EMPLOYEE_SEARCH',
    confidence: 0.90,
    description: 'Repeat search for another employee'
  },

  'CONFIRMATION': {
    intentType: 'VOUCHER_SEND',
    confidence: 0.90,
    description: 'Repeat action for another employee'
  },

  'BENEFIT_INFO': {
    intentType: 'BENEFIT_QUERY',
    confidence: 0.92,
    description: 'Query benefits for another employee'
  },

  'REPORT_INFO': {
    intentType: 'REPORT_GENERATE',
    confidence: 0.88,
    description: 'Generate similar report'
  },

  'VOUCHER_CONFIRMATION_PENDING': {
    intentType: 'VOUCHER_EMAIL_OVERRIDE',
    confidence: 0.95,
    description: 'User wants to send voucher to alternative email'
  },

  'AGGREGATION_PAYROLL_COST': {
    intentType: 'TOTAL_PAYROLL_COST',
    confidence: 0.95,
    description: 'Repeat payroll cost query with different time period'
  },

  'AGGREGATION_SECURITY_CONTRIBUTIONS': {
    intentType: 'SECURITY_CONTRIBUTIONS',
    confidence: 0.95,
    description: 'Repeat security contributions query with different time period'
  },

  'AGGREGATION_HIGHEST_COST': {
    intentType: 'HIGHEST_COST_EMPLOYEES',
    confidence: 0.95,
    description: 'Repeat highest cost employees query with different time period'
  },

  'AGGREGATION_INCAPACITY_DAYS': {
    intentType: 'TOTAL_INCAPACITY_DAYS',
    confidence: 0.95,
    description: 'Repeat incapacity days query with different time period'
  },

  'AGGREGATION_OVERTIME_HOURS': {
    intentType: 'TOTAL_OVERTIME_HOURS',
    confidence: 0.95,
    description: 'Repeat overtime hours query with different time period'
  }
};

// ============================================================================
// FOLLOW-UP PATTERNS - Detect follow-up questions
// ============================================================================

export const FOLLOW_UP_PATTERNS = {
  NAME_FOLLOW_UP: [
    /^y\s+(?:de\s+)?([a-záéíóúñ\s]+)$/i,
    /^(?:y\s+)?(?:a\s+)?([a-záéíóúñ\s]+)$/i,
    /^(?:ahora\s+)?(?:de\s+)?([a-záéíóúñ\s]+)$/i,
  ],
  
  PRONOUN_FOLLOW_UP: [
    /^y\s+(?:él|ella|este|esta)$/i,
  ]
};

// ============================================================================
// TEMPORAL FOLLOW-UP PATTERNS - Detect temporal modifications
// ============================================================================

export const TEMPORAL_FOLLOW_UP_PATTERNS = {
  // Full year queries: "y de todo el año?"
  FULL_YEAR: [
    /^(?:y\s+)?(?:de|del|en)\s+todo\s+el\s+año\??$/i,
    /^(?:y\s+)?(?:de|del|en)\s+el\s+año\s+completo\??$/i,
    /^(?:y\s+)?(?:de|del|en)\s+el\s+año\s+entero\??$/i,
    /^(?:y\s+)?anual(?:mente)?\??$/i,
  ],
  
  // Last year queries: "y del año pasado?", "y del año anterior?"
  LAST_YEAR: [
    /^(?:y\s+)?(?:de|del|en)\s+(?:el\s+)?año\s+(?:pasado|anterior)\??$/i,
    /^(?:y\s+)?(?:el\s+)?año\s+(?:pasado|anterior)\??$/i,
  ],
  
  // Specific year queries: "y de 2024?", "y en 2023?"
  SPECIFIC_YEAR: [
    /^(?:y\s+)?(?:de|del|en)\s+(?:el\s+)?año\s+(20[0-9]{2})\??$/i,
    /^(?:y\s+)?(20[0-9]{2})\??$/i,
  ],
  
  // Specific month queries: "y de enero?", "y en marzo?"
  SPECIFIC_MONTH: [
    /^(?:y\s+)?(?:de|del|en)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\??$/i,
    /^(?:y\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\??$/i,
  ],
  
  // Last month queries: "y del mes pasado?"
  LAST_MONTH: [
    /^(?:y\s+)?(?:del|de)\s+mes\s+(?:pasado|anterior)\??$/i,
    /^(?:y\s+)?(?:el\s+)?mes\s+(?:pasado|anterior)\??$/i,
  ],
  
  // This year queries: "y de este año?"
  THIS_YEAR: [
    /^(?:y\s+)?(?:de|del|en)\s+este\s+año\??$/i,
    /^(?:y\s+)?(?:de|del|en)\s+el\s+año\s+actual\??$/i,
    /^(?:y\s+)?este\s+año\??$/i,
    /^(?:y\s+)?el\s+año\s+actual\??$/i,
    /^(?:y\s+)?(?:el\s+)?año\s+(?:en\s+curso|corriente)\??$/i,
  ],
  
  // Last N months queries: "y de los últimos 3 meses?", "y los 2 últimos meses?"
  LAST_N_MONTHS: [
    /^(?:y\s+)?(?:de\s+)?(?:los\s+)?(?:últimos|ultimos)\s+(\d+)\s+meses\??$/i,
    /^(?:y\s+)?(?:los\s+)?(\d+)\s+(?:últimos|ultimos)\s+meses\??$/i,
    /^(?:y\s+)?(\d+)\s+meses\s+(?:anteriores|pasados|atrás|atras)\??$/i,
  ],
  
  // Quarter queries: "y del trimestre 1?", "y el primer trimestre?", "y del trimestre pasado?"
  QUARTER: [
    /^(?:y\s+)?(?:del|de|en)\s+(?:el\s+)?trimestre\s+(\d+)\??$/i,
    /^(?:y\s+)?(?:el\s+)?trimestre\s+(?:pasado|anterior)\??$/i,
    /^(?:y\s+)?(?:el\s+)?(primer|segundo|tercer|cuarto)\s+trimestre\??$/i,
    /^(?:y\s+)?q(\d+)\??$/i, // Q1, Q2, etc.
  ],
  
  // Semester queries: "y del semestre 1?", "y el primer semestre?", "y del semestre pasado?"
  SEMESTER: [
    /^(?:y\s+)?(?:del|de|en)\s+(?:el\s+)?semestre\s+(\d+)\??$/i,
    /^(?:y\s+)?(?:el\s+)?semestre\s+(?:pasado|anterior)\??$/i,
    /^(?:y\s+)?(?:el\s+)?(primer|segundo)\s+semestre\??$/i,
  ],
  
  // Month range queries: "y de enero a marzo?", "y desde febrero hasta abril?"
  MONTH_RANGE: [
    /^(?:y\s+)?(?:de|desde)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:a|hasta)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\??$/i,
  ],
};

// ============================================================================
// ENTITY EXTRACTION PATTERNS
// ============================================================================

export const ENTITY_PATTERNS = {
  EMPLOYEE_NAME: /👤\s*\*\*([A-ZÁÉÍÓÚÑ\s]+)\*\*/i,
  SALARY_AMOUNT: /\$\s*([\d,]+(?:\.\d+)?)/,
  PERIOD_NAME: /Período:\s*([^\n]+)/i,
  DATE_RANGE: /(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/,
  EMPLOYEE_NAME_FROM_CONTEXT: /(?:comprobante|voucher|colilla)\s+de\s+\*\*([A-ZÁÉÍÓÚÑ\s]+)\*\*/i,
};
