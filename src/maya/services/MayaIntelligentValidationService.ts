import { supabase } from "@/integrations/supabase/client";

export interface MayaValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'employee_data' | 'period_config' | 'calculation' | 'consistency';
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  affectedEmployees?: string[];
  suggestedActions: string[];
  autoFixable: boolean;
  priority: number;
}

export interface MayaValidationResults {
  hasIssues: boolean;
  criticalIssuesCount: number;
  warningsCount: number;
  infoCount: number;
  overallScore: number; // 0-100
  canProceedWithLiquidation: boolean;
  issues: MayaValidationIssue[];
  validationSummary: string;
  estimatedFixTime: string;
}

export class MayaIntelligentValidationService {
  /**
   * Ejecuta validación inteligente contextual para MAYA
   */
  static async performIntelligentValidation(
    companyId: string,
    periodId?: string,
    employees?: any[]
  ): Promise<MayaValidationResults> {
    console.log('🤖 MAYA: Iniciando validación inteligente...', { companyId, periodId });
    
    const issues: MayaValidationIssue[] = [];
    let currentEmployees = employees;

    try {
      // 1. Obtener empleados si no se proporcionaron
      if (!currentEmployees && periodId) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .eq('estado', 'activo');
        
        currentEmployees = employeeData || [];
      }

      // 2. Validaciones de datos de empleados
      if (currentEmployees) {
        issues.push(...await this.validateEmployeeData(currentEmployees));
      }

      // 3. Validaciones de configuración del período
      if (periodId) {
        issues.push(...await this.validatePeriodConfiguration(periodId, companyId));
      }

      // 4. Validaciones de consistencia
      issues.push(...await this.validateDataConsistency(companyId, periodId));

      // 5. Validaciones de cálculos
      if (periodId && currentEmployees) {
        issues.push(...await this.validateCalculations(periodId, currentEmployees));
      }

      // 6. Calcular métricas
      const criticalIssues = issues.filter(i => i.impact === 'critical');
      const warnings = issues.filter(i => i.type === 'warning');
      const infos = issues.filter(i => i.type === 'info');

      const overallScore = this.calculateValidationScore(issues);
      const canProceed = criticalIssues.length === 0 && overallScore >= 70;

      const results: MayaValidationResults = {
        hasIssues: issues.length > 0,
        criticalIssuesCount: criticalIssues.length,
        warningsCount: warnings.length,
        infoCount: infos.length,
        overallScore,
        canProceedWithLiquidation: canProceed,
        issues: issues.sort((a, b) => b.priority - a.priority),
        validationSummary: this.generateValidationSummary(issues, overallScore),
        estimatedFixTime: this.estimateFixTime(issues)
      };

      console.log('🤖 MAYA: Validación inteligente completada', {
        score: overallScore,
        issues: issues.length,
        canProceed
      });

      return results;

    } catch (error) {
      console.error('🤖 MAYA: Error en validación inteligente:', error);
      
      // Retornar resultado de error
      return {
        hasIssues: true,
        criticalIssuesCount: 1,
        warningsCount: 0,
        infoCount: 0,
        overallScore: 0,
        canProceedWithLiquidation: false,
        issues: [{
          id: 'validation_error',
          type: 'error',
          category: 'calculation',
          title: 'Error en Validación',
          description: 'No se pudo completar la validación inteligente',
          impact: 'critical',
          suggestedActions: ['Intente nuevamente', 'Contacte soporte técnico'],
          autoFixable: false,
          priority: 100
        }],
        validationSummary: 'Error en el proceso de validación',
        estimatedFixTime: 'Desconocido'
      };
    }
  }

  /**
   * Validar datos de empleados
   */
  private static async validateEmployeeData(employees: any[]): Promise<MayaValidationIssue[]> {
    const issues: MayaValidationIssue[] = [];

    // Empleados sin salario base
    const employeesWithoutSalary = employees.filter(emp => 
      !emp.salario_base || emp.salario_base <= 0
    );

    if (employeesWithoutSalary.length > 0) {
      issues.push({
        id: 'employees_without_salary',
        type: 'error',
        category: 'employee_data',
        title: 'Empleados sin Salario Base',
        description: `${employeesWithoutSalary.length} empleados no tienen salario base configurado`,
        impact: 'critical',
        affectedEmployees: employeesWithoutSalary.map(emp => emp.id),
        suggestedActions: [
          'Configurar salario base para cada empleado',
          'Verificar contratos laborales',
          'Actualizar información salarial'
        ],
        autoFixable: false,
        priority: 95
      });
    }

    // Empleados con datos incompletos
    const employeesWithIncompleteData = employees.filter(emp => 
      !emp.nombre || !emp.apellido || !emp.cedula || !emp.email
    );

    if (employeesWithIncompleteData.length > 0) {
      issues.push({
        id: 'incomplete_employee_data',
        type: 'warning',
        category: 'employee_data',
        title: 'Datos Incompletos de Empleados',
        description: `${employeesWithIncompleteData.length} empleados tienen datos básicos incompletos`,
        impact: 'high',
        affectedEmployees: employeesWithIncompleteData.map(emp => emp.id),
        suggestedActions: [
          'Completar información básica (nombre, cédula, email)',
          'Verificar documentos de identidad',
          'Actualizar base de datos de empleados'
        ],
        autoFixable: false,
        priority: 80
      });
    }

    // Salarios por debajo del mínimo legal
    const SALARIO_MINIMO = 1300000; // Actualizar según año vigente
    const employeesWithLowSalary = employees.filter(emp => 
      emp.salario_base && emp.salario_base < SALARIO_MINIMO
    );

    if (employeesWithLowSalary.length > 0) {
      issues.push({
        id: 'salaries_below_minimum',
        type: 'warning',
        category: 'employee_data',
        title: 'Salarios Bajo Mínimo Legal',
        description: `${employeesWithLowSalary.length} empleados tienen salarios por debajo del mínimo legal`,
        impact: 'medium',
        affectedEmployees: employeesWithLowSalary.map(emp => emp.id),
        suggestedActions: [
          'Verificar si corresponden a medio tiempo',
          'Ajustar salarios al mínimo legal',
          'Revisar contratos laborales'
        ],
        autoFixable: false,
        priority: 60
      });
    }

    return issues;
  }

  /**
   * Validar configuración del período
   */
  private static async validatePeriodConfiguration(periodId: string, companyId: string): Promise<MayaValidationIssue[]> {
    const issues: MayaValidationIssue[] = [];

    try {
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (!period) {
        issues.push({
          id: 'period_not_found',
          type: 'error',
          category: 'period_config',
          title: 'Período No Encontrado',
          description: 'El período seleccionado no existe o no pertenece a la empresa',
          impact: 'critical',
          suggestedActions: ['Seleccionar un período válido', 'Crear nuevo período'],
          autoFixable: false,
          priority: 100
        });
        return issues;
      }

      // Validar fechas del período
      const startDate = new Date(period.fecha_inicio);
      const endDate = new Date(period.fecha_fin);
      const today = new Date();

      if (startDate > endDate) {
        issues.push({
          id: 'invalid_period_dates',
          type: 'error',
          category: 'period_config',
          title: 'Fechas Inválidas del Período',
          description: 'La fecha de inicio es posterior a la fecha de fin',
          impact: 'critical',
          suggestedActions: ['Corregir las fechas del período', 'Verificar configuración'],
          autoFixable: false,
          priority: 95
        });
      }

      // Período en el futuro
      if (startDate > today) {
        issues.push({
          id: 'future_period',
          type: 'warning',
          category: 'period_config',
          title: 'Período Futuro',
          description: 'El período seleccionado es futuro, verifique si es correcto',
          impact: 'medium',
          suggestedActions: ['Confirmar fechas del período', 'Seleccionar período actual'],
          autoFixable: false,
          priority: 50
        });
      }

    } catch (error) {
      console.error('Error validando configuración del período:', error);
    }

    return issues;
  }

  /**
   * Validar consistencia de datos
   */
  private static async validateDataConsistency(companyId: string, periodId?: string): Promise<MayaValidationIssue[]> {
    const issues: MayaValidationIssue[] = [];

    try {
      // Verificar duplicados de empleados por cédula usando consulta regular
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('id, cedula')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (allEmployees) {
        const cedulaCount: { [key: string]: string[] } = {};
        allEmployees.forEach(emp => {
          if (emp.cedula) {
            if (!cedulaCount[emp.cedula]) {
              cedulaCount[emp.cedula] = [];
            }
            cedulaCount[emp.cedula].push(emp.id);
          }
        });

        const duplicateCedulas = Object.entries(cedulaCount).filter(([_, ids]) => ids.length > 1);

        if (duplicateCedulas.length > 0) {
          issues.push({
            id: 'duplicate_employee_ids',
            type: 'error',
            category: 'consistency',
            title: 'Empleados Duplicados',
            description: `Se encontraron ${duplicateCedulas.length} cédulas duplicadas`,
            impact: 'critical',
            suggestedActions: [
              'Revisar y eliminar duplicados',
              'Verificar base de datos de empleados',
              'Consolidar registros duplicados'
            ],
            autoFixable: false,
            priority: 90
          });
        }
      }

      // Verificar períodos solapados usando consulta directa
      if (periodId) {
        const { data: currentPeriod } = await supabase
          .from('payroll_periods_real')
          .select('fecha_inicio, fecha_fin')
          .eq('id', periodId)
          .single();

        if (currentPeriod) {
          const { data: overlappingPeriods } = await supabase
            .from('payroll_periods_real')
            .select('id, periodo')
            .eq('company_id', companyId)
            .neq('id', periodId)
            .or(`fecha_inicio.lte.${currentPeriod.fecha_fin},fecha_fin.gte.${currentPeriod.fecha_inicio}`);

          if (overlappingPeriods && overlappingPeriods.length > 0) {
            issues.push({
              id: 'overlapping_periods',
              type: 'warning',
              category: 'consistency',
              title: 'Períodos Solapados',
              description: 'Existen períodos con fechas que se solapan',
              impact: 'high',
              suggestedActions: [
                'Revisar fechas de períodos',
                'Ajustar períodos solapados',
                'Verificar configuración de períodos'
              ],
              autoFixable: false,
              priority: 70
            });
          }
        }
      }

    } catch (error) {
      console.error('Error validando consistencia:', error);
    }

    return issues;
  }

  /**
   * Validar cálculos
   */
  private static async validateCalculations(periodId: string, employees: any[]): Promise<MayaValidationIssue[]> {
    const issues: MayaValidationIssue[] = [];

    try {
      // Verificar si existen registros de nómina para el período
      const { data: payrollRecords } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', periodId);

      if (!payrollRecords || payrollRecords.length === 0) {
        issues.push({
          id: 'no_payroll_records',
          type: 'info',
          category: 'calculation',
          title: 'Sin Registros de Nómina',
          description: 'El período no tiene registros de nómina generados aún',
          impact: 'low',
          suggestedActions: [
            'Los registros se generarán durante la liquidación',
            'Verificar que los empleados estén activos'
          ],
          autoFixable: true,
          priority: 30
        });
      } else {
        // Verificar consistencia en cálculos
        const recordsWithErrors = payrollRecords.filter(record => 
          !record.total_devengado || 
          !record.total_deducciones || 
          !record.neto_pagado ||
          record.neto_pagado !== (record.total_devengado - record.total_deducciones)
        );

        if (recordsWithErrors.length > 0) {
          issues.push({
            id: 'calculation_errors',
            type: 'error',
            category: 'calculation',
            title: 'Errores en Cálculos',
            description: `${recordsWithErrors.length} registros tienen errores en cálculos`,
            impact: 'critical',
            affectedEmployees: recordsWithErrors.map(r => r.employee_id),
            suggestedActions: [
              'Recalcular nómina del período',
              'Verificar fórmulas de cálculo',
              'Revisar configuración de deducciones'
            ],
            autoFixable: true,
            priority: 85
          });
        }
      }

    } catch (error) {
      console.error('Error validando cálculos:', error);
    }

    return issues;
  }

  /**
   * Calcular puntuación de validación
   */
  private static calculateValidationScore(issues: MayaValidationIssue[]): number {
    if (issues.length === 0) return 100;

    const weights = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3
    };

    const totalPenalty = issues.reduce((penalty, issue) => {
      return penalty + weights[issue.impact];
    }, 0);

    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * Generar resumen de validación
   */
  private static generateValidationSummary(issues: MayaValidationIssue[], score: number): string {
    if (issues.length === 0) {
      return "✅ Todos los datos están correctos y listos para liquidación";
    }

    const critical = issues.filter(i => i.impact === 'critical').length;
    const warnings = issues.filter(i => i.type === 'warning').length;

    if (critical > 0) {
      return `❌ ${critical} errores críticos impiden la liquidación. Score: ${score}/100`;
    }

    if (warnings > 0) {
      return `⚠️ ${warnings} advertencias detectadas. Puede proceder con precaución. Score: ${score}/100`;
    }

    return `✅ Validación exitosa con observaciones menores. Score: ${score}/100`;
  }

  /**
   * Estimar tiempo de corrección
   */
  private static estimateFixTime(issues: MayaValidationIssue[]): string {
    const criticalCount = issues.filter(i => i.impact === 'critical').length;
    const highCount = issues.filter(i => i.impact === 'high').length;
    const mediumCount = issues.filter(i => i.impact === 'medium').length;

    const estimatedMinutes = (criticalCount * 15) + (highCount * 8) + (mediumCount * 3);

    if (estimatedMinutes === 0) return "Sin correcciones necesarias";
    if (estimatedMinutes < 30) return `${estimatedMinutes} minutos aprox.`;
    if (estimatedMinutes < 120) return `${Math.round(estimatedMinutes / 30) * 30} minutos aprox.`;
    
    return `${Math.round(estimatedMinutes / 60)} horas aprox.`;
  }
}