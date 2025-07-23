
import { supabase } from '@/integrations/supabase/client';
import { DeductionCalculationService } from './DeductionCalculationService';
import { HistoryServiceAleluya } from './HistoryServiceAleluya';

export class PeriodRepairService {
  /**
   * ✅ CORREGIDO: Reparar período específico con validaciones de seguridad
   */
  static async repairSpecificPeriod(periodId: string): Promise<void> {
    try {
      console.log(`🔧 Iniciando reparación CORREGIDA del período: ${periodId}`);
      
      // ✅ CORREGIDO: Obtener company_id del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa no encontrada');
      const companyId = profile.company_id;

      // ✅ CORREGIDO: Validar que el período pertenece a la empresa
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) throw periodError;
      if (!period) throw new Error('Período no encontrado');

      console.log(`📋 Reparando período: ${period.periodo} (${period.fecha_inicio} - ${period.fecha_fin})`);

      // ✅ CORREGIDO: Obtener payrolls con filtrado por empresa
      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          id, 
          employee_id, 
          salario_base, 
          dias_trabajados, 
          total_devengado, 
          total_deducciones,
          neto_pagado,
          auxilio_transporte,
          employees!inner(nombre, apellido, salario_base, company_id)
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId)
        .eq('employees.company_id', companyId);

      if (payrollError) throw payrollError;
      if (!payrollRecords || payrollRecords.length === 0) {
        throw new Error('No se encontraron registros de payrolls para el período');
      }

      console.log(`👥 Procesando ${payrollRecords.length} empleados`);

      // ✅ CORREGIDO: Procesar cada registro con cálculos correctos
      const updates = [];
      for (const payrollRecord of payrollRecords) {
        const empleado = payrollRecord.employees;
        const salarioBase = Number(payrollRecord.salario_base) || 0;
        const diasTrabajados = Number(payrollRecord.dias_trabajados) || 15;
        const totalDevengado = Number(payrollRecord.total_devengado) || 0;
        const auxilioTransporte = Number(payrollRecord.auxilio_transporte) || 0;

        console.log(`📊 Procesando: ${empleado.nombre} ${empleado.apellido}`);

        // ✅ CORREGIDO: Calcular deducciones correctas
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: salarioBase,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: period.tipo_periodo === 'quincenal' ? 'quincenal' : 'mensual'
        });

        const netoPagadoCorregido = totalDevengado - deductionResult.totalDeducciones;

        console.log(`🔧 Deducciones calculadas: $${deductionResult.totalDeducciones.toLocaleString()}, Neto: $${netoPagadoCorregido.toLocaleString()}`);

        updates.push({
          id: payrollRecord.id,
          total_deducciones: deductionResult.totalDeducciones,
          neto_pagado: netoPagadoCorregido,
          salud_empleado: deductionResult.saludEmpleado,
          pension_empleado: deductionResult.pensionEmpleado,
          fondo_solidaridad: deductionResult.fondoSolidaridad,
          retencion_fuente: deductionResult.retencionFuente,
          updated_at: new Date().toISOString()
        });
      }

      // ✅ CORREGIDO: Actualizar registros en lotes
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('payrolls')
          .update(update)
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Error actualizando payroll ${update.id}:`, updateError);
        } else {
          console.log(`✅ Payroll actualizado: ${update.id}`);
        }
      }

      // ✅ CORREGIDO: Usar HistoryServiceAleluya para actualizar totales
      await HistoryServiceAleluya.updatePeriodTotals(periodId);

      console.log(`✅ PERÍODO REPARADO EXITOSAMENTE: ${period.periodo}`);

    } catch (error) {
      console.error('❌ Error en reparación del período:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Reparar período por nombre con validaciones
   */
  static async repairPeriodByName(periodName: string): Promise<void> {
    try {
      // ✅ CORREGIDO: Obtener company_id del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa no encontrada');
      const companyId = profile.company_id;

      const { data: period, error } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('periodo', periodName)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      if (!period) throw new Error(`Período "${periodName}" no encontrado`);

      await this.repairSpecificPeriod(period.id);
    } catch (error) {
      console.error('❌ Error reparando período por nombre:', error);
      throw error;
    }
  }
}
