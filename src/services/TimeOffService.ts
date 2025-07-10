
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export interface TimeOffRecord {
  id: string;
  employee_id: string;
  type: 'vacaciones' | 'licencia_remunerada' | 'licencia_no_remunerada' | 'ausencia' | 'incapacidad';
  start_date: string;
  end_date: string;
  days: number;
  observations?: string;
  created_at: string;
}

export interface CreateTimeOffData {
  employee_id: string;
  type: 'vacaciones' | 'licencia_remunerada' | 'licencia_no_remunerada' | 'ausencia' | 'incapacidad';
  start_date: string;
  end_date: string;
  observations?: string;
}

export class TimeOffService {
  /**
   * ✅ ARQUITECTURA CORRECTA: Crear registro independiente en employee_vacation_periods
   * No requiere período de nómina activo - estos son registros históricos del empleado
   */
  static async createTimeOff(data: CreateTimeOffData): Promise<{ 
    success: boolean; 
    data?: TimeOffRecord; 
    error?: string 
  }> {
    try {
      console.log('🎯 Creating time off record:', data);
      
      // Calcular días hábiles
      const days = this.calculateBusinessDays(data.start_date, data.end_date);
      
      // Obtener company_id del empleado
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', data.employee_id)
        .single();

      if (employeeError || !employee) {
        console.error('❌ Employee not found:', employeeError);
        return { success: false, error: 'Empleado no encontrado' };
      }

      console.log('✅ Employee found:', employee);

      // ✅ CREAR REGISTRO EN TABLA CORRECTA - employee_vacation_periods
      const { data: timeOffRecord, error } = await supabase
        .from('employee_vacation_periods')
        .insert({
          employee_id: data.employee_id,
          company_id: employee.company_id,
          start_date: data.start_date,
          end_date: data.end_date,
          days_count: days,
          observations: data.observations || `${this.getTypeLabel(data.type)} registrada desde perfil empleado`,
          status: 'pendiente', // Se procesará en la liquidación
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating time off record:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Time off record created successfully:', timeOffRecord);

      return { 
        success: true, 
        data: {
          id: timeOffRecord.id,
          employee_id: data.employee_id,
          type: data.type,
          start_date: data.start_date,
          end_date: data.end_date,
          days: days,
          observations: data.observations,
          created_at: timeOffRecord.created_at
        }
      };

    } catch (error: any) {
      console.error('❌ Unexpected error in createTimeOff:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ ARQUITECTURA CORRECTA: Obtener registros históricos del empleado
   */
  static async getEmployeeTimeOff(employeeId: string): Promise<{ 
    success: boolean; 
    data?: TimeOffRecord[]; 
    error?: string 
  }> {
    try {
      console.log('🔍 Loading time off records for employee:', employeeId);

      const { data: records, error } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('❌ Error loading time off records:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Time off records loaded:', records);

      const timeOffRecords = (records || []).map(record => ({
        id: record.id,
        employee_id: record.employee_id,
        type: this.mapVacationTypeToTimeOffType(record), // Mapear según el contexto
        start_date: record.start_date,
        end_date: record.end_date,
        days: record.days_count,
        observations: record.observations,
        created_at: record.created_at
      }));

      return { success: true, data: timeOffRecords };

    } catch (error: any) {
      console.error('❌ Unexpected error in getEmployeeTimeOff:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ ARQUITECTURA CORRECTA: Eliminar registro independiente
   */
  static async deleteTimeOff(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting time off record:', id);

      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting time off record:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Time off record deleted successfully');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Unexpected error in deleteTimeOff:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Calcular días hábiles (sin cambios)
   */
  static calculateBusinessDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * ✅ Mapear tipo de vacación a tipo de tiempo libre
   */
  private static mapVacationTypeToTimeOffType(record: any): 'vacaciones' | 'licencia_remunerada' | 'licencia_no_remunerada' | 'ausencia' | 'incapacidad' {
    // Por ahora asumimos que son vacaciones, pero esto se puede extender
    // cuando se implemente una clasificación más detallada
    if (record.observations?.includes('Licencia Remunerada')) return 'licencia_remunerada';
    if (record.observations?.includes('Licencia No Remunerada')) return 'licencia_no_remunerada';
    if (record.observations?.includes('Ausencia')) return 'ausencia';
    if (record.observations?.includes('Incapacidad')) return 'incapacidad';
    
    return 'vacaciones'; // Por defecto
  }

  /**
   * ✅ Obtener etiqueta del tipo
   */
  static getTypeLabel(type: string): string {
    const labels = {
      'vacaciones': 'Vacaciones',
      'licencia_remunerada': 'Licencia Remunerada',
      'licencia_no_remunerada': 'Licencia No Remunerada',
      'ausencia': 'Ausencia Injustificada',
      'incapacidad': 'Incapacidad'
    };
    return labels[type as keyof typeof labels] || type;
  }

  /**
   * ✅ Obtener color del tipo
   */
  static getTypeColor(type: string): string {
    const colors = {
      'vacaciones': 'text-blue-600 bg-blue-50 border-blue-200',
      'licencia_remunerada': 'text-green-600 bg-green-50 border-green-200',
      'licencia_no_remunerada': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'ausencia': 'text-red-600 bg-red-50 border-red-200',
      'incapacidad': 'text-purple-600 bg-purple-50 border-purple-200'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  /**
   * ✅ Obtener descripción legal del tipo
   */
  static getTypeLegalDescription(type: string): string {
    const descriptions = {
      'licencia_remunerada': 'Derecho del trabajador con pago del 100% del salario (Arts. 57, 230 CST)',
      'licencia_no_remunerada': 'Permiso autorizado sin pago que mantiene el vínculo laboral (Art. 51 CST)',
      'ausencia': 'Ausencia que genera descuento salarial por incumplimiento (Art. 57 CST)',
      'vacaciones': 'Descanso remunerado anual (Arts. 186-192 CST)',
      'incapacidad': 'Ausencia por enfermedad con cobertura de seguridad social'
    };
    return descriptions[type as keyof typeof descriptions] || '';
  }

  /**
   * ✅ NUEVA FUNCIÓN: Obtener registros para procesamiento en nómina
   * Esta función se usará durante la liquidación para consultar tiempo libre
   */
  static async getTimeOffForPayrollProcessing(
    employeeId: string, 
    periodStart: string, 
    periodEnd: string
  ): Promise<TimeOffRecord[]> {
    try {
      const { data: records, error } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'pendiente')
        .gte('start_date', periodStart)
        .lte('end_date', periodEnd);

      if (error) {
        console.error('❌ Error loading time off for payroll:', error);
        return [];
      }

      return (records || []).map(record => ({
        id: record.id,
        employee_id: record.employee_id,
        type: this.mapVacationTypeToTimeOffType(record),
        start_date: record.start_date,
        end_date: record.end_date,
        days: record.days_count,
        observations: record.observations,
        created_at: record.created_at
      }));

    } catch (error) {
      console.error('❌ Error in getTimeOffForPayrollProcessing:', error);
      return [];
    }
  }
}
