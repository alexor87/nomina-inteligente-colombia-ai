import { getWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface PeriodNumberResult {
  success: boolean;
  numero_periodo_anual?: number;
  warning?: string;
  error?: string;
}

export class PeriodNumberCalculationService {
  
  /**
   * Calcula el número ordinal del período dentro del año
   */
  static async calculatePeriodNumber(
    companyId: string,
    startDate: string,
    endDate: string,
    tipoPeriodo: 'mensual' | 'quincenal' | 'semanal'
  ): Promise<PeriodNumberResult> {
    try {
      console.log('📊 CALCULANDO NÚMERO DE PERÍODO:', { 
        companyId, startDate, endDate, tipoPeriodo 
      });
      
      // ✅ CORRECCIÓN: Parsing manual para evitar problemas de timezone
      const startParts = startDate.split('-');
      const year = parseInt(startParts[0]);
      let calculatedNumber: number;
      
      // Calcular número según tipo de período
      switch (tipoPeriodo) {
        case 'mensual':
          calculatedNumber = this.calculateMonthlyPeriodNumber(startDate);
          break;
        case 'quincenal':
          calculatedNumber = this.calculateBiweeklyPeriodNumber(startDate, year);
          break;
        case 'semanal':
          calculatedNumber = this.calculateWeeklyPeriodNumber(startDate);
          break;
        default:
          return { success: false, error: 'Tipo de período no soportado' };
      }
      
      console.log('🎯 NÚMERO CALCULADO FINAL:', calculatedNumber);
      
      // TEMPORAL: Deshabilitar validación de duplicados para diagnóstico
      const skipDuplicateCheck = process.env.NODE_ENV === 'development';
      
      if (!skipDuplicateCheck) {
        // Validar que no exista ya ese número para la empresa/año/tipo
        const isDuplicate = await this.checkDuplicateNumber(
          companyId, year, tipoPeriodo, calculatedNumber
        );
        
        if (isDuplicate) {
          console.warn('⚠️ PERÍODO DUPLICADO DETECTADO:', calculatedNumber);
          return {
            success: false,
            error: `Ya existe un período ${tipoPeriodo} #${calculatedNumber} para el año ${year}`
          };
        }
      } else {
        console.log('🚧 VALIDACIÓN DE DUPLICADOS DESHABILITADA PARA DIAGNÓSTICO');
      }
      
      // Validar coherencia de fechas vs periodicidad
      const coherenceCheck = this.validatePeriodCoherence(startDate, endDate, tipoPeriodo);
      
      return {
        success: true,
        numero_periodo_anual: calculatedNumber,
        warning: coherenceCheck.warning
      };
      
    } catch (error) {
      console.error('❌ ERROR CALCULANDO NÚMERO DE PERÍODO:', error);
      return { 
        success: false, 
        error: 'Error interno calculando número de período' 
      };
    }
  }
  
  /**
   * ✅ FUNCIÓN CORREGIDA: Calcula número para período mensual (1-12)
   */
  private static calculateMonthlyPeriodNumber(startDate: string): number {
    // ✅ CORRECCIÓN: Parsing manual para evitar problemas de timezone
    const startParts = startDate.split('-');
    const month = parseInt(startParts[1]); // Mes (1-12)
    
    console.log('📊 CÁLCULO MENSUAL CORREGIDO:', { startDate, month });
    
    return month;
  }
  
  /**
   * ✅ FUNCIÓN CORREGIDA: Calcula número para período quincenal (lógica unificada)
   */
  private static calculateBiweeklyPeriodNumber(startDate: string, year: number): number {
    console.log('🔢 CALCULANDO NÚMERO QUINCENAL CORREGIDO para:', startDate);
    
    // Parsing manual para evitar problemas de timezone
    const parts = startDate.split('-');
    const yearParsed = parseInt(parts[0]);
    const month = parseInt(parts[1]); // 1-12
    const day = parseInt(parts[2]);
    
    console.log('📊 Datos parseados:', { year: yearParsed, month, day });
    
    // Verificar que sea año 2025
    if (yearParsed !== 2025) {
      console.warn('⚠️ Año diferente a 2025:', yearParsed);
    }
    
    // LÓGICA CORREGIDA: (mes-1) * 2 + quincena_del_mes
    const monthsCompleted = month - 1; // Meses completados antes del actual
    const biweekliesFromCompletedMonths = monthsCompleted * 2;
    
    // Determinar si es primera (1-15) o segunda quincena (16-fin)
    const biweeklyInCurrentMonth = day <= 15 ? 1 : 2;
    
    const totalBiweekly = biweekliesFromCompletedMonths + biweeklyInCurrentMonth;
    
    console.log('🧮 Cálculo detallado:', {
      monthsCompleted,
      biweekliesFromCompletedMonths,
      biweeklyInCurrentMonth: day <= 15 ? 'Primera quincena' : 'Segunda quincena',
      totalBiweekly
    });
    
    // Validar rango (debe estar entre 1 y 24 para el año)
    if (totalBiweekly < 1 || totalBiweekly > 24) {
      console.error('❌ NÚMERO QUINCENAL FUERA DE RANGO:', totalBiweekly);
    }
    
    return totalBiweekly;
  }
  
  /**
   * ✅ FUNCIÓN CORREGIDA: Calcula número para período semanal (semana ISO del año)
   */
  private static calculateWeeklyPeriodNumber(startDate: string): number {
    // ✅ CORRECCIÓN: Parsing manual para evitar problemas de timezone
    const startParts = startDate.split('-');
    const date = new Date(
      parseInt(startParts[0]),     // year
      parseInt(startParts[1]) - 1, // month (0-indexed)
      parseInt(startParts[2])      // day
    );
    
    console.log('📊 CÁLCULO SEMANAL CORREGIDO:', { 
      startDate, 
      parsedDate: date.toDateString() 
    });
    
    return getWeek(date, { weekStartsOn: 1 }); // Lunes como primer día
  }
  
  /**
   * Verifica si ya existe un período con el mismo número
   */
  private static async checkDuplicateNumber(
    companyId: string,
    year: number,
    tipoPeriodo: string,
    numeroCalculado: number
  ): Promise<boolean> {
    console.log('🔍 VERIFICANDO DUPLICADOS:', {
      companyId, year, tipoPeriodo, numeroCalculado
    });
    
    const { data, error } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, numero_periodo_anual')
      .eq('company_id', companyId)
      .eq('tipo_periodo', tipoPeriodo)
      .eq('numero_periodo_anual', numeroCalculado)
      .gte('fecha_inicio', `${year}-01-01`)
      .lt('fecha_inicio', `${year + 1}-01-01`)
      .limit(1);
    
    if (error) {
      console.error('❌ Error verificando duplicados:', error);
      return false;
    }
    
    const hasDuplicate = data && data.length > 0;
    if (hasDuplicate) {
      console.warn('⚠️ PERÍODO DUPLICADO ENCONTRADO:', data[0]);
    } else {
      console.log('✅ No hay duplicados para número:', numeroCalculado);
    }
    
    return hasDuplicate;
  }
  
  /**
   * ✅ FUNCIÓN CORREGIDA: Valida coherencia entre fechas y tipo de período
   */
  private static validatePeriodCoherence(
    startDate: string, 
    endDate: string, 
    tipoPeriodo: string
  ): { warning?: string } {
    // ✅ CORRECCIÓN: Parsing manual para evitar problemas de timezone
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    
    const start = new Date(
      parseInt(startParts[0]),     // year
      parseInt(startParts[1]) - 1, // month (0-indexed)
      parseInt(startParts[2])      // day
    );
    
    const end = new Date(
      parseInt(endParts[0]),       // year
      parseInt(endParts[1]) - 1,   // month (0-indexed)
      parseInt(endParts[2])        // day
    );
    
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log('📊 VALIDACIÓN DE COHERENCIA CORREGIDA:', { 
      startDate, endDate, diffDays, tipoPeriodo 
    });
    
    let expectedMinDays: number;
    let expectedMaxDays: number;
    
    switch (tipoPeriodo) {
      case 'mensual':
        expectedMinDays = 28;
        expectedMaxDays = 31;
        break;
      case 'quincenal':
        expectedMinDays = 14;
        expectedMaxDays = 16;
        break;
      case 'semanal':
        expectedMinDays = 7;
        expectedMaxDays = 7;
        break;
      default:
        return {};
    }
    
    if (diffDays < expectedMinDays || diffDays > expectedMaxDays) {
      return {
        warning: `Período ${tipoPeriodo} de ${diffDays} días es atípico (esperado: ${expectedMinDays}-${expectedMaxDays} días)`
      };
    }
    
    return {};
  }
  
  /**
   * ✅ FUNCIÓN CORREGIDA: Genera nombre semántico del período basado en el número
   */
  static getSemanticPeriodName(
    numeroAnual: number | null,
    tipoPeriodo: string,
    year: number,
    fallbackName: string
  ): string {
    console.log('🏷️ GENERANDO NOMBRE SEMÁNTICO CORREGIDO:', { 
      numeroAnual, tipoPeriodo, year, fallbackName 
    });
    
    if (!numeroAnual) {
      return fallbackName; // Períodos antiguos sin numeración
    }
    
    let semanticName: string;
    
    switch (tipoPeriodo) {
      case 'mensual':
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        semanticName = `${monthNames[numeroAnual - 1]} ${year}`;
        break;
      
      case 'quincenal':
        semanticName = `Quincena ${numeroAnual} del ${year}`;
        break;
      
      case 'semanal':
        semanticName = `Semana ${numeroAnual} del ${year}`;
        break;
      
      default:
        semanticName = fallbackName;
        break;
    }
    
    console.log('✅ NOMBRE SEMÁNTICO GENERADO:', semanticName);
    return semanticName;
  }
  
  /**
   * Método para testing y diagnóstico - CASOS CORREGIDOS
   */
  static async runDiagnosticTest(): Promise<void> {
    console.log('🧪 EJECUTANDO PRUEBAS DE DIAGNÓSTICO CORREGIDAS');
    
    const testCases = [
      { date: '2025-01-01', expected: 1, description: '1-15 Enero' },
      { date: '2025-01-16', expected: 2, description: '16-31 Enero' },
      { date: '2025-02-01', expected: 3, description: '1-15 Febrero' },
      { date: '2025-02-16', expected: 4, description: '16-28 Febrero' },
      { date: '2025-07-01', expected: 13, description: '1-15 Julio' },
      { date: '2025-07-16', expected: 14, description: '16-31 Julio' },
      { date: '2025-09-01', expected: 17, description: '1-15 Septiembre' },
      { date: '2025-09-16', expected: 18, description: '16-30 Septiembre' },
      { date: '2025-12-01', expected: 23, description: '1-15 Diciembre' },
      { date: '2025-12-16', expected: 24, description: '16-31 Diciembre' },
    ];
    
    for (const test of testCases) {
      const calculated = this.calculateBiweeklyPeriodNumber(test.date, 2025);
      const isCorrect = calculated === test.expected;
      
      console.log(`🧪 ${test.description}: Esperado=${test.expected}, Calculado=${calculated}, ✅=${isCorrect}`);
      
      if (!isCorrect) {
        console.error(`❌ ERROR EN CASO DE PRUEBA: ${test.description}`);
      }
    }
  }
}
