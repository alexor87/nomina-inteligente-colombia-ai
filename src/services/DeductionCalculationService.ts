
/**
 * Servicio de cálculo de deducciones según normativa colombiana
 * Incluye cálculo correcto de IBC, retención en la fuente, fondo de solidaridad pensional y novedades
 * CORREGIDO PARA IGUALAR ALELUYA: IBC sin auxilio de transporte + Fondo Solidaridad automático
 */

import { ConfigurationService } from './ConfigurationService';
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

      // Tipos de novedades que son deducciones (EXCLUIR fondo_solidaridad ya que se calcula automáticamente)
      const tiposDeducciones = [
        'libranza', 'multa', 'ausencia', 'descuento_voluntario', 
        'retencion_fuente', 'salud', 'pension', 
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

  private static calculateFondoSolidaridad(ibc: number, salarioMinimo: number): { valor: number; rate: number } {
    const config = ConfigurationService.getConfiguration('2025');
    
    // Calcular el IBC en múltiplos de SMMLV
    const ibcEnSMMLV = ibc / salarioMinimo;
    
    console.log('🏦 Calculando Fondo de Solidaridad:', {
      ibc,
      salarioMinimo,
      ibcEnSMMLV: ibcEnSMMLV.toFixed(2)
    });
    
    // Solo aplica si es mayor a 4 SMMLV
    if (ibcEnSMMLV < 4) {
      return { valor: 0, rate: 0 };
    }
    
    // Encontrar el rango correspondiente
    const rango = config.fondoSolidaridad.ranges.find(range => 
      ibcEnSMMLV >= range.minSMMLV && ibcEnSMMLV < range.maxSMMLV
    );
    
    if (!rango) {
      console.warn('No se encontró rango para Fondo de Solidaridad:', ibcEnSMMLV);
      return { valor: 0, rate: 0 };
    }
    
    const valor = Math.round(ibc * rango.percentage);
    
    console.log('💰 Fondo de Solidaridad calculado:', {
      rango: `${rango.minSMMLV}-${rango.maxSMMLV} SMMLV`,
      porcentaje: `${(rango.percentage * 100).toFixed(1)}%`,
      valor
    });
    
    return { valor, rate: rango.percentage };
  }

  private static getNovedadDescription(tipo: string): string {
    const descriptions: Record<string, string> = {
      libranza: 'Libranza',
      multa: 'Multa',
      ausencia: 'Ausencia',
      descuento_voluntario: 'Descuento Voluntario',
      retencion_fuente: 'Retención en la Fuente',
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

  static async calculateDeductions(input: DeductionInput): Promise<DeductionResult> {
    const config = ConfigurationService.getConfiguration('2025');
    
    console.log('🔧 CORRECCIÓN ALELUYA - Cálculo de deducciones:', {
      totalDevengado: input.totalDevengado,
      auxilioTransporte: input.auxilioTransporte,
      periodType: input.periodType
    });
    
    // ✅ CORRECCIÓN CRÍTICA ALELUYA: IBC sin auxilio de transporte
    const baseIbc = input.totalDevengado - input.auxilioTransporte; // Solo el salario proporcional
    const topeIbc = config.salarioMinimo * 25; // Tope de 25 SMMLV
    const ibcFinal = Math.min(baseIbc, topeIbc);
    
    console.log('💰 IBC corregido (sin auxilio):', {
      baseIbc,
      ibcFinal,
      auxilioDescontado: input.auxilioTransporte
    });

    // 2. Calcular deducciones obligatorias sobre IBC correcto
    const saludEmpleado = Math.round(ibcFinal * config.porcentajes.saludEmpleado);
    const pensionEmpleado = Math.round(ibcFinal * config.porcentajes.pensionEmpleado);
    
    // 3. Calcular Fondo de Solidaridad Pensional automáticamente
    const fondoSolidaridadResult = this.calculateFondoSolidaridad(ibcFinal, config.salarioMinimo);

    console.log('🏥 Deducciones calculadas:', {
      saludEmpleado,
      pensionEmpleado,
      fondoSolidaridad: fondoSolidaridadResult.valor,
      base: ibcFinal
    });

    // 4. Calcular retención en la fuente sobre base sin deducciones
    const baseRetencion = ibcFinal - saludEmpleado - pensionEmpleado - fondoSolidaridadResult.valor;
    const retencionFuente = this.calculateRetencionFuente(baseRetencion, config);

    // 5. Obtener novedades de deducciones si se proporcionan los IDs
    let novedadesDeducciones = 0;
    let novedadesDetalle: Array<{ tipo: string; valor: number; descripcion: string }> = [];
    
    if (input.empleadoId && input.periodoId) {
      const novedadesResult = await this.getNovedadesDeducciones(input.empleadoId, input.periodoId);
      novedadesDeducciones = novedadesResult.total;
      novedadesDetalle = novedadesResult.detalle;
    }

    // 6. Calcular total de deducciones
    const totalDeducciones = saludEmpleado + pensionEmpleado + fondoSolidaridadResult.valor + retencionFuente + novedadesDeducciones;

    console.log('📊 RESULTADO FINAL ALELUYA CON FONDO SOLIDARIDAD:', {
      totalDevengado: input.totalDevengado,
      totalDeducciones,
      netoPagar: input.totalDevengado - totalDeducciones,
      desglose: {
        salud: saludEmpleado,
        pension: pensionEmpleado,
        fondoSolidaridad: fondoSolidaridadResult.valor,
        retencion: retencionFuente,
        novedades: novedadesDeducciones
      }
    });

    return {
      ibcSalud: ibcFinal,
      ibcPension: ibcFinal,
      saludEmpleado,
      pensionEmpleado,
      fondoSolidaridad: fondoSolidaridadResult.valor,
      retencionFuente,
      novedadesDeducciones,
      totalDeducciones,
      detalleCalculo: {
        baseIbc,
        topeIbc,
        baseRetencion,
        uvtAplicable: config.uvt,
        fondoSolidaridadRate: fondoSolidaridadResult.rate,
        novedadesDetalle
      }
    };
  }

  private static calculateRetencionFuente(baseRetencion: number, config: any): number {
    // Tabla de retención en la fuente 2025 (en UVT)
    const uvt = config.uvt;
    const baseEnUvt = baseRetencion / uvt;

    // Rangos de retención según normativa DIAN 2025
    if (baseEnUvt <= 95) {
      return 0; // Exento
    } else if (baseEnUvt <= 150) {
      return Math.round((baseEnUvt - 95) * 0.19 * uvt);
    } else if (baseEnUvt <= 360) {
      return Math.round(((baseEnUvt - 150) * 0.28 + 10.45) * uvt);
    } else if (baseEnUvt <= 640) {
      return Math.round(((baseEnUvt - 360) * 0.33 + 69.25) * uvt);
    } else if (baseEnUvt <= 945) {
      return Math.round(((baseEnUvt - 640) * 0.35 + 161.65) * uvt);
    } else if (baseEnUvt <= 2300) {
      return Math.round(((baseEnUvt - 945) * 0.37 + 268.40) * uvt);
    } else {
      return Math.round(((baseEnUvt - 2300) * 0.39 + 769.75) * uvt);
    }
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
    const config = ConfigurationService.getConfiguration('2025');
    return {
      salarioMinimo: config.salarioMinimo,
      uvt: config.uvt,
      porcentajes: {
        saludEmpleado: config.porcentajes.saludEmpleado,
        pensionEmpleado: config.porcentajes.pensionEmpleado
      },
      topeIbc: config.salarioMinimo * 25,
      fondoSolidaridad: config.fondoSolidaridad
    };
  }
}
