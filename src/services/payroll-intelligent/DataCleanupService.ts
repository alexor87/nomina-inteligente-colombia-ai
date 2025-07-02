
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
  };
  success: boolean;
  errors: string[];
}

export class DataCleanupService {
  static async executeCompleteCleanup(companyIdentifier: string): Promise<CleanupReport> {
    console.log('🧹 STARTING COMPLETE DATA CLEANUP for:', companyIdentifier);
    
    const report: CleanupReport = {
      timestamp: new Date().toISOString(),
      companyId: '',
      companyName: '',
      results: {
        employees: { before: 0, after: 0, deleted: 0 },
        payrolls: { before: 0, after: 0, deleted: 0 },
        periods: { before: 0, after: 0, deleted: 0 },
        vouchers: { before: 0, after: 0, deleted: 0 },
        novedades: { before: 0, after: 0, deleted: 0 }
      },
      success: false,
      errors: []
    };

    try {
      // Step 1: Find the company
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

      console.log('🏢 Found company:', company.razon_social, 'ID:', company.id);

      // Step 2: Count data before cleanup
      await this.countDataBefore(company.id, report);

      // Step 3: Execute cleanup in correct order
      await this.executeCleanupSteps(company.id, report);

      // Step 4: Count data after cleanup
      await this.countDataAfter(company.id, report);

      // Step 5: Calculate deleted counts
      this.calculateDeletedCounts(report);

      report.success = true;
      console.log('✅ CLEANUP COMPLETED SUCCESSFULLY:', report);

    } catch (error) {
      console.error('❌ CLEANUP FAILED:', error);
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.success = false;
    }

    return report;
  }

  private static async countDataBefore(companyId: string, report: CleanupReport) {
    console.log('📊 Counting data before cleanup...');

    const [employees, payrolls, periods, vouchers, novedades] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payrolls').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_periods_real').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_vouchers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_novedades').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    ]);

    report.results.employees.before = employees.count || 0;
    report.results.payrolls.before = payrolls.count || 0;
    report.results.periods.before = periods.count || 0;
    report.results.vouchers.before = vouchers.count || 0;
    report.results.novedades.before = novedades.count || 0;

    console.log('📋 Data before cleanup:', {
      employees: report.results.employees.before,
      payrolls: report.results.payrolls.before,
      periods: report.results.periods.before,
      vouchers: report.results.vouchers.before,
      novedades: report.results.novedades.before
    });
  }

  private static async executeCleanupSteps(companyId: string, report: CleanupReport) {
    console.log('🗑️ Executing cleanup steps...');

    try {
      // Step 1: Delete audit logs and activity
      console.log('1. Deleting audit logs...');
      await supabase.from('payroll_novedades_audit').delete().eq('company_id', companyId);
      await supabase.from('payroll_reopen_audit').delete().eq('company_id', companyId);
      await supabase.from('voucher_audit_log').delete().eq('company_id', companyId);
      await supabase.from('dashboard_activity').delete().eq('company_id', companyId);

      // Step 2: Delete vouchers
      console.log('2. Deleting vouchers...');
      const { error: vouchersError } = await supabase
        .from('payroll_vouchers')
        .delete()
        .eq('company_id', companyId);
      if (vouchersError) throw vouchersError;

      // Step 3: Delete employee notes and mentions
      console.log('3. Deleting employee notes...');
      const { data: noteIds } = await supabase
        .from('employee_notes')
        .select('id')
        .eq('company_id', companyId);
      
      if (noteIds && noteIds.length > 0) {
        await supabase
          .from('employee_note_mentions')
          .delete()
          .in('note_id', noteIds.map(n => n.id));
      }
      
      await supabase.from('employee_notes').delete().eq('company_id', companyId);

      // Step 4: Delete novedades
      console.log('4. Deleting novedades...');
      const { error: novedadesError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('company_id', companyId);
      if (novedadesError) throw novedadesError;

      // Step 5: Delete payrolls
      console.log('5. Deleting payrolls...');
      const { error: payrollsError } = await supabase
        .from('payrolls')
        .delete()
        .eq('company_id', companyId);
      if (payrollsError) throw payrollsError;

      // Step 6: Delete periods
      console.log('6. Deleting periods...');
      const { error: periodsRealError } = await supabase
        .from('payroll_periods_real')
        .delete()
        .eq('company_id', companyId);
      if (periodsRealError) throw periodsRealError;

      const { error: periodsError } = await supabase
        .from('payroll_periods')
        .delete()
        .eq('company_id', companyId);
      if (periodsError) throw periodsError;

      // Step 7: Delete employee imports
      console.log('7. Deleting employee imports...');
      await supabase.from('employee_imports').delete().eq('company_id', companyId);

      // Step 8: Delete employees
      console.log('8. Deleting employees...');
      const { error: employeesError } = await supabase
        .from('employees')
        .delete()
        .eq('company_id', companyId);
      if (employeesError) throw employeesError;

      // Step 9: Delete notifications and alerts
      console.log('9. Deleting notifications and alerts...');
      await supabase.from('user_notifications').delete().eq('company_id', companyId);
      await supabase.from('dashboard_alerts').delete().eq('company_id', companyId);

      console.log('✅ All cleanup steps completed');

    } catch (error) {
      console.error('❌ Error during cleanup steps:', error);
      throw error;
    }
  }

  private static async countDataAfter(companyId: string, report: CleanupReport) {
    console.log('📊 Counting data after cleanup...');

    const [employees, payrolls, periods, vouchers, novedades] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payrolls').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_periods_real').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_vouchers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_novedades').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    ]);

    report.results.employees.after = employees.count || 0;
    report.results.payrolls.after = payrolls.count || 0;
    report.results.periods.after = periods.count || 0;
    report.results.vouchers.after = vouchers.count || 0;
    report.results.novedades.after = novedades.count || 0;

    console.log('📋 Data after cleanup:', {
      employees: report.results.employees.after,
      payrolls: report.results.payrolls.after,
      periods: report.results.periods.after,
      vouchers: report.results.vouchers.after,
      novedades: report.results.novedades.after
    });
  }

  private static calculateDeletedCounts(report: CleanupReport) {
    report.results.employees.deleted = report.results.employees.before - report.results.employees.after;
    report.results.payrolls.deleted = report.results.payrolls.before - report.results.payrolls.after;
    report.results.periods.deleted = report.results.periods.before - report.results.periods.after;
    report.results.vouchers.deleted = report.results.vouchers.before - report.results.vouchers.after;
    report.results.novedades.deleted = report.results.novedades.before - report.results.novedades.after;
  }

  static async verifyCleanup(companyId: string): Promise<{ isEmpty: boolean; remainingData: any }> {
    const [employees, payrolls, periods, vouchers, novedades] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payrolls').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_periods_real').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_vouchers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('payroll_novedades').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    ]);

    const remainingData = {
      employees: employees.count || 0,
      payrolls: payrolls.count || 0,
      periods: periods.count || 0,
      vouchers: vouchers.count || 0,
      novedades: novedades.count || 0
    };

    const isEmpty = Object.values(remainingData).every(count => count === 0);

    return { isEmpty, remainingData };
  }
}
