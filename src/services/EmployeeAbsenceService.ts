import { supabase } from '@/integrations/supabase/client';
import { VacationAbsenceFormData } from '@/types/vacations';

export class EmployeeAbsenceService {

  /**
   * Crear ausencia con campos boolean seguros
   */
  static async createAbsence(formData: VacationAbsenceFormData & { periodo_id?: string }) {
    console.log('Creating absence with form data:', formData);

    const processed_in_period_id = formData.periodo_id || null;

    console.log('Using processed_in_period_id:', processed_in_period_id);

    const insertData = {
      employee_id: formData.employee_id,
      type: formData.type,
      subtipo: formData.subtipo || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_count: EmployeeAbsenceService.calculateDaysBetween(formData.start_date, formData.end_date),
      observations: formData.observations || '',
      status: 'pendiente',
      created_by: (await supabase.auth.getUser()).data.user?.id,
      company_id: await EmployeeAbsenceService.getCurrentCompanyId(),
      processed_in_period_id: processed_in_period_id
    };

    console.log('Insert data prepared:', insertData);

    const { data, error } = await supabase
      .from('employee_absences')
      .insert(insertData)
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .single();

    if (error) {
      console.error('Error creating absence:', error);
      throw error;
    }

    console.log('Absence created successfully:', data);
    return data;
  }

  /**
   * Actualizar ausencia con valores seguros
   */
  static async updateAbsence(id: string, formData: Partial<VacationAbsenceFormData & { periodo_id?: string }>) {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (formData.employee_id !== undefined) updateData.employee_id = formData.employee_id;
    if (formData.type !== undefined) updateData.type = formData.type;
    if (formData.subtipo !== undefined) updateData.subtipo = formData.subtipo || null;
    if (formData.start_date !== undefined) updateData.start_date = formData.start_date;
    if (formData.end_date !== undefined) updateData.end_date = formData.end_date;
    if (formData.observations !== undefined) updateData.observations = formData.observations || '';
    if (formData.periodo_id !== undefined) updateData.processed_in_period_id = formData.periodo_id || null;

    if (formData.start_date && formData.end_date) {
      updateData.days_count = EmployeeAbsenceService.calculateDaysBetween(formData.start_date, formData.end_date);
    }

    console.log('Update data prepared:', updateData);

    const { data, error } = await supabase
      .from('employee_absences')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .single();

    if (error) {
      console.error('Error updating absence:', error);
      throw error;
    }

    console.log('Absence updated successfully:', data);
    return data;
  }

  /**
   * Eliminacion simplificada
   */
  static async deleteAbsence(id: string) {
    console.log('Eliminando registro:', id);

    const { error: absenceError } = await supabase
      .from('employee_absences')
      .delete()
      .eq('id', id);

    if (!absenceError) {
      console.log('Eliminado exitosamente de employee_absences:', id);
      return;
    }

    console.log('No se encontro en employee_absences, intentando payroll_novedades:', absenceError?.message);

    const { error: novedadError } = await supabase
      .from('payroll_novedades')
      .delete()
      .eq('id', id);

    if (novedadError) {
      console.error('Error eliminando de payroll_novedades:', novedadError);
      throw new Error(`No se pudo eliminar el registro: ${novedadError.message}`);
    }

    console.log('Eliminado exitosamente de payroll_novedades:', id);
  }

  /**
   * Deduplicar registros unificados por ID
   */
  private static deduplicateAbsenceData(unifiedData: any[]): any[] {
    const deduplicatedMap = new Map();
    let duplicatesDetected = 0;

    unifiedData.forEach(item => {
      const existingItem = deduplicatedMap.get(item.id);

      if (existingItem) {
        duplicatesDetected++;
        console.log(`Duplicado detectado ID: ${item.id}, priorizando fuente: ${existingItem.source_type}`);

        if (item.source_type === 'vacation' && existingItem.source_type === 'novedad') {
          deduplicatedMap.set(item.id, item);
          console.log(`Reemplazado por fuente vacation: ${item.id}`);
        }
      } else {
        deduplicatedMap.set(item.id, item);
      }
    });

    if (duplicatesDetected > 0) {
      console.log(`DEDUPLICACION: ${duplicatesDetected} duplicados eliminados de vista`);
    }

    return Array.from(deduplicatedMap.values());
  }

  /**
   * Obtener datos unificados con manejo seguro de campos
   */
  static async getUnifiedAbsenceData(filters: any = {}) {
    console.log('Loading unified absence data with filters:', filters);

    const companyId = await EmployeeAbsenceService.getCurrentCompanyId();

    const { data: absencesData, error: absencesError } = await supabase
      .from('employee_absences')
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (absencesError) {
      console.error('Error loading absences:', absencesError);
      throw absencesError;
    }

    const { data: novedadesData, error: novedadesError } = await supabase
      .from('payroll_novedades')
      .select(`
        *,
        empleado:employees(id, nombre, apellido, cedula)
      `)
      .eq('company_id', companyId)
      .in('tipo_novedad', ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'])
      .order('created_at', { ascending: false });

    if (novedadesError) {
      console.error('Error loading novedades:', novedadesError);
      throw novedadesError;
    }

    const allPeriodIds = [
      ...(absencesData || []).map(v => v.processed_in_period_id).filter(Boolean),
      ...(novedadesData || []).map(n => n.periodo_id).filter(Boolean)
    ];

    const uniquePeriodIds = [...new Set(allPeriodIds)];
    let periodStatusMap: Record<string, string> = {};

    if (uniquePeriodIds.length > 0) {
      const { data: periodsData } = await supabase
        .from('payroll_periods_real')
        .select('id, estado')
        .in('id', uniquePeriodIds);

      if (periodsData) {
        periodStatusMap = periodsData.reduce((acc, period) => {
          acc[period.id] = period.estado;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    console.log('Period status map:', periodStatusMap);

    const unifiedData = [
      ...(absencesData || []).map(item => {
        let calculatedStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente';

        if (item.processed_in_period_id) {
          const periodStatus = periodStatusMap[item.processed_in_period_id];
          if (periodStatus === 'cerrado') {
            calculatedStatus = 'liquidada';
          }
        }

        return {
          source_type: 'vacation' as const,
          id: item.id,
          empleado_id: item.employee_id,
          company_id: item.company_id,
          periodo_id: item.processed_in_period_id,
          tipo_novedad: item.type,
          subtipo: item.subtipo || '',
          fecha_inicio: item.start_date,
          fecha_fin: item.end_date,
          dias: item.days_count || 0,
          valor: 0,
          observacion: item.observations || '',
          status: calculatedStatus,
          creado_por: item.created_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
          employee_nombre: item.employee?.nombre || '',
          employee_apellido: item.employee?.apellido || '',
          employee_cedula: item.employee?.cedula || '',
          employee: item.employee || { id: '', nombre: '', apellido: '', cedula: '' },
          employee_id: item.employee_id,
          type: item.type as any,
          start_date: item.start_date,
          end_date: item.end_date,
          days_count: item.days_count || 0,
          observations: item.observations || '',
          created_by: item.created_by,
          processed_in_period_id: item.processed_in_period_id
        };
      }),

      ...(novedadesData || []).map(item => {
        let calculatedStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente';

        if (item.periodo_id) {
          const periodStatus = periodStatusMap[item.periodo_id];
          if (periodStatus === 'cerrado') {
            calculatedStatus = 'liquidada';
          }
        }

        return {
          source_type: 'novedad' as const,
          id: item.id,
          empleado_id: item.empleado_id,
          company_id: item.company_id,
          periodo_id: item.periodo_id,
          tipo_novedad: item.tipo_novedad,
          subtipo: item.subtipo || '',
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          dias: item.dias || 0,
          valor: item.valor || 0,
          observacion: item.observacion || '',
          status: calculatedStatus,
          creado_por: item.creado_por,
          created_at: item.created_at,
          updated_at: item.updated_at,
          employee_nombre: item.empleado?.nombre || '',
          employee_apellido: item.empleado?.apellido || '',
          employee_cedula: item.empleado?.cedula || '',
          employee: item.empleado || { id: '', nombre: '', apellido: '', cedula: '' },
          employee_id: item.empleado_id,
          type: item.tipo_novedad as any,
          start_date: item.fecha_inicio,
          end_date: item.fecha_fin,
          days_count: item.dias || 0,
          observations: item.observacion || '',
          created_by: item.creado_por,
          processed_in_period_id: item.periodo_id
        };
      })
    ];

    const deduplicatedData = EmployeeAbsenceService.deduplicateAbsenceData(unifiedData);

    // Aplicar filtros
    let filteredData = deduplicatedData;

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
      filteredData = filteredData.filter(item => item.fecha_inicio && item.fecha_inicio >= filters.date_from);
    }
    if (filters.date_to) {
      filteredData = filteredData.filter(item => item.fecha_fin && item.fecha_fin <= filters.date_to);
    }

    console.log('DATOS DEDUPLICADOS Y FILTRADOS:', {
      total: filteredData.length,
      pendientes: filteredData.filter(item => item.status === 'pendiente').length,
      liquidadas: filteredData.filter(item => item.status === 'liquidada').length,
      periodStatusMap
    });

    return filteredData.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Suscribirse a cambios en tiempo real
   */
  static subscribeToAbsenceChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('absence-novedad-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_absences'
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
   * Calcular dias entre fechas
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

  // Aliases para backward compatibility (VacationNovedadSyncService)
  static createVacationAbsence = EmployeeAbsenceService.createAbsence;
  static getUnifiedVacationData = EmployeeAbsenceService.getUnifiedAbsenceData;
  static updateVacationAbsence = EmployeeAbsenceService.updateAbsence;
  static deleteVacationAbsence = EmployeeAbsenceService.deleteAbsence;
  static subscribeToVacationChanges = EmployeeAbsenceService.subscribeToAbsenceChanges;
}
