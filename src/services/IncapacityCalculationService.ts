
/**
 * ✅ SERVICIO ACTUALIZADO: Cálculo de incapacidades con piso SMLDV normativo
 * Alineado con la normativa colombiana y el backend
 */

import { ConfigurationService } from './ConfigurationService';

export type IncapacitySubtype = 'general' | 'laboral';

export class IncapacityCalculationService {
  static normalizeSubtype(subtipo?: string): IncapacitySubtype | undefined {
    if (!subtipo) return undefined;
    const s = subtipo.toLowerCase().trim();

    if (['comun', 'común', 'enfermedad_general', 'eg', 'general'].includes(s)) {
      return 'general';
    }
    if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) {
      return 'laboral';
    }
    return undefined;
  }

  /**
   * ✅ ACTUALIZADO: Cálculo con piso SMLDV para política estándar
   */
  static computeIncapacityValue(
    salary: number, 
    days: number, 
    subtipo?: string,
    policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor' = 'standard_2d_100_rest_66',
    year: string = '2025'
  ): number {
    if (!salary || !days || days <= 0) return 0;

    const config = ConfigurationService.getConfigurationSync(year);
    const dailySalary = Number(salary) / 30;
    const smldv = config.salarioMinimo / 30; // SMLDV = Salario Mínimo Legal Diario Vigente
    const s = this.normalizeSubtype(subtipo) || 'general';

    console.log('🏥 Calculando incapacidad:', {
      salary,
      days,
      subtipo: s,
      policy,
      dailySalary,
      smldv
    });

    if (s === 'laboral') {
      // ARL paga 100% desde el día 1 - sin cambios
      const value = Math.round(dailySalary * days);
      console.log('🏥 Incapacidad laboral (ARL 100%):', value);
      return value;
    }

    // Incapacidad general según política seleccionada
    if (policy === 'from_day1_66_with_floor') {
      // ✅ POLÍTICA ALTERNATIVA: Todos los días al 66.67% con piso SMLDV
      const dailyValue66 = dailySalary * 0.6667;
      const dailyValueWithFloor = Math.max(dailyValue66, smldv);
      const value = Math.round(dailyValueWithFloor * days);
      
      console.log('🏥 Incapacidad desde día 1 con piso SMLDV:', {
        dailyValue66: dailyValue66.toLocaleString(),
        dailyValueWithFloor: dailyValueWithFloor.toLocaleString(),
        totalValue: value.toLocaleString()
      });
      
      return value;
    }

    // ✅ POLÍTICA ESTÁNDAR CON PISO SMLDV: Días 1-2 al 100%, días 3+ al 66.67% con piso SMLDV
    if (days <= 2) {
      const value = Math.round(dailySalary * days);
      console.log('🏥 Incapacidad estándar ≤2 días (100% empleador):', value);
      return value;
    } else {
      // Días 1-2 al 100% (pagado por empleador)
      const first2Days = dailySalary * 2;
      
      // Días 3+ al 66.67% con piso SMLDV (pagado por EPS)
      const dailyValue66 = dailySalary * 0.6667;
      const dailyValueWithFloor = Math.max(dailyValue66, smldv);
      const remainingDaysValue = dailyValueWithFloor * (days - 2);
      
      const value = Math.round(first2Days + remainingDaysValue);
      
      console.log('🏥 Incapacidad estándar con piso SMLDV:', {
        first2Days: first2Days.toLocaleString(),
        remainingDays: days - 2,
        dailyValue66: dailyValue66.toLocaleString(),
        dailyValueWithFloor: dailyValueWithFloor.toLocaleString(),
        remainingDaysValue: remainingDaysValue.toLocaleString(),
        totalValue: value.toLocaleString(),
        appliedFloor: dailyValue66 < smldv
      });
      
      return value;
    }
  }

  /**
   * ✅ NUEVO: Obtener detalle del cálculo de incapacidad
   */
  static getIncapacityCalculationDetail(
    salary: number, 
    days: number, 
    subtipo?: string,
    policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor' = 'standard_2d_100_rest_66',
    year: string = '2025'
  ): {
    value: number;
    detail: string;
    breakdown: Array<{
      days: number;
      dailyRate: number;
      percentage: string;
      payer: string;
      amount: number;
    }>;
  } {
    if (!salary || !days || days <= 0) {
      return {
        value: 0,
        detail: 'Datos inválidos',
        breakdown: []
      };
    }

    const config = ConfigurationService.getConfigurationSync(year);
    const dailySalary = Number(salary) / 30;
    const smldv = config.salarioMinimo / 30;
    const s = this.normalizeSubtype(subtipo) || 'general';
    const breakdown: Array<{
      days: number;
      dailyRate: number;
      percentage: string;
      payer: string;
      amount: number;
    }> = [];

    if (s === 'laboral') {
      const value = Math.round(dailySalary * days);
      breakdown.push({
        days,
        dailyRate: dailySalary,
        percentage: '100%',
        payer: 'ARL',
        amount: value
      });
      
      return {
        value,
        detail: `${days} días × $${dailySalary.toLocaleString()} (100% ARL desde día 1) = $${value.toLocaleString()}`,
        breakdown
      };
    }

    if (policy === 'from_day1_66_with_floor') {
      const dailyValue66 = dailySalary * 0.6667;
      const dailyValueWithFloor = Math.max(dailyValue66, smldv);
      const value = Math.round(dailyValueWithFloor * days);
      
      breakdown.push({
        days,
        dailyRate: dailyValueWithFloor,
        percentage: dailyValue66 < smldv ? '66.67% con piso SMLDV' : '66.67%',
        payer: 'EPS',
        amount: value
      });

      return {
        value,
        detail: `${days} días × $${dailyValueWithFloor.toLocaleString()} (66.67%${dailyValue66 < smldv ? ' con piso SMLDV' : ''}) = $${value.toLocaleString()}`,
        breakdown
      };
    }

    // Política estándar
    if (days <= 2) {
      const value = Math.round(dailySalary * days);
      breakdown.push({
        days,
        dailyRate: dailySalary,
        percentage: '100%',
        payer: 'Empleador',
        amount: value
      });

      return {
        value,
        detail: `${days} días × $${dailySalary.toLocaleString()} (100% empleador) = $${value.toLocaleString()}`,
        breakdown
      };
    } else {
      const first2Days = dailySalary * 2;
      const dailyValue66 = dailySalary * 0.6667;
      const dailyValueWithFloor = Math.max(dailyValue66, smldv);
      const remainingDaysValue = dailyValueWithFloor * (days - 2);
      const value = Math.round(first2Days + remainingDaysValue);

      breakdown.push({
        days: 2,
        dailyRate: dailySalary,
        percentage: '100%',
        payer: 'Empleador',
        amount: Math.round(first2Days)
      });

      breakdown.push({
        days: days - 2,
        dailyRate: dailyValueWithFloor,
        percentage: dailyValue66 < smldv ? '66.67% con piso SMLDV' : '66.67%',
        payer: 'EPS',
        amount: Math.round(remainingDaysValue)
      });

      const floorApplied = dailyValue66 < smldv;
      return {
        value,
        detail: `2 días × $${dailySalary.toLocaleString()} (100% empleador) + ${days - 2} días × $${dailyValueWithFloor.toLocaleString()} (66.67%${floorApplied ? ' con piso SMLDV' : ''} EPS) = $${value.toLocaleString()}`,
        breakdown
      };
    }
  }
}
