
export interface ConflictRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  source: 'vacation_module' | 'novedad_module';
  status?: string;
  observations?: string;
}

export interface ConflictGroup {
  employeeId: string;
  employeeName: string;
  conflicts: ConflictRecord[];
  type: 'duplicate' | 'overlap' | 'type_mismatch';
  severity: 'high' | 'medium' | 'low';
}

export interface ConflictReport {
  hasConflicts: boolean;
  totalConflicts: number;
  conflictGroups: ConflictGroup[];
  summary: {
    duplicates: number;
    overlaps: number;
    typeMismatches: number;
  };
}

import { supabase } from '@/integrations/supabase/client';

export class VacationNovedadConflictDetector {
  /**
   * Detecta todos los conflictos entre módulo de vacaciones y novedades para un período
   */
  static async detectConflicts(
    companyId: string,
    startDate: string,
    endDate: string,
    periodId?: string
  ): Promise<ConflictReport> {
    console.log('🔍 Detecting vacation-novedad conflicts for period:', { startDate, endDate, periodId });

    try {
      // Obtener registros de vacaciones del período
      const vacationRecords = await this.getVacationRecords(companyId, startDate, endDate);
      
      // Obtener novedades de ausencias del período
      const novedadRecords = await this.getNovedadRecords(companyId, startDate, endDate, periodId);
      
      console.log('📊 Records found:', {
        vacations: vacationRecords.length,
        novedades: novedadRecords.length
      });

      // Analizar conflictos
      const conflictGroups = await this.analyzeConflicts(vacationRecords, novedadRecords);
      
      const summary = {
        duplicates: conflictGroups.filter(g => g.type === 'duplicate').length,
        overlaps: conflictGroups.filter(g => g.type === 'overlap').length,
        typeMismatches: conflictGroups.filter(g => g.type === 'type_mismatch').length
      };

      const report: ConflictReport = {
        hasConflicts: conflictGroups.length > 0,
        totalConflicts: conflictGroups.length,
        conflictGroups,
        summary
      };

      console.log('📋 Conflict report generated:', report);
      return report;

    } catch (error) {
      console.error('❌ Error detecting conflicts:', error);
      
      // Retornar reporte vacío en caso de error para no bloquear el flujo
      return {
        hasConflicts: false,
        totalConflicts: 0,
        conflictGroups: [],
        summary: { duplicates: 0, overlaps: 0, typeMismatches: 0 }
      };
    }
  }

  /**
   * Obtiene registros de vacaciones para el período (simplificado)
   */
  private static async getVacationRecords(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<ConflictRecord[]> {
    try {
      const { data: vacations, error } = await supabase
        .from('employee_vacation_periods')
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          status,
          observations,
          employee:employees!inner(
            id,
            nombre,
            apellido
          )
        `)
        .eq('company_id', companyId)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .in('status', ['pendiente', 'liquidada']);

      if (error) {
        console.error('❌ Error fetching vacation records:', error);
        return [];
      }

      return (vacations || []).map(v => ({
        id: v.id,
        employeeId: v.employee_id,
        employeeName: `${v.employee.nombre} ${v.employee.apellido}`,
        type: v.type || 'vacaciones',
        startDate: v.start_date,
        endDate: v.end_date,
        source: 'vacation_module' as const,
        status: v.status,
        observations: v.observations
      }));
    } catch (error) {
      console.error('❌ Error in getVacationRecords:', error);
      return [];
    }
  }

  /**
   * Obtiene novedades de ausencias para el período (simplificado)
   */
  private static async getNovedadRecords(
    companyId: string,
    startDate: string,
    endDate: string,
    periodId?: string
  ): Promise<ConflictRecord[]> {
    try {
      // Tipos de novedad que representan ausencias/vacaciones
      const absenceTypes = [
        'vacaciones',
        'licencia_remunerada',
        'licencia_no_remunerada',
        'incapacidad',
        'ausencia'
      ];

      let query = supabase
        .from('payroll_novedades')
        .select(`
          id,
          empleado_id,
          tipo_novedad,
          fecha_inicio,
          fecha_fin,
          observacion,
          employee:employees!inner(
            id,
            nombre,
            apellido
          )
        `)
        .eq('company_id', companyId)
        .in('tipo_novedad', absenceTypes);

      // Filtrar por período específico si se proporciona
      if (periodId) {
        query = query.eq('periodo_id', periodId);
      } else {
        // Filtrar por rango de fechas si no hay período específico
        query = query
          .gte('fecha_inicio', startDate)
          .lte('fecha_fin', endDate);
      }

      const { data: novedades, error } = await query;

      if (error) {
        console.error('❌ Error fetching novedad records:', error);
        return [];
      }

      return (novedades || []).map(n => ({
        id: n.id,
        employeeId: n.empleado_id,
        employeeName: `${n.employee.nombre} ${n.employee.apellido}`,
        type: n.tipo_novedad || 'ausencia',
        startDate: n.fecha_inicio || startDate,
        endDate: n.fecha_fin || endDate,
        source: 'novedad_module' as const,
        observations: n.observacion
      }));
    } catch (error) {
      console.error('❌ Error in getNovedadRecords:', error);
      return [];
    }
  }

  /**
   * Analiza y agrupa los conflictos detectados (simplificado)
   */
  private static async analyzeConflicts(
    vacationRecords: ConflictRecord[],
    novedadRecords: ConflictRecord[]
  ): Promise<ConflictGroup[]> {
    const conflictGroups: ConflictGroup[] = [];
    
    try {
      const employeeGroups = new Map<string, ConflictRecord[]>();

      // Agrupar todos los registros por empleado
      [...vacationRecords, ...novedadRecords].forEach(record => {
        const key = record.employeeId;
        if (!employeeGroups.has(key)) {
          employeeGroups.set(key, []);
        }
        employeeGroups.get(key)!.push(record);
      });

      // Analizar conflictos por empleado
      for (const [employeeId, records] of employeeGroups) {
        if (records.length < 2) continue;

        const employeeName = records[0].employeeName;
        const vacationRecs = records.filter(r => r.source === 'vacation_module');
        const novedadRecs = records.filter(r => r.source === 'novedad_module');

        // Solo analizar si hay registros de ambos módulos
        if (vacationRecs.length === 0 || novedadRecs.length === 0) continue;

        // Detectar duplicados exactos
        const duplicates = this.findDuplicates(vacationRecs, novedadRecs);
        if (duplicates.length > 0) {
          conflictGroups.push({
            employeeId,
            employeeName,
            conflicts: duplicates,
            type: 'duplicate',
            severity: 'high'
          });
        }

        // Detectar solapamientos de fechas
        const overlaps = this.findDateOverlaps(vacationRecs, novedadRecs);
        if (overlaps.length > 0) {
          conflictGroups.push({
            employeeId,
            employeeName,
            conflicts: overlaps,
            type: 'overlap',
            severity: 'medium'
          });
        }
      }
    } catch (error) {
      console.error('❌ Error analyzing conflicts:', error);
    }

    return conflictGroups;
  }

  /**
   * Encuentra duplicados exactos entre módulos (simplificado)
   */
  private static findDuplicates(
    vacationRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    try {
      vacationRecs.forEach(vRec => {
        novedadRecs.forEach(nRec => {
          if (this.isSameAbsenceType(vRec.type, nRec.type) &&
              vRec.startDate === nRec.startDate &&
              vRec.endDate === nRec.endDate) {
            conflicts.push(vRec, nRec);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error finding duplicates:', error);
    }

    return conflicts;
  }

  /**
   * Encuentra solapamientos de fechas (simplificado)
   */
  private static findDateOverlaps(
    vacationRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    try {
      vacationRecs.forEach(vRec => {
        novedadRecs.forEach(nRec => {
          if (this.datesOverlap(vRec.startDate, vRec.endDate, nRec.startDate, nRec.endDate)) {
            conflicts.push(vRec, nRec);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error finding overlaps:', error);
    }

    return conflicts;
  }

  /**
   * Verifica si dos tipos de ausencia son equivalentes entre módulos
   */
  private static isSameAbsenceType(vacationType: string, novedadType: string): boolean {
    const typeMap: Record<string, string> = {
      'vacaciones': 'vacaciones',
      'licencia_remunerada': 'licencia_remunerada',
      'licencia_no_remunerada': 'ausencia',
      'incapacidad': 'incapacidad',
      'ausencia': 'ausencia'
    };

    return typeMap[vacationType] === novedadType;
  }

  /**
   * Verifica si dos rangos de fechas se solapan
   */
  private static datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    try {
      const s1 = new Date(start1);
      const e1 = new Date(end1);
      const s2 = new Date(start2);
      const e2 = new Date(end2);

      return s1 <= e2 && s2 <= e1;
    } catch (error) {
      console.error('❌ Error comparing dates:', error);
      return false;
    }
  }

  /**
   * Obtiene el mapeo de tipos entre módulos
   */
  static getTypeMapping(): Record<string, string> {
    return {
      'vacaciones': 'vacaciones',
      'licencia_remunerada': 'licencia_remunerada',
      'licencia_no_remunerada': 'ausencia',
      'incapacidad': 'incapacidad',
      'ausencia': 'ausencia'
    };
  }
}
