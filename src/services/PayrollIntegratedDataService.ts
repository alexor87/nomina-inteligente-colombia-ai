
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertNovedadToDisplay, ABSENCE_VISUAL_CONFIG, UNIFIED_STATUS_MAPPING } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { MultiPeriodAbsenceService } from './MultiPeriodAbsenceService';
import { AbsenceType } from '@/types/absences';

export class PayrollIntegratedDataService {
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, company_id')
        .eq('id', periodId)
        .single();

      if (!period) {
        console.error('❌ Período no encontrado:', periodId);
        return [];
      }

      // ✅ Obtener novedades de la DB (valores ya calculados al crear)
      const novedadesData = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);

      // ✅ Convertir novedades usando valores almacenados en DB (ya calculados al crear)
      // NOTA: No sobreescribir valor con breakdown por tipo_novedad+subtipo,
      // porque cuando hay múltiples entradas del mismo tipo (ej: 2 recargos nocturnos),
      // el Map colisiona y todas reciben el mismo valor.
      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        return convertNovedadToDisplay(novedad);
      });

      // ✅ Buscar ausencias que se solapan con el periodo pero no tienen novedad persistida
      const autoNovedades = await MultiPeriodAbsenceService.generatePartialNovedadesForPeriod(periodId, period.company_id);
      const existingIds = new Set(novedadesData.map(n => n.id));
      const employeeAutoNovedades = autoNovedades.filter(
        auto => auto.empleado_id === employeeId && !existingIds.has(auto.originalAbsenceId)
      );

      const autoDisplayData: DisplayNovedad[] = employeeAutoNovedades.map(auto => {
        const absenceType = auto.tipo_novedad as AbsenceType;
        const config = ABSENCE_VISUAL_CONFIG[absenceType];
        const statusConfig = UNIFIED_STATUS_MAPPING['pendiente'];

        return {
          id: auto.id,
          empleado_id: auto.empleado_id,
          periodo_id: periodId,
          tipo_novedad: auto.tipo_novedad,
          subtipo: auto.subtipo,
          valor: auto.valor,
          dias: auto.dias,
          fecha_inicio: auto.fecha_inicio,
          fecha_fin: auto.fecha_fin,
          observacion: auto.observacion,
          origen: 'vacaciones' as const,
          status: 'pendiente' as const,
          isConfirmed: false,
          isFragmented: auto.isPartial,
          canEdit: false,
          canDelete: false,
          badgeColor: config?.badge.color || 'bg-blue-100 text-blue-800',
          badgeIcon: config?.badge.icon || '📋',
          badgeLabel: auto.isPartial
            ? `${config?.badge.label || 'Ausencia'} (parcial)`
            : config?.badge.label || 'Ausencia',
          statusColor: statusConfig.color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const allDisplayData = [...displayData, ...autoDisplayData];

      const sortedData = allDisplayData.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return sortedData;

    } catch (error) {
      console.error('❌ PayrollIntegratedDataService - Error obteniendo datos unificados:', error);
      return [];
    }
  }

  static calculatePeriodIntersectionDays(
    vacationStart: string,
    vacationEnd: string,
    periodStart: string,
    periodEnd: string
  ): number {
    const vacStartDate = new Date(vacationStart);
    const vacEndDate = new Date(vacationEnd);
    const perStartDate = new Date(periodStart);
    const perEndDate = new Date(periodEnd);

    const intersectionStart = new Date(Math.max(vacStartDate.getTime(), perStartDate.getTime()));
    const intersectionEnd = new Date(Math.min(vacEndDate.getTime(), perEndDate.getTime()));

    if (intersectionStart > intersectionEnd) {
      return 0;
    }

    const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Convención nómina colombiana (Art. 134 CST): quincena = 15 días
    const startDay = new Date(periodStart).getUTCDate();
    if (startDay === 1 || startDay === 16) {
      const intStartStr = intersectionStart.toISOString().split('T')[0];
      const intEndStr = intersectionEnd.toISOString().split('T')[0];
      if (intStartStr <= periodStart && intEndStr >= periodEnd) {
        diffDays = 15;
      } else {
        diffDays = Math.min(diffDays, 15);
      }
    }

    return Math.max(0, diffDays);
  }
}
