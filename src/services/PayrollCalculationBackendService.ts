import { supabase } from '@/integrations/supabase/client';
import { NovedadForIBC } from '@/types/payroll';
import { ConfigurationService } from './ConfigurationService';

export interface PayrollCalculationInput {
  baseSalary: number;
  tipoSalario?: 'mensual' | 'integral' | 'medio_tiempo'; // ✅ NUEVO: Tipo de salario
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  novedades?: any[];
}

export interface PayrollCalculationResult {
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  transportAllowance: number;
  employerContributions: number;
  ibc: number;
  healthDeduction: number;
  pensionDeduction: number;
  salaryBreakdown?: {
    factorSalarial?: number; // Para salario integral
    factorPrestacional?: number; // Para salario integral
    proportionalSalary?: number; // Para medio tiempo
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PayrollCalculationBackendService {
  private static readonly FUNCTION_NAME = 'payroll-calculations';

  static async calculatePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    console.log('🔍 PayrollCalculationBackendService: Iniciando cálculo con tipo de salario:', input.tipoSalario);
    
    try {
      const { data, error } = await supabase.functions.invoke(this.FUNCTION_NAME, {
        body: {
          action: 'calculate',
          ...input
        }
      });

      if (error) {
        console.error('❌ Error en edge function:', error);
        throw new Error(`Error en el cálculo: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('❌ Respuesta inválida del servicio:', data);
        throw new Error(data?.error || 'Error desconocido en el cálculo');
      }

      console.log('✅ Cálculo completado exitosamente:', data.result);
      return data.result;
    } catch (error) {
      console.error('❌ Error en PayrollCalculationBackendService:', error);
      throw error;
    }
  }

  static async validateEmployee(
    input: PayrollCalculationInput,
    eps?: string,
    afp?: string
  ): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'validate',
          data: { ...input, eps, afp }
        }
      });

      if (error) {
        console.error('Error calling validation function:', error);
        throw new Error('Error en la validación');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en la validación');
      }

      return data.data;
    } catch (error) {
      console.error('Error in validateEmployee:', error);
      throw error;
    }
  }

  static async calculateBatch(inputs: PayrollCalculationInput[]): Promise<PayrollCalculationResult[]> {
    try {
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'batch-calculate',
          data: { inputs }
        }
      });

      if (error) {
        console.error('Error calling batch calculation function:', error);
        throw new Error('Error en el cálculo por lotes');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo por lotes');
      }

      return data.data;
    } catch (error) {
      console.error('Error in calculateBatch:', error);
      throw error;
    }
  }

  static getConfigurationInfo(year: string = '2025'): {
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    year: string;
  } {
    const config = ConfigurationService.getConfigurationSync(year);
    return {
      salarioMinimo: config.salarioMinimo,
      auxilioTransporte: config.auxilioTransporte,
      uvt: config.uvt,
      year: year
    };
  }
}
