import { PayrollVersionService, PayrollVersionData } from './PayrollVersionService';

interface EmployeeSnapshotData {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  salario_base: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  [key: string]: any;
}

interface NovedadSnapshotData {
  id: string;
  empleado_id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  [key: string]: any;
}

interface PeriodSnapshot {
  employees?: EmployeeSnapshotData[];
  novedades?: NovedadSnapshotData[];
  payrolls?: PayrollSnapshotData[];
  employeeIdentity?: { [employeeId: string]: { nombre: string; apellido: string; tipo_documento: string; cedula: string } };
  timestamp?: string;
  [key: string]: any;
}

interface PayrollSnapshotData {
  id: string;
  employee_id: string;
  periodo: string;
  estado: string;
  salario_base: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  ibc: number;
  salud_empleado: number;
  pension_empleado: number;
  auxilio_transporte: number;
  [key: string]: any;
}

export interface VersionComparison {
  periodId: string;
  periodName: string;
  initialVersion: PayrollVersionData | null;
  currentVersion: PayrollVersionData | null;
  employeeChanges: EmployeeVersionChange[];
  summaryMetrics: VersionSummaryMetrics;
}

export interface EmployeeVersionChange {
  employeeId: string;
  employeeName: string;
  cedula: string;
  documentType?: string;
  changeType: 'no_change' | 'values_modified' | 'novedades_added' | 'novedades_removed' | 'employee_added' | 'employee_removed';
  initialData?: EmployeeSnapshotData;
  currentData?: EmployeeSnapshotData;
  fieldChanges: FieldChange[];
  impactAmount: number;
  novedadesChanges: NovedadChange[];
}


export interface FieldChange {
  field: string;
  fieldLabel: string;
  initialValue: any;
  currentValue: any;
  difference: number;
  changeType: 'increase' | 'decrease' | 'modified';
}

export interface NovedadChange {
  id: string;
  action: 'added' | 'removed' | 'modified';
  tipo: string;
  subtipo?: string;
  initialValue?: number;
  currentValue?: number;
  difference: number;
}

export interface VersionSummaryMetrics {
  totalEmployeesInitial: number;
  totalEmployeesCurrent: number;
  employeesWithChanges: number;
  totalImpactAmount: number;
  novedadesAdded: number;
  novedadesRemoved: number;
  novedadesModified: number;
  calculationDate: string;
}

export class PeriodVersionComparisonService {
  
  /**
   * Generate comprehensive comparison between initial and current period state
   */
  static async generatePeriodComparison(
    periodId: string,
    periodName: string
  ): Promise<VersionComparison> {
    try {
      console.log('🔍 Generating period comparison for:', periodId);

      // Get all versions for the period
      const versions = await PayrollVersionService.getVersionHistory(periodId);
      
      // Find initial version (type = 'initial', lowest version number)
      const initialVersion = versions
        .filter(v => v.version_type === 'initial')
        .sort((a, b) => a.version_number - b.version_number)[0] || null;

      // Find latest version (highest version number)  
      const currentVersion = versions
        .sort((a, b) => b.version_number - a.version_number)[0] || null;

      console.log('📊 Found versions:', { 
        total: versions.length, 
        initial: initialVersion?.id,
        current: currentVersion?.id,
        initialSnapshotKeys: initialVersion ? Object.keys(initialVersion.snapshot_data) : [],
        currentSnapshotKeys: currentVersion ? Object.keys(currentVersion.snapshot_data) : []
      });

      // Generate employee-by-employee comparison
      const employeeChanges = await this.compareEmployeeData(
        initialVersion?.snapshot_data as PeriodSnapshot || { employees: [], novedades: [], payrolls: [], employeeIdentity: {} },
        currentVersion?.snapshot_data as PeriodSnapshot || { employees: [], novedades: [], payrolls: [], employeeIdentity: {} },
        periodId
      );

      // Calculate summary metrics
      const summaryMetrics = this.calculateSummaryMetrics(employeeChanges);

      return {
        periodId,
        periodName,
        initialVersion,
        currentVersion,
        employeeChanges,
        summaryMetrics
      };

    } catch (error) {
      console.error('❌ Error generating period comparison:', error);
      throw error;
    }
  }

  /**
   * Compare employee data between two snapshots
   */
  private static async compareEmployeeData(
    initialSnapshot: PeriodSnapshot,
    currentSnapshot: PeriodSnapshot,
    periodId?: string
  ): Promise<EmployeeVersionChange[]> {
    const changes: EmployeeVersionChange[] = [];
    
    // Handle both old format (employees/novedades) and new format (payrolls)
    const initialEmployees = this.extractEmployeesFromSnapshot(initialSnapshot);
    const currentEmployees = this.extractEmployeesFromSnapshot(currentSnapshot);
    const initialNovedades = initialSnapshot.novedades || [];
    const currentNovedades = currentSnapshot.novedades || [];

    console.log('🔍 Comparing snapshots:', {
      initialEmployees: initialEmployees.length,
      currentEmployees: currentEmployees.length,
      hasInitialPayrolls: !!(initialSnapshot.payrolls && initialSnapshot.payrolls.length > 0),
      hasCurrentPayrolls: !!(currentSnapshot.payrolls && currentSnapshot.payrolls.length > 0)
    });

    // Create employee maps for easier comparison
    const initialEmpMap = new Map(initialEmployees.map((emp) => [emp.id, emp]));
    const currentEmpMap = new Map(currentEmployees.map((emp) => [emp.id, emp]));
    
    // Group novedades by employee
    const initialNovedadesMap = this.groupNovedadesByEmployee(initialNovedades);
    const currentNovedadesMap = this.groupNovedadesByEmployee(currentNovedades);

    // Get all unique employee IDs
    const allEmployeeIds = new Set([
      ...initialEmpMap.keys(),
      ...currentEmpMap.keys()
    ]);

    // Get employee identity - first from enriched snapshots, then from database
    const employeeIdentity = await this.getEmployeeIdentity(
      Array.from(allEmployeeIds), 
      initialSnapshot.employeeIdentity || {}, 
      currentSnapshot.employeeIdentity || {},
      periodId
    );

    for (const employeeId of allEmployeeIds) {
      const initialEmp = initialEmpMap.get(employeeId);
      const currentEmp = currentEmpMap.get(employeeId);
      const initialEmpNovedades = initialNovedadesMap.get(employeeId) || [];
      const currentEmpNovedades = currentNovedadesMap.get(employeeId) || [];

      let changeType: EmployeeVersionChange['changeType'] = 'no_change';
      let impactAmount = 0;

      // Determine change type
      if (!initialEmp && currentEmp) {
        changeType = 'employee_added';
        impactAmount = currentEmp.neto_pagado || 0;
      } else if (initialEmp && !currentEmp) {
        changeType = 'employee_removed';  
        impactAmount = -(initialEmp.neto_pagado || 0);
      } else if (initialEmp && currentEmp) {
        // Compare field values
        const fieldChanges = this.compareEmployeeFields(initialEmp, currentEmp);
        const novedadesChanges = this.compareNovedades(initialEmpNovedades, currentEmpNovedades);
        
        if (fieldChanges.length > 0) {
          changeType = 'values_modified';
        } else if (novedadesChanges.some(nc => nc.action === 'added')) {
          changeType = 'novedades_added';
        } else if (novedadesChanges.some(nc => nc.action === 'removed')) {
          changeType = 'novedades_removed';
        }

        impactAmount = (currentEmp.neto_pagado || 0) - (initialEmp.neto_pagado || 0);
      }

      // Get employee identity with simplified, reliable fallback chain
      const empInfo = employeeIdentity.get(employeeId);
      
      // Priority: current > initial > identity map > fallback
      const nombre = currentEmp?.nombre || initialEmp?.nombre || empInfo?.nombre || '';
      const apellido = currentEmp?.apellido || initialEmp?.apellido || empInfo?.apellido || '';
      const cedula = currentEmp?.cedula || initialEmp?.cedula || empInfo?.cedula || 'N/A';
      const documentType = (currentEmp as any)?.tipo_documento || (initialEmp as any)?.tipo_documento || empInfo?.tipo_documento || 'CC';

      // Construct employee name with specific fallbacks for different scenarios
      let employeeName: string;
      const fullName = [nombre, apellido].filter(Boolean).join(' ').trim();
      
      if (fullName) {
        employeeName = fullName;
      } else if (changeType === 'employee_removed') {
        employeeName = 'Empleado eliminado';
      } else if (cedula && cedula !== 'N/A') {
        employeeName = `Empleado ${cedula}`;
      } else {
        employeeName = `Empleado ${employeeId.slice(0, 8)}`;
      }

      changes.push({
        employeeId,
        employeeName: employeeName || 'N/A',
        cedula: cedula || 'N/A',
        documentType,
        changeType,
        initialData: initialEmp,
        currentData: currentEmp,
        fieldChanges: initialEmp && currentEmp ? this.compareEmployeeFields(initialEmp, currentEmp) : [],
        impactAmount,
        novedadesChanges: this.compareNovedades(initialEmpNovedades, currentEmpNovedades)
      });
    }

    return changes.filter(change => {
      const hasChanges = change.changeType !== 'no_change' || 
                        change.fieldChanges.length > 0 || 
                        change.novedadesChanges.length > 0 ||
                        Math.abs(change.impactAmount) > 0.01;
      
      if (hasChanges) {
        console.log('🔄 Change detected:', {
          employee: change.employeeName,
          type: change.changeType,
          impact: change.impactAmount,
          fieldChanges: change.fieldChanges.length,
          novedadesChanges: change.novedadesChanges.length
        });
      }
      
      return hasChanges;
    });
  }

  /**
   * Compare individual employee fields
   */
  private static compareEmployeeFields(initialEmp: EmployeeSnapshotData, currentEmp: EmployeeSnapshotData): FieldChange[] {
    const changes: FieldChange[] = [];
    const fieldsToCompare = [
      { key: 'salario_base', label: 'Salario Base' },
      { key: 'dias_trabajados', label: 'Días Trabajados' },
      { key: 'total_devengado', label: 'Total Devengado' },
      { key: 'total_deducciones', label: 'Total Deducciones' },
      { key: 'neto_pagado', label: 'Neto Pagado' }
    ];

    for (const field of fieldsToCompare) {
      const initialValue = initialEmp[field.key] || 0;
      const currentValue = currentEmp[field.key] || 0;
      const difference = currentValue - initialValue;

      if (Math.abs(difference) > 0.01) { // Avoid floating point precision issues
        changes.push({
          field: field.key,
          fieldLabel: field.label,
          initialValue,
          currentValue,
          difference,
          changeType: difference > 0 ? 'increase' : 'decrease'
        });
      }
    }

    return changes;
  }

  /**
   * Compare novedades between initial and current state
   */
  private static compareNovedades(initialNovedades: NovedadSnapshotData[], currentNovedades: NovedadSnapshotData[]): NovedadChange[] {
    const changes: NovedadChange[] = [];
    
    const initialMap = new Map(initialNovedades.map(n => [n.id, n]));
    const currentMap = new Map(currentNovedades.map(n => [n.id, n]));
    
    const allNovedadIds = new Set([...initialMap.keys(), ...currentMap.keys()]);

    for (const novedadId of allNovedadIds) {
      const initial = initialMap.get(novedadId);
      const current = currentMap.get(novedadId);

      if (!initial && current) {
        changes.push({
          id: novedadId,
          action: 'added',
          tipo: current.tipo_novedad,
          subtipo: current.subtipo,
          currentValue: current.valor,
          difference: current.valor
        });
      } else if (initial && !current) {
        changes.push({
          id: novedadId,
          action: 'removed',
          tipo: initial.tipo_novedad,
          subtipo: initial.subtipo,
          initialValue: initial.valor,
          difference: -initial.valor
        });
      } else if (initial && current && initial.valor !== current.valor) {
        changes.push({
          id: novedadId,
          action: 'modified',
          tipo: current.tipo_novedad,
          subtipo: current.subtipo,
          initialValue: initial.valor,
          currentValue: current.valor,
          difference: current.valor - initial.valor
        });
      }
    }

    return changes;
  }

  /**
   * Group novedades by employee ID
   */
  private static groupNovedadesByEmployee(novedades: NovedadSnapshotData[]): Map<string, NovedadSnapshotData[]> {
    const grouped = new Map<string, NovedadSnapshotData[]>();
    
    for (const novedad of novedades) {
      const employeeId = novedad.empleado_id;
      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, []);
      }
      grouped.get(employeeId)!.push(novedad);
    }
    
    return grouped;
  }

  /**
   * Calculate summary metrics from employee changes
   */
  private static calculateSummaryMetrics(employeeChanges: EmployeeVersionChange[]): VersionSummaryMetrics {
    const totalEmployeesInitial = employeeChanges.filter(ec => 
      ec.initialData || ec.changeType === 'employee_removed'
    ).length;
    
    const totalEmployeesCurrent = employeeChanges.filter(ec => 
      ec.currentData || ec.changeType === 'employee_added'
    ).length;

    const employeesWithChanges = employeeChanges.length;
    
    const totalImpactAmount = employeeChanges.reduce((sum, ec) => sum + ec.impactAmount, 0);
    
    const novedadesAdded = employeeChanges.reduce((sum, ec) => 
      sum + ec.novedadesChanges.filter(nc => nc.action === 'added').length, 0
    );
    
    const novedadesRemoved = employeeChanges.reduce((sum, ec) => 
      sum + ec.novedadesChanges.filter(nc => nc.action === 'removed').length, 0
    );
    
    const novedadesModified = employeeChanges.reduce((sum, ec) => 
      sum + ec.novedadesChanges.filter(nc => nc.action === 'modified').length, 0
    );

    return {
      totalEmployeesInitial,
      totalEmployeesCurrent,
      employeesWithChanges,
      totalImpactAmount,
      novedadesAdded,
      novedadesRemoved,
      novedadesModified,
      calculationDate: new Date().toISOString()
    };
  }

  /**
   * Extract employees from snapshot, handling both old and new formats
   */
  private static extractEmployeesFromSnapshot(snapshot: PeriodSnapshot): EmployeeSnapshotData[] {
    // If the snapshot has the new payrolls format, convert it and merge with identity data
    if (snapshot.payrolls && snapshot.payrolls.length > 0) {
      const employees = this.convertPayrollsToEmployees(snapshot.payrolls);
      
      // Merge with employeeIdentity data if available
      if (snapshot.employeeIdentity) {
        employees.forEach(emp => {
          const identity = snapshot.employeeIdentity![emp.id];
          if (identity) {
            emp.nombre = identity.nombre || '';
            emp.apellido = identity.apellido || '';
            emp.cedula = identity.cedula || '';
            (emp as any).tipo_documento = identity.tipo_documento || 'CC';
          }
        });
      }
      
      return employees;
    }
    
    // Otherwise use the old employees format
    return snapshot.employees || [];
  }

  /**
   * Convert payroll records to employee snapshot format with robust identity handling
   */
  private static convertPayrollsToEmployees(payrolls: PayrollSnapshotData[]): EmployeeSnapshotData[] {
    return payrolls.map(payroll => {
      // Extract identity with multiple fallbacks
      const nombre = (payroll as any).employee_nombre || (payroll as any).nombre || '';
      const apellido = (payroll as any).employee_apellido || (payroll as any).apellido || '';
      const cedula = (payroll as any).employee_cedula || (payroll as any).cedula || '';
      const tipo_documento = (payroll as any).employee_tipo_documento || (payroll as any).tipo_documento || 'CC';

      return {
        id: payroll.employee_id,
        nombre,
        apellido,
        cedula,
        tipo_documento,
        salario_base: payroll.salario_base,
        dias_trabajados: payroll.dias_trabajados,
        total_devengado: payroll.total_devengado,
        total_deducciones: payroll.total_deducciones,
        neto_pagado: payroll.neto_pagado,
        ibc: payroll.ibc,
        salud_empleado: payroll.salud_empleado,
        pension_empleado: payroll.pension_empleado,
        auxilio_transporte: payroll.auxilio_transporte,
        ...payroll // Include any additional fields
      };
    });
  }

  // Simple cache for employee identities per period
  private static employeeIdentityCache = new Map<string, { nombre: string; apellido: string; cedula: string; tipo_documento: string }>();

  /**
   * Get employee identity using snapshot data first, then database fallback
   */
  private static async getEmployeeIdentity(
    employeeIds: string[],
    initialSnapshotIdentity: { [key: string]: any },
    currentSnapshotIdentity: { [key: string]: any },
    periodId?: string
  ): Promise<Map<string, { nombre: string; apellido: string; cedula: string; tipo_documento: string }>> {
    const employeeMap = new Map<string, { nombre: string; apellido: string; cedula: string; tipo_documento: string }>();
    
    if (employeeIds.length === 0) {
      return employeeMap;
    }
    
    const missingIds: string[] = [];
    
    // First, use snapshot data (most reliable source)
    for (const employeeId of employeeIds) {
      const fromCurrent = currentSnapshotIdentity[employeeId];
      const fromInitial = initialSnapshotIdentity[employeeId];
      const empData = fromCurrent || fromInitial;
      
      if (empData && empData.nombre) {
        employeeMap.set(employeeId, {
          nombre: empData.nombre || '',
          apellido: empData.apellido || '',
          cedula: empData.cedula || 'N/A',
          tipo_documento: empData.tipo_documento || 'CC',
        });
        console.log(`✅ [Employee Identity] From snapshot: ${empData.nombre} ${empData.apellido} (${empData.cedula})`);
      } else {
        missingIds.push(employeeId);
      }
    }
    
    console.log('📊 Employee identity resolution:', { 
      total: employeeIds.length, 
      fromSnapshot: employeeIds.length - missingIds.length, 
      missing: missingIds.length 
    });
    
    // Database fallback for missing employee data (RPC first, then direct query)
    if (missingIds.length > 0) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');

        // 1) Try secure RPC bound to the period/company context
        if (periodId) {
          console.log(`🔍 [Employee Identity] RPC get_employee_identity_for_period for ${missingIds.length} IDs`);
          const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_employee_identity_for_period', {
            p_period_id: periodId,
            p_employee_ids: missingIds,
          });

          if (rpcError) {
            console.warn('⚠️ [Employee Identity] RPC error:', rpcError);
          } else if (rpcData && rpcData.length > 0) {
            rpcData.forEach((emp: any) => {
              const key = emp.employee_id || emp.id; // RPC returns employee_id
              employeeMap.set(key, {
                nombre: emp.nombre || '',
                apellido: emp.apellido || '',
                cedula: emp.cedula || 'N/A',
                tipo_documento: emp.tipo_documento || 'CC',
              });
            });
            console.log(`✅ [Employee Identity] Resolved ${rpcData.length} via RPC`);
          }
        }

        // 2) For any still-missing IDs, try direct SELECT (RLS will enforce company access)
        const stillMissing = missingIds.filter(id => !employeeMap.has(id));
        if (stillMissing.length > 0) {
          console.log(`🔍 [Employee Identity] Direct DB query for ${stillMissing.length} remaining IDs`);
          const { data: employees, error } = await supabase
            .from('employees')
            .select('id, nombre, apellido, tipo_documento, cedula')
            .in('id', stillMissing);

          if (error) {
            console.warn('⚠️ [Employee Identity] DB query error:', error);
          } else if (employees && employees.length > 0) {
            employees.forEach((emp: any) => {
              employeeMap.set(emp.id, {
                nombre: emp.nombre || '',
                apellido: emp.apellido || '',
                cedula: emp.cedula || 'N/A',
                tipo_documento: emp.tipo_documento || 'CC',
              });
            });
            console.log(`✅ [Employee Identity] Resolved ${employees.length} employees from direct DB`);
          }
        }
      } catch (error) {
        console.warn('⚠️ [Employee Identity] Identity resolution exception:', error);
      }
    }
    
    // Final fallback for any still missing employees
    for (const employeeId of employeeIds) {
      if (!employeeMap.has(employeeId)) {
        const shortId = employeeId.slice(0, 8);
        employeeMap.set(employeeId, {
          nombre: 'Empleado',
          apellido: shortId,
          cedula: 'N/A',
          tipo_documento: 'CC',
        });
        console.warn(`🔍 [Employee Identity] Final fallback for ${employeeId}: Empleado ${shortId}`);
      }
    }
    
    return employeeMap;
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get change type color for UI
   */
  static getChangeTypeColor(changeType: EmployeeVersionChange['changeType']): string {
    switch (changeType) {
      case 'employee_added':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'employee_removed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'values_modified':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'novedades_added':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'novedades_removed':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get change type label for display
   */
  static getChangeTypeLabel(changeType: EmployeeVersionChange['changeType']): string {
    switch (changeType) {
      case 'employee_added':
        return 'Empleado Agregado';
      case 'employee_removed':
        return 'Empleado Eliminado';
      case 'values_modified':
        return 'Valores Modificados';
      case 'novedades_added':
        return 'Novedades Agregadas';
      case 'novedades_removed':
        return 'Novedades Eliminadas';
      default:
        return 'Sin Cambios';
    }
  }
}