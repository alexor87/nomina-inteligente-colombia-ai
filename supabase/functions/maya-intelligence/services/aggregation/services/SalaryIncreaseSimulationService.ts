/**
 * Salary Increase Simulation Service
 * Simulates the cost impact of salary increases for specific employees
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { CONTRIBUTION_RATES, LEGAL_VALUES } from '../constants/ContributionRates.ts';

interface SalaryIncreaseBreakdown {
  employeeName: string;
  currentSalary: number;
  newSalary: number;
  increaseAmount: number;
  increasePercentage: number;
  currentMonthlyCost: number;
  newMonthlyCost: number;
  monthlyDelta: number;
  annualDelta: number;
  breakdown: {
    socialSecurity: { current: number; new: number; delta: number; };
    parafiscales: { current: number; new: number; delta: number; };
    benefits: { current: number; new: number; delta: number; };
  };
}

export class SalaryIncreaseSimulationService extends BaseAggregationService {
  
  async aggregate(client: any, params: { employeeName: string; increaseAmount: number }): Promise<AggregationResult> {
    try {
      const { employeeName, increaseAmount } = params;
      
      // 1. Validate parameters
      if (!employeeName) {
        return this.createErrorResponse('⚠️ Por favor especifica el nombre del empleado para simular el aumento salarial.');
      }
      
      if (!increaseAmount || increaseAmount <= 0) {
        return this.createErrorResponse('⚠️ Por favor especifica un monto de incremento válido (ej: $300.000).');
      }
      
      // 2. Get company ID
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('❌ No se pudo identificar tu empresa. Verifica tu sesión.');
      }
      
      // 3. Search for employee by name
      const { data: employees, error: searchError } = await client
        .from('employees')
        .select('id, nombre, apellido, salario_base')
        .eq('company_id', companyId)
        .ilike('nombre', `%${employeeName}%`)
        .eq('estado', 'activo');
      
      if (searchError) {
        console.error('[SALARY_INCREASE_SIMULATION] Error searching employee:', searchError);
        return this.createErrorResponse(`❌ Error buscando empleado: ${searchError.message}`);
      }
      
      if (!employees || employees.length === 0) {
        return this.createErrorResponse(`🔍 No se encontró ningún empleado activo con el nombre "${employeeName}".`);
      }
      
      if (employees.length > 1) {
        const names = employees.map(e => `${e.nombre} ${e.apellido}`).join(', ');
        return this.createErrorResponse(`⚠️ Se encontraron múltiples empleados: ${names}. Por favor especifica el nombre completo.`);
      }
      
      const employee = employees[0];
      const fullName = `${employee.nombre} ${employee.apellido}`;
      const currentSalary = parseFloat(employee.salario_base) || 0;
      
      // 4. Calculate costs
      const breakdown = this.calculateSalaryIncreaseImpact(fullName, currentSalary, increaseAmount);
      
      // 5. Generate detailed comparison message
      const message = this.buildComparisonMessage(breakdown);
      
      return {
        message,
        emotionalState: 'helpful',
        data: {
          employee: fullName,
          breakdown
        }
      };
      
    } catch (error: any) {
      console.error('[SALARY_INCREASE_SIMULATION] Error:', error);
      return this.createErrorResponse(`❌ Error simulando incremento salarial: ${error.message}`);
    }
  }
  
  /**
   * Calculate employer costs for a given salary
   */
  private calculateEmployerCosts(salary: number): {
    socialSecurity: number;
    parafiscales: number;
    benefits: number;
    total: number;
  } {
    // Social Security (Seguridad Social)
    const health = salary * CONTRIBUTION_RATES.HEALTH_EMPLOYER;
    const pension = salary * CONTRIBUTION_RATES.PENSION_EMPLOYER;
    const arl = salary * CONTRIBUTION_RATES.ARL_MIN;
    const socialSecurity = health + pension + arl;
    
    // Parafiscales (only if salary > 10 SMMLV, but we calculate anyway)
    const icbf = salary * CONTRIBUTION_RATES.ICBF;
    const sena = salary * CONTRIBUTION_RATES.SENA;
    const caja = salary * CONTRIBUTION_RATES.CAJA_COMPENSACION;
    const parafiscales = icbf + sena + caja;
    
    // Social Benefits (Prestaciones Sociales) - Monthly accrual
    const cesantias = salary * CONTRIBUTION_RATES.CESANTIAS;
    const intereses = cesantias * CONTRIBUTION_RATES.INTERESES_CESANTIAS / 12; // Monthly
    const prima = salary * CONTRIBUTION_RATES.PRIMA;
    const vacaciones = salary * CONTRIBUTION_RATES.VACACIONES;
    const benefits = cesantias + intereses + prima + vacaciones;
    
    const total = salary + socialSecurity + parafiscales + benefits;
    
    return {
      socialSecurity,
      parafiscales,
      benefits,
      total
    };
  }
  
  /**
   * Calculate the impact of a salary increase
   */
  private calculateSalaryIncreaseImpact(
    employeeName: string,
    currentSalary: number,
    increaseAmount: number
  ): SalaryIncreaseBreakdown {
    const newSalary = currentSalary + increaseAmount;
    const increasePercentage = (increaseAmount / currentSalary) * 100;
    
    // Calculate current costs
    const currentCosts = this.calculateEmployerCosts(currentSalary);
    
    // Calculate new costs
    const newCosts = this.calculateEmployerCosts(newSalary);
    
    // Calculate deltas
    const monthlyDelta = newCosts.total - currentCosts.total;
    const annualDelta = monthlyDelta * 12;
    
    return {
      employeeName,
      currentSalary,
      newSalary,
      increaseAmount,
      increasePercentage,
      currentMonthlyCost: currentCosts.total,
      newMonthlyCost: newCosts.total,
      monthlyDelta,
      annualDelta,
      breakdown: {
        socialSecurity: {
          current: currentCosts.socialSecurity,
          new: newCosts.socialSecurity,
          delta: newCosts.socialSecurity - currentCosts.socialSecurity
        },
        parafiscales: {
          current: currentCosts.parafiscales,
          new: newCosts.parafiscales,
          delta: newCosts.parafiscales - currentCosts.parafiscales
        },
        benefits: {
          current: currentCosts.benefits,
          new: newCosts.benefits,
          delta: newCosts.benefits - currentCosts.benefits
        }
      }
    };
  }
  
  /**
   * Build detailed comparison message
   */
  private buildComparisonMessage(breakdown: SalaryIncreaseBreakdown): string {
    const {
      employeeName,
      currentSalary,
      newSalary,
      increaseAmount,
      increasePercentage,
      currentMonthlyCost,
      newMonthlyCost,
      monthlyDelta,
      annualDelta,
      breakdown: costs
    } = breakdown;
    
    // Calculate individual components for detailed breakdown
    const currentHealth = currentSalary * CONTRIBUTION_RATES.HEALTH_EMPLOYER;
    const newHealth = newSalary * CONTRIBUTION_RATES.HEALTH_EMPLOYER;
    const deltaHealth = newHealth - currentHealth;
    
    const currentPension = currentSalary * CONTRIBUTION_RATES.PENSION_EMPLOYER;
    const newPension = newSalary * CONTRIBUTION_RATES.PENSION_EMPLOYER;
    const deltaPension = newPension - currentPension;
    
    const currentArl = currentSalary * CONTRIBUTION_RATES.ARL_MIN;
    const newArl = newSalary * CONTRIBUTION_RATES.ARL_MIN;
    const deltaArl = newArl - currentArl;
    
    const currentCaja = currentSalary * CONTRIBUTION_RATES.CAJA_COMPENSACION;
    const newCaja = newSalary * CONTRIBUTION_RATES.CAJA_COMPENSACION;
    const deltaCaja = newCaja - currentCaja;
    
    const currentIcbf = currentSalary * CONTRIBUTION_RATES.ICBF;
    const newIcbf = newSalary * CONTRIBUTION_RATES.ICBF;
    const deltaIcbf = newIcbf - currentIcbf;
    
    const currentSena = currentSalary * CONTRIBUTION_RATES.SENA;
    const newSena = newSalary * CONTRIBUTION_RATES.SENA;
    const deltaSena = newSena - currentSena;
    
    const currentCesantias = currentSalary * CONTRIBUTION_RATES.CESANTIAS;
    const newCesantias = newSalary * CONTRIBUTION_RATES.CESANTIAS;
    const deltaCesantias = newCesantias - currentCesantias;
    
    const currentIntereses = (currentCesantias * CONTRIBUTION_RATES.INTERESES_CESANTIAS) / 12;
    const newIntereses = (newCesantias * CONTRIBUTION_RATES.INTERESES_CESANTIAS) / 12;
    const deltaIntereses = newIntereses - currentIntereses;
    
    const currentPrima = currentSalary * CONTRIBUTION_RATES.PRIMA;
    const newPrima = newSalary * CONTRIBUTION_RATES.PRIMA;
    const deltaPrima = newPrima - currentPrima;
    
    const currentVacaciones = currentSalary * CONTRIBUTION_RATES.VACACIONES;
    const newVacaciones = newSalary * CONTRIBUTION_RATES.VACACIONES;
    const deltaVacaciones = newVacaciones - currentVacaciones;
    
    const costPercentageIncrease = ((monthlyDelta / currentMonthlyCost) * 100).toFixed(1);
    
    return `📈 **Simulación de Aumento Salarial - ${employeeName}**

---

### 💰 Resumen del Cambio

**Salario Actual:** ${this.formatCurrency(currentSalary)}  
**Nuevo Salario:** ${this.formatCurrency(newSalary)}  
**Incremento:** ${this.formatCurrency(increaseAmount)} (+${increasePercentage.toFixed(1)}%)

---

### 📊 Comparación de Costos Mensuales

| Concepto | Actual | Nuevo | Delta |
|----------|--------|-------|-------|
| **Salario Base** | ${this.formatCurrency(currentSalary)} | ${this.formatCurrency(newSalary)} | +${this.formatCurrency(increaseAmount)} |
| **Seguridad Social** | ${this.formatCurrency(costs.socialSecurity.current)} | ${this.formatCurrency(costs.socialSecurity.new)} | +${this.formatCurrency(costs.socialSecurity.delta)} |
| - Salud (8.5%) | ${this.formatCurrency(currentHealth)} | ${this.formatCurrency(newHealth)} | +${this.formatCurrency(deltaHealth)} |
| - Pensión (12%) | ${this.formatCurrency(currentPension)} | ${this.formatCurrency(newPension)} | +${this.formatCurrency(deltaPension)} |
| - ARL (0.522%) | ${this.formatCurrency(currentArl)} | ${this.formatCurrency(newArl)} | +${this.formatCurrency(deltaArl)} |
| **Parafiscales** | ${this.formatCurrency(costs.parafiscales.current)} | ${this.formatCurrency(costs.parafiscales.new)} | +${this.formatCurrency(costs.parafiscales.delta)} |
| - Caja (4%) | ${this.formatCurrency(currentCaja)} | ${this.formatCurrency(newCaja)} | +${this.formatCurrency(deltaCaja)} |
| - ICBF (3%) | ${this.formatCurrency(currentIcbf)} | ${this.formatCurrency(newIcbf)} | +${this.formatCurrency(deltaIcbf)} |
| - SENA (2%) | ${this.formatCurrency(currentSena)} | ${this.formatCurrency(newSena)} | +${this.formatCurrency(deltaSena)} |
| **Prestaciones** | ${this.formatCurrency(costs.benefits.current)} | ${this.formatCurrency(costs.benefits.new)} | +${this.formatCurrency(costs.benefits.delta)} |
| - Cesantías | ${this.formatCurrency(currentCesantias)} | ${this.formatCurrency(newCesantias)} | +${this.formatCurrency(deltaCesantias)} |
| - Intereses | ${this.formatCurrency(currentIntereses)} | ${this.formatCurrency(newIntereses)} | +${this.formatCurrency(deltaIntereses)} |
| - Prima | ${this.formatCurrency(currentPrima)} | ${this.formatCurrency(newPrima)} | +${this.formatCurrency(deltaPrima)} |
| - Vacaciones | ${this.formatCurrency(currentVacaciones)} | ${this.formatCurrency(newVacaciones)} | +${this.formatCurrency(deltaVacaciones)} |

---

### 💵 Impacto Financiero Total

**💰 Costo Total Mensual**  
- Actual: ${this.formatCurrency(currentMonthlyCost)}  
- Nuevo: ${this.formatCurrency(newMonthlyCost)}  
- **Delta: +${this.formatCurrency(monthlyDelta)}** (+${costPercentageIncrease}%)

**📅 Proyección Anual**  
- Actual: ${this.formatCurrency(currentMonthlyCost * 12)}  
- Nuevo: ${this.formatCurrency(newMonthlyCost * 12)}  
- **Delta Anual: +${this.formatCurrency(annualDelta)}**

---

### ⚠️ Consideraciones Importantes

1. **Proporcionalidad**: El aumento del ${increasePercentage.toFixed(1)}% en salario genera un incremento del ${costPercentageIncrease}% en todos los costos laborales.
2. **IBC (Base de Cotización)**: ${newSalary >= LEGAL_VALUES.SALARIO_MINIMO * 25 
  ? `⚠️ El nuevo salario supera el tope legal de IBC (25 SMMLV = ${this.formatCurrency(LEGAL_VALUES.SALARIO_MINIMO * 25)}). Las cotizaciones se calcularán sobre el máximo legal, no sobre el salario completo.`
  : `✅ Las cotizaciones se calcularán sobre el nuevo salario completo de ${this.formatCurrency(newSalary)}.`}
3. **Auxilio de Transporte**: ${newSalary <= LEGAL_VALUES.SALARIO_MINIMO * 2 ? `✅ Aplica auxilio de transporte (${this.formatCurrency(LEGAL_VALUES.AUXILIO_TRANSPORTE)}/mes)` : '❌ No aplica para este nivel salarial (> 2 SMMLV).'}
4. **Parafiscales**: Calculados asumiendo que la empresa aplica régimen normal.

---

### 📌 Próximos Pasos

- ¿Quieres que **registre este ajuste** en el sistema?
- ¿Necesitas ver el **impacto en prestaciones sociales** acumuladas?
- ¿Deseas **simular otro escenario** con diferente incremento?`;
  }
}
