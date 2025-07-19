
import { supabase } from '@/integrations/supabase/client';
import { NovedadForIBC } from '@/types/payroll';

export interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  // ✅ NUEVO CAMPO: novedades para cálculo correcto de IBC
  novedades?: NovedadForIBC[];
}

export interface PayrollCalculationResult {
  regularPay: number;
  extraPay: number;
  transportAllowance: number;
  grossPay: number;
  healthDeduction: number;
  pensionDeduction: number;
  totalDeductions: number;
  netPay: number;
  employerHealth: number;
  employerPension: number;
  employerArl: number;
  employerCaja: number;
  employerIcbf: number;
  employerSena: number;
  employerContributions: number;
  totalPayrollCost: number;
  // ✅ NUEVO CAMPO: IBC calculado incluyendo novedades constitutivas
  ibc: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PayrollCalculationBackendService {
  static async calculatePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    try {
      console.log('🔍 PayrollCalculationBackendService: Calculando nómina con novedades:', {
        baseSalary: input.baseSalary,
        novedadesCount: input.novedades?.length || 0,
        novedades: input.novedades
      });

      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate',
          data: input
        }
      });

      if (error) {
        console.error('Error calling payroll calculation function:', error);
        throw new Error('Error en el cálculo de nómina');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      console.log('✅ PayrollCalculationBackendService: Resultado del cálculo:', {
        ibc: data.data.ibc,
        healthDeduction: data.data.healthDeduction,
        pensionDeduction: data.data.pensionDeduction
      });

      return data.data;
    } catch (error) {
      console.error('Error in calculatePayroll:', error);
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

  static getConfigurationInfo(): {
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    year: string;
  } {
    return {
      salarioMinimo: 1423500, // ✅ SMMLV 2025 actualizado
      auxilioTransporte: 200000,
      uvt: 47065, // ✅ UVT 2025 actualizado  
      year: '2025'
    };
  }
}
