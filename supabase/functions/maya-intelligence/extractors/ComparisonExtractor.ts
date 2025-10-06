/**
 * Comparison Period Extractor
 * Extracts two temporal periods from comparison queries
 */

import { TemporalParams, TemporalType, MONTH_NAMES } from '../core/temporal-types.ts';

export interface ComparisonParams {
  period1: TemporalParams;
  period2: TemporalParams;
}

/**
 * Extract two periods from a comparison query
 * Examples:
 * - "enero vs marzo" -> {period1: enero, period2: marzo}
 * - "primer trimestre vs segundo" -> {period1: Q1, period2: Q2}
 * - "mes anterior" -> {period1: current month, period2: previous month}
 * - "2024 vs 2025" -> {period1: 2024, period2: 2025}
 */
export function extractComparisonPeriods(query: string): ComparisonParams {
  const text = query.toLowerCase();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Pattern 1: "mes anterior" / "periodo anterior" (most common)
  if (/(?:mes|periodo|quincena)\s+anterior/i.test(text) || 
      /frente\s+al?\s+mes\s+anterior/i.test(text)) {
    const now = new Date();
    const thisMonth = now.getMonth() + 1; // 1-12
    const thisYear = now.getFullYear();
    
    const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
    const lastYear = thisMonth === 1 ? thisYear - 1 : thisYear;
    
    return {
      period1: {
        type: TemporalType.SPECIFIC_MONTH,
        month: getMonthName(thisMonth),
        year: thisYear
      },
      period2: {
        type: TemporalType.SPECIFIC_MONTH,
        month: getMonthName(lastMonth),
        year: lastYear
      }
    };
  }
  
  // Pattern 2: "enero vs marzo" / "enero contra marzo"
  const monthVsPattern = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:vs\.?|versus|contra|comparado\s+con)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const monthVsMatch = text.match(monthVsPattern);
  
  if (monthVsMatch) {
    const month1 = monthVsMatch[1].toLowerCase();
    const month2 = monthVsMatch[2].toLowerCase();
    const yearMatch = text.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
    
    return {
      period1: {
        type: TemporalType.SPECIFIC_MONTH,
        month: month1,
        year
      },
      period2: {
        type: TemporalType.SPECIFIC_MONTH,
        month: month2,
        year
      }
    };
  }
  
  // Pattern 3: "primer trimestre vs segundo" / "Q1 vs Q2"
  const quarterVsPattern = /(?:primer|1er|q1|primero)\s+trimestre\s+(?:vs\.?|versus|contra|comparado\s+con)\s+(?:segundo|2do|q2)/i;
  if (quarterVsPattern.test(text)) {
    const yearMatch = text.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
    
    return {
      period1: {
        type: TemporalType.QUARTER,
        quarter: 1,
        year
      },
      period2: {
        type: TemporalType.QUARTER,
        quarter: 2,
        year
      }
    };
  }
  
  // Pattern 4: "primer semestre vs segundo"
  const semesterVsPattern = /(?:primer|1er|primero)\s+semestre\s+(?:vs\.?|versus|contra|comparado\s+con)\s+(?:segundo|2do)/i;
  if (semesterVsPattern.test(text)) {
    const yearMatch = text.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
    
    return {
      period1: {
        type: TemporalType.SEMESTER,
        semester: 1,
        year
      },
      period2: {
        type: TemporalType.SEMESTER,
        semester: 2,
        year
      }
    };
  }
  
  // Pattern 5: "2024 vs 2025" / "año pasado vs este año"
  const yearVsPattern = /(\d{4})\s+(?:vs\.?|versus|contra|comparado\s+con)\s+(\d{4})/i;
  const yearVsMatch = text.match(yearVsPattern);
  
  if (yearVsMatch) {
    return {
      period1: {
        type: TemporalType.FULL_YEAR,
        year: parseInt(yearVsMatch[1])
      },
      period2: {
        type: TemporalType.FULL_YEAR,
        year: parseInt(yearVsMatch[2])
      }
    };
  }
  
  // Pattern 6: "año pasado vs este año"
  if (/año\s+pasado\s+(?:vs\.?|versus|contra|comparado\s+con)\s+(?:este|actual)/i.test(text)) {
    return {
      period1: {
        type: TemporalType.FULL_YEAR,
        year: currentYear
      },
      period2: {
        type: TemporalType.FULL_YEAR,
        year: currentYear - 1
      }
    };
  }
  
  // Pattern 7: "este mes vs el anterior"
  if (/este\s+mes\s+(?:vs\.?|versus|contra|comparado\s+con)\s+(?:el\s+)?anterior/i.test(text)) {
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    return {
      period1: {
        type: TemporalType.SPECIFIC_MONTH,
        month: getMonthName(currentMonth),
        year: currentYear
      },
      period2: {
        type: TemporalType.SPECIFIC_MONTH,
        month: getMonthName(lastMonth),
        year: lastYear
      }
    };
  }
  
  // Fallback: current month vs previous month
  console.log('⚠️ [COMPARISON_EXTRACTOR] No specific pattern matched, using default: current vs previous month');
  
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  return {
    period1: {
      type: TemporalType.SPECIFIC_MONTH,
      month: getMonthName(currentMonth),
      year: currentYear
    },
    period2: {
      type: TemporalType.SPECIFIC_MONTH,
      month: getMonthName(lastMonth),
      year: lastYear
    }
  };
}

/**
 * Helper: Get month name from number (1-12)
 */
function getMonthName(monthNumber: number): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return months[monthNumber - 1] || 'enero';
}
