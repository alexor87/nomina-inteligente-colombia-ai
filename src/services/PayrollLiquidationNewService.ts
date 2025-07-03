import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollCalculationEnhancedService } from './PayrollCalculationEnhancedService';

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

      // **CRÍTICO: Obtener la periodicidad real de la empresa**
      const companyPeriodicity = await PayrollCalculationEnhancedService.getUserConfiguredPeriodicity();
      console.log(`⚙️ Periodicidad de la empresa: ${companyPeriodicity}`);

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
            // Usar datos de nómina existente CON CORRECCIÓN DE PERIODICIDAD
            console.log(`✅ Usando nómina existente para: ${employee.nombre} con periodicidad: ${companyPeriodicity}`);
            payrollEmployee = this.mapExistingPayrollToEmployee(employee, existingPayroll, companyPeriodicity);
          } else {
            // **USAR PayrollCalculationEnhancedService con periodicidad correcta**
            console.log(`🔄 Calculando nueva nómina para: ${employee.nombre} con periodicidad: ${companyPeriodicity}`);
            payrollEmployee = await this.calculateEmployeePayrollWithPeriodicity(
              employee, 
              period, 
              employeeNovedades, 
              companyPeriodicity
            );
          }

          processedEmployees.push(payrollEmployee);
        } catch (error) {
          console.error(`❌ Error procesando empleado ${employee.nombre}:`, error);
          
          // Crear entrada con error CORRIGIENDO PERIODICIDAD
          processedEmployees.push({
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            position: employee.cargo || 'Sin cargo',
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: this.getDefaultWorkedDays(companyPeriodicity), // CORRECCIÓN AQUÍ
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

  // **NUEVA FUNCIÓN PARA OBTENER DÍAS TRABAJADOS POR DEFECTO SEGÚN PERIODICIDAD**
  private static getDefaultWorkedDays(periodicity: 'quincenal' | 'mensual' | 'semanal'): number {
    switch (periodicity) {
      case 'semanal':
        return 7;
      case 'quincenal':
        return 15;
      case 'mensual':
        return 30;
      default:
        return 30;
    }
  }

  // **FUNCIÓN CORREGIDA: Validar días trabajados según periodicidad**
  private static validateWorkedDays(workedDays: number, periodicity: 'quincenal' | 'mensual' | 'semanal'): number {
    const maxDays = this.getDefaultWorkedDays(periodicity);
    
    if (workedDays > maxDays) {
      console.warn(`⚠️  Días trabajados (${workedDays}) exceden máximo para período ${periodicity} (${maxDays}). Ajustando a ${maxDays}.`);
      return maxDays;
    }
    
    return workedDays || maxDays;
  }

  // **FUNCIÓN CORREGIDA: Mapear nómina existente respetando periodicidad**
  private static mapExistingPayrollToEmployee(
    employee: any, 
    payroll: any, 
    periodicity: 'quincenal' | 'mensual' | 'semanal'
  ): PayrollEmployee {
    const rawWorkedDays = payroll.dias_trabajados || employee.dias_trabajo;
    const validatedWorkedDays = this.validateWorkedDays(rawWorkedDays, periodicity);
    
    console.log(`📊 Empleado ${employee.nombre}: días originales=${rawWorkedDays}, días validados=${validatedWorkedDays}, periodicidad=${periodicity}`);
    
    return {
      id: employee.id,
      name: `${employee.nombre} ${employee.apellido}`,
      position: employee.cargo || 'Sin cargo',
      baseSalary: Number(payroll.salario_base) || 0,
      workedDays: validatedWorkedDays, // CORRECCIÓN CRÍTICA AQUÍ
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

  private static async calculateEmployeePayrollWithPeriodicity(
    employee: any, 
    period: any, 
    novedades: any[], 
    periodicity: 'quincenal' | 'mensual' | 'semanal'
  ): Promise<PayrollEmployee> {
    try {
      const baseSalary = Number(employee.salario_base) || 0;
      
      // **CORRECCIÓN: Determinar días trabajados según periodicidad real**
      const rawWorkedDays = employee.dias_trabajo;
      const workedDays = this.validateWorkedDays(rawWorkedDays, periodicity);
      
      console.log(`🔢 Empleado ${employee.nombre}: salario=${baseSalary}, días=${workedDays}, periodicidad=${periodicity}`);
      
      // **USAR PayrollCalculationEnhancedService con periodicidad correcta**
      const calculation = await PayrollCalculationEnhancedService.calculatePayroll({
        baseSalary,
        workedDays, // USAR DÍAS VALIDADOS
        extraHours: 0, // Se puede agregar desde novedades
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: periodicity, // **CRÍTICO: Usar periodicidad real**
        periodDate: new Date(period.fecha_inicio),
        empleadoId: employee.id,
        periodoId: period.id
      });

      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary,
        workedDays, // USAR DÍAS VALIDADOS
        extraHours: calculation.extraPay > 0 ? Math.round(calculation.extraPay / (baseSalary / 192 * 1.25)) : 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: calculation.grossPay,
        deductions: calculation.totalDeductions,
        netPay: calculation.netPay,
        status: 'valid',
        errors: [],
        eps: employee.eps || '',
        afp: employee.afp || '',
        transportAllowance: calculation.transportAllowance,
        employerContributions: calculation.employerContributions
      };
    } catch (error) {
      console.error('❌ Error en cálculo de nómina:', error);
      
      // **CORRECCIÓN: Retornar cálculo básico CON PERIODICIDAD CORRECTA**
      const baseSalary = Number(employee.salario_base) || 0;
      const workedDays = this.validateWorkedDays(employee.dias_trabajo, periodicity);
      
      console.log(`🚨 Fallback para ${employee.nombre}: días=${workedDays}, periodicidad=${periodicity}`);
      
      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary,
        workedDays, // CORRECCIÓN CRÍTICA AQUÍ
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: baseSalary * (workedDays / 30), // Proporcional según días reales
        deductions: baseSalary * (workedDays / 30) * 0.08, // 8% aproximado proporcional
        netPay: baseSalary * (workedDays / 30) * 0.92, // Proporcional
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

  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log(`🗑️ Removiendo empleado ${employeeId} del período ${periodId}`);
      
      // Eliminar nómina del empleado para este período
      const { error: payrollError } = await supabase
        .from('payrolls')
        .delete()
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (payrollError) {
        console.error('❌ Error eliminando nómina:', payrollError);
        throw payrollError;
      }

      // Eliminar novedades del empleado para este período
      const { error: novedadesError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        console.error('❌ Error eliminando novedades:', novedadesError);
        throw novedadesError;
      }

      console.log(`✅ Empleado ${employeeId} removido del período ${periodId}`);
    } catch (error) {
      console.error('❌ Error removiendo empleado del período:', error);
      throw error;
    }
  }

  static async closePeriod(period: any, employees: PayrollEmployee[]): Promise<string> {
    try {
      console.log(`🔐 Cerrando período: ${period.periodo}`);
      
      // **CRÍTICO: Guardar registros individuales ANTES de actualizar período**
      console.log(`💾 Guardando ${employees.length} registros de nómina individuales...`);
      
      let successfulRecords = 0;
      const failedRecords: string[] = [];

      for (const employee of employees) {
        if (employee.status === 'valid') {
          try {
            const payrollData = {
              company_id: period.company_id,
              employee_id: employee.id,
              periodo: period.periodo,
              period_id: period.id,
              salario_base: employee.baseSalary,
              dias_trabajados: employee.workedDays,
              horas_extra: employee.extraHours,
              bonificaciones: employee.bonuses,
              auxilio_transporte: employee.transportAllowance,
              total_devengado: employee.grossPay,
              total_deducciones: employee.deductions,
              neto_pagado: employee.netPay,
              estado: 'procesada' // CAMBIO: usar 'procesada' en lugar de 'cerrado'
            };

            const { error: payrollError } = await supabase
              .from('payrolls')
              .upsert(payrollData, {
                onConflict: 'company_id,employee_id,periodo',
                ignoreDuplicates: false
              });

            if (payrollError) {
              console.error(`❌ Error guardando nómina para empleado ${employee.name}:`, payrollError);
              failedRecords.push(employee.name);
            } else {
              successfulRecords++;
              console.log(`✅ Nómina guardada para ${employee.name}`);
            }
          } catch (error) {
            console.error(`❌ Error crítico guardando empleado ${employee.name}:`, error);
            failedRecords.push(employee.name);
          }
        }
      }

      console.log(`📊 Resultados del guardado: ${successfulRecords} exitosos, ${failedRecords.length} fallidos`);

      if (failedRecords.length > 0) {
        console.error('⚠️ Empleados que fallaron al guardar:', failedRecords);
      }

      // Calcular totales basados en registros válidos
      const validEmployees = employees.filter(emp => emp.status === 'valid');
      const totalDevengado = validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0);
      const totalDeducciones = validEmployees.reduce((sum, emp) => sum + emp.deductions, 0);
      const totalNeto = validEmployees.reduce((sum, emp) => sum + emp.netPay, 0);

      // Actualizar estado del período con totales actualizados
      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          empleados_count: successfulRecords, // Usar empleados exitosamente guardados
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto
        })
        .eq('id', period.id);

      if (periodError) {
        console.error('❌ Error actualizando período:', periodError);
        throw periodError;
      }

      const message = failedRecords.length > 0 
        ? `Período ${period.periodo} cerrado con ${successfulRecords} empleados. ${failedRecords.length} empleados fallaron al guardar.`
        : `Período ${period.periodo} cerrado exitosamente con ${successfulRecords} empleados procesados`;

      console.log(`✅ ${message}`);
      return message;
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      throw error;
    }
  }
}
