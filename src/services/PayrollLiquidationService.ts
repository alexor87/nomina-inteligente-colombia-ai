
import { supabase } from '@/integrations/supabase/client';
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
  // Deducciones detalladas para auditoría
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  deducciones_novedades: number;
}

export class PayrollLiquidationService {
  
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both dates
    return Math.min(diffDays, 30); // Max 30 days per month
  }

  static calculateTransportAllowance(baseSalary: number, workedDays: number): number {
    const currentYear = new Date().getFullYear().toString();
    const config = ConfigurationService.getConfiguration(currentYear);
    
    // Calcular dos salarios mínimos legales
    const dosSmmlv = config.salarioMinimo * 2;
    
    // Solo aplica auxilio de transporte si el salario es menor o igual a 2 SMMLV
    if (baseSalary <= dosSmmlv) {
      // Calcular auxilio proporcional según días trabajados
      return Math.round((config.auxilioTransporte / 30) * workedDays);
    }
    
    return 0;
  }

  static async ensurePeriodExists(startDate: string, endDate: string): Promise<string> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
      
      // Check if period already exists
      const { data: existingPeriod } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .single();

      if (existingPeriod) {
        return existingPeriod.id;
      }

      // Create new period
      const { data: newPeriod, error } = await supabase
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
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return newPeriod.id;
    } catch (error) {
      console.error('Error ensuring period exists:', error);
      throw error;
    }
  }

  static async loadEmployeesForPeriod(startDate: string, endDate: string): Promise<Employee[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Load active employees
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, salario_base')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        throw error;
      }

      if (!employees || employees.length === 0) {
        return [];
      }

      // Calculate working days for the period
      const diasTrabajados = this.calculateWorkingDays(startDate, endDate);

      // Process each employee with detailed deduction calculation
      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        // ✅ CÁLCULO DETALLADO DE DEDUCCIONES PARA AUDITORÍA
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual'
        });
        
        console.log(`📊 Empleado ${employee.nombre}: Deducciones detalladas`, {
          salud: deductionResult.saludEmpleado,
          pension: deductionResult.pensionEmpleado,
          fondoSolidaridad: deductionResult.fondoSolidaridad,
          retencion: deductionResult.retencionFuente,
          total: deductionResult.totalDeducciones
        });
        
        return {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          salario_base: employee.salario_base,
          devengos: 0, // Will be filled with novedades
          deducciones: deductionResult.totalDeducciones,
          total_pagar: totalDevengado - deductionResult.totalDeducciones,
          dias_trabajados: diasTrabajados,
          auxilio_transporte: auxilioTransporte,
          // ✅ DEDUCCIONES DETALLADAS PARA AUDITORÍA DIAN/UGPP
          salud_empleado: deductionResult.saludEmpleado,
          pension_empleado: deductionResult.pensionEmpleado,
          fondo_solidaridad: deductionResult.fondoSolidaridad,
          retencion_fuente: deductionResult.retencionFuente,
          deducciones_novedades: 0 // Will be filled when processing novedades
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
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Load specific employees
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, salario_base')
        .eq('company_id', companyId)
        .eq('estado', 'activo')
        .in('id', employeeIds);

      if (error) {
        throw error;
      }

      if (!employees || employees.length === 0) {
        return [];
      }

      // Calculate working days for the period
      const diasTrabajados = this.calculateWorkingDays(startDate, endDate);

      // Process each employee with detailed deduction calculation
      const processedEmployees: Employee[] = await Promise.all(employees.map(async (employee) => {
        const salarioProporcional = (employee.salario_base / 30) * diasTrabajados;
        const auxilioTransporte = this.calculateTransportAllowance(employee.salario_base, diasTrabajados);
        const totalDevengado = salarioProporcional + auxilioTransporte;
        
        // ✅ CÁLCULO DETALLADO DE DEDUCCIONES PARA AUDITORÍA
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: employee.salario_base,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: 'mensual'
        });
        
        console.log(`📊 Nuevo empleado ${employee.nombre}: Deducciones detalladas`, {
          salud: deductionResult.saludEmpleado,
          pension: deductionResult.pensionEmpleado,
          fondoSolidaridad: deductionResult.fondoSolidaridad,
          retencion: deductionResult.retencionFuente,
          total: deductionResult.totalDeducciones
        });
        
        return {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          salario_base: employee.salario_base,
          devengos: 0, // Will be filled with novedades
          deducciones: deductionResult.totalDeducciones,
          total_pagar: totalDevengado - deductionResult.totalDeducciones,
          dias_trabajados: diasTrabajados,
          auxilio_transporte: auxilioTransporte,
          // ✅ DEDUCCIONES DETALLADAS PARA AUDITORÍA DIAN/UGPP
          salud_empleado: deductionResult.saludEmpleado,
          pension_empleado: deductionResult.pensionEmpleado,
          fondo_solidaridad: deductionResult.fondoSolidaridad,
          retencion_fuente: deductionResult.retencionFuente,
          deducciones_novedades: 0 // Will be filled when processing novedades
        };
      }));

      return processedEmployees;
    } catch (error) {
      console.error('Error loading specific employees for period:', error);
      throw error;
    }
  }

  static async liquidatePayroll(employees: Employee[], startDate: string, endDate: string) {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Create period name
      const periodName = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;

      // Create period in payroll_periods_real
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
          total_devengado: employees.reduce((sum, emp) => sum + emp.salario_base + emp.devengos + emp.auxilio_transporte, 0),
          total_deducciones: employees.reduce((sum, emp) => sum + emp.deducciones, 0),
          total_neto: employees.reduce((sum, emp) => sum + emp.total_pagar, 0)
        })
        .select()
        .single();

      if (periodError) {
        throw periodError;
      }

      // ✅ CREAR REGISTROS DE NÓMINA CON DEDUCCIONES DETALLADAS
      for (const employee of employees) {
        const { error: payrollError } = await supabase
          .from('payrolls')
          .insert({
            company_id: companyId,
            employee_id: employee.id,
            periodo: periodName,
            period_id: period.id,
            salario_base: employee.salario_base,
            dias_trabajados: employee.dias_trabajados,
            auxilio_transporte: employee.auxilio_transporte,
            total_devengado: employee.salario_base + employee.devengos + employee.auxilio_transporte,
            // ✅ DEDUCCIONES SEPARADAS PARA AUDITORÍA DIAN/UGPP
            salud_empleado: employee.salud_empleado,
            pension_empleado: employee.pension_empleado,
            fondo_solidaridad: employee.fondo_solidaridad,
            retencion_fuente: employee.retencion_fuente,
            otras_deducciones: employee.deducciones_novedades, // Solo novedades de deducciones
            total_deducciones: employee.deducciones,
            neto_pagado: employee.total_pagar,
            estado: 'procesada'
          });

        if (payrollError) {
          console.error('Error creating payroll record:', payrollError);
        }

        // Create voucher record
        const { error: voucherError } = await supabase
          .from('payroll_vouchers')
          .insert({
            company_id: companyId,
            employee_id: employee.id,
            payroll_id: null, // Will be updated if needed
            periodo: periodName,
            start_date: startDate,
            end_date: endDate,
            net_pay: employee.total_pagar,
            voucher_status: 'generado'
          });

        if (voucherError) {
          console.error('Error creating voucher record:', voucherError);
        }
      }

      return {
        success: true,
        message: `Liquidación completada para ${employees.length} empleados con deducciones detalladas`,
        periodId: period.id
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
   * ✅ NUEVO MÉTODO: Consolidar novedades en registros de payrolls
   * Este método actualiza los registros de payrolls con los valores finales incluyendo novedades
   */
  static async consolidatePayrollWithNovedades(periodId: string): Promise<void> {
    try {
      console.log('🔄 Iniciando consolidación de novedades para período:', periodId);
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Obtener todos los empleados del período
      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payrolls')
        .select('id, employee_id, salario_base, dias_trabajados, auxilio_transporte, total_devengado, total_deducciones')
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollError) {
        throw payrollError;
      }

      if (!payrollRecords || payrollRecords.length === 0) {
        console.log('⚠️ No hay registros de payroll para consolidar');
        return;
      }

      // Obtener totales de novedades para todos los empleados
      const employeeIds = payrollRecords.map(record => record.employee_id);
      const novedadesTotals = await NovedadesCalculationService.calculateAllEmployeesNovedadesTotals(employeeIds, periodId);

      // Consolidar cada registro de payroll
      for (const payrollRecord of payrollRecords) {
        const employeeNovedades = novedadesTotals[payrollRecord.employee_id] || {
          totalDevengos: 0,
          totalDeducciones: 0,
          totalNeto: 0,
          hasNovedades: false
        };

        // Calcular valores consolidados
        const salarioBase = Number(payrollRecord.salario_base) || 0;
        const auxilioTransporte = Number(payrollRecord.auxilio_transporte) || 0;
        const diasTrabajados = Number(payrollRecord.dias_trabajados) || 15;
        
        // Calcular salario proporcional
        const salarioProporcional = (salarioBase / 30) * diasTrabajados;
        
        // Calcular deducciones básicas
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: salarioBase,
          totalDevengado: salarioProporcional + auxilioTransporte + employeeNovedades.totalDevengos,
          auxilioTransporte: auxilioTransporte,
          periodType: 'quincenal'
        });

        // Valores finales consolidados
        const totalDevengadoFinal = salarioProporcional + auxilioTransporte + employeeNovedades.totalDevengos;
        const totalDeduccionesFinal = deductionResult.totalDeducciones + employeeNovedades.totalDeducciones;
        const netoPagadoFinal = totalDevengadoFinal - totalDeduccionesFinal;

        // Obtener novedades específicas para campos detallados
        const novedadesDetalle = await NovedadesCalculationService.getEmployeeNovedades(payrollRecord.employee_id, periodId);
        
        let horasExtra = 0;
        let licenciasRemuneradas = 0;
        let ausencias = 0;
        let bonificaciones = 0;
        let incapacidades = 0;
        
        novedadesDetalle.forEach(novedad => {
          const valor = Number(novedad.valor) || 0;
          switch (novedad.tipo_novedad) {
            case 'horas_extra':
            case 'recargo_nocturno':
              horasExtra += valor;
              break;
            case 'licencia_remunerada':
            case 'vacaciones':
              licenciasRemuneradas += valor;
              break;
            case 'ausencia':
            case 'licencia_no_remunerada':
              ausencias += Math.abs(valor); // Valor absoluto para mostrar positivo
              break;
            case 'bonificacion':
            case 'comision':
            case 'prima':
              bonificaciones += valor;
              break;
            case 'incapacidad':
              incapacidades += valor;
              break;
          }
        });

        // Actualizar registro en payrolls con valores consolidados
        const { error: updateError } = await supabase
          .from('payrolls')
          .update({
            total_devengado: totalDevengadoFinal,
            total_deducciones: totalDeduccionesFinal,
            neto_pagado: netoPagadoFinal,
            // Campos específicos de novedades
            horas_extra: horasExtra,
            licencias_remuneradas: licenciasRemuneradas,
            ausencias: ausencias,
            bonificaciones: bonificaciones,
            incapacidades: incapacidades,
            // Deducciones detalladas
            salud_empleado: deductionResult.saludEmpleado,
            pension_empleado: deductionResult.pensionEmpleado,
            fondo_solidaridad: deductionResult.fondoSolidaridad,
            retencion_fuente: deductionResult.retencionFuente,
            otras_deducciones: employeeNovedades.totalDeducciones,
            updated_at: new Date().toISOString()
          })
          .eq('id', payrollRecord.id);

        if (updateError) {
          console.error(`❌ Error actualizando payroll para empleado ${payrollRecord.employee_id}:`, updateError);
        } else {
          console.log(`✅ Payroll consolidado para empleado ${payrollRecord.employee_id}: Neto = ${netoPagadoFinal}`);
        }
      }

      // Actualizar totales del período
      await this.updatePeriodTotals(periodId);
      
      console.log('✅ Consolidación de novedades completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en consolidación de novedades:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO AUXILIAR: Actualizar totales del período
   */
  private static async updatePeriodTotals(periodId: string): Promise<void> {
    try {
      // Recalcular totales del período basados en los registros actualizados
      const { data: totalsData, error: totalsError } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('period_id', periodId);

      if (totalsError) {
        throw totalsError;
      }

      if (totalsData && totalsData.length > 0) {
        const totalDevengado = totalsData.reduce((sum, record) => sum + (Number(record.total_devengado) || 0), 0);
        const totalDeducciones = totalsData.reduce((sum, record) => sum + (Number(record.total_deducciones) || 0), 0);
        const totalNeto = totalsData.reduce((sum, record) => sum + (Number(record.neto_pagado) || 0), 0);

        // Actualizar totales en payroll_periods_real
        const { error: updatePeriodError } = await supabase
          .from('payroll_periods_real')
          .update({
            total_devengado: totalDevengado,
            total_deducciones: totalDeducciones,
            total_neto: totalNeto,
            updated_at: new Date().toISOString()
          })
          .eq('id', periodId);

        if (updatePeriodError) {
          console.error('❌ Error actualizando totales del período:', updatePeriodError);
        } else {
          console.log(`✅ Totales del período actualizados: Devengado=${totalDevengado}, Neto=${totalNeto}`);
        }
      }
    } catch (error) {
      console.error('❌ Error actualizando totales del período:', error);
    }
  }
}
