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

export interface AvailablePeriod extends GeneratedPeriod {
  can_select: boolean;
  reason?: string;
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
   * Obtener períodos disponibles para liquidación - VERSIÓN CONSERVADORA
   */
  static async getAvailablePeriods(companyId: string, year: number = new Date().getFullYear()): Promise<AvailablePeriod[]> {
    try {
      console.log(`🔍 Buscando períodos para empresa: ${companyId}, año: ${year}`);
      
      // Obtener todos los períodos del año desde la base de datos
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

      if (!existingPeriods || existingPeriods.length === 0) {
        console.warn('⚠️ No se encontraron períodos para la empresa');
        return [];
      }

      console.log(`✅ Encontrados ${existingPeriods.length} períodos en BD`);
      
      // Mapear períodos a AvailablePeriod con validación de selección
      const availablePeriods: AvailablePeriod[] = existingPeriods.map(period => {
        const canSelect = period.estado === 'borrador' || period.estado === 'en_proceso';
        const reason = period.estado === 'cerrado' ? 'Período ya liquidado' : undefined;
        
        return {
          id: period.id,
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin,
          tipo_periodo: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
          numero_periodo_anual: period.numero_periodo_anual || 0,
          etiqueta_visible: period.periodo,
          periodo: period.periodo,
          estado: period.estado as 'borrador' | 'en_proceso' | 'cerrado',
          company_id: period.company_id,
          can_select: canSelect,
          reason: reason
        };
      });
      
      const selectableCount = availablePeriods.filter(p => p.can_select).length;
      const closedCount = availablePeriods.filter(p => !p.can_select).length;
      
      console.log(`📊 Períodos procesados: ${availablePeriods.length} total, ${selectableCount} disponibles, ${closedCount} cerrados`);
      
      return availablePeriods;
      
    } catch (error) {
      console.error('❌ Error en getAvailablePeriods:', error);
      return [];
    }
  }

  /**
   * NUEVA: Obtener períodos faltantes del año
   */
  static async getMissingPeriods(companyId: string, year: number = new Date().getFullYear()): Promise<MissingPeriod[]> {
    try {
      console.log(`🔍 Buscando períodos faltantes para empresa: ${companyId}, año: ${year}`);
      
      // Obtener configuración de periodicidad
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = (settings?.periodicity as 'semanal' | 'quincenal' | 'mensual') || 'quincenal';
      
      // Obtener períodos existentes
      const { data: existingPeriods } = await supabase
        .from('payroll_periods_real')
        .select('numero_periodo_anual, fecha_inicio, fecha_fin')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${year}-01-01`)
        .lte('fecha_fin', `${year}-12-31`);

      const existingNumbers = new Set(existingPeriods?.map(p => p.numero_periodo_anual) || []);
      
      // Generar todos los períodos esperados según periodicidad
      const expectedPeriods = this.generateExpectedPeriods(periodicity, year);
      
      // Encontrar períodos faltantes
      const missingPeriods: MissingPeriod[] = expectedPeriods
        .filter(period => !existingNumbers.has(period.numero_periodo_anual))
        .map(period => {
          // Verificar si podría haber solapamiento
          const warning = this.checkOverlapWarning(period, existingPeriods || []);
          
          return {
            ...period,
            can_create: true,
            warning
          };
        });
      
      console.log(`📋 Períodos faltantes encontrados: ${missingPeriods.length}`);
      return missingPeriods;
      
    } catch (error) {
      console.error('❌ Error obteniendo períodos faltantes:', error);
      return [];
    }
  }

  /**
   * NUEVA: Crear período bajo demanda
   */
  static async createPeriodOnDemand(
    companyId: string, 
    missingPeriod: MissingPeriod
  ): Promise<AvailablePeriod | null> {
    try {
      console.log(`🎯 Creando período bajo demanda: ${missingPeriod.etiqueta_visible}`);
      
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: missingPeriod.fecha_inicio,
          fecha_fin: missingPeriod.fecha_fin,
          tipo_periodo: missingPeriod.tipo_periodo,
          numero_periodo_anual: missingPeriod.numero_periodo_anual,
          periodo: missingPeriod.etiqueta_visible,
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creando período:', error);
        return null;
      }

      console.log('✅ Período creado exitosamente:', data.periodo);
      
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
        can_select: true
      };
      
    } catch (error) {
      console.error('❌ Error en createPeriodOnDemand:', error);
      return null;
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

  static async getNextAvailablePeriod(companyId: string): Promise<AvailablePeriod | null> {
    try {
      const periods = await this.getAvailablePeriods(companyId);
      const availablePeriods = periods.filter(p => p.can_select);
      
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
    console.warn('⚠️ generateYearPeriods es legacy, usar getMissingPeriods + createPeriodOnDemand');
    const periods = await this.getAvailablePeriods(companyId, year);
    return periods.map(p => ({ ...p, can_select: undefined, reason: undefined }));
  }
}
