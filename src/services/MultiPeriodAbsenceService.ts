
import { supabase } from '@/integrations/supabase/client';

export interface PeriodSegment {
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  days: number;
  isPartial: boolean;
}

export interface MultiPeriodAbsenceAnalysis {
  totalDays: number;
  segments: PeriodSegment[];
  crossesMultiplePeriods: boolean;
}

export class MultiPeriodAbsenceService {
  /**
   * Analiza una ausencia y determina cómo debe dividirse entre períodos
   */
  static async analyzeAbsenceAcrossPeriods(
    startDate: string,
    endDate: string,
    companyId: string
  ): Promise<MultiPeriodAbsenceAnalysis> {
    console.log('🔍 Analizando ausencia multi-período:', { startDate, endDate, companyId });

    // Obtener la periodicidad configurada de la empresa
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('periodicity')
      .eq('company_id', companyId)
      .single();

    const configuredPeriodicity = companySettings?.periodicity || 'quincenal';
    console.log(`⚙️ Periodicidad configurada: ${configuredPeriodicity}`);

    // Obtener todos los períodos que intersectan con el rango de fechas
    const { data: periodsRaw, error } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, tipo_periodo, created_at')
      .eq('company_id', companyId)
      .or(`and(fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate})`)
      .order('fecha_inicio', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo períodos:', error);
      throw error;
    }

    // CORRECCIÓN: Filtrar períodos duplicados priorizando configuración de empresa
    const periodsMap = new Map();
    
    for (const period of periodsRaw || []) {
      const key = `${period.fecha_inicio}-${period.fecha_fin}`;
      const existing = periodsMap.get(key);
      
      if (!existing) {
        periodsMap.set(key, period);
      } else {
        const currentMatchesConfig = period.tipo_periodo === configuredPeriodicity;
        const existingMatchesConfig = existing.tipo_periodo === configuredPeriodicity;
        
        if (currentMatchesConfig && !existingMatchesConfig) {
          periodsMap.set(key, period);
        } else if (!currentMatchesConfig && existingMatchesConfig) {
          continue;
        } else if (new Date(period.created_at) > new Date(existing.created_at)) {
          periodsMap.set(key, period);
        }
      }
    }
    
    const periods = Array.from(periodsMap.values());
    
    // Filtrar para mantener SOLO períodos del tipo configurado (si existen)
    const periodsOfConfiguredType = periods.filter(p => p.tipo_periodo === configuredPeriodicity);
    const finalPeriods = periodsOfConfiguredType.length > 0 ? periodsOfConfiguredType : periods;
    
    console.log(`🔧 Períodos filtrados: ${periodsRaw?.length || 0} → ${finalPeriods.length}`);
    console.log(`   Tipo configurado: ${configuredPeriodicity}`);
    console.log(`   Distribución: ${finalPeriods.filter(p => p.tipo_periodo === 'quincenal').length} quincenales, ${finalPeriods.filter(p => p.tipo_periodo === 'mensual').length} mensuales`);

    const segments: PeriodSegment[] = [];
    let totalDays = 0;

    for (const period of finalPeriods) {
      // Calcular intersección entre la ausencia y el período
      const segmentStart = startDate > period.fecha_inicio ? startDate : period.fecha_inicio;
      const segmentEnd = endDate < period.fecha_fin ? endDate : period.fecha_fin;
      
      // Calcular días del segmento
      const segmentDays = this.calculateDaysBetween(segmentStart, segmentEnd);
      
      if (segmentDays > 0) {
        const isPartial = startDate < period.fecha_inicio || endDate > period.fecha_fin;
        
        segments.push({
          periodId: period.id,
          periodName: period.periodo,
          startDate: segmentStart,
          endDate: segmentEnd,
          days: segmentDays,
          isPartial
        });
        
        totalDays += segmentDays;
      }
    }

    // Validar que el total de días sea razonable
    const expectedDays = this.calculateDaysBetween(startDate, endDate);
    const daysDifference = Math.abs(totalDays - expectedDays);

    if (daysDifference > 1) {
      console.warn(`⚠️ ADVERTENCIA: Días calculados (${totalDays}) difieren de lo esperado (${expectedDays})`);
      console.warn(`   Diferencia: ${daysDifference} días`);
      console.warn(`   Puede indicar períodos faltantes en el rango ${startDate} - ${endDate}`);
    }

    console.log('✅ Análisis completado:', { 
      totalDays, 
      segments: segments.length,
      crossesMultiple: segments.length > 1 
    });

    return {
      totalDays,
      segments,
      crossesMultiplePeriods: segments.length > 1
    };
  }

  /**
   * Genera novedades parciales para liquidación (temporales, no persistidas)
   */
  static async generatePartialNovedadesForPeriod(
    periodId: string,
    companyId: string
  ): Promise<any[]> {
    console.log('🔄 Generando novedades parciales para período:', periodId);

    // Obtener información del período
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('fecha_inicio, fecha_fin, periodo')
      .eq('id', periodId)
      .single();

    if (!period) {
      console.log('❌ Período no encontrado');
      return [];
    }

    // Buscar ausencias que intersectan con el período
    const { data: absences } = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employees!inner(id, nombre, apellido, salario_base)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pendiente')
      .or(`and(start_date.lte.${period.fecha_fin},end_date.gte.${period.fecha_inicio})`);

    const partialNovedades: any[] = [];

    for (const absence of absences || []) {
      // Verificar si ya existe una novedad manual para estas fechas y empleado
      const { data: existingNovedad } = await supabase
        .from('payroll_novedades')
        .select('id')
        .eq('empleado_id', absence.employee_id)
        .eq('periodo_id', periodId)
        .eq('tipo_novedad', absence.type)
        .gte('fecha_inicio', period.fecha_inicio)
        .lte('fecha_fin', period.fecha_fin)
        .maybeSingle();

      if (existingNovedad) {
        console.log(`⚠️ Novedad manual existente para empleado ${absence.employee_id}, omitiendo automática`);
        continue;
      }

      // Calcular intersección
      const segmentStart = absence.start_date > period.fecha_inicio ? absence.start_date : period.fecha_inicio;
      const segmentEnd = absence.end_date < period.fecha_fin ? absence.end_date : period.fecha_fin;
      const segmentDays = this.calculateDaysBetween(segmentStart, segmentEnd);

      if (segmentDays > 0) {
        // Calcular valor proporcional
        const dailySalary = Number(absence.employees.salario_base) / 30;
        const calculatedValue = this.calculateAbsenceValue(absence.type, dailySalary, segmentDays);

        partialNovedades.push({
          id: `auto-${absence.id}-${periodId}`, // ID temporal único
          empleado_id: absence.employee_id,
          employee_name: `${absence.employees.nombre} ${absence.employees.apellido}`,
          tipo_novedad: absence.type,
          subtipo: absence.subtipo || null,
          fecha_inicio: segmentStart,
          fecha_fin: segmentEnd,
          dias: segmentDays,
          valor: calculatedValue,
          observacion: `Generada automáticamente desde ausencia ${absence.start_date} - ${absence.end_date}`,
          isAutoGenerated: true, // Marcador para identificar novedades automáticas
          originalAbsenceId: absence.id,
          isPartial: absence.start_date < period.fecha_inicio || absence.end_date > period.fecha_fin
        });
      }
    }

    console.log(`✅ ${partialNovedades.length} novedades parciales generadas`);
    return partialNovedades;
  }

  /**
   * Calcula el valor de una ausencia según su tipo
   */
  private static calculateAbsenceValue(type: string, dailySalary: number, days: number): number {
    switch (type) {
      case 'vacaciones':
      case 'licencia_remunerada':
        return dailySalary * days;
      
      case 'incapacidad':
        // ✅ CORRECCIÓN NORMATIVA: 66.67% todos los días (1-2 empleador, 3+ EPS)
        return dailySalary * days * 0.6667;
      
      case 'ausencia':
      case 'licencia_no_remunerada':
        // Ausencia: descuento (valor negativo)
        return -(dailySalary * days);
      
      default:
        return 0;
    }
  }

  /**
   * Calcula días entre dos fechas (inclusivo)
   */
  private static calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Detecta si una ausencia cruza múltiples períodos
   */
  static async detectMultiPeriodAbsence(
    startDate: string,
    endDate: string,
    companyId: string
  ): Promise<boolean> {
    const analysis = await this.analyzeAbsenceAcrossPeriods(startDate, endDate, companyId);
    return analysis.crossesMultiplePeriods;
  }
}

