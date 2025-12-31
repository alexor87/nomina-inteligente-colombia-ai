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

export type PendingPeriodStatus = 'overdue' | 'urgent' | 'current' | 'future';

export interface PendingPeriod {
  benefitType: 'prima' | 'cesantias' | 'intereses_cesantias';
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  employeesCount: number;
  totalAmount: number;
  status: PendingPeriodStatus;
  legalDeadline: string;
  daysUntilDeadline: number;
}

export class SocialBenefitsLiquidationService {
  /**
   * Obtiene todos los períodos pendientes de liquidar agrupados por tipo de beneficio
   */
  static async getPendingPeriods(companyId: string): Promise<{ success: boolean; periods?: PendingPeriod[]; error?: string }> {
    try {
      // Consultar provisiones pendientes (calculado y sin payment_id)
      // Filtrar solo los tipos de beneficio que se liquidan en este módulo
      const { data, error } = await supabase
        .from('social_benefit_calculations')
        .select('benefit_type, period_start, period_end, employee_id, amount')
        .eq('company_id', companyId)
        .eq('estado', 'calculado')
        .is('payment_id', null)
        .in('benefit_type', ['prima', 'cesantias', 'intereses_cesantias']);

      if (error) {
        console.error('❌ Error consultando períodos pendientes:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.log('📊 [SocialBenefits] No hay provisiones pendientes');
        return { success: true, periods: [] };
      }

      // Agrupar por tipo de beneficio y período
      const groupedPeriods = new Map<string, {
        benefitType: 'prima' | 'cesantias' | 'intereses_cesantias';
        periodStart: string;
        periodEnd: string;
        employees: Set<string>;
        totalAmount: number;
      }>();

      console.log('📊 [SocialBenefits] Provisiones pendientes encontradas:', data.length);

      data.forEach((calc: any) => {
        const benefitType = calc.benefit_type;
        
        // Validación adicional: saltar tipos no soportados (por seguridad)
        if (!['prima', 'cesantias', 'intereses_cesantias'].includes(benefitType)) {
          console.warn('⚠️ [SocialBenefits] Tipo de beneficio no soportado:', benefitType);
          return;
        }
        const periodStart = calc.period_start;
        const periodEnd = calc.period_end;
        
        // Crear key único basado en tipo y período
        // IMPORTANTE: Usar period_end para determinar el semestre de prima
        // ya que las provisiones de julio pertenecen al 2do semestre
        let periodKey: string;
        const endDate = new Date(periodEnd);
        const year = endDate.getFullYear();
        
        if (benefitType === 'prima') {
          // Para prima, agrupar por semestre basándose en period_end
          // Mes 0-5 (ene-jun) = 1er semestre, Mes 6-11 (jul-dic) = 2do semestre
          const endMonth = endDate.getMonth();
          const semester = endMonth <= 5 ? 1 : 2;
          periodKey = `${benefitType}-${year}-S${semester}`;
        } else {
          // Para cesantías e intereses, agrupar por año
          periodKey = `${benefitType}-${year}`;
        }

        if (!groupedPeriods.has(periodKey)) {
          // Calcular fechas correctas del semestre/año según el tipo de prestación
          let correctPeriodStart: string;
          let correctPeriodEnd: string;
          
          if (benefitType === 'prima') {
            const endMonth = endDate.getMonth();
            const semester = endMonth <= 5 ? 1 : 2;
            if (semester === 1) {
              correctPeriodStart = `${year}-01-01`;
              correctPeriodEnd = `${year}-06-30`;
            } else {
              correctPeriodStart = `${year}-07-01`;
              correctPeriodEnd = `${year}-12-31`;
            }
          } else {
            // Para cesantías e intereses, usar el año completo
            correctPeriodStart = `${year}-01-01`;
            correctPeriodEnd = `${year}-12-31`;
          }
          
          groupedPeriods.set(periodKey, {
            benefitType,
            periodStart: correctPeriodStart,
            periodEnd: correctPeriodEnd,
            employees: new Set(),
            totalAmount: 0
          });
        }

        const group = groupedPeriods.get(periodKey)!;
        group.employees.add(calc.employee_id);
        group.totalAmount += Number(calc.amount) || 0;
      });

      console.log('📊 [SocialBenefits] Períodos agrupados:', Array.from(groupedPeriods.keys()));

      // Convertir a array de PendingPeriod con cálculo de status
      const now = new Date();
      const periods: PendingPeriod[] = [];

      groupedPeriods.forEach((group, key) => {
        const startDate = new Date(group.periodStart);
        const year = startDate.getFullYear();
        
        let periodLabel: string;
        let legalDeadline: Date;

        if (group.benefitType === 'prima') {
          const semester = startDate.getMonth() < 6 ? 1 : 2;
          periodLabel = semester === 1 ? `1er Semestre ${year}` : `2do Semestre ${year}`;
          // Fecha legal: 30 Jun para S1, 20 Dic para S2
          legalDeadline = semester === 1 
            ? new Date(year, 5, 30) // 30 de junio
            : new Date(year, 11, 20); // 20 de diciembre
        } else if (group.benefitType === 'cesantias') {
          periodLabel = `Año ${year}`;
          // Fecha legal: 14 de febrero del año siguiente
          legalDeadline = new Date(year + 1, 1, 14);
        } else {
          periodLabel = `Año ${year}`;
          // Fecha legal: 31 de enero del año siguiente
          legalDeadline = new Date(year + 1, 0, 31);
        }

        const daysUntilDeadline = Math.ceil((legalDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: PendingPeriodStatus;
        if (daysUntilDeadline < 0) {
          status = 'overdue';
        } else if (daysUntilDeadline <= 30) {
          status = 'urgent';
        } else if (daysUntilDeadline <= 90) {
          status = 'current';
        } else {
          status = 'future';
        }

        periods.push({
          benefitType: group.benefitType,
          periodLabel,
          periodStart: group.periodStart,
          periodEnd: group.periodEnd,
          employeesCount: group.employees.size,
          totalAmount: group.totalAmount,
          status,
          legalDeadline: legalDeadline.toISOString().split('T')[0],
          daysUntilDeadline
        });
      });

      // Ordenar por urgencia (vencidos primero, luego por fecha)
      periods.sort((a, b) => {
        const statusOrder = { overdue: 0, urgent: 1, current: 2, future: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime();
      });

      return { success: true, periods };
    } catch (error) {
      console.error('❌ Error en getPendingPeriods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
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
