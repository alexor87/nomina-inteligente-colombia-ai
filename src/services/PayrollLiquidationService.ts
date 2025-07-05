
import { supabase } from '@/integrations/supabase/client';
import { NovedadesCalculationService } from './NovedadesCalculationService';
import { ConfigurationService } from './ConfigurationService';
import { DeductionCalculationService } from './DeductionCalculationService';
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
}

export class PayrollLiquidationService {
  
  static async getCurrentUserCompanyId(): Promise<string | null> {
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

  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both dates
    return Math.min(diffDays, 30); // Max 30 days per month
  }

  static calculateTransportAllowance(baseSalary: number, workedDays: number): number {
    const currentYear = new Date().getFullYear().toString();
    const config = ConfigurationService.getConfiguration(currentYear);
    
    // Calcular dos salarios mínimos legales
    const dosSmmlv = config.salarioMinimo * 2;
    
    // Solo aplica auxilio de transporte si el salario es menor o igual a 2 SMMLV
    if (baseSalary <= dosSmmlv) {
      // Calcular auxilio proporcional según días trabajados
      return Math.round((config.auxilioTransporte / 30) * workedDays);
    }
    
    return 0;
  }

  static async ensurePeriodExists(startDate: string, endDate: string): Promise<string> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
      
      // Check if period already exists
      const { data: existingPeriod } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .single();

      if (existingPeriod) {
        return existingPeriod.id;
      }

      // Create new period
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: 'personalizado',
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return newPeriod.id;
    } catch (error) {
      console.error('Error ensuring period exists:', error);
      throw error;
    }
  }

  static async loadEmployeesForPeriod(startDate: string, endDate: string): Promise<Employee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Load active employees
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, salario_base')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        throw error;
      }

      if (!employees || employees.length === 0) {
        return [];
      }

      // Calculate working days for the period
      const diasTrabajados = this.calculateWorkingDays(startDate, endDate);

      // Process each employee using the comprehensive deduction service
      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        // Use DeductionCalculationService for comprehensive deduction calculation
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual' // Adjust based on period type
        });
        
        console.log(`📊 Empleado ${employee.nombre}: Deducciones completas calculadas`, {
          totalDevengado,
          totalDeducciones: deductionResult.totalDeducciones,
          fondoSolidaridad: deductionResult.fondoSolidaridad,
          netoPagar: totalDevengado - deductionResult.totalDeducciones
        });
        
        return {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          salario_base: employee.salario_base,
          devengos: 0, // Will be calculated from novedades
          deducciones: deductionResult.totalDeducciones, // Includes all legal deductions including Fondo Solidaridad
          total_pagar: totalDevengado - deductionResult.totalDeducciones, // Net pay after all deductions
          dias_trabajados: diasTrabajados,
          auxilio_transporte: auxilioTransporte
        };
      }));

      return processedEmployees;
    } catch (error) {
      console.error('Error loading employees for period:', error);
      throw error;
    }
  }

  static async liquidatePayroll(employees: Employee[], startDate: string, endDate: string) {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Create period name
      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;

      // Create period in payroll_periods_real
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
          total_devengado: employees.reduce((sum, emp) => sum + emp.salario_base + emp.devengos + emp.auxilio_transporte, 0),
          total_deducciones: employees.reduce((sum, emp) => sum + emp.deducciones, 0),
          total_neto: employees.reduce((sum, emp) => sum + emp.total_pagar, 0)
        })
        .select()
        .single();

      if (periodError) {
        throw periodError;
      }

      // Create payroll records for each employee
      for (const employee of employees) {
        const { error: payrollError } = await supabase
          .from('payrolls')
          .insert({
            company_id: companyId,
            employee_id: employee.id,
            periodo: periodName,
            period_id: period.id,
            salario_base: employee.salario_base,
            dias_trabajados: employee.dias_trabajados,
            auxilio_transporte: employee.auxilio_transporte,
            total_devengado: employee.salario_base + employee.devengos + employee.auxilio_transporte,
            total_deducciones: employee.deducciones,
            neto_pagado: employee.total_pagar,
            estado: 'procesada'
          });

        if (payrollError) {
          console.error('Error creating payroll record:', payrollError);
        }

        // Create voucher record
        const { error: voucherError } = await supabase
          .from('payroll_vouchers')
          .insert({
            company_id: companyId,
            employee_id: employee.id,
            payroll_id: null, // Will be updated if needed
            periodo: periodName,
            start_date: startDate,
            end_date: endDate,
            net_pay: employee.total_pagar,
            voucher_status: 'generado'
          });

        if (voucherError) {
          console.error('Error creating voucher record:', voucherError);
        }
      }

      return {
        success: true,
        message: `Liquidación completada para ${employees.length} empleados`,
        periodId: period.id
      };
    } catch (error) {
      console.error('Error liquidating payroll:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
