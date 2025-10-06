// ============================================================================
// Simple Intent Matcher - KISS Implementation with Colombian Payroll Synonyms
// ============================================================================
// Replaces complex AI-based intent detection with fast regex patterns

export interface SimpleIntent {
  type: string;
  confidence: number;
  method: string;
  params?: any;
}

// ============================================================================
// COLOMBIAN PAYROLL SYNONYMS DICTIONARY
// ============================================================================
const SYNONYMS = {
  // Seguridad Social
  "salud": ["eps", "seguridad social", "aportes salud", "cotizacion salud", "aporte a la eps"],
  "pension": ["pensiones", "colpensiones", "proteccion", "fondo de pensiones", "ahorro pensional"],
  "arl": ["riesgos laborales", "aseguradora arl", "colmena", "positiva arl", "mapfre arl"],

  // Parafiscales
  "caja_compensacion": ["caja", "compensación", "compensar", "colsubsidio", "cajacopi"],
  "sena": ["sena aportes", "formación profesional", "aporte sena"],
  "icbf": ["icbf aportes", "bienestar familiar", "aporte icbf"],

  // Prestaciones Sociales
  "cesantias": ["cesantía", "ahorro cesantías", "cesantia"],
  "intereses_cesantias": ["intereses de cesantías", "intereses cesantia", "rendimientos cesantías"],
  "prima": ["prima legal", "prima de junio", "prima de diciembre", "prima de servicios", "bonificación legal"],
  "vacaciones": ["descanso remunerado", "vacación", "días de vacaciones", "salida vacaciones"],
  "indemnizacion": ["indemnización", "pago por despido", "indemnizacion laboral"],

  // Novedades
  "incapacidad": ["incapacitado", "incapacidad médica", "sick leave", "incapacidad eps", "incapacidad laboral"],
  "licencia_maternidad": ["licencia de maternidad", "postparto", "preparto", "maternidad"],
  "licencia_paternidad": ["licencia de paternidad", "permiso de paternidad"],
  "licencia_no_remunerada": ["licencia sin sueldo", "licencia no paga", "permiso no remunerado"],
  
  "horas_extra_diurna": ["hora extra diurna", "horas extra día", "hora adicional día"],
  "horas_extra_nocturna": ["hora extra nocturna", "horas extra noche", "hora adicional noche"],
  "horas_extra_dominical_diurna": ["hora extra domingo", "hora extra festivo día", "horas extra dominical diurna"],
  "horas_extra_dominical_nocturna": ["hora extra domingo noche", "hora extra festivo nocturna", "horas extra dominical nocturna"],

  // Otros Conceptos
  "auxilio_transporte": ["auxilio transporte", "subsidio transporte", "subsidio de transporte", "auxilio de bus", "auxilio de movilización"],
  "retencion_fuente": ["retención en la fuente", "retencion fuente", "impuesto renta", "descuento retencion"],
  "dotacion": ["dotación", "uniformes", "ropa de trabajo", "entrega dotación"],
  "bonificacion": ["bono", "bonificación", "bonificación extralegal", "bonificación especial"]
};

// Helper function to normalize terms using synonym dictionary
function normalizePayrollTerm(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [standardTerm, synonyms] of Object.entries(SYNONYMS)) {
    if (synonyms.some(synonym => lowerText.includes(synonym.toLowerCase()))) {
      return standardTerm;
    }
  }
  
  return text;
}

// Helper function to sanitize employee names (remove prepositions)
function sanitizeEmployeeName(name: string, fullText?: string): string {
  let cleaned = name.trim();
  
  // ⭐ CRITICAL FIX: Remove leading prepositions FIRST: "A Alicia" -> "Alicia"
  cleaned = cleaned.replace(/^(?:A|Al|Del|De|La|El|Para|Por)\s+/i, '');
  
  // Remove leading lowercase prepositions: "a juan", "para maria", "de carlos"
  cleaned = cleaned.replace(/^(?:a|para|de)\s+/i, '');
  
  // Special handling: if fullText contains email address, remove trailing "a" or "al"
  if (fullText && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(fullText)) {
    // Remove "a" before email: "eliana a email@..." -> "eliana"
    cleaned = cleaned.replace(/\s+a$/i, '');
    // Also handle "al" before email/correo words
    const escapedName = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const alBeforeEmailPattern = new RegExp(`${escapedName}\\s+al\\s+(?:correo|email)\\b`, 'i');
    if (alBeforeEmailPattern.test(fullText)) {
      cleaned = cleaned.replace(/\s+al$/i, '');
    }
  }
  
  // Remove trailing prepositions: "juan al", "maria del", "carlos de", "ana la", "pedro el", "eliana a"
  cleaned = cleaned.replace(/\s+(?:a|al|del|de|la|el|en)\s*$/i, '');
  
  return cleaned.trim();
}

// Helper function to extract employee names from salary queries
function extractNameFromSalaryQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "cual es el salario de eliana"
  const pattern1Match = lowerText.match(/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i);
  if (pattern1Match) {
    return pattern1Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  // Pattern 2: "salario de eliana"
  const pattern2Match = lowerText.match(/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
  if (pattern2Match) {
    return pattern2Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  // Pattern 3: "sueldo eliana" (without preposition, avoid general terms)
  if (!/nomina|total|cuanto|mes|año|periodo/i.test(lowerText)) {
    const pattern3Match = lowerText.match(/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
    if (pattern3Match) {
      return pattern3Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
    }
  }
  
  return null;
}

export class SimpleIntentMatcher {
  
  static match(message: string): SimpleIntent {
    const text = message.toLowerCase().trim();
    
    // ============================================================================
    // DOMAIN DEFINITIONS - KISS Route for Colombian Labor Terms
    // ============================================================================
    
    // EPS Definition
    if (/^(?:qu[eé]|que)\s+(?:es|significa)\s+(?:una?\s+)?eps[?\s]*$/i.test(text) ||
        /^(?:eps)[\?\.]*$/i.test(text) ||
        /^(?:qu[eé]|que)\s+significa\s+eps/i.test(text)) {
      return {
        type: 'DOMAIN_DEFINITION',
        confidence: 0.98,
        method: 'domainDefinition',
        params: { term: 'EPS' }
      };
    }
    
    // ARL Definition
    if (/^(?:qu[eé]|que)\s+(?:es|significa)\s+(?:una?\s+)?arl[?\s]*$/i.test(text) ||
        /^(?:arl)[\?\.]*$/i.test(text)) {
      return {
        type: 'DOMAIN_DEFINITION',
        confidence: 0.98,
        method: 'domainDefinition',
        params: { term: 'ARL' }
      };
    }
    
    // AFP Definition
    if (/^(?:qu[eé]|que)\s+(?:es|significa)\s+(?:una?\s+)?afp[?\s]*$/i.test(text) ||
        /^(?:afp)[\?\.]*$/i.test(text)) {
      return {
        type: 'DOMAIN_DEFINITION',
        confidence: 0.98,
        method: 'domainDefinition',
        params: { term: 'AFP' }
      };
    }
    
    // Cajas de Compensación
    if (/^(?:qu[eé]|que)\s+(?:es|son|significa)\s+(?:una?\s+)?caja[s]?\s+(?:de\s+)?compensaci[oó]n/i.test(text)) {
      return {
        type: 'DOMAIN_DEFINITION',
        confidence: 0.98,
        method: 'domainDefinition',
        params: { term: 'CAJA_COMPENSACION' }
      };
    }
    
    // SMLV
    if (/^(?:qu[eé]|que)\s+(?:es|significa)\s+(?:el\s+)?(?:smlv|salario\s+m[ií]nimo)/i.test(text)) {
      return {
        type: 'DOMAIN_DEFINITION',
        confidence: 0.98,
        method: 'domainDefinition',
        params: { term: 'SMLV' }
      };
    }
    
    // Parafiscales
    if (/^(?:qu[eé]|que)\s+(?:son|significa)\s+(?:los?\s+)?parafiscales/i.test(text)) {
      return {
        type: 'DOMAIN_DEFINITION',
        confidence: 0.98,
        method: 'domainDefinition',
        params: { term: 'PARAFISCALES' }
      };
    }
    
    // ============================================================================
    // NEW COLOMBIAN PAYROLL INTENTS
    // ============================================================================
    
    // LIQUIDACIÓN DE NÓMINA
    if (/(?:liquidar|procesar|calcular|generar)\s+(?:la\s+)?(?:nómin|nomin)/i.test(text)) {
      // Extract period - support multiple months
      const monthRegex = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
      const allMonthMatches = [...text.matchAll(monthRegex)];
      const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
      const yearMatch = text.match(/(\d{4})/);
      const fortnightMatch = text.match(/(primera|segunda|1ra|2da|quincenal)/i);
      
      const monthParams: any = {};
      if (allMonths.length === 1) {
        monthParams.month = allMonths[0];
      } else if (allMonths.length >= 2) {
        monthParams.monthStart = allMonths[0];
        monthParams.monthEnd = allMonths[allMonths.length - 1];
      }
      
      return {
        type: 'LIQUIDAR_NOMINA',
        confidence: 0.95,
        method: 'liquidarNomina',
        params: {
          periodo: allMonths.length > 0 ? `${allMonths.join(' y ')} ${yearMatch ? yearMatch[1] : new Date().getFullYear()}` : 'actual',
          quincena: fortnightMatch ? fortnightMatch[1] : null,
          empleados: 'todos',
          ...monthParams,
          year: yearMatch ? parseInt(yearMatch[1]) : null
        }
      };
    }

    // ============================================================================
    // EMPLOYEE CRUD OPERATIONS - HIGHEST PRIORITY (before EMPLOYEE_SEARCH)
    // ============================================================================

    // 1️⃣ EMPLOYEE_CREATE (confidence: 0.96 - MAYOR que EMPLOYEE_SEARCH)
    // Pattern 1: "crea a [nombre]" / "crear a [nombre]" (direct name pattern) - CASE INSENSITIVE
    const directCreatePattern = /(?:crea|crear|agrega|agregar|registra|registrar|añade|añadir)\s+(?:a|al)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)+)/i;
    
    // Pattern 2: Traditional patterns with "empleado" keyword
    const traditionalCreatePattern = /(?:crea|crear|agrega|agregar|registra|registrar|añade|añadir|añad[ií]|da\s+de\s+alta|dar\s+de\s+alta)\s+(?:un|una)?\s*(?:nuevo|nueva)?\s*(?:empleado|trabajador|colaborador|empleada|trabajadora|colaboradora)/i;
    
    if (directCreatePattern.test(text) || traditionalCreatePattern.test(text) ||
        /(?:nuevo|nueva)\s+(?:empleado|trabajador|colaborador|empleada|trabajadora|colaboradora)(?:\s+llamad[oa])?/i.test(text)) {
      
      // Extract employee name with multiple fallback patterns
      let employeeName = null;
      
      // Pattern 1: "crea a [nombre]" or "crear a [nombre]" (highest priority) - CASE INSENSITIVE
      const directPattern = /(?:crea|crear|agrega|agregar|registra|registrar|añade|añadir)\s+(?:a|al)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)+)/i;
      const directMatch = text.match(directPattern);
      
      if (directMatch) {
        employeeName = directMatch[1].trim();
      } else {
        // Pattern 2: "llamado/llamada" pattern - CASE INSENSITIVE
        const namedPattern = /(?:llamad[oa]|de\s+nombre)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i;
        const namedMatch = text.match(namedPattern);
        
        if (namedMatch) {
          employeeName = namedMatch[1].trim();
        } else {
          // Pattern 3: After trigger word "empleado/trabajador" - CASE INSENSITIVE
          const afterTriggerPattern = /(?:empleado|trabajador|colaborador|empleada|trabajadora|colaboradora)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i;
          const afterMatch = text.match(afterTriggerPattern);
          if (afterMatch) {
            employeeName = afterMatch[1].trim();
          }
        }
      }
      
      console.log('✅ [EMPLOYEE_CREATE] Detected:', { employeeName });
      
      return {
        type: 'EMPLOYEE_CREATE',
        confidence: 0.96,
        method: 'createEmployee',
        params: {
          employee_name: employeeName,
          name: employeeName
        }
      };
    }

    // ============================================================================
    // 🔥 SALARY_INCREASE_SIMULATION - Must be BEFORE EMPLOYEE_UPDATE
    // ============================================================================
    
    // SALARY_INCREASE_SIMULATION - Simular incremento salarial
    if (/(?:cuál|cual|cuánto|cuanto).*(?:costo|costaría).*(subir|aumentar|incrementar).*salario/i.test(text) ||
        /(?:subir|aumentar|incrementar).*salario\s+(?:a|de)/i.test(text) ||
        /(?:impacto|efecto).*(?:subir|aumentar|incrementar).*salario/i.test(text)) {
      
      // Extract employee name - FIX: buscar en contexto específico
      const nameMatch = 
        text.match(/salario\s+(?:a|de|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?=\s+en\s+\$|$)/i) ||
        text.match(/(?:aumento|incremento|subir|aumentar)\s+(?:a|de|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?=\s+en\s+\$|$)/i) ||
        text.match(/\ba\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)(?=\s+en\s+\$)/i);
      const employeeName = nameMatch ? sanitizeEmployeeName(nameMatch[1]) : null;
      
      // Extract increase amount
      const amountMatch = text.match(/(?:en\s+)?(?:\$|cop\s*)?(\d{1,3}(?:[.,]\d{3})*)/i);
      const increaseAmount = amountMatch ? parseFloat(amountMatch[1].replace(/[.,]/g, '')) : null;
      
      console.log('💰 [SALARY_INCREASE_SIMULATION] Detected:', { employeeName, increaseAmount });
      
      return {
        type: 'SALARY_INCREASE_SIMULATION',
        confidence: 0.97,
        method: 'simulateSalaryIncrease',
        params: {
          employeeName: employeeName,
          increaseAmount: increaseAmount
        }
      };
    }

    // 2️⃣ EMPLOYEE_UPDATE (confidence: 0.95 - IGUAL que EMPLOYEE_SEARCH pero con prioridad por orden)
    if (/(?:actualiza|actualizar|modifica|modificar|cambia|cambiar|cambi[óo]|edita|editar)\s+(?:el|la|los|las|datos|información|info|salario|cargo|email|tel[eé]fono)?\s*(?:de|del|de\s+la)?\s*(?:empleado|trabajador|colaborador)/i.test(text) ||
        /(?:cambio|actualización|modificación|cambiar|actualizar)\s+(?:de|en|del|para)\s+(?:salario|cargo|datos|información|email|tel[eé]fono)/i.test(text)) {
      
      // Extract employee name
      let employeeName = null;
      const namePattern = /(?:de|del|para|a)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i;
      const nameMatch = text.match(namePattern);
      
      if (nameMatch) {
        employeeName = nameMatch[1].trim();
      }
      
      console.log('📝 [EMPLOYEE_UPDATE] Detected:', { employeeName });
      
      return {
        type: 'EMPLOYEE_UPDATE',
        confidence: 0.95,
        method: 'updateEmployee',
        params: {
          employee_name: employeeName,
          name: employeeName
        }
      };
    }

    // 3️⃣ EMPLOYEE_DELETE (confidence: 0.97 - OPERACIÓN CRÍTICA, mayor prioridad)
    if (/(?:elimina|eliminar|borra|borrar|da\s+de\s+baja|dar\s+de\s+baja|inactiva|inactivar|desactiva|desactivar)\s+(?:al|a\s+la|el|la)?\s*(?:empleado|trabajador|colaborador)/i.test(text)) {
      
      // Extract employee name
      let employeeName = null;
      const namePattern = /(?:al|a\s+la|a|de|del)\s+(?:empleado|trabajador|colaborador)?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i;
      const nameMatch = text.match(namePattern);
      
      if (nameMatch) {
        employeeName = nameMatch[1].trim();
      }
      
      console.log('🗑️ [EMPLOYEE_DELETE] Detected:', { employeeName });
      
      return {
        type: 'EMPLOYEE_DELETE',
        confidence: 0.97,
        method: 'deleteEmployee',
        params: {
          employee_name: employeeName,
          name: employeeName
        }
      };
    }

    // ============================================================================
    // REGISTRAR NOVEDADES
    if (/(?:registrar|reportar|anotar|incluir)\s+(?:una?\s+)?(?:incapacidad|licencia|ausencia|horas?\s+extra|novedad)/i.test(text)) {
      const employeeMatch = text.match(/(?:de|para|a)\s+([a-záéíóúñ\s]+)/i);
      const daysMatch = text.match(/(\d+)\s+(?:días?|dia)/i);
      const hoursMatch = text.match(/(\d+)\s+horas?/i);
      
      // Determine novedad type
      let novedadType = 'incapacidad';
      if (/licencia.*maternidad/i.test(text)) novedadType = 'licencia_maternidad';
      else if (/licencia.*paternidad/i.test(text)) novedadType = 'licencia_paternidad';
      else if (/horas?\s+extra/i.test(text)) novedadType = 'horas_extra_diurna';
      
      return {
        type: 'REGISTRAR_NOVEDAD',
        confidence: 0.93,
        method: 'registrarNovedad',
        params: {
          empleado: employeeMatch ? employeeMatch[1].trim() : null,
          tipo_novedad: novedadType,
          dias: daysMatch ? parseInt(daysMatch[1]) : null,
          horas: hoursMatch ? parseInt(hoursMatch[1]) : null
        }
      };
    }

    // CALCULAR PRESTACIONES
    if (/(?:calcular|liquidar)\s+(?:las?\s+)?(?:cesantías?|prima|vacaciones|indemnizaci[oó]n)/i.test(text)) {
      const employeeMatch = text.match(/(?:de|para|a)\s+([a-záéíóúñ\s]+)/i);
      let prestationType = 'cesantias';
      if (/prima/i.test(text)) prestationType = 'prima';
      else if (/vacaciones/i.test(text)) prestationType = 'vacaciones';
      else if (/indemnizaci[oó]n/i.test(text)) prestationType = 'indemnizacion';
      
      return {
        type: 'CALCULAR_PRESTACION',
        confidence: 0.94,
        method: 'calcularPrestacion',
        params: {
          empleado: employeeMatch ? employeeMatch[1].trim() : 'todos',
          tipo_prestacion: prestationType,
          periodo: 'actual'
        }
      };
    }

    // ============================================================================
    // PHASE 1: AGGREGATION INTENTS (New - Maya Intelligence Expansion)
    // ============================================================================
    
    // 🔥 PRIORITY: CONTRIBUTION_REPORT - Must be BEFORE EMPLOYEE_SEARCH
    // 4.6 CONTRIBUTION_REPORT (Detalle de Aportes por Empleado)
    if (/(?:muestra|dame|genera|crea|detalle|desglose|reporte|listado)\s+(?:el\s+)?(?:detalle|desglose|reporte)?\s*(?:de\s+)?(?:aportes?|contribuciones?)\s+(?:a\s+)?(?:eps|pensión|pension|arl|salud|seguridad\s+social)?\s+(?:por|de)\s+empleado/i.test(text) ||
        /(?:aportes?|contribuciones?)\s+(?:de\s+)?(?:eps|pensión|pension|arl|salud)?\s+(?:por|de|cada)\s+empleado/i.test(text) ||
        /(?:cuánto|cuanto)\s+(?:aporta|cotiza)\s+cada\s+empleado\s+(?:a|en|para)\s+(?:eps|pensión|pension|arl|salud)/i.test(text)) {
      
      console.log('💰 [CONTRIBUTION_REPORT] Detected contribution report request');
      
      // Extract contribution type (EPS, Pensión, ARL)
      let contributionType = null;
      if (/\beps\b/i.test(text) || /\bsalud\b/i.test(text)) {
        contributionType = 'eps';
      } else if (/\bpensión\b/i.test(text) || /\bpension\b/i.test(text)) {
        contributionType = 'pension';
      } else if (/\barl\b/i.test(text)) {
        contributionType = 'arl';
      }
      
      // Extract temporal parameters
      const monthRegex = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
      const allMonthMatches = [...text.matchAll(monthRegex)];
      const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
      let yearMatch = text.match(/(\d{4})/);
      
      if (!yearMatch && /(?:este|actual|el)\s+año(?!\s+(?:pasado|anterior))/i.test(text)) {
        const currentYear = new Date().getFullYear();
        yearMatch = [String(currentYear), String(currentYear)] as RegExpMatchArray;
      }
      
      const params: any = { 
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        contributionType
      };
      
      if (allMonths.length === 1) {
        params.month = allMonths[0];
      } else if (allMonths.length >= 2) {
        params.monthStart = allMonths[0];
        params.monthEnd = allMonths[allMonths.length - 1];
      }
      
      console.log('[CONTRIBUTION_REPORT] Params:', params);
      
      return {
        type: 'CONTRIBUTION_REPORT',
        confidence: 0.96,
        method: 'getContributionReport',
        params
      };
    }
    
    // 5. TOTAL OVERTIME HOURS
    if (/(?:cuántas|cuantas|qué|que)\s+horas\s+extra/i.test(text) ||
        /(?:total|cantidad)\s+(?:de\s+)?horas\s+extra/i.test(text) ||
        /(?:cuánto|cuanto)\s+(?:debo\s+)?pagar\s+(?:por\s+|de\s+)?horas\s+extra/i.test(text)) {
      
      const monthRegex = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
      const allMonthMatches = [...text.matchAll(monthRegex)];
      const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
      let yearMatch = text.match(/(\d{4})/);
      
      // PRIORITY 1: Detect "año pasado", "año anterior" FIRST
      if (!yearMatch && /(?:año\s+pasado|año\s+anterior|pasado\s+año)/i.test(text)) {
        const lastYear = new Date().getFullYear() - 1;
        yearMatch = [String(lastYear), String(lastYear)] as RegExpMatchArray;
      }
      
      // PRIORITY 2: Detect "este año", "año actual", "el año" (but NOT "el año pasado")
      if (!yearMatch && /(?:este|actual|el)\s+año(?!\s+(?:pasado|anterior))/i.test(text)) {
        const currentYear = new Date().getFullYear();
        yearMatch = [String(currentYear), String(currentYear)] as RegExpMatchArray;
      }
      
      const params: any = { year: yearMatch ? parseInt(yearMatch[1]) : null };
      if (allMonths.length === 1) {
        params.month = allMonths[0];
      } else if (allMonths.length >= 2) {
        params.monthStart = allMonths[0];
        params.monthEnd = allMonths[allMonths.length - 1];
      }
      
      return {
        type: 'TOTAL_OVERTIME_HOURS',
        confidence: 0.93,
        method: 'getTotalOvertimeHours',
        params
      };
    }
    
    // 6. PAYROLL PROJECTION (High Priority - 0.97)
    if (/(?:proyecc?ión|proyecta[dr]o?|estim[ao](?:ción|do?)?)\s+(?:de\s+)?(?:nómin|nomin|gasto|costo)\s+(?:anual|del?\s+año)/i.test(text) ||
        /(?:costo|gasto)\s+(?:anual|del?\s+año)\s+(?:proyecta[dr]o?|estim[ao]do?)/i.test(text) ||
        /(?:cuánto|cuanto)\s+(?:voy\s+a\s+|vamos\s+a\s+)?(?:gastar|pagar)\s+(?:en|de)\s+(?:nómin|nomin).*(?:año|anual)/i.test(text) ||
        /(?:presupuesto|budget)\s+(?:de\s+)?(?:nómin|nomin)\s+(?:para\s+)?(?:\d{4}|este\s+año|próximo\s+año)/i.test(text)) {
      
      let yearMatch = text.match(/(\d{4})/);
      
      // Default to current year if not specified
      if (!yearMatch && /(?:este|actual|el)\s+año/i.test(text)) {
        const currentYear = new Date().getFullYear();
        yearMatch = [String(currentYear), String(currentYear)] as RegExpMatchArray;
      } else if (!yearMatch && /(?:próximo|siguiente)\s+año/i.test(text)) {
        const nextYear = new Date().getFullYear() + 1;
        yearMatch = [String(nextYear), String(nextYear)] as RegExpMatchArray;
      }
      
      const params: any = { 
        year: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
        projectionType: 'annual'
      };
      
      console.log('[PAYROLL_PROJECTION] Detected:', params);
      
      return {
        type: 'PAYROLL_PROJECTION',
        confidence: 0.97,
        method: 'getPayrollProjection',
        params
      };
    }

    // 7. HIGHEST PAYROLL PERIOD (New - Priority 0.96)
    if (/(?:cuál|cual|qué|que)\s+(?:ha\s+sido|fue|es)\s+(?:la|el)\s+(?:nómin|nomin|período|periodo|mes|quincena)\s+(?:más|mas)\s+(?:alta|alto|cara|caro|costosa|costoso)/i.test(text) ||
        /(?:período|periodo|mes|quincena)\s+(?:con|de)\s+(?:mayor|más\s+alta?)\s+(?:nómin|nomin|costo|pago)/i.test(text) ||
        /(?:cuándo|cuando)\s+(?:pagué|pague|pagamos)\s+(?:más|mas)/i.test(text) ||
        /(?:máxim[oa]|pico|mayor)\s+(?:de\s+)?(?:nómin|nomin|pago)/i.test(text) ||
        /(?:nómin|nomin).*(?:más|mas)\s+(?:alta|alto)/i.test(text)) {
      
      const monthRegex = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
      const allMonthMatches = [...text.matchAll(monthRegex)];
      const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
      let yearMatch = text.match(/(\d{4})/);
      
      // Default to current year if not specified
      if (!yearMatch) {
        const currentYear = new Date().getFullYear();
        yearMatch = [String(currentYear), String(currentYear)] as RegExpMatchArray;
      }
      
      const params: any = { year: yearMatch ? parseInt(yearMatch[1]) : null };
      if (allMonths.length === 1) {
        params.month = allMonths[0];
      } else if (allMonths.length >= 2) {
        params.monthStart = allMonths[0];
        params.monthEnd = allMonths[allMonths.length - 1];
      }
      
      console.log('[HIGHEST_PAYROLL_PERIOD] Detected:', params);
      
      return {
        type: 'HIGHEST_PAYROLL_PERIOD',
        confidence: 0.96, // Higher than TOTAL_PAYROLL_COST to prioritize
        method: 'getHighestPayrollPeriod',
        params
      };
    }
    
    // 8. LOWEST PAYROLL PERIOD (New - Priority 0.96)
    if (/(?:cuál|cual|qué|que)\s+(?:ha\s+sido|fue|es)\s+(?:la|el)\s+(?:nómin|nomin|período|periodo|mes|quincena)\s+(?:más|mas)\s+(?:baja|bajo|barata|barato|económica|economico)/i.test(text) ||
        /(?:período|periodo|mes|quincena)\s+(?:con|de)\s+(?:menor|más\s+baj[oa])\s+(?:nómin|nomin|costo|pago)/i.test(text) ||
        /(?:cuándo|cuando)\s+(?:pagué|pague|pagamos)\s+(?:menos)/i.test(text) ||
        /(?:mínim[oa]|menor)\s+(?:de\s+)?(?:nómin|nomin|pago)/i.test(text) ||
        /(?:nómin|nomin).*(?:más|mas)\s+(?:baja|bajo)/i.test(text) ||
        /(?:período|periodo|mes)\s+(?:donde|que)\s+(?:pagué|pague|pagamos)\s+menos/i.test(text)) {
      
      const monthRegex = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
      const allMonthMatches = [...text.matchAll(monthRegex)];
      const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
      let yearMatch = text.match(/(\d{4})/);
      
      // Default to current year if not specified
      if (!yearMatch) {
        const currentYear = new Date().getFullYear();
        yearMatch = [String(currentYear), String(currentYear)] as RegExpMatchArray;
      }
      
      const params: any = { year: yearMatch ? parseInt(yearMatch[1]) : null };
      if (allMonths.length === 1) {
        params.month = allMonths[0];
      } else if (allMonths.length >= 2) {
        params.monthStart = allMonths[0];
        params.monthEnd = allMonths[allMonths.length - 1];
      }
      
      console.log('[LOWEST_PAYROLL_PERIOD] Detected:', params);
      
      return {
        type: 'LOWEST_PAYROLL_PERIOD',
        confidence: 0.96, // Same priority as HIGHEST
        method: 'getLowestPayrollPeriod',
        params
      };
    }
    
    // 6. PAYROLL COMPARISON (Flexible period comparisons)
    if (/(?:variaci[oó]n|diferencia|cambio|comparar|comparaci[oó]n)\s+(?:del?\s+)?(?:costo|total|pago)?.*(?:n[oó]mina|payroll)/i.test(text) ||
        /(?:n[oó]mina|costo|total|pago).*(?:variaci[oó]n|diferencia|cambio|comparar)/i.test(text) ||
        /(?:cu[aá]nto|cuanto)\s+(?:vari[oó]|cambi[oó]|aument[oó]|disminuy[oó]).*(?:n[oó]mina|costo)/i.test(text) ||
        /(?:frente\s+al?|versus|vs\.?|comparado\s+con)\s+(?:mes|periodo|año|trimestre|semestre)/i.test(text) ||
        /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:vs\.?|versus|contra)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(text) ||
        /(?:entre|diferencia\s+entre)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+y\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(text) ||
        /(?:primer|segundo|tercer|cuarto)\s+trimestre\s+(?:vs\.?|versus|contra|y)/i.test(text) ||
        /(?:entre|diferencia\s+entre)\s+(?:el\s+)?(?:primer|segundo|tercer|cuarto)\s+trimestre\s+y\s+(?:el\s+)?(?:primer|segundo|tercer|cuarto)\s+trimestre/i.test(text) ||
        /(?:primer|segundo)\s+semestre\s+(?:vs\.?|versus|contra|y)/i.test(text) ||
        /(?:entre|diferencia\s+entre)\s+(?:el\s+)?(?:primer|segundo)\s+semestre\s+y\s+(?:el\s+)?(?:primer|segundo)\s+semestre/i.test(text) ||
        /(\d{4})\s+(?:vs\.?|versus|contra|y)\s+(\d{4})/i.test(text)) {
      
      console.log('📊 [PAYROLL_COMPARISON] Comparison query detected');
      
      return {
        type: 'PAYROLL_COMPARISON',
        confidence: 0.95,
        method: 'comparePayrollPeriods',
        params: { query: text }
      };
    }
    
    // ============================================================================
    // END PHASE 1: AGGREGATION INTENTS
    // ============================================================================

    // CONSULTAR PROVISIONES DE PRESTACIONES SOCIALES
    // Patterns: "cuánto hemos provisionado en vacaciones para laura"
    //          "provisión de prima de juan 2024"
    //          "provisiones de cesantías para maría este año"
    //          "cuánto hemos provisionado en prima" (sin empleado específico)
    //          "total provisionado en vacaciones"
    // ORDEN: Patrones con empleado PRIMERO, luego generales
    
    // Month regex for lookahead
    const MONTH = '(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)';
    
    const provisionPatterns = [
      // Patrón 1: Consultas con empleado específico (tipo ANTES de empleado) - PRIORIDAD ALTA
      // Lazy capture for employee name with lookahead to stop before month/year
      new RegExp(`(?:cu[aá]nto|cuanto|qu[eé]|que)\\s+(?:(?:hemos|se)\\s+)?(?:ha\\s+)?(?:provisionad(?:o|a|os|as)|provisiono|provisionó|provisionaron|provisionamos|provisiones?|provisi[oó]n)\\s+(?:en\\s+|de\\s+)?(vacaciones|prima|cesant[ií]as|intereses?\\s+(?:de\\s+)?cesant[ií]as)\\s+(?:para|a|de)\\s+([a-záéíóúñ]+(?:[\\s-][a-záéíóúñ]+){0,3}?)(?=\\s+(?:en|del?)\\s+${MONTH}|(?:\\s+(?:de|del)\\s+\\d{4})|[?.!,]|$)(?:\\s+(?:en|del?)\\s+(${MONTH}))?(?:\\s+(?:de\\s+|del?\\s+)?(\\d{4}))?`, 'i'),
      
      // Patrón 2: Consultas con empleado específico (tipo DESPUÉS de empleado) - PRIORIDAD ALTA
      new RegExp(`(?:provisi[oó]n(?:es)?)\\s+(?:de\\s+|en\\s+)?(vacaciones|prima|cesant[ií]as|intereses?\\s+(?:de\\s+)?cesant[ií]as)\\s+(?:de|para|a)\\s+([a-záéíóúñ]+(?:[\\s-][a-záéíóúñ]+){0,3}?)(?=\\s+(?:en|del?)\\s+${MONTH}|(?:\\s+(?:de|del)\\s+\\d{4})|[?.!,]|$)(?:\\s+(?:en|del?)\\s+(${MONTH}))?(?:\\s+(?:de\\s+|del?\\s+)?(\\d{4}))?`, 'i'),
      
      // Patrón 3: Empleado primero, tipo después - PRIORIDAD ALTA
      new RegExp(`(?:cu[aá]nto|cuanto)\\s+(?:(?:se|hemos)\\s+)?(?:ha\\s+)?(?:provisionad(?:o|a)|provisiono|provisionó|provisionaron|provisionamos)\\s+(?:para|a|de)\\s+([a-záéíóúñ]+(?:[\\s-][a-záéíóúñ]+){0,3}?)(?=\\s+(?:en|del?)\\s+${MONTH}|(?:\\s+(?:de|del)\\s+\\d{4})|[?.!,]|$)\\s+(?:en\\s+|de\\s+)?(vacaciones|prima|cesant[ií]as|intereses?\\s+(?:de\\s+)?cesant[ií]as)(?:\\s+(?:en|del?)\\s+(${MONTH}))?(?:\\s+(?:de\\s+|del?\\s+)?(\\d{4}))?`, 'i'),
      
      // Patrón 4: Consultas generales por tipo (SIN empleado específico) - PRIORIDAD MEDIA
      new RegExp(`(?:cu[aá]nto|cuanto|qu[eé]|que|total)\\s+(?:(?:hemos|se)\\s+)?(?:ha\\s+)?(?:provisionad(?:o|a|os|as)|provisiono|provisionó|provisionaron|provisionamos|provisiones?|provisi[oó]n)\\s+(?:en\\s+|de\\s+)?(vacaciones|prima|cesant[ií]as|intereses?\\s+(?:de\\s+)?cesant[ií]as)(?:\\s+(?:en|del?)\\s+(${MONTH}))?(?:\\s+(?:de\\s+|del?\\s+)?(\\d{4}))?(?!\\s+(?:para|a|de)\\s+[a-záéíóúñ])`, 'i'),
      
      // Patrón 5: Consultas generales SIN tipo ni empleado - PRIORIDAD BAJA
      new RegExp(`(?:cu[aá]nto|cuanto|qu[eé]|que|total)\\s+(?:(?:hemos|se)\\s+)?(?:ha\\s+)?(?:provisionad(?:o|a|os|as)|provisiono|provisionó|provisionaron|provisionamos|provisiones?|provisi[oó]n)(?:\\s+(?:para|de|a)\\s+([a-záéíóúñ]+(?:[\\s-][a-záéíóúñ]+){0,3}))?(?:\\s+(?:en|del?)\\s+(${MONTH}))?(?:\\s+(?:de\\s+|del?\\s+)?(\\d{4}))?`, 'i')
    ];

    for (let i = 0; i < provisionPatterns.length; i++) {
      const pattern = provisionPatterns[i];
      const match = text.match(pattern);
      if (match) {
        console.log(`🎯 [BENEFIT_PROVISION] Pattern ${i + 1} matched:`, match.slice(0, 6));
        // Identificar qué se capturó
        let employeeName: string | null = null;
        let benefitType: string | null = null;
        let month: string | null = null;
        let year: string | null = null;
        
        // Determinar empleado, tipo, mes y año según el patrón
        // Los patrones capturan: [fullMatch, tipo|empleado, empleado|tipo, mes?, año?]
        if (match[1] && /vacaciones|prima|cesant[ií]as|intereses/i.test(match[1])) {
          // match[1] es el tipo de beneficio
          benefitType = match[1];
          employeeName = match[2] || null;
          month = match[3] || null;
          year = match[4] ? parseInt(match[4]) : null;
        } else if (match[2] && /vacaciones|prima|cesant[ií]as|intereses/i.test(match[2])) {
          // match[2] es el tipo de beneficio
          benefitType = match[2];
          employeeName = match[1] || null;
          month = match[3] || null;
          year = match[4] ? parseInt(match[4]) : null;
        } else if (match[1]) {
          // Solo se capturó un grupo, podría ser empleado o tipo
          if (/vacaciones|prima|cesant[ií]as|intereses/i.test(match[1])) {
            benefitType = match[1];
            month = match[2] || null;
            year = match[3] ? parseInt(match[3]) : null;
          } else {
            employeeName = match[1];
            month = match[2] || null;
            year = match[3] ? parseInt(match[3]) : null;
          }
        }
        
        // Store raw name for debugging
        const rawName = employeeName;
        
        // CRITICAL: Clean employeeName if month was captured
        if (employeeName && month) {
          const monthPattern = new RegExp(`\\s+(?:en|del?)\\s+${month}(?:\\s+(?:de|del)\\s+\\d{4})?$`, 'i');
          employeeName = employeeName.replace(monthPattern, '').trim();
          console.log(`🧹 [NAME_CLEANING] Raw: "${rawName}" -> Cleaned: "${employeeName}"`);
        }
        
        // Apply sanitization
        if (employeeName) {
          employeeName = sanitizeEmployeeName(employeeName, text);
        }
        
        // Normalize benefit type
        if (benefitType) {
          if (/vacaciones/i.test(benefitType)) {
            benefitType = 'vacaciones';
          } else if (/prima/i.test(benefitType)) {
            benefitType = 'prima';
          } else if (/intereses/i.test(benefitType)) {
            benefitType = 'intereses_cesantias';
          } else if (/cesant[ií]as/i.test(benefitType)) {
            benefitType = 'cesantias';
          }
        }
        
        // Normalize month
        if (month) {
          month = month.toLowerCase();
        }
        
        // Detectar si pide "último período" solo si no hay mes ni año
        const useLastPeriod = /último\s+per[ií]odo/i.test(text) && !month && !year;
        
        console.log(`💰 [BENEFIT_PROVISION_QUERY] Detected: rawName="${rawName || 'ALL'}" -> cleanedName="${employeeName || 'ALL'}" - type=${benefitType || 'ALL'} month=${month || 'none'} year=${year || (useLastPeriod ? 'last_period' : 'current')}`);
        
        return {
          type: 'BENEFIT_PROVISION_QUERY',
          confidence: 0.96,
          method: 'getEmployeeBenefitProvision',
          params: {
            name: employeeName ? employeeName.trim() : null,
            benefitType: benefitType,
            month,
            year,
            useLastPeriod
          }
        };
      }
    }

    // GENERAR REPORTES (with normalization)
    if (/(?:generar|crear|mostrar|dame)\s+(?:el\s+)?(?:reporte|informe)/i.test(text) || 
        /(?:planilla|pila|seguridad\s+social|parafiscales)/i.test(text)) {
      
      const normalizedText = normalizePayrollTerm(text);
      let reportType = 'general';
      let conceptos = [];
      
      // Detect specific concepts
      if (normalizedText.includes('salud') || /eps/i.test(text)) conceptos.push('salud');
      if (normalizedText.includes('pension') || /pensiones/i.test(text)) conceptos.push('pension');
      if (normalizedText.includes('arl') || /riesgos/i.test(text)) conceptos.push('arl');
      if (normalizedText.includes('sena') || /formaci[oó]n/i.test(text)) conceptos.push('sena');
      if (normalizedText.includes('icbf') || /bienestar/i.test(text)) conceptos.push('icbf');
      if (normalizedText.includes('caja_compensacion') || /compensaci[oó]n/i.test(text)) conceptos.push('caja_compensacion');
      
      if (/planilla|pila/i.test(text)) reportType = 'planilla_pila';
      else if (conceptos.length > 0) reportType = 'seguridad_social';
      
      return {
        type: 'GENERAR_REPORTE',
        confidence: 0.92,
        method: 'generarReporte',
        params: {
          tipo_reporte: reportType,
          conceptos: conceptos,
          periodo: 'actual'
        }
      };
    }
    
    // ============================================================================
    // 🎯 VOUCHER SEND (Individual) - Ultra-Robust Colombian Patterns
    // ============================================================================
    // Covers 15+ linguistic variants with employee name extraction
    const voucherIndividualPatterns = [
      // Standard Colombian terms
      /(?:envi[aá]|mand[aá]|despach[aá]|hac[eé]|genera?|sac[aá])(?:r|me|le|la|lo)?\s+(?:el|la|un|una)?\s*(?:comprobante|colilla|desprendible|recibo|soporte|documento|pdf|planilla)\s+(?:de\s+(?:pago|n[oó]mina|salario|sueldo)\s+)?(?:de\s+|a\s+|para\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
      // Reverse patterns: "a [name] + action"
      /(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s+(?:envi[aá]|mand[aá]|despach[aá]|hac[eé]|genera?|sac[aá])(?:r|me|le|la|lo)?\s+(?:el|la|su)?\s*(?:comprobante|colilla|desprendible|recibo|soporte|documento|pdf)/i,
      // Informal Colombian: "tirar", "pasar", "compartir"
      /(?:tir[aá]|pas[aá]|compart[eí])(?:r|me|le|la)?\s+(?:el|la)?\s*(?:comprobante|colilla|desprendible|recibo)\s+(?:a|de|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
      // Direct action without preposition
      /(?:comprobante|colilla|desprendible|recibo)\s+(?:de\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i
    ];

    for (const pattern of voucherIndividualPatterns) {
      const match = text.match(pattern);
      if (match) {
        const rawEmployeeName = match[1].trim();
        const cleanedEmployeeName = sanitizeEmployeeName(rawEmployeeName, text);
        const termUsed = text.match(/(comprobante|colilla|desprendible|recibo|soporte|documento|pdf|planilla)/i)?.[1] || 'comprobante';
        
        // Extract email if provided in message (NEW)
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const email = emailMatch ? emailMatch[1] : null;
        
        console.log(`🧹 [VOUCHER_SEND] Normalized name: "${rawEmployeeName}" -> "${cleanedEmployeeName}"`);
        if (email) {
          console.log(`🎯 [VOUCHER_SEND] Detected: "${cleanedEmployeeName}" using term "${termUsed}" with email "${email}"`);
        } else {
          console.log(`🎯 [VOUCHER_SEND] Detected: "${cleanedEmployeeName}" using term "${termUsed}"`);
        }
        
        return {
          type: 'VOUCHER_SEND',
          confidence: 0.98,
          method: 'handleVoucherSend',
          params: {
            employeeName: cleanedEmployeeName,
            termUsed,
            email, // Include email if provided
            originalQuery: text.trim()
          }
        };
      }
    }

    // ============================================================================
    // 🎯 VOUCHER MASS SEND - Ultra-Robust Colombian Patterns  
    // ============================================================================
    const voucherMassPatterns = [
      /(?:envi[aá]|mand[aá]|despach[aá])(?:r|me)?\s+(?:todos?\s+)?(?:los?\s+)?(?:comprobantes?|colillas?|desprendibles?|recibos?)\s+(?:de\s+(?:pago|n[oó]mina|salario))?(?:\s+a\s+todos?)?(?:\s+masiv[oa])?/i,
      /(?:comprobantes?|colillas?|desprendibles?)\s+(?:masiv[oa]s?|en\s+masa|para\s+todos?|a\s+todos?)/i,
      /(?:envi[aá]|mand[aá])\s+(?:a\s+)?(?:todos?\s+)?(?:los?\s+)?(?:empleados?\s+)?(?:sus?\s+)?(?:comprobantes?|colillas?|desprendibles?)/i
    ];

    for (const pattern of voucherMassPatterns) {
      if (pattern.test(text)) {
        console.log(`🎯 [VOUCHER_MASS_SEND] Detected mass voucher request`);
        return {
          type: 'VOUCHER_MASS_SEND',
          confidence: 0.98,
          method: 'handleVoucherMassSend',
          params: {
            originalQuery: text.trim()
          }
        };
      }
    }
    
    // SECURITY: Block system-wide information queries (HIGHEST PRIORITY)
    if (/(?:cuántas?|cuantas?|cantidad|total)\s+(?:de\s+)?(?:empresas?|compañías?|organizaciones?)/i.test(text) ||
        /(?:base\s+de\s+datos|sistema|software|plataforma)/i.test(text) && /(?:empresas?|compañías?|datos|información)/i.test(text)) {
      return {
        type: 'SYSTEM_INFO_BLOCKED',
        confidence: 0.98,
        method: 'blockSystemInfoQuery'
      };
    }
    
    // HIRING_COST_SIMULATION - Simular costo de contratar empleado (ANTES de EMPLOYEE_COUNT para prioridad)
    if (/(?:cuánto|cuanto)\s+(?:me\s+)?(?:costaría|cuesta|costaré)\s+contratar/i.test(text) ||
        /(?:cuál|cual)\s+es\s+el\s+costo\s+(?:real|total)\s+de\s+contratar/i.test(text) ||
        /simula(?:r|ción)?\s+(?:contratación|contratar)/i.test(text)) {
      
      // Extract salary from text
      const salaryMatch = text.match(/(?:\$|cop\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i);
      const salary = salaryMatch ? parseFloat(salaryMatch[1].replace(/[.,]/g, '')) : null;
      
      return {
        type: 'HIRING_COST_SIMULATION',
        confidence: 0.96,
        method: 'simulateHiringCost',
        params: {
          salary: salary
        }
      };
    }

    // Employee count queries (CORREGIDO: más específico para evitar "cuánto")
    if (/cuántos\s+empleados?|cuantos\s+empleados?/i.test(text)) {
      return {
        type: 'EMPLOYEE_COUNT',
        confidence: 0.95,
        method: 'getEmployeeCount'
      };
    }

    // Employee list queries
    if (/(?:dame|dime|muestra|lista|cuáles?\s+son|quiénes?\s+son)\s*(?:los\s*)?(?:nombres?|empleados?)/i.test(text) ||
        /(?:lista|listado)\s+(?:de\s+)?empleados?/i.test(text) ||
        /(?:quiénes?\s+trabajan|quiénes?\s+son\s+los\s+empleados?)/i.test(text)) {
      return {
        type: 'EMPLOYEE_LIST',
        confidence: 0.92,
        method: 'listAllEmployees'
      };
    }
    
    // VOUCHER SEND WITH ALTERNATIVE EMAIL - Fallback pattern (strengthened)
    const alternativeEmailMatch = text.match(/(?:envi(?:a|á|ar|arlo|arla|alo|ala|ame|amelo|ámelo)|mand(?:a|á|ar|alo|ala|ame|amelo|ámelo))(?:lo|la|me|melo)?\s+(?:a|al)\s+(?:email|correo)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (alternativeEmailMatch) {
      const email = alternativeEmailMatch[1];
      console.log('📧 [VOUCHER_ALTERNATIVE_EMAIL] Pattern matched for email:', email);
      return {
        type: 'VOUCHER_EMAIL_OVERRIDE',
        confidence: 0.94,
        method: 'handleVoucherEmailOverride',
        params: { alternativeEmail: email }
      };
    }
    
    // SALARY REPORT - General salary listing (BEFORE specific employee queries)
    if (/(?:salario|sueldo)s?\s+(?:por|de|de\s+cada)\s+empleado/i.test(text) ||
        /(?:listado|lista|reporte|informe)\s+de\s+salarios?/i.test(text) ||
        /(?:cuánto|cuanto)\s+gana\s+cada\s+(?:uno|empleado)/i.test(text) ||
        /(?:todos?\s+los?\s+)?salarios?(?:\s+de\s+(?:todos?|empleados?))?$/i.test(text)) {
      console.log('📊 [SALARY_REPORT] Pattern matched - general salary report requested');
      return {
        type: 'SALARY_REPORT',
        confidence: 0.96,
        method: 'getSalaryReport',
        params: { reportType: 'all_salaries' }
      };
    }
    
    // Employee salary inquiry - HIGHEST PRIORITY for specific employee queries
    
    // COLOMBIAN PATTERNS - DIRECT (HIGHEST PRIORITY)
    // Pattern 1: "¿Cuánto gana eliana?" - Most common Colombian expression
    if (/(?:cuánto|cuanto|qué|que)\s+(?:gana|cobra|se\s+gana|se\s+lleva|percibe)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i.test(text) && !/nomina|total|mes|año/i.test(text)) {
      const nameMatch = text.match(/(?:cuánto|cuanto|qué|que)\s+(?:gana|cobra|se\s+gana|se\s+lleva|percibe)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('🇨🇴 [COLOMBIAN DIRECT] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.98,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 2: "¿Cuánto le pagan a eliana?" - Colombian formal
    if (/(?:cuánto|cuanto|qué|que)\s+(?:le\s+)?(?:pagan|pago|pagamos)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i.test(text)) {
      const nameMatch = text.match(/(?:cuánto|cuanto|qué|que)\s+(?:le\s+)?(?:pagan|pago|pagamos)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('🇨🇴 [COLOMBIAN FORMAL] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.97,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 3: "¿A cuánto está eliana?" - Very Colombian regional
    if (/(?:a\s+cuánto|a\s+cuanto)\s+(?:está|esta)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i.test(text)) {
      const nameMatch = text.match(/(?:a\s+cuánto|a\s+cuanto)\s+(?:está|esta)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('🇨🇴 [COLOMBIAN REGIONAL] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.96,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 4: "¿El sueldo de eliana?" - Short Colombian
    if (/(?:el\s+)?(?:salario|sueldo)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i.test(text) && text.length < 30) {
      const nameMatch = text.match(/(?:el\s+)?(?:salario|sueldo)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('🇨🇴 [COLOMBIAN SHORT] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.95,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // TRADITIONAL PATTERNS (LOWER PRIORITY)
    // Pattern 5: "cual es el salario de eliana" - Traditional formal
    if (/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i.test(text)) {
      const nameMatch = text.match(/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('📝 [TRADITIONAL FORMAL] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.92,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 6: "salario de eliana" or "sueldo de maria"
    if (/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i.test(text)) {
      const nameMatch = text.match(/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('📝 [TRADITIONAL SIMPLE] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.9,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 7: "sueldo eliana" (without preposition) - EXCLUDE report phrases
    if (/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i.test(text) && 
        !/nomina|total|cuanto|mes|año|por\s+empleado|de\s+cada|de\s+todos|cada\s+uno/i.test(text)) {
      const nameMatch = text.match(/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      console.log('📝 [TRADITIONAL BASIC] Pattern matched for:', extractedName);
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.85,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Employee paid total queries - HIGHEST PRIORITY (before general payroll)
    
    // DIRECT COLOMBIAN PATTERNS FOR EMPLOYEE PAYMENTS (NO INTERROGATIVE)
    // Pattern 1: "pagos a eliana en 2025" - Most common direct request
    if (/(?:pagos?|total\s+pagado|lo\s+pagado|dinero\s+pagado)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)/i.test(text)) {
      const nameMatch = text.match(/(?:pagos?|total\s+pagado|lo\s+pagado|dinero\s+pagado)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)/i);
      const name = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      
      console.log('💰 [EMPLOYEE_PAID_DIRECT] Pattern matched for:', name);
      
      // Extract timeframe
      let year = null;
      let month = null;
      
      const yearMatch = text.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      } else if (/este\s+año|en\s+el\s+año/i.test(text)) {
        year = new Date().getFullYear();
      }
      
      const monthMatch = text.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      if (monthMatch) {
        month = monthMatch[1].toLowerCase();
        // If month specified but no year, default to current year
        if (!year) year = new Date().getFullYear();
      }
      
      // Default to current year if no timeframe specified
      if (!year && !month) {
        year = new Date().getFullYear();
      }

      console.log('📅 [EMPLOYEE_PAID_DIRECT] Timeframe extracted:', { name, year, month });
      
      return {
        type: 'EMPLOYEE_PAID_TOTAL',
        confidence: 0.98,
        method: 'getEmployeePaidTotal',
        params: { name, year, month }
      };
    }

    // Pattern 2: "lo que recibió eliana" - Alternative Colombian expression
    if (/(?:lo\s+que\s+(?:recibió|ha\s+recibido)|dinero\s+que\s+recibió)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)/i.test(text)) {
      const nameMatch = text.match(/(?:lo\s+que\s+(?:recibió|ha\s+recibido)|dinero\s+que\s+recibió)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)/i);
      const name = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      
      console.log('💰 [EMPLOYEE_RECEIVED] Pattern matched for:', name);
      
      // Extract timeframe (same logic as above)
      let year = null;
      let month = null;
      
      const yearMatch = text.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      } else if (/este\s+año|en\s+el\s+año/i.test(text)) {
        year = new Date().getFullYear();
      }
      
      const monthMatch = text.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      if (monthMatch) {
        month = monthMatch[1].toLowerCase();
        if (!year) year = new Date().getFullYear();
      }
      
      if (!year && !month) {
        year = new Date().getFullYear();
      }

      console.log('📅 [EMPLOYEE_RECEIVED] Timeframe extracted:', { name, year, month });
      
      return {
        type: 'EMPLOYEE_PAID_TOTAL',
        confidence: 0.97,
        method: 'getEmployeePaidTotal',
        params: { name, year, month }
      };
    }

    // INTERROGATIVE PATTERNS (LOWER PRIORITY)
    // Pattern 3: "¿cuánto se le ha pagado a eliana?" - Traditional interrogative
    if (/(?:cuánto|cuanto|qué|que)\s+(?:(?:se\s+)?(?:le\s+)?(?:ha|hemos|han|he)\s+)?(?:pagado|pago|pagamos)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)/i.test(text)) {
      const nameMatch = text.match(/(?:cuánto|cuanto|qué|que)\s+(?:(?:se\s+)?(?:le\s+)?(?:ha|hemos|han|he)\s+)?(?:pagado|pago|pagamos)\s+(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*?)(?:\s+(?:este|en|durante|\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|$)/i);
      const name = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      
      console.log('🎯 [EMPLOYEE_PAID_INTERROGATIVE] Pattern matched for:', name);
      
      // Extract timeframe
      let year = null;
      let month = null;
      
      const yearMatch = text.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      } else if (/este\s+año|en\s+el\s+año/i.test(text)) {
        year = new Date().getFullYear();
      }
      
      const monthMatch = text.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      if (monthMatch) {
        month = monthMatch[1].toLowerCase();
        // If month specified but no year, default to current year
        if (!year) year = new Date().getFullYear();
      }
      
      // Default to current year if no timeframe specified
      if (!year && !month) {
        year = new Date().getFullYear();
      }

      console.log('📅 [EMPLOYEE_PAID_INTERROGATIVE] Timeframe extracted:', { name, year, month });
      
      return {
        type: 'EMPLOYEE_PAID_TOTAL',
        confidence: 0.95,
        method: 'getEmployeePaidTotal',
        params: { name, year, month }
      };
    }

    // ============================================================================
    // EMPLOYEE DETAILS - Extended info request (más información)
    // ============================================================================
    
    // Pattern 1: "dame más información de [nombre]" - explicit name (accent-insensitive)
    const moreInfoExplicitMatch = text.match(/(?:dame|dime|muestra|quiero|necesito|ver)\s+(?:m[aá]s\s+)?(?:informaci[oó]n|info|detalles?)\s+(?:de|sobre|del|de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
    if (moreInfoExplicitMatch) {
      let name = moreInfoExplicitMatch[1].trim();
      // Remove common filler words and prepositions
      name = name.replace(/^(el|la|los|las|un|una|de|sobre|del|al|a)\s+/i, '').trim();
      
      console.log(`🔍 [EMPLOYEE_DETAILS] Explicit request for: "${name}"`);
      return {
        type: 'EMPLOYEE_DETAILS',
        confidence: 0.95,
        method: 'getEmployeeDetails',
        params: { name }
      };
    }
    
    // Pattern 2: "más información" without name - relies on context (accent-insensitive)
    if (/^(?:dame|dime|muestra|quiero|necesito|ver)?\s*(?:m[aá]s\s+)?(?:informaci[oó]n|info|detalles?)\s*$/i.test(text) ||
        /^(?:m[aá]s\s+)?(?:informaci[oó]n|info|detalles?)\s*$/i.test(text)) {
      console.log(`🔍 [EMPLOYEE_DETAILS] Bare request (no name) - will use context`);
      return {
        type: 'EMPLOYEE_DETAILS',
        confidence: 0.90,
        method: 'getEmployeeDetails',
        params: { name: null } // Will be extracted from conversation context
      };
    }
    
    // ============================================================================
    // EMPLOYEE SEARCH - Natural language patterns (HIGH PRIORITY)
    // ============================================================================
    // Supports: "busca a eliana", "busca eliana", "dame info de carlos", "quién es maria", etc. (accent-insensitive)
    // FIXED: Added negative lookahead to prevent matching report-like queries
    // 🛡️ GUARD: Reject if text contains contribution/report keywords
    if (/(?:aportes?|contribuciones?).*(?:empleado|por)|(?:detalle|reporte|informe|desglose|listado).*(?:aportes?|contribuciones?).*empleado/i.test(text) ||
        /(?:muestra|dame|genera).*(?:aportes?|contribuciones?)/i.test(text)) {
      console.log('🛡️ [EMPLOYEE_SEARCH] Rejected: contains contribution/report keywords');
      // Don't return, continue to next patterns
    } else {
      const employeeSearchPattern = /(?:busca|encuentra|muestra(?!\s+(?:el\s+)?(?:detalle|reporte|listado|informe|desglose))|dame\s+(?:info|informaci[oó]n)|qui[eé]n\s+es|informaci[oó]n\s+(?:de|sobre)|buscar|empleado)(?:\s+(?:a|al|el\s+empleado|empleado))?\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i;
      const employeeSearchMatch = text.match(employeeSearchPattern);
      
      if (employeeSearchMatch) {
      let name = employeeSearchMatch[1].trim();
      
      // Remove common filler words and prepositions that might have been captured
      name = name.replace(/^(el|la|los|las|un|una|de|sobre|del|al|a)\s+/i, '').trim();
      
        // Validate that we have a reasonable name (at least 2 characters, not just numbers)
        if (name.length >= 2 && /[a-záéíóúñ]/i.test(name)) {
          console.log('🔍 [EMPLOYEE_SEARCH] Name extracted:', name);
          return {
            type: 'EMPLOYEE_SEARCH', 
            confidence: 0.95,
            method: 'searchEmployee',
            params: { name }
          };
        }
      }
    }
    
    // Payroll queries - expanded patterns to be more inclusive (LOWER PRIORITY than employee-specific)
    if (/nómin|nomin|sueldo|salario|pag|gast|cost|laboral|planilla/.test(text)) {
      // Extract month first - if found, handle month/fortnight specific queries
      const monthMatch = text.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      
      if (monthMatch) {
        const month = monthMatch[1].toLowerCase();
        
        // Extract year (optional)
        const yearMatch = text.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        
        // Check for fortnight indicators
        const fortnightMatch = text.match(/(primera|1ra|segunda|2da|del\s+1\s+al\s+15|del\s+16\s+al\s+30|del\s+16\s+al\s+31|1\s*-\s*15|16\s*-\s*30|16\s*-\s*31)/i);
        
        if (fortnightMatch) {
          const fortnightText = fortnightMatch[1].toLowerCase();
          let fortnight = 'primera';
          
          if (fortnightText.includes('segunda') || fortnightText.includes('2da') || 
              fortnightText.includes('16') || fortnightText.includes('30') || fortnightText.includes('31')) {
            fortnight = 'segunda';
          }
          
          return {
            type: 'PAYROLL_BY_FORTNIGHT',
            confidence: 0.95,
            method: 'getPayrollByFortnight',
            params: { month, year, fortnight }
          };
        }
        
        // Month only (no fortnight)
        return {
          type: 'PAYROLL_BY_MONTH',
          confidence: 0.95,
          method: 'getPayrollByMonth',
          params: { month, year }
        };
      }
      
      // No specific month - check if asking for totals/general info
      // BUT avoid classifying if it's an employee-specific query (IMPROVED SAFETY CHECK)
      if (/cuánto|cuanto|total|valor|cost|sum|gast/.test(text) && 
          !/(?:pagad(?:o|os)?|pagos?|pagamos|pagan)\s+(?:a|para)\s+[a-záéíóúñ]/i.test(text) &&
          !/empleados?.*(?:cost|car|barat)/i.test(text)) {
        console.log('📊 [PAYROLL_TOTALS] General totals query detected (no employee specified)');
        return {
          type: 'PAYROLL_TOTALS',
          confidence: 0.9,
          method: 'getPayrollTotals'
        };
      }
      
      // General payroll inquiry without specific question words
      console.log('📊 [PAYROLL_TOTALS] General payroll inquiry detected');
      return {
        type: 'PAYROLL_TOTALS',
        confidence: 0.8,
        method: 'getPayrollTotals'
      };
    }
    
    // Employee payroll history
    if (/cuántas?|cuantas?/.test(text) && (/nómin|nomin|pag/.test(text))) {
      const nameMatch = text.match(/(?:de|para|a)\s+([a-záéíóúñ]+)/i);
      if (nameMatch) {
        return {
          type: 'EMPLOYEE_PAYROLL_HISTORY',
          confidence: 0.85,
          method: 'getEmployeePayrollHistory',
          params: { employeeName: nameMatch[1] }
        };
      }
    }
    
    // Recent periods with status filtering
    if (/períodos?|periodo/.test(text) || (/últim|ultim/.test(text) && /nómin|nomin/.test(text))) {
      // Detect status filter in user query
      let statusFilter = null;
      if (/cerrad[oa]s?|cerrar|finalizado|aprobado/i.test(text)) {
        statusFilter = 'cerrado';
      } else if (/borrador|draft|pendiente|sin\s+cerrar/i.test(text)) {
        statusFilter = 'borrador';
      } else if (/proces[oa]|activ[oa]s?|en\s+curso/i.test(text)) {
        statusFilter = 'en_proceso';
      }
      
      console.log(`📅 [RECENT_PERIODS] Status filter detected: ${statusFilter || 'none (all periods)'}`);
      
      return {
        type: 'RECENT_PERIODS',
        confidence: 0.8,
        method: 'getRecentPeriods',
        params: { statusFilter }
      };
    }
    
    // Default to conversation
    return {
      type: 'CONVERSATION',
      confidence: 0.3,
      method: 'conversation'
    };
  }
}