
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

export interface PeriodDiagnostic {
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  numero_periodo_anual: number | null;
  calculated_number: number;
  is_correct: boolean;
  recommended_action: string;
}

export class BiWeeklyDiagnosticService {
  
  /**
   * Diagnóstico completo del sistema de numeración quincenal
   */
  static async runCompleteDiagnostic(companyId: string): Promise<DiagnosticResult> {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DE QUINCENAS');
    
    try {
      const results = {
        existingPeriods: await this.analyzeExistingPeriods(companyId),
        calculationTest: await this.testCalculationLogic(),
        duplicateCheck: await this.findDuplicatesAndConflicts(companyId),
        recommendedActions: []
      };
      
      // Generar recomendaciones basadas en los resultados
      const recommendations = this.generateRecommendations(results);
      
      console.log('📋 RESULTADOS DEL DIAGNÓSTICO:', results);
      console.log('💡 RECOMENDACIONES:', recommendations);
      
      return {
        success: true,
        message: 'Diagnóstico completado exitosamente',
        data: { ...results, recommendations }
      };
      
    } catch (error) {
      console.error('❌ ERROR EN DIAGNÓSTICO:', error);
      return {
        success: false,
        message: 'Error durante el diagnóstico',
        errors: [error.message]
      };
    }
  }
  
  /**
   * Analizar períodos quincenales existentes
   */
  private static async analyzeExistingPeriods(companyId: string): Promise<PeriodDiagnostic[]> {
    console.log('📊 Analizando períodos quincenales existentes...');
    
    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal')
      .order('fecha_inicio', { ascending: true });
      
    if (error) {
      console.error('Error obteniendo períodos:', error);
      return [];
    }
    
    const diagnostics: PeriodDiagnostic[] = [];
    
    for (const period of periods || []) {
      const calculatedNumber = this.calculateCorrectBiweeklyNumber(period.fecha_inicio);
      const isCorrect = period.numero_periodo_anual === calculatedNumber;
      
      diagnostics.push({
        periodo: period.periodo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        numero_periodo_anual: period.numero_periodo_anual,
        calculated_number: calculatedNumber,
        is_correct: isCorrect,
        recommended_action: this.getRecommendedAction(period, calculatedNumber)
      });
      
      console.log(`📅 ${period.periodo}: Actual=${period.numero_periodo_anual}, Calculado=${calculatedNumber}, Correcto=${isCorrect}`);
    }
    
    return diagnostics;
  }
  
  /**
   * Probar la lógica de cálculo con casos conocidos
   */
  private static async testCalculationLogic(): Promise<any> {
    console.log('🧪 Probando lógica de cálculo...');
    
    const testCases = [
      { startDate: '2025-01-01', expected: 1, description: '1-15 Enero' },
      { startDate: '2025-01-16', expected: 2, description: '16-31 Enero' },
      { startDate: '2025-07-01', expected: 13, description: '1-15 Julio' },
      { startDate: '2025-07-16', expected: 14, description: '16-31 Julio' },
      { startDate: '2025-09-01', expected: 17, description: '1-15 Septiembre' },
      { startDate: '2025-09-16', expected: 18, description: '16-30 Septiembre' },
    ];
    
    const results = testCases.map(testCase => {
      const calculated = this.calculateCorrectBiweeklyNumber(testCase.startDate);
      const isCorrect = calculated === testCase.expected;
      
      console.log(`🧪 ${testCase.description}: Esperado=${testCase.expected}, Calculado=${calculated}, ✅=${isCorrect}`);
      
      return {
        ...testCase,
        calculated,
        isCorrect
      };
    });
    
    const allCorrect = results.every(r => r.isCorrect);
    console.log(`🧪 RESULTADO PRUEBAS: ${allCorrect ? '✅ TODAS CORRECTAS' : '❌ HAY ERRORES'}`);
    
    return { results, allCorrect };
  }
  
  /**
   * Encontrar duplicados y conflictos
   */
  private static async findDuplicatesAndConflicts(companyId: string): Promise<any> {
    console.log('🔍 Buscando duplicados y conflictos...');
    
    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal');
      
    if (error || !periods) return { duplicates: [], conflicts: [] };
    
    // Buscar duplicados por fechas
    const dateGroups = periods.reduce((acc, period) => {
      const key = `${period.fecha_inicio}-${period.fecha_fin}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(period);
      return acc;
    }, {});
    
    const duplicates = Object.values(dateGroups).filter((group: any) => group.length > 1);
    
    // Buscar conflictos de numeración
    const numberGroups = periods.reduce((acc, period) => {
      if (period.numero_periodo_anual) {
        const key = period.numero_periodo_anual;
        if (!acc[key]) acc[key] = [];
        acc[key].push(period);
      }
      return acc;
    }, {});
    
    const conflicts = Object.values(numberGroups).filter((group: any) => group.length > 1);
    
    console.log(`🔍 Encontrados: ${duplicates.length} duplicados, ${conflicts.length} conflictos`);
    
    return { duplicates, conflicts };
  }
  
  /**
   * Calcular número correcto de quincena
   */
  private static calculateCorrectBiweeklyNumber(startDate: string): number {
    const date = new Date(startDate);
    const startDay = date.getDate();
    const startMonth = date.getMonth() + 1;
    
    // Contar quincenas de los meses completos anteriores
    let biweeklyCount = 0;
    for (let month = 1; month < startMonth; month++) {
      biweeklyCount += 2;
    }
    
    // Para el mes actual
    if (startDay <= 15) {
      biweeklyCount += 1; // Primera quincena
    } else {
      biweeklyCount += 2; // Segunda quincena
    }
    
    return biweeklyCount;
  }
  
  /**
   * Obtener acción recomendada para un período
   */
  private static getRecommendedAction(period: any, calculatedNumber: number): string {
    if (period.numero_periodo_anual === null) {
      return `Asignar número ${calculatedNumber}`;
    } else if (period.numero_periodo_anual !== calculatedNumber) {
      return `Corregir de ${period.numero_periodo_anual} a ${calculatedNumber}`;
    } else {
      return 'Ninguna acción necesaria';
    }
  }
  
  /**
   * Generar recomendaciones basadas en el diagnóstico
   */
  private static generateRecommendations(results: any): string[] {
    const recommendations = [];
    
    const incorrectPeriods = results.existingPeriods.filter((p: PeriodDiagnostic) => !p.is_correct);
    if (incorrectPeriods.length > 0) {
      recommendations.push(`Corregir ${incorrectPeriods.length} períodos con numeración incorrecta`);
    }
    
    if (results.duplicateCheck.duplicates.length > 0) {
      recommendations.push(`Eliminar ${results.duplicateCheck.duplicates.length} períodos duplicados`);
    }
    
    if (results.duplicateCheck.conflicts.length > 0) {
      recommendations.push(`Resolver ${results.duplicateCheck.conflicts.length} conflictos de numeración`);
    }
    
    if (!results.calculationTest.allCorrect) {
      recommendations.push('Verificar lógica de cálculo de numeración');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando correctamente');
    }
    
    return recommendations;
  }
  
  /**
   * Aplicar correcciones automáticas
   */
  static async applyAutoCorrections(companyId: string): Promise<DiagnosticResult> {
    console.log('🔧 APLICANDO CORRECCIONES AUTOMÁTICAS');
    
    try {
      const diagnostic = await this.runCompleteDiagnostic(companyId);
      if (!diagnostic.success) return diagnostic;
      
      const { existingPeriods } = diagnostic.data;
      const periodsToCorrect = existingPeriods.filter((p: PeriodDiagnostic) => !p.is_correct);
      
      let correctedCount = 0;
      const errors = [];
      
      for (const period of periodsToCorrect) {
        try {
          const { error } = await supabase
            .from('payroll_periods_real')
            .update({ 
              numero_periodo_anual: period.calculated_number,
              updated_at: new Date().toISOString()
            })
            .eq('company_id', companyId)
            .eq('fecha_inicio', period.fecha_inicio)
            .eq('fecha_fin', period.fecha_fin);
            
          if (error) {
            errors.push(`Error corrigiendo ${period.periodo}: ${error.message}`);
          } else {
            correctedCount++;
            console.log(`✅ Corregido: ${period.periodo} → Quincena ${period.calculated_number}`);
          }
        } catch (err) {
          errors.push(`Error procesando ${period.periodo}: ${err.message}`);
        }
      }
      
      return {
        success: true,
        message: `Correcciones aplicadas: ${correctedCount} períodos actualizados`,
        data: { correctedCount, errors },
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      console.error('❌ ERROR APLICANDO CORRECCIONES:', error);
      return {
        success: false,
        message: 'Error aplicando correcciones automáticas',
        errors: [error.message]
      };
    }
  }
}
