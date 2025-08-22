
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateReport {
  totalDuplicates: number;
  duplicateGroups: DuplicateGroup[];
  affectedEmployees: number;
}

export interface DuplicateGroup {
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  duplicateIds: string[];
  duplicateCount: number;
}

export interface CleanupResult {
  removedCount: number;
  cleanedGroups: number;
  errors: string[];
  success: boolean;
}

export class VacationDuplicateCleanupService {
  
  /**
   * 🔍 DETECCIÓN: Identificar todos los duplicados
   */
  static async detectDuplicates(companyId: string): Promise<DuplicateReport> {
    console.log('🔍 Detectando duplicados de vacaciones para empresa:', companyId);
    
    // Obtener todos los registros de vacaciones
    const { data: vacationRecords, error } = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees(id, nombre, apellido)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo registros:', error);
      throw error;
    }

    if (!vacationRecords || vacationRecords.length === 0) {
      return {
        totalDuplicates: 0,
        duplicateGroups: [],
        affectedEmployees: 0
      };
    }

    // Agrupar por empleado + tipo + fechas para identificar duplicados
    const groupMap = new Map<string, any[]>();
    
    vacationRecords.forEach(record => {
      const key = `${record.employee_id}_${record.type}_${record.start_date}_${record.end_date}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(record);
    });

    // Identificar grupos con duplicados (más de 1 registro)
    const duplicateGroups: DuplicateGroup[] = [];
    let totalDuplicates = 0;
    const affectedEmployees = new Set<string>();

    groupMap.forEach((records, key) => {
      if (records.length > 1) {
        const firstRecord = records[0];
        const employeeName = firstRecord.employee ? 
          `${firstRecord.employee.nombre} ${firstRecord.employee.apellido}` : 
          'Empleado desconocido';

        duplicateGroups.push({
          employeeId: firstRecord.employee_id,
          employeeName,
          type: firstRecord.type,
          startDate: firstRecord.start_date,
          endDate: firstRecord.end_date,
          duplicateIds: records.map(r => r.id),
          duplicateCount: records.length
        });

        totalDuplicates += records.length - 1; // -1 porque mantenemos uno
        affectedEmployees.add(firstRecord.employee_id);
      }
    });

    console.log(`📊 Duplicados detectados: ${totalDuplicates} en ${duplicateGroups.length} grupos`);

    return {
      totalDuplicates,
      duplicateGroups,
      affectedEmployees: affectedEmployees.size
    };
  }

  /**
   * 🧹 LIMPIEZA: Eliminar duplicados manteniendo el más reciente
   */
  static async cleanupDuplicates(companyId: string): Promise<CleanupResult> {
    console.log('🧹 Iniciando limpieza de duplicados para empresa:', companyId);
    
    const duplicateReport = await this.detectDuplicates(companyId);
    
    if (duplicateReport.totalDuplicates === 0) {
      return {
        removedCount: 0,
        cleanedGroups: 0,
        errors: [],
        success: true
      };
    }

    const errors: string[] = [];
    let removedCount = 0;
    let cleanedGroups = 0;

    // Procesar cada grupo de duplicados
    for (const group of duplicateReport.duplicateGroups) {
      try {
        // Obtener los registros completos del grupo para determinar cuál mantener
        const { data: groupRecords, error: fetchError } = await supabase
          .from('employee_vacation_periods')
          .select('*')
          .in('id', group.duplicateIds)
          .order('created_at', { ascending: false }); // Más reciente primero

        if (fetchError || !groupRecords || groupRecords.length <= 1) {
          errors.push(`Error obteniendo grupo para ${group.employeeName}: ${fetchError?.message}`);
          continue;
        }

        // Mantener el más reciente (primero en la lista), eliminar el resto
        const [keepRecord, ...duplicatesToRemove] = groupRecords;
        const idsToRemove = duplicatesToRemove.map(r => r.id);

        if (idsToRemove.length > 0) {
          // Eliminar duplicados
          const { error: deleteError } = await supabase
            .from('employee_vacation_periods')
            .delete()
            .in('id', idsToRemove);

          if (deleteError) {
            errors.push(`Error eliminando duplicados para ${group.employeeName}: ${deleteError.message}`);
          } else {
            removedCount += idsToRemove.length;
            cleanedGroups++;
            console.log(`✅ Limpiado grupo: ${group.employeeName} - Eliminados: ${idsToRemove.length}`);
          }
        }
      } catch (error: any) {
        errors.push(`Error procesando grupo ${group.employeeName}: ${error.message}`);
      }
    }

    console.log(`🎯 Limpieza completada: ${removedCount} registros eliminados en ${cleanedGroups} grupos`);

    return {
      removedCount,
      cleanedGroups,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * 🔄 LIMPIEZA SEGURA: Con validación adicional
   */
  static async safeCleanupDuplicates(companyId: string): Promise<CleanupResult> {
    // Validar que tenemos acceso a la empresa
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile || profile.company_id !== companyId) {
      throw new Error('No tienes permisos para limpiar duplicados de esta empresa');
    }

    return this.cleanupDuplicates(companyId);
  }
}
