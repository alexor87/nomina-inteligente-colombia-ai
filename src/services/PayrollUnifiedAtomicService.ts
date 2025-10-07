import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// PayrollUnifiedAtomicService - Arquitectura Unificada para Maya + Manual
// ============================================================================
// Este servicio unifica la lógica de cálculo y liquidación para que ambos
// módulos (Maya y Liquidador Manual) compartan la misma base de código.
//
// MODOS:
// - 'calculation': Solo calcula (para Maya preview)
// - 'liquidation': Calcula + cierra + genera vouchers (para liquidación manual)
// ============================================================================

export interface UnifiedExecutionOptions {
  mode: 'calculation' | 'liquidation';
  generateVouchers?: boolean;
  closePeriod?: boolean;
  sendEmails?: boolean;
  userId?: string;
}

export interface UnifiedExecutionResult {
  success: boolean;
  mode: string;
  periodId: string;
  employeesProcessed: number;
  employeesCreated: number; // ✅ FIX: Empleados creados (soluciona bug de 3 empleados)
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  vouchersGenerated?: number;
  error?: string;
  details?: any;
}

export class PayrollUnifiedAtomicService {
  
  /**
   * ✅ MÉTODO UNIFICADO: Ejecuta cálculo o liquidación según el modo
   * 
   * @param periodId - ID del período a procesar
   * @param companyId - ID de la empresa
   * @param options - Opciones de ejecución (modo, vouchers, etc.)
   */
  static async execute(
    periodId: string,
    companyId: string,
    options: UnifiedExecutionOptions
  ): Promise<UnifiedExecutionResult> {
    console.log('⚛️ [UNIFIED] Iniciando ejecución unificada:', {
      periodId,
      companyId,
      mode: options.mode,
      generateVouchers: options.generateVouchers,
      closePeriod: options.closePeriod
    });

    try {
      // FASE 1: Validar período existe
      const period = await this.validateAndGetPeriod(periodId, companyId);
      
      // FASE 2: ✅ FIX - Asegurar que existen registros de payroll para TODOS los empleados activos
      const employeesCreated = await this.ensurePayrollRecordsExist(periodId, companyId, period);
      
      // FASE 3: Ejecutar cálculos para todos los empleados
      const calculationResult = await this.executeCalculations(periodId, companyId);
      
      // FASE 4: Si modo es 'liquidation', ejecutar pasos adicionales
      if (options.mode === 'liquidation') {
        // 4.1: Cerrar período si está configurado
        if (options.closePeriod) {
          await this.closePeriod(periodId);
        }
        
        // 4.2: Generar vouchers si está configurado
        if (options.generateVouchers) {
          await this.generateVouchers(periodId, companyId, options.sendEmails || false);
        }
        
        // 4.3: Registrar auditoría de liquidación completa
        await this.createAuditLog(periodId, companyId, options.userId, 'full_liquidation');
      } else {
        // Solo cálculo - registrar auditoría simple
        await this.createAuditLog(periodId, companyId, options.userId, 'calculation_only');
      }
      
      // FASE 5: Obtener totales actualizados
      const updatedPeriod = await this.getPeriodTotals(periodId);
      
      console.log('✅ [UNIFIED] Ejecución completada exitosamente');
      
      return {
        success: true,
        mode: options.mode,
        periodId,
        employeesProcessed: calculationResult.employees_processed,
        employeesCreated, // ✅ FIX: Reportar cuántos empleados se crearon
        totalDevengado: updatedPeriod.total_devengado,
        totalDeducciones: updatedPeriod.total_deducciones,
        totalNeto: updatedPeriod.total_neto,
        vouchersGenerated: options.generateVouchers ? calculationResult.employees_processed : undefined,
        details: {
          periodName: updatedPeriod.periodo,
          periodState: updatedPeriod.estado,
          calculationTimestamp: new Date().toISOString()
        }
      };
      
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error en ejecución:', error);
      
      return {
        success: false,
        mode: options.mode,
        periodId,
        employeesProcessed: 0,
        employeesCreated: 0,
        totalDevengado: 0,
        totalDeducciones: 0,
        totalNeto: 0,
        error: error.message || 'Error desconocido'
      };
    }
  }
  
  /**
   * Validar que el período existe y obtener sus datos
   */
  private static async validateAndGetPeriod(periodId: string, companyId: string) {
    const { data: period, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .eq('company_id', companyId)
      .single();
    
    if (error || !period) {
      throw new Error('Período no encontrado o no pertenece a la empresa');
    }
    
    if (period.estado === 'cerrado') {
      throw new Error('El período ya está cerrado. No se puede procesar.');
    }
    
    return period;
  }
  
  /**
   * ✅ FIX: Asegurar que existen registros de payroll para TODOS los empleados activos
   * Esta es la solución al bug de los 3 empleados - crea registros faltantes
   */
  private static async ensurePayrollRecordsExist(
    periodId: string, 
    companyId: string, 
    period: any
  ): Promise<number> {
    console.log('🔍 [UNIFIED] Verificando registros de payroll existentes...');
    
    // 1. Obtener TODOS los empleados activos de la empresa
    const { data: allActiveEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, nombre, apellido, salario_base')
      .eq('company_id', companyId)
      .eq('estado', 'activo');
    
    if (empError || !allActiveEmployees) {
      throw new Error('Error obteniendo empleados activos');
    }
    
    console.log(`📊 [UNIFIED] Empleados activos encontrados: ${allActiveEmployees.length}`);
    
    // 2. Obtener empleados que YA tienen registro de payroll
    const { data: existingPayrolls } = await supabase
      .from('payrolls')
      .select('employee_id')
      .eq('period_id', periodId)
      .eq('company_id', companyId);
    
    const existingEmployeeIds = new Set(
      (existingPayrolls || []).map(p => p.employee_id)
    );
    
    console.log(`📊 [UNIFIED] Empleados con payroll existente: ${existingEmployeeIds.size}`);
    
    // 3. Identificar empleados FALTANTES
    const missingEmployees = allActiveEmployees.filter(
      emp => !existingEmployeeIds.has(emp.id)
    );
    
    if (missingEmployees.length === 0) {
      console.log('✅ [UNIFIED] Todos los empleados ya tienen registro de payroll');
      return 0;
    }
    
    console.log(`⚠️ [UNIFIED] Empleados sin payroll: ${missingEmployees.length}`, {
      missing: missingEmployees.map(e => `${e.nombre} ${e.apellido}`)
    });
    
    // 4. Crear registros de payroll para empleados faltantes
    const diasTrabajados = this.calculateWorkingDays(
      period.fecha_inicio,
      period.fecha_fin,
      period.tipo_periodo
    );
    
    const newPayrollRecords = missingEmployees.map(employee => ({
      company_id: companyId,
      employee_id: employee.id,
      period_id: periodId,
      periodo: period.periodo,
      salario_base: employee.salario_base,
      dias_trabajados: diasTrabajados,
      total_devengado: 0, // Se calculará en la fase de cálculos
      total_deducciones: 0,
      neto_pagado: 0,
      estado: 'borrador'
    }));
    
    const { error: insertError } = await supabase
      .from('payrolls')
      .insert(newPayrollRecords);
    
    if (insertError) {
      console.error('❌ [UNIFIED] Error creando registros de payroll:', insertError);
      throw new Error('Error creando registros de payroll faltantes');
    }
    
    console.log(`✅ [UNIFIED] Creados ${missingEmployees.length} registros de payroll faltantes`);
    
    return missingEmployees.length;
  }
  
  /**
   * Calcular días trabajados según tipo de período
   */
  private static calculateWorkingDays(
    startDate: string, 
    endDate: string, 
    periodType: string
  ): number {
    if (periodType === 'quincenal') {
      return 15;
    } else if (periodType === 'semanal') {
      return 7;
    } else {
      // Calcular días reales
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
  }
  
  /**
   * Ejecutar cálculos de IBC y totales
   */
  private static async executeCalculations(
    periodId: string, 
    companyId: string
  ): Promise<{ success: boolean; employees_processed: number; error?: string }> {
    console.log('🧮 [UNIFIED] Ejecutando cálculos de IBC...');
    
    const { data, error } = await supabase.functions.invoke('payroll-recalc-ibc', {
      body: {
        action: 'recalculate_ibc',
        data: {
          period_id: periodId,
          company_id: companyId
        }
      }
    });
    
    if (error) {
      console.error('❌ [UNIFIED] Error en cálculos:', error);
      throw new Error(`Error en cálculos de IBC: ${error.message}`);
    }
    
    console.log('✅ [UNIFIED] Cálculos completados:', data);
    
    return data;
  }
  
  /**
   * Cerrar el período (solo para modo 'liquidation')
   */
  private static async closePeriod(periodId: string) {
    console.log('🔒 [UNIFIED] Cerrando período...');
    
    const { error } = await supabase
      .from('payroll_periods_real')
      .update({
        estado: 'cerrado',
        updated_at: new Date().toISOString()
      })
      .eq('id', periodId);
    
    if (error) {
      throw new Error('Error cerrando período');
    }
    
    console.log('✅ [UNIFIED] Período cerrado exitosamente');
  }
  
  /**
   * Generar vouchers (solo para modo 'liquidation')
   */
  private static async generateVouchers(
    periodId: string, 
    companyId: string, 
    sendEmails: boolean
  ) {
    console.log('📄 [UNIFIED] Generando vouchers...');
    
    // Obtener todos los payrolls del período
    const { data: payrolls, error: payrollError } = await supabase
      .from('payrolls')
      .select(`
        id,
        employee_id,
        neto_pagado,
        employees(nombre, apellido, email)
      `)
      .eq('period_id', periodId)
      .eq('company_id', companyId);
    
    if (payrollError || !payrolls) {
      throw new Error('Error obteniendo payrolls para generar vouchers');
    }
    
    // Obtener datos del período
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('periodo, fecha_inicio, fecha_fin')
      .eq('id', periodId)
      .single();
    
    if (!period) {
      throw new Error('Período no encontrado para vouchers');
    }
    
    // Crear vouchers para cada empleado
    const voucherInserts = payrolls.map(payroll => ({
      company_id: companyId,
      employee_id: payroll.employee_id,
      payroll_id: payroll.id,
      periodo: period.periodo,
      start_date: period.fecha_inicio,
      end_date: period.fecha_fin,
      net_pay: payroll.neto_pagado,
      voucher_status: sendEmails ? 'pendiente_envio' : 'generado',
      auto_generated: true
    }));
    
    const { error: voucherError } = await supabase
      .from('payroll_vouchers')
      .insert(voucherInserts);
    
    if (voucherError) {
      // Si el error es por vouchers duplicados, ignorar (ya existen)
      if (!voucherError.message.includes('duplicate') && !voucherError.message.includes('unique')) {
        throw new Error('Error generando vouchers');
      }
      console.log('⚠️ [UNIFIED] Algunos vouchers ya existían');
    } else {
      console.log(`✅ [UNIFIED] Generados ${voucherInserts.length} vouchers`);
    }
    
    // TODO: Implementar envío de emails si sendEmails es true
    if (sendEmails) {
      console.log('📧 [UNIFIED] Envío de emails pendiente de implementación');
    }
  }
  
  /**
   * Crear log de auditoría
   */
  private static async createAuditLog(
    periodId: string,
    companyId: string,
    userId: string | undefined,
    operationType: 'calculation_only' | 'full_liquidation'
  ) {
    try {
      await supabase
        .from('payroll_sync_log')
        .insert({
          company_id: companyId,
          period_id: periodId,
          sync_type: operationType === 'full_liquidation' ? 'unified_liquidation' : 'unified_calculation',
          status: 'completed',
          completed_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('⚠️ [UNIFIED] No se pudo crear log de auditoría:', error);
    }
  }
  
  /**
   * Obtener totales actualizados del período
   */
  private static async getPeriodTotals(periodId: string) {
    const { data: period, error } = await supabase
      .from('payroll_periods_real')
      .select('periodo, estado, total_devengado, total_deducciones, total_neto, empleados_count')
      .eq('id', periodId)
      .single();
    
    if (error || !period) {
      throw new Error('Error obteniendo totales del período');
    }
    
    return period;
  }
}
