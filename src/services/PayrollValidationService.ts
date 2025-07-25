import { supabase } from '@/integrations/supabase/client';

export interface ValidationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface ValidationSummary {
  totalEmployees: number;
  employeesWithIssues: number;
  periodInfo: {
    id: string;
    periodo: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
  };
  novedadesCount: number;
}

export interface PreLiquidationValidation {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

export class PayrollValidationService {
  /**
   * Validación completa pre-liquidación usando el edge function atómico
   */
  static async validatePreLiquidation(
    periodId: string, 
    companyId: string
  ): Promise<PreLiquidationValidation> {
    try {
      console.log('🔍 Iniciando validación pre-liquidación...', { periodId, companyId });

      const { data, error } = await supabase.functions.invoke('payroll-liquidation-atomic', {
        body: {
          action: 'validate_pre_liquidation',
          data: {
            period_id: periodId,
            company_id: companyId
          }
        }
      });

      if (error) {
        console.error('Error en validación pre-liquidación:', error);
        throw new Error(`Error en validación: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en validación');
      }

      console.log('✅ Validación completada:', {
        isValid: data.validation.isValid,
        issuesCount: data.validation.issues.length,
        totalEmployees: data.validation.summary.totalEmployees
      });

      return data.validation;

    } catch (error) {
      console.error('Error en PayrollValidationService.validatePreLiquidation:', error);
      
      // Devolver validación fallida en caso de error
      return {
        isValid: false,
        issues: [{
          type: 'validation_service_error',
          severity: 'high',
          message: `Error en servicio de validación: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        summary: {
          totalEmployees: 0,
          employeesWithIssues: 0,
          periodInfo: {
            id: periodId,
            periodo: 'Error',
            estado: 'error',
            fecha_inicio: '',
            fecha_fin: ''
          },
          novedadesCount: 0
        }
      };
    }
  }

  /**
   * Validación rápida de integridad de datos
   */
  static async quickIntegrityCheck(
    periodId: string, 
    companyId: string
  ): Promise<{
    hasPayrolls: boolean;
    hasVouchers: boolean;
    totalsMatch: boolean;
    employeesCount: number;
  }> {
    try {
      // Obtener datos del período
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('empleados_count, total_devengado, total_deducciones, total_neto, fecha_inicio, fecha_fin')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      // Contar payrolls
      const { count: payrollsCount } = await supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      // Contar vouchers
      const { count: vouchersCount } = await supabase
        .from('payroll_vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('start_date', period?.fecha_inicio || '')
        .eq('end_date', period?.fecha_fin || '');

      // Calcular totales reales
      const { data: payrollTotals } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      const realTotalDevengado = payrollTotals?.reduce((sum, p) => sum + (p.total_devengado || 0), 0) || 0;
      const realTotalDeducciones = payrollTotals?.reduce((sum, p) => sum + (p.total_deducciones || 0), 0) || 0;
      const realTotalNeto = payrollTotals?.reduce((sum, p) => sum + (p.neto_pagado || 0), 0) || 0;

      const totalsMatch = 
        Math.abs((period?.total_devengado || 0) - realTotalDevengado) < 0.01 &&
        Math.abs((period?.total_deducciones || 0) - realTotalDeducciones) < 0.01 &&
        Math.abs((period?.total_neto || 0) - realTotalNeto) < 0.01;

      return {
        hasPayrolls: (payrollsCount || 0) > 0,
        hasVouchers: (vouchersCount || 0) > 0,
        totalsMatch,
        employeesCount: payrollsCount || 0
      };

    } catch (error) {
      console.error('Error en quick integrity check:', error);
      return {
        hasPayrolls: false,
        hasVouchers: false,
        totalsMatch: false,
        employeesCount: 0
      };
    }
  }

  /**
   * Validar empleados específicos para un período
   */
  static async validateEmployeesForPeriod(
    periodId: string,
    companyId: string
  ): Promise<{
    validEmployees: any[];
    invalidEmployees: any[];
    issues: ValidationIssue[];
  }> {
    try {
      const { data: payrolls } = await supabase
        .from('payrolls')
        .select(`
          id, employee_id, salario_base,
          employees!inner(id, nombre, apellido, cedula, salario_base, estado, eps, afp)
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      const validEmployees = [];
      const invalidEmployees = [];
      const issues: ValidationIssue[] = [];

      for (const payroll of payrolls || []) {
        const employee = payroll.employees;
        let isValid = true;

        // Validaciones básicas
        if (!employee.nombre || !employee.apellido) {
          issues.push({
            type: 'incomplete_name',
            severity: 'medium',
            message: `Empleado ${employee.cedula}: nombre o apellido faltante`
          });
          isValid = false;
        }

        if (!employee.salario_base || employee.salario_base <= 0) {
          issues.push({
            type: 'invalid_salary',
            severity: 'high',
            message: `Empleado ${employee.nombre} ${employee.apellido}: salario base inválido`
          });
          isValid = false;
        }

        if (employee.estado !== 'activo') {
          issues.push({
            type: 'inactive_employee',
            severity: 'medium',
            message: `Empleado ${employee.nombre} ${employee.apellido}: estado ${employee.estado}`
          });
          isValid = false;
        }

        if (!employee.eps) {
          issues.push({
            type: 'missing_eps',
            severity: 'medium',
            message: `Empleado ${employee.nombre} ${employee.apellido}: EPS no definida`
          });
        }

        if (!employee.afp) {
          issues.push({
            type: 'missing_afp',
            severity: 'medium',
            message: `Empleado ${employee.nombre} ${employee.apellido}: AFP no definida`
          });
        }

        if (isValid) {
          validEmployees.push(payroll);
        } else {
          invalidEmployees.push(payroll);
        }
      }

      return {
        validEmployees,
        invalidEmployees,
        issues
      };

    } catch (error) {
      console.error('Error validating employees for period:', error);
      return {
        validEmployees: [],
        invalidEmployees: [],
        issues: [{
          type: 'employee_validation_error',
          severity: 'high',
          message: `Error validando empleados: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }]
      };
    }
  }

  /**
   * Obtener problemas detectados en períodos de la empresa
   */
  static async getCompanyPeriodsIssues(companyId: string): Promise<{
    periodsWithIssues: Array<{
      id: string;
      periodo: string;
      issueType: string;
      issueCount: number;
      autoRepairable: boolean;
    }>;
    totalIssues: number;
  }> {
    try {
      const { data: periods } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, empleados_count, total_devengado, total_deducciones, total_neto')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      const periodsWithIssues = [];

      for (const period of periods || []) {
        const integrityCheck = await this.quickIntegrityCheck(period.id, companyId);
        
        if (!integrityCheck.totalsMatch || !integrityCheck.hasPayrolls) {
          let issueType = 'unknown';
          
          if (!integrityCheck.hasPayrolls) {
            issueType = 'no_payrolls';
          } else if (!integrityCheck.totalsMatch) {
            issueType = 'totals_mismatch';
          }

          periodsWithIssues.push({
            id: period.id,
            periodo: period.periodo,
            issueType,
            issueCount: 1,
            autoRepairable: true
          });
        }
      }

      return {
        periodsWithIssues,
        totalIssues: periodsWithIssues.length
      };

    } catch (error) {
      console.error('Error getting company periods issues:', error);
      return {
        periodsWithIssues: [],
        totalIssues: 0
      };
    }
  }
}