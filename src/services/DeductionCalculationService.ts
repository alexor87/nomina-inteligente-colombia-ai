
import { ConfigurationService } from './ConfigurationService';

export interface DeductionCalculationInput {
  salarioBase: number;
  totalDevengado: number;
  auxilioTransporte: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  empleadoId?: string;
  periodoId?: string;
  year?: string;
}

export interface DeductionCalculationResult {
  saludEmpleado: number;
  pensionEmpleado: number;
  fondoSolidaridad: number;
  retencionFuente: number;
  novedadesDeducciones: number;
  totalDeducciones: number;
  ibcSalud: number;
  ibcPension: number;
  detalleCalculo: {
    baseRetencion: number;
    novedadesDetalle: Array<{
      tipo: string;
      valor: number;
      descripcion: string;
    }>;
  };
}

export class DeductionCalculationService {
  static calculateDeductions(
    input: DeductionCalculationInput | number,
    backendResult?: { ibc?: number; healthDeduction?: number; pensionDeduction?: number },
    transportAllowance: number = 0,
    year: string = '2025'
  ): DeductionCalculationResult {
    // Handle legacy single parameter call
    if (typeof input === 'number') {
      const salarioBaseParaIBC = input;
      const config = ConfigurationService.getConfigurationSync(year);
      
      const ibcFinal = backendResult?.ibc || salarioBaseParaIBC;
      
      console.log('🧮 DeductionCalculationService - IBC unificado:', {
        salarioBaseParaIBC,
        backendIBC: backendResult?.ibc,
        ibcFinal,
        backendHealthDeduction: backendResult?.healthDeduction,
        backendPensionDeduction: backendResult?.pensionDeduction
      });

      const saludEmpleado = backendResult?.healthDeduction ?? Math.round(ibcFinal * config.porcentajes.saludEmpleado);
      const pensionEmpleado = backendResult?.pensionDeduction ?? Math.round(ibcFinal * config.porcentajes.pensionEmpleado);

      const totalDeducciones = saludEmpleado + pensionEmpleado;

      console.log('✅ DeductionCalculationService - Resultado final:', {
        ibcUsado: ibcFinal,
        saludEmpleado,
        pensionEmpleado,
        totalDeducciones,
        fuenteDatos: backendResult?.healthDeduction ? 'backend' : 'frontend-fallback'
      });

      return {
        saludEmpleado,
        pensionEmpleado,
        fondoSolidaridad: 0,
        retencionFuente: 0,
        novedadesDeducciones: 0,
        totalDeducciones,
        ibcSalud: ibcFinal,
        ibcPension: ibcFinal,
        detalleCalculo: {
          baseRetencion: 0,
          novedadesDetalle: []
        }
      };
    }

    // Handle new object parameter call
    const config = ConfigurationService.getConfigurationSync(input.year || year);
    
    // Calculate IBC based on salary base
    const ibcFinal = input.salarioBase;
    
    console.log('🧮 DeductionCalculationService - Cálculo con objeto:', {
      salarioBase: input.salarioBase,
      totalDevengado: input.totalDevengado,
      auxilioTransporte: input.auxilioTransporte,
      periodType: input.periodType,
      ibcFinal
    });

    const saludEmpleado = Math.round(ibcFinal * config.porcentajes.saludEmpleado);
    const pensionEmpleado = Math.round(ibcFinal * config.porcentajes.pensionEmpleado);
    
    // Calculate solidarity fund (only for high salaries)
    const fondoSolidaridad = ibcFinal >= (config.salarioMinimo * 4) ? 
      Math.round(ibcFinal * 0.01) : 0;
    
    // Simple withholding tax calculation (simplified)
    const retencionFuente = ibcFinal >= (config.salarioMinimo * 10) ? 
      Math.round(ibcFinal * 0.05) : 0;

    const totalDeducciones = saludEmpleado + pensionEmpleado + fondoSolidaridad + retencionFuente;

    console.log('✅ DeductionCalculationService - Resultado objeto:', {
      ibcUsado: ibcFinal,
      saludEmpleado,
      pensionEmpleado,
      fondoSolidaridad,
      retencionFuente,
      totalDeducciones
    });

    return {
      saludEmpleado,
      pensionEmpleado,
      fondoSolidaridad,
      retencionFuente,
      novedadesDeducciones: 0,
      totalDeducciones,
      ibcSalud: ibcFinal,
      ibcPension: ibcFinal,
      detalleCalculo: {
        baseRetencion: input.totalDevengado - input.auxilioTransporte,
        novedadesDetalle: []
      }
    };
  }

  static calculateEmployerContributions(
    ibc: number, 
    arlRiskLevel: 'I' | 'II' | 'III' | 'IV' | 'V' = 'I',
    year: string = '2025'
  ) {
    const config = ConfigurationService.getConfigurationSync(year);
    
    const salud = Math.round(ibc * config.porcentajes.saludEmpleador);
    const pension = Math.round(ibc * config.porcentajes.pensionEmpleador);
    const arl = Math.round(ibc * (config.arlRiskLevels[arlRiskLevel] / 100));
    const cajaCompensacion = Math.round(ibc * config.porcentajes.cajaCompensacion);
    const icbf = Math.round(ibc * config.porcentajes.icbf);
    const sena = Math.round(ibc * config.porcentajes.sena);

    const total = salud + pension + arl + cajaCompensacion + icbf + sena;

    return {
      salud,
      pension,
      arl,
      cajaCompensacion,
      icbf,
      sena,
      total
    };
  }

  static calculateTransportAllowance(baseSalary: number, year: string = '2025'): number {
    const config = ConfigurationService.getConfigurationSync(year);
    
    const limite2SMMLV = config.salarioMinimo * 2;
    
    console.log('🚌 TransportAllowance calculation:', {
      baseSalary,
      limite2SMMLV,
      auxilioTransporte: config.auxilioTransporte,
      aplica: baseSalary <= limite2SMMLV
    });

    return baseSalary <= limite2SMMLV ? config.auxilioTransporte : 0;
  }

  static calculateProvisions(
    salarioBase: number,
    diasTrabajados: number,
    year: string = '2025'
  ) {
    const config = ConfigurationService.getConfigurationSync(year);
    const salarioProporcionado = (salarioBase / 30) * diasTrabajados;

    const cesantias = Math.round(salarioProporcionado * config.porcentajes.cesantias);
    const interesesCesantias = Math.round(cesantias * config.porcentajes.interesesCesantias / 12);
    const prima = Math.round(salarioProporcionado * config.porcentajes.prima);
    const vacaciones = Math.round(salarioProporcionado * config.porcentajes.vacaciones);

    const total = cesantias + interesesCesantias + prima + vacaciones;

    return {
      cesantias,
      interesesCesantias,
      prima,
      vacaciones,
      total
    };
  }

  // Add missing methods expected by other services
  static validatePeriodDeductions(periodId: string): { isValid: boolean; errors: string[] } {
    // Simplified validation - can be expanded later
    return {
      isValid: true,
      errors: []
    };
  }

  static getConfigurationInfo(year: string = '2025') {
    const config = ConfigurationService.getConfigurationSync(year);
    
    return {
      topeIbc: config.salarioMinimo * 25, // Standard top limit
      porcentajes: {
        saludEmpleado: config.porcentajes.saludEmpleado,
        pensionEmpleado: config.porcentajes.pensionEmpleado
      }
    };
  }
}
