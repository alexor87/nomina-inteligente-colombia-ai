import { 
  SimulationType,
  SimulationParameters,
  SimulationResult,
  FinancialSnapshot,
  SimulationComparison,
  ROIAnalysis,
  MonthlyProjection,
  SimulationScenario
} from '@/types/simulation';

interface PayrollConfiguration {
  salaryMin: number;
  transportAllowance: number;
  healthEmployee: number;
  healthEmployer: number;
  pensionEmployee: number;
  pensionEmployer: number;
  arl: number;
  compensationBox: number;
  icbf: number;
  sena: number;
  prima: number;
  cesantias: number;
  interesesCesantias: number;
  vacaciones: number;
}

export class PayrollSimulator {
  private static DEFAULT_CONFIG: PayrollConfiguration = {
    salaryMin: 1423500,
    transportAllowance: 200000,
    healthEmployee: 0.04,
    healthEmployer: 0.085,
    pensionEmployee: 0.04,
    pensionEmployer: 0.12,
    arl: 0.00522,
    compensationBox: 0.04,
    icbf: 0.03,
    sena: 0.02,
    prima: 0.0833,
    cesantias: 0.0833,
    interesesCesantias: 0.12,
    vacaciones: 0.0417
  };

  /**
   * Simula un escenario y genera análisis completo
   */
  static async simulate(
    scenario: SimulationScenario,
    currentData: any[],
    config?: Partial<PayrollConfiguration>
  ): Promise<SimulationResult> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };

    // 1. Calcular baseline (situación actual)
    const baseline = this.calculateFinancialSnapshot(
      currentData,
      fullConfig,
      'Actual'
    );

    // 2. Aplicar cambios del escenario
    const projectedData = this.applyScenarioChanges(
      currentData,
      scenario.parameters
    );

    // 3. Calcular snapshot proyectado
    const projected = this.calculateFinancialSnapshot(
      projectedData,
      fullConfig,
      'Proyectado'
    );

    // 4. Generar comparación
    const comparison = this.generateComparison(baseline, projected);

    // 5. Calcular ROI
    const roi = this.calculateROI(scenario, comparison, baseline);

    // 6. Generar proyección mensual
    const timeline = this.generateTimeline(
      baseline,
      projected,
      scenario.parameters.projectionMonths || 12
    );

    // 7. Generar recomendaciones y riesgos
    const recommendations = this.generateRecommendations(scenario, comparison, roi);
    const risks = this.identifyRisks(scenario, comparison);

    return {
      scenario,
      baseline,
      projected,
      comparison,
      roi,
      timeline,
      recommendations,
      risks,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calcula un snapshot financiero
   */
  private static calculateFinancialSnapshot(
    data: any[],
    config: PayrollConfiguration,
    period: string
  ): FinancialSnapshot {
    const employeeCount = data.length;
    
    // Calcular totales base
    const totalSalaries = data.reduce((sum, emp) => sum + (emp.salary || emp.salario_base || 0), 0);
    const totalBenefits = totalSalaries * 0.08; // Aproximado

    // Seguridad Social
    const healthEmployee = totalSalaries * config.healthEmployee;
    const healthEmployer = totalSalaries * config.healthEmployer;
    const pensionEmployee = totalSalaries * config.pensionEmployee;
    const pensionEmployer = totalSalaries * config.pensionEmployer;
    const arl = totalSalaries * config.arl;
    const compensationBox = totalSalaries * config.compensationBox;

    const socialSecurity = {
      health: healthEmployee + healthEmployer,
      pension: pensionEmployee + pensionEmployer,
      arl,
      compensationBox,
      total: healthEmployee + healthEmployer + pensionEmployee + pensionEmployer + arl + compensationBox
    };

    // Parafiscales
    const icbf = totalSalaries * config.icbf;
    const sena = totalSalaries * config.sena;
    const parafiscales = {
      icbf,
      sena,
      total: icbf + sena
    };

    // Provisiones
    const prima = totalSalaries * config.prima;
    const cesantias = totalSalaries * config.cesantias;
    const interesesCesantias = cesantias * config.interesesCesantias;
    const vacaciones = totalSalaries * config.vacaciones;

    const provisions = {
      prima,
      cesantias,
      interesesCesantias,
      vacaciones,
      total: prima + cesantias + interesesCesantias + vacaciones
    };

    // Costo total
    const totalCost = totalSalaries + totalBenefits + socialSecurity.total + 
                     parafiscales.total + provisions.total;
    
    const averageCostPerEmployee = employeeCount > 0 ? totalCost / employeeCount : 0;

    return {
      period,
      employeeCount,
      totalSalaries,
      totalBenefits,
      socialSecurity,
      parafiscales,
      provisions,
      totalCost,
      averageCostPerEmployee
    };
  }

  /**
   * Aplica los cambios del escenario a los datos
   */
  private static applyScenarioChanges(
    data: any[],
    parameters: SimulationParameters
  ): any[] {
    let modifiedData = [...data];

    // Simular nuevas contrataciones
    if (parameters.newEmployees) {
      const { count, averageSalary } = parameters.newEmployees;
      for (let i = 0; i < count; i++) {
        modifiedData.push({
          id: `new-${i}`,
          salary: averageSalary,
          isNew: true
        });
      }
    }

    // Simular cambios salariales
    if (parameters.salaryChange) {
      const { type, value, affectedEmployees } = parameters.salaryChange;
      
      modifiedData = modifiedData.map(emp => {
        // Aplicar a todos o solo a afectados
        const shouldApply = !affectedEmployees || 
                           affectedEmployees.includes('all') || 
                           affectedEmployees.includes(emp.id);
        
        if (shouldApply) {
          const currentSalary = emp.salary || emp.salario_base || 0;
          const newSalary = type === 'percentage' 
            ? currentSalary * (1 + value / 100)
            : currentSalary + value;
          
          return { ...emp, salary: newSalary };
        }
        
        return emp;
      });
    }

    return modifiedData;
  }

  /**
   * Genera comparación entre baseline y proyección
   */
  private static generateComparison(
    baseline: FinancialSnapshot,
    projected: FinancialSnapshot
  ): SimulationComparison {
    const employeeCountChange = projected.employeeCount - baseline.employeeCount;
    const totalCostChange = projected.totalCost - baseline.totalCost;
    const totalCostChangePercentage = baseline.totalCost !== 0
      ? (totalCostChange / baseline.totalCost) * 100
      : 0;
    
    const monthlyCostIncrease = totalCostChange;
    const annualCostIncrease = totalCostChange * 12;
    const costPerEmployeeChange = projected.averageCostPerEmployee - baseline.averageCostPerEmployee;

    return {
      employeeCountChange,
      totalCostChange,
      totalCostChangePercentage,
      monthlyCostIncrease,
      annualCostIncrease,
      costPerEmployeeChange
    };
  }

  /**
   * Calcula ROI del escenario
   */
  private static calculateROI(
    scenario: SimulationScenario,
    comparison: SimulationComparison,
    baseline: FinancialSnapshot
  ): ROIAnalysis {
    const investmentRequired = Math.abs(comparison.totalCostChange);
    
    let riskLevel: 'low' | 'medium' | 'high';
    let confidence: number;

    // Evaluar riesgo basado en % de aumento
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

    // Calcular período de retorno (simplificado)
    const paybackPeriod = scenario.type === 'hire_employees' 
      ? Math.ceil(investmentRequired / (baseline.totalCost * 0.05)) // Asume 5% de productividad extra
      : undefined;

    return {
      investmentRequired,
      paybackPeriod,
      riskLevel,
      confidence,
      assumptions: [
        'Productividad constante por empleado',
        'Sin cambios en legislación laboral',
        'Inflación promedio del 5% anual',
        'Retención de empleados del 85%'
      ]
    };
  }

  /**
   * Genera proyección mensual
   */
  private static generateTimeline(
    baseline: FinancialSnapshot,
    projected: FinancialSnapshot,
    months: number
  ): MonthlyProjection[] {
    const timeline: MonthlyProjection[] = [];
    const monthlyCostIncrease = (projected.totalCost - baseline.totalCost) / months;
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let cumulativeCost = 0;

    for (let i = 0; i < months; i++) {
      const currentMonth = new Date();
      currentMonth.setMonth(currentMonth.getMonth() + i);
      
      const monthCost = baseline.totalCost + (monthlyCostIncrease * (i + 1));
      cumulativeCost += monthCost;
      
      timeline.push({
        month: i + 1,
        monthName: monthNames[currentMonth.getMonth()],
        employeeCount: Math.round(
          baseline.employeeCount + 
          ((projected.employeeCount - baseline.employeeCount) * (i + 1) / months)
        ),
        totalCost: monthCost,
        cumulativeCost
      });
    }

    return timeline;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  private static generateRecommendations(
    scenario: SimulationScenario,
    comparison: SimulationComparison,
    roi: ROIAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (scenario.type === 'hire_employees') {
      recommendations.push('Considera un proceso de contratación escalonado para reducir riesgo');
      
      if (comparison.annualCostIncrease > 100000000) {
        recommendations.push('El aumento supera $100M anuales. Asegúrate de tener presupuesto aprobado');
      }
      
      recommendations.push('Implementa KPIs para medir productividad de nuevos empleados');
    }

    if (scenario.type === 'salary_increase') {
      if (comparison.totalCostChangePercentage > 15) {
        recommendations.push('Considera un aumento gradual en lugar de un incremento único');
      }
      recommendations.push('Comunica el aumento con anticipación para mejorar moral del equipo');
    }

    if (roi.riskLevel === 'high') {
      recommendations.push('⚠️ Riesgo alto: Evalúa fuentes de financiamiento adicionales');
      recommendations.push('Considera un plan de contingencia si no se alcanzan objetivos');
    }

    return recommendations;
  }

  /**
   * Identifica riesgos del escenario
   */
  private static identifyRisks(
    scenario: SimulationScenario,
    comparison: SimulationComparison
  ): string[] {
    const risks: string[] = [];

    if (Math.abs(comparison.totalCostChangePercentage) > 20) {
      risks.push('Impacto significativo en flujo de caja mensual');
    }

    if (scenario.type === 'hire_employees' && scenario.parameters.newEmployees) {
      if (scenario.parameters.newEmployees.count > 5) {
        risks.push('Dificultad para mantener cultura organizacional con crecimiento rápido');
      }
      risks.push('Período de capacitación puede afectar productividad inicial');
    }

    if (comparison.annualCostIncrease > 50000000) {
      risks.push('Aumento supera $50M anuales - requiere aprobación de gerencia');
    }

    return risks;
  }

  /**
   * Formatea moneda
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
