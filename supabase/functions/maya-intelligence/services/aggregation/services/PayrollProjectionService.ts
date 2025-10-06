/**
 * Payroll Projection Service
 * Professional component-based financial projection for annual payroll costs
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal-types.ts';
import { CONTRIBUTION_RATES, LEGAL_VALUES } from '../constants/ContributionRates.ts';

interface ComponentBreakdown {
  recurringBase: {
    baseSalaries: number;
    transportAllowance: number;
    parafiscales: number;
    socialSecurity: number;
    subtotal: number;
  };
  legalProvisions: {
    prima: number;
    cesantias: number;
    interesesCesantias: number;
    vacaciones: number;
    subtotal: number;
  };
  variableCosts: {
    overtime: number;
    bonuses: number;
    otherNovedades: number;
    subtotal: number;
  };
  totalAnnualProjection: number;
}

export class PayrollProjectionService extends BaseAggregationService {
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    try {
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('No se pudo determinar la empresa del usuario');
      }

      const year = params.year || new Date().getFullYear();
      
      // Get current active employees
      const { data: employees, error: empError } = await client
        .from('employees')
        .select('id, salario_base')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (empError || !employees || employees.length === 0) {
        return {
          message: `No encontré empleados activos para proyectar la nómina de ${year}.`,
          emotionalState: 'neutral',
        };
      }

      // Get historical payroll data for the current year
      const { data: periods, error: periodError } = await client
        .from('payroll_periods_real')
        .select('id, periodo, total_devengado, total_deducciones, total_neto, tipo_periodo')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${year}-01-01`)
        .lte('fecha_fin', `${year}-12-31`)
        .eq('estado', 'cerrado')
        .order('fecha_inicio', { ascending: true });

      if (periodError) {
        console.error('❌ [PAYROLL_PROJECTION] Error querying periods:', periodError);
      }

      const processedPeriods = periods?.length || 0;
      const historicalTotal = periods?.reduce((sum, p) => sum + (p.total_devengado || 0), 0) || 0;

      // Calculate component-based projection
      const breakdown = await this.calculateComponentBreakdown(
        client,
        companyId,
        employees,
        year,
        periods || []
      );

      // Determine expected periods in year
      const periodType = periods?.[0]?.tipo_periodo || 'quincenal';
      const expectedPeriods = this.getExpectedPeriodsInYear(periodType);
      const remainingPeriods = Math.max(0, expectedPeriods - processedPeriods);

      const message = this.buildProjectionMessage(
        year,
        employees.length,
        processedPeriods,
        expectedPeriods,
        remainingPeriods,
        historicalTotal,
        breakdown
      );

      return {
        message,
        emotionalState: 'professional',
        data: {
          year,
          activeEmployees: employees.length,
          processedPeriods,
          expectedPeriods,
          remainingPeriods,
          historicalTotal,
          breakdown,
          methodology: 'component-based',
        },
        visualization: {
          type: 'projection',
          data: {
            title: `Proyección Anual ${year}`,
            value: breakdown.totalAnnualProjection,
            breakdown: [
              { label: 'Base Recurrente', value: breakdown.recurringBase.subtotal },
              { label: 'Provisiones Legales', value: breakdown.legalProvisions.subtotal },
              { label: 'Costos Variables', value: breakdown.variableCosts.subtotal },
            ],
          },
        },
      };
    } catch (error) {
      console.error('❌ [PAYROLL_PROJECTION] aggregate failed:', error);
      return this.createErrorResponse(`Error al calcular proyección: ${error.message}`);
    }
  }

  /**
   * Calculate detailed component breakdown
   */
  private async calculateComponentBreakdown(
    client: any,
    companyId: string,
    employees: any[],
    year: number,
    periods: any[]
  ): Promise<ComponentBreakdown> {
    // A. RECURRING BASE COSTS (Run Rate)
    const totalBaseSalaries = employees.reduce((sum, e) => sum + (e.salario_base || 0), 0);
    
    // Transport allowance for employees earning <= 2 minimum wages
    const eligibleForTransport = employees.filter(
      e => e.salario_base <= (LEGAL_VALUES.SALARIO_MINIMO * 2)
    ).length;
    const monthlyTransportAllowance = eligibleForTransport * LEGAL_VALUES.AUXILIO_TRANSPORTE;
    const annualTransportAllowance = monthlyTransportAllowance * 12;

    // Monthly parafiscales (ICBF + SENA + Caja Compensación)
    const parafiscalesRate = CONTRIBUTION_RATES.ICBF + CONTRIBUTION_RATES.SENA + CONTRIBUTION_RATES.CAJA_COMPENSACION;
    const monthlyParafiscales = totalBaseSalaries * parafiscalesRate;
    const annualParafiscales = monthlyParafiscales * 12;

    // Monthly social security (Health + Pension + ARL employer portion)
    const socialSecurityRate = 
      CONTRIBUTION_RATES.HEALTH_EMPLOYER + 
      CONTRIBUTION_RATES.PENSION_EMPLOYER + 
      CONTRIBUTION_RATES.ARL_MIN; // Using minimum ARL
    const monthlySocialSecurity = totalBaseSalaries * socialSecurityRate;
    const annualSocialSecurity = monthlySocialSecurity * 12;

    const recurringBaseSubtotal = 
      (totalBaseSalaries * 12) + 
      annualTransportAllowance + 
      annualParafiscales + 
      annualSocialSecurity;

    // B. LEGAL PROVISIONS (Obligatory)
    const annualPrima = totalBaseSalaries * CONTRIBUTION_RATES.PRIMA * 12;
    const annualCesantias = totalBaseSalaries * CONTRIBUTION_RATES.CESANTIAS * 12;
    const annualInteresesCesantias = annualCesantias * CONTRIBUTION_RATES.INTERESES_CESANTIAS;
    const annualVacaciones = totalBaseSalaries * CONTRIBUTION_RATES.VACACIONES * 12;

    const legalProvisionsSubtotal = 
      annualPrima + 
      annualCesantias + 
      annualInteresesCesantias + 
      annualVacaciones;

    // C. VARIABLE COSTS (Based on recent history)
    const variableCosts = await this.calculateVariableCosts(client, companyId, year, periods);

    const totalAnnualProjection = 
      recurringBaseSubtotal + 
      legalProvisionsSubtotal + 
      variableCosts.subtotal;

    return {
      recurringBase: {
        baseSalaries: totalBaseSalaries * 12,
        transportAllowance: annualTransportAllowance,
        parafiscales: annualParafiscales,
        socialSecurity: annualSocialSecurity,
        subtotal: recurringBaseSubtotal,
      },
      legalProvisions: {
        prima: annualPrima,
        cesantias: annualCesantias,
        interesesCesantias: annualInteresesCesantias,
        vacaciones: annualVacaciones,
        subtotal: legalProvisionsSubtotal,
      },
      variableCosts,
      totalAnnualProjection,
    };
  }

  /**
   * Calculate variable costs based on recent history
   */
  private async calculateVariableCosts(
    client: any,
    companyId: string,
    year: number,
    periods: any[]
  ): Promise<{ overtime: number; bonuses: number; otherNovedades: number; subtotal: number }> {
    // Query novedades from last 3 months to estimate variable costs
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: recentNovedades, error } = await client
      .from('payroll_novedades')
      .select('tipo_novedad, valor, dias, horas')
      .eq('company_id', companyId)
      .gte('created_at', threeMonthsAgo.toISOString())
      .in('tipo_novedad', ['horas_extra', 'bono', 'comision', 'auxilio']);

    if (error || !recentNovedades || recentNovedades.length === 0) {
      return { overtime: 0, bonuses: 0, otherNovedades: 0, subtotal: 0 };
    }

    // Calculate average monthly values
    const monthlyOvertime = recentNovedades
      .filter(n => n.tipo_novedad === 'horas_extra')
      .reduce((sum, n) => sum + (n.valor || 0), 0) / 3;

    const monthlyBonuses = recentNovedades
      .filter(n => ['bono', 'comision'].includes(n.tipo_novedad))
      .reduce((sum, n) => sum + (n.valor || 0), 0) / 3;

    const monthlyOther = recentNovedades
      .filter(n => n.tipo_novedad === 'auxilio')
      .reduce((sum, n) => sum + (n.valor || 0), 0) / 3;

    // Project to full year
    const remainingMonths = 12 - (periods.length > 0 ? Math.floor(periods.length / 2) : 0);
    
    return {
      overtime: monthlyOvertime * remainingMonths,
      bonuses: monthlyBonuses * remainingMonths,
      otherNovedades: monthlyOther * remainingMonths,
      subtotal: (monthlyOvertime + monthlyBonuses + monthlyOther) * remainingMonths,
    };
  }

  /**
   * Get expected periods in year based on periodicity
   */
  private getExpectedPeriodsInYear(periodType: string): number {
    switch (periodType) {
      case 'quincenal':
        return 24;
      case 'mensual':
        return 12;
      case 'semanal':
        return 52;
      default:
        return 24; // Default to biweekly
    }
  }

  /**
   * Build professional projection message
   */
  private buildProjectionMessage(
    year: number,
    activeEmployees: number,
    processedPeriods: number,
    expectedPeriods: number,
    remainingPeriods: number,
    historicalTotal: number,
    breakdown: ComponentBreakdown
  ): string {
    const progressPercentage = ((processedPeriods / expectedPeriods) * 100).toFixed(1);

    return `📊 **PROYECCIÓN PROFESIONAL DE NÓMINA ${year}**\n\n` +
      `### 📈 Resumen Ejecutivo\n` +
      `👥 **${activeEmployees}** empleados activos\n` +
      `📅 **${processedPeriods}/${expectedPeriods}** períodos procesados (${progressPercentage}% del año)\n` +
      `💰 **Total histórico**: ${this.formatCurrency(historicalTotal)}\n` +
      `🎯 **PROYECCIÓN ANUAL**: ${this.formatCurrency(breakdown.totalAnnualProjection)}\n\n` +
      
      `---\n\n` +
      
      `### 🔄 A. Costos Base Recurrentes (Run Rate)\n` +
      `• Salarios base: ${this.formatCurrency(breakdown.recurringBase.baseSalaries)}\n` +
      `• Auxilio de transporte: ${this.formatCurrency(breakdown.recurringBase.transportAllowance)}\n` +
      `• Parafiscales (ICBF+SENA+Caja): ${this.formatCurrency(breakdown.recurringBase.parafiscales)}\n` +
      `• Seguridad social (Salud+Pensión+ARL): ${this.formatCurrency(breakdown.recurringBase.socialSecurity)}\n` +
      `**Subtotal Recurrente**: ${this.formatCurrency(breakdown.recurringBase.subtotal)}\n\n` +
      
      `### ⚖️ B. Provisiones Legales Obligatorias\n` +
      `• Prima de servicios (2 pagos/año): ${this.formatCurrency(breakdown.legalProvisions.prima)}\n` +
      `• Cesantías: ${this.formatCurrency(breakdown.legalProvisions.cesantias)}\n` +
      `• Intereses sobre cesantías: ${this.formatCurrency(breakdown.legalProvisions.interesesCesantias)}\n` +
      `• Vacaciones: ${this.formatCurrency(breakdown.legalProvisions.vacaciones)}\n` +
      `**Subtotal Provisiones**: ${this.formatCurrency(breakdown.legalProvisions.subtotal)}\n\n` +
      
      `### 📊 C. Costos Variables Proyectados\n` +
      `• Horas extra estimadas: ${this.formatCurrency(breakdown.variableCosts.overtime)}\n` +
      `• Bonos y comisiones: ${this.formatCurrency(breakdown.variableCosts.bonuses)}\n` +
      `• Otros auxilios: ${this.formatCurrency(breakdown.variableCosts.otherNovedades)}\n` +
      `**Subtotal Variables**: ${this.formatCurrency(breakdown.variableCosts.subtotal)}\n\n` +
      
      `---\n\n` +
      
      `### 💡 Metodología\n` +
      `Esta proyección usa un **modelo por componentes** que:\n` +
      `1. Calcula el **Run Rate** actual basado en empleados activos\n` +
      `2. Aplica **tasas legales exactas** para provisiones obligatorias\n` +
      `3. Proyecta **variables** usando promedio de últimos 3 meses\n` +
      `4. **NO incluye**: contrataciones futuras, aumentos salariales, cambios estructurales\n\n` +
      
      `📌 *Nota: Esta es una proyección financiera basada en la estructura actual. Para escenarios con cambios, consulta al área financiera.*`;
  }
}
