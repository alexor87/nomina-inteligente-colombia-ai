
import { supabase } from '@/integrations/supabase/client';

export interface TimeOffRecord {
  id: string;
  employee_id: string;
  type: 'vacaciones' | 'licencia_remunerada' | 'ausencia' | 'incapacidad';
  start_date: string;
  end_date: string;
  days: number;
  observations?: string;
  created_at: string;
}

export interface CreateTimeOffData {
  employee_id: string;
  type: 'vacaciones' | 'licencia_remunerada' | 'ausencia' | 'incapacidad';
  start_date: string;
  end_date: string;
  observations?: string;
}

export class TimeOffService {
  /**
   * ✅ KISS: Crear registro directo en payroll_novedades
   */
  static async createTimeOff(data: CreateTimeOffData): Promise<{ 
    success: boolean; 
    data?: TimeOffRecord; 
    error?: string 
  }> {
    try {
      // Calcular días hábiles
      const days = this.calculateBusinessDays(data.start_date, data.end_date);
      
      // Obtener período activo de la empresa
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', data.employee_id)
        .single();

      if (!employee) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      // Buscar período activo
      const { data: activePeriod } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', employee.company_id)
        .eq('estado', 'en_proceso')
        .single();

      if (!activePeriod) {
        return { success: false, error: 'No hay período de nómina activo' };
      }

      // Crear novedad directamente
      const { data: novedad, error } = await supabase
        .from('payroll_novedades')
        .insert({
          company_id: employee.company_id,
          empleado_id: data.employee_id,
          periodo_id: activePeriod.id,
          tipo_novedad: data.type,
          fecha_inicio: data.start_date,
          fecha_fin: data.end_date,
          dias: days,
          valor: 0, // Se calculará en liquidación
          observacion: data.observations || `${this.getTypeLabel(data.type)} registrada desde perfil empleado`,
          creado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          id: novedad.id,
          employee_id: data.employee_id,
          type: data.type,
          start_date: data.start_date,
          end_date: data.end_date,
          days: days,
          observations: data.observations,
          created_at: novedad.created_at
        }
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Obtener registros de un empleado
   */
  static async getEmployeeTimeOff(employeeId: string): Promise<{ 
    success: boolean; 
    data?: TimeOffRecord[]; 
    error?: string 
  }> {
    try {
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'ausencia', 'incapacidad'])
        .order('fecha_inicio', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const records = (novedades || []).map(novedad => ({
        id: novedad.id,
        employee_id: novedad.empleado_id,
        type: novedad.tipo_novedad,
        start_date: novedad.fecha_inicio || '',
        end_date: novedad.fecha_fin || '',
        days: novedad.dias || 0,
        observations: novedad.observacion,
        created_at: novedad.created_at
      }));

      return { success: true, data: records };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ KISS: Eliminar registro
   */
  static async deleteTimeOff(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Calcular días hábiles
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
   * ✅ Obtener etiqueta del tipo
   */
  static getTypeLabel(type: string): string {
    const labels = {
      'vacaciones': 'Vacaciones',
      'licencia_remunerada': 'Licencia Remunerada',
      'ausencia': 'Ausencia',
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
      'ausencia': 'text-orange-600 bg-orange-50 border-orange-200',
      'incapacidad': 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  }
}
