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

  // ✅ 5. PASO 1-3: CIERRE COMPLETO Y CONSISTENTE DEL PERÍODO
  static async closePeriod(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<string> {
    try {
      console.log('🔒 INICIANDO CIERRE DEFINITIVO DE PERÍODO:', period.id);
      console.log('📊 Estado actual del período:', period.estado);
      
      // PASO 1: Validar que todos los empleados estén correctamente liquidados
      const invalidEmployees = employees.filter(emp => emp.status === 'error' || emp.netPay <= 0);
      if (invalidEmployees.length > 0) {
        console.error('❌ Empleados con errores:', invalidEmployees.map(e => e.name));
        throw new Error(`${invalidEmployees.length} empleados tienen errores en su liquidación`);
      }

      console.log(`✅ VALIDACIÓN COMPLETADA - ${employees.length} empleados válidos`);
      
      // PASO 2: Guardar liquidaciones con validación completa
      console.log('💾 Guardando liquidaciones...');
      await this.savePeriodLiquidationsWithValidation(period, employees);
      console.log('✅ Liquidaciones guardadas correctamente');
      
      // PASO 3: Generar comprobantes (sin bloquear el cierre)
      console.log('📄 Generando comprobantes...');
      try {
        await this.generateVouchersOptimized(period, employees);
        console.log('✅ Comprobantes generados exitosamente');
      } catch (error) {
        console.warn('⚠️ Error en comprobantes, pero continuando cierre:', error);
      }
      
      // PASO 4: CAMBIAR ESTADO A CERRADO CON VALIDACIÓN COMPLETA
      console.log('🔐 Cambiando estado del período a CERRADO...');
      const totals = this.calculatePeriodTotals(employees);
      
      const { data: updatedPeriod, error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado', // ESTADO CONSISTENTE
          empleados_count: employees.length,
          total_devengado: totals.totalDevengado,
          total_deducciones: totals.totalDeducciones,
          total_neto: totals.totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error actualizando período:', updateError);
        throw updateError;
      }

      console.log('✅ PERÍODO ACTUALIZADO:', updatedPeriod);
      
      // PASO 5: VERIFICACIÓN FINAL - Confirmar que el cambio se aplicó
      const { data: verificationPeriod, error: verifyError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', period.id)
        .single();

      if (verifyError) {
        console.error('❌ Error verificando período:', verifyError);
        throw verifyError;
      }

      console.log('🔍 VERIFICACIÓN FINAL - Estado del período:', verificationPeriod.estado);
      
      if (verificationPeriod.estado !== 'cerrado') {
        throw new Error(`Error crítico: El período no se cerró correctamente. Estado actual: ${verificationPeriod.estado}`);
      }

      // PASO 6: Crear log de auditoría
      console.log('📝 Registrando en auditoría...');
      await this.createClosureAuditLog(period, employees.length, totals);
      
      const successMessage = `✅ PERÍODO ${period.periodo} CERRADO EXITOSAMENTE
📊 ${employees.length} empleados liquidados
💰 Total devengado: ${this.formatCurrency(totals.totalDevengado)}
💸 Total neto: ${this.formatCurrency(totals.totalNeto)}
🔐 Estado: CERRADO`;

      console.log('🎉 CIERRE COMPLETADO EXITOSAMENTE');
      return successMessage;

    } catch (error) {
      console.error('💥 ERROR CRÍTICO EN CIERRE DE PERÍODO:', error);
      
      // Registrar el error en auditoría
      try {
        await this.createClosureErrorLog(period, error instanceof Error ? error.message : 'Error desconocido');
      } catch (auditError) {
        console.error('❌ Error registrando fallo en auditoría:', auditError);
      }
      
      throw error;
    }
  }

  // Método auxiliar para calcular totales del período
  static calculatePeriodTotals(employees: PayrollEmployee[]) {
    return employees.reduce((totals, emp) => ({
      totalDevengado: totals.totalDevengado + emp.grossPay,
      totalDeducciones: totals.totalDeducciones + emp.deductions,
      totalNeto: totals.totalNeto + emp.netPay
    }), {
      totalDevengado: 0,
      totalDeducciones: 0,
      totalNeto: 0
    });
  }

  // Método auxiliar para formatear moneda
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // OPTIMIZADO: Guardado con validación completa
  static async savePeriodLiquidationsWithValidation(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<void> {
    try {
      console.log('💾 GUARDANDO LIQUIDACIONES CON VALIDACIÓN COMPLETA...');
      
      // Validar datos antes de guardar
      const validEmployees = employees.filter(emp => {
        if (!emp.id || !period.id || !period.company_id) {
          console.warn(`⚠️ Empleado con datos incompletos: ${emp.name}`);
          return false;
        }
        return true;
      });

      console.log(`📋 Procesando ${validEmployees.length} liquidaciones válidas`);

      // Procesar en lotes con validación individual
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < validEmployees.length; i += batchSize) {
        const batch = validEmployees.slice(i, i + batchSize);
        console.log(`📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(validEmployees.length/batchSize)}`);
        
        const batchPromises = batch.map(async (emp) => {
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
            estado: 'procesada' // Consistente con el estado del período
          };

          try {
            const { data, error } = await supabase
              .from('payrolls')
              .upsert(liquidationData, {
                onConflict: 'company_id,employee_id,period_id',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (error) {
              console.error(`❌ Error guardando liquidación para ${emp.name}:`, error);
              throw error;
            }

            console.log(`✅ Liquidación guardada para: ${emp.name} (ID: ${data.id})`);
            return { success: true, employee: emp.name, data };
          } catch (error) {
            console.error(`💥 Error crítico para empleado ${emp.name}:`, error);
            return { success: false, employee: emp.name, error };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);

        // Pequeña pausa entre lotes
        if (i + batchSize < validEmployees.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Validar resultados
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      console.log(`📊 RESULTADO GUARDADO: ${successful} exitosas, ${failed} fallidas`);
      
      if (failed > 0) {
        console.error('❌ Algunas liquidaciones fallaron:', results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)));
        throw new Error(`${failed} liquidaciones fallaron al guardarse`);
      }
      
      console.log('✅ TODAS LAS LIQUIDACIONES GUARDADAS EXITOSAMENTE');
    } catch (error) {
      console.error('💥 ERROR CRÍTICO GUARDANDO LIQUIDACIONES:', error);
      throw error;
    }
  }

  // MEJORADO: Generar comprobantes sin bloquear cierre
  static async generateVouchersOptimized(period: PayrollPeriod, employees: PayrollEmployee[]): Promise<void> {
    try {
      console.log('📄 GENERANDO COMPROBANTES OPTIMIZADO...');
      
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
        throw insertError;
      }
      
      console.log(`✅ ${vouchers.length} comprobantes generados exitosamente`);
    } catch (error) {
      console.error('❌ Error generando comprobantes:', error);
      // No lanzar error para no bloquear el cierre del período
      console.warn('⚠️ Continuando sin generar comprobantes...');
    }
  }

  // Método para crear log de auditoría del cierre
  static async createClosureAuditLog(period: PayrollPeriod, employeeCount: number, totals: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('dashboard_activity')
        .insert({
          company_id: period.company_id,
          user_email: user?.email || 'sistema',
          action: `Período ${period.periodo} cerrado exitosamente`,
          type: 'payroll_closure'
        });
      
      console.log('✅ Log de auditoría creado');
    } catch (error) {
      console.warn('⚠️ Error creando log de auditoría:', error);
    }
  }

  // Método para crear log de error en auditoría
  static async createClosureErrorLog(period: PayrollPeriod, errorMessage: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('dashboard_activity')
        .insert({
          company_id: period.company_id,
          user_email: user?.email || 'sistema',
          action: `Error cerrando período ${period.periodo}: ${errorMessage}`,
          type: 'payroll_error'
        });
    } catch (error) {
      console.warn('⚠️ Error creando log de error:', error);
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
