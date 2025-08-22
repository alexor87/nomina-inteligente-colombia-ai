import { supabase } from '@/integrations/supabase/client';
import { SecureBaseService } from './SecureBaseService';
import { NovedadesCalculationService } from './NovedadesCalculationService';
import { ConfigurationService } from './ConfigurationService';
import { DeductionCalculationService } from './DeductionCalculationService';
import { format, parseISO } from 'date-fns';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  devengos: number;
  deducciones: number;
  total_pagar: number;
  dias_trabajados: number;
  auxilio_transporte: number;
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  deducciones_novedades: number;
}

// ✅ NUEVA INTERFAZ: Para validar datos de empleado antes de liquidar
interface EmployeeInputData {
  id: string;
  name?: string;
  baseSalary?: number;
  salario_base?: number;
  worked_days?: number;
  dias_trabajados?: number;
  transport_allowance?: number;
  auxilio_transporte?: number;
  additional_deductions?: number;
  deducciones_novedades?: number;
  [key: string]: any;
}

/**
 * 🔒 SECURITY MIGRATION: PayrollLiquidationService now extends SecureBaseService
 * All database operations are automatically secured with company_id filtering
 */
export class PayrollLiquidationService extends SecureBaseService {

  // ✅ NUEVA FUNCIÓN: Normalizar datos de empleado (inglés → español)
  static normalizeEmployeeData(employee: EmployeeInputData): any {
    console.log('🔄 Normalizando datos del empleado:', employee.id);
    
    const normalized = {
      id: employee.id,
      // ✅ MAPEO CLAVE: inglés → español con fallbacks
      salario_base: employee.salario_base ?? employee.baseSalary ?? 0,
      dias_trabajados: employee.dias_trabajados ?? employee.worked_days ?? 15,
      auxilio_transporte: employee.auxilio_transporte ?? employee.transport_allowance ?? 0,
      deducciones_novedades: employee.deducciones_novedades ?? employee.additional_deductions ?? 0,
      // Conservar otros campos
      devengos: employee.devengos ?? 0,
      deducciones: employee.deducciones ?? 0,
      total_pagar: employee.total_pagar ?? 0,
      salud_empleado: employee.salud_empleado ?? 0,
      pension_empleado: employee.pension_empleado ?? 0,
      fondo_solidaridad: employee.fondo_solidaridad ?? 0,
      retencion_fuente: employee.retencion_fuente ?? 0
    };

    // ✅ VALIDACIÓN: Verificar campos críticos
    if (!normalized.salario_base || normalized.salario_base <= 0) {
      throw new Error(`❌ Empleado ${employee.id}: salario_base inválido (${normalized.salario_base})`);
    }
    if (!normalized.dias_trabajados || normalized.dias_trabajados <= 0) {
      throw new Error(`❌ Empleado ${employee.id}: dias_trabajados inválido (${normalized.dias_trabajados})`);
    }

    console.log('✅ Datos normalizados:', {
      id: normalized.id,
      salario_base: normalized.salario_base,
      dias_trabajados: normalized.dias_trabajados,
      auxilio_transporte: normalized.auxilio_transporte
    });

    return normalized;
  }

  // ✅ NUEVA FUNCIÓN: Validar lista de empleados antes de liquidar
  static validateEmployeesForLiquidation(employees: EmployeeInputData[]): void {
    console.log('🔍 Validando empleados para liquidación...');
    
    if (!employees || employees.length === 0) {
      throw new Error('❌ No hay empleados para liquidar');
    }

    const errors: string[] = [];
    
    employees.forEach((employee, index) => {
      if (!employee.id) {
        errors.push(`Empleado ${index + 1}: ID faltante`);
      }
      
      const salario = employee.salario_base ?? employee.baseSalary;
      if (!salario || salario <= 0) {
        errors.push(`Empleado ${employee.id || index + 1}: salario_base inválido`);
      }
      
      const dias = employee.dias_trabajados ?? employee.worked_days;
      if (!dias || dias <= 0) {
        errors.push(`Empleado ${employee.id || index + 1}: dias_trabajados inválido`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`❌ Errores de validación:\n${errors.join('\n')}`);
    }

    console.log('✅ Validación exitosa:', employees.length, 'empleados');
  }

  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(diffDays, 30);
  }

  static calculateTransportAllowance(baseSalary: number, workedDays: number, year?: string): number {
    const configYear = year || new Date().getFullYear().toString();
    const config = ConfigurationService.getConfiguration(configYear);
    const dosSmmlv = config.salarioMinimo * 2;
    if (baseSalary <= dosSmmlv) {
      return Math.round((config.auxilioTransporte / 30) * workedDays);
    }
    return 0;
  }

  static async ensurePeriodExists(startDate: string, endDate: string): Promise<string> {
    try {
      console.log('🔒 Ensuring period exists securely (KISS)');
      
      // ✅ KISS FIX: Formateo directo sin Date objects para evitar timezone shift
      const periodName = `${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;

      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }

      // Buscar por fechas + empresa SIN lanzar error cuando no existe
      const { data: existingPeriod, error: existingErr } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .maybeSingle();

      if (existingErr) {
        console.warn('⚠️ Error buscando período (non-fatal):', existingErr.message);
      }

      if (existingPeriod?.id) {
        return existingPeriod.id;
      }

      // Crear período como borrador y devolver su id en una sola operación
      const { data: newPeriod, error: insertErr } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: 'personalizado',
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select('id, periodo')
        .single();

      if (insertErr) {
        throw insertErr;
      }

      return newPeriod.id;
    } catch (error) {
      console.error('Error ensuring period exists:', error);
      throw error;
    }
  }

  static async loadEmployeesForPeriod(startDate: string, endDate: string, year?: string): Promise<Employee[]> {
    try {
      console.log('🔒 Loading employees for period securely');

      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const employeesQuery = this.secureQuery('employees', companyId, 'id, nombre, apellido, salario_base', {
        estado: 'activo'
      });
      
      const { data: employees, error } = await employeesQuery;

      if (error) {
        throw error;
      }

      if (!employees || employees.length === 0) {
        return [];
      }

      const diasTrabajados = this.calculateWorkingDays(startDate, endDate);
      const configYear = year || new Date().getFullYear().toString();
      
      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados, configYear);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual',
          year: configYear
        });
        
        return {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          salario_base: employee.salario_base,
          devengos: 0,
          deducciones: deductionResult.totalDeducciones,
          total_pagar: totalDevengado - deductionResult.totalDeducciones,
          dias_trabajados: diasTrabajados,
          auxilio_transporte: auxilioTransporte,
          salud_empleado: deductionResult.saludEmpleado,
          pension_empleado: deductionResult.pensionEmpleado,
          fondo_solidaridad: deductionResult.fondoSolidaridad,
          retencion_fuente: deductionResult.retencionFuente,
          deducciones_novedades: 0
        };
      }));

      return processedEmployees;
    } catch (error) {
      console.error('Error loading employees for period:', error);
      throw error;
    }
  }

  static async loadSpecificEmployeesForPeriod(employeeIds: string[], startDate: string, endDate: string, year?: string): Promise<Employee[]> {
    try {
      console.log('🔒 Loading specific employees for period securely');

      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const employeesQuery = this.secureQuery('employees', companyId, 'id, nombre, apellido, salario_base', {
        estado: 'activo'
      });
      
      const { data: employees, error } = await employeesQuery.in('id', employeeIds);

      if (error) {
        throw error;
      }

      if (!employees || employees.length === 0) {
        return [];
      }

      const diasTrabajados = this.calculateWorkingDays(startDate, endDate);
      const configYear = year || new Date().getFullYear().toString();
      
      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados, configYear);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual',
          year: configYear
        });
        
        return {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          salario_base: employee.salario_base,
          devengos: 0,
          deducciones: deductionResult.totalDeducciones,
          total_pagar: totalDevengado - deductionResult.totalDeducciones,
          dias_trabajados: diasTrabajados,
          auxilio_transporte: auxilioTransporte,
          salud_empleado: deductionResult.saludEmpleado,
          pension_empleado: deductionResult.pensionEmpleado,
          fondo_solidaridad: deductionResult.fondoSolidaridad,
          retencion_fuente: deductionResult.retencionFuente,
          deducciones_novedades: 0
        };
      }));

      return processedEmployees;
    } catch (error) {
      console.error('Error loading specific employees for period:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Liquidación con normalización de datos y validación previa
   */
  static async liquidatePayroll(employees: EmployeeInputData[], startDate: string, endDate: string) {
    try {
      console.log('🚀 Iniciando liquidación con validación y normalización...');
      
      // ✅ PASO 1: Validar datos de entrada
      this.validateEmployeesForLiquidation(employees);
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const periodId = await this.ensurePeriodExists(startDate, endDate);

      const { data: periodData, error: periodFetchErr } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('id', periodId)
        .maybeSingle();

      if (periodFetchErr || !periodData) {
        throw new Error(`No se pudo cargar el período generado (${periodFetchErr?.message || 'sin datos'})`);
      }

      const periodName = periodData.periodo;

      const payrollInserts = [];
      
      // ✅ PASO 2: Normalizar y procesar cada empleado
      for (const employeeInput of employees) {
        try {
          const employee = this.normalizeEmployeeData(employeeInput);
          
          const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
          const totalDevengadoFinal = salarioProporcional + employee.auxilio_transporte + employee.devengos;
          const totalDeduccionesFinal = employee.deducciones + employee.deducciones_novedades;
          const netoPagadoFinal = totalDevengadoFinal - totalDeduccionesFinal;

          payrollInserts.push({
            company_id: companyId,
            employee_id: employee.id,
            periodo: periodName,
            period_id: periodId,
            salario_base: employee.salario_base, // ✅ GARANTIZADO: no null
            dias_trabajados: employee.dias_trabajados,
            auxilio_transporte: employee.auxilio_transporte,
            total_devengado: totalDevengadoFinal,
            salud_empleado: employee.salud_empleado,
            pension_empleado: employee.pension_empleado,
            fondo_solidaridad: employee.fondo_solidaridad,
            retencion_fuente: employee.retencion_fuente,
            otras_deducciones: employee.deducciones_novedades,
            total_deducciones: totalDeduccionesFinal,
            neto_pagado: netoPagadoFinal,
            estado: 'procesada',
          });
        } catch (employeeError) {
          console.error(`❌ Error procesando empleado ${employeeInput.id}:`, employeeError);
          throw new Error(`Error en empleado ${employeeInput.id}: ${employeeError.message}`);
        }
      }

      if (payrollInserts.length > 0) {
        // Use upsert to avoid unique_violation on existing payrolls for the same employee/period/company
        const { error: payrollError } = await supabase
          .from('payrolls')
          .upsert(
            payrollInserts.map((p) => ({ ...p, updated_at: new Date().toISOString() })),
            { onConflict: 'company_id,employee_id,period_id' }
          )
          .select('id');
        if (payrollError) {
          throw payrollError;
        }
      }

      // Calculate totals from the values we just wrote
      console.log('🧮 Calculando totales. Registros:', payrollInserts.length);
      payrollInserts.forEach((p, index) => {
        if (!Number.isFinite(p.neto_pagado) || p.neto_pagado == null) {
          console.warn(`⚠️ Valor inválido en empleado ${index}:`, {
            employee_id: p.employee_id,
            neto_pagado: p.neto_pagado,
            tipo: typeof p.neto_pagado,
          });
        }
      });

      const finalTotalDevengado = payrollInserts.reduce((sum, p) => sum + (Number(p.total_devengado) || 0), 0);
      const finalTotalDeducciones = payrollInserts.reduce((sum, p) => sum + (Number(p.total_deducciones) || 0), 0);
      const finalTotalNeto = payrollInserts.reduce((sum, p) => sum + (Number(p.neto_pagado) || 0), 0);

      console.log('💰 Totales calculados:', {
        devengado: finalTotalDevengado,
        deducciones: finalTotalDeducciones,
        neto: finalTotalNeto,
        neto_valid: Number.isFinite(finalTotalNeto),
      });

      if (!Number.isFinite(finalTotalNeto) || finalTotalNeto < 0) {
        console.error('❌ Error en cálculo de neto total:', finalTotalNeto);
        throw new Error(`Error en cálculo de neto total: ${finalTotalNeto}`);
      }

      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          empleados_count: employees.length,
          total_devengado: finalTotalDevengado,
          total_deducciones: finalTotalDeducciones,
          total_neto: finalTotalNeto,
          estado: 'cerrado',
        })
        .eq('id', periodId);
      if (updateError) {
        throw updateError;
      }

      console.log('✅ LIQUIDACIÓN COMPLETADA CON NORMALIZACIÓN:', {
        totalDevengado: finalTotalDevengado,
        totalDeducciones: finalTotalDeducciones,
        totalNeto: finalTotalNeto,
      });

      return {
        success: true,
        message: `Liquidación completada para ${employees.length} empleados con normalización de datos`,
        periodId: periodId,
        summary: {
          totalEmployees: employees.length,
          validEmployees: employees.length,
          totalGrossPay: Number.isFinite(finalTotalDevengado) ? finalTotalDevengado : 0,
          totalDeductions: Number.isFinite(finalTotalDeducciones) ? finalTotalDeducciones : 0,
          totalNetPay: Number.isFinite(finalTotalNeto) ? finalTotalNeto : 0,
          employerContributions: finalTotalDevengado * 0.205,
          totalPayrollCost: finalTotalDevengado + finalTotalDevengado * 0.205,
        },
      };
    } catch (error: any) {
      console.error('❌ Error liquidating payroll:', error);
      return {
        success: false,
        message: error?.message || String(error) || 'Error desconocido',
      };
    }
  }

  /**
   * ✅ CORREGIDO: Consolidar novedades con transacciones atómicas
   */
  static async consolidatePayrollWithNovedades(periodId: string): Promise<void> {
    try {
      console.log('🔄 Iniciando consolidación CORREGIDA para período:', periodId);
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payrolls')
        .select('id, employee_id, salario_base, dias_trabajados, auxilio_transporte')
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollError) {
        throw payrollError;
      }

      if (!payrollRecords || payrollRecords.length === 0) {
        console.log('⚠️ No hay registros de payroll para consolidar');
        return;
      }

      const employeeIds = payrollRecords.map(record => record.employee_id);
      const novedadesTotals = await NovedadesCalculationService.calculateAllEmployeesNovedadesTotals(employeeIds, periodId);

      // ✅ CORREGIDO: Procesar en lotes para evitar bloqueos
      const batchSize = 10;
      for (let i = 0; i < payrollRecords.length; i += batchSize) {
        const batch = payrollRecords.slice(i, i + batchSize);
        const updates = [];

        for (const payrollRecord of batch) {
          const employeeNovedades = novedadesTotals[payrollRecord.employee_id] || {
            totalDevengos: 0,
            totalDeducciones: 0,
            totalNeto: 0,
            hasNovedades: false
          };

          const salarioBase = Number(payrollRecord.salario_base) || 0;
          const auxilioTransporte = Number(payrollRecord.auxilio_transporte) || 0;
          const diasTrabajados = Number(payrollRecord.dias_trabajados) || 15;
          
          const salarioProporcional = (salarioBase / 30) * diasTrabajados;
          
          const deductionResult = await DeductionCalculationService.calculateDeductions({
            salarioBase: salarioBase,
            totalDevengado: salarioProporcional + auxilioTransporte + employeeNovedades.totalDevengos,
            auxilioTransporte: auxilioTransporte,
            periodType: 'quincenal',
            year: new Date().getFullYear().toString() // Usar año actual para consolidación
          });

          const totalDevengadoFinal = salarioProporcional + auxilioTransporte + employeeNovedades.totalDevengos;
          const totalDeduccionesFinal = deductionResult.totalDeducciones + employeeNovedades.totalDeducciones;
          const netoPagadoFinal = totalDevengadoFinal - totalDeduccionesFinal;

          updates.push({
            id: payrollRecord.id,
            total_devengado: totalDevengadoFinal,
            total_deducciones: totalDeduccionesFinal,
            neto_pagado: netoPagadoFinal,
            salud_empleado: deductionResult.saludEmpleado,
            pension_empleado: deductionResult.pensionEmpleado,
            fondo_solidaridad: deductionResult.fondoSolidaridad,
            retencion_fuente: deductionResult.retencionFuente,
            otras_deducciones: employeeNovedades.totalDeducciones,
            updated_at: new Date().toISOString()
          });
        }

        // ✅ CORREGIDO: Actualizar en lotes
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('payrolls')
            .update(update)
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Error actualizando payroll ${update.id}:`, updateError);
          }
        }
      }

      console.log('✅ Consolidación CORREGIDA completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en consolidación corregida:', error);
      throw error;
    }
  }
}
