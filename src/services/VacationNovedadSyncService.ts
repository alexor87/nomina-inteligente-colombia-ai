
import { supabase } from '@/integrations/supabase/client';
import { RealtimeService } from '@/services/RealtimeService';

/**
 * ✅ SERVICIO DE SINCRONIZACIÓN BIDIRECCIONAL REAL-TIME
 * Sincroniza automáticamente entre módulos de Vacaciones y Novedades
 */
export class VacationNovedadSyncService {
  private static isInitialized = false;

  static initialize(companyId: string) {
    if (this.isInitialized) return;

    console.log('🔄 Inicializando sincronización bidireccional vacaciones-novedades');

    // Escuchar cambios en novedades para actualizar vacaciones
    RealtimeService.subscribeToNovedades((event) => {
      if (event.eventType === 'INSERT' && event.new) {
        this.syncNovedadToVacation(event.new);
      } else if (event.eventType === 'UPDATE' && event.new) {
        this.updateVacationFromNovedad(event.new);
      } else if (event.eventType === 'DELETE' && event.old) {
        this.removeVacationFromNovedad(event.old);
      }
    }, companyId);

    // Escuchar cambios en vacaciones para actualizar novedades
    RealtimeService.subscribeToTable('employee_vacation_periods', (event) => {
      if (event.eventType === 'INSERT' && event.new) {
        this.syncVacationToNovedad(event.new);
      } else if (event.eventType === 'UPDATE' && event.new) {
        this.updateNovedadFromVacation(event.new);
      } else if (event.eventType === 'DELETE' && event.old) {
        this.removeNovedadFromVacation(event.old);
      }
    }, companyId);

    this.isInitialized = true;
  }

  static async syncNovedadToVacation(novedad: any) {
    try {
      console.log('📝 Sincronizando novedad a vacación:', novedad);

      // Solo sincronizar si es un tipo de ausencia/vacación
      if (!this.isVacationType(novedad.tipo_novedad)) return;

      // Verificar si ya existe la vacación correspondiente
      const { data: existingVacation } = await supabase
        .from('employee_vacation_periods')
        .select('id')
        .eq('employee_id', novedad.empleado_id)
        .eq('start_date', novedad.fecha_inicio)
        .eq('end_date', novedad.fecha_fin)
        .eq('type', novedad.tipo_novedad)
        .maybeSingle();

      if (existingVacation) {
        console.log('⏭️ Vacación ya existe, saltando sincronización');
        return;
      }

      // Crear nueva vacación desde novedad
      const { error } = await supabase
        .from('employee_vacation_periods')
        .insert({
          employee_id: novedad.empleado_id,
          company_id: novedad.company_id,
          type: novedad.tipo_novedad,
          subtipo: novedad.subtipo,
          start_date: novedad.fecha_inicio,
          end_date: novedad.fecha_fin,
          days_count: novedad.dias || this.calculateDays(novedad.fecha_inicio, novedad.fecha_fin),
          observations: novedad.observacion,
          status: 'liquidado', // Ya está en nómina
          created_by: novedad.creado_por
        });

      if (error) {
        console.error('❌ Error sincronizando novedad a vacación:', error);
      } else {
        console.log('✅ Novedad sincronizada a vacación exitosamente');
      }
    } catch (error) {
      console.error('💥 Error en syncNovedadToVacation:', error);
    }
  }

  static async syncVacationToNovedad(vacation: any) {
    try {
      console.log('🏖️ Sincronizando vacación a novedad:', vacation);

      // Verificar si ya existe la novedad correspondiente
      const { data: existingNovedad } = await supabase
        .from('payroll_novedades')
        .select('id')
        .eq('empleado_id', vacation.employee_id)
        .eq('fecha_inicio', vacation.start_date)
        .eq('fecha_fin', vacation.end_date)
        .eq('tipo_novedad', vacation.type)
        .maybeSingle();

      if (existingNovedad) {
        console.log('⏭️ Novedad ya existe, saltando sincronización');
        return;
      }

      // Obtener período activo para la fecha
      const { data: activePeriod } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', vacation.company_id)
        .lte('fecha_inicio', vacation.start_date)
        .gte('fecha_fin', vacation.end_date)
        .eq('estado', 'en_proceso')
        .maybeSingle();

      if (!activePeriod) {
        console.log('⚠️ No hay período activo para sincronizar vacación');
        return;
      }

      // Calcular valor de la novedad
      const valor = this.calculateVacationValue(vacation.type, vacation.days_count);

      // Crear nueva novedad desde vacación
      const { error } = await supabase
        .from('payroll_novedades')
        .insert({
          company_id: vacation.company_id,
          empleado_id: vacation.employee_id,
          periodo_id: activePeriod.id,
          tipo_novedad: vacation.type,
          subtipo: vacation.subtipo,
          fecha_inicio: vacation.start_date,
          fecha_fin: vacation.end_date,
          dias: vacation.days_count,
          valor: valor,
          observacion: vacation.observations,
          creado_por: vacation.created_by
        });

      if (error) {
        console.error('❌ Error sincronizando vacación a novedad:', error);
      } else {
        console.log('✅ Vacación sincronizada a novedad exitosamente');
      }
    } catch (error) {
      console.error('💥 Error en syncVacationToNovedad:', error);
    }
  }

  static async updateVacationFromNovedad(novedad: any) {
    try {
      if (!this.isVacationType(novedad.tipo_novedad)) return;

      const { error } = await supabase
        .from('employee_vacation_periods')
        .update({
          days_count: novedad.dias,
          observations: novedad.observacion,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', novedad.empleado_id)
        .eq('start_date', novedad.fecha_inicio)
        .eq('end_date', novedad.fecha_fin)
        .eq('type', novedad.tipo_novedad);

      if (error) {
        console.error('❌ Error actualizando vacación desde novedad:', error);
      }
    } catch (error) {
      console.error('💥 Error en updateVacationFromNovedad:', error);
    }
  }

  static async updateNovedadFromVacation(vacation: any) {
    try {
      const valor = this.calculateVacationValue(vacation.type, vacation.days_count);

      const { error } = await supabase
        .from('payroll_novedades')
        .update({
          dias: vacation.days_count,
          valor: valor,
          observacion: vacation.observations,
          updated_at: new Date().toISOString()
        })
        .eq('empleado_id', vacation.employee_id)
        .eq('fecha_inicio', vacation.start_date)
        .eq('fecha_fin', vacation.end_date)
        .eq('tipo_novedad', vacation.type);

      if (error) {
        console.error('❌ Error actualizando novedad desde vacación:', error);
      }
    } catch (error) {
      console.error('💥 Error en updateNovedadFromVacation:', error);
    }
  }

  static async removeVacationFromNovedad(novedad: any) {
    try {
      if (!this.isVacationType(novedad.tipo_novedad)) return;

      const { error } = await supabase
        .from('employee_vacation_periods')
        .delete()
        .eq('employee_id', novedad.empleado_id)
        .eq('start_date', novedad.fecha_inicio)
        .eq('end_date', novedad.fecha_fin)
        .eq('type', novedad.tipo_novedad);

      if (error) {
        console.error('❌ Error eliminando vacación desde novedad:', error);
      }
    } catch (error) {
      console.error('💥 Error en removeVacationFromNovedad:', error);
    }
  }

  static async removeNovedadFromVacation(vacation: any) {
    try {
      const { error } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('empleado_id', vacation.employee_id)
        .eq('fecha_inicio', vacation.start_date)
        .eq('fecha_fin', vacation.end_date)
        .eq('tipo_novedad', vacation.type);

      if (error) {
        console.error('❌ Error eliminando novedad desde vacación:', error);
      }
    } catch (error) {
      console.error('💥 Error en removeNovedadFromVacation:', error);
    }
  }

  private static isVacationType(tipo: string): boolean {
    return ['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'].includes(tipo);
  }

  private static calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private static calculateVacationValue(type: string, days: number): number {
    // Valor base por día (esto debería venir del salario del empleado)
    const dailyRate = 50000; // Placeholder - debería calcularse dinámicamente
    
    switch (type) {
      case 'vacaciones':
      case 'licencia_remunerada':
        return dailyRate * days;
      case 'incapacidad':
        const payableDays = Math.max(0, days - 2);
        return dailyRate * payableDays * 0.6667;
      case 'ausencia':
      case 'licencia_no_remunerada':
        return -(dailyRate * days); // Descuento
      default:
        return 0;
    }
  }

  static cleanup() {
    console.log('🧹 Limpiando sincronización bidireccional');
    RealtimeService.unsubscribeAll();
    this.isInitialized = false;
  }
}
