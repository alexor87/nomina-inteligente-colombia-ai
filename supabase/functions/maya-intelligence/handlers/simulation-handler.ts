import { HandlerResponse } from '../core/response-builder.ts';

interface SimulationRequest {
  scenarioType: 'hire_employees' | 'salary_increase' | 'overtime_change' | 'bonus_change';
  parameters: {
    newEmployees?: { count: number; averageSalary: number };
    salaryChange?: { type: 'percentage' | 'fixed'; value: number };
    overtimeChange?: { averageHoursPerMonth: number };
    bonusChange?: { type: 'one_time' | 'recurring'; amount: number };
    projectionMonths?: number;
  };
  companyId: string;
  currentPeriodId?: string;
}

export class SimulationHandler {
  /**
   * Maneja solicitudes de simulación What-If
   */
  static async handleSimulation(
    request: SimulationRequest,
    supabaseClient: any
  ): Promise<HandlerResponse> {
    try {
      console.log('[SimulationHandler] Processing simulation:', request.scenarioType);

      // 1. Obtener datos actuales de nómina
      const currentData = await this.fetchCurrentPayrollData(
        request.companyId,
        request.currentPeriodId,
        supabaseClient
      );

      if (!currentData || currentData.length === 0) {
        return {
          message: `No encontré datos de nómina para realizar la simulación.\n\n¿Quieres simular con datos estimados?`,
          emotionalState: 'concerned',
          quickReplies: [
            { value: 'use_estimates', label: 'Usar estimados', icon: '📊' },
            { value: 'cancel', label: 'Cancelar', icon: '❌' }
          ]
        };
      }

      // 2. Ejecutar simulación
      const result = await this.executeSimulation(
        request,
        currentData,
        supabaseClient
      );

      // 3. Generar respuesta con insights
      return this.formatSimulationResponse(result, request);
    } catch (error) {
      console.error('[SimulationHandler] Error:', error);
      return {
        message: '❌ Ocurrió un error al ejecutar la simulación. Por favor intenta de nuevo.',
        emotionalState: 'concerned'
      };
    }
  }

  /**
   * Obtiene datos actuales de nómina
   */
  private static async fetchCurrentPayrollData(
    companyId: string,
    periodId: string | undefined,
    supabaseClient: any
  ): Promise<any[]> {
    // Si hay un período específico, usarlo
    if (periodId) {
      const { data } = await supabaseClient
        .from('payrolls')
        .select(`
          employee_id,
          salario_base,
          neto_pagado,
          employees!inner(
            nombre,
            apellido,
            salario_base
          )
        `)
        .eq('company_id', companyId)
        .eq('period_id', periodId);
      
      return data || [];
    }

    // Si no, usar empleados activos con sus salarios
    const { data } = await supabaseClient
      .from('employees')
      .select('id, nombre, apellido, salario_base, centro_costos')
      .eq('company_id', companyId)
      .eq('estado', 'activo');

    return data || [];
  }

  /**
   * Ejecuta la simulación
   */
  private static async executeSimulation(
    request: SimulationRequest,
    currentData: any[],
    supabaseClient: any
  ): Promise<any> {
    const { scenarioType, parameters } = request;

    // Calcular baseline (situación actual)
    const baseline = this.calculateBaseline(currentData);

    // Aplicar cambios según el tipo de escenario
    let projectedData = [...currentData];
    
    if (scenarioType === 'hire_employees' && parameters.newEmployees) {
      const { count, averageSalary } = parameters.newEmployees;
      for (let i = 0; i < count; i++) {
        projectedData.push({
          id: `new-${i}`,
          salario_base: averageSalary,
          nombre: 'Nuevo',
          apellido: `Empleado ${i + 1}`,
          isNew: true
        });
      }
    } else if (scenarioType === 'salary_increase' && parameters.salaryChange) {
      const { type, value } = parameters.salaryChange;
      projectedData = projectedData.map(emp => ({
        ...emp,
        salario_base: type === 'percentage'
          ? emp.salario_base * (1 + value / 100)
          : emp.salario_base + value
      }));
    }

    // Calcular proyección
    const projected = this.calculateBaseline(projectedData);

    // Calcular comparación
    const comparison = this.calculateComparison(baseline, projected);

    // Calcular ROI
    const roi = this.calculateROI(scenarioType, comparison, parameters);

    // Generar proyección mensual
    const timeline = this.generateTimeline(
      baseline,
      projected,
      parameters.projectionMonths || 12
    );

    return {
      baseline,
      projected,
      comparison,
      roi,
      timeline,
      recommendations: this.generateRecommendations(scenarioType, comparison, roi),
      risks: this.identifyRisks(scenarioType, comparison)
    };
  }

  /**
   * Calcula snapshot baseline
   */
  private static calculateBaseline(data: any[]): any {
    const employeeCount = data.length;
    const totalSalaries = data.reduce((sum, emp) => sum + (emp.salario_base || 0), 0);
    
    // Cálculos aproximados de costos laborales en Colombia
    const socialSecurity = totalSalaries * 0.255; // 25.5% aprox
    const parafiscales = totalSalaries * 0.09; // 9% aprox
    const provisions = totalSalaries * 0.2133; // 21.33% aprox (prima, cesantías, vacaciones)
    
    const totalCost = totalSalaries + socialSecurity + parafiscales + provisions;
    const avgCostPerEmployee = employeeCount > 0 ? totalCost / employeeCount : 0;

    return {
      employeeCount,
      totalSalaries,
      socialSecurity,
      parafiscales,
      provisions,
      totalCost,
      avgCostPerEmployee
    };
  }

  /**
   * Calcula comparación entre escenarios
   */
  private static calculateComparison(baseline: any, projected: any): any {
    const employeeCountChange = projected.employeeCount - baseline.employeeCount;
    const totalCostChange = projected.totalCost - baseline.totalCost;
    const totalCostChangePercentage = baseline.totalCost !== 0
      ? (totalCostChange / baseline.totalCost) * 100
      : 0;
    
    return {
      employeeCountChange,
      totalCostChange,
      totalCostChangePercentage,
      monthlyCostIncrease: totalCostChange,
      annualCostIncrease: totalCostChange * 12,
      costPerEmployeeChange: projected.avgCostPerEmployee - baseline.avgCostPerEmployee
    };
  }

  /**
   * Calcula ROI
   */
  private static calculateROI(scenarioType: string, comparison: any, parameters: any): any {
    let riskLevel: 'low' | 'medium' | 'high';
    let confidence: number;

    if (Math.abs(comparison.totalCostChangePercentage) < 10) {
      riskLevel = 'low';
      confidence = 85;
    } else if (Math.abs(comparison.totalCostChangePercentage) < 25) {
      riskLevel = 'medium';
      confidence = 70;
    } else {
      riskLevel = 'high';
      confidence = 55;
    }

    const paybackPeriod = scenarioType === 'hire_employees'
      ? Math.ceil(Math.abs(comparison.totalCostChange) / (comparison.totalCostChange * 0.05))
      : undefined;

    return {
      investmentRequired: Math.abs(comparison.totalCostChange),
      riskLevel,
      confidence,
      paybackPeriod
    };
  }

  /**
   * Genera timeline mensual
   */
  private static generateTimeline(baseline: any, projected: any, months: number): any[] {
    const timeline = [];
    const monthlyCostIncrease = (projected.totalCost - baseline.totalCost) / months;

    for (let i = 0; i < months; i++) {
      timeline.push({
        month: i + 1,
        totalCost: baseline.totalCost + (monthlyCostIncrease * (i + 1)),
        employeeCount: Math.round(
          baseline.employeeCount + 
          ((projected.employeeCount - baseline.employeeCount) * (i + 1) / months)
        )
      });
    }

    return timeline;
  }

  /**
   * Genera recomendaciones
   */
  private static generateRecommendations(scenarioType: string, comparison: any, roi: any): string[] {
    const recommendations: string[] = [];

    if (scenarioType === 'hire_employees') {
      recommendations.push('Considera contratación escalonada para reducir impacto inicial');
      if (comparison.annualCostIncrease > 100000000) {
        recommendations.push('Verifica disponibilidad presupuestal antes de proceder');
      }
    }

    if (Math.abs(comparison.totalCostChangePercentage) > 15) {
      recommendations.push('Evalúa fuentes de financiamiento para cubrir el incremento');
    }

    if (roi.riskLevel === 'high') {
      recommendations.push('⚠️ Considera un plan de contingencia por el alto riesgo');
    }

    return recommendations;
  }

  /**
   * Identifica riesgos
   */
  private static identifyRisks(scenarioType: string, comparison: any): string[] {
    const risks: string[] = [];

    if (Math.abs(comparison.totalCostChangePercentage) > 20) {
      risks.push('Impacto significativo en flujo de caja');
    }

    if (comparison.annualCostIncrease > 50000000) {
      risks.push('Aumento superior a $50M anuales');
    }

    if (scenarioType === 'hire_employees') {
      risks.push('Período de capacitación puede afectar productividad inicial');
    }

    return risks;
  }

  /**
   * Formatea respuesta de simulación
   */
  private static formatSimulationResponse(result: any, request: SimulationRequest): HandlerResponse {
    const { comparison, roi } = result;

    const summary = `📊 **Impacto financiero:**\n\n` +
      `• Cambio mensual: ${this.formatCurrency(comparison.monthlyCostIncrease)} (${comparison.totalCostChangePercentage.toFixed(1)}%)\n` +
      `• Impacto anual: ${this.formatCurrency(comparison.annualCostIncrease)}\n` +
      `• Nivel de riesgo: ${roi.riskLevel === 'low' ? '🟢 Bajo' : roi.riskLevel === 'medium' ? '🟡 Medio' : '🔴 Alto'}\n` +
      `• Confianza: ${roi.confidence}%`;

    const keyFindings = result.recommendations.slice(0, 2).map((rec: string) => `• ${rec}`).join('\n');

    return {
      message: summary + '\n\n' + keyFindings,
      emotionalState: roi.riskLevel === 'high' ? 'concerned' : 'analyzing',
      conversationState: {
        simulationResult: result,
        scenarioType: request.scenarioType
      },
      quickReplies: [
        { value: 'view_timeline', label: 'Ver proyección', icon: '📊' },
        { value: 'export', label: 'Exportar', icon: '📥' },
        { value: 'new_simulation', label: 'Nueva simulación', icon: '🎯' }
      ]
    };
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
