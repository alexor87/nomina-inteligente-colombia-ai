import { supabase } from '@/integrations/supabase/client';

export interface SelectablePeriod {
  id?: string;
  label: string;
  startDate: string;
  endDate: string;
  periodNumber: number;
  canSelect: boolean;
  needsCreation: boolean;
}

export class SimplePeriodService {
  /**
   * Obtener períodos seleccionables para el año especificado según configuración de empresa
   */
  static async getSelectablePeriods(companyId: string, year: number = new Date().getFullYear()): Promise<SelectablePeriod[]> {
    try {
      console.log('📋 Cargando períodos seleccionables según configuración de empresa...');
      
      // Obtener configuración de periodicidad de la empresa
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = companySettings?.periodicity || 'mensual';
      console.log('⚙️ Periodicidad configurada:', periodicity);
      
      // Generar períodos según la configuración (KISS: solo mensual y quincenal)
      const expectedPeriods = this.generatePeriods(periodicity, year);
      
      // Obtener períodos existentes en BD
      const { data: existingPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${year}-01-01`)
        .lte('fecha_fin', `${year}-12-31`)
        .in('estado', ['borrador', 'en_proceso', 'cerrado'])
        .order('numero_periodo_anual');
      
      // Crear mapa de períodos existentes
      const existingMap = new Map(
        (existingPeriods || []).map(p => [p.numero_periodo_anual, p])
      );
      
      // Combinar períodos esperados con existentes
      const selectablePeriods = expectedPeriods.map(expected => {
        const existing = existingMap.get(expected.periodNumber);
        
        if (existing) {
          const canSelect = existing.estado === 'borrador' || existing.estado === 'en_proceso';
          return {
            id: existing.id,
            label: expected.label,
            startDate: existing.fecha_inicio,
            endDate: existing.fecha_fin,
            periodNumber: expected.periodNumber,
            canSelect,
            needsCreation: false
          };
        } else {
          return {
            label: expected.label,
            startDate: expected.startDate,
            endDate: expected.endDate,
            periodNumber: expected.periodNumber,
            canSelect: true,
            needsCreation: true
          };
        }
      });

      selectablePeriods.sort((a, b) => a.periodNumber - b.periodNumber);
      
      console.log(`✅ ${selectablePeriods.length} períodos ${periodicity} disponibles (${selectablePeriods.filter(p => p.canSelect).length} seleccionables)`);
      
      return selectablePeriods;
      
    } catch (error) {
      console.error('❌ Error cargando períodos seleccionables:', error);
      return [];
    }
  }

  /**
   * Seleccionar un período (crear automáticamente si no existe)
   */
  static async selectPeriod(companyId: string, period: SelectablePeriod): Promise<SelectablePeriod | null> {
    try {
      if (period.needsCreation) {
        console.log(`🎯 Creando período automáticamente: ${period.label}`);
        
        // Obtener configuración para determinar tipo de período
        const { data: companySettings } = await supabase
          .from('company_settings')
          .select('periodicity')
          .eq('company_id', companyId)
          .single();

        const periodicity = companySettings?.periodicity || 'mensual';
        
        const { data, error } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            fecha_inicio: period.startDate,
            fecha_fin: period.endDate,
            tipo_periodo: periodicity,
            numero_periodo_anual: period.periodNumber,
            periodo: period.label,
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

        console.log('✅ Período creado exitosamente');
        return {
          id: data.id,
          label: period.label,
          startDate: data.fecha_inicio,
          endDate: data.fecha_fin,
          periodNumber: period.periodNumber,
          canSelect: true,
          needsCreation: false
        };
      }
      
      return period;
    } catch (error) {
      console.error('❌ Error seleccionando período:', error);
      return null;
    }
  }

  /**
   * Generar períodos para el año especificado según tipo de periodicidad (KISS: solo mensual y quincenal)
   */
  private static generatePeriods(periodicity: string, year: number): Array<{
    label: string;
    startDate: string;
    endDate: string;
    periodNumber: number;
  }> {
    switch (periodicity) {
      case 'mensual':
        return this.generateMonthlyPeriods(year);
      case 'quincenal':
        return this.generateBiWeeklyPeriods(year);
      default:
        console.warn('⚠️ Periodicidad no reconocida, usando mensual por defecto');
        return this.generateMonthlyPeriods(year);
    }
  }

  /**
   * Generar períodos mensuales para el año especificado
   */
  private static generateMonthlyPeriods(year: number): Array<{
    label: string;
    startDate: string;
    endDate: string;
    periodNumber: number;
  }> {
    const periods = [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Último día del mes
      
      periods.push({
        label: `${monthNames[month]} ${year}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        periodNumber: month + 1
      });
    }

    console.log(`✅ PERÍODOS MENSUALES ${year} GENERADOS:`, {
      totalPeriods: periods.length,
      firstPeriod: periods[0],
      lastPeriod: periods[periods.length - 1]
    });

    return periods;
  }

  /**
   * Generar períodos quincenales para el año especificado
   */
  private static generateBiWeeklyPeriods(year: number): Array<{
    label: string;
    startDate: string;
    endDate: string;
    periodNumber: number;
  }> {
    const periods = [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let periodNumber = 1;

    for (let month = 0; month < 12; month++) {
      // Primera quincena (1-15)
      const firstStart = new Date(year, month, 1);
      const firstEnd = new Date(year, month, 15);
      
      periods.push({
        label: `1 - 15 ${monthNames[month]} ${year}`,
        startDate: firstStart.toISOString().split('T')[0],
        endDate: firstEnd.toISOString().split('T')[0],
        periodNumber: periodNumber++
      });

      // Segunda quincena (16-fin de mes)
      const secondStart = new Date(year, month, 16);
      let secondEnd: Date;
      
      // CORRECCIÓN ESPECIAL PARA FEBRERO: usar día 30 ficticio para legislación laboral
      if (month === 1) { // Febrero
        secondEnd = new Date(year, month, 30); // Día ficticio para mantener 15 días
      } else {
        secondEnd = new Date(year, month + 1, 0); // Último día real del mes
      }
      
      periods.push({
        label: `16 - ${month === 1 ? '30' : secondEnd.getDate()} ${monthNames[month]} ${year}`,
        startDate: secondStart.toISOString().split('T')[0],
        endDate: secondEnd.toISOString().split('T')[0],
        periodNumber: periodNumber++
      });
    }

    console.log(`✅ PERÍODOS QUINCENALES ${year} GENERADOS:`, {
      totalPeriods: periods.length,
      firstPeriod: periods[0],
      lastPeriod: periods[periods.length - 1]
    });

    return periods;
  }

  /**
   * Marcar período como liquidado
   */
  static async markAsLiquidated(periodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ estado: 'cerrado' })
        .eq('id', periodId);
      
      return !error;
    } catch (error) {
      console.error('❌ Error marcando período como liquidado:', error);
      return false;
    }
  }
}
