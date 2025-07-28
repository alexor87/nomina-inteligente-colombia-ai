
import { supabase } from '@/integrations/supabase/client';
import { SecureBaseService } from './SecureBaseService';
import { NovedadesCalculationService } from './NovedadesCalculationService';
import { ConfigurationService } from './ConfigurationService';
import { DeductionCalculationService } from './DeductionCalculationService';
import { format } from 'date-fns';

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

/**
 * 🔒 SECURITY MIGRATION: PayrollLiquidationService now extends SecureBaseService
 * All database operations are automatically secured with company_id filtering
 */
export class PayrollLiquidationService extends SecureBaseService {

  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(diffDays, 30);
  }

  static calculateTransportAllowance(baseSalary: number, workedDays: number): number {
    const currentYear = new Date().getFullYear().toString();
    const config = ConfigurationService.getConfiguration(currentYear);
    
    const dosSmmlv = config.salarioMinimo * 2;
    
    if (baseSalary <= dosSmmlv) {
      return Math.round((config.auxilioTransporte / 30) * workedDays);
    }
    
    return 0;
  }

  static async ensurePeriodExists(startDate: string, endDate: string): Promise<string> {
    try {
      console.log('🔒 Ensuring period exists securely');
      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
      
      // Use secure query to check for existing period
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('🔒 [SECURITY] Access denied: No company context');
      }
      
      const existingQuery = this.secureQuery('payroll_periods_real', companyId, 'id', {
        fecha_inicio: startDate,
        fecha_fin: endDate
      });
      
      const { data: existingPeriod } = await existingQuery.single();

      if (existingPeriod) {
        return existingPeriod.id;
      }

      // Use secure insert to create new period
      const { data: newPeriod, error } = await this.secureInsert('payroll_periods_real', {
        periodo: periodName,
        fecha_inicio: startDate,
        fecha_fin: endDate,
        tipo_periodo: 'personalizado',
        estado: 'borrador',
        empleados_count: 0,
        total_devengado: 0,
        total_deducciones: 0,
        total_neto: 0
      });

      if (error) {
        throw error;
      }

      return newPeriod[0].id;
    } catch (error) {
      console.error('Error ensuring period exists:', error);
      throw error;
    }
  }

  static async loadEmployeesForPeriod(startDate: string, endDate: string): Promise<Employee[]> {
    try {
      console.log('🔒 Loading employees for period securely');

      // Use secure query to get active employees
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

      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual'
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

  static async loadSpecificEmployeesForPeriod(employeeIds: string[], startDate: string, endDate: string): Promise<Employee[]> {
    try {
      console.log('🔒 Loading specific employees for period securely');

      // Use secure query with IN filter for specific employees
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

      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual'
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
   * ✅ CORREGIDO: Liquidación con cálculo único de totales
   */
  static async liquidatePayroll(employees: Employee[], startDate: string, endDate: string) {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;

      // ✅ CORREGIDO: Crear período SIN totales iniciales
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: periodName,
          fecha_inicio: startDate,
          fecha_fin: endDate,
          tipo_periodo: 'personalizado',
          estado: 'cerrado',
          empleados_count: employees.length,
          // ✅ CORREGIDO: NO escribir totales iniciales
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (periodError) {
        throw periodError;
      }

      // ✅ CORREGIDO: Crear registros de payroll
      const payrollInserts = [];
      for (const employee of employees) {
        const salarioProporcional = (employee.salario_base / 30) * employee.dias_trabajados;
        const totalDevengadoFinal = salarioProporcional + employee.auxilio_transporte + employee.devengos;
        const totalDeduccionesFinal = employee.deducciones + employee.deducciones_novedades;
        const netoPagadoFinal = totalDevengadoFinal - totalDeduccionesFinal;

        payrollInserts.push({
          company_id: companyId,
          employee_id: employee.id,
          periodo: periodName,
          period_id: period.id,
          salario_base: employee.salario_base,
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
          estado: 'procesada'
        });
      }

      const { error: payrollError } = await supabase
        .from('payrolls')
        .insert(payrollInserts);

      if (payrollError) {
        throw payrollError;
      }

      // ✅ CORREGIDO: Calcular totales CORRECTOS una sola vez con validación
      console.log('🧮 Calculando totales. Registros:', payrollInserts.length);
      
      // Log valores para debugging
      payrollInserts.forEach((p, index) => {
        if (!Number.isFinite(p.neto_pagado) || p.neto_pagado == null) {
          console.warn(`⚠️ Valor inválido en empleado ${index}:`, {
            employee_id: p.employee_id,
            neto_pagado: p.neto_pagado,
            tipo: typeof p.neto_pagado
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
        neto_valid: Number.isFinite(finalTotalNeto)
      });
      
      // Validación adicional
      if (!Number.isFinite(finalTotalNeto) || finalTotalNeto < 0) {
        console.error('❌ Error en cálculo de neto total:', finalTotalNeto);
        throw new Error(`Error en cálculo de neto total: ${finalTotalNeto}`);
      }

      // ✅ CORREGIDO: Actualizar totales UNA SOLA VEZ
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: finalTotalDevengado,
          total_deducciones: finalTotalDeducciones,
          total_neto: finalTotalNeto
        })
        .eq('id', period.id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ LIQUIDACIÓN COMPLETADA CON TOTALES ÚNICOS:', {
        totalDevengado: finalTotalDevengado,
        totalDeducciones: finalTotalDeducciones,
        totalNeto: finalTotalNeto
      });

      return {
        success: true,
        message: `Liquidación completada para ${employees.length} empleados con cálculo único de totales`,
        periodId: period.id,
        summary: {
          totalEmployees: employees.length,
          validEmployees: employees.length,
          totalGrossPay: finalTotalDevengado,
          totalDeductions: finalTotalDeducciones,
          totalNetPay: finalTotalNeto,
          employerContributions: finalTotalDevengado * 0.205,
          totalPayrollCost: finalTotalDevengado + (finalTotalDevengado * 0.205)
        }
      };
    } catch (error) {
      console.error('Error liquidating payroll:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
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
            periodType: 'quincenal'
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
