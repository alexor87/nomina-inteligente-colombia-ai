import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollCalculationService } from './PayrollCalculationService';
import { PayrollPeriodService } from './PayrollPeriodService';

export interface PayrollLiquidationData {
  period: PayrollPeriod;
  employees: PayrollEmployee[];
}

export class PayrollLiquidationService {
  // Obtener el company_id del usuario actual
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

  // Guardar liquidación de nómina con transacciones completas
  static async savePayrollLiquidation(data: PayrollLiquidationData): Promise<string> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se encontró la empresa del usuario');
    }

    console.log('💾 Iniciando guardado transaccional de liquidación para período:', data.period.id);
    console.log('👥 Empleados a liquidar:', data.employees.length);
    
    try {
      // Verificar que el período esté en estado borrador
      const { data: periodCheck, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('estado')
        .eq('id', data.period.id)
        .single();

      if (periodError || !periodCheck) {
        throw new Error('No se encontró el período de nómina');
      }

      if (periodCheck.estado !== 'borrador') {
        throw new Error('Solo se pueden liquidar períodos en estado borrador');
      }

      // Guardar liquidaciones con period_id
      const periodoString = data.period.periodo || `${data.period.fecha_inicio}-${data.period.fecha_fin}`;
      
      const payrollInserts = data.employees.map(employee => ({
        company_id: companyId,
        employee_id: employee.id,
        period_id: data.period.id, // CRÍTICO: usar period_id
        periodo: periodoString,
        salario_base: employee.baseSalary,
        dias_trabajados: employee.workedDays,
        horas_extra: employee.extraHours,
        bonificaciones: employee.bonuses,
        auxilio_transporte: employee.transportAllowance,
        total_devengado: employee.grossPay,
        salud_empleado: employee.grossPay * 0.04,
        pension_empleado: employee.grossPay * 0.04,
        total_deducciones: employee.deductions,
        neto_pagado: employee.netPay,
        estado: 'procesada'
      }));

      const { data: insertedPayrolls, error: insertError } = await supabase
        .from('payrolls')
        .insert(payrollInserts)
        .select();

      if (insertError) {
        console.error('❌ Error guardando liquidaciones:', insertError);
        throw new Error(`Error al guardar liquidaciones: ${insertError.message}`);
      }

      console.log('✅ Liquidaciones guardadas exitosamente:', insertedPayrolls.length);

      // Actualizar totales en payroll_periods_real
      const totalDevengado = data.employees.reduce((sum, emp) => sum + emp.grossPay, 0);
      const totalDeducciones = data.employees.reduce((sum, emp) => sum + emp.deductions, 0);
      const totalNeto = data.employees.reduce((sum, emp) => sum + emp.netPay, 0);

      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          empleados_count: data.employees.length,
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.period.id);

      if (updateError) {
        throw new Error(`Error actualizando totales: ${updateError.message}`);
      }

      // CRÍTICO: Generar comprobantes es obligatorio, no opcional
      await this.generateVouchers(data, insertedPayrolls, companyId);
      
      console.log('✅ Liquidación completa guardada exitosamente');
      return `Liquidación procesada exitosamente para ${data.employees.length} empleados`;

    } catch (error) {
      console.error('❌ Error en liquidación:', error);
      throw error;
    }
  }

  // Generar comprobantes de nómina con validaciones y transacciones
  static async generateVouchers(liquidationData: PayrollLiquidationData, payrollRecords: any[], companyId: string): Promise<void> {
    try {
      console.log('📄 Iniciando generación de comprobantes');
      console.log('👥 Empleados para comprobantes:', liquidationData.employees.length);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado para generar comprobantes');
      }

      // Validar que tenemos los datos necesarios
      if (!payrollRecords || payrollRecords.length !== liquidationData.employees.length) {
        throw new Error(`Inconsistencia de datos: ${liquidationData.employees.length} empleados vs ${payrollRecords?.length || 0} registros de nómina`);
      }

      const periodoString = liquidationData.period.periodo || `${liquidationData.period.fecha_inicio}-${liquidationData.period.fecha_fin}`;
      
      const voucherInserts = liquidationData.employees.map((employee, index) => {
        const payrollRecord = payrollRecords[index];
        if (!payrollRecord) {
          throw new Error(`No se encontró registro de nómina para empleado ${employee.name}`);
        }

        return {
          company_id: companyId,
          employee_id: employee.id,
          payroll_id: payrollRecord.id,
          periodo: periodoString,
          start_date: liquidationData.period.fecha_inicio,
          end_date: liquidationData.period.fecha_fin,
          net_pay: employee.netPay,
          voucher_status: 'generado',
          sent_to_employee: false,
          generated_by: user.id,
          pdf_url: null,
          dian_status: 'pendiente'
        };
      });

      console.log('📄 Insertando comprobantes en base de datos...');
      const { data: insertedVouchers, error } = await supabase
        .from('payroll_vouchers')
        .insert(voucherInserts)
        .select();

      if (error) {
        console.error('❌ Error insertando comprobantes:', error);
        throw error;
      }

      if (!insertedVouchers || insertedVouchers.length !== voucherInserts.length) {
        throw new Error(`Error: Se esperaban ${voucherInserts.length} comprobantes, pero se crearon ${insertedVouchers?.length || 0}`);
      }

      console.log(`✅ ${insertedVouchers.length} comprobantes generados exitosamente`);
    } catch (error) {
      console.error('❌ Error generando comprobantes:', error);
      throw new Error(`Error al generar los comprobantes: ${error.message}`);
    }
  }

  // Cargar empleados de la empresa para la liquidación
  static async loadEmployeesForLiquidation(): Promise<PayrollEmployee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('No company ID found for user');
        return [];
      }

      // Obtener la periodicidad configurada por el usuario
      const companySettings = await PayrollPeriodService.getCompanySettings();
      const periodType = companySettings?.periodicity || 'mensual';
      
      // Determinar días trabajados por defecto según la periodicidad
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

      // Cargar SOLO los empleados ACTIVOS para la liquidación de nómina
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

      // Process each employee with async calculation
      const employees = await Promise.all(data.map(async (emp) => {
        const baseEmployeeData = {
          id: emp.id,
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo || 'No especificado',
          baseSalary: Number(emp.salario_base),
          workedDays: defaultWorkedDays, // Usar días según periodicidad configurada
          extraHours: 0,
          disabilities: 0,
          bonuses: 0,
          absences: 0,
          eps: emp.eps,
          afp: emp.afp
        };

        // Calcular datos de nómina usando el servicio de cálculo con la periodicidad correcta
        const calculation = await PayrollCalculationService.calculatePayroll({
          baseSalary: baseEmployeeData.baseSalary,
          workedDays: baseEmployeeData.workedDays,
          extraHours: baseEmployeeData.extraHours,
          disabilities: baseEmployeeData.disabilities,
          bonuses: baseEmployeeData.bonuses,
          absences: baseEmployeeData.absences,
          periodType: periodType === 'semanal' ? 'mensual' : periodType as 'quincenal' | 'mensual' // Fallback para semanal
        });

        // Solo empleados activos, todos válidos por defecto
        return {
          ...baseEmployeeData,
          grossPay: calculation.grossPay,
          deductions: calculation.totalDeductions,
          netPay: calculation.netPay,
          transportAllowance: calculation.transportAllowance,
          employerContributions: calculation.employerContributions,
          status: 'valid' as PayrollEmployee['status'],
          errors: []
        };
      }));

      return employees;
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