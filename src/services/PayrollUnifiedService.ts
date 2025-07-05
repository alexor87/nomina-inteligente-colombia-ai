
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee, PayrollSummary, PeriodStatus } from '@/types/payroll';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { PayrollCalculationEnhancedService } from './PayrollCalculationEnhancedService';

/**
 * ✅ SERVICIO UNIFICADO REPARADO - FASE 3 CRÍTICA
 * Eliminadas dependencias rotas, usa servicios reales
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

  // ✅ CARGA DE EMPLEADOS CON CÁLCULOS REALES
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

      // Procesar cada empleado con cálculos reales
      const payrollEmployees: PayrollEmployee[] = [];

      for (const employee of employees) {
        try {
          // Obtener novedades del período
          const novedades = await NovedadesEnhancedService.getNovedadesByEmployee(
            employee.id, 
            period.id
          );

          // ✅ CÁLCULO REAL CON PayrollCalculationEnhancedService
          const calculation = await PayrollCalculationEnhancedService.calculatePayroll({
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: this.calculateProportionalDays(period),
            extraHours: this.extractNovedadValue(novedades, 'horas_extra'),
            disabilities: this.extractNovedadValue(novedades, 'incapacidades'),
            bonuses: this.extractNovedadValue(novedades, 'bonificaciones'),
            absences: this.extractNovedadDays(novedades, 'ausencias'),
            periodType: period.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
            empleadoId: employee.id,
            periodoId: period.id
          });

          const payrollEmployee: PayrollEmployee = {
            id: employee.id,
            name: `${employee.nombre} ${employee.apellido}`,
            position: employee.cargo || 'Sin cargo',
            baseSalary: Number(employee.salario_base) || 0,
            workedDays: this.calculateProportionalDays(period),
            extraHours: this.extractNovedadValue(novedades, 'horas_extra'),
            disabilities: this.extractNovedadValue(novedades, 'incapacidades'),
            bonuses: this.extractNovedadValue(novedades, 'bonificaciones'),
            absences: this.extractNovedadDays(novedades, 'ausencias'),
            grossPay: calculation.grossPay,
            deductions: calculation.totalDeductions,
            netPay: calculation.netPay,
            transportAllowance: calculation.transportAllowance,
            employerContributions: calculation.employerContributions,
            status: calculation.grossPay > 0 ? 'valid' : 'error',
            errors: calculation.grossPay <= 0 ? ['Salario base inválido'] : [],
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

  // ✅ UTILIDADES REPARADAS
  private static extractNovedadValue(novedades: any[], tipo: string): number {
    const novedad = novedades.find(n => n.tipo_novedad === tipo);
    return Number(novedad?.valor) || 0;
  }

  private static extractNovedadDays(novedades: any[], tipo: string): number {
    const novedad = novedades.find(n => n.tipo_novedad === tipo);
    return Number(novedad?.dias) || 0;
  }

  private static calculateProportionalDays(period: any): number {
    if (!period.tipo_periodo) return 30;

    switch (period.tipo_periodo) {
      case 'quincenal':
        return 15; // ✅ CORRECCIÓN: 15 días exactos para quincenales
      case 'semanal':
        return 7;
      case 'mensual':
        if (period.fecha_inicio && period.fecha_fin) {
          const startDate = new Date(period.fecha_inicio);
          const endDate = new Date(period.fecha_fin);
          return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return 30;
      default:
        return 30;
    }
  }

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
      const calculation = await PayrollCalculationEnhancedService.calculatePayroll({
        baseSalary: Number(employee.salario_base) || 0,
        workedDays: this.calculateProportionalDays(period),
        extraHours: this.extractNovedadValue(novedades, 'horas_extra'),
        disabilities: this.extractNovedadValue(novedades, 'incapacidades'),
        bonuses: this.extractNovedadValue(novedades, 'bonificaciones'),
        absences: this.extractNovedadDays(novedades, 'ausencias'),
        periodType: period.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
        empleadoId: employeeId,
        periodoId: periodId
      });

      const recalculatedEmployee: PayrollEmployee = {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary: Number(employee.salario_base) || 0,
        workedDays: this.calculateProportionalDays(period),
        extraHours: this.extractNovedadValue(novedades, 'horas_extra'),
        disabilities: this.extractNovedadValue(novedades, 'incapacidades'),
        bonuses: this.extractNovedadValue(novedades, 'bonificaciones'),
        absences: this.extractNovedadDays(novedades, 'ausencias'),
        grossPay: calculation.grossPay,
        deductions: calculation.totalDeductions,
        netPay: calculation.netPay,
        transportAllowance: calculation.transportAllowance,
        employerContributions: calculation.employerContributions,
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
