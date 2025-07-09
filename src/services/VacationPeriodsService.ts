
import { supabase } from '@/integrations/supabase/client';
import { VacationService } from './VacationService';

export interface VacationPeriod {
  id: string;
  employee_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  observations?: string;
  status: 'confirmado' | 'liquidado' | 'cancelado';
  created_by?: string;
  processed_in_period_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVacationPeriodData {
  employee_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  observations?: string;
}

export class VacationPeriodsService {
  /**
   * ✅ KISS: Crear nuevo período de vacaciones con auto-confirmación directa
   */
  static async createPeriod(data: CreateVacationPeriodData): Promise<{ 
    success: boolean; 
    data?: VacationPeriod; 
    error?: string 
  }> {
    try {
      console.log('🏖️ Creating vacation period (Direct Flow):', data);

      // Calcular días hábiles entre fechas
      const daysCount = this.calculateBusinessDays(data.start_date, data.end_date);
      
      // Validar antes de crear
      const validation = await this.validatePeriod(data.employee_id, data.start_date, data.end_date, daysCount);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const { data: period, error } = await supabase
        .from('employee_vacation_periods')
        .insert({
          employee_id: data.employee_id,
          company_id: data.company_id,
          start_date: data.start_date,
          end_date: data.end_date,
          days_count: daysCount,
          observations: data.observations,
          status: 'confirmado', // ✅ AUTO-CONFIRMAR: No requiere aprobación adicional
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating vacation period:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Vacation period auto-confirmed successfully:', period);
      return { success: true, data: { ...period, status: period.status as 'confirmado' | 'liquidado' | 'cancelado' } };

    } catch (error: any) {
      console.error('💥 Error in createPeriod:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Obtener períodos de un empleado
   */
  static async getPeriodsByEmployee(employeeId: string): Promise<{ 
    success: boolean; 
    data?: VacationPeriod[]; 
    error?: string 
  }> {
    try {
      const { data: periods, error } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching vacation periods:', error);
        return { success: false, error: error.message };
      }

      const typedPeriods = (periods || []).map(period => ({
        ...period,
        status: period.status as 'confirmado' | 'liquidado' | 'cancelado'
      }));

      return { success: true, data: typedPeriods };

    } catch (error: any) {
      console.error('💥 Error in getPeriodsByEmployee:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Validar período (solapamiento y saldo disponible)
   */
  static async validatePeriod(
    employeeId: string, 
    startDate: string, 
    endDate: string, 
    daysCount: number,
    excludePeriodId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // 1. Validar solapamiento de fechas con períodos confirmados
      let query = supabase
        .from('employee_vacation_periods')
        .select('id, start_date, end_date')
        .eq('employee_id', employeeId)
        .eq('status', 'confirmado') // Solo períodos confirmados pueden solapar
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (excludePeriodId) {
        query = query.neq('id', excludePeriodId);
      }

      const { data: overlapping, error: overlapError } = await query;

      if (overlapError) {
        return { isValid: false, error: overlapError.message };
      }

      if (overlapping && overlapping.length > 0) {
        return { 
          isValid: false, 
          error: `Las fechas se solapan con otro período confirmado (${overlapping[0].start_date} - ${overlapping[0].end_date})` 
        };
      }

      // 2. Validar saldo disponible - ✅ FIXED: Static import
      const balanceResult = await VacationService.getVacationBalance(employeeId);
      
      if (balanceResult.success && balanceResult.data) {
        const availableDays = balanceResult.data.initial_balance || 0;
        
        // Obtener días ya usados en otros períodos confirmados
        const { data: confirmedPeriods } = await supabase
          .from('employee_vacation_periods')
          .select('days_count')
          .eq('employee_id', employeeId)
          .eq('status', 'confirmado')
          .neq('id', excludePeriodId || '');

        const usedDays = (confirmedPeriods || []).reduce((sum, p) => sum + (p.days_count || 0), 0);
        const remainingDays = availableDays - usedDays;

        if (daysCount > remainingDays) {
          return { 
            isValid: false, 
            error: `No hay suficientes días disponibles. Disponibles: ${remainingDays}, solicitados: ${daysCount}` 
          };
        }
      }

      return { isValid: true };

    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Marcar período como liquidado
   */
  static async markAsProcessed(periodId: string, processedInPeriodId: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> {
    try {
      const { error } = await supabase
        .from('employee_vacation_periods')
        .update({ 
          status: 'liquidado',
          processed_in_period_id: processedInPeriodId
        })
        .eq('id', periodId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Obtener períodos que cruzan con un período de nómina
   */
  static async getPeriodsForPayrollPeriod(
    companyId: string, 
    payrollStartDate: string, 
    payrollEndDate: string
  ): Promise<{ success: boolean; data?: VacationPeriod[]; error?: string }> {
    try {
      const { data: periods, error } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'confirmado') // Solo períodos confirmados van a liquidación
        .or(`start_date.lte.${payrollEndDate},end_date.gte.${payrollStartDate}`);

      if (error) {
        return { success: false, error: error.message };
      }

      const typedPeriods = (periods || []).map(period => ({
        ...period,
        status: period.status as 'confirmado' | 'liquidado' | 'cancelado'
      }));

      return { success: true, data: typedPeriods };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Eliminar período (solo si está confirmado, no liquidado)
   */
  static async deletePeriod(periodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('id', periodId)
        .eq('status', 'confirmado'); // Solo períodos confirmados no liquidados

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Calcular días hábiles entre dos fechas (excluyendo fines de semana)
   */
  static calculateBusinessDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }
}
