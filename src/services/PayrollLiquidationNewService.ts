
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollCalculationService } from './PayrollCalculationService';
import { NovedadesBackupService } from './NovedadesBackupService';

export class PayrollLiquidationNewService {
  // 🧮 4. Durante el período activo - Cargar empleados y calcular liquidación
  static async loadEmployeesForActivePeriod(period: PayrollPeriod): Promise<PayrollEmployee[]> {
    try {
      console.log('👥 Cargando empleados para período activo:', period.id);
      
      // Cargar empleados activos de la empresa
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', period.company_id)
        .eq('estado', 'activo');

      if (error) throw error;
      if (!employees) return [];

      console.log(`✅ ${employees.length} empleados activos encontrados`);

      // Procesar cada empleado con cálculos y novedades
      const processedEmployees = await Promise.all(
        employees.map(async (emp) => {
          // Obtener novedades del empleado para este período
          const novedades = await NovedadesBackupService.getNovedadesByEmployee(emp.id, period.id);
          
          // Calcular totales de novedades
          const novedadesTotals = this.calculateNovedadesTotals(novedades);
          
          // Datos base del empleado
          const baseData = {
            id: emp.id,
            name: `${emp.nombre} ${emp.apellido}`,
            position: emp.cargo || 'No especificado',
            baseSalary: Number(emp.salario_base),
            workedDays: this.getWorkedDaysForPeriod(period.tipo_periodo),
            extraHours: novedadesTotals.extraHours,
            disabilities: novedadesTotals.disabilities,
            bonuses: novedadesTotals.bonuses,
            absences: novedadesTotals.absences,
            eps: emp.eps,
            afp: emp.afp,
            additionalDeductions: novedadesTotals.deductions
          };

          // Calcular liquidación completa
          const calculation = await PayrollCalculationService.calculatePayroll({
            baseSalary: baseData.baseSalary,
            workedDays: baseData.workedDays,
            extraHours: baseData.extraHours,
            disabilities: baseData.disabilities,
            bonuses: baseData.bonuses + novedadesTotals.bonuses,
            absences: baseData.absences,
            periodType: period.tipo_periodo as 'quincenal' | 'mensual'
          });

          return {
            ...baseData,
            grossPay: calculation.grossPay + novedadesTotals.bonuses,
            deductions: calculation.totalDeductions + novedadesTotals.deductions,
            netPay: calculation.netPay + novedadesTotals.bonuses - novedadesTotals.deductions,
            transportAllowance: calculation.transportAllowance,
            employerContributions: calculation.employerContributions,
            status: 'valid' as PayrollEmployee['status'],
            errors: []
          };
        })
      );

      console.log('✅ Empleados procesados con liquidación calculada');
      return processedEmployees;

    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      throw error;
    }
  }

  static getWorkedDaysForPeriod(periodType: string): number {
    switch (periodType) {
      case 'quincenal': return 15;
      case 'mensual': return 30;
      case 'semanal': return 7;
      default: return 30;
    }
  }

  static calculateNovedadesTotals(novedades: any[]) {
    const totals = {
      extraHours: 0,
      disabilities: 0,
      bonuses: 0,
      absences: 0,
      deductions: 0
    };

    novedades.forEach(novedad => {
      const valor = Number(novedad.valor) || 0;
      
      switch (novedad.tipo_novedad) {
        case 'horas_extra':
          totals.extraHours += Number(novedad.horas) || 0;
          break;
        case 'incapacidad':
          totals.disabilities += Number(novedad.dias) || 0;
          break;
        case 'bonificacion':
        case 'comision':
        case 'prima':
        case 'otros_ingresos':
          totals.bonuses += valor;
          break;
        case 'vacaciones':
        case 'licencia_remunerada':
          totals.absences += Number(novedad.dias) || 0;
          break;
        case 'salud':
        case 'pension':
        case 'fondo_solidaridad':
        case 'retencion_fuente':
        case 'libranza':
        case 'ausencia':
        case 'multa':
        case 'descuento_voluntario':
          totals.deductions += valor;
          break;
      }
    });

    return totals;
  }

  // ✅ 5. Al cerrar el período - Validación y generación de comprobantes CON UPSERT
  static async closePeriod(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<string> {
    try {
      console.log('🔒 Iniciando cierre de período:', period.id);
      
      // Validar que todos los empleados estén correctamente liquidados
      const invalidEmployees = employees.filter(emp => emp.status === 'error' || emp.netPay <= 0);
      if (invalidEmployees.length > 0) {
        throw new Error(`${invalidEmployees.length} empleados tienen errores en su liquidación`);
      }

      // Guardar liquidaciones en la base de datos CON UPSERT
      await this.savePeriodLiquidationsUpsert(period, employees);
      
      // Generar comprobantes automáticamente
      await this.generateVouchers(period, employees);
      
      // Cambiar estado del período a cerrado
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (updateError) throw updateError;

      console.log('✅ Período cerrado exitosamente');
      return `Período ${period.periodo} cerrado exitosamente. ${employees.length} empleados liquidados.`;

    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      throw error;
    }
  }

  // NUEVO: Método con UPSERT para evitar error 409
  static async savePeriodLiquidationsUpsert(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<void> {
    try {
      console.log('💾 Guardando liquidaciones con UPSERT...');
      
      for (const emp of employees) {
        // Verificar si ya existe
        const { data: existing } = await supabase
          .from('payrolls')
          .select('id')
          .eq('company_id', period.company_id)
          .eq('employee_id', emp.id)
          .eq('period_id', period.id)
          .maybeSingle();

        const liquidationData = {
          company_id: period.company_id,
          employee_id: emp.id,
          period_id: period.id,
          periodo: period.periodo,
          salario_base: emp.baseSalary,
          dias_trabajados: emp.workedDays,
          horas_extra: emp.extraHours,
          bonificaciones: emp.bonuses,
          auxilio_transporte: emp.transportAllowance,
          total_devengado: emp.grossPay,
          total_deducciones: emp.deductions,
          neto_pagado: emp.netPay,
          estado: 'procesada'
        };

        if (existing) {
          // Actualizar registro existente
          const { error } = await supabase
            .from('payrolls')
            .update(liquidationData)
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insertar nuevo registro
          const { error } = await supabase
            .from('payrolls')
            .insert(liquidationData);

          if (error) throw error;
        }
      }
      
      console.log('✅ Liquidaciones guardadas exitosamente');
    } catch (error) {
      console.error('❌ Error guardando liquidaciones:', error);
      throw error;
    }
  }

  static async generateVouchers(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const vouchers = employees.map(emp => ({
        company_id: period.company_id,
        employee_id: emp.id,
        periodo: period.periodo,
        start_date: period.fecha_inicio,
        end_date: period.fecha_fin,
        net_pay: emp.netPay,
        voucher_status: 'generado',
        sent_to_employee: false,
        generated_by: user.id,
        dian_status: 'pendiente'
      }));

      const { error } = await supabase
        .from('payroll_vouchers')
        .insert(vouchers);

      if (error) throw error;
      
      console.log('✅ Comprobantes generados automáticamente');
    } catch (error) {
      console.error('❌ Error generando comprobantes:', error);
      throw error;
    }
  }

  // Método para remover empleado del período
  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log('🗑️ Removiendo empleado del período:', employeeId);
      
      // Eliminar liquidación si existe
      const { error: payrollError } = await supabase
        .from('payrolls')
        .delete()
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (payrollError) throw payrollError;

      // Eliminar novedades del período
      const { error: novedadesError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) throw novedadesError;

      console.log('✅ Empleado removido del período exitosamente');
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      throw error;
    }
  }

  // Método para recalcular empleado individual
  static async recalculateEmployee(employeeId: string, period: PayrollPeriod, updates: Partial<PayrollEmployee>): Promise<PayrollEmployee> {
    try {
      // Obtener empleado actual
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) throw error;

      // Aplicar actualizaciones
      const updatedData = {
        baseSalary: updates.baseSalary || Number(employee.salario_base),
        workedDays: updates.workedDays || this.getWorkedDaysForPeriod(period.tipo_periodo),
        extraHours: updates.extraHours || 0,
        bonuses: updates.bonuses || 0,
        absences: updates.absences || 0
      };

      // Recalcular liquidación
      const calculation = await PayrollCalculationService.calculatePayroll({
        baseSalary: updatedData.baseSalary,
        workedDays: updatedData.workedDays,
        extraHours: updatedData.extraHours,
        disabilities: 0,
        bonuses: updatedData.bonuses,
        absences: updatedData.absences,
        periodType: period.tipo_periodo as 'quincenal' | 'mensual'
      });

      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'No especificado',
        baseSalary: updatedData.baseSalary,
        workedDays: updatedData.workedDays,
        extraHours: updatedData.extraHours,
        disabilities: 0,
        bonuses: updatedData.bonuses,
        absences: updatedData.absences,
        grossPay: calculation.grossPay,
        deductions: calculation.totalDeductions,
        netPay: calculation.netPay,
        transportAllowance: calculation.transportAllowance,
        employerContributions: calculation.employerContributions,
        status: 'valid',
        errors: [],
        eps: employee.eps,
        afp: employee.afp
      };

    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      throw error;
    }
  }
}
