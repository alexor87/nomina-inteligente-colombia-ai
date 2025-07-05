
/**
 * ✅ SERVICIO DOMINIO DE NÓMINA - ARQUITECTURA CRÍTICA REPARADA
 * Servicio único que maneja toda la lógica de negocio de nómina
 * Reemplaza: PayrollUnifiedService, PayrollLiquidationService, PayrollHistoryService
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollStateManager } from './PayrollStateManager';
import { PayrollCalculationEngine } from './PayrollCalculationEngine';

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
}

export class PayrollDomainService {
  private static stateManager = new PayrollStateManager();
  private static calculator = new PayrollCalculationEngine();

  /**
   * Detectar situación actual del período de nómina
   */
  static async detectCurrentPeriodSituation(): Promise<PeriodDetectionResult> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      // Usar la nueva función SQL optimizada
      const { data, error } = await supabase.rpc('get_current_active_period', {
        p_company_id: companyId
      });

      if (error) {
        console.error('❌ Error detecting period:', error);
        throw error;
      }

      const result = data?.[0];
      
      if (!result || result.needs_creation) {
        return {
          currentPeriod: null,
          needsCreation: true,
          canContinue: false,
          message: 'No hay período activo. Se debe crear un nuevo período.',
          action: 'create'
        };
      }

      const currentPeriod: PayrollPeriod = {
        id: result.period_id,
        periodo: result.period_name,
        fecha_inicio: result.start_date,
        fecha_fin: result.end_date,
        estado: result.status as 'draft' | 'active' | 'closed',
        tipo_periodo: 'mensual', // Default, can be enhanced
        empleados_count: 0,
        total_devengado: 0,
        total_deducciones: 0,
        total_neto: 0
      };

      return {
        currentPeriod,
        needsCreation: false,
        canContinue: result.can_continue,
        message: `Período activo encontrado: ${result.period_name}`,
        action: 'resume'
      };

    } catch (error) {
      console.error('❌ Error en detectCurrentPeriodSituation:', error);
      return {
        currentPeriod: null,
        needsCreation: true,
        canContinue: false,
        message: 'Error detectando período actual',
        action: 'create'
      };
    }
  }

  /**
   * Crear nuevo período de nómina
   */
  static async createNextPeriod(): Promise<{
    success: boolean;
    period?: PayrollPeriod;
    message: string;
  }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      // Generar fechas para el nuevo período
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const periodName = this.generatePeriodName(startDate);

      // Crear período en la base de datos
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate.toISOString().split('T')[0],
          fecha_fin: endDate.toISOString().split('T')[0],
          tipo_periodo: 'mensual',
          estado: 'draft'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const period: PayrollPeriod = {
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
      };

      return {
        success: true,
        period,
        message: `Período ${periodName} creado exitosamente`
      };

    } catch (error) {
      console.error('❌ Error creating period:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error creando período'
      };
    }
  }

  /**
   * Cargar empleados para liquidación
   */
  static async loadEmployeesForLiquidation(periodId: string): Promise<PayrollEmployee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return [];
      }

      // Cargar empleados activos
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        console.error('❌ Error loading employees:', error);
        return [];
      }

      // Procesar empleados con cálculos
      const processedEmployees = await Promise.all(
        (employees || []).map(async (emp) => {
          const calculation = await this.calculator.calculateEmployeePayroll({
            baseSalary: Number(emp.salario_base) || 0,
            workedDays: emp.dias_trabajo || 30,
            extraHours: 0,
            bonuses: 0,
            absences: 0
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

      return processedEmployees;

    } catch (error) {
      console.error('❌ Error loading employees for liquidation:', error);
      return [];
    }
  }

  /**
   * Obtener historial de períodos
   */
  static async getPayrollHistory(): Promise<PayrollPeriod[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return [];
      }

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('❌ Error loading payroll history:', error);
        return [];
      }

      return (periods || []).map(period => ({
        id: period.id,
        periodo: period.periodo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        estado: period.estado as 'draft' | 'active' | 'closed',
        tipo_periodo: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
        empleados_count: period.empleados_count || 0,
        total_devengado: Number(period.total_devengado) || 0,
        total_deducciones: Number(period.total_deducciones) || 0,
        total_neto: Number(period.total_neto) || 0
      }));

    } catch (error) {
      console.error('❌ Error loading payroll history:', error);
      return [];
    }
  }

  /**
   * Cerrar período de nómina
   */
  static async closePeriod(periodId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) {
        throw error;
      }

      // También actualizar payrolls relacionados
      await supabase
        .from('payrolls')
        .update({ estado: 'closed' })
        .eq('period_id', periodId);

      return {
        success: true,
        message: 'Período cerrado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error closing period:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error cerrando período'
      };
    }
  }

  // Métodos de utilidad privados
  private static async getCurrentUserCompany_id(): Promise<string | null> {
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
      console.error('Error getting company ID:', error);
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

  // Fix for getCurrentUserCompanyId method name
  private static getCurrentUserCompanyId = this.getCurrentUserCompany_id;
}
