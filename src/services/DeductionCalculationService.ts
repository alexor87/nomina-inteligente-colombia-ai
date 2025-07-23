/**
 * Servicio de cálculo de deducciones según normativa colombiana
 * ACTUALIZADO 2025: Con deducciones de ley completas y fallback local robusto
 */

import { supabase } from '@/integrations/supabase/client';
import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025, FONDO_SOLIDARIDAD_PENSIONAL_2025, CONTRIBUCIONES_SOLIDARIAS_2025, RETENCION_FUENTE_2025 } from '@/constants';

export interface DeductionInput {
  salarioBase: number;
  totalDevengado: number;
  auxilioTransporte: number;
  periodType: 'quincenal' | 'mensual' | 'semanal';
  empleadoId?: string;
  periodoId?: string;
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
   * ✅ NUEVO: Cálculo de Fondo de Solidaridad Pensional
   */
  private static calculateFondoSolidaridad(salarioBase: number): {
    valor: number;
    rate: number;
    smmlvMultiple: number;
  } {
    const smmlvMultiple = salarioBase / SALARIO_MINIMO_2025;
    
    // Solo aplica para salarios >= 4 SMMLV
    if (smmlvMultiple < 4) {
      return { valor: 0, rate: 0, smmlvMultiple };
    }

    const rango = FONDO_SOLIDARIDAD_PENSIONAL_2025.RANGOS.find(r => 
      smmlvMultiple >= r.minSMMLV && smmlvMultiple < r.maxSMMLV
    );

    if (!rango) {
      return { valor: 0, rate: 0, smmlvMultiple };
    }

    const valor = salarioBase * rango.percentage;
    return { valor, rate: rango.percentage, smmlvMultiple };
  }

  /**
   * ✅ NUEVO: Cálculo de Contribuciones Solidarias
   */
  private static calculateContribucionesSolidarias(salarioBase: number): {
    contribucionSolidariaAdicional: number;
    fondoSubsistencia: number;
    contribucionSolidariaRate: number;
    fondoSubsistenciaRate: number;
  } {
    const smmlvMultiple = salarioBase / SALARIO_MINIMO_2025;
    
    let contribucionSolidariaAdicional = 0;
    let fondoSubsistencia = 0;
    let contribucionSolidariaRate = 0;
    let fondoSubsistenciaRate = 0;

    // Contribución Solidaria Adicional (≥ 16 SMMLV)
    if (smmlvMultiple >= CONTRIBUCIONES_SOLIDARIAS_2025.CONTRIBUCION_SOLIDARIA_ADICIONAL.minSMMLV) {
      contribucionSolidariaRate = CONTRIBUCIONES_SOLIDARIAS_2025.CONTRIBUCION_SOLIDARIA_ADICIONAL.percentage;
      contribucionSolidariaAdicional = salarioBase * contribucionSolidariaRate;
    }

    // Fondo de Subsistencia (≥ 20 SMMLV)
    if (smmlvMultiple >= CONTRIBUCIONES_SOLIDARIAS_2025.FONDO_SUBSISTENCIA.minSMMLV) {
      fondoSubsistenciaRate = CONTRIBUCIONES_SOLIDARIAS_2025.FONDO_SUBSISTENCIA.percentage;
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
   * ✅ NUEVO: Cálculo mejorado de Retención en la Fuente
   */
  private static calculateRetencionFuente(baseRetencion: number): number {
    const uvtValue = RETENCION_FUENTE_2025.UVT;
    const baseUVT = baseRetencion / uvtValue;
    
    // Buscar el rango apropiado en la tabla
    const rango = RETENCION_FUENTE_2025.TABLA_RETENCION.find(r => 
      baseUVT >= r.minUVT && baseUVT < r.maxUVT
    );

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
   * ✅ FALLBACK LOCAL: Cálculo completo de deducciones con todas las deducciones de ley
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
    const baseIbc = input.totalDevengado - input.auxilioTransporte;
    const topeIbc = SALARIO_MINIMO_2025 * 25;
    
    // Aplicar topes IBC
    const ibcAplicable = Math.min(baseIbc, topeIbc);
    
    // Cálculos básicos según normativa colombiana 2025
    const healthDeduction = Math.max(0, ibcAplicable * 0.04); // 4% salud
    const pensionDeduction = Math.max(0, ibcAplicable * 0.04); // 4% pensión
    
    // ✅ NUEVO: Fondo de Solidaridad Pensional
    const fondoSolidaridadResult = this.calculateFondoSolidaridad(input.salarioBase);
    
    // ✅ NUEVO: Contribuciones Solidarias
    const contribucionesSolidarias = this.calculateContribucionesSolidarias(input.salarioBase);
    
    // ✅ NUEVO: Retención en la fuente mejorada
    const baseRetencion = input.totalDevengado - healthDeduction - pensionDeduction - fondoSolidaridadResult.valor;
    const retencionFuente = this.calculateRetencionFuente(baseRetencion);
    
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

  // ✅ MÉTODO PRINCIPAL: Con deducciones de ley completas
  static async calculateDeductions(input: DeductionInput): Promise<DeductionResult> {
    console.log('🔧 CÁLCULO DE DEDUCCIONES 2025 - Con deducciones de ley completas:', {
      salarioBase: input.salarioBase,
      totalDevengado: input.totalDevengado,
      auxilioTransporte: input.auxilioTransporte,
      periodType: input.periodType
    });
    
    let backendResult: any = null;
    let usedFallback = false;
    
    try {
      // 1. Intentar usar el backend primero
      console.log('🌐 Intentando cálculo backend...');
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate',
          data: {
            baseSalary: input.salarioBase,
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
      
      // Usar fallback local con deducciones completas
      backendResult = this.calculateLocalDeductions(input);
      console.log('🔄 Fallback local aplicado con deducciones completas:', backendResult);
    }

    // 2. Obtener novedades de deducciones específicas
    let novedadesDeducciones = 0;
    let novedadesDetalle: Array<{ tipo: string; valor: number; descripcion: string }> = [];
    
    if (input.empleadoId && input.periodoId) {
      const novedadesResult = await this.getNovedadesDeducciones(input.empleadoId, input.periodoId);
      novedadesDeducciones = novedadesResult.total;
      novedadesDetalle = novedadesResult.detalle;
    }

    // 3. Ensamblar resultado final con todas las deducciones
    const totalDeducciones = backendResult.healthDeduction + 
                            backendResult.pensionDeduction + 
                            (backendResult.fondoSolidaridad || 0) +
                            (backendResult.contribucionSolidariaAdicional || 0) +
                            (backendResult.fondoSubsistencia || 0) +
                            (backendResult.retencionFuente || 0) +
                            novedadesDeducciones;

    console.log('📊 RESULTADO FINAL CON DEDUCCIONES COMPLETAS:', {
      metodo: usedFallback ? 'FALLBACK LOCAL' : 'BACKEND',
      salarioBase: input.salarioBase,
      smmlvMultiple: backendResult.smmlvMultiple || (input.salarioBase / SALARIO_MINIMO_2025),
      totalDevengado: input.totalDevengado,
      totalDeducciones,
      netoPagar: input.totalDevengado - totalDeducciones,
      desglose: {
        salud: backendResult.healthDeduction,
        pension: backendResult.pensionDeduction,
        fondoSolidaridad: backendResult.fondoSolidaridad || 0,
        contribucionSolidaria: backendResult.contribucionSolidariaAdicional || 0,
        fondoSubsistencia: backendResult.fondoSubsistencia || 0,
        retencion: backendResult.retencionFuente || 0,
        novedades: novedadesDeducciones
      }
    });

    return {
      ibcSalud: input.totalDevengado - input.auxilioTransporte,
      ibcPension: input.totalDevengado - input.auxilioTransporte,
      saludEmpleado: backendResult.healthDeduction,
      pensionEmpleado: backendResult.pensionDeduction,
      fondoSolidaridad: backendResult.fondoSolidaridad || 0,
      contribucionSolidariaAdicional: backendResult.contribucionSolidariaAdicional || 0,
      fondoSubsistencia: backendResult.fondoSubsistencia || 0,
      retencionFuente: backendResult.retencionFuente || 0,
      novedadesDeducciones,
      totalDeducciones,
      detalleCalculo: {
        baseIbc: input.totalDevengado - input.auxilioTransporte,
        topeIbc: SALARIO_MINIMO_2025 * 25,
        baseRetencion: input.totalDevengado - backendResult.healthDeduction - backendResult.pensionDeduction,
        uvtAplicable: RETENCION_FUENTE_2025.UVT,
        smmlvMultiple: backendResult.smmlvMultiple || (input.salarioBase / SALARIO_MINIMO_2025),
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

  static getConfigurationInfo(): {
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
    contribucionesSolidarias: {
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
    return {
      salarioMinimo: SALARIO_MINIMO_2025,
      uvt: RETENCION_FUENTE_2025.UVT,
      porcentajes: {
        saludEmpleado: 0.04,
        pensionEmpleado: 0.04
      },
      topeIbc: SALARIO_MINIMO_2025 * 25,
      fondoSolidaridad: {
        ranges: FONDO_SOLIDARIDAD_PENSIONAL_2025.RANGOS
      },
      contribucionesSolidarias: {
        contribucionSolidariaAdicional: CONTRIBUCIONES_SOLIDARIAS_2025.CONTRIBUCION_SOLIDARIA_ADICIONAL,
        fondoSubsistencia: CONTRIBUCIONES_SOLIDARIAS_2025.FONDO_SUBSISTENCIA
      }
    };
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
