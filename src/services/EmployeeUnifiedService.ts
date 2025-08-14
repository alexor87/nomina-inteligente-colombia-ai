
import { supabase } from '@/integrations/supabase/client';
import { SecureEmployeeService } from './SecureEmployeeService';
// ✅ KISS: Removed EmployeeCRUDService - now using SecureEmployeeService only
import { EmployeeUnified } from '@/types/employee-unified';
import { PayrollLiquidationNewService } from './PayrollLiquidationNewService';
import { SALARIO_MINIMO_2025, AUXILIO_TRANSPORTE_2025, LIMITE_AUXILIO_TRANSPORTE_2025 } from '@/constants';

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
  status: 'valid' | 'error' | 'incomplete';
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

  // 🔒 CRUD Methods - Delegating to SecureEmployeeService for security
  static async create(employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>) {
    console.log('🔒 EmployeeUnifiedService.create: Delegating to SecureEmployeeService');
    return SecureEmployeeService.createEmployee(employeeData);
  }

  static async update(id: string, updates: Partial<EmployeeUnified>) {
    console.log('🔒 EmployeeUnifiedService.update: Delegating to SecureEmployeeService');
    return SecureEmployeeService.updateEmployee(id, updates);
  }

  static async delete(id: string) {
    console.log('🔒 EmployeeUnifiedService.delete: Delegating to SecureEmployeeService');
    return SecureEmployeeService.deleteEmployee(id);
  }

  static async getAll() {
    console.log('🔒 EmployeeUnifiedService.getAll: Delegating to SecureEmployeeService');
    return SecureEmployeeService.getEmployees();
  }

  static async getEmployeeById(id: string) {
    console.log('🔒 EmployeeUnifiedService.getEmployeeById: Delegating to SecureEmployeeService');
    const employee = await SecureEmployeeService.getEmployeeById(id);
    if (!employee) {
      return { success: false, error: 'Empleado no encontrado' };
    }
    return { success: true, data: employee };
  }

  static async changeStatus(id: string, newStatus: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad') {
    console.log('🔒 EmployeeUnifiedService.changeStatus: Updating employee status securely');
    return SecureEmployeeService.updateEmployee(id, { estado: newStatus });
  }

  // ✅ PAYROLL Methods - Usando PayrollLiquidationNewService con valores 2025
  static async getEmployeesForPeriod(periodId: string): Promise<UnifiedEmployeeData[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      console.log('🎯 Cargando empleados con PayrollLiquidationNewService (valores 2025)...');

      // Obtener período para información adicional
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (!period) {
        throw new Error('Período no encontrado');
      }

      // Usar PayrollLiquidationNewService para cargar empleados con cálculos correctos
      const payrollEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);

      // Convertir a formato UnifiedEmployeeData
      const processedEmployees: UnifiedEmployeeData[] = payrollEmployees.map(employee => {
        console.log(`✅ ALELUYA 2025 ${employee.name}: Base $${employee.baseSalary.toLocaleString()}, Días ${employee.workedDays}, Auxilio $${employee.transportAllowance.toLocaleString()}, Salud $${employee.healthDeduction.toLocaleString()}, Pensión $${employee.pensionDeduction.toLocaleString()}, Neto $${employee.netPay.toLocaleString()}`);

        return {
          id: employee.id,
          name: employee.name,
          baseSalary: employee.baseSalary,
          workedDays: employee.workedDays,
          transportAllowance: employee.transportAllowance,
          totalEarnings: employee.grossPay,
          healthDeduction: employee.healthDeduction, // ✅ Usar valor real calculado
          pensionDeduction: employee.pensionDeduction, // ✅ Usar valor real calculado
          totalDeductions: employee.deductions,
          netPay: employee.netPay,
          status: employee.status === 'incomplete' ? 'error' : employee.status as 'valid' | 'error',
          errors: employee.errors
        };
      });

      console.log(`📊 Total empleados procesados con ALELUYA 2025: ${processedEmployees.length}`);
      console.log(`💰 Empleados con auxilio: ${processedEmployees.filter(e => e.transportAllowance > 0).length}`);
      console.log(`🔢 Valores 2025 - Salario mínimo: ${SALARIO_MINIMO_2025.toLocaleString()}, Auxilio: ${AUXILIO_TRANSPORTE_2025.toLocaleString()}, Límite: ${LIMITE_AUXILIO_TRANSPORTE_2025.toLocaleString()}`);

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

      console.log('🔄 Actualizando registros de nómina con PayrollLiquidationNewService (valores 2025)...');

      // Obtener empleados con cálculos de PayrollLiquidationNewService
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
    return {
      salarioMinimo: SALARIO_MINIMO_2025,
      auxilioTransporte: AUXILIO_TRANSPORTE_2025,
      limiteAuxilio: LIMITE_AUXILIO_TRANSPORTE_2025
    };
  }
}
