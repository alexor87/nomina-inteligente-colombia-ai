import { supabase } from '@/integrations/supabase/client';

export interface GeneratedPeriod {
  id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
  numero_periodo_anual: number;
  etiqueta_visible: string;
  periodo: string;
  estado: 'borrador' | 'en_proceso' | 'cerrado';
  company_id: string;
}

export interface UnifiedPeriod extends GeneratedPeriod {
  can_select: boolean;
  status_type: 'available' | 'closed' | 'to_create';
  reason?: string;
  needs_creation?: boolean;
}

export interface MissingPeriod {
  numero_periodo_anual: number;
  fecha_inicio: string;
  fecha_fin: string;
  etiqueta_visible: string;
  tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
  can_create: boolean;
  warning?: string;
}

export class PeriodGenerationService {
  
  /**
   * NUEVO: Obtener TODOS los períodos del año (existentes + faltantes) - SOLUCIÓN HÍBRIDA
   */
  static async getAllPeriodsForYear(companyId: string, year: number = new Date().getFullYear()): Promise<UnifiedPeriod[]> {
    try {
      console.log(`🔄 HÍBRIDO: Obteniendo todos los períodos para empresa: ${companyId}, año: ${year}`);
      
      // Obtener configuración de periodicidad
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = (settings?.periodicity as 'semanal' | 'quincenal' | 'mensual') || 'quincenal';
      
      // Obtener períodos existentes
      const { data: existingPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${year}-01-01`)
        .lte('fecha_fin', `${year}-12-31`)
        .order('numero_periodo_anual');
      
      if (error) {
        console.error('❌ Error obteniendo períodos:', error);
        throw error;
      }

      // Generar todos los períodos esperados según periodicidad
      const expectedPeriods = this.generateExpectedPeriods(periodicity, year);
      
      // Crear mapa de períodos existentes por número
      const existingPeriodsMap = new Map(
        (existingPeriods || []).map(p => [p.numero_periodo_anual, p])
      );
      
      // Combinar períodos existentes + faltantes
      const unifiedPeriods: UnifiedPeriod[] = expectedPeriods.map(expectedPeriod => {
        const existingPeriod = existingPeriodsMap.get(expectedPeriod.numero_periodo_anual);
        
        if (existingPeriod) {
          // Período existe en BD
          const canSelect = existingPeriod.estado === 'borrador' || existingPeriod.estado === 'en_proceso';
          const statusType: 'available' | 'closed' | 'to_create' = 
            existingPeriod.estado === 'cerrado' ? 'closed' : 'available';
          
          return {
            id: existingPeriod.id,
            fecha_inicio: existingPeriod.fecha_inicio,
            fecha_fin: existingPeriod.fecha_fin,
            tipo_periodo: existingPeriod.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
            numero_periodo_anual: existingPeriod.numero_periodo_anual || 0,
            etiqueta_visible: existingPeriod.periodo,
            periodo: existingPeriod.periodo,
            estado: existingPeriod.estado as 'borrador' | 'en_proceso' | 'cerrado',
            company_id: existingPeriod.company_id,
            can_select: canSelect,
            status_type: statusType,
            reason: statusType === 'closed' ? 'Período ya liquidado - Editar desde Historial' : undefined,
            needs_creation: false
          };
        } else {
          // Período faltante - se puede crear
          return {
            fecha_inicio: expectedPeriod.fecha_inicio,
            fecha_fin: expectedPeriod.fecha_fin,
            tipo_periodo: expectedPeriod.tipo_periodo,
            numero_periodo_anual: expectedPeriod.numero_periodo_anual,
            etiqueta_visible: expectedPeriod.etiqueta_visible,
            periodo: expectedPeriod.etiqueta_visible,
            estado: 'borrador' as const,
            company_id: companyId,
            can_select: true,
            status_type: 'to_create',
            reason: 'Se creará automáticamente al seleccionar',
            needs_creation: true
          };
        }
      });
      
      const existingCount = unifiedPeriods.filter(p => !p.needs_creation).length;
      const toCreateCount = unifiedPeriods.filter(p => p.needs_creation).length;
      const availableCount = unifiedPeriods.filter(p => p.can_select).length;
      
      console.log(`📊 HÍBRIDO: ${unifiedPeriods.length} períodos totales - ${existingCount} existentes, ${toCreateCount} por crear, ${availableCount} disponibles`);
      
      return unifiedPeriods;
      
    } catch (error) {
      console.error('❌ Error en getAllPeriodsForYear:', error);
      return [];
    }
  }

  /**
   * NUEVO: Crear período bajo demanda desde UnifiedPeriod
   */
  static async createPeriodFromUnified(
    companyId: string, 
    unifiedPeriod: UnifiedPeriod
  ): Promise<UnifiedPeriod | null> {
    try {
      console.log(`🎯 Creando período híbrido: ${unifiedPeriod.etiqueta_visible}`);
      
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: unifiedPeriod.fecha_inicio,
          fecha_fin: unifiedPeriod.fecha_fin,
          tipo_periodo: unifiedPeriod.tipo_periodo,
          numero_periodo_anual: unifiedPeriod.numero_periodo_anual,
          periodo: unifiedPeriod.etiqueta_visible,
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creando período híbrido:', error);
        return null;
      }

      console.log('✅ Período híbrido creado exitosamente:', data.periodo);
      
      return {
        id: data.id,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        tipo_periodo: data.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
        numero_periodo_anual: data.numero_periodo_anual,
        etiqueta_visible: data.periodo,
        periodo: data.periodo,
        estado: data.estado as 'borrador' | 'en_proceso' | 'cerrado',
        company_id: data.company_id,
        can_select: true,
        status_type: 'available',
        needs_creation: false
      };
      
    } catch (error) {
      console.error('❌ Error en createPeriodFromUnified:', error);
      return null;
    }
  }

  /**
   * NUEVO: Generar automáticamente períodos faltantes al inicio
   */
  static async ensureCompleteYearPeriods(companyId: string, year: number = new Date().getFullYear()): Promise<{
    generated: number;
    existing: number;
    total: number;
  }> {
    try {
      console.log(`🔧 Asegurando períodos completos para empresa: ${companyId}, año: ${year}`);
      
      const allPeriods = await this.getAllPeriodsForYear(companyId, year);
      const periodsToCreate = allPeriods.filter(p => p.needs_creation);
      
      let generatedCount = 0;
      
      for (const period of periodsToCreate) {
        const created = await this.createPeriodFromUnified(companyId, period);
        if (created) {
          generatedCount++;
        }
      }
      
      const existingCount = allPeriods.length - periodsToCreate.length;
      
      console.log(`✅ Períodos completados: ${generatedCount} generados, ${existingCount} existían, ${allPeriods.length} total`);
      
      return {
        generated: generatedCount,
        existing: existingCount,
        total: allPeriods.length
      };
      
    } catch (error) {
      console.error('❌ Error asegurando períodos completos:', error);
      return { generated: 0, existing: 0, total: 0 };
    }
  }

  /**
   * NUEVA: Generar períodos esperados según periodicidad
   */
  private static generateExpectedPeriods(
    periodicity: 'semanal' | 'quincenal' | 'mensual', 
    year: number
  ): Array<{
    numero_periodo_anual: number;
    fecha_inicio: string;
    fecha_fin: string;
    etiqueta_visible: string;
    tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
  }> {
    const periods = [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (periodicity === 'quincenal') {
      // 24 períodos quincenales (2 por mes)
      for (let month = 1; month <= 12; month++) {
        // Primera quincena (1-15)
        const firstStart = new Date(year, month - 1, 1);
        const firstEnd = new Date(year, month - 1, 15);
        
        periods.push({
          numero_periodo_anual: month * 2 - 1,
          fecha_inicio: firstStart.toISOString().split('T')[0],
          fecha_fin: firstEnd.toISOString().split('T')[0],
          etiqueta_visible: `1 - 15 ${monthNames[month - 1]} ${year}`,
          tipo_periodo: 'quincenal' as const
        });

        // Segunda quincena (16-fin de mes)
        const secondStart = new Date(year, month - 1, 16);
        const secondEnd = new Date(year, month, 0); // Último día del mes
        
        periods.push({
          numero_periodo_anual: month * 2,
          fecha_inicio: secondStart.toISOString().split('T')[0],
          fecha_fin: secondEnd.toISOString().split('T')[0],
          etiqueta_visible: `16 - ${secondEnd.getDate()} ${monthNames[month - 1]} ${year}`,
          tipo_periodo: 'quincenal' as const
        });
      }
    } else if (periodicity === 'mensual') {
      // 12 períodos mensuales
      for (let month = 1; month <= 12; month++) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0); // Último día del mes
        
        periods.push({
          numero_periodo_anual: month,
          fecha_inicio: start.toISOString().split('T')[0],
          fecha_fin: end.toISOString().split('T')[0],
          etiqueta_visible: `${monthNames[month - 1]} ${year}`,
          tipo_periodo: 'mensual' as const
        });
      }
    } else if (periodicity === 'semanal') {
      // 52 períodos semanales (aproximadamente)
      let weekNumber = 1;
      let currentDate = new Date(year, 0, 1); // 1 de enero
      
      // Ajustar al primer lunes del año
      const dayOfWeek = currentDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      currentDate.setDate(currentDate.getDate() + daysToMonday);
      
      while (currentDate.getFullYear() === year && weekNumber <= 52) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        // Si la semana termina en el siguiente año, parar
        if (weekEnd.getFullYear() > year) break;
        
        periods.push({
          numero_periodo_anual: weekNumber,
          fecha_inicio: weekStart.toISOString().split('T')[0],
          fecha_fin: weekEnd.toISOString().split('T')[0],
          etiqueta_visible: `Semana ${weekNumber} ${year}`,
          tipo_periodo: 'semanal' as const
        });
        
        currentDate.setDate(currentDate.getDate() + 7);
        weekNumber++;
      }
    }

    return periods;
  }

  /**
   * NUEVA: Verificar warning de solapamiento
   */
  private static checkOverlapWarning(
    newPeriod: { fecha_inicio: string; fecha_fin: string },
    existingPeriods: Array<{ fecha_inicio: string; fecha_fin: string }>
  ): string | undefined {
    const newStart = new Date(newPeriod.fecha_inicio);
    const newEnd = new Date(newPeriod.fecha_fin);
    
    for (const existing of existingPeriods) {
      const existingStart = new Date(existing.fecha_inicio);
      const existingEnd = new Date(existing.fecha_fin);
      
      // Verificar solapamiento
      if (newStart <= existingEnd && newEnd >= existingStart) {
        return `Posible solapamiento con período ${existing.fecha_inicio} - ${existing.fecha_fin}`;
      }
    }
    
    return undefined;
  }

  // MÉTODOS LEGACY MANTENIDOS PARA COMPATIBILIDAD
  static async getAvailablePeriods(companyId: string, year: number = new Date().getFullYear()): Promise<any[]> {
    console.warn('⚠️ getAvailablePeriods es legacy, usar getAllPeriodsForYear');
    const allPeriods = await this.getAllPeriodsForYear(companyId, year);
    return allPeriods.filter(p => p.can_select);
  }

  static async getMissingPeriods(companyId: string, year: number = new Date().getFullYear()): Promise<MissingPeriod[]> {
    console.warn('⚠️ getMissingPeriods es legacy, usar getAllPeriodsForYear');
    const allPeriods = await this.getAllPeriodsForYear(companyId, year);
    return allPeriods
      .filter(p => p.needs_creation)
      .map(p => ({
        numero_periodo_anual: p.numero_periodo_anual,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        etiqueta_visible: p.etiqueta_visible,
        tipo_periodo: p.tipo_periodo,
        can_create: true
      }));
  }

  static async createPeriodOnDemand(companyId: string, missingPeriod: MissingPeriod): Promise<any | null> {
    console.warn('⚠️ createPeriodOnDemand es legacy, usar createPeriodFromUnified');
    const unifiedPeriod: UnifiedPeriod = {
      fecha_inicio: missingPeriod.fecha_inicio,
      fecha_fin: missingPeriod.fecha_fin,
      tipo_periodo: missingPeriod.tipo_periodo,
      numero_periodo_anual: missingPeriod.numero_periodo_anual,
      etiqueta_visible: missingPeriod.etiqueta_visible,
      periodo: missingPeriod.etiqueta_visible,
      estado: 'borrador',
      company_id: companyId,
      can_select: true,
      status_type: 'to_create',
      needs_creation: true
    };
    
    return this.createPeriodFromUnified(companyId, unifiedPeriod);
  }

  static async getNextAvailablePeriod(companyId: string): Promise<any | null> {
    try {
      const allPeriods = await this.getAllPeriodsForYear(companyId);
      const availablePeriods = allPeriods.filter(p => p.can_select);
      
      if (availablePeriods.length === 0) {
        console.warn('⚠️ No hay períodos disponibles');
        return null;
      }
      
      const nextPeriod = availablePeriods.sort((a, b) => (a.numero_periodo_anual || 0) - (b.numero_periodo_anual || 0))[0];
      console.log(`🎯 Siguiente período disponible: ${nextPeriod.etiqueta_visible}`);
      
      return nextPeriod;
    } catch (error) {
      console.error('❌ Error obteniendo siguiente período:', error);
      return null;
    }
  }
  
  static async markPeriodAsLiquidated(periodId: string): Promise<boolean> {
    try {
      console.log(`🔒 Marcando período como liquidado: ${periodId}`);
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
      
      if (error) {
        console.error('❌ Error marcando período como liquidado:', error);
        return false;
      }
      
      console.log('✅ Período marcado como liquidado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en markPeriodAsLiquidated:', error);
      return false;
    }
  }

  // Métodos legacy mantenidos por compatibilidad
  static async generateYearPeriods(
    companyId: string, 
    year: number = new Date().getFullYear(),
    periodicity: 'semanal' | 'quincenal' | 'mensual' = 'quincenal'
  ): Promise<GeneratedPeriod[]> {
    console.warn('⚠️ generateYearPeriods es legacy, usar ensureCompleteYearPeriods');
    await this.ensureCompleteYearPeriods(companyId, year);
    const allPeriods = await this.getAllPeriodsForYear(companyId, year);
    return allPeriods.map(p => ({ ...p, can_select: undefined, reason: undefined, status_type: undefined, needs_creation: undefined }));
  }
}
