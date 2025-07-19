import { supabase } from '@/integrations/supabase/client';
import { VacationAbsenceFormData } from '@/types/vacations';

export class VacationNovedadSyncService {
  
  /**
   * Crear una vacación/ausencia - automáticamente sincronizada via triggers DB
   */
  static async createVacationAbsence(formData: VacationAbsenceFormData) {
    const { data, error } = await supabase
      .from('employee_vacation_periods')
      .insert({
        employee_id: formData.employee_id,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_count: this.calculateDays(formData.start_date, formData.end_date),
        observations: formData.observations || '',
        status: 'pendiente',
        created_by: (await supabase.auth.getUser()).data.user?.id,
        company_id: await this.getCurrentCompanyId()
      })
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Actualizar una vacación/ausencia - sincronización automática
   */
  static async updateVacationAbsence(id: string, formData: Partial<VacationAbsenceFormData>) {
    const updateData: any = {
      ...formData,
      updated_at: new Date().toISOString()
    };

    if (formData.start_date && formData.end_date) {
      updateData.days_count = this.calculateDays(formData.start_date, formData.end_date);
    }

    const { data, error } = await supabase
      .from('employee_vacation_periods')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Eliminar vacación/ausencia - sincronización automática
   */
  static async deleteVacationAbsence(id: string) {
    const { error } = await supabase
      .from('employee_vacation_periods')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Obtener datos unificados de vacaciones y novedades con estados corregidos
   */
  static async getUnifiedVacationData(filters: any = {}) {
    // Obtener vacaciones con estado correcto del período
    const vacationsResult = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula),
        period:payroll_periods_real!processed_in_period_id(id, estado, periodo)
      `)
      .order('created_at', { ascending: false });

    // Obtener novedades relacionadas con vacaciones/ausencias
    const novedadesResult = await supabase
      .from('payroll_novedades')
      .select(`
        *,
        empleado:employees(id, nombre, apellido, cedula),
        periodo:payroll_periods_real!periodo_id(id, estado, periodo)
      `)
      .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'])
      .order('created_at', { ascending: false });

    if (vacationsResult.error) throw vacationsResult.error;
    if (novedadesResult.error) throw novedadesResult.error;

    // Combinar y transformar datos con estado corregido
    const unifiedData = [
      ...(vacationsResult.data || []).map(item => {
        // Determinar estado correcto basado en el período
        let correctStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente';
        
        if (item.status === 'cancelada') {
          correctStatus = 'cancelada';
        } else if (item.processed_in_period_id && item.period?.estado === 'cerrado') {
          correctStatus = 'liquidada';
        } else {
          correctStatus = 'pendiente';
        }

        return {
          source_type: 'vacation' as const,
          id: item.id,
          empleado_id: item.employee_id,
          company_id: item.company_id,
          periodo_id: item.processed_in_period_id,
          tipo_novedad: item.type,
          subtipo: item.subtipo,
          fecha_inicio: item.start_date,
          fecha_fin: item.end_date,
          dias: item.days_count,
          valor: 0, // Se calculará en el backend
          observacion: item.observations,
          status: correctStatus, // Estado corregido
          creado_por: item.created_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
          employee_nombre: item.employee?.nombre || '',
          employee_apellido: item.employee?.apellido || '',
          employee_cedula: item.employee?.cedula || '',
          employee: item.employee || { id: '', nombre: '', apellido: '', cedula: '' },
          
          // Mapped properties for compatibility
          employee_id: item.employee_id,
          type: item.type as any,
          start_date: item.start_date,
          end_date: item.end_date,
          days_count: item.days_count,
          observations: item.observations,
          created_by: item.created_by,
          processed_in_period_id: item.processed_in_period_id
        };
      }),
      ...(novedadesResult.data || []).map(item => {
        // Determinar estado correcto para novedades
        let correctStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente';
        
        if (item.periodo_id && item.periodo?.estado === 'cerrado') {
          correctStatus = 'liquidada';
        } else {
          correctStatus = 'pendiente';
        }

        return {
          source_type: 'novedad' as const,
          id: item.id,
          empleado_id: item.empleado_id,
          company_id: item.company_id,
          periodo_id: item.periodo_id,
          tipo_novedad: item.tipo_novedad,
          subtipo: item.subtipo,
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          dias: item.dias || 0,
          valor: item.valor || 0,
          observacion: item.observacion,
          status: correctStatus, // Estado corregido
          creado_por: item.creado_por,
          created_at: item.created_at,
          updated_at: item.updated_at,
          employee_nombre: item.empleado?.nombre || '',
          employee_apellido: item.empleado?.apellido || '',
          employee_cedula: item.empleado?.cedula || '',
          employee: item.empleado || { id: '', nombre: '', apellido: '', cedula: '' },
          
          // Mapped properties for compatibility
          employee_id: item.empleado_id,
          type: item.tipo_novedad as any,
          start_date: item.fecha_inicio,
          end_date: item.fecha_fin,
          days_count: item.dias || 0,
          observations: item.observacion,
          created_by: item.creado_por,
          processed_in_period_id: item.periodo_id
        };
      })
    ];

    // Aplicar filtros
    let filteredData = unifiedData;
    
    if (filters.type) {
      filteredData = filteredData.filter(item => item.tipo_novedad === filters.type);
    }
    if (filters.status) {
      filteredData = filteredData.filter(item => item.status === filters.status);
    }
    if (filters.employee_search) {
      const search = filters.employee_search.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.employee_nombre?.toLowerCase().includes(search) ||
        item.employee_apellido?.toLowerCase().includes(search) ||
        item.employee_cedula?.toLowerCase().includes(search)
      );
    }
    if (filters.date_from) {
      filteredData = filteredData.filter(item => item.fecha_inicio >= filters.date_from);
    }
    if (filters.date_to) {
      filteredData = filteredData.filter(item => item.fecha_fin <= filters.date_to);
    }

    // Ordenar por fecha de creación descendente
    return filteredData.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Suscribirse a cambios en tiempo real
   */
  static subscribeToVacationChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('vacation-novedad-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_vacation_periods'
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payroll_novedades',
          filter: 'tipo_novedad=in.(vacaciones,licencia_remunerada,licencia_no_remunerada,incapacidad,ausencia)'
        },
        callback
      )
      .subscribe();

    return channel;
  }

  /**
   * Calcular días entre fechas
   */
  private static calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Obtener company_id del usuario actual
   */
  private static async getCurrentCompanyId(): Promise<string> {
    const { data, error } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (error || !data?.company_id) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }
    return data.company_id;
  }
}
