
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
   * Obtener períodos seleccionables para el año 2025 (año MRP activo)
   */
  static async getSelectablePeriods(companyId: string): Promise<SelectablePeriod[]> {
    try {
      console.log('📋 Cargando períodos seleccionables para 2025...');
      
      // Generar todos los períodos quincenales esperados para 2025
      const expectedPeriods = this.generateBiWeeklyPeriods2025();
      
      // Obtener períodos existentes en BD
      const { data: existingPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .gte('fecha_inicio', '2025-01-01')
        .lte('fecha_fin', '2025-12-31')
        .order('numero_periodo_anual');
      
      // Crear mapa de períodos existentes
      const existingMap = new Map(
        (existingPeriods || []).map(p => [p.numero_periodo_anual, p])
      );
      
      // Combinar períodos esperados con existentes
      return expectedPeriods.map(expected => {
        const existing = existingMap.get(expected.periodNumber);
        
        if (existing) {
          // Período existe - verificar si se puede seleccionar
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
          // Período no existe - se puede crear y seleccionar
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
        
        const { data, error } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            fecha_inicio: period.startDate,
            fecha_fin: period.endDate,
            tipo_periodo: 'quincenal',
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
      
      // Período ya existe, simplemente retornarlo
      return period;
    } catch (error) {
      console.error('❌ Error seleccionando período:', error);
      return null;
    }
  }

  /**
   * FUNCIÓN CORREGIDA: Generar períodos quincenales para 2025 con numeración correcta
   */
  private static generateBiWeeklyPeriods2025(): Array<{
    label: string;
    startDate: string;
    endDate: string;
    periodNumber: number;
  }> {
    const periods = [];
    const year = 2025; // Año fijo para MRP
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let periodNumber = 1; // CORRECCIÓN: Iniciar en 1

    for (let month = 0; month < 12; month++) {
      // Primera quincena (1-15)
      const firstStart = new Date(year, month, 1);
      const firstEnd = new Date(year, month, 15);
      
      periods.push({
        label: `1 - 15 ${monthNames[month]} ${year}`,
        startDate: firstStart.toISOString().split('T')[0],
        endDate: firstEnd.toISOString().split('T')[0],
        periodNumber: periodNumber++ // CORRECCIÓN: Numeración secuencial correcta
      });

      // Segunda quincena (16-fin de mes)
      const secondStart = new Date(year, month, 16);
      const secondEnd = new Date(year, month + 1, 0); // Último día del mes
      
      periods.push({
        label: `16 - ${secondEnd.getDate()} ${monthNames[month]} ${year}`,
        startDate: secondStart.toISOString().split('T')[0],
        endDate: secondEnd.toISOString().split('T')[0],
        periodNumber: periodNumber++ // CORRECCIÓN: Numeración secuencial correcta
      });
    }

    console.log('✅ PERÍODOS 2025 GENERADOS CORRECTAMENTE:', {
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
