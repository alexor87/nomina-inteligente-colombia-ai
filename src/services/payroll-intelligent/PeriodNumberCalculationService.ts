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
      
      const year = new Date(startDate).getFullYear();
      let calculatedNumber: number;
      
      // Calcular número según tipo de período
      switch (tipoPeriodo) {
        case 'mensual':
          calculatedNumber = this.calculateMonthlyPeriodNumber(startDate);
          break;
        case 'quincenal':
          calculatedNumber = await this.calculateBiweeklyPeriodNumber(companyId, startDate, year);
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
   * Calcula número para período mensual (1-12)
   */
  private static calculateMonthlyPeriodNumber(startDate: string): number {
    const date = new Date(startDate);
    return date.getMonth() + 1; // getMonth() es 0-indexed
  }
  
  /**
   * Calcula número para período quincenal (conteo cronológico correcto)
   */
  private static async calculateBiweeklyPeriodNumber(
    companyId: string, 
    startDate: string, 
    year: number
  ): Promise<number> {
    const startDay = new Date(startDate).getDate();
    const startMonth = new Date(startDate).getMonth() + 1;
    
    console.log('📊 CALCULANDO QUINCENA DETALLADO:', { 
      startDate, startDay, startMonth, year 
    });
    
    // Contar quincenas hasta este punto en el año
    let biweeklyCount = 0;
    
    // Contar quincenas de los meses completos anteriores
    for (let month = 1; month < startMonth; month++) {
      biweeklyCount += 2; // Cada mes tiene exactamente 2 quincenas
      console.log(`📊 Mes ${month}: +2 quincenas = Total: ${biweeklyCount}`);
    }
    
    // Para el mes actual, determinar si es primera o segunda quincena
    if (startDay <= 15) {
      biweeklyCount += 1; // Primera quincena del mes actual
      console.log(`✅ Primera quincena del mes ${startMonth} = quincena ${biweeklyCount}`);
    } else {
      biweeklyCount += 2; // Segunda quincena del mes actual (incluye la primera)
      console.log(`✅ Segunda quincena del mes ${startMonth} = quincena ${biweeklyCount}`);
    }
    
    console.log('🎯 RESULTADO QUINCENA FINAL:', biweeklyCount);
    
    // Verificar contra cálculo independiente
    const verification = this.verifyBiweeklyCalculation(startDate);
    if (verification !== biweeklyCount) {
      console.error('❌ INCONSISTENCIA EN CÁLCULO:', {
        original: biweeklyCount,
        verification,
        startDate
      });
    } else {
      console.log('✅ CÁLCULO VERIFICADO CORRECTO:', biweeklyCount);
    }
    
    return biweeklyCount;
  }
  
  /**
   * Verificación independiente del cálculo quincenal
   */
  private static verifyBiweeklyCalculation(startDate: string): number {
    const date = new Date(startDate);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    
    // Meses completos anteriores × 2
    const previousMonthsQuincenas = (month - 1) * 2;
    
    // Quincena actual del mes
    const currentQuincena = day <= 15 ? 1 : 2;
    
    const total = previousMonthsQuincenas + currentQuincena;
    
    console.log('🔍 VERIFICACIÓN INDEPENDIENTE:', {
      month,
      day,
      previousMonthsQuincenas,
      currentQuincena,
      total
    });
    
    return total;
  }
  
  /**
   * Calcula número para período semanal (semana ISO del año)
   */
  private static calculateWeeklyPeriodNumber(startDate: string): number {
    const date = new Date(startDate);
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
   * Valida coherencia entre fechas y tipo de período
   */
  private static validatePeriodCoherence(
    startDate: string, 
    endDate: string, 
    tipoPeriodo: string
  ): { warning?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
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
   * Genera nombre semántico del período basado en el número
   */
  static getSemanticPeriodName(
    numeroAnual: number | null,
    tipoPeriodo: string,
    year: number,
    fallbackName: string
  ): string {
    if (!numeroAnual) {
      return fallbackName; // Períodos antiguos sin numeración
    }
    
    switch (tipoPeriodo) {
      case 'mensual':
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${monthNames[numeroAnual - 1]} ${year}`;
      
      case 'quincenal':
        return `Quincena ${numeroAnual} del ${year}`;
      
      case 'semanal':
        return `Semana ${numeroAnual} del ${year}`;
      
      default:
        return fallbackName;
    }
  }
  
  /**
   * Método para testing y diagnóstico
   */
  static async runDiagnosticTest(): Promise<void> {
    console.log('🧪 EJECUTANDO PRUEBAS DE DIAGNÓSTICO');
    
    const testCases = [
      { date: '2025-01-01', expected: 1, description: '1-15 Enero' },
      { date: '2025-01-16', expected: 2, description: '16-31 Enero' },
      { date: '2025-07-01', expected: 13, description: '1-15 Julio' },
      { date: '2025-07-16', expected: 14, description: '16-31 Julio' },
      { date: '2025-09-01', expected: 17, description: '1-15 Septiembre' },
      { date: '2025-09-16', expected: 18, description: '16-30 Septiembre' },
    ];
    
    for (const test of testCases) {
      const calculated = this.verifyBiweeklyCalculation(test.date);
      const isCorrect = calculated === test.expected;
      
      console.log(`🧪 ${test.description}: Esperado=${test.expected}, Calculado=${calculated}, ✅=${isCorrect}`);
      
      if (!isCorrect) {
        console.error(`❌ ERROR EN CASO DE PRUEBA: ${test.description}`);
      }
    }
  }
}
