
import { supabase } from '@/integrations/supabase/client';

export interface ConflictResolutionResult {
  success: boolean;
  message: string;
  duplicatesRemoved: number;
  periodsCreated: number;
  periodsUpdated: number;
  conflictsResolved: number;
  errors: string[];
}

export class ConflictResolutionService {
  
  /**
   * Ejecutar corrección completa de conflictos de numeración
   */
  static async resolveAllConflicts(companyId: string): Promise<ConflictResolutionResult> {
    console.log('🔧 INICIANDO CORRECCIÓN COMPLETA DE CONFLICTOS');
    
    const result: ConflictResolutionResult = {
      success: false,
      message: '',
      duplicatesRemoved: 0,
      periodsCreated: 0,
      periodsUpdated: 0,
      conflictsResolved: 0,
      errors: []
    };
    
    try {
      // FASE 1: Limpiar duplicados y períodos cancelados
      console.log('📋 FASE 1: Limpieza de duplicados y períodos cancelados');
      const cleanupResult = await this.cleanupDuplicatesAndCanceled(companyId);
      result.duplicatesRemoved = cleanupResult.duplicatesRemoved;
      result.errors.push(...cleanupResult.errors);
      
      // FASE 2: Crear período #1 faltante si no existe
      console.log('📋 FASE 2: Crear período #1 faltante');
      const createResult = await this.createMissingPeriod1(companyId);
      result.periodsCreated = createResult.periodsCreated;
      result.errors.push(...createResult.errors);
      
      // FASE 3: Corregir numeración de todos los períodos
      console.log('📋 FASE 3: Corrección de numeración');
      const numerationResult = await this.correctAllPeriodNumbers(companyId);
      result.periodsUpdated = numerationResult.periodsUpdated;
      result.conflictsResolved = numerationResult.conflictsResolved;
      result.errors.push(...numerationResult.errors);
      
      // FASE 4: Normalizar nombres de períodos
      console.log('📋 FASE 4: Normalización de nombres');
      const normalizationResult = await this.normalizeAllPeriodNames(companyId);
      result.periodsUpdated += normalizationResult.periodsUpdated;
      result.errors.push(...normalizationResult.errors);
      
      // Verificar si todo fue exitoso
      result.success = result.errors.length === 0;
      result.message = result.success 
        ? `✅ Corrección completada: ${result.duplicatesRemoved} duplicados eliminados, ${result.periodsCreated} períodos creados, ${result.periodsUpdated} períodos actualizados, ${result.conflictsResolved} conflictos resueltos`
        : `⚠️ Corrección parcial: ${result.errors.length} errores encontrados`;
      
      console.log('🎉 CORRECCIÓN COMPLETA FINALIZADA:', result);
      return result;
      
    } catch (error) {
      console.error('❌ ERROR EN CORRECCIÓN DE CONFLICTOS:', error);
      result.errors.push(`Error general: ${error.message}`);
      result.message = 'Error crítico durante la corrección';
      return result;
    }
  }
  
  /**
   * FASE 1: Limpiar duplicados y períodos cancelados
   */
  private static async cleanupDuplicatesAndCanceled(companyId: string): Promise<{
    duplicatesRemoved: number;
    errors: string[];
  }> {
    console.log('🧹 Limpiando duplicados y períodos cancelados...');
    
    const result = { duplicatesRemoved: 0, errors: [] };
    
    try {
      // Obtener todos los períodos quincenales
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .order('created_at', { ascending: true });
      
      if (error) {
        result.errors.push(`Error obteniendo períodos: ${error.message}`);
        return result;
      }
      
      if (!periods || periods.length === 0) {
        console.log('✅ No hay períodos para limpiar');
        return result;
      }
      
      // Agrupar por fechas para identificar duplicados
      const dateGroups = new Map<string, typeof periods>();
      periods.forEach(period => {
        const key = `${period.fecha_inicio}-${period.fecha_fin}`;
        if (!dateGroups.has(key)) {
          dateGroups.set(key, []);
        }
        dateGroups.get(key)!.push(period);
      });
      
      // Procesar grupos con duplicados
      for (const [dateKey, groupPeriods] of dateGroups) {
        if (groupPeriods.length > 1) {
          console.log(`🔍 Procesando ${groupPeriods.length} períodos duplicados para fechas: ${dateKey}`);
          
          // Priorizar qué período mantener:
          // 1. Cerrado > En proceso > Borrador > Cancelado
          // 2. Más reciente en caso de empate de estado
          const priorityOrder = { 'cerrado': 1, 'en_proceso': 2, 'borrador': 3, 'cancelado': 4 };
          
          const sortedPeriods = groupPeriods.sort((a, b) => {
            const priorityA = priorityOrder[a.estado] || 5;
            const priorityB = priorityOrder[b.estado] || 5;
            
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }
            
            // Si tienen la misma prioridad, mantener el más reciente
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          // Mantener el primero (más prioritario), eliminar el resto
          const toKeep = sortedPeriods[0];
          const toDelete = sortedPeriods.slice(1);
          
          console.log(`📌 Manteniendo período ${toKeep.id} (${toKeep.estado}) para ${dateKey}`);
          
          for (const period of toDelete) {
            console.log(`🗑️ Eliminando período duplicado ${period.id} (${period.estado})`);
            
            const { error: deleteError } = await supabase
              .from('payroll_periods_real')
              .delete()
              .eq('id', period.id);
            
            if (deleteError) {
              result.errors.push(`Error eliminando período ${period.id}: ${deleteError.message}`);
            } else {
              result.duplicatesRemoved++;
            }
          }
        }
      }
      
      console.log(`✅ Limpieza completada: ${result.duplicatesRemoved} duplicados eliminados`);
      return result;
      
    } catch (error) {
      console.error('❌ Error en limpieza de duplicados:', error);
      result.errors.push(`Error en limpieza: ${error.message}`);
      return result;
    }
  }
  
  /**
   * FASE 2: Crear período #1 faltante si no existe
   */
  private static async createMissingPeriod1(companyId: string): Promise<{
    periodsCreated: number;
    errors: string[];
  }> {
    console.log('📅 Verificando si existe período #1...');
    
    const result = { periodsCreated: 0, errors: [] };
    
    try {
      // Verificar si existe período #1
      const { data: existingPeriod1, error: checkError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .eq('numero_periodo_anual', 1)
        .limit(1);
      
      if (checkError) {
        result.errors.push(`Error verificando período #1: ${checkError.message}`);
        return result;
      }
      
      if (existingPeriod1 && existingPeriod1.length > 0) {
        console.log('✅ Período #1 ya existe');
        return result;
      }
      
      // Crear período #1: "1 - 15 Enero 2025"
      console.log('➕ Creando período #1 faltante...');
      
      const { error: createError } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: '2025-01-01',
          fecha_fin: '2025-01-15',
          tipo_periodo: 'quincenal',
          numero_periodo_anual: 1,
          periodo: '1 - 15 Enero 2025',
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        });
      
      if (createError) {
        result.errors.push(`Error creando período #1: ${createError.message}`);
      } else {
        result.periodsCreated = 1;
        console.log('✅ Período #1 creado exitosamente');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error creando período #1:', error);
      result.errors.push(`Error creando período #1: ${error.message}`);
      return result;
    }
  }
  
  /**
   * FASE 3: Corregir numeración de todos los períodos
   */
  private static async correctAllPeriodNumbers(companyId: string): Promise<{
    periodsUpdated: number;
    conflictsResolved: number;
    errors: string[];
  }> {
    console.log('🔢 Corrigiendo numeración de períodos...');
    
    const result = { periodsUpdated: 0, conflictsResolved: 0, errors: [] };
    
    try {
      // Obtener todos los períodos quincenales
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .order('fecha_inicio', { ascending: true });
      
      if (error) {
        result.errors.push(`Error obteniendo períodos: ${error.message}`);
        return result;
      }
      
      if (!periods || periods.length === 0) {
        console.log('✅ No hay períodos para corregir');
        return result;
      }
      
      // Corregir numeración de cada período
      for (const period of periods) {
        const correctNumber = this.calculateCorrectBiweeklyNumber(period.fecha_inicio);
        
        if (period.numero_periodo_anual !== correctNumber) {
          console.log(`🔧 Corrigiendo período ${period.periodo}: ${period.numero_periodo_anual} → ${correctNumber}`);
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ 
              numero_periodo_anual: correctNumber,
              updated_at: new Date().toISOString()
            })
            .eq('id', period.id);
          
          if (updateError) {
            result.errors.push(`Error actualizando período ${period.id}: ${updateError.message}`);
          } else {
            result.periodsUpdated++;
            if (period.numero_periodo_anual !== null && period.numero_periodo_anual !== correctNumber) {
              result.conflictsResolved++;
            }
          }
        }
      }
      
      console.log(`✅ Numeración corregida: ${result.periodsUpdated} períodos actualizados, ${result.conflictsResolved} conflictos resueltos`);
      return result;
      
    } catch (error) {
      console.error('❌ Error corrigiendo numeración:', error);
      result.errors.push(`Error en corrección de numeración: ${error.message}`);
      return result;
    }
  }
  
  /**
   * FASE 4: Normalizar nombres de períodos
   */
  private static async normalizeAllPeriodNames(companyId: string): Promise<{
    periodsUpdated: number;
    errors: string[];
  }> {
    console.log('📝 Normalizando nombres de períodos...');
    
    const result = { periodsUpdated: 0, errors: [] };
    
    try {
      // Obtener todos los períodos quincenales
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .order('fecha_inicio', { ascending: true });
      
      if (error) {
        result.errors.push(`Error obteniendo períodos: ${error.message}`);
        return result;
      }
      
      if (!periods || periods.length === 0) {
        console.log('✅ No hay períodos para normalizar');
        return result;
      }
      
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      for (const period of periods) {
        const startDate = new Date(period.fecha_inicio);
        const endDate = new Date(period.fecha_fin);
        const month = startDate.getMonth();
        const year = startDate.getFullYear();
        const day = startDate.getDate();
        
        let correctName = '';
        if (day === 1 && endDate.getDate() === 15) {
          // Primera quincena (1-15)
          correctName = `1 - 15 ${monthNames[month]} ${year}`;
        } else if (day === 16) {
          // Segunda quincena (16-fin de mes)
          correctName = `16 - ${endDate.getDate()} ${monthNames[month]} ${year}`;
        } else {
          // Formato alternativo para fechas no estándar
          correctName = `${day} - ${endDate.getDate()} ${monthNames[month]} ${year}`;
        }
        
        if (period.periodo !== correctName) {
          console.log(`📝 Normalizando nombre: "${period.periodo}" → "${correctName}"`);
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ 
              periodo: correctName,
              updated_at: new Date().toISOString()
            })
            .eq('id', period.id);
          
          if (updateError) {
            result.errors.push(`Error actualizando nombre del período ${period.id}: ${updateError.message}`);
          } else {
            result.periodsUpdated++;
          }
        }
      }
      
      console.log(`✅ Nombres normalizados: ${result.periodsUpdated} períodos actualizados`);
      return result;
      
    } catch (error) {
      console.error('❌ Error normalizando nombres:', error);
      result.errors.push(`Error en normalización de nombres: ${error.message}`);
      return result;
    }
  }
  
  /**
   * Función de cálculo correcto de número quincenal
   */
  private static calculateCorrectBiweeklyNumber(startDate: string): number {
    const parts = startDate.split('-');
    const month = parseInt(parts[1]); // 1-12
    const day = parseInt(parts[2]);
    
    // Calcular número quincenal: (mes-1) * 2 + quincena_del_mes
    const monthsCompleted = month - 1;
    const biweekliesFromCompletedMonths = monthsCompleted * 2;
    
    // Determinar si es primera (1-15) o segunda quincena (16-fin)
    const biweeklyInCurrentMonth = day <= 15 ? 1 : 2;
    
    return biweekliesFromCompletedMonths + biweeklyInCurrentMonth;
  }
}
