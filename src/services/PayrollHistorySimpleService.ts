
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

/**
 * ✅ SERVICIO SIMPLE DE HISTORIAL - FASE 2 REPARACIÓN CRÍTICA
 * Conecta directamente con la función de base de datos sincronizada
 */
export class PayrollHistorySimpleService {
  
  static async getHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      console.log('📊 FASE 2 - Cargando historial desde función DB...');
      
      // Llamar a la función de base de datos que creamos
      const { data, error } = await supabase.rpc('get_payroll_history_periods');
      
      if (error) {
        console.error('❌ Error en función get_payroll_history_periods:', error);
        throw error;
      }
      
      console.log('📊 FASE 2 - Respuesta de función DB:', data);
      
      if (!data || !data.success) {
        console.warn('⚠️ La función no retornó datos exitosos');
        return [];
      }
      
      const periods = data.data || [];
      console.log(`✅ FASE 2 - Períodos cargados: ${periods.length}`);
      
      return periods.map((period: any) => ({
        id: period.id,
        period: period.period,
        startDate: period.startDate,
        endDate: period.endDate,
        type: period.type as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
        employeesCount: period.employeesCount || 0,
        status: this.mapStatusSafely(period.status),
        totalGrossPay: Number(period.totalGrossPay) || 0,
        totalNetPay: Number(period.totalNetPay) || 0,
        totalDeductions: Number(period.totalDeductions) || 0,
        totalCost: Number(period.totalCost) || 0,
        employerContributions: Number(period.employerContributions) || 0,
        paymentStatus: period.paymentStatus as 'pagado' | 'parcial' | 'pendiente',
        version: period.version || 1,
        createdAt: period.createdAt,
        updatedAt: period.updatedAt,
        editable: period.editable || false
      }));
      
    } catch (error) {
      console.error('💥 FASE 2 - Error crítico cargando historial:', error);
      
      // ✅ FALLBACK: Si falla la función, intentar consulta directa
      return this.getFallbackHistoryPeriods();
    }
  }
  
  private static async getFallbackHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      console.log('🔄 FASE 2 - Ejecutando fallback directo...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('⚠️ No se pudo obtener company_id en fallback');
        return [];
      }
      
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });
      
      if (error) {
        console.error('❌ Error en fallback:', error);
        return [];
      }
      
      console.log(`🔄 FASE 2 - Fallback exitoso: ${periods?.length || 0} períodos`);
      
      return (periods || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
        employeesCount: period.empleados_count || 0,
        status: this.mapStatusSafely(period.estado),
        totalGrossPay: Number(period.total_devengado) || 0,
        totalNetPay: Number(period.total_neto) || 0,
        totalDeductions: Number(period.total_deducciones) || 0,
        totalCost: Number(period.total_devengado) || 0,
        employerContributions: Number(period.total_devengado) * 0.205 || 0,
        paymentStatus: period.estado === 'cerrado' ? 'pagado' as const : 'pendiente' as const,
        version: 1,
        createdAt: period.created_at,
        updatedAt: period.updated_at,
        editable: period.estado === 'borrador'
      }));
      
    } catch (error) {
      console.error('💥 Error en fallback:', error);
      return [];
    }
  }
  
  private static mapStatusSafely(dbStatus: string): 'borrador' | 'cerrado' | 'con_errores' | 'editado' | 'reabierto' {
    const statusMap: Record<string, 'borrador' | 'cerrado' | 'con_errores' | 'editado' | 'reabierto'> = {
      'borrador': 'borrador',
      'cerrado': 'cerrado',
      'procesada': 'cerrado',
      'en_proceso': 'con_errores',
      'aprobado': 'cerrado',
      'editado': 'editado',
      'reabierto': 'reabierto'
    };
    
    return statusMap[dbStatus] || 'cerrado';
  }
  
  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) return null;
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }
}
