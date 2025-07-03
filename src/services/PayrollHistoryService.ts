
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryRecord } from '@/types/payroll-history';

export class PayrollHistoryService {
  static async getPayrollPeriods(): Promise<PayrollHistoryRecord[]> {
    try {
      console.log('🔍 Cargando historial de nómina...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('⚠️ No se encontró company_id');
        return [];
      }

      // Consultar períodos reales únicamente
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error cargando períodos:', error);
        throw error;
      }

      if (!periods || periods.length === 0) {
        console.log('✅ Historial limpio - No existen períodos de nómina');
        return [];
      }

      // Mapear a formato esperado
      const mappedPeriods: PayrollHistoryRecord[] = periods.map(period => ({
        id: period.id,
        periodo: period.periodo,
        fechaCreacion: period.created_at,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        estado: period.estado,
        empleados: period.empleados_count || 0,
        totalNomina: Number(period.total_neto) || 0,
        editable: period.estado === 'borrador',
        reportado_dian: false
      }));

      console.log(`📊 Períodos encontrados: ${mappedPeriods.length}`);
      return mappedPeriods;

    } catch (error) {
      console.error('💥 Error en getPayrollPeriods:', error);
      return [];
    }
  }

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
}
