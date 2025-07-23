
import { supabase } from '@/integrations/supabase/client';
import { DeductionCalculationService } from './DeductionCalculationService';
import { PayrollLiquidationService } from './PayrollLiquidationService';

export class PeriodRepairService {
  /**
   * Reparar período específico con deducciones correctas
   */
  static async repairSpecificPeriod(periodId: string): Promise<void> {
    try {
      console.log(`🔧 Iniciando reparación del período: ${periodId}`);
      
      // Obtener información del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError) throw periodError;
      if (!period) throw new Error('Período no encontrado');

      console.log(`📋 Reparando período: ${period.periodo} (${period.fecha_inicio} - ${period.fecha_fin})`);

      // Obtener todos los registros de payrolls del período
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
          employees!inner(nombre, apellido, salario_base)
        `)
        .eq('period_id', periodId)
        .eq('company_id', period.company_id);

      if (payrollError) throw payrollError;
      if (!payrollRecords || payrollRecords.length === 0) {
        throw new Error('No se encontraron registros de payrolls para el período');
      }

      console.log(`👥 Procesando ${payrollRecords.length} empleados`);

      // Procesar cada registro de payroll
      for (const payrollRecord of payrollRecords) {
        const empleado = payrollRecord.employees;
        const salarioBase = Number(payrollRecord.salario_base) || 0;
        const diasTrabajados = Number(payrollRecord.dias_trabajados) || 15;
        const totalDevengado = Number(payrollRecord.total_devengado) || 0;
        const auxilioTransporte = Number(payrollRecord.auxilio_transporte) || 0;

        console.log(`📊 Procesando: ${empleado.nombre} ${empleado.apellido}`);
        console.log(`💰 Salario base: $${salarioBase.toLocaleString()}, Días: ${diasTrabajados}, Devengado: $${totalDevengado.toLocaleString()}`);

        // Calcular deducciones correctas usando el servicio
        const deductionResult = await DeductionCalculationService.calculateDeductions({
          salarioBase: salarioBase,
          totalDevengado: totalDevengado,
          auxilioTransporte: auxilioTransporte,
          periodType: period.tipo_periodo === 'quincenal' ? 'quincenal' : 'mensual'
        });

        // Calcular neto pagado correcto
        const netoPagadoCorregido = totalDevengado - deductionResult.totalDeducciones;

        console.log(`🔧 Deducciones calculadas: $${deductionResult.totalDeducciones.toLocaleString()}, Neto: $${netoPagadoCorregido.toLocaleString()}`);

        // Actualizar registro de payroll con deducciones correctas
        const { error: updateError } = await supabase
          .from('payrolls')
          .update({
            total_deducciones: deductionResult.totalDeducciones,
            neto_pagado: netoPagadoCorregido,
            salud_empleado: deductionResult.saludEmpleado,
            pension_empleado: deductionResult.pensionEmpleado,
            fondo_solidaridad: deductionResult.fondoSolidaridad,
            retencion_fuente: deductionResult.retencionFuente,
            updated_at: new Date().toISOString()
          })
          .eq('id', payrollRecord.id);

        if (updateError) {
          console.error(`❌ Error actualizando payroll para ${empleado.nombre}:`, updateError);
        } else {
          console.log(`✅ Payroll actualizado para ${empleado.nombre} ${empleado.apellido}`);
        }
      }

      // Recalcular totales del período basados en registros actualizados
      const { data: updatedTotals, error: totalsError } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('period_id', periodId);

      if (totalsError) throw totalsError;

      const totalDevengadoFinal = updatedTotals.reduce((sum, record) => sum + (Number(record.total_devengado) || 0), 0);
      const totalDeduccionesFinal = updatedTotals.reduce((sum, record) => sum + (Number(record.total_deducciones) || 0), 0);
      const totalNetoFinal = updatedTotals.reduce((sum, record) => sum + (Number(record.neto_pagado) || 0), 0);

      console.log(`📊 TOTALES FINALES CALCULADOS:`, {
        totalDevengado: totalDevengadoFinal,
        totalDeducciones: totalDeduccionesFinal,
        totalNeto: totalNetoFinal,
        empleados: updatedTotals.length
      });

      // Actualizar totales en payroll_periods_real
      const { error: updatePeriodError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totalDevengadoFinal,
          total_deducciones: totalDeduccionesFinal,
          total_neto: totalNetoFinal,
          empleados_count: updatedTotals.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (updatePeriodError) {
        console.error('❌ Error actualizando totales del período:', updatePeriodError);
        throw updatePeriodError;
      }

      console.log(`✅ PERÍODO REPARADO EXITOSAMENTE: ${period.periodo}`);
      console.log(`📈 Totales corregidos - Devengado: $${totalDevengadoFinal.toLocaleString()}, Deducciones: $${totalDeduccionesFinal.toLocaleString()}, Neto: $${totalNetoFinal.toLocaleString()}`);

    } catch (error) {
      console.error('❌ Error en reparación del período:', error);
      throw error;
    }
  }

  /**
   * Reparar período por nombre (útil para casos específicos)
   */
  static async repairPeriodByName(periodName: string, companyId: string): Promise<void> {
    try {
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
