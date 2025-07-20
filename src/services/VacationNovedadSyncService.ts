
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
        days_count: VacationNovedadSyncService.calculateDaysBetween(formData.start_date, formData.end_date),
        observations: formData.observations || '',
        status: 'pendiente',
        created_by: (await supabase.auth.getUser()).data.user?.id,
        company_id: await VacationNovedadSyncService.getCurrentCompanyId()
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
      updateData.days_count = VacationNovedadSyncService.calculateDaysBetween(formData.start_date, formData.end_date);
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
   * Obtener datos unificados de vacaciones y novedades
   */
  static async getUnifiedVacationData(filters: any = {}) {
    console.log('🔍 Loading unified vacation data with filters:', filters);
    
    // Obtener company_id del usuario actual
    const companyId = await VacationNovedadSyncService.getCurrentCompanyId();
    
    // ✅ CORRECCIÓN CRÍTICA: Obtener vacaciones/ausencias con estado real del período
    const { data: vacationsData, error: vacationsError } = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula),
        period:payroll_periods_real!processed_in_period_id(id, estado)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (vacationsError) {
      console.error('Error loading vacations:', vacationsError);
      throw vacationsError;
    }

    // ✅ CORRECCIÓN CRÍTICA: Obtener novedades con estado real del período
    const { data: novedadesData, error: novedadesError } = await supabase
      .from('payroll_novedades')
      .select(`
        *,
        empleado:employees(id, nombre, apellido, cedula),
        period:payroll_periods_real!periodo_id(id, estado)
      `)
      .eq('company_id', companyId)
      .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'])
      .order('created_at', { ascending: false });

    if (novedadesError) {
      console.error('Error loading novedades:', novedadesError);
      throw novedadesError;
    }

    // Combinar y transformar datos
    const unifiedData = [
      // ✅ CORRECCIÓN: Transformar vacaciones con estado correcto
      ...(vacationsData || []).map(item => {
        // Determinar estado real basado en el estado del período
        let calculatedStatus: 'pendiente' | 'liquidada' | 'cancelada' = item.status as 'pendiente' | 'liquidada' | 'cancelada';
        
        // Solo cambiar a 'liquidada' si el período está realmente cerrado
        if (item.processed_in_period_id && item.period && item.period.estado === 'cerrado') {
          calculatedStatus = 'liquidada';
        } else if (item.processed_in_period_id && item.period && item.period.estado !== 'cerrado') {
          calculatedStatus = 'pendiente'; // Forzar a pendiente si el período no está cerrado
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
          status: calculatedStatus, // ✅ USAR ESTADO CALCULADO CORRECTO
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
      
      // ✅ CORRECCIÓN: Transformar novedades con estado correcto
      ...(novedadesData || []).map(item => {
        // Determinar estado real basado en el estado del período
        let calculatedStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente'; // Por defecto pendiente
        
        // Solo marcar como liquidada si el período está realmente cerrado
        if (item.periodo_id && item.period && item.period.estado === 'cerrado') {
          calculatedStatus = 'liquidada';
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
          status: calculatedStatus, // ✅ USAR ESTADO CALCULADO CORRECTO
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

    console.log('✅ Datos unificados con estados corregidos:', {
      total: filteredData.length,
      pendientes: filteredData.filter(item => item.status === 'pendiente').length,
      liquidadas: filteredData.filter(item => item.status === 'liquidada').length
    });

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
  private static calculateDaysBetween(startDate: string, endDate: string): number {
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
