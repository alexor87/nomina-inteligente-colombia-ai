
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollPeriod } from '@/types/payroll';
import { PayrollCalculationEnhancedService } from './PayrollCalculationEnhancedService';
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
          try {
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

            // Calcular liquidación completa usando el servicio mejorado
            const calculation = await PayrollCalculationEnhancedService.calculatePayroll({
              baseSalary: baseData.baseSalary,
              workedDays: baseData.workedDays,
              extraHours: baseData.extraHours,
              disabilities: baseData.disabilities,
              bonuses: baseData.bonuses + novedadesTotals.bonuses,
              absences: baseData.absences,
              periodType: period.tipo_periodo as 'quincenal' | 'mensual',
              periodDate: new Date(period.fecha_inicio)
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
          } catch (error) {
            console.error(`❌ Error procesando empleado ${emp.nombre}:`, error);
            
            // Retornar empleado con error pero datos básicos
            return {
              id: emp.id,
              name: `${emp.nombre} ${emp.apellido}`,
              position: emp.cargo || 'No especificado',
              baseSalary: Number(emp.salario_base),
              workedDays: this.getWorkedDaysForPeriod(period.tipo_periodo),
              extraHours: 0,
              disabilities: 0,
              bonuses: 0,
              absences: 0,
              eps: emp.eps,
              afp: emp.afp,
              grossPay: 0,
              deductions: 0,
              netPay: 0,
              transportAllowance: 0,
              employerContributions: 0,
              status: 'error' as PayrollEmployee['status'],
              errors: [`Error en cálculo: ${error instanceof Error ? error.message : 'Error desconocido'}`]
            };
          }
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

  // ✅ 5. Al cerrar el período - Validación y generación de comprobantes OPTIMIZADO
  static async closePeriod(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<string> {
    try {
      console.log('🔒 Iniciando cierre de período:', period.id);
      
      // Validar que todos los empleados estén correctamente liquidados
      const invalidEmployees = employees.filter(emp => emp.status === 'error' || emp.netPay <= 0);
      if (invalidEmployees.length > 0) {
        console.error('❌ Empleados con errores:', invalidEmployees.map(e => e.name));
        throw new Error(`${invalidEmployees.length} empleados tienen errores en su liquidación`);
      }

      console.log(`✅ Validación completada - ${employees.length} empleados válidos`);

      // Guardar liquidaciones en la base de datos OPTIMIZADO
      await this.savePeriodLiquidationsOptimized(period, employees);
      
      // Generar comprobantes automáticamente MEJORADO
      await this.generateVouchersOptimized(period, employees);
      
      // Cambiar estado del período a cerrado
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          empleados_count: employees.length,
          total_devengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
          total_deducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
          total_neto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
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

  // OPTIMIZADO: Método de guardado con mejor manejo de errores y validación previa
  static async savePeriodLiquidationsOptimized(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<void> {
    try {
      console.log('💾 Guardando liquidaciones OPTIMIZADO...');
      
      // Validar datos antes de guardar
      const validEmployees = employees.filter(emp => {
        if (!emp.id || !period.id || !period.company_id) {
          console.warn(`⚠️ Empleado con datos incompletos: ${emp.name}`);
          return false;
        }
        return true;
      });

      console.log(`📋 Guardando ${validEmployees.length} liquidaciones válidas`);

      // Procesar en lotes para mejor rendimiento
      const batchSize = 10;
      for (let i = 0; i < validEmployees.length; i += batchSize) {
        const batch = validEmployees.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (emp) => {
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

          try {
            // Usar la restricción única corregida
            const { error } = await supabase
              .from('payrolls')
              .upsert(liquidationData, {
                onConflict: 'company_id,employee_id,period_id',
                ignoreDuplicates: false
              });

            if (error) {
              console.error(`❌ Error guardando liquidación para ${emp.name}:`, error);
              throw error;
            }

            console.log(`✅ Liquidación guardada: ${emp.name}`);
          } catch (error) {
            console.error(`❌ Error en upsert para empleado ${emp.name}:`, error);
            throw error;
          }
        }));

        // Pequeña pausa entre lotes
        if (i + batchSize < validEmployees.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log('✅ Todas las liquidaciones guardadas exitosamente');
    } catch (error) {
      console.error('❌ Error guardando liquidaciones:', error);
      throw error;
    }
  }

  // MEJORADO: Generar comprobantes con mejor manejo de errores
  static async generateVouchersOptimized(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<void> {
    try {
      console.log('📄 Generando comprobantes OPTIMIZADO...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ Usuario no autenticado - omitiendo generación de comprobantes');
        return;
      }

      // Verificar qué empleados ya tienen comprobantes
      const { data: existingVouchers, error: checkError } = await supabase
        .from('payroll_vouchers')
        .select('employee_id')
        .eq('company_id', period.company_id)
        .eq('periodo', period.periodo);

      if (checkError) {
        console.error('❌ Error verificando comprobantes existentes:', checkError);
        throw checkError;
      }

      const existingEmployeeIds = new Set(existingVouchers?.map(v => v.employee_id) || []);
      const employeesNeedingVouchers = employees.filter(emp => !existingEmployeeIds.has(emp.id));

      if (employeesNeedingVouchers.length === 0) {
        console.log('✅ Todos los empleados ya tienen comprobantes');
        return;
      }

      console.log(`📋 Generando ${employeesNeedingVouchers.length} comprobantes nuevos`);

      const vouchers = employeesNeedingVouchers.map(emp => ({
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

      const { error: insertError } = await supabase
        .from('payroll_vouchers')
        .insert(vouchers);

      if (insertError) {
        console.error('❌ Error insertando comprobantes:', insertError);
        // No lanzar error para no bloquear el cierre del período
        console.warn('⚠️ Continuando sin generar comprobantes...');
        return;
      }
      
      console.log(`✅ ${vouchers.length} comprobantes generados exitosamente`);
    } catch (error) {
      console.error('❌ Error generando comprobantes:', error);
      console.warn('⚠️ Continuando sin generar comprobantes...');
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

      // Recalcular liquidación usando el servicio mejorado
      const calculation = await PayrollCalculationEnhancedService.calculatePayroll({
        baseSalary: updatedData.baseSalary,
        workedDays: updatedData.workedDays,
        extraHours: updatedData.extraHours,
        disabilities: 0,
        bonuses: updatedData.bonuses,
        absences: updatedData.absences,
        periodType: period.tipo_periodo as 'quincenal' | 'mensual',
        periodDate: new Date(period.fecha_inicio)
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
