
import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025, FONDO_SOLIDARIDAD_PENSIONAL_2025, CONTRIBUCIONES_SOLIDARIAS_2025, RETENCION_FUENTE_2025 } from '@/constants';

export interface PayrollConfiguration {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  porcentajes: {
    saludEmpleado: number;
    pensionEmpleado: number;
    saludEmpleador: number;
    pensionEmpleador: number;
    arl: number;
    cajaCompensacion: number;
    icbf: number;
    sena: number;
    cesantias: number;
    interesesCesantias: number;
    prima: number;
    vacaciones: number;
  };
  fondoSolidaridad: {
    ranges: Array<{
      minSMMLV: number;
      maxSMMLV: number;
      percentage: number;
    }>;
  };
  arlRiskLevels: {
    I: number;
    II: number;
    III: number;
    IV: number;
    V: number;
  };
}

export interface YearlyConfiguration {
  [year: string]: PayrollConfiguration;
}

const DEFAULT_CONFIG_2025: PayrollConfiguration = {
  salarioMinimo: SALARIO_MINIMO_2025, // ✅ CORREGIDO: 1,423,500
  auxilioTransporte: AUXILIO_TRANSPORTE_2025, // ✅ CORRECTO: 200,000
  uvt: RETENCION_FUENTE_2025.UVT, // ✅ CORRECTO: 47,065
  porcentajes: {
    saludEmpleado: 0.04,
    pensionEmpleado: 0.04,
    saludEmpleador: 0.085,
    pensionEmpleador: 0.12,
    arl: 0.00522,
    cajaCompensacion: 0.04,
    icbf: 0.03,
    sena: 0.02,
    cesantias: 0.0833,
    interesesCesantias: 0.12,
    prima: 0.0833,
    vacaciones: 0.0417,
  },
  fondoSolidaridad: {
    ranges: FONDO_SOLIDARIDAD_PENSIONAL_2025.RANGOS
  },
  arlRiskLevels: {
    I: 0.348,
    II: 0.435,
    III: 0.783,
    IV: 1.740,
    V: 3.219,
  }
};

const DEFAULT_CONFIG_2024: PayrollConfiguration = {
  ...DEFAULT_CONFIG_2025,
  salarioMinimo: 1300000, // ✅ CORREGIDO: Salario mínimo 2024
  auxilioTransporte: 162000,
  uvt: 47065, // ✅ CORRECTO: UVT 2024 oficial
};

const DEFAULT_YEARLY_CONFIG: YearlyConfiguration = {
  '2025': DEFAULT_CONFIG_2025,
  '2024': DEFAULT_CONFIG_2024
};

export class ConfigurationService {
  private static readonly STORAGE_KEY = 'payroll_yearly_configuration';

  static getYearlyConfiguration(): YearlyConfiguration {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        return { ...DEFAULT_YEARLY_CONFIG, ...config };
      }
    } catch (error) {
      console.error('Error loading yearly configuration:', error);
    }
    return DEFAULT_YEARLY_CONFIG;
  }

  static getConfiguration(year: string = '2025'): PayrollConfiguration {
    const yearlyConfig = this.getYearlyConfiguration();
    return yearlyConfig[year] || DEFAULT_CONFIG_2025;
  }

  static updateYearConfiguration(year: string, config: PayrollConfiguration): void {
    try {
      const yearlyConfig = this.getYearlyConfiguration();
      yearlyConfig[year] = config;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(yearlyConfig));
    } catch (error) {
      console.error('Error saving yearly configuration:', error);
      throw new Error('No se pudo guardar la configuración');
    }
  }

  static createNewYear(year: string): PayrollConfiguration {
    const yearlyConfig = this.getYearlyConfiguration();
    
    if (yearlyConfig[year]) {
      throw new Error(`El año ${year} ya existe`);
    }

    // Siempre usar valores por defecto del sistema
    yearlyConfig[year] = { ...DEFAULT_CONFIG_2025 };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(yearlyConfig));
    
    return yearlyConfig[year];
  }

  static deleteYear(year: string): void {
    const yearlyConfig = this.getYearlyConfiguration();
    
    if (Object.keys(yearlyConfig).length <= 1) {
      throw new Error('No se puede eliminar el último año configurado');
    }

    delete yearlyConfig[year];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(yearlyConfig));
  }

  static getAvailableYears(): string[] {
    const yearlyConfig = this.getYearlyConfiguration();
    return Object.keys(yearlyConfig).sort((a, b) => parseInt(b) - parseInt(a));
  }

  // Método de compatibilidad
  static updateConfiguration(config: PayrollConfiguration): void {
    this.updateYearConfiguration('2025', config);
  }

  static resetToDefaults(): YearlyConfiguration {
    localStorage.removeItem(this.STORAGE_KEY);
    return DEFAULT_YEARLY_CONFIG;
  }
}
