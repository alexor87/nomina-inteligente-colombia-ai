
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
}

const DEFAULT_CONFIG: PayrollConfiguration = {
  salarioMinimo: 1300000, // 2024
  auxilioTransporte: 200000, // 2025
  uvt: 47065, // 2024
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
  }
};

export class ConfigurationService {
  private static readonly STORAGE_KEY = 'payroll_configuration';

  static getConfiguration(): PayrollConfiguration {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return {
          ...DEFAULT_CONFIG,
          ...config,
          porcentajes: {
            ...DEFAULT_CONFIG.porcentajes,
            ...config.porcentajes
          }
        };
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
    return DEFAULT_CONFIG;
  }

  static updateConfiguration(config: PayrollConfiguration): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw new Error('No se pudo guardar la configuración');
    }
  }

  static resetToDefaults(): PayrollConfiguration {
    localStorage.removeItem(this.STORAGE_KEY);
    return DEFAULT_CONFIG;
  }
}
