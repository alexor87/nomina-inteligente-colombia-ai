import { supabase } from '@/integrations/supabase/client';
import type { BenefitType } from '@/types/social-benefits';

export interface OpenPeriod {
  id: string;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface EmployeeLiquidationPreview {
  id: string;
  name: string;
  periodsCount: number;
  accumulatedAmount: number;
}

export interface LiquidationPreviewSummary {
  totalEmployees: number;
  totalAmount: number;
  periodsIncluded: number;
  hasOpenPeriods: boolean;
}

export interface LiquidationPreview {
  success: true;
  mode: 'preview';
  hasOpenPeriods: boolean;
  openPeriods: OpenPeriod[];
  employees: EmployeeLiquidationPreview[];
  summary: LiquidationPreviewSummary;
  message?: string;
}

export interface LiquidationResult {
  success: true;
  mode: 'saved';
  paymentId: string;
  totalAmount: number;
  employeesCount: number;
  provisionsUpdated: number;
  periodLabel: string;
}

export interface AlreadyLiquidatedError {
  success: false;
  error: 'already_liquidated';
  message: string;
  existingPayment: {
    id: string;
    periodLabel: string;
    amount: number;
    employeesCount: number;
    date: string;
  };
}

export interface AnulacionResult {
  success: true;
  message: string;
  paymentId: string;
  benefitType: string;
  periodLabel: string;
  totalAmount: number;
  provisionsReverted: number;
  anulado_at: string;
}

export interface PaymentHistoryItem {
  id: string;
  company_id: string;
  benefit_type: string;
  period_label: string;
  period_start: string;
  period_end: string;
  employees_count: number;
  total_amount: number;
  payment_details: any;
  created_by: string | null;
  created_at: string;
  anulado: boolean;
  anulado_por: string | null;
  anulado_at: string | null;
  anulacion_motivo: string | null;
}

export interface LiquidationError {
  success: false;
  error: string;
  openPeriods?: OpenPeriod[];
  details?: any;
}

export type LiquidationResponse = LiquidationPreview | LiquidationResult | LiquidationError;

export class SocialBenefitsLiquidationService {
  /**
   * Obtiene un preview de la liquidación consultando provisiones acumuladas
   */
  static async getPreview(
    companyId: string,
    benefitType: BenefitType,
    periodStart: string,
    periodEnd: string,
    periodLabel: string
  ): Promise<LiquidationResponse> {
    try {
      console.log(`📋 Obteniendo preview de liquidación: ${benefitType} - ${periodLabel}`);

      const { data, error } = await supabase.functions.invoke('liquidate-social-benefit', {
        body: {
          companyId,
          benefitType,
          periodStart,
          periodEnd,
          periodLabel,
          skipOpenPeriods: false,
          save: false
        }
      });

      if (error) {
        console.error('❌ Error en preview:', error);
        return {
          success: false,
          error: error.message || 'Error obteniendo preview'
        };
      }

      return data as LiquidationResponse;
    } catch (error) {
      console.error('❌ Error en getPreview:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Ejecuta la liquidación: marca provisiones como liquidadas y crea registro de pago
   */
  static async liquidate(
    companyId: string,
    benefitType: BenefitType,
    periodStart: string,
    periodEnd: string,
    periodLabel: string,
    skipOpenPeriods: boolean = false
  ): Promise<LiquidationResponse> {
    try {
      console.log(`💰 Ejecutando liquidación: ${benefitType} - ${periodLabel}`);
      console.log(`   Skip períodos abiertos: ${skipOpenPeriods}`);

      const { data, error } = await supabase.functions.invoke('liquidate-social-benefit', {
        body: {
          companyId,
          benefitType,
          periodStart,
          periodEnd,
          periodLabel,
          skipOpenPeriods,
          save: true
        }
      });

      if (error) {
        console.error('❌ Error en liquidación:', error);
        return {
          success: false,
          error: error.message || 'Error ejecutando liquidación'
        };
      }

      return data as LiquidationResponse;
    } catch (error) {
      console.error('❌ Error en liquidate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el historial de pagos de prestaciones sociales
   */
  static async getPaymentHistory(
    companyId: string,
    benefitType?: BenefitType
  ): Promise<{ success: boolean; payments?: PaymentHistoryItem[]; error?: string }> {
    try {
      let query = supabase
        .from('social_benefit_payments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (benefitType) {
        query = query.eq('benefit_type', benefitType);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, payments: data as PaymentHistoryItem[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Anula una liquidación y revierte las provisiones a estado 'calculado'
   */
  static async anularLiquidacion(
    paymentId: string,
    motivo: string
  ): Promise<{ success: boolean; data?: AnulacionResult; error?: string }> {
    try {
      console.log(`🔄 Anulando liquidación: ${paymentId}`);

      const { data, error } = await supabase.functions.invoke('anular-social-benefit', {
        body: {
          paymentId,
          motivo
        }
      });

      if (error) {
        console.error('❌ Error en anulación:', error);
        return {
          success: false,
          error: error.message || 'Error anulando liquidación'
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Error desconocido'
        };
      }

      return { success: true, data: data as AnulacionResult };
    } catch (error) {
      console.error('❌ Error en anularLiquidacion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
