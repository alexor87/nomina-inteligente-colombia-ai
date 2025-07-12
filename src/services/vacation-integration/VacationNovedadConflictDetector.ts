
import { supabase } from '@/integrations/supabase/client';
import { VacationAbsence, VacationAbsenceType } from '@/types/vacations';
import { NovedadType } from '@/types/novedades';

export interface ConflictRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: VacationAbsenceType | NovedadType;
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
      throw error;
    }
  }

  /**
   * Obtiene registros de vacaciones para el período
   */
  private static async getVacationRecords(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<ConflictRecord[]> {
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
      .or(`
        and(start_date.lte.${endDate},end_date.gte.${startDate})
      `)
      .in('status', ['pendiente', 'liquidada']); // Excluir canceladas

    if (error) {
      console.error('❌ Error fetching vacation records:', error);
      throw error;
    }

    return (vacations || []).map(v => ({
      id: v.id,
      employeeId: v.employee_id,
      employeeName: `${v.employee.nombre} ${v.employee.apellido}`,
      type: v.type as VacationAbsenceType,
      startDate: v.start_date,
      endDate: v.end_date,
      source: 'vacation_module' as const,
      status: v.status,
      observations: v.observations
    }));
  }

  /**
   * Obtiene novedades de ausencias para el período
   */
  private static async getNovedadRecords(
    companyId: string,
    startDate: string,
    endDate: string,
    periodId?: string
  ): Promise<ConflictRecord[]> {
    // Tipos de novedad que representan ausencias/vacaciones
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

    // Si hay period_id, filtrar por período específico
    if (periodId) {
      query = query.eq('periodo_id', periodId);
    } else {
      // Si no hay period_id, usar fechas
      query = query.or(`
        and(fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate})
      `);
    }

    const { data: novedades, error } = await query;

    if (error) {
      console.error('❌ Error fetching novedad records:', error);
      throw error;
    }

    return (novedades || []).map(n => ({
      id: n.id,
      employeeId: n.empleado_id,
      employeeName: `${n.employee.nombre} ${n.employee.apellido}`,
      type: n.tipo_novedad as NovedadType,
      startDate: n.fecha_inicio || startDate,
      endDate: n.fecha_fin || endDate,
      source: 'novedad_module' as const,
      observations: n.observacion
    }));
  }

  /**
   * Analiza y agrupa los conflictos detectados
   */
  private static async analyzeConflicts(
    vacationRecords: ConflictRecord[],
    novedadRecords: ConflictRecord[]
  ): Promise<ConflictGroup[]> {
    const conflictGroups: ConflictGroup[] = [];
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
      if (records.length < 2) continue; // No puede haber conflicto con un solo registro

      const employeeName = records[0].employeeName;
      const vacationRecs = records.filter(r => r.source === 'vacation_module');
      const novedadRecs = records.filter(r => r.source === 'novedad_module');

      // Solo analizar si hay registros de ambos módulos
      if (vacationRecs.length === 0 || novedadRecs.length === 0) continue;

      // Detectar duplicados exactos (mismo tipo y fechas)
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

      // Detectar inconsistencias de tipo
      const typeMismatches = this.findTypeMismatches(vacationRecs, novedadRecs);
      if (typeMismatches.length > 0) {
        conflictGroups.push({
          employeeId,
          employeeName,
          conflicts: typeMismatches,
          type: 'type_mismatch',
          severity: 'low'
        });
      }
    }

    return conflictGroups;
  }

  /**
   * Encuentra duplicados exactos entre módulos
   */
  private static findDuplicates(
    vacationRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    vacationRecs.forEach(vRec => {
      novedadRecs.forEach(nRec => {
        if (this.isSameAbsenceType(vRec.type as VacationAbsenceType, nRec.type as NovedadType) &&
            vRec.startDate === nRec.startDate &&
            vRec.endDate === nRec.endDate) {
          conflicts.push(vRec, nRec);
        }
      });
    });

    return conflicts;
  }

  /**
   * Encuentra solapamientos de fechas
   */
  private static findDateOverlaps(
    vacationRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    vacationRecs.forEach(vRec => {
      novedadRecs.forEach(nRec => {
        if (this.datesOverlap(vRec.startDate, vRec.endDate, nRec.startDate, nRec.endDate)) {
          conflicts.push(vRec, nRec);
        }
      });
    });

    return conflicts;
  }

  /**
   * Encuentra inconsistencias de tipo para las mismas fechas
   */
  private static findTypeMismatches(
    vacationRecs: ConflictRecord[],
    novedadRecs: ConflictRecord[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    vacationRecs.forEach(vRec => {
      novedadRecs.forEach(nRec => {
        if (this.datesOverlap(vRec.startDate, vRec.endDate, nRec.startDate, nRec.endDate) &&
            !this.isSameAbsenceType(vRec.type as VacationAbsenceType, nRec.type as NovedadType)) {
          conflicts.push(vRec, nRec);
        }
      });
    });

    return conflicts;
  }

  /**
   * Verifica si dos tipos de ausencia son equivalentes entre módulos
   */
  private static isSameAbsenceType(vacationType: VacationAbsenceType, novedadType: NovedadType): boolean {
    const typeMap: Record<VacationAbsenceType, NovedadType> = {
      'vacaciones': 'vacaciones',
      'licencia_remunerada': 'licencia_remunerada',
      'licencia_no_remunerada': 'ausencia', // Se mapea a ausencia (deducción)
      'incapacidad': 'incapacidad',
      'ausencia': 'ausencia'
    };

    return typeMap[vacationType] === novedadType;
  }

  /**
   * Verifica si dos rangos de fechas se solapan
   */
  private static datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);

    return s1 <= e2 && s2 <= e1;
  }

  /**
   * Obtiene el mapeo de tipos entre módulos
   */
  static getTypeMapping(): Record<VacationAbsenceType, NovedadType> {
    return {
      'vacaciones': 'vacaciones',
      'licencia_remunerada': 'licencia_remunerada',
      'licencia_no_remunerada': 'ausencia',
      'incapacidad': 'incapacidad',
      'ausencia': 'ausencia'
    };
  }
}
