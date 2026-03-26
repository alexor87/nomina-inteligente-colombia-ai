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
import type { Database } from '@/integrations/supabase/types';

type NovedadType = Database['public']['Enums']['novedad_type'];

export class AbsenceNovedadConflictDetector {
  /**
   * Detecta todos los conflictos entre modulo de ausencias y novedades para un periodo
   */
  static async detectConflicts(
    companyId: string,
    startDate: string,
    endDate: string,
    periodId?: string
  ): Promise<ConflictReport> {
    console.log('Detecting absence-novedad conflicts for period:', { startDate, endDate, periodId });

    try {
      const absenceRecords = await this.getAbsenceRecords(companyId, startDate, endDate);
      const novedadRecords = await this.getNovedadRecords(companyId, startDate, endDate, periodId);

      console.log('Records found:', {
        absences: absenceRecords.length,
        novedades: novedadRecords.length
      });

      const conflictGroups = await this.analyzeConflicts(absenceRecords, novedadRecords);

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

      console.log('Conflict report generated:', report);
      return report;

    } catch (error) {
      console.error('Error detecting conflicts:', error);

      return {
        hasConflicts: false,
        totalConflicts: 0,
        conflictGroups: [],
        summary: { duplicates: 0, overlaps: 0, typeMismatches: 0 }
      };
    }
  }

  /**
   * Obtiene registros de ausencias para el periodo
   */
  private static async getAbsenceRecords(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<ConflictRecord[]> {
    try {
      const { data: absences, error } = await supabase
        .from('employee_absences')
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
        console.error('Error fetching absence records:', error);
        return [];
      }

      return (absences || []).map(v => ({
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
      console.error('Error in getAbsenceRecords:', error);
      return [];
    }
  }

  /**
   * Obtiene novedades de ausencias para el periodo
   */
  private static async getNovedadRecords(
    companyId: string,
    startDate: string,
    endDate: string,
    periodId?: string
  ): Promise<ConflictRecord[]> {
    try {
      const absenceTypes: NovedadType[] = [
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

      if (periodId) {
        query = query.eq('periodo_id', periodId);
      } else {
        query = query
          .gte('fecha_inicio', startDate)
          .lte('fecha_fin', endDate);
      }

      const { data: novedades, error } = await query;

      if (error) {
        console.error('Error fetching novedad records:', error);
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
      console.error('Error in getNovedadRecords:', error);
      return [];
    }
  }

  /**
   * Analiza y agrupa los conflictos detectados
   */
  private static async analyzeConflicts(
    absenceRecords: ConflictRecord[],
    novedadRecords: ConflictRecord[]
  ): Promise<ConflictGroup[]> {
    const conflictGroups: ConflictGroup[] = [];

    try {
      const employeeGroups = new Map<string, ConflictRecord[]>();

      [...absenceRecords, ...novedadRecords].forEach(record => {
        const key = record.employeeId;
        if (!employeeGroups.has(key)) {
          employeeGroups.set(key, []);
        }
        employeeGroups.get(key)!.push(record);
      });

      for (const [employeeId, records] of employeeGroups) {
        if (records.length < 2) continue;

        const employeeName = records[0].employeeName;
        const absenceRecs = records.filter(r => r.source === 'vacation_module');
        const novedadRecs = records.filter(r => r.source === 'novedad_module');

        if (absenceRecs.length === 0 || novedadRecs.length === 0) continue;

        const duplicates = this.findDuplicates(absenceRecs, novedadRecs);
        if (duplicates.length > 0) {
          conflictGroups.push({
            employeeId,
            employeeName,
            conflicts: duplicates,
            type: 'duplicate',
            severity: 'high'
          });
        }

        const overlaps = this.findDateOverlaps(absenceRecs, novedadRecs);
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
      console.error('Error analyzing conflicts:', error);
    }

    return conflictGroups;
  }

  /**
   * Encuentra duplicados exactos entre modulos
   */
  private static findDuplicates(
    absenceRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    try {
      absenceRecs.forEach(aRec => {
        novedadRecs.forEach(nRec => {
          if (this.isSameAbsenceType(aRec.type, nRec.type) &&
              aRec.startDate === nRec.startDate &&
              aRec.endDate === nRec.endDate) {
            conflicts.push(aRec, nRec);
          }
        });
      });
    } catch (error) {
      console.error('Error finding duplicates:', error);
    }

    return conflicts;
  }

  /**
   * Encuentra solapamientos de fechas
   */
  private static findDateOverlaps(
    absenceRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    try {
      absenceRecs.forEach(aRec => {
        novedadRecs.forEach(nRec => {
          if (this.datesOverlap(aRec.startDate, aRec.endDate, nRec.startDate, nRec.endDate)) {
            conflicts.push(aRec, nRec);
          }
        });
      });
    } catch (error) {
      console.error('Error finding overlaps:', error);
    }

    return conflicts;
  }

  /**
   * Verifica si dos tipos de ausencia son equivalentes entre modulos
   */
  private static isSameAbsenceType(absenceType: string, novedadType: string): boolean {
    const typeMap: Record<string, string> = {
      'vacaciones': 'vacaciones',
      'licencia_remunerada': 'licencia_remunerada',
      'licencia_no_remunerada': 'ausencia',
      'incapacidad': 'incapacidad',
      'ausencia': 'ausencia'
    };

    return typeMap[absenceType] === novedadType;
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
      console.error('Error comparing dates:', error);
      return false;
    }
  }

  /**
   * Obtiene el mapeo de tipos entre modulos
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
