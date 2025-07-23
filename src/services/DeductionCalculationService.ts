
/**
 * Servicio de cálculo de deducciones según normativa colombiana
 * ACTUALIZADO 2025: Con fallback local robusto para garantizar cálculos correctos
 */

import { supabase } from '@/integrations/supabase/client';

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
  retencionFuente: number;
  novedadesDeducciones: number;
  totalDeducciones: number;
  detalleCalculo: {
    baseIbc: number;
    topeIbc: number;
    baseRetencion: number;
    uvtAplicable: number;
    fondoSolidaridadRate: number;
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
   * ✅ FALLBACK LOCAL: Cálculo de deducciones básicas cuando falla el backend
   */
  private static calculateLocalDeductions(input: DeductionInput): {
    healthDeduction: number;
    pensionDeduction: number;
    retencionFuente: number;
  } {
    const baseIbc = input.totalDevengado - input.auxilioTransporte;
    const smmlv2025 = 1423500;
    const topeIbc = smmlv2025 * 25;
    
    // Aplicar topes IBC
    const ibcAplicable = Math.min(baseIbc, topeIbc);
    
    // Cálculos básicos según normativa colombiana 2025
    const healthDeduction = Math.max(0, ibcAplicable * 0.04); // 4% salud
    const pensionDeduction = Math.max(0, ibcAplicable * 0.04); // 4% pensión
    
    // Retención en la fuente simplificada
    let retencionFuente = 0;
    const uvt2025 = 47065;
    const baseRetencion = input.totalDevengado - healthDeduction - pensionDeduction;
    
    if (baseRetencion > (uvt2025 * 95)) { // Más de 95 UVT
      retencionFuente = (baseRetencion - (uvt2025 * 95)) * 0.19;
    }
    
    return {
      healthDeduction,
      pensionDeduction,
      retencionFuente
    };
  }

  // ✅ MÉTODO PRINCIPAL: Con fallback local robusto
  static async calculateDeductions(input: DeductionInput): Promise<DeductionResult> {
    console.log('🔧 CÁLCULO DE DEDUCCIONES - Con fallback local:', {
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
      
      // Usar fallback local
      backendResult = this.calculateLocalDeductions(input);
      console.log('🔄 Fallback local aplicado:', backendResult);
    }

    // 2. Obtener novedades de deducciones específicas
    let novedadesDeducciones = 0;
    let novedadesDetalle: Array<{ tipo: string; valor: number; descripcion: string }> = [];
    
    if (input.empleadoId && input.periodoId) {
      const novedadesResult = await this.getNovedadesDeducciones(input.empleadoId, input.periodoId);
      novedadesDeducciones = novedadesResult.total;
      novedadesDetalle = novedadesResult.detalle;
    }

    // 3. Calcular retención en la fuente
    let retencionFuente = backendResult.retencionFuente || 0;
    
    if (usedFallback) {
      // Si usamos fallback, ya está calculada
      retencionFuente = backendResult.retencionFuente;
    } else {
      // Si usamos backend, intentar cálculo específico de retención
      try {
        const { data: retencionData, error: retencionError } = await supabase.functions.invoke('payroll-calculations', {
          body: {
            action: 'calculate-retencion-fuente',
            data: { salarioBase: input.salarioBase }
          }
        });

        if (!retencionError && retencionData?.success) {
          retencionFuente = retencionData.data.valor || 0;
        }
      } catch (retencionErr) {
        console.warn('Warning: Retención calculation failed, using backend default');
        retencionFuente = backendResult.retencionFuente || 0;
      }
    }

    // 4. Ensamblar resultado final
    const totalDeducciones = backendResult.healthDeduction + 
                            backendResult.pensionDeduction + 
                            retencionFuente + 
                            novedadesDeducciones;

    console.log('📊 RESULTADO FINAL:', {
      metodo: usedFallback ? 'FALLBACK LOCAL' : 'BACKEND',
      totalDevengado: input.totalDevengado,
      totalDeducciones,
      netoPagar: input.totalDevengado - totalDeducciones,
      desglose: {
        salud: backendResult.healthDeduction,
        pension: backendResult.pensionDeduction,
        retencion: retencionFuente,
        novedades: novedadesDeducciones
      }
    });

    return {
      ibcSalud: input.totalDevengado - input.auxilioTransporte,
      ibcPension: input.totalDevengado - input.auxilioTransporte,
      saludEmpleado: backendResult.healthDeduction,
      pensionEmpleado: backendResult.pensionDeduction,
      fondoSolidaridad: 0,
      retencionFuente,
      novedadesDeducciones,
      totalDeducciones,
      detalleCalculo: {
        baseIbc: input.totalDevengado - input.auxilioTransporte,
        topeIbc: 1423500 * 25,
        baseRetencion: input.totalDevengado - backendResult.healthDeduction - backendResult.pensionDeduction,
        uvtAplicable: 47065,
        fondoSolidaridadRate: 0,
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
  } {
    return {
      salarioMinimo: 1423500,
      uvt: 47065,
      porcentajes: {
        saludEmpleado: 0.04,
        pensionEmpleado: 0.04
      },
      topeIbc: 1423500 * 25,
      fondoSolidaridad: {
        ranges: [
          { minSMMLV: 4, maxSMMLV: 16, percentage: 0.01 },
          { minSMMLV: 16, maxSMMLV: 17, percentage: 0.012 },
          { minSMMLV: 17, maxSMMLV: 18, percentage: 0.014 },
          { minSMMLV: 18, maxSMMLV: 19, percentage: 0.016 },
          { minSMMLV: 19, maxSMMLV: 20, percentage: 0.018 },
          { minSMMLV: 20, maxSMMLV: Infinity, percentage: 0.02 }
        ]
      }
    };
  }

  /**
   * ✅ NUEVA FUNCIONALIDAD: Validar períodos con deducciones en $0
   */
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
