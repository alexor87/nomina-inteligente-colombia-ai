
/**
 * Utility functions for parsing and formatting period dates
 */

export interface PeriodDateRange {
  startDate: string;
  endDate: string;
}

/**
 * Parse a period string and return the actual date range
 * Examples: "Enero 2024", "2024-01", "Enero de 2024"
 */
export const parsePeriodToDateRange = (periodo: string): PeriodDateRange => {
  // Clean up the period string
  const cleanPeriod = periodo.toLowerCase().trim();
  
  // Try to extract month and year
  const monthNames = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  let year: number;
  let month: number;
  
  // Pattern 1: "Enero 2024" or "Enero de 2024"
  const monthYearMatch = cleanPeriod.match(/(\w+)\s+(?:de\s+)?(\d{4})/);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1];
    year = parseInt(monthYearMatch[2]);
    month = monthNames[monthName as keyof typeof monthNames];
    
    if (month !== undefined) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    }
  }
  
  // Pattern 2: "2024-01" or "2024/01"
  const yearMonthMatch = cleanPeriod.match(/(\d{4})[-/](\d{1,2})/);
  if (yearMonthMatch) {
    year = parseInt(yearMonthMatch[1]);
    month = parseInt(yearMonthMatch[2]) - 1; // Month is 0-indexed
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
  
  // Pattern 3: Just year "2024"
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

/**
 * Format a date range for display
 */
export const formatPeriodDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = monthNames[start.getMonth()];
  const year = start.getFullYear();
  
  // If same month, show "1 - 31 /Ene/ 2024"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startDay} - ${endDay} /${month}/ ${year}`;
  }
  
  // If different months, show full range
  const endMonth = monthNames[end.getMonth()];
  const endYear = end.getFullYear();
  
  return `${startDay}/${month}/${year} - ${endDay}/${endMonth}/${endYear}`;
};

/**
 * Get the period name from a date range
 */
export const getPeriodNameFromDates = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // If it's a full month
  if (start.getDate() === 1 && 
      end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
      start.getMonth() === end.getMonth()) {
    return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  }
  
  // Custom range
  return formatPeriodDateRange(startDate, endDate);
};
