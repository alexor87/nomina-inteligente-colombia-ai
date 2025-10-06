/**
 * Bonus Impact Simulation Service
 * Simulates the cost impact of giving bonuses to all employees
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { CONTRIBUTION_RATES, LEGAL_VALUES } from '../constants/ContributionRates.ts';

interface BonusBreakdown {
  bonusAmount: number;
  activeEmployees: number;
  totalBonusAmount: number;
  employerContributions: {
    health: number;
    pension: number;
    arl: number;
    cajaCompensacion: number;
    icbf: number;
    sena: number;
    total: number;
  };
  grandTotal: number;
}

export class BonusImpactSimulationService extends BaseAggregationService {
  
  async aggregate(client: any, params: { bonusAmount: number }): Promise<AggregationResult> {
    try {
      const { bonusAmount } = params;
      
      // 1. Validate parameters
      if (!bonusAmount || bonusAmount <= 0) {
        return this.createErrorResponse('⚠️ Por favor especifica un monto de bono válido (ej: $500.000).');
      }
      
      // 2. Get company ID
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('❌ No se pudo identificar tu empresa. Verifica tu sesión.');
      }
      
      // 3. Count active employees
      const { count, error: countError } = await client
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');
      
      if (countError) {
        console.error('[BONUS_IMPACT_SIMULATION] Error counting employees:', countError);
        return this.createErrorResponse(`❌ Error contando empleados: ${countError.message}`);
      }
      
      const activeEmployees = count || 0;
      
      if (activeEmployees === 0) {
        return this.createErrorResponse('⚠️ No se encontraron empleados activos en la empresa.');
      }
      
      // 4. Calculate breakdown
      const breakdown = this.calculateBonusImpact(bonusAmount, activeEmployees);
      
      // 5. Generate detailed message
      const message = this.buildImpactMessage(breakdown);
      
      return {
        message,
        emotionalState: 'helpful',
        data: {
          breakdown
        }
      };
      
    } catch (error: any) {
      console.error('[BONUS_IMPACT_SIMULATION] Error:', error);
      return this.createErrorResponse(`❌ Error simulando impacto del bono: ${error.message}`);
    }
  }
  
  /**
   * Calculate the total impact of bonuses
   */
  private calculateBonusImpact(bonusAmount: number, activeEmployees: number): BonusBreakdown {
    const totalBonusAmount = bonusAmount * activeEmployees;
    
    // Calculate employer contributions per employee
    const health = bonusAmount * CONTRIBUTION_RATES.HEALTH_EMPLOYER;
    const pension = bonusAmount * CONTRIBUTION_RATES.PENSION_EMPLOYER;
    const arl = bonusAmount * CONTRIBUTION_RATES.ARL_MIN;
    const cajaCompensacion = bonusAmount * CONTRIBUTION_RATES.CAJA_COMPENSACION;
    const icbf = bonusAmount * CONTRIBUTION_RATES.ICBF;
    const sena = bonusAmount * CONTRIBUTION_RATES.SENA;
    
    const contributionsPerEmployee = health + pension + arl + cajaCompensacion + icbf + sena;
    const totalContributions = contributionsPerEmployee * activeEmployees;
    
    const grandTotal = totalBonusAmount + totalContributions;
    
    return {
      bonusAmount,
      activeEmployees,
      totalBonusAmount,
      employerContributions: {
        health: health * activeEmployees,
        pension: pension * activeEmployees,
        arl: arl * activeEmployees,
        cajaCompensacion: cajaCompensacion * activeEmployees,
        icbf: icbf * activeEmployees,
        sena: sena * activeEmployees,
        total: totalContributions
      },
      grandTotal
    };
  }
  
  /**
   * Build detailed impact message
   */
  private buildImpactMessage(breakdown: BonusBreakdown): string {
    const {
      bonusAmount,
      activeEmployees,
      totalBonusAmount,
      employerContributions,
      grandTotal
    } = breakdown;
    
    const contributionPercentage = ((employerContributions.total / totalBonusAmount) * 100).toFixed(1);
    const perEmployeeTotal = grandTotal / activeEmployees;
    
    return `🎁 **Simulación de Impacto de Bonos**

---

### 💼 Resumen Ejecutivo

**Bono por Empleado:** ${this.formatCurrency(bonusAmount)}  
**Empleados Activos:** ${activeEmployees}  
**Total en Bonos:** ${this.formatCurrency(totalBonusAmount)}

---

### 📊 Cotizaciones Patronales (Requeridas por Ley)

Los bonos son constitutivos de salario y requieren cotizaciones a seguridad social y parafiscales:

| Concepto | Tasa | Total |
|----------|------|-------|
| **Salud (EPS)** | 8.5% | ${this.formatCurrency(employerContributions.health)} |
| **Pensión** | 12% | ${this.formatCurrency(employerContributions.pension)} |
| **ARL** | 0.522% | ${this.formatCurrency(employerContributions.arl)} |
| **Caja Compensación** | 4% | ${this.formatCurrency(employerContributions.cajaCompensacion)} |
| **ICBF** | 3% | ${this.formatCurrency(employerContributions.icbf)} |
| **SENA** | 2% | ${this.formatCurrency(employerContributions.sena)} |
| **TOTAL COTIZACIONES** | **30.022%** | **${this.formatCurrency(employerContributions.total)}** |

---

### 💰 Costo Total del Programa de Bonos

| Concepto | Monto |
|----------|-------|
| 💵 Total en Bonos | ${this.formatCurrency(totalBonusAmount)} |
| 📋 Cotizaciones Patronales | ${this.formatCurrency(employerContributions.total)} |
| **🎯 COSTO TOTAL** | **${this.formatCurrency(grandTotal)}** |

**Costo Real por Empleado:** ${this.formatCurrency(perEmployeeTotal)} (bono + cotizaciones)

---

### ⚠️ Consideraciones Legales Importantes

1. **Base Gravable**: Los bonos son constitutivos de salario para efectos de seguridad social (Artículo 127, 128 CST).

2. **Retención en la Fuente**: Los empleados pueden estar sujetos a retención en la fuente según su nivel salarial. El empleado recibirá el bono menos las deducciones de ley (4% salud + 4% pensión).

3. **Prestaciones Sociales**: Este bono podría afectar el cálculo de cesantías, prima y vacaciones del período.

4. **Impacto en IBC**: Se suma a la base de cotización del mes en que se pague.

5. **Parafiscales**: Aplican solo si la empresa no está exonerada (salarios > 10 SMMLV pueden estar exonerados de parafiscales).

---

### 💡 Alternativas para Considerar

Si deseas reducir el impacto en cotizaciones, podrías evaluar:
- **Bonos no constitutivos de salario** (máximo 40% del total de ingresos, con limitaciones)
- **Beneficios en especie** (seguros, capacitación, vales de alimentación)
- **Reconocimientos ocasionales** con tratamiento especial

---

### 📌 Próximos Pasos

¿Necesitas ayuda con alguna de estas opciones?

- Registrar estos bonos en la nómina del período actual
- Evaluar alternativas de compensación no salarial
- Calcular el impacto fiscal exacto por empleado
- Proyectar el efecto en prestaciones sociales`;
  }
}
