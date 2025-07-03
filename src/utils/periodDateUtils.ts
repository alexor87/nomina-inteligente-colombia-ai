
/**
 * Utility functions for parsing and formatting period dates
 */

export interface PeriodDateRange {
  startDate: string;
  endDate: string;
}

/**
 * Parse a period string and return the actual date range
 * Examples: "Enero 2024", "2024-01", "Enero de 2024", "16 Jul - 30 Jul 2025"
 */
export const parsePeriodToDateRange = (periodo: string): PeriodDateRange => {
  // Clean up the period string
  const cleanPeriod = periodo.trim();
  
  console.log('Parsing period:', cleanPeriod);
  
  // Pattern 1: Date range format like "16 Jul - 30 Jul 2025" or "16/06/2025 - 30/06/2025"
  const dateRangeMatch = cleanPeriod.match(/(\d{1,2})[\s\/](\w{3}|\d{1,2})[\s\/]?(\d{4})?\s*-\s*(\d{1,2})[\s\/](\w{3}|\d{1,2})[\s\/](\d{4})/);
  if (dateRangeMatch) {
    const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = dateRangeMatch;
    
    const monthMap: { [key: string]: string } = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };
    
    let startMonthNum, endMonthNum;
    
    // Check if month is text (Jul) or number (07)
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
    
    console.log('Parsed date range:', { startDateFormatted, endDateFormatted });
    
    return {
      startDate: startDateFormatted,
      endDate: endDateFormatted
    };
  }
  
  // Pattern 2: ISO date range like "2025-07-16 - 2025-07-30"
  const isoRangeMatch = cleanPeriod.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
  if (isoRangeMatch) {
    const [, startDate, endDate] = isoRangeMatch;
    console.log('Parsed ISO date range:', { startDate, endDate });
    return { startDate, endDate };
  }
  
  // Try to extract month and year from traditional format
  const monthNames = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  let year: number;
  let month: number;
  
  // Pattern 3: "Enero 2024" or "Enero de 2024"
  const monthYearMatch = cleanPeriod.toLowerCase().match(/(\w+)\s+(?:de\s+)?(\d{4})/);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1];
    year = parseInt(monthYearMatch[2]);
    month = monthNames[monthName as keyof typeof monthNames];
    
    if (month !== undefined) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month
      
      const result = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
      
      console.log('Parsed month-year format:', result);
      return result;
    }
  }
  
  // Pattern 4: "2024-01" or "2024/01"
  const yearMonthMatch = cleanPeriod.match(/(\d{4})[-/](\d{1,2})/);
  if (yearMonthMatch) {
    year = parseInt(yearMonthMatch[1]);
    month = parseInt(yearMonthMatch[2]) - 1; // Month is 0-indexed
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const result = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    console.log('Parsed year-month format:', result);
    return result;
  }
  
  // Pattern 5: Just year "2024"
  const yearMatch = cleanPeriod.match(/^(\d{4})$/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
    const result = {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
    
    console.log('Parsed year format:', result);
    return result;
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
 * Format a date range for display - CORREGIDO PARA PERÍODOS QUINCENALES
 */
export const formatPeriodDateRange = (startDate: string, endDate: string): string => {
  console.log('🔍 FORMATEO DE FECHAS:', { startDate, endDate });
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  console.log('📅 DÍAS CALCULADOS:', { startDay, endDay, startMonth, endMonth, startYear, endYear });
  
  // Si es el mismo mes y año, mostrar formato quincenal
  if (start.getMonth() === end.getMonth() && startYear === endYear) {
    const result = `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    console.log('✅ FORMATO QUINCENAL:', result);
    return result;
  }
  
  // Si son diferentes meses o años, mostrar rango completo
  const result = `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  console.log('✅ FORMATO RANGO COMPLETO:', result);
  return result;
};

/**
 * Get the period name from a date range - MEJORADO PARA QUINCENALES
 */
export const getPeriodNameFromDates = (startDate: string, endDate: string): string => {
  console.log('🏷️ GENERANDO NOMBRE DE PERÍODO:', { startDate, endDate });
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  console.log('📊 ANÁLISIS DE FECHAS:', { 
    startDay, endDay, startMonth, endMonth, startYear, endYear,
    sameMonth: startMonth === endMonth,
    sameYear: startYear === endYear
  });
  
  // DETECCIÓN ESPECÍFICA DE PERÍODOS QUINCENALES
  if (startMonth === endMonth && startYear === endYear) {
    const monthName = monthNames[startMonth];
    const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
    
    // Primera quincena (1-15)
    if (startDay === 1 && endDay === 15) {
      const result = `1 - 15 ${monthName} ${startYear}`;
      console.log('✅ PRIMERA QUINCENA DETECTADA:', result);
      return result;
    }
    
    // Segunda quincena (16-fin de mes)
    if (startDay === 16 && endDay === lastDayOfMonth) {
      const result = `16 - ${lastDayOfMonth} ${monthName} ${startYear}`;
      console.log('✅ SEGUNDA QUINCENA DETECTADA:', result);
      return result;
    }
    
    // Período personalizado dentro del mismo mes
    const result = `${startDay} - ${endDay} ${monthName} ${startYear}`;
    console.log('✅ PERÍODO PERSONALIZADO MISMO MES:', result);
    return result;
  }
  
  // Si es un mes completo
  if (startDay === 1 && 
      endDay === new Date(endYear, endMonth + 1, 0).getDate() &&
      startMonth === endMonth && startYear === endYear) {
    const result = `${monthNames[startMonth]} ${startYear}`;
    console.log('✅ MES COMPLETO DETECTADO:', result);
    return result;
  }
  
  // Rango personalizado entre meses diferentes
  const result = formatPeriodDateRange(startDate, endDate);
  console.log('✅ RANGO PERSONALIZADO:', result);
  return result;
};
