import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService } from '../PayrollPeriodService';
import { PayrollPeriod } from '@/types/payroll';

export class PayrollPeriodValidationService {
  // Validar que no haya periodos superpuestos - VERSIÓN MEJORADA
  static async validateNonOverlappingPeriod(
    startDate: string, 
    endDate: string, 
    excludePeriodId?: string
  ): Promise<{ isValid: boolean; conflictPeriod?: PayrollPeriod }> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return { isValid: false };

      console.log('🔍 Validando superposición de períodos para empresa:', companyId);
      console.log('📅 Período a validar:', { startDate, endDate, excludePeriodId });

      // Obtener todos los períodos activos de la empresa
      const { data: periods, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .neq('estado', 'cancelado'); // Excluir períodos cancelados

      if (error) {
        console.error('❌ Error consultando períodos:', error);
        throw error;
      }

      console.log('📊 Períodos encontrados:', periods?.length || 0);

      if (!periods || periods.length === 0) {
        console.log('✅ No hay períodos existentes, validación exitosa');
        return { isValid: true };
      }

      // Filtrar período excluido si se especifica
      const periodsToCheck = excludePeriodId 
        ? periods.filter(p => p.id !== excludePeriodId)
        : periods;

      console.log('📋 Períodos a verificar después de filtros:', periodsToCheck.length);

      // Verificar superposición con cada período
      const newStart = new Date(startDate).getTime();
      const newEnd = new Date(endDate).getTime();

      for (const period of periodsToCheck) {
        const periodStart = new Date(period.fecha_inicio).getTime();
        const periodEnd = new Date(period.fecha_fin).getTime();
        
        // Verificar si hay superposición:
        // Hay superposición si el nuevo período empieza antes de que termine el existente
        // Y termina después de que empiece el existente
        const overlaps = newStart <= periodEnd && newEnd >= periodStart;
        
        if (overlaps) {
          console.log('⚠️ Superposición detectada:', {
            periodoExistente: {
              id: period.id,
              inicio: period.fecha_inicio,
              fin: period.fecha_fin,
              estado: period.estado
            },
            periodoNuevo: { inicio: startDate, fin: endDate }
          });
          
          return { 
            isValid: false, 
            conflictPeriod: period as PayrollPeriod 
          };
        }
      }

      console.log('✅ No se detectaron superposiciones');
      return { isValid: true };
      
    } catch (error) {
      console.error('❌ Error validando superposición de periodos:', error);
      return { isValid: false };
    }
  }
}
