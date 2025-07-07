/**
 * DEPRECADO: Este archivo está siendo migrado al PeriodDisplayService
 * Se mantiene solo para compatibilidad hacia atrás
 */

import { PeriodDisplayService } from '@/services/payroll-intelligent/PeriodDisplayService';

export interface PeriodDateRange {
  startDate: string;
  endDate: string;
}

/**
 * @deprecated Use PeriodDisplayService.generatePeriodName instead
 */
export const getPeriodNameFromDates = (startDate: string, endDate: string): string => {
  console.warn('getPeriodNameFromDates is deprecated. Use PeriodDisplayService.generatePeriodName instead');
  return PeriodDisplayService.generatePeriodName(startDate, endDate);
};

/**
 * @deprecated Use PeriodDisplayService.generatePeriodName instead
 */
export const formatPeriodDateRange = (startDate: string, endDate: string): string => {
  console.warn('formatPeriodDateRange is deprecated. Use PeriodDisplayService.generatePeriodName instead');
  return PeriodDisplayService.generatePeriodName(startDate, endDate);
};

/**
 * Parse a period string and return the actual date range
 * This function is kept for parsing existing period names from the database
 */
export const parsePeriodToDateRange = (periodo: string): PeriodDateRange => {
  const cleanPeriod = periodo.trim();
  
  // Pattern 1: Date range format like "16 Jul - 30 Jul 2025" or "16/06/2025 - 30/06/2025"
  const dateRangeMatch = cleanPeriod.match(/(\d{1,2})[\s\/](\w{3}|\d{1,2})[\s\/]?(\d{4})?\s*-\s*(\d{1,2})[\s\/](\w{3}|\d{1,2})[\s\/](\d{4})/);
  if (dateRangeMatch) {
    const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = dateRangeMatch;
    
    const monthMap: { [key: string]: string } = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };
    
    let startMonthNum, endMonthNum;
    
    if (isNaN(parseInt(startMonth))) {
      startMonthNum = monthMap[startMonth.toLowerCase()] || '01';
    } else {
      startMonthNum = startMonth.padStart(2, '0');
    }
    
    if (isNaN(parseInt(endMonth))) {
      endMonthNum = monthMap[endMonth.toLowerCase()] || '12';
    } else {
      endMonthNum = endMonth.padStart(2, '0');
    }
    
    const year = startYear || endYear;
    const startDateFormatted = `${year}-${startMonthNum}-${startDay.padStart(2, '0')}`;
    const endDateFormatted = `${endYear}-${endMonthNum}-${endDay.padStart(2, '0')}`;
    
    return { startDate: startDateFormatted, endDate: endDateFormatted };
  }
  
  // Pattern 2: ISO date range like "2025-07-16 - 2025-07-30"
  const isoRangeMatch = cleanPeriod.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
  if (isoRangeMatch) {
    const [, startDate, endDate] = isoRangeMatch;
    return { startDate, endDate };
  }
  
  const monthNames = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  let year: number;
  let month: number;
  
  const monthYearMatch = cleanPeriod.toLowerCase().match(/(\w+)\s+(?:de\s+)?(\d{4})/);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1];
    year = parseInt(monthYearMatch[2]);
    month = monthNames[monthName as keyof typeof monthNames];
    
    if (month !== undefined) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    }
  }
  
  const yearMonthMatch = cleanPeriod.match(/(\d{4})[-/](\d{1,2})/);
  if (yearMonthMatch) {
    year = parseInt(yearMonthMatch[1]);
    month = parseInt(yearMonthMatch[2]) - 1;
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
  
  const yearMatch = cleanPeriod.match(/^(\d{4})$/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }
  
  // Fallback: use current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);
  
  console.warn(`Could not parse period "${periodo}", using current month as fallback`);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};
