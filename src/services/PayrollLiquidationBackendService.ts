import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollPeriodService } from './PayrollPeriodService';
import { calculateEmployeeBackend, convertToBaseEmployeeData } from '@/utils/payrollCalculationsBackend';
import { NovedadesService } from './NovedadesService';

export interface PayrollLiquidationData {
  period: PayrollPeriod;
  employees: PayrollEmployee[];
}

export class PayrollLiquidationBackendService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.warn('User profile found but no company_id assigned');
        return null;
      }

      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      return null;
    }
  }

  static async savePayrollLiquidation(data: PayrollLiquidationData): Promise<string> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      const periodo = `${data.period.startDate} al ${data.period.endDate}`;
      console.log('Saving payroll liquidation for period:', periodo);

      // Verificar si ya existen registros para este período y empleados
      const { data: existingPayrolls, error: checkError } = await supabase
        .from('payrolls')
        .select('employee_id')
        .eq('company_id', companyId)
        .eq('periodo', periodo);

      if (checkError) {
        console.error('Error checking existing payrolls:', checkError);
        throw new Error('Error al verificar registros existentes');
      }

      const existingEmployeeIds = new Set(existingPayrolls?.map(p => p.employee_id) || []);
      
      // Filtrar empleados que no tienen registros existentes
      const newEmployees = data.employees.filter(emp => !existingEmployeeIds.has(emp.id));
      
      // Si hay empleados duplicados, actualizar en lugar de insertar
      const duplicateEmployees = data.employees.filter(emp => existingEmployeeIds.has(emp.id));

      let processedCount = 0;
      let savedPayrollIds: string[] = [];

      // Insertar nuevos registros
      if (newEmployees.length > 0) {
        const payrollInserts = newEmployees.map(employee => ({
          company_id: companyId,
          employee_id: employee.id,
          periodo: periodo,
          salario_base: employee.baseSalary,
          dias_trabajados: employee.workedDays,
          horas_extra: 0, // Removed from UI, set to 0
          bonificaciones: 0, // Removed from UI, set to 0
          auxilio_transporte: employee.transportAllowance,
          total_devengado: employee.grossPay,
          salud_empleado: employee.grossPay * 0.04,
          pension_empleado: employee.grossPay * 0.04,
          total_deducciones: employee.deductions,
          neto_pagado: employee.netPay,
          estado: 'procesada'
        }));

        const { data: payrollData, error: payrollError } = await supabase
          .from('payrolls')
          .insert(payrollInserts)
          .select('id');

        if (payrollError) {
          console.error('Error inserting new payrolls:', payrollError);
          throw new Error('Error al insertar nuevos registros de nómina');
        }

        savedPayrollIds = payrollData?.map(p => p.id) || [];
        processedCount += newEmployees.length;
        console.log('Inserted new payrolls:', savedPayrollIds);

        // Generar comprobantes para nuevos empleados
        try {
          await this.generateVouchers(
            { ...data, employees: newEmployees }, 
            payrollData || [], 
            companyId
          );
        } catch (voucherError) {
          console.warn('Warning: Some vouchers could not be generated:', voucherError);
        }
      }

      // Actualizar registros existentes
      if (duplicateEmployees.length > 0) {
        for (const employee of duplicateEmployees) {
          const { data: updatedPayroll, error: updateError } = await supabase
            .from('payrolls')
            .update({
              salario_base: employee.baseSalary,
              dias_trabajados: employee.workedDays,
              horas_extra: 0, // Removed from UI, set to 0
              bonificaciones: 0, // Removed from UI, set to 0
              auxilio_transporte: employee.transportAllowance,
              total_devengado: employee.grossPay,
              salud_empleado: employee.grossPay * 0.04,
              pension_empleado: employee.grossPay * 0.04,
              total_deducciones: employee.deductions,
              neto_pagado: employee.netPay,
              estado: 'procesada'
            })
            .eq('company_id', companyId)
            .eq('employee_id', employee.id)
            .eq('periodo', periodo)
            .select('id');

          if (updateError) {
            console.error('Error updating existing payroll:', updateError);
            throw new Error(`Error al actualizar nómina para empleado ${employee.name}`);
          }

          if (updatedPayroll && updatedPayroll.length > 0) {
            savedPayrollIds.push(updatedPayroll[0].id);
          }
        }
        processedCount += duplicateEmployees.length;
        console.log('Updated existing payrolls for employees:', duplicateEmployees.length);

        // Regenerar comprobantes para empleados actualizados
        try {
          await this.regenerateVouchersForUpdatedEmployees(duplicateEmployees, periodo, companyId);
        } catch (voucherError) {
          console.warn('Warning: Some vouchers could not be regenerated:', voucherError);
        }
      }

      console.log('Total processed employees:', processedCount);
      console.log('All payroll IDs:', savedPayrollIds);

      const message = newEmployees.length > 0 && duplicateEmployees.length > 0
        ? `Liquidación procesada: ${newEmployees.length} nuevos registros y ${duplicateEmployees.length} actualizados`
        : newEmployees.length > 0
        ? `Liquidación procesada exitosamente para ${newEmployees.length} empleados`
        : `${duplicateEmployees.length} registros de nómina actualizados`;

      return message;
    } catch (error) {
      console.error('Error saving payroll liquidation:', error);
      throw new Error('Error al guardar la liquidación de nómina');
    }
  }

  static async generateVouchers(liquidationData: PayrollLiquidationData, payrollRecords: any[], companyId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Generating vouchers for employees:', liquidationData.employees.length);
      
      const voucherInserts = liquidationData.employees.map((employee, index) => ({
        company_id: companyId,
        employee_id: employee.id,
        payroll_id: payrollRecords[index]?.id,
        periodo: `${liquidationData.period.startDate} al ${liquidationData.period.endDate}`,
        start_date: liquidationData.period.startDate,
        end_date: liquidationData.period.endDate,
        net_pay: employee.netPay,
        voucher_status: 'generado',
        sent_to_employee: false,
        generated_by: user?.id,
        pdf_url: null
      }));

      const { data, error } = await supabase
        .from('payroll_vouchers')
        .insert(voucherInserts)
        .select();

      if (error) {
        console.error('Error inserting vouchers:', error);
        throw error;
      }

      console.log(`${voucherInserts.length} comprobantes generados exitosamente`);
    } catch (error) {
      console.error('Error generating vouchers:', error);
      throw new Error('Error al generar los comprobantes');
    }
  }

  static async regenerateVouchersForUpdatedEmployees(employees: PayrollEmployee[], periodo: string, companyId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Regenerating vouchers for updated employees:', employees.length);
      
      for (const employee of employees) {
        // Actualizar o crear comprobante para empleado actualizado
        const { data: existingVoucher } = await supabase
          .from('payroll_vouchers')
          .select('id')
          .eq('company_id', companyId)
          .eq('employee_id', employee.id)
          .eq('periodo', periodo)
          .single();

        if (existingVoucher) {
          // Actualizar comprobante existente
          await supabase
            .from('payroll_vouchers')
            .update({
              net_pay: employee.netPay,
              voucher_status: 'generado',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingVoucher.id);
        } else {
          // Crear nuevo comprobante si no existe - usar fechas del período actual
          const currentDate = new Date().toISOString().split('T')[0];
          await supabase
            .from('payroll_vouchers')
            .insert({
              company_id: companyId,
              employee_id: employee.id,
              periodo: periodo,
              start_date: currentDate,
              end_date: currentDate,
              net_pay: employee.netPay,
              voucher_status: 'generado',
              sent_to_employee: false,
              generated_by: user?.id,
              pdf_url: null
            });
        }
      }
      
      console.log('Vouchers regenerated successfully for updated employees');
    } catch (error) {
      console.error('Error regenerating vouchers:', error);
      throw new Error('Error al regenerar los comprobantes');
    }
  }

  static async loadEmployeesForLiquidation(): Promise<PayrollEmployee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('No company ID found for user');
        return [];
      }

      const companySettings = await PayrollPeriodService.getCompanySettings();
      const periodType = companySettings?.periodicity || 'mensual';
      
      // Get current active period to load novedades
      const currentPeriod = await PayrollPeriodService.getCurrentActivePeriod();
      
      let defaultWorkedDays: number;
      switch (periodType) {
        case 'quincenal':
          defaultWorkedDays = 15;
          break;
        case 'mensual':
          defaultWorkedDays = 30;
          break;
        case 'semanal':
          defaultWorkedDays = 7;
          break;
        default:
          defaultWorkedDays = 30;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        console.error('Error loading employees:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No active employees found for payroll liquidation');
        return [];
      }

      console.log(`Loaded ${data.length} active employees for payroll liquidation with ${periodType} periodicity`);

      const employeePromises = data.map(async (emp) => {
        let extraHours = 0;
        let bonuses = 0;
        let absences = 0;
        let disabilities = 0;
        let additionalDeductions = 0;

        // Load novedades for this employee if we have a current period
        if (currentPeriod) {
          try {
            const novedades = await NovedadesService.getNovedadesByEmployee(emp.id, currentPeriod.id);
            console.log(`Loaded ${novedades.length} novedades for employee ${emp.nombre} ${emp.apellido}`);
            
            // Sum up novedades by type - now they go directly to devengados or deducciones
            novedades.forEach(novedad => {
              const valor = Number(novedad.valor) || 0;
              const dias = Number(novedad.dias) || 0;
              
              switch (novedad.tipo_novedad) {
                case 'horas_extra':
                case 'bonificacion':
                case 'vacaciones':
                case 'licencia':
                  // These add to devengados (included in bonuses for calculation)
                  bonuses += valor;
                  break;
                case 'descuento':
                case 'otro':
                  // These add to deducciones
                  additionalDeductions += valor;
                  break;
                case 'ausencia':
                  absences += dias;
                  break;
                case 'incapacidad':
                  disabilities += dias;
                  break;
                default:
                  // For any other types, add to bonuses if positive value, deducciones if negative
                  if (valor > 0) {
                    bonuses += valor;
                  } else {
                    additionalDeductions += Math.abs(valor);
                  }
                  break;
              }
            });
            
            console.log(`Employee ${emp.nombre}: bonuses=${bonuses}, absences=${absences}, disabilities=${disabilities}, additionalDeductions=${additionalDeductions}`);
          } catch (error) {
            console.warn(`Could not load novedades for employee ${emp.id}:`, error);
          }
        }

        const baseEmployeeData = {
          id: emp.id,
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo || 'No especificado',
          baseSalary: Number(emp.salario_base),
          workedDays: Math.max(0, defaultWorkedDays - absences - disabilities),
          extraHours: 0, // No longer used directly, included in bonuses
          disabilities,
          bonuses,
          absences,
          eps: emp.eps,
          afp: emp.afp,
          additionalDeductions // Pass additional deductions from novedades
        };

        const calculatedEmployee = await calculateEmployeeBackend(
          baseEmployeeData, 
          periodType === 'semanal' ? 'mensual' : periodType as 'quincenal' | 'mensual'
        );

        // Add additional deductions from novedades to total deductions
        if (additionalDeductions > 0) {
          calculatedEmployee.deductions += additionalDeductions;
          calculatedEmployee.netPay = calculatedEmployee.grossPay - calculatedEmployee.deductions;
        }

        return calculatedEmployee;
      });

      return await Promise.all(employeePromises);
    } catch (error) {
      console.error('Error loading employees:', error);
      return [];
    }
  }

  static async getPayrollHistory(): Promise<any[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            nombre,
            apellido,
            cedula
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading payroll history:', error);
      return [];
    }
  }

  static async reopenPayrollPeriod(payrollIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('payrolls')
        .update({ estado: 'borrador' })
        .in('id', payrollIds);

      if (error) throw error;

      console.log(`${payrollIds.length} registros de nómina reabiertos`);
    } catch (error) {
      console.error('Error reopening payroll period:', error);
      throw new Error('Error al reabrir el período de nómina');
    }
  }
}
