import { supabase } from '@/integrations/supabase/client';
import { PayrollDeletionService } from './PayrollDeletionService';

interface ActivePeriodResponse {
  has_active_period: boolean;
  period?: {
    id: string;
    periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    last_activity_at: string;
    employees_count: number;
  };
}

export class PayrollAutoSaveService {
  private static isSaving = false;
  private static savingPromise: Promise<void> | null = null;
  
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

  static async getActivePeriod(): Promise<any | null> {
    try {
      const { data, error } = await supabase.rpc('get_active_period_for_company');
      
      if (error) {
        console.error('Error getting active period:', error);
        return null;
      }

      // Safe type casting with validation
      const response = data as unknown as ActivePeriodResponse | null;
      
      if (response && typeof response === 'object' && 'has_active_period' in response) {
        return response.has_active_period ? response.period : null;
      }
      
      return null;
    } catch (error) {
      console.error('Error calling get_active_period_for_company:', error);
      return null;
    }
  }

  /**
   * NUEVO: Eliminación directa sin pasar por upsert
   */
  static async deleteEmployeesFromPeriod(
    periodId: string, 
    employeeIds: string[]
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    console.log('🗑️ PayrollAutoSaveService - Deleting employees directly:', employeeIds);

    try {
      // Validar integridad del período
      const periodExists = await this.validatePeriodIntegrity(periodId, companyId);
      if (!periodExists) {
        console.warn('⚠️ Período no válido para eliminación:', periodId);
        return;
      }

      // Eliminar cada empleado individualmente con validación
      for (const employeeId of employeeIds) {
        const exists = await PayrollDeletionService.validateEmployeeInPeriod(
          periodId, employeeId, companyId
        );
        
        if (exists) {
          await PayrollDeletionService.deleteEmployeeFromPeriod(
            periodId, employeeId, companyId
          );
          
          await PayrollDeletionService.logDeletion(
            periodId, employeeId, companyId, `Employee ${employeeId}`
          );
        } else {
          console.log(`⚠️ Employee ${employeeId} not found in period, skipping deletion`);
        }
      }

      console.log('✅ All employees deleted successfully');
    } catch (error) {
      console.error('❌ Error in deleteEmployeesFromPeriod:', error);
      throw error;
    }
  }

  static async saveDraftEmployees(
    periodId: string, 
    employees: any[], 
    removedEmployeeIds: string[] = []
  ): Promise<void> {
    console.log('💾 PayrollAutoSaveService.saveDraftEmployees - INICIANDO con diagnóstico completo');
    console.log('📊 PayrollAutoSaveService - Parámetros recibidos:', {
      periodId,
      employeesCount: employees.length,
      removedEmployeeIdsCount: removedEmployeeIds.length,
      currentlySaving: this.isSaving
    });

    // Protección contra llamadas concurrentes
    if (this.isSaving && this.savingPromise) {
      console.log('🔄 PayrollAutoSaveService - Auto-save ya en progreso, esperando...');
      await this.savingPromise;
      return;
    }

    this.isSaving = true;
    
    // Crear promesa para que otras llamadas puedan esperarla
    this.savingPromise = this._performAtomicSave(periodId, employees, removedEmployeeIds);
    
    try {
      await this.savingPromise;
      console.log('✅ PayrollAutoSaveService.saveDraftEmployees - COMPLETADO exitosamente');
    } catch (error) {
      console.error('❌ PayrollAutoSaveService.saveDraftEmployees - ERROR:', error);
      throw error;
    } finally {
      this.isSaving = false;
      this.savingPromise = null;
    }
  }

  /**
   * MEJORADO: Operación atómica de guardado con diagnóstico detallado
   */
  private static async _performAtomicSave(
    periodId: string, 
    employees: any[], 
    removedEmployeeIds: string[] = []
  ): Promise<void> {
    console.log('🔄 PayrollAutoSaveService._performAtomicSave - INICIANDO operación atómica');
    
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      console.error('❌ PayrollAutoSaveService - No se pudo obtener company ID');
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    console.log('✅ PayrollAutoSaveService - Company ID obtenido:', companyId);
    console.log('📊 PayrollAutoSaveService - Iniciando guardado atómico:', {
      employees: employees.length,
      removedEmployeeIds: removedEmployeeIds.length,
      periodId,
      companyId
    });

    try {
      // Validación de integridad antes de guardar
      console.log('🔍 PayrollAutoSaveService - Validando integridad del período');
      const periodExists = await this.validatePeriodIntegrity(periodId, companyId);
      if (!periodExists) {
        console.error('❌ PayrollAutoSaveService - Período no válido:', periodId);
        throw new Error('Período no válido para auto-guardado');
      }
      console.log('✅ PayrollAutoSaveService - Período válido confirmado');

      // PASO 1: ELIMINACIONES DIRECTAS PRIMERO (crítico)
      if (removedEmployeeIds.length > 0) {
        console.log('🗑️ PayrollAutoSaveService - FASE 1: Eliminaciones directas');
        await this.deleteEmployeesFromPeriod(periodId, removedEmployeeIds);
        console.log('✅ PayrollAutoSaveService - Eliminaciones completadas');
      }

      // PASO 2: Upsert empleados actuales (solo si hay empleados)
      if (employees.length > 0) {
        console.log('💾 PayrollAutoSaveService - FASE 2: Upserting empleados restantes');
        await this._upsertEmployees(periodId, companyId, employees);
        console.log('✅ PayrollAutoSaveService - Upsert de empleados completado');
      }

      // PASO 3: Actualizar totales del período atómicamente
      console.log('📊 PayrollAutoSaveService - FASE 3: Actualizando totales del período');
      await this.updatePeriodTotals(periodId, employees);
      console.log('✅ PayrollAutoSaveService - Totales del período actualizados');

      console.log('✅ PayrollAutoSaveService - GUARDADO ATÓMICO COMPLETADO exitosamente');
    } catch (error) {
      console.error('❌ PayrollAutoSaveService - ERROR en guardado atómico:', error);
      console.error('❌ PayrollAutoSaveService - Detalles del error:', {
        message: error?.message,
        periodId,
        companyId,
        employeesCount: employees.length
      });
      
      // Manejo específico de errores de constraint
      if (error?.message?.includes('duplicate key value')) {
        console.log('🔄 PayrollAutoSaveService - Manejando error de duplicados - se reintentará');
        return;
      }
      
      throw error;
    }
  }

  /**
   * MEJORADO: Método separado para upsert de empleados con logging detallado
   */
  private static async _upsertEmployees(
    periodId: string, 
    companyId: string, 
    employees: any[]
  ): Promise<void> {
    console.log('💾 PayrollAutoSaveService._upsertEmployees - INICIANDO upsert de empleados');
    console.log('📊 PayrollAutoSaveService._upsertEmployees - Empleados a procesar:', employees.length);
    
    // Obtener información del período para el campo 'periodo'
    const { data: periodData, error: periodError } = await supabase
      .from('payroll_periods_real')
      .select('periodo')
      .eq('id', periodId)
      .single();

    if (periodError) {
      console.error('❌ PayrollAutoSaveService - Error obteniendo datos del período:', periodError);
      throw periodError;
    }

    const periodoName = periodData?.periodo || `Período ${new Date().toLocaleDateString()}`;
    console.log('✅ PayrollAutoSaveService - Nombre del período obtenido:', periodoName);

    const draftPayrolls = employees.map(employee => ({
      company_id: companyId,
      employee_id: employee.id,
      period_id: periodId,
      periodo: periodoName,
      salario_base: employee.baseSalary || 0,
      dias_trabajados: employee.workedDays || 30,
      auxilio_transporte: employee.transportAllowance || 0,
      total_devengado: employee.grossPay || 0,
      total_deducciones: employee.deductions || 0,
      neto_pagado: employee.netPay || 0,
      estado: 'borrador'
    }));

    console.log('📊 PayrollAutoSaveService - Registros preparados para upsert:', draftPayrolls.length);
    console.log('🔍 PayrollAutoSaveService - Primer registro como ejemplo:', draftPayrolls[0]);

    const { error: upsertError } = await supabase
      .from('payrolls')
      .upsert(draftPayrolls, {
        onConflict: 'company_id,employee_id,period_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('❌ PayrollAutoSaveService - Error en upsert:', upsertError);
      throw upsertError;
    }

    console.log('✅ PayrollAutoSaveService - Empleados upserteados exitosamente:', draftPayrolls.length);
  }

  /**
   * MEJORADO: Cargar empleados borrador excluyendo eliminados
   */
  static async loadDraftEmployeesFiltered(periodId: string): Promise<any[]> {
    try {
      const { data: draftPayrolls, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            id, nombre, apellido, cargo, salario_base
          )
        `)
        .eq('period_id', periodId)
        .eq('estado', 'borrador');

      if (error) {
        throw error;
      }

      // Transform to PayrollEmployee format and filter valid employees
      const employees = draftPayrolls?.filter(payroll => 
        payroll.employees && 
        payroll.employee_id && 
        payroll.employees.id // Asegurar que el empleado existe
      ).map(payroll => ({
        id: payroll.employee_id,
        name: `${payroll.employees?.nombre} ${payroll.employees?.apellido}`,
        position: payroll.employees?.cargo || 'Empleado',
        baseSalary: payroll.salario_base,
        workedDays: payroll.dias_trabajados,
        extraHours: 0,
        disabilities: 0,
        bonuses: payroll.bonificaciones || 0,
        absences: 0,
        grossPay: payroll.total_devengado,
        deductions: payroll.total_deducciones,
        netPay: payroll.neto_pagado,
        status: 'valid' as const,
        errors: [],
        transportAllowance: payroll.auxilio_transporte,
        employerContributions: 0
      })) || [];

      console.log('✅ Draft employees loaded and filtered:', employees.length);
      return employees;
    } catch (error) {
      console.error('❌ Error loading filtered draft employees:', error);
      throw error;
    }
  }

  private static async validatePeriodIntegrity(periodId: string, companyId: string): Promise<boolean> {
    try {
      const { data: period, error } = await supabase
        .from('payroll_periods_real')
        .select('id, estado, company_id')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (error || !period) {
        console.error('❌ Período no encontrado o no válido:', periodId);
        return false;
      }

      // Verificar que el período esté en estado válido para edición
      const editableStates = ['borrador', 'en_proceso'];
      if (!editableStates.includes(period.estado)) {
        console.warn('⚠️ Período no editable:', period.estado);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error validando integridad del período:', error);
      return false;
    }
  }

  private static async updatePeriodTotals(periodId: string, employees: any[]): Promise<void> {
    try {
      const totals = employees.reduce(
        (acc, emp) => ({
          count: acc.count + 1,
          devengado: acc.devengado + (emp.grossPay || 0),
          deducciones: acc.deducciones + (emp.deductions || 0),
          neto: acc.neto + (emp.netPay || 0)
        }),
        { count: 0, devengado: 0, deducciones: 0, neto: 0 }
      );

      await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'en_proceso',
          empleados_count: totals.count,
          total_devengado: totals.devengado,
          total_deducciones: totals.deducciones,
          total_neto: totals.neto,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
    } catch (error) {
      console.error('⚠️ Error updating period totals:', error);
      // No lanzar error aquí para no fallar todo el guardado
    }
  }

  static async loadDraftEmployees(periodId: string): Promise<any[]> {
    // Usar el método mejorado que filtra empleados eliminados
    return this.loadDraftEmployeesFiltered(periodId);
  }

  static async updatePeriodActivity(periodId: string): Promise<void> {
    try {
      await supabase
        .from('payroll_periods_real')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
    } catch (error) {
      console.error('❌ Error updating period activity:', error);
    }
  }

  static get isCurrentlySaving(): boolean {
    return this.isSaving;
  }
}
