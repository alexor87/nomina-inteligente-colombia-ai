/**
 * Servicio de cálculo de deducciones según normativa colombiana
 * ACTUALIZADO 2025: Con deducciones de ley completas y fallback local robusto
 */

import { supabase } from '@/integrations/supabase/client';
import { ConfigurationService } from '@/services/ConfigurationService';
import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025, FONDO_SOLIDARIDAD_PENSIONAL_2025, CONTRIBUCIONES_SOLIDARIAS_2025, RETENCION_FUENTE_2025 } from '@/constants';

export interface DeductionInput {
  salarioBase: number;
  totalDevengado: number;
  auxilioTransporte: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  empleadoId?: string;
  periodoId?: string;
  year?: string; // ✅ NUEVO: Año para configuración dinámica
}

export interface DeductionResult {
  ibcSalud: number;
  ibcPension: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  fondoSolidaridad: number;
  contribucionSolidariaAdicional: number;
  fondoSubsistencia: number;
  retencionFuente: number;
  novedadesDeducciones: number;
  totalDeducciones: number;
  detalleCalculo: {
    baseIbc: number;
    topeIbc: number;
    baseRetencion: number;
    uvtAplicable: number;
    smmlvMultiple: number;
    fondoSolidaridadRate: number;
    contribucionSolidariaRate: number;
    fondoSubsistenciaRate: number;
    novedadesDetalle: Array<{
      tipo: string;
      valor: number;
      descripcion: string;
    }>;
  };
}

export class DeductionCalculationService {
  private static async getNovedadesDeducciones(empleadoId: string, periodoId: string): Promise<{
    total: number;
    detalle: Array<{ tipo: string; valor: number; descripcion: string }>;
  }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId || !empleadoId || !periodoId) {
        return { total: 0, detalle: [] };
      }

      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('tipo_novedad, valor, observacion')
        .eq('company_id', companyId)
        .eq('empleado_id', empleadoId)
        .eq('periodo_id', periodoId);

      if (error) {
        console.error('Error loading novedades for deductions:', error);
        return { total: 0, detalle: [] };
      }

      const tiposDeducciones = [
        'libranza', 'multa', 'ausencia', 'descuento_voluntario', 
        'retencion_fuente', 'deduccion_especial', 'salud', 'pension', 
        'arl', 'caja_compensacion', 'icbf', 'sena'
      ];

      const novedadesDeducciones = (novedades || []).filter(novedad => 
        tiposDeducciones.includes(novedad.tipo_novedad)
      );

      const total = novedadesDeducciones.reduce((sum, novedad) => sum + Number(novedad.valor || 0), 0);
      
      const detalle = novedadesDeducciones.map(novedad => ({
        tipo: novedad.tipo_novedad,
        valor: Number(novedad.valor || 0),
        descripcion: novedad.observacion || this.getNovedadDescription(novedad.tipo_novedad)
      }));

      return { total, detalle };
    } catch (error) {
      console.error('Error calculating novedades deducciones:', error);
      return { total: 0, detalle: [] };
    }
  }

  private static getNovedadDescription(tipo: string): string {
    const descriptions: Record<string, string> = {
      libranza: 'Libranza',
      multa: 'Multa',
      ausencia: 'Ausencia',
      descuento_voluntario: 'Descuento Voluntario',
      retencion_fuente: 'Retención en la Fuente',
      deduccion_especial: 'Deducción Especial',
      salud: 'Salud',
      pension: 'Pensión',
      arl: 'ARL',
      caja_compensacion: 'Caja de Compensación',
      icbf: 'ICBF',
      sena: 'SENA'
    };
    return descriptions[tipo] || tipo;
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) return null;
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  /**
   * ✅ ACTUALIZADO: Cálculo de Fondo de Solidaridad Pensional con año dinámico
   */
  private static calculateFondoSolidaridad(salarioBase: number, year: string = '2025'): {
    valor: number;
    rate: number;
    smmlvMultiple: number;
  } {
    const config = ConfigurationService.getConfigurationSync(year);
    const smmlvMultiple = salarioBase / config.salarioMinimo;
    
    // Solo aplica para salarios >= 4 SMMLV
    if (smmlvMultiple < 4) {
      return { valor: 0, rate: 0, smmlvMultiple };
    }

    const rango = config.fondoSolidaridad.ranges.find(r => 
      smmlvMultiple >= r.minSMMLV && smmlvMultiple < r.maxSMMLV
    );

    if (!rango) {
      return { valor: 0, rate: 0, smmlvMultiple };
    }

    const valor = salarioBase * rango.percentage;
    return { valor, rate: rango.percentage, smmlvMultiple };
  }

  /**
   * ✅ ACTUALIZADO: Cálculo de Contribuciones Solidarias con año dinámico
   */
  private static calculateContribucionesSolidarias(salarioBase: number, year: string = '2025'): {
    contribucionSolidariaAdicional: number;
    fondoSubsistencia: number;
    contribucionSolidariaRate: number;
    fondoSubsistenciaRate: number;
  } {
    const config = ConfigurationService.getConfiguration(year);
    const smmlvMultiple = salarioBase / config.salarioMinimo;
    
    let contribucionSolidariaAdicional = 0;
    let fondoSubsistencia = 0;
    let contribucionSolidariaRate = 0;
    let fondoSubsistenciaRate = 0;

    // Obtener configuraciones dinámicas según el año
    const contribucionesSolidarias = year === '2024' ? null : config.porcentajes; // 2024 no tiene estas contribuciones
    
    // Contribución Solidaria Adicional (≥ 16 SMMLV) - Solo desde 2025
    if (contribucionesSolidarias && smmlvMultiple >= 16) {
      contribucionSolidariaRate = 0.01; // 1% para salarios >= 16 SMMLV
      contribucionSolidariaAdicional = salarioBase * contribucionSolidariaRate;
    }

    // Fondo de Subsistencia (≥ 20 SMMLV) - Solo desde 2025
    if (contribucionesSolidarias && smmlvMultiple >= 20) {
      fondoSubsistenciaRate = 0.01; // 1% para salarios >= 20 SMMLV
      fondoSubsistencia = salarioBase * fondoSubsistenciaRate;
    }

    return {
      contribucionSolidariaAdicional,
      fondoSubsistencia,
      contribucionSolidariaRate,
      fondoSubsistenciaRate
    };
  }

  /**
   * ✅ ACTUALIZADO: Cálculo mejorado de Retención en la Fuente con año dinámico
   */
  private static calculateRetencionFuente(baseRetencion: number, year: string = '2025'): number {
    const config = ConfigurationService.getConfiguration(year);
    const uvtValue = config.uvt;
    const baseUVT = baseRetencion / uvtValue;
    
    // Para 2024, usar tabla simplificada
    if (year === '2024') {
      // Tabla simplificada 2024
      if (baseUVT < 95) return 0;
      if (baseUVT < 150) return (baseUVT - 95) * 0.19 * uvtValue;
      if (baseUVT < 360) return ((55 * 0.19) + ((baseUVT - 150) * 0.28)) * uvtValue;
      return ((55 * 0.19) + (210 * 0.28) + ((baseUVT - 360) * 0.33)) * uvtValue;
    }

    // Para 2025 y posteriores, usar tabla detallada
    const tablasRetencion = {
      '2025': [
        { minUVT: 0, maxUVT: 95, baseUVT: 0, percentage: 0 },
        { minUVT: 95, maxUVT: 150, baseUVT: 95, percentage: 0.19 },
        { minUVT: 150, maxUVT: 360, baseUVT: 150, percentage: 0.28 },
        { minUVT: 360, maxUVT: Infinity, baseUVT: 360, percentage: 0.33 }
      ]
    };

    const tablaActual = tablasRetencion[year] || tablasRetencion['2025'];
    const rango = tablaActual.find(r => baseUVT >= r.minUVT && baseUVT < r.maxUVT);

    if (!rango || rango.percentage === 0) {
      return 0;
    }

    // Calcular retención según la tabla
    const exceso = baseUVT - rango.baseUVT;
    const retencionUVT = exceso * rango.percentage;
    const retencionPesos = retencionUVT * uvtValue;

    return Math.max(0, retencionPesos);
  }

  /**
   * ✅ ACTUALIZADO: Cálculo completo de deducciones con año dinámico
   */
  private static calculateLocalDeductions(input: DeductionInput): {
    healthDeduction: number;
    pensionDeduction: number;
    fondoSolidaridad: number;
    contribucionSolidariaAdicional: number;
    fondoSubsistencia: number;
    retencionFuente: number;
    smmlvMultiple: number;
    rates: {
      fondoSolidaridad: number;
      contribucionSolidaria: number;
      fondoSubsistencia: number;
    };
  } {
    // ✅ CORRECCIÓN NORMATIVA: IBC se calcula sobre salario base, no sobre devengado
    // El auxilio de transporte NO hace parte del IBC según normativa colombiana
    const year = input.year || '2025';
    const config = ConfigurationService.getConfigurationSync(year);
    const baseIbc = Math.max(input.salarioBase, config.salarioMinimo); // Mínimo 1 SMMLV
    const topeIbc = config.salarioMinimo * 25; // Máximo 25 SMMLV
    
    // Aplicar topes IBC según normativa
    const ibcAplicable = Math.min(baseIbc, topeIbc);
    
    console.log('📐 [FALLBACK] Cálculo IBC normativo:', {
      salarioBase: input.salarioBase,
      baseIbc: baseIbc,
      ibcAplicable: ibcAplicable,
      periodType: input.periodType
    });
    
    // Cálculos básicos según normativa colombiana 2025
    const healthDeduction = Math.max(0, ibcAplicable * 0.04); // 4% salud
    const pensionDeduction = Math.max(0, ibcAplicable * 0.04); // 4% pensión
    
    // ✅ ACTUALIZADO: Fondo de Solidaridad Pensional con año dinámico
    const fondoSolidaridadResult = this.calculateFondoSolidaridad(input.salarioBase, year);
    
    // ✅ ACTUALIZADO: Contribuciones Solidarias con año dinámico
    const contribucionesSolidarias = this.calculateContribucionesSolidarias(input.salarioBase, year);
    
    // ✅ ACTUALIZADO: Retención en la fuente mejorada con año dinámico
    const baseRetencion = input.totalDevengado - healthDeduction - pensionDeduction - fondoSolidaridadResult.valor;
    const retencionFuente = this.calculateRetencionFuente(baseRetencion, year);
    
    return {
      healthDeduction,
      pensionDeduction,
      fondoSolidaridad: fondoSolidaridadResult.valor,
      contribucionSolidariaAdicional: contribucionesSolidarias.contribucionSolidariaAdicional,
      fondoSubsistencia: contribucionesSolidarias.fondoSubsistencia,
      retencionFuente,
      smmlvMultiple: fondoSolidaridadResult.smmlvMultiple,
      rates: {
        fondoSolidaridad: fondoSolidaridadResult.rate,
        contribucionSolidaria: contribucionesSolidarias.contribucionSolidariaRate,
        fondoSubsistencia: contribucionesSolidarias.fondoSubsistenciaRate
      }
    };
  }

  // ✅ MÉTODO PRINCIPAL: Con deducciones de ley completas y año dinámico
  static async calculateDeductions(input: DeductionInput): Promise<DeductionResult> {
    // ✅ CORRECCIÓN NORMATIVA: Calcular salario base proporcional para IBC según período
    const year = input.year || '2025';
    const config = ConfigurationService.getConfiguration(year);
    
    const salarioBaseParaIBC = input.periodType === 'quincenal' 
      ? input.salarioBase / 2
      : input.periodType === 'semanal'
      ? input.salarioBase / 4
      : input.salarioBase;

    console.log('🔧 [DEDUCTION SERVICE] CÁLCULO NORMATIVO IBC 2025:', {
      salarioBaseOriginal: input.salarioBase,
      salarioBaseParaIBC,
      periodType: input.periodType,
      totalDevengado: input.totalDevengado,
      auxilioTransporte: input.auxilioTransporte
    });
    
    let backendResult: any = null;
    let usedFallback = false;
    
    try {
      console.log('🌐 Enviando al backend con salario IBC correcto:', salarioBaseParaIBC);
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate',
          data: {
            baseSalary: input.salarioBase,
            salarioBaseParaIBC: salarioBaseParaIBC,
            workedDays: input.periodType === 'quincenal' ? 15 : 30,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: input.periodType
          }
        }
      });

      if (error) {
        console.warn('⚠️ Backend error, usando fallback:', error);
        throw new Error('Backend no disponible');
      }

      if (!data?.success) {
        console.warn('⚠️ Backend falló, usando fallback:', data?.error);
        throw new Error('Backend calculation failed');
      }

      backendResult = data.data;
      console.log('✅ Backend exitoso:', backendResult);

    } catch (error) {
      console.warn('⚠️ Error en backend, activando fallback local:', error);
      usedFallback = true;

      // ✅ Fallback local: sumar incapacidades al salario proporcional para IBC de salud/pensión
      let incapacidadSum = 0;
      if (input.empleadoId && input.periodoId) {
        try {
          const companyId = await this.getCurrentUserCompanyId();
          if (companyId) {
            const { data: incaps, error: incError } = await supabase
              .from('payroll_novedades')
              .select('tipo_novedad, valor')
              .eq('company_id', companyId)
              .eq('empleado_id', input.empleadoId)
              .eq('periodo_id', input.periodoId)
              .eq('tipo_novedad', 'incapacidad');

            if (!incError && incaps) {
              incapacidadSum = incaps.reduce((sum, n) => sum + Number(n.valor || 0), 0);
            }
          }
        } catch (e) {
          console.warn('⚠️ No se pudo cargar incapacidades para fallback, se asume 0', e);
        }
      }

      const salarioParaIbcConIncap = salarioBaseParaIBC + incapacidadSum;
      console.log('🔄 Fallback local con IBC + incapacidades:', {
        salarioBaseParaIBC,
        incapacidadSum,
        salarioParaIbcConIncap
      });

      // Usar fallback local con base incrementada por incapacidades
      const inputCorregido = { ...input, salarioBase: salarioParaIbcConIncap, year: year };
      backendResult = this.calculateLocalDeductions(inputCorregido);
      console.log('🔄 Resultado fallback local:', backendResult);
    }

    // 2. Obtener novedades de deducciones específicas
    let novedadesDeducciones = 0;
    let novedadesDetalle: Array<{ tipo: string; valor: number; descripcion: string }> = [];
    
    if (input.empleadoId && input.periodoId) {
      const novedadesResult = await this.getNovedadesDeducciones(input.empleadoId, input.periodoId);
      novedadesDeducciones = novedadesResult.total;
      novedadesDetalle = novedadesResult.detalle;
    }

    const totalDeducciones = backendResult.healthDeduction + 
                            backendResult.pensionDeduction + 
                            (backendResult.fondoSolidaridad || 0) +
                            (backendResult.contribucionSolidariaAdicional || 0) +
                            (backendResult.fondoSubsistencia || 0) +
                            (backendResult.retencionFuente || 0) +
                            (novedadesDeducciones || 0);

    console.log('📊 RESULTADO FINAL CON DEDUCCIONES COMPLETAS:', {
      metodo: usedFallback ? 'FALLBACK LOCAL' : 'BACKEND',
      año: year,
      salarioBase: input.salarioBase,
      smmlvMultiple: backendResult.smmlvMultiple || (input.salarioBase / config.salarioMinimo),
      totalDevengado: input.totalDevengado,
      totalDeducciones,
      netoPagar: input.totalDevengado - totalDeducciones
    });

    const ibcFinal = salarioBaseParaIBC; // mantenemos el ibcFinal mostrado como proporcional del salario

    return {
      ibcSalud: ibcFinal,
      ibcPension: ibcFinal,
      saludEmpleado: backendResult.healthDeduction,
      pensionEmpleado: backendResult.pensionDeduction,
      fondoSolidaridad: backendResult.fondoSolidaridad || 0,
      contribucionSolidariaAdicional: backendResult.contribucionSolidariaAdicional || 0,
      fondoSubsistencia: backendResult.fondoSubsistencia || 0,
      retencionFuente: backendResult.retencionFuente || 0,
      novedadesDeducciones,
      totalDeducciones,
      detalleCalculo: {
        baseIbc: ibcFinal,
        topeIbc: config.salarioMinimo * 25,
        baseRetencion: input.totalDevengado - backendResult.healthDeduction - backendResult.pensionDeduction,
        uvtAplicable: config.uvt,
        smmlvMultiple: salarioBaseParaIBC / config.salarioMinimo,
        fondoSolidaridadRate: backendResult.rates?.fondoSolidaridad || 0,
        contribucionSolidariaRate: backendResult.rates?.contribucionSolidaria || 0,
        fondoSubsistenciaRate: backendResult.rates?.fondoSubsistencia || 0,
        novedadesDetalle
      }
    };
  }

  static async calculateBatchDeductions(inputs: DeductionInput[]): Promise<DeductionResult[]> {
    const results = await Promise.all(
      inputs.map(input => this.calculateDeductions(input))
    );
    return results;
  }

  static getConfigurationInfo(year: string = '2025'): {
    salarioMinimo: number;
    uvt: number;
    porcentajes: {
      saludEmpleado: number;
      pensionEmpleado: number;
    };
    topeIbc: number;
    fondoSolidaridad: {
      ranges: Array<{
        minSMMLV: number;
        maxSMMLV: number;
        percentage: number;
      }>;
    };
    contribucionesSolidarias?: {
      contribucionSolidariaAdicional: {
        minSMMLV: number;
        percentage: number;
      };
      fondoSubsistencia: {
        minSMMLV: number;
        percentage: number;
      };
    };
  } {
    const config = ConfigurationService.getConfiguration(year);
    
    const result: any = {
      salarioMinimo: config.salarioMinimo,
      uvt: config.uvt,
      porcentajes: {
        saludEmpleado: config.porcentajes.saludEmpleado,
        pensionEmpleado: config.porcentajes.pensionEmpleado
      },
      topeIbc: config.salarioMinimo * 25,
      fondoSolidaridad: {
        ranges: config.fondoSolidaridad.ranges
      }
    };

    // Solo incluir contribuciones solidarias desde 2025
    if (year !== '2024') {
      result.contribucionesSolidarias = {
        contribucionSolidariaAdicional: {
          minSMMLV: 16,
          percentage: 0.01
        },
        fondoSubsistencia: {
          minSMMLV: 20,
          percentage: 0.01
        }
      };
    }

    return result;
  }

  static async validatePeriodDeductions(periodId: string): Promise<{
    hasIssues: boolean;
    issueCount: number;
    totalEmployees: number;
    message: string;
  }> {
    try {
      const { data: payrolls, error } = await supabase
        .from('payrolls')
        .select('id, total_deducciones, employee_id')
        .eq('period_id', periodId);

      if (error) throw error;

      const totalEmployees = payrolls?.length || 0;
      const issueCount = payrolls?.filter(p => !p.total_deducciones || p.total_deducciones === 0).length || 0;
      
      return {
        hasIssues: issueCount > 0,
        issueCount,
        totalEmployees,
        message: issueCount > 0 
          ? `${issueCount} de ${totalEmployees} empleados tienen deducciones en $0`
          : `Todas las deducciones están correctas`
      };
    } catch (error) {
      console.error('Error validating period deductions:', error);
      return {
        hasIssues: true,
        issueCount: -1,
        totalEmployees: 0,
        message: 'Error al validar deducciones'
      };
    }
  }
}
