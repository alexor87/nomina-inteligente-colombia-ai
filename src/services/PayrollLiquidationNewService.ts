
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, BaseEmployeeData } from '@/types/payroll';

export class PayrollLiquidationNewService {
  static async loadEmployeesForActivePeriod(period: any): Promise<PayrollEmployee[]> {
    try {
      console.log('🔍 PayrollLiquidationNewService: Iniciando carga de empleados...');
      console.log('📅 Período recibido:', period);
      
      // Get current user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Usuario actual:', user?.id);
      
      if (!user) {
        console.log('❌ No hay usuario autenticado');
        throw new Error('No hay usuario autenticado');
      }

      // Get user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.log('❌ Error obteniendo perfil:', profileError);
        throw profileError;
      }

      if (!profile?.company_id) {
        console.log('❌ Usuario no tiene empresa asignada');
        throw new Error('Usuario no tiene empresa asignada');
      }

      console.log('🏢 Company ID:', profile.company_id);

      // Load employees from the company
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('estado', 'activo');

      if (employeesError) {
        console.log('❌ Error cargando empleados:', employeesError);
        throw employeesError;
      }

      console.log('📋 Empleados encontrados en BD:', employees?.length || 0);
      console.log('👥 Lista de empleados raw:', employees?.map(emp => ({
        id: emp.id,
        nombre: emp.nombre,
        apellido: emp.apellido,
        salario_base: emp.salario_base,
        estado: emp.estado
      })));

      if (!employees || employees.length === 0) {
        console.log('⚠️ No se encontraron empleados activos');
        return [];
      }

      // Transform employees to PayrollEmployee format
      const payrollEmployees: PayrollEmployee[] = employees.map(employee => {
        const baseSalary = Number(employee.salario_base) || 0;
        const transportAllowance = baseSalary <= 2600000 ? 140606 : 0; // 2024 transport allowance
        const grossPay = baseSalary + transportAllowance;
        
        // Calculate basic deductions (health + pension)
        const healthDeduction = baseSalary * 0.04; // 4% health
        const pensionDeduction = baseSalary * 0.04; // 4% pension
        const totalDeductions = healthDeduction + pensionDeduction;
        
        const netPay = grossPay - totalDeductions;
        
        // Calculate employer contributions
        const employerHealth = baseSalary * 0.085; // 8.5% employer health
        const employerPension = baseSalary * 0.12; // 12% employer pension
        const employerARL = baseSalary * 0.00522; // 0.522% ARL (average)
        const employerSENA = baseSalary * 0.02; // 2% SENA
        const employerICBF = baseSalary * 0.03; // 3% ICBF
        const employerCompensation = baseSalary * 0.04; // 4% Compensation fund
        
        const employerContributions = employerHealth + employerPension + employerARL + 
                                     employerSENA + employerICBF + employerCompensation;

        const payrollEmployee: PayrollEmployee = {
          id: employee.id,
          name: `${employee.nombre} ${employee.apellido}`.trim(),
          position: employee.cargo || 'Sin cargo',
          baseSalary: baseSalary,
          workedDays: 30,
          extraHours: 0,
          disabilities: 0,
          bonuses: 0,
          absences: 0,
          grossPay: grossPay,
          deductions: totalDeductions,
          netPay: netPay,
          status: 'valid',
          errors: [],
          eps: employee.eps,
          afp: employee.afp,
          transportAllowance: transportAllowance,
          employerContributions: employerContributions
        };

        console.log('🔄 Empleado transformado:', {
          id: payrollEmployee.id,
          name: payrollEmployee.name,
          baseSalary: payrollEmployee.baseSalary,
          grossPay: payrollEmployee.grossPay,
          netPay: payrollEmployee.netPay
        });

        return payrollEmployee;
      });

      console.log('✅ Total empleados transformados:', payrollEmployees.length);
      return payrollEmployees;

    } catch (error) {
      console.error('💥 Error en loadEmployeesForActivePeriod:', error);
      throw error;
    }
  }

  static async updateEmployeeCount(periodId: string, count: number): Promise<void> {
    try {
      console.log('📊 Actualizando contador de empleados:', { periodId, count });
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ empleados_count: count })
        .eq('id', periodId);

      if (error) {
        console.log('❌ Error actualizando contador:', error);
        throw error;
      }

      console.log('✅ Contador actualizado correctamente');
    } catch (error) {
      console.error('💥 Error actualizando contador de empleados:', error);
      throw error;
    }
  }
}
