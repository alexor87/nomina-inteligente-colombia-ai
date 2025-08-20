
export type IncapacitySubtype = 'general' | 'laboral';

export class IncapacityCalculationService {
  // 🆕 VALORES OFICIALES 2025
  private static readonly SMMLV_2025 = 1423500;
  private static readonly SMLDV_2025 = IncapacityCalculationService.SMMLV_2025 / 30; // $47,450

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

  // 🆕 CÁLCULO SEGÚN POLÍTICA DE EMPRESA (compatible con backend)
  static computeIncapacityValue(
    salary: number, 
    days: number, 
    subtipo?: string, 
    policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor' = 'standard_2d_100_rest_66'
  ): number {
    if (!salary || !days || days <= 0) return 0;

    const dailySalary = Number(salary) / 30;
    const normalizedSubtype = this.normalizeSubtype(subtipo) || 'general';

    console.log('🏥 IncapacityCalculationService.computeIncapacityValue:', {
      salary,
      days,
      subtipo,
      normalizedSubtype,
      policy,
      dailySalary,
      smldv: this.SMLDV_2025
    });

    // Incapacidad laboral: siempre 100% desde día 1 (no depende de política)
    if (normalizedSubtype === 'laboral') {
      const result = Math.round(dailySalary * days);
      console.log('🏥 Laboral result:', result);
      return result;
    }

    // Incapacidad general: aplicar política de empresa
    if (policy === 'from_day1_66_with_floor') {
      // Todos los días al 66.67% con piso SMLDV
      const daily66 = dailySalary * 0.6667;
      const appliedDaily = Math.max(daily66, this.SMLDV_2025);
      const result = Math.round(appliedDaily * days);
      
      console.log('🏥 General from_day1_66_with_floor:', {
        daily66,
        smldv: this.SMLDV_2025,
        appliedDaily,
        result
      });
      
      return result;
    } else {
      // Política estándar: 2 días 100%, resto 66.67% con piso
      if (days <= 2) {
        const result = Math.round(dailySalary * days);
        console.log('🏥 General standard (≤2 days):', result);
        return result;
      } else {
        const first2Days = dailySalary * 2;
        const remainingDays = days - 2;
        const daily66 = dailySalary * 0.6667;
        const appliedDaily = Math.max(daily66, this.SMLDV_2025);
        const result = Math.round(first2Days + (appliedDaily * remainingDays));
        
        console.log('🏥 General standard (>2 days):', {
          first2Days,
          remainingDays,
          daily66,
          smldv: this.SMLDV_2025,
          appliedDaily,
          totalRemaining: appliedDaily * remainingDays,
          result
        });
        
        return result;
      }
    }
  }

  // 🆕 MÉTODO LEGACY PARA COMPATIBILIDAD (usa política estándar por defecto)
  static computeIncapacityValueLegacy(salary: number, days: number, subtipo?: string): number {
    return this.computeIncapacityValue(salary, days, subtipo, 'standard_2d_100_rest_66');
  }

  // 🆕 OBTENER POLÍTICA GUARDADA DE LA EMPRESA (mock para testing)
  static async getCompanyIncapacityPolicy(companyId?: string): Promise<'standard_2d_100_rest_66' | 'from_day1_66_with_floor'> {
    // En producción, esto consultaría la política guardada
    // Por ahora devuelve la política estándar
    return 'standard_2d_100_rest_66';
  }

  // 🆕 CALCULAR VALOR ESPERADO SEGÚN POLÍTICA LEGAL
  static calculateExpectedValueByPolicy(
    salary: number,
    days: number,
    subtipo: string,
    policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor'
  ): { value: number; breakdown: string } {
    const dailySalary = salary / 30;
    const normalizedSubtype = this.normalizeSubtype(subtipo) || 'general';
    
    if (normalizedSubtype === 'laboral') {
      return {
        value: Math.round(dailySalary * days),
        breakdown: `Laboral ARL: ${days} días × $${dailySalary.toLocaleString()} = ${Math.round(dailySalary * days).toLocaleString()}`
      };
    }
    
    if (policy === 'standard_2d_100_rest_66') {
      if (days <= 2) {
        return {
          value: Math.round(dailySalary * days),
          breakdown: `General ≤2 días: ${days} × $${dailySalary.toLocaleString()} = ${Math.round(dailySalary * days).toLocaleString()}`
        };
      } else {
        const first2 = dailySalary * 2;
        const remaining = days - 2;
        const daily66 = dailySalary * 0.6667;
        const applied = Math.max(daily66, this.SMLDV_2025);
        const total = Math.round(first2 + (applied * remaining));
        
        return {
          value: total,
          breakdown: `General estándar: 2d×$${dailySalary.toLocaleString()} + ${remaining}d×máx($${daily66.toLocaleString()}, $${this.SMLDV_2025.toLocaleString()}) = ${total.toLocaleString()}`
        };
      }
    } else {
      const daily66 = dailySalary * 0.6667;
      const applied = Math.max(daily66, this.SMLDV_2025);
      const total = Math.round(applied * days);
      
      return {
        value: total,
        breakdown: `General día 1: ${days}d×máx($${daily66.toLocaleString()}, $${this.SMLDV_2025.toLocaleString()}) = ${total.toLocaleString()}`
      };
    }
  }
}
