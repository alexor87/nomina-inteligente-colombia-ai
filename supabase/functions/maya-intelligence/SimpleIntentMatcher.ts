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

export class SimpleIntentMatcher {
  
  static match(message: string): SimpleIntent {
    const text = message.toLowerCase().trim();
    
    // Employee count queries
    if (/cuántos?|cuantos?/.test(text) && /empleado/.test(text)) {
      return {
        type: 'EMPLOYEE_COUNT',
        confidence: 0.95,
        method: 'getEmployeeCount'
      };
    }
    
    // Employee search
    if (/busca|encuentra|muestra/.test(text) && /empleado/.test(text)) {
      const nameMatch = text.match(/(?:busca|encuentra|muestra)\s+(?:el\s+empleado\s+|empleado\s+)?([a-záéíóúñ]+)/i);
      return {
        type: 'EMPLOYEE_SEARCH', 
        confidence: 0.9,
        method: 'searchEmployee',
        params: { name: nameMatch?.[1] || '' }
      };
    }
    
    // Payroll totals
    if (/cuánto|cuanto|total/.test(text) && (/gast|pag|nómin|nomin/.test(text))) {
      return {
        type: 'PAYROLL_TOTALS',
        confidence: 0.9, 
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