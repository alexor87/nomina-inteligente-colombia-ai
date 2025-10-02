// ============================================================================
// Structured Response Builder - JSON Format for Colombian Payroll
// ============================================================================

export interface StructuredResponse {
  accion: string;
  periodo: string;
  empleados: string[];
  conceptos: string[];
  parametros_extra: Record<string, any>;
  observaciones: string[];
  incompleto: boolean;
}

export function buildStructuredResponse(intent: any, response: any, originalMessage: string): StructuredResponse {
  console.log('🏗️ [STRUCTURED] Building structured response for:', intent.type);
  
  // Default structure
  let structured: StructuredResponse = {
    accion: mapIntentToAction(intent.type),
    periodo: extractPeriod(originalMessage, intent.params),
    empleados: extractEmployees(originalMessage, intent.params),
    conceptos: extractConcepts(originalMessage, intent.type),
    parametros_extra: extractExtraParameters(intent.params, originalMessage),
    observaciones: generateObservations(intent, response, originalMessage),
    incompleto: checkIfIncomplete(intent, originalMessage)
  };
  
  console.log('✅ [STRUCTURED] Generated structure:', JSON.stringify(structured, null, 2));
  return structured;
}

function mapIntentToAction(intentType: string): string {
  const actionMap: Record<string, string> = {
    'LIQUIDAR_NOMINA': 'liquidar_nomina',
    'REGISTRAR_NOVEDAD': 'registrar_novedad', 
    'CALCULAR_PRESTACION': 'calcular_prestacion',
    'GENERAR_REPORTE': 'generar_reporte',
    'EMPLOYEE_SALARY': 'consultar_nomina',
    'EMPLOYEE_PAID_TOTAL': 'consultar_nomina',
    'EMPLOYEE_COUNT': 'consultar_empleado',
    'EMPLOYEE_LIST': 'consultar_empleado',
    'EMPLOYEE_SEARCH': 'consultar_empleado',
    'EMPLOYEE_DETAILS': 'consultar_empleado',
    'PAYROLL_TOTALS': 'consultar_nomina',
    'PAYROLL_BY_MONTH': 'consultar_nomina',
    'PAYROLL_BY_FORTNIGHT': 'consultar_nomina',
    'CONVERSATION': 'otros',
    'SYSTEM_INFO_BLOCKED': 'otros'
  };
  
  return actionMap[intentType] || 'otros';
}

function extractPeriod(message: string, params: any): string {
  // Check for explicit periods in params
  if (params?.periodo && params.periodo !== 'actual') {
    return params.periodo;
  }
  
  // Extract from message
  const monthMatch = message.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
  const yearMatch = message.match(/(\d{4})/);
  const fortnightMatch = message.match(/(primera|segunda|1ra|2da|del\s+1\s+al\s+15|del\s+16\s+al\s+30)/i);
  
  if (monthMatch) {
    const month = monthMatch[1].toLowerCase();
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear();
    
    if (fortnightMatch) {
      const fortnight = fortnightMatch[1].toLowerCase().includes('segunda') || 
                       fortnightMatch[1].includes('16') ? 'segunda' : 'primera';
      return `${month} ${year} - ${fortnight} quincena`;
    }
    
    return `mensual ${month} ${year}`;
  }
  
  if (yearMatch) {
    return `año ${yearMatch[1]}`;
  }
  
  if (/este\s+mes|mes\s+actual/i.test(message)) {
    const now = new Date();
    const months = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `mensual ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
  
  return 'actual';
}

function extractEmployees(message: string, params: any): string[] {
  // Check params first
  if (params?.name) {
    return [params.name];
  }
  
  if (params?.empleado && params.empleado !== 'todos') {
    return [params.empleado];
  }
  
  // Extract from message
  const employeePatterns = [
    /(?:de|para|a)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\?|$))/i,
    /(?:cuánto|cuanto|qué|que)\s+(?:gana|cobra|se\s+gana)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
    /(?:pagos?|pagado)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i
  ];
  
  for (const pattern of employeePatterns) {
    const match = message.match(pattern);
    if (match) {
      const name = match[1].trim().replace(/[?.,!]+$/, '');
      if (name.length > 1 && !/todos|todas|empresa|general|total/i.test(name)) {
        return [name];
      }
    }
  }
  
  // Check for "todos" indicators
  if (/todos|todas|empresa|general|completa|masiv/i.test(message)) {
    return ['todos'];
  }
  
  return ['todos'];
}

function extractConcepts(message: string, intentType: string): string[] {
  const concepts: string[] = [];
  
  // Map from synonyms to standard concepts
  const conceptMappings = {
    // Seguridad Social
    'salud': ['eps', 'seguridad social', 'aportes salud', 'cotizacion salud'],
    'pension': ['pensiones', 'colpensiones', 'proteccion', 'fondo de pensiones'],
    'arl': ['riesgos laborales', 'aseguradora', 'colmena', 'positiva'],
    
    // Parafiscales  
    'caja_compensacion': ['caja', 'compensación', 'compensar', 'colsubsidio'],
    'sena': ['sena', 'formación profesional'],
    'icbf': ['icbf', 'bienestar familiar'],
    
    // Prestaciones
    'cesantias': ['cesantía', 'cesantias'],
    'prima': ['prima', 'bonificación legal'],
    'vacaciones': ['vacación', 'descanso'],
    'auxilio_transporte': ['auxilio transporte', 'subsidio transporte'],
    
    // Salary concepts
    'salario_base': ['salario', 'sueldo', 'básico'],
    'horas_extra': ['horas extra', 'hora adicional'],
    'retencion_fuente': ['retención', 'impuesto']
  };
  
  const lowerMessage = message.toLowerCase();
  
  // Check each concept mapping
  for (const [standardConcept, synonyms] of Object.entries(conceptMappings)) {
    for (const synonym of synonyms) {
      if (lowerMessage.includes(synonym.toLowerCase())) {
        if (!concepts.includes(standardConcept)) {
          concepts.push(standardConcept);
        }
        break;
      }
    }
  }
  
  // Intent-based defaults
  if (concepts.length === 0) {
    switch (intentType) {
      case 'EMPLOYEE_SALARY':
        concepts.push('salario_base');
        break;
      case 'EMPLOYEE_PAID_TOTAL':
        concepts.push('salario_base', 'auxilio_transporte');
        break;
      case 'LIQUIDAR_NOMINA':
        concepts.push('salario_base', 'salud', 'pension', 'arl', 'auxilio_transporte');
        break;
      case 'GENERAR_REPORTE':
        if (lowerMessage.includes('pila') || lowerMessage.includes('planilla')) {
          concepts.push('salud', 'pension', 'arl');
        }
        break;
    }
  }
  
  return concepts;
}

function extractExtraParameters(params: any, message: string): Record<string, any> {
  const extra: Record<string, any> = {};
  
  // Copy relevant params
  if (params) {
    if (params.year) extra.año = params.year;
    if (params.month) extra.mes = params.month;
    if (params.dias) extra.dias = params.dias;
    if (params.horas) extra.horas = params.horas;
    if (params.quincena) extra.quincena = params.quincena;
    if (params.tipo_prestacion) extra.tipo_prestacion = params.tipo_prestacion;
    if (params.tipo_reporte) extra.tipo_reporte = params.tipo_reporte;
    if (params.tipo_novedad) extra.tipo_novedad = params.tipo_novedad;
  }
  
  // Extract additional parameters from message
  const daysMatch = message.match(/(\d+)\s+(?:días?|dia)/i);
  if (daysMatch && !extra.dias) {
    extra.dias = parseInt(daysMatch[1]);
  }
  
  const hoursMatch = message.match(/(\d+)\s+horas?/i);
  if (hoursMatch && !extra.horas) {
    extra.horas = parseInt(hoursMatch[1]);
  }
  
  const percentageMatch = message.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentageMatch) {
    extra.porcentaje = parseFloat(percentageMatch[1]);
  }
  
  return extra;
}

function generateObservations(intent: any, response: any, message: string): string[] {
  const observations = [];
  
  // Validation observations
  if (intent.type === 'REGISTRAR_NOVEDAD' && !intent.params?.empleado) {
    observations.push('Se requiere especificar el nombre del empleado');
  }
  
  if (intent.type === 'CALCULAR_PRESTACION') {
    observations.push('Cálculo basado en normativa laboral colombiana vigente');
  }
  
  // Auxilio de transporte validation
  if (message.toLowerCase().includes('auxilio transporte')) {
    observations.push('Validar que el salario sea ≤ 2 SMMLV y que no viva en el lugar de trabajo');
  }
  
  // Security social topes
  if (['salud', 'pension'].some(c => message.toLowerCase().includes(c))) {
    observations.push('Aplicar topes de seguridad social: mínima 1 SMMLV, máxima 25 SMMLV');
  }
  
  // Employee name validation
  if (intent.params?.name && intent.params.name.length < 3) {
    observations.push('Nombre de empleado muy corto, verificar ortografía');
  }
  
  return observations;
}

function checkIfIncomplete(intent: any, message: string): boolean {
  // Check for missing required information
  switch (intent.type) {
    case 'REGISTRAR_NOVEDAD':
      return !intent.params?.empleado || 
             (!intent.params?.dias && !intent.params?.horas);
             
    case 'CALCULAR_PRESTACION':
      return !intent.params?.tipo_prestacion;
      
    case 'EMPLOYEE_SALARY':
    case 'EMPLOYEE_PAID_TOTAL':
      return !intent.params?.name;
      
    default:
      return false;
  }
}