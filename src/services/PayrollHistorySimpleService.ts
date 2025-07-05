
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

/**
 * ✅ SERVICIO REAL DE HISTORIAL - FASE 2 REPARADO
 * Conecta directamente con datos reales sin fallbacks simulados
 */
export class PayrollHistorySimpleService {
  
  static async getHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      console.log('📊 FASE 2 - Cargando historial REAL desde función DB...');
      
      // Llamar a la función de base de datos reparada
      const { data, error } = await supabase.rpc('get_payroll_history_periods');
      
      if (error) {
        console.error('❌ Error en función get_payroll_history_periods:', error);
        throw error;
      }
      
      console.log('📊 FASE 2 - Respuesta REAL de función DB:', data);
      
      // Validar respuesta
      if (!data || !data.success) {
        console.warn('⚠️ La función no retornó datos exitosos');
        return [];
      }
      
      const periods = data.data || [];
      console.log(`✅ FASE 2 - Períodos REALES cargados: ${periods.length}`);
      
      return periods.map((period: any) => ({
        id: period.id,
        period: period.period,
        startDate: period.startDate,
        endDate: period.endDate,
        type: period.type as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
        employeesCount: period.employeesCount || 0,
        status: PayrollHistorySimpleService.mapStatusSafely(period.status),
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
      console.error('💥 FASE 2 - Error crítico cargando historial REAL:', error);
      
      // ✅ FALLBACK REAL (sin simulaciones)
      return PayrollHistorySimpleService.getDirectHistoryPeriods();
    }
  }
  
  private static async getDirectHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      console.log('🔄 FASE 2 - Ejecutando consulta directa REAL...');
      
      const companyId = await PayrollHistorySimpleService.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('⚠️ No se pudo obtener company_id');
        return [];
      }
      
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });
      
      if (error) {
        console.error('❌ Error en consulta directa:', error);
        return [];
      }
      
      console.log(`🔄 FASE 2 - Consulta directa exitosa: ${periods?.length || 0} períodos REALES`);
      
      return (periods || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
        employeesCount: period.empleados_count || 0,
        status: PayrollHistorySimpleService.mapStatusSafely(period.estado),
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
      console.error('💥 Error en consulta directa:', error);
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

  // ✅ NUEVO: Limpiar períodos duplicados
  static async cleanDuplicatePeriods(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧹 FASE 2 - Limpiando períodos duplicados...');
      
      const { data, error } = await supabase.rpc('clean_specific_duplicate_periods');
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Períodos duplicados limpiados:', data);
      
      return {
        success: true,
        message: `Limpieza completada: ${data.periods_deleted} períodos eliminados, ${data.payrolls_updated} payrolls actualizados`
      };
      
    } catch (error) {
      console.error('❌ Error limpiando duplicados:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error limpiando duplicados'
      };
    }
  }
}
