import { supabase } from '@/integrations/supabase/client';

export interface CleanupReport {
  timestamp: string;
  companyId: string;
  companyName: string;
  results: {
    employees: { before: number; after: number; deleted: number };
    payrolls: { before: number; after: number; deleted: number };
    periods: { before: number; after: number; deleted: number };
    vouchers: { before: number; after: number; deleted: number };
    novedades: { before: number; after: number; deleted: number };
    notes: { before: number; after: number; deleted: number };
    imports: { before: number; after: number; deleted: number };
    activity: { before: number; after: number; deleted: number };
    notifications: { before: number; after: number; deleted: number };
  };
  success: boolean;
  errors: string[];
  stepResults: { step: string; success: boolean; error?: string }[];
}

export interface DiagnosticData {
  employees: number;
  payrolls: number;
  periods: number;
  vouchers: number;
  novedades: number;
  notes: number;
  imports: number;
  activity: number;
  notifications: number;
}

export class DataCleanupService {
  
  static async getDiagnosticData(companyId: string): Promise<DiagnosticData> {
    console.log('🔍 Running diagnostic for company:', companyId);
    
    const [employees, payrolls, periods, vouchers, novedades, notes, imports, activity, notifications] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payrolls').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_periods_real').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_vouchers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_novedades').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('employee_notes').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('employee_imports').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('dashboard_activity').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('user_notifications').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    ]);

    const diagnosticData = {
      employees: employees.count || 0,
      payrolls: payrolls.count || 0,
      periods: periods.count || 0,
      vouchers: vouchers.count || 0,
      novedades: novedades.count || 0,
      notes: notes.count || 0,
      imports: imports.count || 0,
      activity: activity.count || 0,
      notifications: notifications.count || 0
    };

    console.log('📊 Diagnostic complete:', diagnosticData);
    return diagnosticData;
  }

  static async executeAggressiveCleanup(companyIdentifier: string): Promise<CleanupReport> {
    console.log('💥 EJECUTANDO LIMPIEZA AGRESIVA Y DEFINITIVA para:', companyIdentifier);
    
    const report: CleanupReport = {
      timestamp: new Date().toISOString(),
      companyId: '',
      companyName: '',
      results: {
        employees: { before: 0, after: 0, deleted: 0 },
        payrolls: { before: 0, after: 0, deleted: 0 },
        periods: { before: 0, after: 0, deleted: 0 },
        vouchers: { before: 0, after: 0, deleted: 0 },
        novedades: { before: 0, after: 0, deleted: 0 },
        notes: { before: 0, after: 0, deleted: 0 },
        imports: { before: 0, after: 0, deleted: 0 },
        activity: { before: 0, after: 0, deleted: 0 },
        notifications: { before: 0, after: 0, deleted: 0 }
      },
      success: false,
      errors: [],
      stepResults: []
    };

    try {
      // Paso 1: Encontrar la empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, razon_social')
        .or(`razon_social.ilike.%${companyIdentifier}%,nit.eq.${companyIdentifier}`)
        .single();

      if (companyError || !company) {
        throw new Error(`Company not found: ${companyIdentifier}`);
      }

      report.companyId = company.id;
      report.companyName = company.razon_social;

      console.log('🏢 Empresa encontrada:', company.razon_social, 'ID:', company.id);

      // Paso 2: Diagnóstico inicial
      const beforeData = await this.getDiagnosticData(company.id);
      report.results.employees.before = beforeData.employees;
      report.results.payrolls.before = beforeData.payrolls;
      report.results.periods.before = beforeData.periods;
      report.results.vouchers.before = beforeData.vouchers;
      report.results.novedades.before = beforeData.novedades;
      report.results.notes.before = beforeData.notes;
      report.results.imports.before = beforeData.imports;
      report.results.activity.before = beforeData.activity;
      report.results.notifications.before = beforeData.notifications;

      console.log('📋 Datos antes de limpieza:', beforeData);

      // Paso 3: Limpieza por lotes y por orden de dependencias
      await this.executeCleanupByBatches(company.id, report);

      // Paso 4: Verificación final
      const afterData = await this.getDiagnosticData(company.id);
      report.results.employees.after = afterData.employees;
      report.results.payrolls.after = afterData.payrolls;
      report.results.periods.after = afterData.periods;
      report.results.vouchers.after = afterData.vouchers;
      report.results.novedades.after = afterData.novedades;
      report.results.notes.after = afterData.notes;
      report.results.imports.after = afterData.imports;
      report.results.activity.after = afterData.activity;
      report.results.notifications.after = afterData.notifications;

      // Calcular eliminados
      this.calculateDeletedCounts(report);

      const totalRemaining = Object.values(afterData).reduce((sum, count) => sum + count, 0);
      report.success = totalRemaining === 0;

      if (!report.success) {
        report.errors.push(`Aún quedan ${totalRemaining} registros sin eliminar`);
      }

      console.log('✅ LIMPIEZA AGRESIVA COMPLETADA:', {
        success: report.success,
        totalEliminados: Object.values(report.results).reduce((sum, r) => sum + r.deleted, 0),
        totalRestantes: totalRemaining
      });

    } catch (error) {
      console.error('❌ ERROR EN LIMPIEZA AGRESIVA:', error);
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.success = false;
    }

    return report;
  }

  private static async executeCleanupByBatches(companyId: string, report: CleanupReport) {
    const cleanupSteps = [
      // Limpiar primero las dependencias más profundas
      { name: 'Employee Note Mentions', handler: () => this.deleteEmployeeNoteMentions(companyId) },
      { name: 'Employee Notes', handler: () => this.deleteInBatchesEmployeeNotes(companyId) },
      { name: 'User Notifications', handler: () => this.deleteInBatchesUserNotifications(companyId) },
      { name: 'Dashboard Activity', handler: () => this.deleteInBatchesDashboardActivity(companyId) },
      { name: 'Employee Imports', handler: () => this.deleteInBatchesEmployeeImports(companyId) },
      { name: 'Payroll Vouchers', handler: () => this.deleteInBatchesPayrollVouchers(companyId) },
      { name: 'Payroll Novedades', handler: () => this.deleteInBatchesPayrollNovedades(companyId) },
      { name: 'Payrolls', handler: () => this.deleteInBatchesPayrolls(companyId) },
      // IMPORTANTE: Limpiar períodos reales después de payrolls
      { name: 'Payroll Periods Real', handler: () => this.deleteInBatchesPayrollPeriodsReal(companyId) },
      { name: 'Employees', handler: () => this.deleteInBatchesEmployees(companyId) }
    ];

    for (const step of cleanupSteps) {
      try {
        console.log(`🧹 Limpiando ${step.name}...`);
        await step.handler();
        report.stepResults.push({ step: step.name, success: true });
        console.log(`✅ ${step.name} limpiado exitosamente`);
        
        // Pausa pequeña entre operaciones
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error limpiando ${step.name}:`, error);
        report.stepResults.push({ 
          step: step.name, 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        });
        // Continuar con el siguiente paso incluso si hay error
      }
    }
  }

  // Type-safe deletion methods for each table
  private static async deleteEmployeeNoteMentions(companyId: string) {
    const { data: noteIds } = await supabase
      .from('employee_notes')
      .select('id')
      .eq('company_id', companyId);
    
    if (noteIds && noteIds.length > 0) {
      const { error } = await supabase
        .from('employee_note_mentions')
        .delete()
        .in('note_id', noteIds.map(n => n.id));
      
      if (error) throw error;
    }
  }

  private static async deleteInBatchesEmployeeNotes(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('employee_notes')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('employee_notes')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesUserNotifications(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('user_notifications')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesDashboardActivity(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('dashboard_activity')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('dashboard_activity')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesEmployeeImports(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('employee_imports')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('employee_imports')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesPayrollVouchers(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('payroll_vouchers')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesPayrollNovedades(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('payroll_novedades')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('payroll_novedades')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesPayrolls(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('payrolls')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static async deleteInBatchesPayrollPeriodsReal(companyId: string, batchSize: number = 100) {
    console.log('🗑️ Iniciando limpieza de períodos reales...');
    let hasMore = true;
    let totalDeleted = 0;
    
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      console.log(`🗑️ Eliminando ${records.length} períodos reales...`);
      
      const { error: deleteError } = await supabase
        .from('payroll_periods_real')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      
      totalDeleted += records.length;
      console.log(`✅ Eliminados ${totalDeleted} períodos reales hasta ahora`);
      
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`✅ Limpieza de períodos reales completada: ${totalDeleted} eliminados`);
  }

  private static async deleteInBatchesEmployees(companyId: string, batchSize: number = 100) {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .limit(batchSize);

      if (selectError) throw selectError;
      if (!records || records.length === 0) break;

      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .in('id', records.map(r => r.id));

      if (deleteError) throw deleteError;
      if (records.length < batchSize) hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private static calculateDeletedCounts(report: CleanupReport) {
    report.results.employees.deleted = report.results.employees.before - report.results.employees.after;
    report.results.payrolls.deleted = report.results.payrolls.before - report.results.payrolls.after;
    report.results.periods.deleted = report.results.periods.before - report.results.periods.after;
    report.results.vouchers.deleted = report.results.vouchers.before - report.results.vouchers.after;
    report.results.novedades.deleted = report.results.novedades.before - report.results.novedades.after;
    report.results.notes.deleted = report.results.notes.before - report.results.notes.after;
    report.results.imports.deleted = report.results.imports.before - report.results.imports.after;
    report.results.activity.deleted = report.results.activity.before - report.results.activity.after;
    report.results.notifications.deleted = report.results.notifications.before - report.results.notifications.after;
  }

  static async verifyCompleteCleanup(companyId: string): Promise<{ isEmpty: boolean; remainingData: DiagnosticData }> {
    const diagnosticData = await this.getDiagnosticData(companyId);
    const totalRemaining = Object.values(diagnosticData).reduce((sum, count) => sum + count, 0);
    
    return { 
      isEmpty: totalRemaining === 0, 
      remainingData: diagnosticData 
    };
  }

  // Método de emergencia: eliminar fila por fila
  static async emergencyCleanup(companyId: string): Promise<{ success: boolean; deletedIds: string[]; errors: string[] }> {
    console.log('🚨 INICIANDO LIMPIEZA DE EMERGENCIA - FILA POR FILA');
    
    const result = { success: true, deletedIds: [] as string[], errors: [] as string[] };
    
    try {
      // Obtener todos los empleados
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, cedula')
        .eq('company_id', companyId);
      
      if (error) throw error;
      
      if (!employees || employees.length === 0) {
        console.log('✅ No hay empleados para eliminar');
        return result;
      }

      console.log(`🎯 Eliminando ${employees.length} empleados uno por uno...`);
      
      for (const employee of employees) {
        try {
          console.log(`🗑️ Eliminando empleado: ${employee.nombre} (${employee.cedula})`);
          
          const { error: deleteError } = await supabase
            .from('employees')
            .delete()
            .eq('id', employee.id);
          
          if (deleteError) {
            console.error(`❌ Error eliminando empleado ${employee.id}:`, deleteError);
            result.errors.push(`Error eliminando ${employee.nombre}: ${deleteError.message}`);
            result.success = false;
          } else {
            result.deletedIds.push(employee.id);
            console.log(`✅ Empleado ${employee.nombre} eliminado`);
          }
          
          // Pausa entre eliminaciones
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Error crítico eliminando empleado ${employee.id}:`, error);
          result.errors.push(`Error crítico con ${employee.nombre}`);
          result.success = false;
        }
      }
      
      console.log(`🎯 LIMPIEZA DE EMERGENCIA COMPLETADA: ${result.deletedIds.length} eliminados, ${result.errors.length} errores`);
      
    } catch (error) {
      console.error('❌ ERROR CRÍTICO EN LIMPIEZA DE EMERGENCIA:', error);
      result.success = false;
      result.errors.push('Error crítico en limpieza de emergencia');
    }
    
    return result;
  }
}
