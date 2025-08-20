
import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025, RETENCION_FUENTE_2025 } from '@/constants';

export interface YearConfiguration {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  year: string;
}

export class ConfigurationService {
  private static configurations: Record<string, YearConfiguration> = {
    '2025': {
      salarioMinimo: SALARIO_MINIMO_2025,
      auxilioTransporte: AUXILIO_TRANSPORTE_2025,
      uvt: RETENCION_FUENTE_2025.UVT,
      year: '2025'
    },
    '2024': {
      salarioMinimo: 1300000, // Historical value for 2024
      auxilioTransporte: 162000, // Historical value for 2024
      uvt: 47065, // Historical value for 2024
      year: '2024'
    }
  };

  static getConfiguration(year: string = '2025'): YearConfiguration {
    const config = this.configurations[year];
    if (!config) {
      console.warn(`Configuration for year ${year} not found, using 2025 defaults`);
      return this.configurations['2025'];
    }
    return config;
  }

  static getConfigurationSync(year: string = '2025'): YearConfiguration {
    return this.getConfiguration(year);
  }

  static getCurrentConfiguration(): YearConfiguration {
    return this.getConfiguration('2025');
  }

  static getAllYears(): string[] {
    return Object.keys(this.configurations);
  }
}
