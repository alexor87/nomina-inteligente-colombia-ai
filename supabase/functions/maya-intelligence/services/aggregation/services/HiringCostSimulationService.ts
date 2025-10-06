/**
 * Hiring Cost Simulation Service
 * Calculates the complete monthly and annual cost of hiring a new employee
 * Based on Colombian labor law 2025
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { CONTRIBUTION_RATES, LEGAL_VALUES } from '../constants/ContributionRates.ts';

interface HiringCostBreakdown {
  salary: number;
  transportAllowance: number;
  healthEmployer: number;
  pensionEmployer: number;
  arlEmployer: number;
  icbf: number;
  sena: number;
  cajaCompensacion: number;
  cesantias: number;
  interesesCesantias: number;
  prima: number;
  vacaciones: number;
  totalMonthly: number;
  totalAnnual: number;
  percentageIncrease: number;
}

export class HiringCostSimulationService extends BaseAggregationService {
  async aggregate(client: any, params: { salary?: number }): Promise<AggregationResult> {
    try {
      const { salary } = params;

      // Validate salary input
      if (!salary || salary <= 0) {
        return {
          message: '⚠️ Por favor especifica un salario válido para la simulación.\n\n' +
            '**Ejemplo:** "¿Cuánto me costaría contratar un empleado por $2.000.000?"',
          emotionalState: 'neutral'
        };
      }

      // Calculate breakdown
      const breakdown = this.calculateHiringCost(salary);

      // Build professional message
      const message = this.buildSimulationMessage(breakdown);

      return {
        message,
        emotionalState: 'professional',
        data: breakdown,
        visualization: {
          type: 'breakdown',
          data: {
            title: 'Simulación de Costo de Contratación',
            categories: [
              { label: 'Compensación Directa', value: breakdown.salary + breakdown.transportAllowance },
              { label: 'Seguridad Social', value: breakdown.healthEmployer + breakdown.pensionEmployer + breakdown.arlEmployer },
              { label: 'Parafiscales', value: breakdown.icbf + breakdown.sena + breakdown.cajaCompensacion },
              { label: 'Prestaciones Sociales', value: breakdown.cesantias + breakdown.interesesCesantias + breakdown.prima + breakdown.vacaciones }
            ],
            total: breakdown.totalMonthly
          }
        }
      };
    } catch (error) {
      console.error('❌ [HIRING_COST_SIMULATION] Error:', error);
      return this.createErrorResponse(`Error al simular costo de contratación: ${error.message}`);
    }
  }

  private calculateHiringCost(salary: number): HiringCostBreakdown {
    // 1. Base Salary
    const baseSalary = salary;

    // 2. Transport Allowance (only if salary <= 2 SMMLV)
    const transportAllowance = salary <= (LEGAL_VALUES.SALARIO_MINIMO * 2) 
      ? LEGAL_VALUES.AUXILIO_TRANSPORTE 
      : 0;

    // 3. Social Security (Employer contributions)
    const healthEmployer = baseSalary * CONTRIBUTION_RATES.HEALTH_EMPLOYER;
    const pensionEmployer = baseSalary * CONTRIBUTION_RATES.PENSION_EMPLOYER;
    const arlEmployer = baseSalary * CONTRIBUTION_RATES.ARL_MIN; // Risk Level I

    // 4. Parafiscales (always apply in Colombian law)
    const icbf = baseSalary * CONTRIBUTION_RATES.ICBF;
    const sena = baseSalary * CONTRIBUTION_RATES.SENA;
    const cajaCompensacion = baseSalary * CONTRIBUTION_RATES.CAJA_COMPENSACION;

    // 5. Social Benefits (Monthly accrual)
    const cesantias = baseSalary * CONTRIBUTION_RATES.CESANTIAS;
    const interesesCesantias = cesantias * CONTRIBUTION_RATES.INTERESES_CESANTIAS / 12; // 1% monthly
    const prima = baseSalary * CONTRIBUTION_RATES.PRIMA;
    const vacaciones = baseSalary * CONTRIBUTION_RATES.VACACIONES;

    // Calculate totals
    const totalMonthly = 
      baseSalary + 
      transportAllowance +
      healthEmployer + 
      pensionEmployer + 
      arlEmployer +
      icbf + 
      sena + 
      cajaCompensacion +
      cesantias + 
      interesesCesantias + 
      prima + 
      vacaciones;

    const totalAnnual = totalMonthly * 12;
    const percentageIncrease = ((totalMonthly - baseSalary) / baseSalary) * 100;

    return {
      salary: baseSalary,
      transportAllowance,
      healthEmployer,
      pensionEmployer,
      arlEmployer,
      icbf,
      sena,
      cajaCompensacion,
      cesantias,
      interesesCesantias,
      prima,
      vacaciones,
      totalMonthly,
      totalAnnual,
      percentageIncrease
    };
  }

  private buildSimulationMessage(breakdown: HiringCostBreakdown): string {
    const directCompensation = breakdown.salary + breakdown.transportAllowance;
    const socialSecurity = breakdown.healthEmployer + breakdown.pensionEmployer + breakdown.arlEmployer;
    const parafiscales = breakdown.icbf + breakdown.sena + breakdown.cajaCompensacion;
    const prestaciones = breakdown.cesantias + breakdown.interesesCesantias + breakdown.prima + breakdown.vacaciones;

    return `💼 **Simulación de Costo de Contratación**

**Salario Base Propuesto:** ${this.formatCurrency(breakdown.salary)}

---

### 💰 Desglose de Costos Mensuales

**1️⃣ Compensación Directa al Empleado**
- Salario base: ${this.formatCurrency(breakdown.salary)}
${breakdown.transportAllowance > 0 ? `- Auxilio de transporte: ${this.formatCurrency(breakdown.transportAllowance)}` : ''}
- **Subtotal:** ${this.formatCurrency(directCompensation)}

**2️⃣ Seguridad Social (Aportes Patronales)**
- Salud (8.5%): ${this.formatCurrency(breakdown.healthEmployer)}
- Pensión (12%): ${this.formatCurrency(breakdown.pensionEmployer)}
- ARL (0.522% - Nivel I): ${this.formatCurrency(breakdown.arlEmployer)}
- **Subtotal:** ${this.formatCurrency(socialSecurity)}

**3️⃣ Aportes Parafiscales**
- Caja de Compensación (4%): ${this.formatCurrency(breakdown.cajaCompensacion)}
- ICBF (3%): ${this.formatCurrency(breakdown.icbf)}
- SENA (2%): ${this.formatCurrency(breakdown.sena)}
- **Subtotal:** ${this.formatCurrency(parafiscales)}

**4️⃣ Prestaciones Sociales (Provisión Mensual)**
- Cesantías (8.33%): ${this.formatCurrency(breakdown.cesantias)}
- Intereses sobre cesantías (1%): ${this.formatCurrency(breakdown.interesesCesantias)}
- Prima de servicios (8.33%): ${this.formatCurrency(breakdown.prima)}
- Vacaciones (4.17%): ${this.formatCurrency(breakdown.vacaciones)}
- **Subtotal:** ${this.formatCurrency(prestaciones)}

---

### 📈 Resumen Financiero

- **💵 Costo Total Mensual:** ${this.formatCurrency(breakdown.totalMonthly)}
- **📊 Incremento sobre salario base:** +${breakdown.percentageIncrease.toFixed(1)}%
- **💰 Proyección Anual:** ${this.formatCurrency(breakdown.totalAnnual)}

---

### ⚠️ Notas Importantes

1. **ARL**: Cálculo basado en Nivel de Riesgo I (0.522%). Si el cargo tiene mayor riesgo, el costo aumentará.
2. **Parafiscales**: Incluidos según legislación colombiana 2025.
${breakdown.transportAllowance === 0 ? '3. **Auxilio de transporte**: No aplica porque el salario supera 2 SMMLV.\n' : ''}
${breakdown.transportAllowance === 0 ? '4' : '3'}. **No incluye**:
   - Dotación de ley (si aplica)
   - Capacitaciones obligatorias
   - Bonos variables o comisiones
   - Beneficios extralegales

¿Necesitas que ajuste algún parámetro de la simulación?`;
  }
}
