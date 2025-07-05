
/**
 * ✅ SERVICIO DE HISTORIAL SIMPLE - REPARACIÓN CRÍTICA COMPLETADA
 * Conectado con arquitectura unificada y tipos corregidos
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollStateManager } from './PayrollStateManager';
import { PayrollHistoryPeriod } from '@/types/payroll-history';

export class PayrollHistorySimpleService {
  /**
   * Obtener períodos de historial usando arquitectura unificada
   */
  static async getHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return [];
      }

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('❌ Error loading history periods:', error);
        return [];
      }

      return (periods || []).map(period => {
        const normalizedState = PayrollStateManager.normalizeState(period.estado);
        
        // Mapear estados normalizados a los tipos esperados por el historial
        let historyStatus: PayrollHistoryPeriod['status'];
        switch (normalizedState) {
          case 'draft':
            historyStatus = 'borrador';
            break;
          case 'active':
            historyStatus = 'borrador'; // Los activos se consideran borradores para el historial
            break;
          case 'closed':
            historyStatus = 'cerrado';
            break;
          default:
            historyStatus = 'borrador';
        }

        return {
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
          employeesCount: period.empleados_count || 0,
          status: historyStatus,
          totalGrossPay: Number(period.total_devengado) || 0,
          totalNetPay: Number(period.total_neto) || 0,
          totalDeductions: Number(period.total_deducciones) || 0,
          totalCost: Number(period.total_devengado) || 0,
          employerContributions: (Number(period.total_devengado) || 0) * 0.205,
          paymentStatus: historyStatus === 'cerrado' ? 'pagado' : 'pendiente',
          version: 1,
          createdAt: period.created_at,
          updatedAt: period.updated_at,
          editable: PayrollStateManager.canEditPeriod(normalizedState)
        } as PayrollHistoryPeriod;
      });

    } catch (error) {
      console.error('❌ Error in getHistoryPeriods:', error);
      return [];
    }
  }

  /**
   * Limpiar períodos duplicados (método agregado para compatibilidad)
   */
  static async cleanDuplicatePeriods(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('clean_duplicate_periods');
      
      if (error) {
        throw error;
      }

      // Verificar tipo de respuesta y extraer mensaje de forma segura
      let message = 'Períodos duplicados limpiados exitosamente';
      if (data && typeof data === 'object' && 'message' in data) {
        message = String(data.message);
      } else if (typeof data === 'string') {
        message = data;
      }

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error cleaning duplicate periods:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error limpiando duplicados'
      };
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
}
