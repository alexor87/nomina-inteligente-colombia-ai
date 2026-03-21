import { supabase } from '@/integrations/supabase/client';
import { SecureBaseService } from '@/services/SecureBaseService';

export type SalaryChangeReason =
  | 'incremento_anual'
  | 'ajuste_minimo_legal'
  | 'merito'
  | 'promocion'
  | 'correccion'
  | 'ingreso';

export type RiskLevel = 'required' | 'warning' | 'safe';

export interface SalaryIncreaseProposal {
  employeeId: string;
  employeeName: string;
  cargo?: string;
  currentSalary: number;
  proposedSalary: number;
  percentage: number;
  reason: SalaryChangeReason;
  isLegallyRequired: boolean;
  riskLevel: RiskLevel;
}

export interface SalaryHistoryRecord {
  id: string;
  employeeId: string;
  companyId: string;
  salarioBase: number;
  fechaVigencia: string;
  motivo: SalaryChangeReason;
  porcentajeIncremento?: number;
  notas?: string;
  createdAt: string;
}

export interface YearTransitionAnalysis {
  proposals: SalaryIncreaseProposal[];
  smlmv: number;
  requiredCount: number;
  warningCount: number;
  safeCount: number;
}

export interface SalaryIncreaseResult {
  applied: number;
  skipped: number;
  errors: string[];
}

export class SalaryIncreaseService extends SecureBaseService {
  /**
   * Returns the effective salary for an employee on a given date.
   * Looks up employee_salary_history for the latest entry with fecha_vigencia <= date.
   * Falls back to employees.salario_base if no history record exists.
   */
  static async getSalaryAtDate(
    employeeId: string,
    date: Date,
    companyId: string
  ): Promise<number | null> {
    const isoDate = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('employee_salary_history' as any)
      .select('salario_base')
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .lte('fecha_vigencia', isoDate)
      .order('fecha_vigencia', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No history record — fallback to current salary on employees table
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return (data as any)?.salario_base ?? null;
  }

  /**
   * Analyzes all active employees against the SMLMV for the given year.
   * Returns proposals classified as required / warning / safe.
   */
  static async analyzeYearTransition(
    year: number,
    companyId: string
  ): Promise<YearTransitionAnalysis> {
    // Fetch SMLMV for the target year
    const { data: configData, error: configError } = await supabase
      .from('company_payroll_configurations')
      .select('salary_min')
      .eq('company_id', companyId)
      .eq('year', String(year))
      .single();

    if (configError) throw new Error(`No se encontró configuración para el año ${year}`);
    const smlmv: number = (configData as any).salary_min;

    // Fetch active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, nombre, apellido, cargo, salario_base')
      .eq('company_id', companyId)
      .eq('estado', 'activo');

    if (empError) throw empError;

    const proposals: SalaryIncreaseProposal[] = (employees ?? []).map((emp: any) => {
      const currentSalary: number = emp.salario_base ?? 0;
      const riskLevel = SalaryIncreaseService.classifyRisk(currentSalary, smlmv);
      const isLegallyRequired = riskLevel === 'required';

      const proposedSalary = isLegallyRequired
        ? smlmv
        : currentSalary; // will be updated in Step 2 when policy is applied

      const percentage = currentSalary > 0
        ? ((proposedSalary - currentSalary) / currentSalary) * 100
        : 0;

      return {
        employeeId: emp.id,
        employeeName: `${emp.nombre} ${emp.apellido}`,
        cargo: emp.cargo ?? undefined,
        currentSalary,
        proposedSalary,
        percentage: Math.round(percentage * 100) / 100,
        reason: isLegallyRequired ? 'ajuste_minimo_legal' : 'incremento_anual',
        isLegallyRequired,
        riskLevel,
      };
    });

    return {
      proposals,
      smlmv,
      requiredCount: proposals.filter(p => p.riskLevel === 'required').length,
      warningCount: proposals.filter(p => p.riskLevel === 'warning').length,
      safeCount: proposals.filter(p => p.riskLevel === 'safe').length,
    };
  }

  /**
   * Applies approved salary increments:
   * - Inserts a record in employee_salary_history per employee
   * - Updates employees.salario_base if effectiveDate <= today
   */
  static async applyIncrements(
    proposals: SalaryIncreaseProposal[],
    effectiveDate: Date,
    companyId: string
  ): Promise<SalaryIncreaseResult> {
    const { data: { user } } = await supabase.auth.getUser();
    const isoDate = effectiveDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const applyToEmployees = isoDate <= today;

    let applied = 0;
    const errors: string[] = [];

    for (const proposal of proposals) {
      if (proposal.proposedSalary <= 0) continue;

      try {
        // Insert history record
        const { error: histError } = await supabase
          .from('employee_salary_history' as any)
          .insert({
            employee_id: proposal.employeeId,
            company_id: companyId,
            salario_base: proposal.proposedSalary,
            fecha_vigencia: isoDate,
            motivo: proposal.reason,
            porcentaje_incremento: proposal.percentage,
            created_by: user?.id ?? null,
          });

        if (histError) throw histError;

        // Sync employees.salario_base if effective date is today or past
        if (applyToEmployees) {
          const { error: empError } = await supabase
            .from('employees')
            .update({ salario_base: proposal.proposedSalary })
            .eq('id', proposal.employeeId)
            .eq('company_id', companyId);

          if (empError) throw empError;
        }

        applied++;
      } catch (err: any) {
        errors.push(`${proposal.employeeName}: ${err.message ?? String(err)}`);
      }
    }

    return { applied, skipped: proposals.length - applied - errors.length, errors };
  }

  /**
   * Returns the effective salary for multiple employees on a given date in one query.
   * Returns a map of employeeId → salario_base.
   * Employees not present in the map have no history and should fall back to their current salary.
   */
  static async getSalariesBatch(
    employeeIds: string[],
    date: Date,
    companyId: string
  ): Promise<Map<string, number>> {
    if (employeeIds.length === 0) return new Map();

    const isoDate = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('employee_salary_history' as any)
      .select('employee_id, salario_base, fecha_vigencia')
      .eq('company_id', companyId)
      .in('employee_id', employeeIds)
      .lte('fecha_vigencia', isoDate)
      .order('fecha_vigencia', { ascending: false });

    if (error) {
      console.warn('[SalaryIncreaseService] getSalariesBatch failed, falling back to current salary:', error.message);
      return new Map();
    }

    // For each employee keep only the latest fecha_vigencia (data is sorted desc)
    const result = new Map<string, number>();
    for (const row of (data as any[]) ?? []) {
      if (!result.has(row.employee_id)) {
        result.set(row.employee_id, row.salario_base);
      }
    }
    return result;
  }

  /**
   * Returns full salary history for an employee, most recent first.
   */
  static async getEmployeeSalaryHistory(
    employeeId: string,
    companyId: string
  ): Promise<SalaryHistoryRecord[]> {
    const { data, error } = await supabase
      .from('employee_salary_history' as any)
      .select('*')
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .order('fecha_vigencia', { ascending: false });

    if (error) throw error;

    return ((data as any[]) ?? []).map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      companyId: r.company_id,
      salarioBase: r.salario_base,
      fechaVigencia: r.fecha_vigencia,
      motivo: r.motivo,
      porcentajeIncremento: r.porcentaje_incremento ?? undefined,
      notas: r.notas ?? undefined,
      createdAt: r.created_at,
    }));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  static classifyRisk(salary: number, smlmv: number): RiskLevel {
    if (salary <= smlmv) return 'required';
    if (salary < smlmv * 1.05) return 'warning';
    return 'safe';
  }

  /**
   * Applies a uniform percentage to non-required proposals.
   * Returns a new proposals array with proposedSalary and percentage updated.
   */
  static applyUniformPercentage(
    proposals: SalaryIncreaseProposal[],
    percentage: number,
    smlmv: number
  ): SalaryIncreaseProposal[] {
    return proposals.map(p => {
      if (p.isLegallyRequired) return p;

      const factor = 1 + percentage / 100;
      const proposed = Math.round(p.currentSalary * factor);

      // If still below SMLMV after increment, force to SMLMV
      const finalProposed = proposed < smlmv ? smlmv : proposed;
      const finalReason: SalaryChangeReason =
        finalProposed === smlmv && proposed < smlmv ? 'ajuste_minimo_legal' : 'incremento_anual';
      const finalPct =
        p.currentSalary > 0
          ? Math.round(((finalProposed - p.currentSalary) / p.currentSalary) * 10000) / 100
          : 0;

      return {
        ...p,
        proposedSalary: finalProposed,
        percentage: finalPct,
        reason: finalReason,
        riskLevel: SalaryIncreaseService.classifyRisk(finalProposed, smlmv),
      };
    });
  }

  /**
   * Applies per-cargo percentages to non-required proposals.
   */
  static applyRolePercentages(
    proposals: SalaryIncreaseProposal[],
    rolePercentages: Record<string, number>,
    smlmv: number
  ): SalaryIncreaseProposal[] {
    return proposals.map(p => {
      if (p.isLegallyRequired) return p;
      const pct = rolePercentages[p.cargo ?? ''] ?? 0;
      return SalaryIncreaseService.applyUniformPercentage([p], pct, smlmv)[0];
    });
  }
}
