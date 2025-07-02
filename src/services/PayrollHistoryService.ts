
import { supabase } from '@/integrations/supabase/client';

export interface PayrollHistoryRecord {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  empleados: number;
  totalNomina: number;
  estado: string;
  fechaCreacion: string;
  editable: boolean;
  reportado_dian: boolean;
}

export class PayrollHistoryService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async getPayrollPeriods(): Promise<PayrollHistoryRecord[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      // Get periods from payroll_periods_real with better period generation
      const { data: periods, error: periodsError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (periodsError) {
        console.error('Error fetching periods:', periodsError);
        return [];
      }

      // Transform to PayrollHistoryRecord format with unique periods
      const transformedPeriods = periods?.map(period => ({
        id: period.id,
        periodo: this.generatePeriodName(period.fecha_inicio, period.fecha_fin),
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        empleados: period.empleados_count || 0,
        totalNomina: Number(period.total_neto || 0),
        estado: this.mapStatus(period.estado),
        fechaCreacion: period.created_at,
        editable: period.estado !== 'cerrada',
        reportado_dian: false
      })) || [];

      return transformedPeriods;
    } catch (error) {
      console.error('Error in getPayrollPeriods:', error);
      return [];
    }
  }

  static generatePeriodName(fechaInicio: string, fechaFin: string): string {
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    
    const startMonth = startDate.toLocaleString('es-ES', { month: 'long' });
    const startYear = startDate.getFullYear();
    const endMonth = endDate.toLocaleString('es-ES', { month: 'long' });
    const endYear = endDate.getFullYear();

    // If same month and year
    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${startYear}`;
    }

    // If different months or years
    return `${startDate.getDate()}/${startDate.getMonth() + 1}/${startYear} - ${endDate.getDate()}/${endDate.getMonth() + 1}/${endYear}`;
  }

  static mapStatus(estado: string): string {
    const statusMap: Record<string, string> = {
      'borrador': 'revision',
      'procesada': 'cerrado',
      'cerrada': 'cerrado',
      'pagada': 'cerrado',
      'con_errores': 'con_errores',
      'editado': 'editado',
      'reabierto': 'reabierto'
    };
    
    return statusMap[estado] || 'revision';
  }

  static async recalculateEmployeeTotalsWithNovedades(employeeId: string, periodId: string): Promise<void> {
    try {
      // This would normally recalculate totals including novedades
      console.log('Recalculating totals for employee:', employeeId, 'period:', periodId);
    } catch (error) {
      console.error('Error recalculating employee totals:', error);
      throw error;
    }
  }
}
