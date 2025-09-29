// ============================================================================
// Simple Intent Matcher - KISS Implementation
// ============================================================================
// Replaces complex AI-based intent detection with fast regex patterns

export interface SimpleIntent {
  type: string;
  confidence: number;
  method: string;
  params?: any;
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
    
    // SECURITY: Block system-wide information queries (HIGHEST PRIORITY)
    if (/(?:cuántas?|cuantas?|cantidad|total)\s+(?:de\s+)?(?:empresas?|compañías?|organizaciones?)/i.test(text) ||
        /(?:base\s+de\s+datos|sistema|software|plataforma)/i.test(text) && /(?:empresas?|compañías?|datos|información)/i.test(text)) {
      return {
        type: 'SYSTEM_INFO_BLOCKED',
        confidence: 0.98,
        method: 'blockSystemInfoQuery'
      };
    }
    
    // Employee count queries
    if (/cuántos?|cuantos?/.test(text) && /empleado/.test(text)) {
      return {
        type: 'EMPLOYEE_COUNT',
        confidence: 0.95,
        method: 'getEmployeeCount'
      };
    }
    
    // Employee salary inquiry - HIGHEST PRIORITY for specific employee queries
    // Pattern 1: "cual es el salario de eliana"
    if (/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i.test(text)) {
      const nameMatch = text.match(/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.95,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 2: "salario de eliana" or "sueldo de maria"
    if (/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i.test(text)) {
      const nameMatch = text.match(/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.9,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Pattern 3: "sueldo eliana" (without preposition)
    if (/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i.test(text) && !/nomina|total|cuanto|mes|año/i.test(text)) {
      const nameMatch = text.match(/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
      const extractedName = nameMatch?.[1]?.trim().replace(/[?.,!]+$/, '') || '';
      return {
        type: 'EMPLOYEE_SALARY',
        confidence: 0.85,
        method: 'getEmployeeSalary',
        params: { name: extractedName }
      };
    }

    // Employee search
    if (/busca|encuentra|muestra|salario|sueldo/.test(text) && /empleado/.test(text)) {
      const nameMatch = text.match(/(?:busca|encuentra|muestra)\s+(?:el\s+empleado\s+|empleado\s+)?([a-záéíóúñ]+)/i);
      return {
        type: 'EMPLOYEE_SEARCH', 
        confidence: 0.9,
        method: 'searchEmployee',
        params: { name: nameMatch?.[1] || '' }
      };
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
      if (/cuánto|cuanto|total|valor|cost|sum|gast/.test(text)) {
        return {
          type: 'PAYROLL_TOTALS',
          confidence: 0.9,
          method: 'getPayrollTotals'
        };
      }
      
      // General payroll inquiry without specific question words
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
    
    // Recent periods
    if (/períodos?|periodo/.test(text) || (/últim|ultim/.test(text) && /nómin|nomin/.test(text))) {
      return {
        type: 'RECENT_PERIODS',
        confidence: 0.8,
        method: 'getRecentPeriods'
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