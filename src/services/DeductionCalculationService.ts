
import { ConfigurationService } from './ConfigurationService';

export class DeductionCalculationService {
  static calculateDeductions(
    salarioBaseParaIBC: number,
    backendResult?: { ibc?: number; healthDeduction?: number; pensionDeduction?: number },
    transportAllowance: number = 0,
    year: string = '2025'
  ) {
    const config = ConfigurationService.getConfigurationSync(year);
    
    // ✅ IBC UNIFICADO: Usar el IBC calculado por el backend si está disponible
    const ibcFinal = backendResult?.ibc || salarioBaseParaIBC;
    
    console.log('🧮 DeductionCalculationService - IBC unificado:', {
      salarioBaseParaIBC,
      backendIBC: backendResult?.ibc,
      ibcFinal,
      backendHealthDeduction: backendResult?.healthDeduction,
      backendPensionDeduction: backendResult?.pensionDeduction
    });

    // ✅ USAR DEDUCCIONES DEL BACKEND si están disponibles (más precisas)
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
      salud: saludEmpleado,
      pension: pensionEmpleado,
      total: totalDeducciones,
      // ✅ EXPONER IBC USADO PARA CONSISTENCIA EN UI
      ibc: ibcFinal
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
    
    // ✅ LÍMITE CORREGIDO: 2 SMMLV (no solo 2 salarios mínimos)
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
}
