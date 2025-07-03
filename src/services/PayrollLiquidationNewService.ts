
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollCalculationEnhancedService } from './PayrollCalculationEnhancedService';

export class PayrollLiquidationNewService {
  static async loadEmployeesForActivePeriod(period: any): Promise<PayrollEmployee[]> {
    try {
      console.log('🔍 ALELUYA - Cargando empleados para período:', period.periodo);
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

      // **CORRECCIÓN ALELUYA: Obtener la periodicidad real de la empresa**
      const companyPeriodicity = await PayrollCalculationEnhancedService.getUserConfiguredPeriodicity();
      console.log(`⚙️ Periodicidad ALELUYA: ${companyPeriodicity}`);

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
            // ✅ CORRECCIÓN ALELUYA: Usar datos existentes pero con periodicidad correcta
            console.log(`✅ Nómina existente ALELUYA para: ${employee.nombre} - Verificando valores`);
            payrollEmployee = this.mapExistingPayrollToEmployee(employee, existingPayroll, companyPeriodicity);
          } else {
            // ✅ CORRECCIÓN ALELUYA: Calcular nueva nómina con lógica exacta
            console.log(`🔄 Calculando ALELUYA para: ${employee.nombre} con periodicidad: ${companyPeriodicity}`);
            payrollEmployee = await this.calculateEmployeePayrollAleluya(
              employee, 
              period, 
              employeeNovedades, 
              companyPeriodicity
            );
          }

          processedEmployees.push(payrollEmployee);
        } catch (error) {
          console.error(`❌ Error procesando empleado ${employee.nombre}:`, error);
          
          // Crear entrada con error usando días correctos
          processedEmployees.push({
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            position: employee.cargo || 'Sin cargo',
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: this.getDefaultWorkedDays(companyPeriodicity),
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

      console.log(`✅ ALELUYA - Empleados procesados: ${processedEmployees.length}`);
      return processedEmployees;

    } catch (error) {
      console.error('💥 Error crítico en loadEmployeesForActivePeriod:', error);
      throw error;
    }
  }

  // ✅ CORRECCIÓN ALELUYA: Días trabajados correctos según periodicidad
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

  // ✅ CORRECCIÓN ALELUYA: Validar días trabajados según periodicidad
  private static validateWorkedDays(workedDays: number, periodicity: 'quincenal' | 'mensual' | 'semanal'): number {
    const maxDays = this.getDefaultWorkedDays(periodicity);
    
    if (workedDays > maxDays) {
      console.warn(`⚠️ ALELUYA - Días trabajados (${workedDays}) exceden máximo para período ${periodicity} (${maxDays}). Ajustando.`);
      return maxDays;
    }
    
    return workedDays || maxDays;
  }

  // ✅ CORRECCIÓN ALELUYA: Mapear nómina existente respetando periodicidad
  private static mapExistingPayrollToEmployee(
    employee: any, 
    payroll: any, 
    periodicity: 'quincenal' | 'mensual' | 'semanal'
  ): PayrollEmployee {
    const rawWorkedDays = payroll.dias_trabajados || employee.dias_trabajo;
    const validatedWorkedDays = this.validateWorkedDays(rawWorkedDays, periodicity);
    
    console.log(`📊 ALELUYA - ${employee.nombre}: días=${validatedWorkedDays}, periodicidad=${periodicity}`);
    
    return {
      id: employee.id,
      name: `${employee.nombre} ${employee.apellido}`,
      position: employee.cargo || 'Sin cargo',
      baseSalary: Number(payroll.salario_base) || 0,
      workedDays: validatedWorkedDays,
      extraHours: Number(payroll.horas_extra) || 0,
      disabilities: 0,
      bonuses: Number(payroll.bonificaciones) || 0,
      absences: 0,
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

  // ✅ NUEVA FUNCIÓN ALELUYA: Cálculo exacto como Aleluya CON NOVEDADES
  private static async calculateEmployeePayrollAleluya(
    employee: any, 
    period: any, 
    novedades: any[], 
    periodicity: 'quincenal' | 'mensual' | 'semanal'
  ): Promise<PayrollEmployee> {
    try {
      const baseSalary = Number(employee.salario_base) || 0;
      const workedDays = this.validateWorkedDays(employee.dias_trabajo, periodicity);
      
      console.log(`🔢 ALELUYA - Calculando para ${employee.nombre}:`, {
        baseSalary,
        workedDays,
        periodicity,
        novedades: novedades.length
      });
      
      // ✅ CÁLCULO ALELUYA EXACTO
      // 1. Salario proporcional: (salario_mensual / 30) × días_trabajados
      const dailySalary = baseSalary / 30;
      const proportionalSalary = Math.round(dailySalary * workedDays);
      
      // 2. Auxilio de transporte proporcional (si aplica)
      let transportAllowance = 0;
      if (baseSalary <= (1300000 * 2)) { // Si es beneficiario
        const dailyTransport = 200000 / 30;
        transportAllowance = Math.round(dailyTransport * workedDays);
      }

      // ✅ 3. PROCESAR NOVEDADES
      let extraHours = 0;
      let bonuses = 0;
      let additionalDeductions = 0;
      let additionalEarnings = 0;

      console.log(`📋 Procesando ${novedades.length} novedades para ${employee.nombre}:`);
      
      for (const novedad of novedades) {
        const valor = Number(novedad.valor) || 0;
        
        console.log(`   - ${novedad.tipo_novedad}: $${valor.toLocaleString()}`);
        
        // Clasificar novedades en devengos y deducciones
        switch (novedad.tipo_novedad) {
          case 'horas_extra':
          case 'recargo_nocturno':
            extraHours += valor;
            additionalEarnings += valor;
            break;
          case 'bonificacion':
          case 'comision':
          case 'prima':
          case 'otros_ingresos':
            bonuses += valor;
            additionalEarnings += valor;
            break;
          case 'retencion_fuente':
          case 'prestamo':
          case 'embargo':
          case 'descuento_voluntario':
          case 'fondo_solidaridad':
            additionalDeductions += valor;
            break;
          // Salud y pensión no se incluyen aquí porque ya se calculan automáticamente
          default:
            console.log(`   ⚠️ Tipo de novedad no clasificado: ${novedad.tipo_novedad}`);
        }
      }

      // 4. Total devengado CON NOVEDADES
      const grossPay = proportionalSalary + transportAllowance + additionalEarnings;
      
      // 5. Deducciones (solo sobre salario proporcional, sin auxilio) + novedades
      const healthDeduction = Math.round(proportionalSalary * 0.04); // 4%
      const pensionDeduction = Math.round(proportionalSalary * 0.04); // 4%
      const totalDeductions = healthDeduction + pensionDeduction + additionalDeductions;
      
      // 6. Neto a pagar
      const netPay = grossPay - totalDeductions;
      
      console.log(`💰 RESULTADO ALELUYA CON NOVEDADES para ${employee.nombre}:`, {
        proportionalSalary,
        transportAllowance,
        additionalEarnings,
        extraHours,
        bonuses,
        grossPay,
        totalDeductions,
        additionalDeductions,
        netPay
      });

      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary,
        workedDays,
        extraHours,
        disabilities: 0,
        bonuses,
        absences: 0,
        grossPay,
        deductions: totalDeductions,
        netPay,
        status: 'valid',
        errors: [],
        eps: employee.eps || '',
        afp: employee.afp || '',
        transportAllowance,
        employerContributions: this.calculateEmployerContributions(baseSalary)
      };
    } catch (error) {
      console.error('❌ Error en cálculo ALELUYA:', error);
      
      // Fallback básico
      const baseSalary = Number(employee.salario_base) || 0;
      const workedDays = this.validateWorkedDays(employee.dias_trabajo, periodicity);
      
      return {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary,
        workedDays,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: 0,
        deductions: 0,
        netPay: 0,
        status: 'error',
        errors: ['Error en cálculo - usar valores por defecto'],
        eps: employee.eps || '',
        afp: employee.afp || '',
        transportAllowance: 0,
        employerContributions: 0
      };
    }
  }

  private static calculateEmployerContributions(baseSalary: number): number {
    // Cálculo aproximado de aportes patronales
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
      console.log(`🔐 ALELUYA - Cerrando período: ${period.periodo}`);
      
      // ✅ CORRECCIÓN PARA DEDUCCIONES SEPARADAS
      console.log(`💾 ALELUYA - Guardando ${employees.length} registros con deducciones separadas...`);
      
      let successfulRecords = 0;
      const failedRecords: string[] = [];

      for (const employee of employees) {
        if (employee.status === 'valid') {
          try {
            // ✅ CÁLCULO CORRECTO DE DEDUCCIONES SEPARADAS
            const proportionalSalary = Math.round((employee.baseSalary / 30) * employee.workedDays);
            
            // Deducciones separadas sobre salario proporcional
            const healthDeduction = Math.round(proportionalSalary * 0.04); // 4%
            const pensionDeduction = Math.round(proportionalSalary * 0.04); // 4%
            
            // Deducciones adicionales de novedades (si las hay)
            const additionalDeductions = employee.deductions - (healthDeduction + pensionDeduction);
            
            console.log(`💰 DEDUCCIONES SEPARADAS para ${employee.name}:`, {
              proportionalSalary: proportionalSalary,
              healthDeduction: healthDeduction,
              pensionDeduction: pensionDeduction,
              additionalDeductions: Math.max(0, additionalDeductions),
              totalDeductions: employee.deductions
            });

            // ✅ ALELUYA: Guardar con deducciones separadas
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
              // ✅ DEDUCCIONES SEPARADAS - CORRECCIÓN PRINCIPAL
              salud_empleado: healthDeduction,
              pension_empleado: pensionDeduction,
              otras_deducciones: Math.max(0, additionalDeductions),
              total_deducciones: employee.deductions,
              neto_pagado: employee.netPay,
              estado: 'procesada'
            };

            console.log(`💾 ALELUYA - Guardando con deducciones separadas para ${employee.name}:`, {
              salud_empleado: payrollData.salud_empleado,
              pension_empleado: payrollData.pension_empleado,
              otras_deducciones: payrollData.otras_deducciones,
              total_deducciones: payrollData.total_deducciones
            });

            const { error: payrollError } = await supabase
              .from('payrolls')
              .upsert(payrollData, {
                onConflict: 'company_id,employee_id,period_id',
                ignoreDuplicates: false
              });

            if (payrollError) {
              console.error(`❌ Error guardando nómina para empleado ${employee.name}:`, payrollError);
              failedRecords.push(employee.name);
            } else {
              successfulRecords++;
              console.log(`✅ ALELUYA - Deducciones separadas guardadas para ${employee.name}`);
            }
          } catch (error) {
            console.error(`❌ Error crítico guardando empleado ${employee.name}:`, error);
            failedRecords.push(employee.name);
          }
        }
      }

      console.log(`📊 ALELUYA - Resultados: ${successfulRecords} exitosos, ${failedRecords.length} fallidos`);

      // Calcular totales basados en registros válidos
      const validEmployees = employees.filter(emp => emp.status === 'valid');
      const totalDevengado = validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0);
      const totalDeducciones = validEmployees.reduce((sum, emp) => sum + emp.deductions, 0);
      const totalNeto = validEmployees.reduce((sum, emp) => sum + emp.netPay, 0);

      // Actualizar estado del período con totales PROPORCIONALES
      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          empleados_count: successfulRecords,
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
        ? `Período ${period.periodo} cerrado con deducciones separadas. ${successfulRecords} empleados procesados, ${failedRecords.length} fallaron.`
        : `Período ${period.periodo} cerrado exitosamente con deducciones separadas para ${successfulRecords} empleados`;

      console.log(`✅ ALELUYA - ${message}`);
      return message;
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      throw error;
    }
  }
}
