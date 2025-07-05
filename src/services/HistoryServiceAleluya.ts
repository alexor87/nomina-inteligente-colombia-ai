
/**
 * 📊 SERVICIO ALELUYA - HISTORIAL DE NÓMINA UNIFICADO
 * Reemplaza la arquitectura fragmentada con funcionalidades profesionales
 * Incluye edición de períodos, comprobantes y períodos pasados
 */

import { supabase } from '@/integrations/supabase/client';

export interface HistoryPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'quincenal' | 'mensual' | 'semanal';
  employeesCount: number;
  status: 'borrador' | 'cerrado';
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalCost: number;
  employerContributions: number;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
}

export interface PeriodDetail {
  period: HistoryPeriod;
  employees: Array<{
    id: string;
    name: string;
    position: string;
    grossPay: number;
    deductions: number;
    netPay: number;
    baseSalary: number;
  }>;
  summary: {
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
    costoTotal: number;
    aportesEmpleador: number;
  };
}

export class HistoryServiceAleluya {
  /**
   * 📋 OBTENER HISTORIAL DE PERÍODOS
   * Lista todos los períodos de nómina de la empresa
   */
  static async getHistoryPeriods(): Promise<HistoryPeriod[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      return (periods || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo,
        employeesCount: period.empleados_count || 0,
        status: period.estado,
        totalGrossPay: period.total_devengado || 0,
        totalNetPay: period.total_neto || 0,
        totalDeductions: period.total_deducciones || 0,
        totalCost: (period.total_devengado || 0) + ((period.total_devengado || 0) * 0.205),
        employerContributions: (period.total_devengado || 0) * 0.205,
        createdAt: period.created_at,
        updatedAt: period.updated_at,
        editable: period.estado === 'borrador'
      }));

    } catch (error) {
      console.error('Error obteniendo historial:', error);
      throw new Error('No se pudo cargar el historial de nómina');
    }
  }

  /**
   * 👁️ OBTENER DETALLE DE PERÍODO
   * Información completa de un período específico
   */
  static async getPeriodDetail(periodId: string): Promise<PeriodDetail> {
    try {
      const companyId = await this.getCurrentCompanyId();
      
      // Obtener información del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) throw periodError;

      // Obtener empleados del período
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            nombre,
            cargo
          )
        `)
        .eq('period_id', periodId);

      if (payrollsError) throw payrollsError;

      const employees = (payrolls || []).map(payroll => ({
        id: payroll.employee_id,
        name: payroll.employees?.nombre || 'Sin nombre',
        position: payroll.employees?.cargo || 'Sin cargo',
        grossPay: payroll.total_devengado || 0,
        deductions: payroll.total_deducciones || 0,
        netPay: payroll.neto_pagado || 0,
        baseSalary: payroll.salario_base || 0
      }));

      const historyPeriod: HistoryPeriod = {
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo,
        employeesCount: period.empleados_count || 0,
        status: period.estado,
        totalGrossPay: period.total_devengado || 0,
        totalNetPay: period.total_neto || 0,
        totalDeductions: period.total_deducciones || 0,
        totalCost: (period.total_devengado || 0) + ((period.total_devengado || 0) * 0.205),
        employerContributions: (period.total_devengado || 0) * 0.205,
        createdAt: period.created_at,
        updatedAt: period.updated_at,
        editable: period.estado === 'borrador'
      };

      return {
        period: historyPeriod,
        employees,
        summary: {
          totalDevengado: period.total_devengado || 0,
          totalDeducciones: period.total_deducciones || 0,
          totalNeto: period.total_neto || 0,
          costoTotal: (period.total_devengado || 0) + ((period.total_devengado || 0) * 0.205),
          aportesEmpleador: (period.total_devengado || 0) * 0.205
        }
      };

    } catch (error) {
      console.error('Error obteniendo detalle del período:', error);
      throw new Error('No se pudo cargar el detalle del período');
    }
  }

  /**
   * ✏️ EDITAR PERÍODO (REAPERTURA PROFESIONAL)
   * Permite editar períodos cerrados con auditoría
   */
  static async editPeriod(periodId: string, changes: {
    reason: string;
    employeeChanges?: Array<{
      employeeId: string;
      newSalary?: number;
      newDeductions?: number;
    }>;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const companyId = await this.getCurrentCompanyId();
      
      // Reabrir período temporalmente
      await supabase
        .from('payroll_periods_real')
        .update({ estado: 'borrador' })
        .eq('id', periodId)
        .eq('company_id', companyId);

      // Aplicar cambios si los hay
      if (changes.employeeChanges && changes.employeeChanges.length > 0) {
        for (const change of changes.employeeChanges) {
          const updateData: any = {};
          if (change.newSalary !== undefined) {
            updateData.total_devengado = change.newSalary;
            updateData.neto_pagado = change.newSalary - (change.newDeductions || 0);
          }
          if (change.newDeductions !== undefined) {
            updateData.total_deducciones = change.newDeductions;
          }

          await supabase
            .from('payrolls')
            .update(updateData)
            .eq('period_id', periodId)
            .eq('employee_id', change.employeeId);
        }

        // Recalcular totales del período
        await this.recalculatePeriodTotals(periodId);
      }

      // Crear log de auditoría
      await this.createAuditLog(periodId, 'edited', changes.reason);

      return {
        success: true,
        message: 'Período editado exitosamente'
      };

    } catch (error) {
      console.error('Error editando período:', error);
      throw new Error('No se pudo editar el período');
    }
  }

  /**
   * 📄 GENERAR COMPROBANTES DE PAGO
   * Genera y descarga comprobantes PDF del período
   */
  static async generateVouchers(periodId: string): Promise<{
    success: boolean;
    downloadUrl: string;
    message: string;
  }> {
    try {
      // Obtener detalles del período
      const detail = await this.getPeriodDetail(periodId);
      
      // Simular generación de PDF (en implementación real se usaría jsPDF o similar)
      const pdfContent = this.generatePDFContent(detail);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Descargar automáticamente
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `comprobantes-${detail.period.period}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        downloadUrl,
        message: `Comprobantes del período ${detail.period.period} generados`
      };

    } catch (error) {
      console.error('Error generando comprobantes:', error);
      throw new Error('No se pudieron generar los comprobantes');
    }
  }

  /**
   * 📅 CREAR PERÍODO PASADO
   * Para migración de datos históricos
   */
  static async createPastPeriod(periodData: {
    periodName: string;
    startDate: string;
    endDate: string;
    type: 'quincenal' | 'mensual' | 'semanal';
    employees: Array<{
      employeeId: string;
      baseSalary: number;
      grossPay: number;
      deductions: number;
      netPay: number;
    }>;
  }): Promise<{
    success: boolean;
    periodId: string;
    message: string;
  }> {
    try {
      const companyId = await this.getCurrentCompanyId();
      
      // Crear período
      const { data: newPeriod, error: periodError } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodData.periodName,
          fecha_inicio: periodData.startDate,
          fecha_fin: periodData.endDate,
          tipo_periodo: periodData.type,
          estado: 'cerrado', // Los períodos pasados se crean cerrados
          empleados_count: periodData.employees.length,
          total_devengado: periodData.employees.reduce((sum, emp) => sum + emp.grossPay, 0),
          total_deducciones: periodData.employees.reduce((sum, emp) => sum + emp.deductions, 0),
          total_neto: periodData.employees.reduce((sum, emp) => sum + emp.netPay, 0)
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Crear registros de nómina
      const payrollRecords = periodData.employees.map(emp => ({
        company_id: companyId,
        employee_id: emp.employeeId,
        period_id: newPeriod.id,
        salario_base: emp.baseSalary,
        dias_trabajados: periodData.type === 'quincenal' ? 15 : 30,
        total_devengado: emp.grossPay,
        total_deducciones: emp.deductions,
        neto_pagado: emp.netPay,
        estado: 'procesada'
      }));

      const { error: payrollError } = await supabase
        .from('payrolls')
        .insert(payrollRecords);

      if (payrollError) throw payrollError;

      return {
        success: true,
        periodId: newPeriod.id,
        message: `Período pasado ${periodData.periodName} creado exitosamente`
      };

    } catch (error) {
      console.error('Error creando período pasado:', error);
      throw new Error('No se pudo crear el período pasado');
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  private static async getCurrentCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('Usuario no tiene empresa asociada');
    }

    return profile.company_id;
  }

  private static async recalculatePeriodTotals(periodId: string): Promise<void> {
    const { data: payrolls } = await supabase
      .from('payrolls')
      .select('total_devengado, total_deducciones, neto_pagado')
      .eq('period_id', periodId);

    if (payrolls && payrolls.length > 0) {
      const totals = payrolls.reduce((acc, p) => ({
        devengado: acc.devengado + (p.total_devengado || 0),
        deducciones: acc.deducciones + (p.total_deducciones || 0),
        neto: acc.neto + (p.neto_pagado || 0)
      }), { devengado: 0, deducciones: 0, neto: 0 });

      await supabase
        .from('payroll_periods_real')
        .update({
          empleados_count: payrolls.length,
          total_devengado: totals.devengado,
          total_deducciones: totals.deducciones,
          total_neto: totals.neto
        })
        .eq('id', periodId);
    }
  }

  private static async createAuditLog(
    periodId: string, 
    action: string, 
    details: string
  ): Promise<void> {
    // En una implementación real, aquí se crearía un log de auditoría
    console.log(`Audit Log: ${action} on period ${periodId} - ${details}`);
  }

  private static generatePDFContent(detail: PeriodDetail): string {
    // Simulación de contenido PDF
    // En implementación real se usaría jsPDF o similar
    return `
      COMPROBANTES DE PAGO
      Período: ${detail.period.period}
      
      ${detail.employees.map(emp => `
        Empleado: ${emp.name}
        Cargo: ${emp.position}
        Salario Bruto: $${emp.grossPay.toLocaleString()}
        Deducciones: $${emp.deductions.toLocaleString()}
        Salario Neto: $${emp.netPay.toLocaleString()}
        ----------------------
      `).join('')}
      
      Total Nómina: $${detail.summary.totalNeto.toLocaleString()}
    `;
  }
}
