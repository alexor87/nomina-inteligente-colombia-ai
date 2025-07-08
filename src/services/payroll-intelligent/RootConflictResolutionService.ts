
import { supabase } from '@/integrations/supabase/client';

export interface RootConflictResolutionResult {
  success: boolean;
  message: string;
  conflictsResolved: number;
  periodsDeleted: number;
  periodsUpdated: number;
  periodsCreated: number;
  errors: string[];
  detailedLog: string[];
}

export class RootConflictResolutionService {
  
  /**
   * CORRECCIÓN DE RAÍZ COMPLETA - Resuelve conflictos de numeración desde la base
   */
  static async executeRootCorrection(companyId: string): Promise<RootConflictResolutionResult> {
    console.log('🔧 INICIANDO CORRECCIÓN DE RAÍZ COMPLETA');
    
    const result: RootConflictResolutionResult = {
      success: false,
      message: '',
      conflictsResolved: 0,
      periodsDeleted: 0,
      periodsUpdated: 0,
      periodsCreated: 0,
      errors: [],
      detailedLog: []
    };
    
    try {
      // FASE 1: Detección de conflictos de numeración real
      console.log('📋 FASE 1: Detectando conflictos de numeración');
      result.detailedLog.push('FASE 1: Detectando conflictos de numeración');
      
      const numberingConflicts = await this.detectNumberingConflicts(companyId);
      result.detailedLog.push(`Conflictos encontrados: ${numberingConflicts.length}`);
      
      // FASE 2: Validación de fechas vs numeración
      console.log('📋 FASE 2: Validando fechas vs numeración');
      result.detailedLog.push('FASE 2: Validando fechas vs numeración');
      
      const dateValidationIssues = await this.validateDatesVsNumbers(companyId);
      result.detailedLog.push(`Períodos con fechas incorrectas: ${dateValidationIssues.length}`);
      
      // FASE 3: Limpieza masiva de períodos problemáticos
      console.log('📋 FASE 3: Limpieza masiva');
      result.detailedLog.push('FASE 3: Limpieza masiva de períodos problemáticos');
      
      const cleanupResult = await this.massiveCleanup(companyId);
      result.periodsDeleted = cleanupResult.deleted;
      result.detailedLog.push(`Períodos eliminados: ${cleanupResult.deleted}`);
      
      // FASE 4: Resolución inteligente de conflictos
      console.log('📋 FASE 4: Resolución inteligente de conflictos');
      result.detailedLog.push('FASE 4: Resolución inteligente de conflictos');
      
      const resolutionResult = await this.intelligentConflictResolution(companyId);
      result.conflictsResolved = resolutionResult.resolved;
      result.periodsUpdated = resolutionResult.updated;
      result.detailedLog.push(`Conflictos resueltos: ${resolutionResult.resolved}`);
      result.detailedLog.push(`Períodos actualizados: ${resolutionResult.updated}`);
      
      // FASE 5: Generación de períodos faltantes
      console.log('📋 FASE 5: Generando períodos faltantes');
      result.detailedLog.push('FASE 5: Generando períodos faltantes');
      
      const generationResult = await this.generateMissingPeriods(companyId);
      result.periodsCreated = generationResult.created;
      result.detailedLog.push(`Períodos creados: ${generationResult.created}`);
      
      // FASE 6: Validación final
      console.log('📋 FASE 6: Validación final');
      result.detailedLog.push('FASE 6: Validación final');
      
      const finalValidation = await this.finalValidation(companyId);
      result.detailedLog.push(`Validación final: ${finalValidation.isValid ? 'EXITOSA' : 'FALLÓ'}`);
      
      result.success = finalValidation.isValid;
      result.message = result.success 
        ? `✅ Corrección de raíz completada: ${result.conflictsResolved} conflictos resueltos, ${result.periodsDeleted} períodos eliminados, ${result.periodsUpdated} actualizados, ${result.periodsCreated} creados`
        : '❌ Corrección parcial: algunos problemas persisten';
      
      console.log('🎉 CORRECCIÓN DE RAÍZ COMPLETADA:', result);
      return result;
      
    } catch (error) {
      console.error('❌ ERROR EN CORRECCIÓN DE RAÍZ:', error);
      result.errors.push(`Error crítico: ${error.message}`);
      result.message = 'Error crítico durante la corrección de raíz';
      return result;
    }
  }
  
  /**
   * FASE 1: Detectar conflictos reales de numeración
   */
  private static async detectNumberingConflicts(companyId: string): Promise<Array<{
    numero: number;
    periods: any[];
    correctPeriod?: any;
    conflictPeriods: any[];
  }>> {
    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal')
      .not('numero_periodo_anual', 'is', null)
      .order('numero_periodo_anual', { ascending: true });
    
    if (error) throw error;
    if (!periods) return [];
    
    // Agrupar por número de período
    const numberGroups = new Map<number, any[]>();
    periods.forEach(period => {
      const num = period.numero_periodo_anual;
      if (!numberGroups.has(num)) {
        numberGroups.set(num, []);
      }
      numberGroups.get(num)!.push(period);
    });
    
    // Identificar conflictos (más de un período con el mismo número)
    const conflicts = [];
    for (const [numero, periodList] of numberGroups) {
      if (periodList.length > 1) {
        // Determinar cuál tiene las fechas correctas para ese número
        const correctPeriod = this.findCorrectPeriodForNumber(numero, periodList);
        const conflictPeriods = periodList.filter(p => p.id !== correctPeriod?.id);
        
        conflicts.push({
          numero,
          periods: periodList,
          correctPeriod,
          conflictPeriods
        });
        
        console.log(`🔍 Conflicto #${numero}: ${periodList.length} períodos`, {
          correct: correctPeriod?.periodo,
          conflicts: conflictPeriods.map(p => p.periodo)
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * FASE 2: Validar fechas vs numeración
   */
  private static async validateDatesVsNumbers(companyId: string): Promise<Array<{
    period: any;
    expectedNumber: number;
    issue: string;
  }>> {
    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal')
      .not('numero_periodo_anual', 'is', null);
    
    if (error) throw error;
    if (!periods) return [];
    
    const issues = [];
    
    for (const period of periods) {
      const expectedNumber = this.calculateCorrectBiweeklyNumber(period.fecha_inicio);
      
      if (period.numero_periodo_anual !== expectedNumber) {
        const issue = `Período ${period.periodo}: tiene #${period.numero_periodo_anual} pero debería tener #${expectedNumber} según su fecha_inicio`;
        
        issues.push({
          period,
          expectedNumber,
          issue
        });
        
        console.log(`❌ ${issue}`);
      }
    }
    
    return issues;
  }
  
  /**
   * FASE 3: Limpieza masiva de períodos problemáticos
   */
  private static async massiveCleanup(companyId: string): Promise<{ deleted: number }> {
    let totalDeleted = 0;
    
    // 1. Eliminar períodos cancelados
    const { data: canceledPeriods } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, estado')
      .eq('company_id', companyId)
      .eq('estado', 'cancelado');
    
    if (canceledPeriods && canceledPeriods.length > 0) {
      console.log(`🗑️ Eliminando ${canceledPeriods.length} períodos cancelados`);
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .delete()
        .eq('company_id', companyId)
        .eq('estado', 'cancelado');
      
      if (!error) {
        totalDeleted += canceledPeriods.length;
      }
    }
    
    // 2. Eliminar períodos con fechas anómalas (cross-month)
    const { data: anomalousPeriods } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal');
    
    if (anomalousPeriods) {
      const periodsToDelete = anomalousPeriods.filter(period => {
        const startDate = new Date(period.fecha_inicio);
        const endDate = new Date(period.fecha_fin);
        
        // Detectar períodos que cruzan meses de forma anómala
        const crossMonth = startDate.getMonth() !== endDate.getMonth();
        const isStandardCrossMonth = this.isStandardBiweeklyPeriod(period.fecha_inicio, period.fecha_fin);
        
        return crossMonth && !isStandardCrossMonth;
      });
      
      if (periodsToDelete.length > 0) {
        console.log(`🗑️ Eliminando ${periodsToDelete.length} períodos con fechas anómalas`);
        
        for (const period of periodsToDelete) {
          const { error } = await supabase
            .from('payroll_periods_real')
            .delete()
            .eq('id', period.id);
          
          if (!error) {
            totalDeleted++;
            console.log(`🗑️ Eliminado: ${period.periodo}`);
          }
        }
      }
    }
    
    return { deleted: totalDeleted };
  }
  
  /**
   * FASE 4: Resolución inteligente de conflictos
   */
  private static async intelligentConflictResolution(companyId: string): Promise<{
    resolved: number;
    updated: number;
  }> {
    const conflicts = await this.detectNumberingConflicts(companyId);
    let resolved = 0;
    let updated = 0;
    
    for (const conflict of conflicts) {
      console.log(`🔧 Resolviendo conflicto #${conflict.numero}`);
      
      // Para cada período conflictivo, recalcular su numeración correcta
      for (const conflictPeriod of conflict.conflictPeriods) {
        const correctNumber = this.calculateCorrectBiweeklyNumber(conflictPeriod.fecha_inicio);
        
        console.log(`🔧 Corrigiendo ${conflictPeriod.periodo}: ${conflictPeriod.numero_periodo_anual} → ${correctNumber}`);
        
        const { error } = await supabase
          .from('payroll_periods_real')
          .update({
            numero_periodo_anual: correctNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', conflictPeriod.id);
        
        if (!error) {
          updated++;
        }
      }
      
      resolved++;
    }
    
    return { resolved, updated };
  }
  
  /**
   * FASE 5: Generar períodos faltantes con fechas estándar
   */
  private static async generateMissingPeriods(companyId: string): Promise<{ created: number }> {
    // Obtener períodos existentes
    const { data: existingPeriods } = await supabase
      .from('payroll_periods_real')
      .select('numero_periodo_anual')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal')
      .not('numero_periodo_anual', 'is', null);
    
    const existingNumbers = new Set(existingPeriods?.map(p => p.numero_periodo_anual) || []);
    
    let created = 0;
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    // Generar períodos faltantes 1-24
    for (let periodNumber = 1; periodNumber <= 24; periodNumber++) {
      if (!existingNumbers.has(periodNumber)) {
        const { startDate, endDate, monthName } = this.calculateStandardPeriodDates(periodNumber);
        const isFirstHalf = (periodNumber % 2) === 1;
        
        const periodName = isFirstHalf 
          ? `1 - 15 ${monthName} 2025`
          : `16 - ${endDate.getDate()} ${monthName} 2025`;
        
        console.log(`➕ Creando período faltante #${periodNumber}: ${periodName}`);
        
        const { error } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            fecha_inicio: startDate.toISOString().split('T')[0],
            fecha_fin: endDate.toISOString().split('T')[0],
            tipo_periodo: 'quincenal',
            numero_periodo_anual: periodNumber,
            periodo: periodName,
            estado: 'borrador',
            empleados_count: 0,
            total_devengado: 0,
            total_deducciones: 0,
            total_neto: 0
          });
        
        if (!error) {
          created++;
        }
      }
    }
    
    return { created };
  }
  
  /**
   * FASE 6: Validación final
   */
  private static async finalValidation(companyId: string): Promise<{ isValid: boolean; issues: string[] }> {
    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal')
      .order('numero_periodo_anual', { ascending: true });
    
    if (error) throw error;
    
    const issues = [];
    
    // Verificar numeración secuencial
    const numbers = periods?.map(p => p.numero_periodo_anual).filter(n => n !== null).sort((a, b) => a - b) || [];
    
    // Buscar duplicados
    const duplicates = numbers.filter((num, index) => numbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      issues.push(`Números duplicados encontrados: ${duplicates.join(', ')}`);
    }
    
    // Verificar rango correcto (1-24)
    const invalidNumbers = numbers.filter(n => n < 1 || n > 24);
    if (invalidNumbers.length > 0) {
      issues.push(`Números fuera de rango: ${invalidNumbers.join(', ')}`);
    }
    
    // Verificar fechas vs numeración
    if (periods) {
      for (const period of periods) {
        if (period.numero_periodo_anual) {
          const expectedNumber = this.calculateCorrectBiweeklyNumber(period.fecha_inicio);
          if (period.numero_periodo_anual !== expectedNumber) {
            issues.push(`${period.periodo}: número ${period.numero_periodo_anual} no coincide con fechas (esperado: ${expectedNumber})`);
          }
        }
      }
    }
    
    console.log(`✅ Validación final: ${issues.length === 0 ? 'EXITOSA' : 'PROBLEMAS ENCONTRADOS'}`);
    if (issues.length > 0) {
      console.log('❌ Problemas encontrados:', issues);
    }
    
    return { isValid: issues.length === 0, issues };
  }
  
  /**
   * Helpers
   */
  private static findCorrectPeriodForNumber(numero: number, periods: any[]): any {
    // Para un número dado, encontrar cuál período tiene las fechas correctas
    for (const period of periods) {
      const expectedNumber = this.calculateCorrectBiweeklyNumber(period.fecha_inicio);
      if (expectedNumber === numero) {
        return period;
      }
    }
    
    // Si ninguno tiene fechas correctas, mantener el que esté cerrado o más reciente
    const closedPeriod = periods.find(p => p.estado === 'cerrado');
    if (closedPeriod) return closedPeriod;
    
    return periods.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }
  
  private static calculateCorrectBiweeklyNumber(startDate: string): number {
    const parts = startDate.split('-');
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const monthsCompleted = month - 1;
    const biweekliesFromCompletedMonths = monthsCompleted * 2;
    const biweeklyInCurrentMonth = day <= 15 ? 1 : 2;
    
    return biweekliesFromCompletedMonths + biweeklyInCurrentMonth;
  }
  
  private static isStandardBiweeklyPeriod(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Verificar si es una quincena estándar (1-15 o 16-fin de mes)
    const startDay = start.getDate();
    const endDay = end.getDate();
    const sameMonth = start.getMonth() === end.getMonth();
    
    if (sameMonth) {
      return (startDay === 1 && endDay === 15) || (startDay === 16);
    }
    
    // Para quincenas que cruzan mes (solo la segunda quincena de un mes)
    return startDay === 16 && start.getMonth() + 1 === end.getMonth();
  }
  
  private static calculateStandardPeriodDates(periodNumber: number): {
    startDate: Date;
    endDate: Date;
    monthName: string;
  } {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const monthIndex = Math.floor((periodNumber - 1) / 2);
    const isFirstHalf = (periodNumber % 2) === 1;
    
    const year = 2025;
    
    let startDate: Date;
    let endDate: Date;
    
    if (isFirstHalf) {
      // Primera quincena (1-15)
      startDate = new Date(year, monthIndex, 1);
      endDate = new Date(year, monthIndex, 15);
    } else {
      // Segunda quincena (16-fin de mes)
      startDate = new Date(year, monthIndex, 16);
      endDate = new Date(year, monthIndex + 1, 0); // Último día del mes
    }
    
    return {
      startDate,
      endDate,
      monthName: monthNames[monthIndex]
    };
  }
}
