
/**
 * Servicio de cálculo de deducciones según normativa colombiana
 * ACTUALIZADO 2025: Integración completa con backend para consistencia total
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

      // Tipos de novedades que son deducciones
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

  // ✅ MÉTODO PRINCIPAL: Ahora usa completamente el backend
  static async calculateDeductions(input: DeductionInput): Promise<DeductionResult> {
    console.log('🔧 BACKEND INTEGRATION - Cálculo unificado de deducciones:', {
      totalDevengado: input.totalDevengado,
      auxilioTransporte: input.auxilioTransporte,
      periodType: input.periodType
    });
    
    try {
      // 1. Usar el backend para todos los cálculos básicos
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
        console.error('Error calling backend calculation:', error);
        throw new Error('Error en el cálculo backend');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      const backendResult = data.data;

      // 2. Obtener novedades de deducciones específicas
      let novedadesDeducciones = 0;
      let novedadesDetalle: Array<{ tipo: string; valor: number; descripcion: string }> = [];
      
      if (input.empleadoId && input.periodoId) {
        const novedadesResult = await this.getNovedadesDeducciones(input.empleadoId, input.periodoId);
        novedadesDeducciones = novedadesResult.total;
        novedadesDetalle = novedadesResult.detalle;
      }

      // 3. Calcular retención en la fuente usando backend actualizado
      let retencionFuente = 0;
      try {
        const { data: retencionData, error: retencionError } = await supabase.functions.invoke('payroll-calculations', {
          body: {
            action: 'calculate-retencion-fuente',
            data: { salarioBase: input.salarioBase }
          }
        });

        if (!retencionError && retencionData.success) {
          retencionFuente = retencionData.data.valor || 0;
          console.log('✅ Retención 2025 calculada:', retencionFuente);
        }
      } catch (retencionErr) {
        console.warn('Warning: Retención calculation failed, using backend default');
        retencionFuente = backendResult.retencionFuente || 0;
      }

      // 4. Ensamblar resultado final
      const totalDeducciones = backendResult.healthDeduction + 
                              backendResult.pensionDeduction + 
                              retencionFuente + 
                              novedadesDeducciones;

      console.log('📊 RESULTADO BACKEND INTEGRADO:', {
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
        fondoSolidaridad: 0, // Se maneja via novedades
        retencionFuente,
        novedadesDeducciones,
        totalDeducciones,
        detalleCalculo: {
          baseIbc: input.totalDevengado - input.auxilioTransporte,
          topeIbc: 1423500 * 25, // SMMLV 2025 * 25
          baseRetencion: input.totalDevengado - backendResult.healthDeduction - backendResult.pensionDeduction,
          uvtAplicable: 47065, // UVT 2025
          fondoSolidaridadRate: 0,
          novedadesDetalle
        }
      };

    } catch (error) {
      console.error('Error in backend-integrated calculation:', error);
      throw error;
    }
  }

  static async calculateBatchDeductions(inputs: DeductionInput[]): Promise<DeductionResult[]> {
    const results = await Promise.all(
      inputs.map(input => this.calculateDeductions(input))
    );
    return results;
  }

  // ✅ INFORMACIÓN ACTUALIZADA 2025
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
      salarioMinimo: 1423500, // ✅ SMMLV 2025
      uvt: 47065, // ✅ UVT 2025
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
}
