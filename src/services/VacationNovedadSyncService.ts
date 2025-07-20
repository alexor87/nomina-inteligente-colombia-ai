import { supabase } from '@/integrations/supabase/client';
import { VacationAbsenceFormData } from '@/types/vacations';

export class VacationNovedadSyncService {
  
  /**
   * 🎯 CORRECCIÓN KISS: Crear una vacación/ausencia con periodo_id explícito
   */
  static async createVacationAbsence(formData: VacationAbsenceFormData & { periodo_id?: string }) {
    console.log('🏖️ Creating vacation with form data:', formData);
    
    // 🎯 SOLUCIÓN DIRECTA: Usar periodo_id si está disponible
    const processed_in_period_id = formData.periodo_id || null;
    
    console.log('📋 Using processed_in_period_id:', processed_in_period_id);
    
    const { data, error } = await supabase
      .from('employee_vacation_periods')
      .insert({
        employee_id: formData.employee_id,
        type: formData.type,
        subtipo: formData.subtipo,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_count: VacationNovedadSyncService.calculateDaysBetween(formData.start_date, formData.end_date),
        observations: formData.observations || '',
        status: 'pendiente',
        created_by: (await supabase.auth.getUser()).data.user?.id,
        company_id: await VacationNovedadSyncService.getCurrentCompanyId(),
        processed_in_period_id: processed_in_period_id // 🎯 CORRECCIÓN: Usar el período explícito
      })
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating vacation:', error);
      throw error;
    }
    
    console.log('✅ Vacation created successfully:', data);
    return data;
  }

  /**
   * Actualizar una vacación/ausencia - sincronización automática
   */
  static async updateVacationAbsence(id: string, formData: Partial<VacationAbsenceFormData & { periodo_id?: string }>) {
    const updateData: any = {
      ...formData,
      updated_at: new Date().toISOString()
    };

    if (formData.start_date && formData.end_date) {
      updateData.days_count = VacationNovedadSyncService.calculateDaysBetween(formData.start_date, formData.end_date);
    }

    // 🎯 CORRECCIÓN: Incluir periodo_id si está disponible
    if (formData.periodo_id !== undefined) {
      updateData.processed_in_period_id = formData.periodo_id;
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
   * 🎯 SOLUCIÓN KISS: Eliminación simplificada sin count problemático
   */
  static async deleteVacationAbsence(id: string) {
    console.log('🗑️ Eliminando registro:', id);
    
    // PASO 1: Intentar eliminar de employee_vacation_periods (tabla principal)
    const { error: vacationError } = await supabase
      .from('employee_vacation_periods')
      .delete()
      .eq('id', id);

    // Si se eliminó exitosamente de vacaciones, terminar
    if (!vacationError) {
      console.log('✅ Eliminado exitosamente de employee_vacation_periods:', id);
      return;
    }

    console.log('⚠️ No se encontró en employee_vacation_periods, intentando payroll_novedades:', vacationError?.message);

    // PASO 2: Si no se eliminó de vacaciones, intentar eliminar de novedades
    const { error: novedadError } = await supabase
      .from('payroll_novedades')
      .delete()
      .eq('id', id);

    // Verificar resultado final
    if (novedadError) {
      console.error('❌ Error eliminando de payroll_novedades:', novedadError);
      throw new Error(`No se pudo eliminar el registro: ${novedadError.message}`);
    }

    console.log('✅ Eliminado exitosamente de payroll_novedades:', id);
  }

  /**
   * ✅ SOLUCIÓN KISS: Deduplicar registros unificados por ID
   */
  private static deduplicateUnifiedData(unifiedData: any[]): any[] {
    const deduplicatedMap = new Map();
    let duplicatesDetected = 0;

    // Procesar cada registro y deduplicar por ID
    unifiedData.forEach(item => {
      const existingItem = deduplicatedMap.get(item.id);
      
      if (existingItem) {
        duplicatesDetected++;
        console.log(`🔄 Duplicado detectado ID: ${item.id}, priorizando fuente: ${existingItem.source_type}`);
        
        // REGLA KISS: Priorizar 'vacation' sobre 'novedad' para consistencia
        if (item.source_type === 'vacation' && existingItem.source_type === 'novedad') {
          deduplicatedMap.set(item.id, item);
          console.log(`✅ Reemplazado por fuente vacation: ${item.id}`);
        }
        // Si ambos son del mismo tipo o novedad tiene prioridad, mantener el existente
      } else {
        // Nuevo registro, agregarlo al mapa
        deduplicatedMap.set(item.id, item);
      }
    });

    if (duplicatesDetected > 0) {
      console.log(`🎯 DEDUPLICACIÓN KISS: ${duplicatesDetected} duplicados eliminados de vista`);
    }

    return Array.from(deduplicatedMap.values());
  }

  /**
   * Obtener datos unificados de vacaciones y novedades - CON DEDUPLICACIÓN KISS
   */
  static async getUnifiedVacationData(filters: any = {}) {
    console.log('🔍 Loading unified vacation data with filters:', filters);
    
    // Obtener company_id del usuario actual
    const companyId = await VacationNovedadSyncService.getCurrentCompanyId();
    
    // ✅ SIMPLIFICACIÓN: Obtener vacaciones SIN JOIN problemático
    const { data: vacationsData, error: vacationsError } = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees(id, nombre, apellido, cedula)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (vacationsError) {
      console.error('Error loading vacations:', vacationsError);
      throw vacationsError;
    }

    // ✅ SIMPLIFICACIÓN: Obtener novedades SIN JOIN problemático
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

    // ✅ SIMPLIFICACIÓN: Obtener estados de períodos solo cuando hay IDs únicos
    const allPeriodIds = [
      ...(vacationsData || []).map(v => v.processed_in_period_id).filter(Boolean),
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

    console.log('🔍 Period status map:', periodStatusMap);

    // Combinar y transformar datos con lógica SIMPLE
    const unifiedData = [
      ...(vacationsData || []).map(item => {
        let calculatedStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente';
        
        if (item.processed_in_period_id) {
          const periodStatus = periodStatusMap[item.processed_in_period_id];
          if (periodStatus === 'cerrado') {
            calculatedStatus = 'liquidada';
          }
        }

        console.log(`📋 Vacation ${item.id}: period_id=${item.processed_in_period_id}, period_status=${periodStatusMap[item.processed_in_period_id]}, calculated_status=${calculatedStatus}`);

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
          valor: 0,
          observacion: item.observations,
          status: calculatedStatus,
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
      
      ...(novedadesData || []).map(item => {
        let calculatedStatus: 'pendiente' | 'liquidada' | 'cancelada' = 'pendiente';
        
        if (item.periodo_id) {
          const periodStatus = periodStatusMap[item.periodo_id];
          if (periodStatus === 'cerrado') {
            calculatedStatus = 'liquidada';
          }
        }

        console.log(`📋 Novedad ${item.id}: period_id=${item.periodo_id}, period_status=${periodStatusMap[item.periodo_id]}, calculated_status=${calculatedStatus}`);

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
          status: calculatedStatus,
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

    // ✅ SOLUCIÓN KISS: Deduplicar por ID antes de aplicar filtros
    const deduplicatedData = VacationNovedadSyncService.deduplicateUnifiedData(unifiedData);

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

    console.log('✅ DATOS DEDUPLICADOS Y FILTRADOS:', {
      total: filteredData.length,
      pendientes: filteredData.filter(item => item.status === 'pendiente').length,
      liquidadas: filteredData.filter(item => item.status === 'liquidada').length,
      periodStatusMap
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
