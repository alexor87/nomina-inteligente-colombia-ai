
import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025, RETENCION_FUENTE_2025, FONDO_SOLIDARIDAD_PENSIONAL_2025, PORCENTAJES_NOMINA } from '@/constants';

export interface YearConfiguration {
  salarioMinimo: number;
  auxilioTransporte: number;
  uvt: number;
  year: string;
  // ✅ AGREGADO: Properties that other files expect
  arlRiskLevels: {
    I: number;
    II: number;
    III: number;
    IV: number;
    V: number;
  };
  fondoSolidaridad: {
    ranges: Array<{
      minSMMLV: number;
      maxSMMLV: number;
      percentage: number;
    }>;
  };
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

// ✅ AGREGADO: Export PayrollConfiguration as alias for backward compatibility
export type PayrollConfiguration = YearConfiguration;

export class ConfigurationService {
  private static configurations: Record<string, YearConfiguration> = {
    '2025': {
      salarioMinimo: SALARIO_MINIMO_2025,
      auxilioTransporte: AUXILIO_TRANSPORTE_2025,
      uvt: RETENCION_FUENTE_2025.UVT,
      year: '2025',
      arlRiskLevels: {
        I: 0.522,
        II: 1.044,
        III: 2.436,
        IV: 4.350,
        V: 6.960
      },
      fondoSolidaridad: {
        ranges: FONDO_SOLIDARIDAD_PENSIONAL_2025.RANGOS
      },
      porcentajes: {
        saludEmpleado: PORCENTAJES_NOMINA.SALUD_EMPLEADO,
        pensionEmpleado: PORCENTAJES_NOMINA.PENSION_EMPLEADO,
        saludEmpleador: PORCENTAJES_NOMINA.SALUD_EMPLEADOR,
        pensionEmpleador: PORCENTAJES_NOMINA.PENSION_EMPLEADOR,
        arl: PORCENTAJES_NOMINA.ARL,
        cajaCompensacion: PORCENTAJES_NOMINA.CAJA_COMPENSACION,
        icbf: PORCENTAJES_NOMINA.ICBF,
        sena: PORCENTAJES_NOMINA.SENA,
        cesantias: PORCENTAJES_NOMINA.CESANTIAS,
        interesesCesantias: PORCENTAJES_NOMINA.INTERESES_CESANTIAS,
        prima: PORCENTAJES_NOMINA.PRIMA,
        vacaciones: PORCENTAJES_NOMINA.VACACIONES
      }
    },
    '2024': {
      salarioMinimo: 1300000, // Historical value for 2024
      auxilioTransporte: 162000, // Historical value for 2024
      uvt: 47065, // Historical value for 2024
      year: '2024',
      arlRiskLevels: {
        I: 0.522,
        II: 1.044,
        III: 2.436,
        IV: 4.350,
        V: 6.960
      },
      fondoSolidaridad: {
        ranges: [
          { minSMMLV: 4, maxSMMLV: 16, percentage: 0.01 },
          { minSMMLV: 16, maxSMMLV: 17, percentage: 0.012 },
          { minSMMLV: 17, maxSMMLV: 18, percentage: 0.014 },
          { minSMMLV: 18, maxSMMLV: 19, percentage: 0.016 },
          { minSMMLV: 19, maxSMMLV: 20, percentage: 0.018 },
          { minSMMLV: 20, maxSMMLV: 999, percentage: 0.02 }
        ]
      },
      porcentajes: {
        saludEmpleado: PORCENTAJES_NOMINA.SALUD_EMPLEADO,
        pensionEmpleado: PORCENTAJES_NOMINA.PENSION_EMPLEADO,
        saludEmpleador: PORCENTAJES_NOMINA.SALUD_EMPLEADOR,
        pensionEmpleador: PORCENTAJES_NOMINA.PENSION_EMPLEADOR,
        arl: PORCENTAJES_NOMINA.ARL,
        cajaCompensacion: PORCENTAJES_NOMINA.CAJA_COMPENSACION,
        icbf: PORCENTAJES_NOMINA.ICBF,
        sena: PORCENTAJES_NOMINA.SENA,
        cesantias: PORCENTAJES_NOMINA.CESANTIAS,
        interesesCesantias: PORCENTAJES_NOMINA.INTERESES_CESANTIAS,
        prima: PORCENTAJES_NOMINA.PRIMA,
        vacaciones: PORCENTAJES_NOMINA.VACACIONES
      }
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

  // ✅ AGREGADO: Methods that other files expect
  static getAvailableYears(): string[] {
    return this.getAllYears();
  }

  static createNewYear(year: string, baseYear: string = '2025'): YearConfiguration {
    const baseConfig = this.getConfiguration(baseYear);
    const newConfig = {
      ...baseConfig,
      year: year
    };
    this.configurations[year] = newConfig;
    return newConfig;
  }
}
