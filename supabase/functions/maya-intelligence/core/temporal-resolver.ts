/**
 * ✅ TEMPORAL RESOLVER - Converts LLM extractedContext to TemporalParams
 * 
 * Centralizes the logic of interpreting temporal context from LLM
 * and converting it to standardized TemporalParams
 */

import { TemporalParams, TemporalType, MONTH_NAMES_REVERSE } from './temporal-types.ts';

export class TemporalResolver {
  /**
   * Converts extractedContext from LLM to standardized TemporalParams
   */
  static resolve(extractedContext: any): TemporalParams {
    const { temporalModifier, year, month, quarter, semester, monthCount } = extractedContext;
    
    const currentYear = new Date().getFullYear();
    
    console.log('🔄 [TEMPORAL_RESOLVER] Resolving:', {
      temporalModifier,
      year,
      month,
      quarter,
      semester,
      monthCount
    });
    
    // LAST_YEAR
    if (temporalModifier === 'LAST_YEAR') {
      return {
        type: TemporalType.FULL_YEAR,
        year: year || currentYear - 1
      };
    }
    
    // THIS_YEAR or FULL_YEAR
    if (temporalModifier === 'THIS_YEAR' || temporalModifier === 'FULL_YEAR') {
      return {
        type: TemporalType.FULL_YEAR,
        year: year || currentYear
      };
    }
    
    // LAST_N_MONTHS
    if (temporalModifier === 'LAST_N_MONTHS' || monthCount) {
      return {
        type: TemporalType.LAST_N_MONTHS,
        monthCount: monthCount || 3,
        year: currentYear
      };
    }
    
    // SPECIFIC_MONTH
    if (temporalModifier === 'SPECIFIC_MONTH' || month) {
      return {
        type: TemporalType.SPECIFIC_MONTH,
        month: month,
        year: year || currentYear
      };
    }
    
    // QUARTER
    if (temporalModifier === 'QUARTER' || quarter) {
      return {
        type: TemporalType.QUARTER,
        quarter: quarter,
        year: year || currentYear
      };
    }
    
    // SEMESTER
    if (temporalModifier === 'SEMESTER' || semester) {
      return {
        type: TemporalType.SEMESTER,
        semester: semester,
        year: year || currentYear
      };
    }
    
    // Fallback: specific period (most recent)
    console.log('⚠️ [TEMPORAL_RESOLVER] No temporal modifier matched, defaulting to SPECIFIC_PERIOD');
    return {
      type: TemporalType.SPECIFIC_PERIOD
    };
  }
  
  /**
   * Generates a human-readable display name for the temporal params
   */
  static getDisplayName(params: TemporalParams): string {
    switch (params.type) {
      case TemporalType.FULL_YEAR:
        return `Año ${params.year}`;
        
      case TemporalType.LAST_N_MONTHS:
        return `Últimos ${params.monthCount} meses`;
        
      case TemporalType.SPECIFIC_MONTH:
        const monthCap = params.month!.charAt(0).toUpperCase() + params.month!.slice(1);
        return `${monthCap} ${params.year}`;
        
      case TemporalType.QUARTER:
        return `Q${params.quarter} ${params.year}`;
        
      case TemporalType.SEMESTER:
        return `Semestre ${params.semester} ${params.year}`;
        
      case TemporalType.MONTH_RANGE:
        return `Rango de meses ${params.year}`;
        
      case TemporalType.CUSTOM_DATE_RANGE:
        return `Rango personalizado`;
        
      case TemporalType.SPECIFIC_PERIOD:
      default:
        return 'Período actual';
    }
  }
  
  /**
   * Check if params represent a legacy format (for backward compatibility)
   */
  static isLegacyFormat(params: any): boolean {
    // If type is undefined or missing, treat as legacy
    if (!params.type) {
      return true;
    }
    return !('type' in params) && (
      'month' in params ||
      'year' in params ||
      'periodId' in params ||
      'monthCount' in params
    );
  }
  
  /**
   * Convert legacy params to TemporalParams
   */
  static fromLegacy(params: any): TemporalParams {
    // periodId takes precedence
    if (params.periodId) {
      return {
        type: TemporalType.SPECIFIC_PERIOD,
        periodIds: [params.periodId]
      };
    }
    
    // Month range (monthStart + monthEnd)
    if (params.monthStart && params.monthEnd) {
      return {
        type: TemporalType.MONTH_RANGE,
        startDate: params.monthStart,
        endDate: params.monthEnd,
        year: params.year || new Date().getFullYear()
      };
    }
    
    // Quarter
    if (params.quarter) {
      return {
        type: TemporalType.QUARTER,
        quarter: params.quarter,
        year: params.year || new Date().getFullYear()
      };
    }
    
    // Semester
    if (params.semester) {
      return {
        type: TemporalType.SEMESTER,
        semester: params.semester,
        year: params.year || new Date().getFullYear()
      };
    }
    
    // monthCount for range queries
    if (params.monthCount) {
      return {
        type: TemporalType.LAST_N_MONTHS,
        monthCount: params.monthCount,
        year: params.year || new Date().getFullYear()
      };
    }
    
    // Specific month
    if (params.month) {
      return {
        type: TemporalType.SPECIFIC_MONTH,
        month: params.month,
        year: params.year || new Date().getFullYear()
      };
    }
    
    // Full year
    if (params.year && !params.month) {
      return {
        type: TemporalType.FULL_YEAR,
        year: params.year
      };
    }
    
    // Default to most recent period
    return {
      type: TemporalType.SPECIFIC_PERIOD
    };
  }
}
