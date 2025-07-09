
import { supabase } from '@/integrations/supabase/client';

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
   * ✅ KISS: Obtener registros de un empleado - INCLUIR LICENCIAS NO REMUNERADAS
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
        .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia', 'incapacidad'])
        .order('fecha_inicio', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      // ✅ CORREGIDO: Incluir licencias no remuneradas en tipos válidos
      const validTimeOffTypes = [
        'vacaciones', 
        'licencia_remunerada', 
        'licencia_no_remunerada', 
        'ausencia', 
        'incapacidad'
      ];
      
      const records = (novedades || [])
        .filter(novedad => validTimeOffTypes.includes(novedad.tipo_novedad))
        .map(novedad => ({
          id: novedad.id,
          employee_id: novedad.empleado_id,
          type: novedad.tipo_novedad as 'vacaciones' | 'licencia_remunerada' | 'licencia_no_remunerada' | 'ausencia' | 'incapacidad',
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
   * ✅ Obtener etiqueta del tipo - ACTUALIZADA CON DIFERENCIACIÓN LEGAL
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
   * ✅ Obtener color del tipo - ACTUALIZADA CON DIFERENCIACIÓN LEGAL
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
   * ✅ NUEVA: Obtener descripción legal del tipo
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
}
