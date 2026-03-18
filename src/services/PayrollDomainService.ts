/**
 * ✅ SERVICIO DOMINIO DE NÓMINA - ARQUITECTURA CRÍTICA REPARADA
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollStateManager } from './PayrollStateManager';
import { PayrollCalculationBackendService } from './PayrollCalculationBackendService';
import { logger } from '@/lib/logger';

export interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'draft' | 'active' | 'closed';
  tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
}

export interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: 'valid' | 'error';
  errors: string[];
}

export interface PeriodDetectionResult {
  currentPeriod: PayrollPeriod | null;
  needsCreation: boolean;
  canContinue: boolean;
  message: string;
  action: 'create' | 'resume' | 'wait';
  suggestion: string;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
}

export class PayrollDomainService {

  static async detectCurrentPeriodSituation(): Promise<PeriodDetectionResult> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'abierto', 'en_proceso'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('❌ Error detecting period:', error);
        throw error;
      }

      if (!periods || periods.length === 0) {
        return {
          currentPeriod: null,
          needsCreation: true,
          canContinue: false,
          message: 'No hay período activo. Se debe crear un nuevo período.',
          action: 'create',
          suggestion: 'Crear un nuevo período para continuar con la liquidación'
        };
      }

      const period = periods[0];
      const currentPeriod: PayrollPeriod = {
        id: period.id,
        periodo: period.periodo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        estado: PayrollStateManager.normalizeState(period.estado),
        tipo_periodo: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
        empleados_count: period.empleados_count || 0,
        total_devengado: Number(period.total_devengado) || 0,
        total_deducciones: Number(period.total_deducciones) || 0,
        total_neto: Number(period.total_neto) || 0
      };

      return {
        currentPeriod,
        needsCreation: false,
        canContinue: true,
        message: `Período activo encontrado: ${period.periodo}`,
        action: 'resume',
        suggestion: `Continuar con el período activo: ${period.periodo}`
      };

    } catch (error) {
      logger.error('❌ Error en detectCurrentPeriodSituation:', error);
      return {
        currentPeriod: null,
        needsCreation: true,
        canContinue: false,
        message: 'Error detectando período actual',
        action: 'create',
        suggestion: 'Verificar conexión y reintentar'
      };
    }
  }

  static async createNextPeriod(): Promise<{ success: boolean; period?: PayrollPeriod; message: string }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No se pudo determinar la empresa del usuario');

      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const periodName = this.generatePeriodName(startDate);

      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate.toISOString().split('T')[0],
          fecha_fin: endDate.toISOString().split('T')[0],
          tipo_periodo: 'mensual',
          estado: 'borrador'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        period: {
          id: newPeriod.id,
          periodo: newPeriod.periodo,
          fecha_inicio: newPeriod.fecha_inicio,
          fecha_fin: newPeriod.fecha_fin,
          estado: newPeriod.estado as 'draft',
          tipo_periodo: newPeriod.tipo_periodo as 'mensual',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        },
        message: `Período ${periodName} creado exitosamente`
      };
    } catch (error) {
      logger.error('❌ Error creating period:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error creando período' };
    }
  }

  static async loadEmployeesForLiquidation(periodId: string): Promise<PayrollEmployee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        logger.error('❌ Error loading employees:', error);
        return [];
      }

      return await Promise.all(
        (employees || []).map(async (emp) => {
          const calculation = await PayrollCalculationBackendService.calculatePayroll({
            baseSalary: Number(emp.salario_base) || 0,
            workedDays: emp.dias_trabajo || 30,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: 'mensual',
          });

          return {
            id: emp.id,
            name: `${emp.nombre} ${emp.apellido}`,
            position: emp.cargo || 'No especificado',
            baseSalary: Number(emp.salario_base) || 0,
            grossPay: calculation.grossPay,
            deductions: calculation.totalDeductions,
            netPay: calculation.netPay,
            status: 'valid' as const,
            errors: []
          };
        })
      );
    } catch (error) {
      logger.error('❌ Error loading employees for liquidation:', error);
      return [];
    }
  }

  static async getPayrollHistory(): Promise<PayrollPeriod[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        logger.error('❌ Error loading payroll history:', error);
        return [];
      }

      return (periods || []).map(period => ({
        id: period.id,
        periodo: period.periodo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        estado: PayrollStateManager.normalizeState(period.estado),
        tipo_periodo: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
        empleados_count: period.empleados_count || 0,
        total_devengado: Number(period.total_devengado) || 0,
        total_deducciones: Number(period.total_deducciones) || 0,
        total_neto: Number(period.total_neto) || 0
      }));
    } catch (error) {
      logger.error('❌ Error loading payroll history:', error);
      return [];
    }
  }

  static async closePeriod(periodId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ estado: 'cerrado', updated_at: new Date().toISOString() })
        .eq('id', periodId);

      if (error) throw error;

      await supabase
        .from('payrolls')
        .update({ estado: 'procesada' })
        .eq('period_id', periodId);

      return { success: true, message: 'Período cerrado exitosamente' };
    } catch (error) {
      logger.error('❌ Error closing period:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error cerrando período' };
    }
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      logger.error('Error getting company ID:', error);
      return null;
    }
  }

  private static generatePeriodName(date: Date): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}
