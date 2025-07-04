
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary, PeriodStatus } from '@/types/payroll';
import { PayrollHistoryService } from './PayrollHistoryService';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { PayrollCalculationUnifiedService } from './PayrollCalculationUnifiedService';

/**
 * ✅ SERVICIO UNIFICADO DE NÓMINA - FASE 1
 * Consolida toda la lógica de nómina en un solo lugar
 * Elimina duplicación y garantiza consistencia
 */
export class PayrollUnifiedService {
  
  // ✅ DETECCIÓN INTELIGENTE DE PERÍODOS
  static async detectCurrentPeriodSituation(): Promise<PeriodStatus> {
    try {
      console.log('🎯 SERVICIO UNIFICADO - Detección de período actual...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Verificar períodos activos (borrador o en proceso)
      const { data: activePeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error buscando períodos activos:', error);
        throw error;
      }

      // Si hay período activo, continuar con él
      if (activePeriods && activePeriods.length > 0) {
        const activePeriod = activePeriods[0];
        console.log('✅ Período activo encontrado:', activePeriod.periodo);
        
        return {
          currentPeriod: activePeriod,
          needsCreation: false,
          canContinue: true,
          message: `Continuando con período activo: ${activePeriod.periodo}`,
          suggestion: 'Período activo encontrado',
          action: 'resume'
        };
      }

      // Generar siguiente período sugerido
      const nextPeriod = await this.generateNextPeriodSuggestion(companyId);
      
      return {
        currentPeriod: null,
        needsCreation: true,
        canContinue: false,
        message: `Crear siguiente período: ${nextPeriod.periodName}`,
        suggestion: `Crear período: ${nextPeriod.periodName}`,
        action: 'create',
        nextPeriod
      };

    } catch (error) {
      console.error('💥 Error en detección unificada de período:', error);
      
      return {
        currentPeriod: null,
        needsCreation: true,
        canContinue: false,
        message: 'Error detectando período. Revisa la configuración.',
        suggestion: 'Revisar configuración',
        action: 'wait'
      };
    }
  }

  // ✅ CREACIÓN DE PERÍODOS INTELIGENTE
  static async createNextPeriod(): Promise<{success: boolean, period?: any, message: string}> {
    try {
      console.log('🆕 SERVICIO UNIFICADO - Creando nuevo período...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return { success: false, message: 'No se pudo obtener la empresa' };
      }

      const nextPeriod = await this.generateNextPeriodSuggestion(companyId);

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', nextPeriod.startDate)
        .eq('fecha_fin', nextPeriod.endDate);

      if (existing && existing.length > 0) {
        return {
          success: true,
          period: existing[0],
          message: `Período ${existing[0].periodo} ya existe`
        };
      }

      // Crear nuevo período
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: nextPeriod.periodName,
          fecha_inicio: nextPeriod.startDate,
          fecha_fin: nextPeriod.endDate,
          tipo_periodo: nextPeriod.type,
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando período:', error);
        return { success: false, message: error.message };
      }

      console.log(`✅ Período creado exitosamente: ${newPeriod.periodo}`);
      return {
        success: true,
        period: newPeriod,
        message: `Período ${newPeriod.periodo} creado exitosamente`
      };

    } catch (error) {
      console.error('❌ Error creando período:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // ✅ CARGA DE EMPLEADOS CON CÁLCULOS CORRECTOS
  static async loadEmployeesForActivePeriod(period: any): Promise<PayrollEmployee[]> {
    try {
      console.log('👥 SERVICIO UNIFICADO - Cargando empleados para período:', period.periodo);
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      // Obtener empleados activos
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (employeesError) {
        console.error('❌ Error obteniendo empleados:', employeesError);
        return [];
      }

      if (!employees || employees.length === 0) {
        console.log('⚠️ No hay empleados activos');
        return [];
      }

      console.log(`📊 Procesando ${employees.length} empleados activos`);

      // Procesar cada empleado con cálculos correctos
      const payrollEmployees: PayrollEmployee[] = [];

      for (const employee of employees) {
        try {
          // Obtener novedades del período
          const novedades = await NovedadesEnhancedService.getNovedadesByEmployee(
            employee.id, 
            period.id
          );

          // ✅ CÁLCULO CORREGIDO CON DÍAS PROPORCIONALES
          const calculation = await PayrollCalculationUnifiedService.calculateEmployeePayroll({
            employee,
            period,
            novedades
          });

          const payrollEmployee: PayrollEmployee = {
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            position: employee.cargo || 'Sin cargo',
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: this.calculateProportionalDays(period),
            extraHours: calculation.extraHours,
            disabilities: calculation.disabilities,
            bonuses: calculation.bonuses,
            absences: calculation.absences,
            grossPay: calculation.grossPay,
            deductions: calculation.deductions,
            netPay: calculation.netPay,
            transportAllowance: calculation.transportAllowance,
            employerContributions: calculation.grossPay * 0.2075, // 20.75% aportes patronales
            status: calculation.grossPay > 0 ? 'valid' : 'error',
            errors: calculation.grossPay <= 0 ? ['Salário base inválido'] : [],
            eps: employee.eps,
            afp: employee.afp
          };

          payrollEmployees.push(payrollEmployee);

        } catch (employeeError) {
          console.error(`❌ Error procesando empleado ${employee.id}:`, employeeError);
          
          // Empleado con error
          payrollEmployees.push({
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            position: employee.cargo || 'Sin cargo',
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: 0,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            grossPay: 0,
            deductions: 0,
            netPay: 0,
            transportAllowance: 0,
            employerContributions: 0,
            status: 'error',
            errors: [`Error procesando empleado: ${employeeError}`],
            eps: employee.eps,
            afp: employee.afp
          });
        }
      }

      console.log(`✅ ${payrollEmployees.length} empleados procesados correctamente`);
      return payrollEmployees;

    } catch (error) {
      console.error('💥 Error crítico cargando empleados:', error);
      return [];
    }
  }

  // ✅ CIERRE DE PERÍODO CON VALIDACIONES ROBUSTAS
  static async closePeriod(period: any, selectedEmployees: PayrollEmployee[]): Promise<string> {
    try {
      console.log('🔐 SERVICIO UNIFICADO - Iniciando cierre de período:', period.periodo);

      // Validaciones pre-cierre
      const validationErrors = await this.validatePeriodForClosing(period, selectedEmployees);
      if (validationErrors.length > 0) {
        throw new Error(`Errores de validación: ${validationErrors.join(', ')}`);
      }

      // Calcular totales finales
      const totales = selectedEmployees.reduce(
        (acc, emp) => ({
          totalDevengado: acc.totalDevengado + emp.grossPay,
          totalDeducciones: acc.totalDeducciones + emp.deductions,
          totalNeto: acc.totalNeto + emp.netPay
        }),
        { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 }
      );

      // Actualizar período a cerrado
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'cerrado',
          total_devengado: totales.totalDevengado,
          total_deducciones: totales.totalDeducciones,
          total_neto: totales.totalNeto,
          empleados_count: selectedEmployees.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (updateError) {
        throw updateError;
      }

      // ✅ SINCRONIZACIÓN AUTOMÁTICA CON HISTORIAL
      await this.syncPeriodToHistory(period.id);

      console.log(`✅ Período ${period.periodo} cerrado exitosamente`);
      return `Período ${period.periodo} cerrado con ${selectedEmployees.length} empleados`;

    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      throw error;
    }
  }

  // ✅ SINCRONIZACIÓN AUTOMÁTICA BD ↔ HISTORIAL
  static async syncPeriodToHistory(periodId: string): Promise<void> {
    try {
      console.log('🔄 SINCRONIZACIÓN AUTOMÁTICA - Período → Historial');
      
      // Ejecutar función de sincronización de base de datos
      const { data, error } = await supabase.rpc('sync_historical_payroll_data', {
        p_period_id: periodId
      });

      if (error) {
        console.error('❌ Error en sincronización automática:', error);
        throw error;
      }

      console.log('✅ Sincronización automática completada:', data);
      
      // Actualizar totales del período después de la sincronización
      await PayrollHistoryService.recalculatePeriodTotals(periodId);

    } catch (error) {
      console.error('💥 Error crítico en sincronización:', error);
      throw error;
    }
  }

  // ✅ UTILIDADES INTERNAS
  private static async getCurrentUserCompanyId(): Promise<string | null> {
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

  private static async getCompanyPeriodicity(companyId: string): Promise<'semanal' | 'quincenal' | 'mensual'> {
    try {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      return (settings?.periodicity as 'semanal' | 'quincenal' | 'mensual') || 'quincenal';
    } catch (error) {
      console.error('Error getting periodicity:', error);
      return 'quincenal';
    }
  }

  private static async generateNextPeriodSuggestion(companyId: string) {
    const periodicity = await this.getCompanyPeriodicity(companyId);
    const today = new Date();
    
    return this.calculatePeriodDates(today, periodicity);
  }

  private static calculatePeriodDates(referenceDate: Date, periodicity: 'semanal' | 'quincenal' | 'mensual') {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();
    
    let startDate: Date;
    let endDate: Date;
    let periodName: string;
    
    switch (periodicity) {
      case 'quincenal':
        if (day <= 15) {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month, 15);
          periodName = `1 - 15 ${this.getMonthName(month)} ${year}`;
        } else {
          startDate = new Date(year, month, 16);
          endDate = new Date(year, month + 1, 0);
          periodName = `16 - ${endDate.getDate()} ${this.getMonthName(month)} ${year}`;
        }
        break;
        
      case 'semanal':
        const dayOfWeek = referenceDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        startDate = new Date(referenceDate);
        startDate.setDate(referenceDate.getDate() + mondayOffset);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        periodName = `Semana ${startDate.getDate()}-${endDate.getDate()} ${this.getMonthName(startDate.getMonth())} ${year}`;
        break;
        
      default: // mensual
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        periodName = `${this.getMonthName(month)} ${year}`;
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      periodName,
      type: periodicity
    };
  }

  private static getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }

  // ✅ CÁLCULO CORRECTO DE DÍAS PROPORCIONALES
  private static calculateProportionalDays(period: any): number {
    if (!period.tipo_periodo) return 30;

    switch (period.tipo_periodo) {
      case 'quincenal':
        return 15; // ✅ CORRECCIÓN: 15 días para quincenales
      case 'semanal':
        return 7;
      case 'mensual':
        const startDate = new Date(period.fecha_inicio);
        const endDate = new Date(period.fecha_fin);
        return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      default:
        return 30;
    }
  }

  private static async validatePeriodForClosing(period: any, selectedEmployees: PayrollEmployee[]): Promise<string[]> {
    const errors: string[] = [];

    // Validar empleados seleccionados
    if (selectedEmployees.length === 0) {
      errors.push('Debe seleccionar al menos un empleado');
    }

    // Validar empleados válidos
    const validEmployees = selectedEmployees.filter(emp => emp.status === 'valid');
    if (validEmployees.length === 0) {
      errors.push('No hay empleados válidos seleccionados');
    }

    // Validar estado del período
    if (period.estado !== 'borrador') {
      errors.push('Solo se pueden cerrar períodos en estado borrador');
    }

    // Validar totales
    const totalNeto = selectedEmployees.reduce((sum, emp) => sum + emp.netPay, 0);
    if (totalNeto <= 0) {
      errors.push('El total neto debe ser mayor a cero');
    }

    return errors;
  }

  // ✅ MÉTODO PARA ACTUALIZAR CONTADOR DE EMPLEADOS
  static async updateEmployeeCount(periodId: string, count: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          empleados_count: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) {
        console.error('❌ Error actualizando contador:', error);
        throw error;
      }

      console.log(`✅ Contador actualizado: ${count} empleados`);
    } catch (error) {
      console.error('❌ Error en updateEmployeeCount:', error);
      throw error;
    }
  }

  // ✅ MÉTODO PARA REMOVER EMPLEADO DEL PERÍODO
  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log(`🗑️ Removiendo empleado ${employeeId} del período ${periodId}`);
      
      // Remover registros de payrolls si existen
      const { error: payrollError } = await supabase
        .from('payrolls')
        .delete()
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (payrollError) {
        console.error('❌ Error removiendo de payrolls:', payrollError);
      }

      // Remover novedades del período
      const { error: novedadesError } = await supabase
        .from('payroll_novedades')
        .delete()
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        console.error('❌ Error removiendo novedades:', novedadesError);
      }

      console.log(`✅ Empleado ${employeeId} removido exitosamente`);
    } catch (error) {
      console.error('❌ Error en removeEmployeeFromPeriod:', error);
      throw error;
    }
  }

  // ✅ RECÁLCULO DESPUÉS DE CAMBIOS EN NOVEDADES
  static async recalculateAfterNovedadChange(employeeId: string, periodId: string): Promise<PayrollEmployee | null> {
    try {
      console.log(`🔄 Recalculando empleado ${employeeId} después de cambio en novedad`);
      
      // Obtener datos del empleado
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (employeeError || !employee) {
        console.error('❌ Error obteniendo empleado:', employeeError);
        return null;
      }

      // Obtener período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        console.error('❌ Error obteniendo período:', periodError);
        return null;
      }

      // Obtener novedades actualizadas
      const novedades = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);

      // Recalcular con nuevas novedades
      const calculation = await PayrollCalculationUnifiedService.calculateEmployeePayroll({
        employee,
        period,
        novedades
      });

      const recalculatedEmployee: PayrollEmployee = {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary: Number(employee.salario_base) || 0,
        workedDays: this.calculateProportionalDays(period),
        extraHours: calculation.extraHours,
        disabilities: calculation.disabilities,
        bonuses: calculation.bonuses,
        absences: calculation.absences,
        grossPay: calculation.grossPay,
        deductions: calculation.deductions,
        netPay: calculation.netPay,
        transportAllowance: calculation.transportAllowance,
        employerContributions: calculation.grossPay * 0.2075,
        status: calculation.grossPay > 0 ? 'valid' : 'error',
        errors: calculation.grossPay <= 0 ? ['Salário base inválido'] : [],
        eps: employee.eps,
        afp: employee.afp
      };

      console.log(`✅ Empleado ${employeeId} recalculado exitosamente`);
      return recalculatedEmployee;

    } catch (error) {
      console.error('❌ Error en recalculateAfterNovedadChange:', error);
      return null;
    }
  }
}
