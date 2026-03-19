import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollCalculationEnhancedService } from './PayrollCalculationEnhancedService';
import { ConfigurationService } from './ConfigurationService';
import { PORCENTAJES_NOMINA } from '@/constants';
import { logger } from '@/lib/logger';

export class PayrollLiquidationNewService {
  static async loadEmployeesForActivePeriod(period: any): Promise<PayrollEmployee[]> {
    try {
      logger.log('🔍 ALELUYA - Cargando empleados para período:', period.periodo);
      logger.log('📅 Período completo:', period);

      const companyId = period.company_id;
      
      // Obtener empleados activos de la empresa
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (employeesError) {
        logger.error('❌ Error cargando empleados:', employeesError);
        throw employeesError;
      }

      logger.log(`👥 Empleados activos encontrados: ${employees?.length || 0}`);

      if (!employees || employees.length === 0) {
        logger.log('⚠️ No se encontraron empleados activos');
        return [];
      }

      // **CORRECCIÓN ALELUYA: Obtener la periodicidad real de la empresa**
      const companyPeriodicity = await PayrollCalculationEnhancedService.getUserConfiguredPeriodicity();
      logger.log(`⚙️ Periodicidad ALELUYA: ${companyPeriodicity}`);

      // Buscar nóminas existentes para este período
      const { data: existingPayrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo', period.periodo);

      if (payrollsError) {
        logger.error('❌ Error consultando nóminas existentes:', payrollsError);
      }

      logger.log(`💼 Nóminas existentes para período: ${existingPayrolls?.length || 0}`);

      // Obtener novedades para el período
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo_id', period.id);

      if (novedadesError) {
        logger.error('❌ Error cargando novedades:', novedadesError);
      }

      logger.log(`📋 Novedades encontradas: ${novedades?.length || 0}`);

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
            logger.log(`✅ Nómina existente ALELUYA para: ${employee.nombre} - Verificando valores`);
            payrollEmployee = this.mapExistingPayrollToEmployee(employee, existingPayroll, companyPeriodicity);
          } else {
            // ✅ CORRECCIÓN ALELUYA: Calcular nueva nómina con lógica exacta
            logger.log(`🔄 Calculando ALELUYA para: ${employee.nombre} con periodicidad: ${companyPeriodicity}`);
            payrollEmployee = await this.calculateEmployeePayrollAleluya(
              employee, 
              period, 
              employeeNovedades, 
              companyPeriodicity
            );
          }

          processedEmployees.push(payrollEmployee);
        } catch (error) {
          logger.error(`❌ Error procesando empleado ${employee.nombre}:`, error);
          
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
            employerContributions: 0,
            healthDeduction: 0,
            pensionDeduction: 0
          });
        }
      }

      logger.log(`✅ ALELUYA - Empleados procesados: ${processedEmployees.length}`);
      return processedEmployees;

    } catch (error) {
      logger.error('💥 Error crítico en loadEmployeesForActivePeriod:', error);
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
      logger.warn(`⚠️ ALELUYA - Días trabajados (${workedDays}) exceden máximo para período ${periodicity} (${maxDays}). Ajustando.`);
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
    
    logger.log(`📊 ALELUYA - ${employee.nombre}: días=${validatedWorkedDays}, periodicidad=${periodicity}`);
    
    const healthDeduction = Number(payroll.salud_empleado) || 0;
    const pensionDeduction = Number(payroll.pension_empleado) || 0;
    
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
      employerContributions: this.calculateEmployerContributions(Number(payroll.salario_base) || 0),
      healthDeduction,
      pensionDeduction
    };
  }

  // ✅ NUEVA FUNCIÓN ALELUYA: Cálculo exacto como Aleluya CON NOVEDADES Y BONIFICACIONES CONSTITUTIVAS
  private static async calculateEmployeePayrollAleluya(
    employee: any, 
    period: any, 
    novedades: any[], 
    periodicity: 'quincenal' | 'mensual' | 'semanal'
  ): Promise<PayrollEmployee> {
    try {
      const baseSalary = Number(employee.salario_base) || 0;
      const workedDays = this.validateWorkedDays(employee.dias_trabajo, periodicity);
      
      logger.log(`🔢 ALELUYA - Calculando para ${employee.nombre}:`, {
        baseSalary,
        workedDays,
        periodicity,
        novedades: novedades.length
      });
      
      // ✅ OBTENER CONFIGURACIÓN DINÁMICA
      const currentYear = new Date().getFullYear().toString();
      const config = await ConfigurationService.getConfigurationAsync(currentYear);
      logger.log(`⚙️ Usando configuración para año: ${currentYear}`, config);
      
      // ✅ CÁLCULO ALELUYA EXACTO
      // 1. Salario proporcional: (salario_mensual / 30) × días_trabajados
      const dailySalary = Number(baseSalary) / 30;
      const proportionalSalary = Math.round(dailySalary * workedDays);
      
      // 2. Auxilio de transporte / conectividad proporcional (si aplica) - ✅ VALORES DINÁMICOS
      let transportAllowance = 0;
      const transportLimit = config.salarioMinimo * 2; // Límite 2 SMMLV
      if (Number(baseSalary) <= transportLimit) {
        const dailyTransport = config.auxilioTransporte / 30;
        transportAllowance = Math.round(dailyTransport * workedDays);
      }

      // ✅ 3. PROCESAR NOVEDADES CON LÓGICA CONSTITUTIVA VS NO CONSTITUTIVA
      let extraHours = 0;
      let bonusesConstitutivos = 0;     // ✅ NUEVO: Bonificaciones constitutivas
      let bonusesNoConstitutivos = 0;   // ✅ NUEVO: Bonificaciones no constitutivas
      let additionalDeductions = 0;
      let additionalEarnings = 0;

      logger.log(`📋 Procesando ${novedades.length} novedades para ${employee.nombre}:`);
      
      for (const novedad of novedades) {
        const valor = Number(novedad.valor) || 0;
        const esConstitutivo = Boolean(novedad.constitutivo_salario);
        
        logger.log(`   - ${novedad.tipo_novedad}: $${valor.toLocaleString()}, constitutivo: ${esConstitutivo}`);
        
        // Clasificar novedades
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
            // ✅ NUEVA LÓGICA: Separar bonificaciones constitutivas vs no constitutivas
            if (esConstitutivo) {
              bonusesConstitutivos += valor;
              logger.log(`   ✅ Bonificación CONSTITUTIVA: $${valor.toLocaleString()}`);
            } else {
              bonusesNoConstitutivos += valor;
              logger.log(`   ➡️ Bonificación NO CONSTITUTIVA: $${valor.toLocaleString()}`);
            }
            additionalEarnings += valor;
            break;
          case 'retencion_fuente':
          case 'prestamo':
          case 'embargo':
          case 'descuento_voluntario':
          case 'fondo_solidaridad':
            additionalDeductions += valor;
            break;
          default:
            logger.log(`   ⚠️ Tipo de novedad no clasificado: ${novedad.tipo_novedad}`);
        }
      }

      // 4. ✅ CALCULAR IBC CORRECTO CON HORAS EXTRA (según lógica de Aleluya)
      const salarioBaseParaAportes = proportionalSalary + bonusesConstitutivos + extraHours;
      
      // ✅ LÓGICA ALELUYA: Solo aplicar IBC mínimo si el salario base mensual < SMMLV
      // Si el salario base mensual >= SMMLV, usar el salario proporcional real
      const salarioBaseMensual = Number(employee.salario_base);
      let ibcSalud, ibcPension;
      
      if (salarioBaseMensual >= config.salarioMinimo) {
        // Empleado con salario >= SMMLV: usar salario proporcional real + horas extra
        ibcSalud = salarioBaseParaAportes;
        ibcPension = salarioBaseParaAportes;
      } else {
        // Empleado con salario < SMMLV: aplicar IBC mínimo proporcional
        const minIbc = (config.salarioMinimo / 30) * workedDays;
        ibcSalud = Math.max(salarioBaseParaAportes, minIbc);
        ibcPension = Math.max(salarioBaseParaAportes, minIbc);
      }
      
      logger.log(`💰 IBC para ${employee.nombre}:`, {
        salarioBaseParaAportes: salarioBaseParaAportes.toLocaleString(),
        ibcSalud: ibcSalud.toLocaleString(),
        ibcPension: ibcPension.toLocaleString(),
        incluyeHorasExtra: extraHours > 0,
        salarioMinimo: config.salarioMinimo.toLocaleString()
      });

      // 5. Total devengado (incluye todas las bonificaciones)
      const totalBonuses = bonusesConstitutivos + bonusesNoConstitutivos;
      const grossPay = proportionalSalary + transportAllowance + additionalEarnings;
      
      // 6. ✅ DEDUCCIONES sobre el IBC (no sobre salario base) - PORCENTAJES DINÁMICOS
      const healthDeduction = Math.round(ibcSalud * PORCENTAJES_NOMINA.SALUD_EMPLEADO);
      const pensionDeduction = Math.round(ibcPension * PORCENTAJES_NOMINA.PENSION_EMPLEADO);
      const totalDeductions = healthDeduction + pensionDeduction + additionalDeductions;
      
      // 7. Neto a pagar
      const netPay = grossPay - totalDeductions;
      
      logger.log(`💰 RESULTADO ALELUYA CON BONIFICACIONES CONSTITUTIVAS para ${employee.nombre}:`, {
        proportionalSalary,
        bonusesConstitutivos,
        bonusesNoConstitutivos,
        salarioBaseParaAportes,
        transportAllowance,
        additionalEarnings,
        extraHours,
        totalBonuses,
        grossPay,
        healthDeduction,
        pensionDeduction,
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
        bonuses: totalBonuses, // Total de bonificaciones (constitutivas + no constitutivas)
        absences: 0,
        grossPay,
        deductions: totalDeductions,
        netPay,
        status: 'valid',
        errors: [],
        eps: employee.eps || '',
        afp: employee.afp || '',
        transportAllowance,
        employerContributions: this.calculateEmployerContributions(salarioBaseParaAportes), // ✅ Usar base para aportes
        healthDeduction,
        pensionDeduction
      };
    } catch (error) {
      logger.error('❌ Error en cálculo ALELUYA:', error);
      
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
        employerContributions: 0,
        healthDeduction: 0,
        pensionDeduction: 0
      };
    }
  }

  private static calculateEmployerContributions(salarioBaseParaAportes: number): number {
    // ✅ Cálculo detallado de aportes patronales usando porcentajes configurados
    const saludEmpleador = salarioBaseParaAportes * PORCENTAJES_NOMINA.SALUD_EMPLEADOR;
    const pensionEmpleador = salarioBaseParaAportes * PORCENTAJES_NOMINA.PENSION_EMPLEADOR;
    const arl = salarioBaseParaAportes * PORCENTAJES_NOMINA.ARL;
    const cajaCompensacion = salarioBaseParaAportes * PORCENTAJES_NOMINA.CAJA_COMPENSACION;
    const icbf = salarioBaseParaAportes * PORCENTAJES_NOMINA.ICBF;
    const sena = salarioBaseParaAportes * PORCENTAJES_NOMINA.SENA;
    
    const totalContributions = saludEmpleador + pensionEmpleador + arl + cajaCompensacion + icbf + sena;
    
    logger.log(`👔 Aportes patronales detallados:`, {
      base: salarioBaseParaAportes.toLocaleString(),
      salud: saludEmpleador.toLocaleString(),
      pension: pensionEmpleador.toLocaleString(),
      arl: arl.toLocaleString(),
      caja: cajaCompensacion.toLocaleString(),
      icbf: icbf.toLocaleString(),
      sena: sena.toLocaleString(),
      total: totalContributions.toLocaleString()
    });
    
    return Math.round(totalContributions);
  }

  static async updateEmployeeCount(periodId: string, count: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ empleados_count: count })
        .eq('id', periodId);

      if (error) throw error;
      
      logger.log(`✅ Contador de empleados actualizado: ${count}`);
    } catch (error) {
      logger.error('❌ Error actualizando contador de empleados:', error);
    }
  }

  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<void> {
    try {
      logger.log(`🗑️ Removiendo empleado ${employeeId} del período ${periodId}`);
      
      // Eliminar nómina del empleado para este período
      const { error: payrollError } = await supabase
        .from('payrolls')
        .delete()
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (payrollError) {
        logger.error('❌ Error eliminando nómina:', payrollError);
        throw payrollError;
      }

      // Eliminar novedades del empleado para este período
      const { error: novedadesError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        logger.error('❌ Error eliminando novedades:', novedadesError);
        throw novedadesError;
      }

      logger.log(`✅ Empleado ${employeeId} removido del período ${periodId}`);
    } catch (error) {
      logger.error('❌ Error removiendo empleado del período:', error);
      throw error;
    }
  }

  static async closePeriod(period: any, employees: PayrollEmployee[]): Promise<string> {
    try {
      logger.log(`🔐 ALELUYA - Iniciando cierre de período: ${period.periodo}`);
      
      // VALIDACIONES PRE-CIERRE
      const validEmployees = employees.filter(emp => emp.status === 'valid');
      if (validEmployees.length === 0) {
        throw new Error('No hay empleados válidos para cerrar el período');
      }

      logger.log(`💾 ALELUYA - Guardando ${validEmployees.length} registros válidos...`);
      
      // TRANSACCIÓN: Usar una sola operación para consistencia
      const payrollRecords = [];
      let successfulRecords = 0;
      const failedRecords: string[] = [];

      // Preparar todos los registros
      for (const employee of validEmployees) {
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
            salud_empleado: employee.healthDeduction, // ✅ Agregar campo faltante
            pension_empleado: employee.pensionDeduction, // ✅ Agregar campo faltante
            total_deducciones: employee.deductions,
            neto_pagado: employee.netPay,
            estado: 'procesada',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          logger.log(`💾 ALELUYA - Preparando datos para ${employee.name}:`, {
            grossPay: payrollData.total_devengado,
            netPay: payrollData.neto_pagado,
            days: payrollData.dias_trabajados
          });

          payrollRecords.push(payrollData);
        } catch (error) {
          logger.error(`❌ Error preparando datos para ${employee.name}:`, error);
          failedRecords.push(employee.name);
        }
      }

      // GUARDAR TODOS LOS REGISTROS EN LOTE
      if (payrollRecords.length > 0) {
        const { data, error: batchError } = await supabase
          .from('payrolls')
          .upsert(payrollRecords, {
            onConflict: 'company_id,employee_id,period_id',
            ignoreDuplicates: false
          })
          .select();

        if (batchError) {
          logger.error('❌ Error en guardado masivo:', batchError);
          throw new Error(`Error guardando nóminas: ${batchError.message}`);
        }

        successfulRecords = data?.length || 0;
        logger.log(`✅ ALELUYA - Guardados ${successfulRecords} registros exitosamente`);
      }

      // CALCULAR TOTALES CORRECTOS
      const totalDevengado = validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0);
      const totalDeducciones = validEmployees.reduce((sum, emp) => sum + emp.deductions, 0);
      const totalNeto = validEmployees.reduce((sum, emp) => sum + emp.netPay, 0);

      logger.log(`📊 ALELUYA - Totales calculados:`, {
        totalDevengado,
        totalDeducciones,
        totalNeto,
        empleados: successfulRecords
      });

      // ACTUALIZAR ESTADO DEL PERÍODO CON ROLLBACK
      const { error: periodError } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          empleados_count: successfulRecords,
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (periodError) {
        logger.error('❌ Error actualizando período:', periodError);
        
        // ROLLBACK: Eliminar registros de nómina si falló la actualización del período
        await supabase
          .from('payrolls')
          .delete()
          .eq('period_id', period.id)
          .eq('estado', 'procesada');
          
        throw new Error(`Error cerrando período: ${periodError.message}`);
      }

      const message = failedRecords.length > 0 
        ? `Período ${period.periodo} cerrado con ${successfulRecords} empleados. ${failedRecords.length} empleados fallaron.`
        : `Período ${period.periodo} cerrado exitosamente con ${successfulRecords} empleados procesados`;

      logger.log(`✅ ALELUYA - CIERRE COMPLETADO: ${message}`);
      return message;

    } catch (error) {
      logger.error('💥 Error crítico cerrando período:', error);
      
      // ROLLBACK COMPLETO en caso de error
      try {
        await supabase
          .from('payrolls')
          .delete()
          .eq('period_id', period.id)
          .eq('estado', 'procesada');
        
        logger.log('🔄 Rollback ejecutado - datos de nómina eliminados');
      } catch (rollbackError) {
        logger.error('❌ Error en rollback:', rollbackError);
      }
      
      throw error;
    }
  }

  static async recalculateAfterNovedadChange(employeeId: string, periodId: string): Promise<PayrollEmployee | null> {
    try {
      logger.log(`🔄 Recalculando empleado ${employeeId} en período ${periodId}`);
      
      // Obtener datos del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        logger.error('❌ Error obteniendo período:', periodError);
        return null;
      }

      // Obtener empleado
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (employeeError || !employee) {
        logger.error('❌ Error obteniendo empleado:', employeeError);
        return null;
      }

      // Obtener novedades actualizadas
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        logger.error('❌ Error obteniendo novedades:', novedadesError);
      }

      // Obtener periodicidad
      const periodicity = await PayrollCalculationEnhancedService.getUserConfiguredPeriodicity();

      // Recalcular empleado
      const recalculatedEmployee = await this.calculateEmployeePayrollAleluya(
        employee,
        period,
        novedades || [],
        periodicity
      );

      // Guardar resultado actualizado
      const payrollData = {
        company_id: period.company_id,
        employee_id: employee.id,
        periodo: period.periodo,
        period_id: period.id,
        salario_base: recalculatedEmployee.baseSalary,
        dias_trabajados: recalculatedEmployee.workedDays,
        horas_extra: recalculatedEmployee.extraHours,
        bonificaciones: recalculatedEmployee.bonuses,
        auxilio_transporte: recalculatedEmployee.transportAllowance,
        total_devengado: recalculatedEmployee.grossPay,
        total_deducciones: recalculatedEmployee.deductions,
        neto_pagado: recalculatedEmployee.netPay,
        estado: 'borrador',
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('payrolls')
        .upsert(payrollData, {
          onConflict: 'company_id,employee_id,period_id'
        });

      if (upsertError) {
        logger.error('❌ Error guardando recálculo:', upsertError);
        throw upsertError;
      }

      logger.log(`✅ Empleado ${employee.nombre} recalculado exitosamente`);
      return recalculatedEmployee;

    } catch (error) {
      logger.error('❌ Error en recálculo:', error);
      return null;
    }
  }
}
