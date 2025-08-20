
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

  static computeIncapacityValue(salary: number, days: number, subtipo?: string, year: string = '2025'): number {
    if (!salary || !days || days <= 0) return 0;

    const dailySalary = Number(salary) / 30;
    const s = this.normalizeSubtype(subtipo) || 'general';
    const config = ConfigurationService.getConfiguration(year);

    if (s === 'laboral') {
      // ARL 100% desde el día 1
      return Math.round(dailySalary * days);
    }

    // General: días 1-2 al 100%, 3+ al 66.67% con piso SMLDV
    if (days <= 2) {
      return Math.round(dailySalary * days);
    } else {
      const smldv = config.salarioMinimo / 30; // Usar configuración actual
      const first2 = dailySalary * 2;
      const dailyRest = Math.max(dailySalary * 0.6667, smldv);
      const rest = dailyRest * (days - 2);
      return Math.round(first2 + rest);
    }
  }
}
