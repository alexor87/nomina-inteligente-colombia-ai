
import { supabase } from '@/integrations/supabase/client';
import { EmployeeService } from './EmployeeService';
import { EmployeeCRUDService } from './EmployeeCRUDService';
import { EmployeeUnified } from '@/types/employee-unified';
import { PayrollCalculationBackendService } from './PayrollCalculationBackendService';

export interface UnifiedEmployeeData {
  id: string;
  name: string;
  baseSalary: number;
  workedDays: number;
  transportAllowance: number;
  totalEarnings: number;
  healthDeduction: number;
  pensionDeduction: number;
  totalDeductions: number;
  netPay: number;
  status: 'valid' | 'error';
  errors: string[];
}

export class EmployeeUnifiedService {
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
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  // ✅ CRUD Methods - Delegating to existing services
  static async create(employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>) {
    console.log('🔄 EmployeeUnifiedService.create: Delegating to EmployeeService');
    return EmployeeService.createEmployee(employeeData);
  }

  static async update(id: string, updates: Partial<EmployeeUnified>) {
    console.log('🔄 EmployeeUnifiedService.update: Delegating to EmployeeService');
    return EmployeeService.updateEmployee(id, updates);
  }

  static async delete(id: string) {
    console.log('🔄 EmployeeUnifiedService.delete: Delegating to EmployeeService');
    return EmployeeService.deleteEmployee(id);
  }

  static async getAll() {
    console.log('🔄 EmployeeUnifiedService.getAll: Delegating to EmployeeService');
    return EmployeeService.getEmployees();
  }

  static async getEmployeeById(id: string) {
    console.log('🔄 EmployeeUnifiedService.getEmployeeById: Delegating to EmployeeService');
    const employee = await EmployeeService.getEmployeeById(id);
    if (!employee) {
      return { success: false, error: 'Empleado no encontrado' };
    }
    return { success: true, data: employee };
  }

  static async changeStatus(id: string, newStatus: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad') {
    console.log('🔄 EmployeeUnifiedService.changeStatus: Updating employee status');
    return EmployeeService.updateEmployee(id, { estado: newStatus });
  }

  // ✅ PAYROLL Methods - Usando ÚNICAMENTE PayrollCalculationSimple
  static async getEmployeesForPeriod(periodId: string): Promise<UnifiedEmployeeData[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      console.log('🎯 Cargando empleados con cálculos SIMPLES 2025...');

      // Obtener empleados del período
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          salario_base,
          dias_trabajados,
          employees!inner (
            id,
            nombre,
            apellido,
            salario_base
          )
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollError) {
        throw payrollError;
      }

      if (!payrollData || payrollData.length === 0) {
        return [];
      }

      // Procesar cada empleado con cálculos BACKEND
      const processedEmployees: UnifiedEmployeeData[] = await Promise.all(payrollData.map(async payroll => {
        const employee = payroll.employees;
        const baseSalary = employee.salario_base;
        const workedDays = payroll.dias_trabajados;

        try {
          // ✅ CAMBIO: Usar backend exclusivamente
          const calculation = await PayrollCalculationBackendService.calculatePayroll({
            baseSalary,
            workedDays,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: 'mensual',
            novedades: []
          });

          console.log(`✅ BACKEND ${employee.nombre}: Base $${baseSalary.toLocaleString()}, Días ${workedDays}, Auxilio $${calculation.transportAllowance.toLocaleString()}, Neto $${calculation.netPay.toLocaleString()}`);

          return {
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            baseSalary,
            workedDays,
            transportAllowance: calculation.transportAllowance,
            totalEarnings: calculation.grossPay,
            healthDeduction: calculation.healthDeduction,
            pensionDeduction: calculation.pensionDeduction,
            totalDeductions: calculation.totalDeductions,
            netPay: calculation.netPay,
            status: 'valid' as const,
            errors: []
          };
        } catch (error) {
          console.error(`❌ Error calculando empleado ${employee.nombre}:`, error);
          return {
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            baseSalary,
            workedDays,
            transportAllowance: 0,
            totalEarnings: 0,
            healthDeduction: 0,
            pensionDeduction: 0,
            totalDeductions: 0,
            netPay: 0,
            status: 'error' as const,
            errors: ['Error en cálculo: ' + (error instanceof Error ? error.message : 'Error desconocido')]
          };
        }
      }));

      console.log(`📊 Total empleados procesados: ${processedEmployees.length}`);
      console.log(`💰 Empleados con auxilio: ${processedEmployees.filter(e => e.transportAllowance > 0).length}`);

      return processedEmployees;
    } catch (error) {
      console.error('❌ Error in getEmployeesForPeriod:', error);
      throw error;
    }
  }

  static async updatePayrollRecords(periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      console.log('🔄 Actualizando registros de nómina con cálculos SIMPLES...');

      // Obtener empleados con cálculos SIMPLES
      const correctedEmployees = await this.getEmployeesForPeriod(periodId);

      // Actualizar cada registro en la base de datos
      for (const employee of correctedEmployees) {
        const { error } = await supabase
          .from('payrolls')
          .update({
            auxilio_transporte: employee.transportAllowance,
            total_devengado: employee.totalEarnings,
            salud_empleado: employee.healthDeduction,
            pension_empleado: employee.pensionDeduction,
            total_deducciones: employee.totalDeductions,
            neto_pagado: employee.netPay,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employee.id)
          .eq('period_id', periodId)
          .eq('company_id', companyId);

        if (error) {
          console.error(`❌ Error actualizando empleado ${employee.name}:`, error);
        } else {
          console.log(`✅ Actualizado ${employee.name}: Neto $${employee.netPay.toLocaleString()}`);
        }
      }

      // Actualizar totales del período
      const totalDevengado = correctedEmployees.reduce((sum, emp) => sum + emp.totalEarnings, 0);
      const totalDeducciones = correctedEmployees.reduce((sum, emp) => sum + emp.totalDeductions, 0);
      const totalNeto = correctedEmployees.reduce((sum, emp) => sum + emp.netPay, 0);

      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (periodError) {
        console.error('❌ Error actualizando totales del período:', periodError);
      } else {
        console.log('✅ Totales del período actualizados correctamente');
      }

    } catch (error) {
      console.error('❌ Error in updatePayrollRecords:', error);
      throw error;
    }
  }

  static getConfigurationInfo() {
    return PayrollCalculationBackendService.getConfigurationInfo();
  }
}
