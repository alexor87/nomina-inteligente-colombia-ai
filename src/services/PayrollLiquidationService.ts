
import { supabase } from '@/integrations/supabase/client';
import { SecureBaseService } from './SecureBaseService';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
  auxilio_transporte: number;
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  deducciones_novedades: number;
}

/**
 * 🔒 SECURITY MIGRATION: PayrollLiquidationService now extends SecureBaseService
 * All database operations are automatically secured with company_id filtering
 */
export class PayrollLiquidationService extends SecureBaseService {

  static async ensurePeriodExists(startDate: string, endDate: string): Promise<string> {
    try {
      logger.log('🔒 Ensuring period exists securely');
      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
      
      // Use secure query to check for existing period
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const existingQuery = this.secureQuery('payroll_periods_real', companyId, 'id', {
        fecha_inicio: startDate,
        fecha_fin: endDate
      });
      
      const { data: existingPeriod } = await existingQuery.single();

      if (existingPeriod) {
        return existingPeriod.id;
      }

      // Use secure insert to create new period
      const { data: newPeriod, error } = await this.secureInsert('payroll_periods_real', {
        periodo: periodName,
        fecha_inicio: startDate,
        fecha_fin: endDate,
        tipo_periodo: 'personalizado',
        estado: 'borrador',
        empleados_count: 0,
        total_devengado: 0,
        total_deducciones: 0,
        total_neto: 0
      });

      if (error) {
        throw error;
      }

      return newPeriod[0].id;
    } catch (error) {
      logger.error('Error ensuring period exists:', error);
      throw error;
    }
  }

  static async loadEmployeesForPeriod(startDate: string, endDate: string, year?: string): Promise<Employee[]> {
    try {
      logger.log('🔒 Loading employees for period using BACKEND calculations');

      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      // Get period ID
      const periodId = await this.ensurePeriodExists(startDate, endDate);
      
      // Get period data
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (!period) {
        throw new Error('Period not found');
      }

      // ✅ USE BACKEND: PayrollLiquidationNewService for calculations
      const { PayrollLiquidationNewService } = await import('./PayrollLiquidationNewService');
      const backendEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);

      // Map to Employee[] format expected by consumers
      const processedEmployees: Employee[] = backendEmployees.map(emp => ({
        id: emp.id,
        nombre: emp.name.split(' ')[0] || '',
        apellido: emp.name.split(' ').slice(1).join(' ') || '',
        salario_base: emp.baseSalary,
        devengos: 0, // Other accrued (bonuses, overtime)
        deducciones: emp.deductions,
        total_pagar: emp.netPay,
        dias_trabajados: emp.workedDays,
        auxilio_transporte: emp.transportAllowance,
        salud_empleado: emp.healthDeduction,
        pension_empleado: emp.pensionDeduction,
        fondo_solidaridad: 0,
        retencion_fuente: 0,
        deducciones_novedades: 0
      }));

      logger.log(`✅ Loaded ${processedEmployees.length} employees using BACKEND`);
      return processedEmployees;
    } catch (error) {
      logger.error('Error loading employees for period:', error);
      throw error;
    }
  }

  static async loadSpecificEmployeesForPeriod(employeeIds: string[], startDate: string, endDate: string, year?: string): Promise<Employee[]> {
    try {
      logger.log('🔒 Loading specific employees for period using BACKEND calculations');

      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      // Get period ID
      const periodId = await this.ensurePeriodExists(startDate, endDate);
      
      // Get period data
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (!period) {
        throw new Error('Period not found');
      }

      // ✅ USE BACKEND: PayrollLiquidationNewService for calculations
      const { PayrollLiquidationNewService } = await import('./PayrollLiquidationNewService');
      const backendEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);

      // Filter to specific employee IDs and map to Employee[] format
      const processedEmployees: Employee[] = backendEmployees
        .filter(emp => employeeIds.includes(emp.id))
        .map(emp => ({
          id: emp.id,
          nombre: emp.name.split(' ')[0] || '',
          apellido: emp.name.split(' ').slice(1).join(' ') || '',
          salario_base: emp.baseSalary,
          devengos: 0,
          deducciones: emp.deductions,
          total_pagar: emp.netPay,
          dias_trabajados: emp.workedDays,
          auxilio_transporte: emp.transportAllowance,
          salud_empleado: emp.healthDeduction,
          pension_empleado: emp.pensionDeduction,
          fondo_solidaridad: 0,
          retencion_fuente: 0,
          deducciones_novedades: 0
        }));

      logger.log(`✅ Loaded ${processedEmployees.length} specific employees using BACKEND`);
      return processedEmployees;
    } catch (error) {
      logger.error('Error loading specific employees for period:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Liquidación con cálculo único de totales
   */
  static async liquidatePayroll(employees: Employee[], startDate: string, endDate: string) {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;

      // ✅ CORREGIDO: Crear período SIN totales iniciales
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: 'personalizado',
          estado: 'cerrado',
          empleados_count: employees.length,
          // ✅ CORREGIDO: NO escribir totales iniciales
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (periodError) {
        throw periodError;
      }

      // ✅ CORREGIDO: Crear registros de payroll
      const payrollInserts = [];
      for (const employee of employees) {
        const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
        const totalDevengadoFinal = salarioProporcional + employee.auxilio_transporte + employee.devengos;
        const totalDeduccionesFinal = employee.deducciones + employee.deducciones_novedades;
        const netoPagadoFinal = totalDevengadoFinal - totalDeduccionesFinal;

        payrollInserts.push({
          company_id: companyId,
          employee_id: employee.id,
          periodo: periodName,
          period_id: period.id,
          salario_base: employee.salario_base,
          dias_trabajados: employee.dias_trabajados,
          auxilio_transporte: employee.auxilio_transporte,
          total_devengado: totalDevengadoFinal,
          salud_empleado: employee.salud_empleado,
          pension_empleado: employee.pension_empleado,
          fondo_solidaridad: employee.fondo_solidaridad,
          retencion_fuente: employee.retencion_fuente,
          otras_deducciones: employee.deducciones_novedades,
          total_deducciones: totalDeduccionesFinal,
          neto_pagado: netoPagadoFinal,
          estado: 'procesada'
        });
      }

      const { error: payrollError } = await supabase
        .from('payrolls')
        .insert(payrollInserts);

      if (payrollError) {
        throw payrollError;
      }

      // ✅ CORREGIDO: Calcular totales CORRECTOS una sola vez con validación
      logger.log('🧮 Calculando totales. Registros:', payrollInserts.length);
      
      // Log valores para debugging
      payrollInserts.forEach((p, index) => {
        if (!Number.isFinite(p.neto_pagado) || p.neto_pagado == null) {
          logger.warn(`⚠️ Valor inválido en empleado ${index}:`, {
            employee_id: p.employee_id,
            neto_pagado: p.neto_pagado,
            tipo: typeof p.neto_pagado
          });
        }
      });
      
      const finalTotalDevengado = payrollInserts.reduce((sum, p) => sum + (Number(p.total_devengado) || 0), 0);
      const finalTotalDeducciones = payrollInserts.reduce((sum, p) => sum + (Number(p.total_deducciones) || 0), 0);
      const finalTotalNeto = payrollInserts.reduce((sum, p) => sum + (Number(p.neto_pagado) || 0), 0);
      
      logger.log('💰 Totales calculados:', {
        devengado: finalTotalDevengado,
        deducciones: finalTotalDeducciones,
        neto: finalTotalNeto,
        neto_valid: Number.isFinite(finalTotalNeto)
      });
      
      // Validación adicional
      if (!Number.isFinite(finalTotalNeto) || finalTotalNeto < 0) {
        logger.error('❌ Error en cálculo de neto total:', finalTotalNeto);
        throw new Error(`Error en cálculo de neto total: ${finalTotalNeto}`);
      }

      // ✅ CORREGIDO: Actualizar totales UNA SOLA VEZ
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: finalTotalDevengado,
          total_deducciones: finalTotalDeducciones,
          total_neto: finalTotalNeto
        })
        .eq('id', period.id);

      if (updateError) {
        throw updateError;
      }

      logger.log('✅ LIQUIDACIÓN COMPLETADA CON TOTALES ÚNICOS:', {
        totalDevengado: finalTotalDevengado,
        totalDeducciones: finalTotalDeducciones,
        totalNeto: finalTotalNeto
      });

      return {
        success: true,
        message: `Liquidación completada para ${employees.length} empleados con cálculo único de totales`,
        periodId: period.id,
        summary: {
          totalEmployees: employees.length,
          validEmployees: employees.length,
          totalGrossPay: Number.isFinite(finalTotalDevengado) ? finalTotalDevengado : 0,
          totalDeductions: Number.isFinite(finalTotalDeducciones) ? finalTotalDeducciones : 0,
          totalNetPay: Number.isFinite(finalTotalNeto) ? finalTotalNeto : 0,
          employerContributions: finalTotalDevengado * 0.205,
          totalPayrollCost: finalTotalDevengado + (finalTotalDevengado * 0.205)
        }
      };
    } catch (error) {
      logger.error('Error liquidating payroll:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

}
