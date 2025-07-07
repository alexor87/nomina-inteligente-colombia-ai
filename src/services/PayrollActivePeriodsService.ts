
import { supabase } from '@/integrations/supabase/client';

export interface ActivePeriodInfo {
  has_active_period: boolean;
  period?: {
    id: string;
    periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    last_activity_at: string;
    employees_count: number;
  };
}

export class PayrollActivePeriodsService {
  
  static async checkForActivePeriod(): Promise<ActivePeriodInfo> {
    try {
      console.log('🔍 Verificando períodos activos con criterios estrictos...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('❌ No se pudo obtener company_id');
        return { has_active_period: false };
      }

      // CRITERIOS MÁS ESTRICTOS: Solo períodos realmente activos
      const { data: activePeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .gt('last_activity_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Solo últimas 6 horas
        .order('last_activity_at', { ascending: false });

      if (error) {
        console.error('❌ Error consultando períodos activos:', error);
        return { has_active_period: false };
      }

      if (!activePeriods || activePeriods.length === 0) {
        console.log('✅ No hay períodos activos recientes');
        return { has_active_period: false };
      }

      // Verificar que realmente tenga empleados cargados
      const activePeriod = activePeriods[0];
      
      const { data: employeeCount, error: countError } = await supabase
        .from('payrolls')
        .select('id', { count: 'exact', head: true })
        .eq('period_id', activePeriod.id);

      if (countError) {
        console.error('❌ Error contando empleados:', countError);
        return { has_active_period: false };
      }

      const actualEmployeeCount = employeeCount?.length || 0;
      
      // Solo considerar activo si tiene empleados cargados
      if (actualEmployeeCount === 0) {
        console.log('📭 Período encontrado pero sin empleados cargados, no es realmente activo');
        return { has_active_period: false };
      }

      console.log('✅ Período activo válido encontrado:', {
        periodo: activePeriod.periodo,
        empleados: actualEmployeeCount,
        ultima_actividad: activePeriod.last_activity_at
      });

      return {
        has_active_period: true,
        period: {
          id: activePeriod.id,
          periodo: activePeriod.periodo,
          fecha_inicio: activePeriod.fecha_inicio,
          fecha_fin: activePeriod.fecha_fin,
          estado: activePeriod.estado,
          last_activity_at: activePeriod.last_activity_at,
          employees_count: actualEmployeeCount
        }
      };

    } catch (error) {
      console.error('💥 Error en verificación de períodos activos:', error);
      return { has_active_period: false };
    }
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
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

  // Limpiar períodos "fantasma" que quedaron activos sin empleados
  static async cleanGhostPeriods(): Promise<void> {
    try {
      console.log('🧹 Limpiando períodos fantasma...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return;

      // Encontrar períodos activos sin empleados
      const { data: ghostPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .eq('empleados_count', 0);

      if (ghostPeriods && ghostPeriods.length > 0) {
        // Cambiar a estado 'cancelado' en lugar de eliminar
        const { error } = await supabase
          .from('payroll_periods_real')
          .update({ estado: 'cancelado' })
          .in('id', ghostPeriods.map(p => p.id));

        if (!error) {
          console.log('✅ Períodos fantasma limpiados:', ghostPeriods.length);
        }
      }
    } catch (error) {
      console.error('❌ Error limpiando períodos fantasma:', error);
    }
  }
}
