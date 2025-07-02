
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollCalculationUnifiedService } from './PayrollCalculationUnifiedService';

export class PayrollLiquidationNewService {
  static async loadEmployeesForActivePeriod(period: any): Promise<PayrollEmployee[]> {
    try {
      console.log('🔍 Cargando empleados para período:', period.periodo);
      console.log('📅 Período completo:', period);

      const companyId = period.company_id;
      
      // Obtener empleados activos de la empresa
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (employeesError) {
        console.error('❌ Error cargando empleados:', employeesError);
        throw employeesError;
      }

      console.log(`👥 Empleados activos encontrados: ${employees?.length || 0}`);

      if (!employees || employees.length === 0) {
        console.log('⚠️ No se encontraron empleados activos');
        return [];
      }

      // Buscar nóminas existentes para este período
      const { data: existingPayrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo', period.periodo);

      if (payrollsError) {
        console.error('❌ Error consultando nóminas existentes:', payrollsError);
      }

      console.log(`💼 Nóminas existentes para período: ${existingPayrolls?.length || 0}`);

      // Obtener novedades para el período
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', period.id);

      if (novedadesError) {
        console.error('❌ Error cargando novedades:', novedadesError);
      }

      console.log(`📋 Novedades encontradas: ${novedades?.length || 0}`);

      // Procesar cada empleado
      const processedEmployees: PayrollEmployee[] = [];

      for (const employee of employees) {
        try {
          // Buscar nómina existente para este empleado en este período
          const existingPayroll = existingPayrolls?.find(p => p.employee_id === employee.id);
          
          // Filtrar novedades para este empleado
          const employeeNovedades = novedades?.filter(n => n.empleado_id === employee.id) || [];

          let payrollEmployee: PayrollEmployee;

          if (existingPayroll) {
            // Usar datos de nómina existente
            console.log(`✅ Usando nómina existente para: ${employee.nombre}`);
            payrollEmployee = this.mapExistingPayrollToEmployee(employee, existingPayroll);
          } else {
            // Calcular nueva nómina
            console.log(`🔄 Calculando nueva nómina para: ${employee.nombre}`);
            payrollEmployee = await this.calculateEmployeePayroll(employee, period, employeeNovedades);
          }

          processedEmployees.push(payrollEmployee);
        } catch (error) {
          console.error(`❌ Error procesando empleado ${employee.nombre}:`, error);
          
          // Crear entrada con error
          processedEmployees.push({
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            position: employee.cargo || 'Sin cargo',
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: 30,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            grossPay: 0,
            deductions: 0,
            netPay: 0,
            status: 'error',
            errors: [`Error procesando: ${error}`],
            eps: employee.eps || '',
            afp: employee.afp || '',
            transportAllowance: 0,
            employerContributions: 0
          });
        }
      }

      console.log(`✅ Empleados procesados exitosamente: ${processedEmployees.length}`);
      console.log(`📊 Estado de empleados:`, {
        valid: processedEmployees.filter(e => e.status === 'valid').length,
        error: processedEmployees.filter(e => e.status === 'error').length,
        incomplete: processedEmployees.filter(e => e.status === 'incomplete').length
      });

      return processedEmployees;

    } catch (error) {
      console.error('💥 Error crítico en loadEmployeesForActivePeriod:', error);
      throw error;
    }
  }

  private static mapExistingPayrollToEmployee(employee: any, payroll: any): PayrollEmployee {
    return {
      id: employee.id,
      name: `${employee.nombre} ${employee.apellido}`,
      position: employee.cargo || 'Sin cargo',
      baseSalary: Number(payroll.salario_base) || 0,
      workedDays: payroll.dias_trabajados || 30,
      extraHours: Number(payroll.horas_extra) || 0,
      disabilities: 0, // Calcular desde novedades si es necesario
      bonuses: Number(payroll.bonificaciones) || 0,
      absences: 0, // Calcular desde novedades si es necesario
      grossPay: Number(payroll.total_devengado) || 0,
      deductions: Number(payroll.total_deducciones) || 0,
      netPay: Number(payroll.neto_pagado) || 0,
      status: 'valid',
      errors: [],
      eps: employee.eps || '',
      afp: employee.afp || '',
      transportAllowance: Number(payroll.auxilio_transporte) || 0,
      employerContributions: this.calculateEmployerContributions(Number(payroll.salario_base) || 0)
    };
  }

  private static async calculateEmployeePayroll(employee: any, period: any, novedades: any[]): Promise<PayrollEmployee> {
    try {
      const baseSalary = Number(employee.salario_base) || 0;
      
      // Usar el servicio de cálculo unificado
      const calculation = await PayrollCalculationUnifiedService.calculateEmployeePayroll({
        employee: {
          id: employee.id,
          name: `${employee.nombre} ${employee.apellido}`,
          baseSalary,
          workedDays: employee.dias_trabajo || 30,
          // Mapear otros campos necesarios
        },
        period,
        novedades
      });

      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary,
        workedDays: employee.dias_trabajo || 30,
        extraHours: calculation.extraHours || 0,
        disabilities: calculation.disabilities || 0,
        bonuses: calculation.bonuses || 0,
        absences: calculation.absences || 0,
        grossPay: calculation.grossPay || baseSalary,
        deductions: calculation.deductions || 0,
        netPay: calculation.netPay || baseSalary,
        status: 'valid',
        errors: [],
        eps: employee.eps || '',
        afp: employee.afp || '',
        transportAllowance: calculation.transportAllowance || 0,
        employerContributions: this.calculateEmployerContributions(baseSalary)
      };
    } catch (error) {
      console.error('❌ Error en cálculo de nómina:', error);
      
      // Retornar cálculo básico en caso de error
      const baseSalary = Number(employee.salario_base) || 0;
      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary,
        workedDays: employee.dias_trabajo || 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: baseSalary,
        deductions: baseSalary * 0.08, // 8% aproximado para deducciones básicas
        netPay: baseSalary * 0.92,
        status: 'incomplete',
        errors: ['Cálculo simplificado - revisar manualmente'],
        eps: employee.eps || '',
        afp: employee.afp || '',
        transportAllowance: 0,
        employerContributions: this.calculateEmployerContributions(baseSalary)
      };
    }
  }

  private static calculateEmployerContributions(baseSalary: number): number {
    // Cálculo aproximado de aportes patronales (12% salud + 12% pensión + 8.5% ARL/CCF)
    return baseSalary * 0.325;
  }

  static async updateEmployeeCount(periodId: string, count: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ empleados_count: count })
        .eq('id', periodId);

      if (error) throw error;
      
      console.log(`✅ Contador de empleados actualizado: ${count}`);
    } catch (error) {
      console.error('❌ Error actualizando contador de empleados:', error);
    }
  }
}
