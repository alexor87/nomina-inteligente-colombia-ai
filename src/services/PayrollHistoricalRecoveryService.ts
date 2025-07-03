
import { supabase } from '@/integrations/supabase/client';

export interface RecoveryResult {
  success: boolean;
  message: string;
  recordsCreated: number;
  employeesProcessed: string[];
}

export class PayrollHistoricalRecoveryService {
  /**
   * Función de recuperación inteligente para períodos mal cerrados
   * Solo aplica para períodos con totales pero sin registros individuales
   */
  static async recoverBadlyClosedPeriod(periodId: string): Promise<RecoveryResult> {
    try {
      console.log('🔄 Iniciando recuperación de período mal cerrado:', periodId);

      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      // Obtener información del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError || !period) {
        throw new Error('Período no encontrado');
      }

      // Verificar si es un período mal cerrado (tiene totales pero no registros individuales)
      const isBadlyClosedPeriod = this.isBadlyClosedPeriod(period);
      if (!isBadlyClosedPeriod) {
        return {
          success: false,
          message: 'Este período no requiere recuperación',
          recordsCreated: 0,
          employeesProcessed: []
        };
      }

      // Verificar si ya tiene registros individuales
      const { data: existingRecords } = await supabase
        .from('payrolls')
        .select('id')
        .eq('company_id', companyId)
        .eq('period_id', periodId);

      if (existingRecords && existingRecords.length > 0) {
        return {
          success: false,
          message: 'Ya existen registros individuales para este período',
          recordsCreated: 0,
          employeesProcessed: []
        };
      }

      // Obtener empleados activos que estaban en la empresa en esa fecha
      const activeEmployees = await this.getActiveEmployeesForPeriod(companyId, period);
      
      if (activeEmployees.length === 0) {
        throw new Error('No se encontraron empleados activos para el período');
      }

      console.log(`👥 Empleados activos encontrados: ${activeEmployees.length}`);

      // Calcular distribución proporcional
      const distribution = this.calculateProportionalDistribution(period, activeEmployees);

      // Crear registros individuales con distribución proporcional
      const createdRecords = [];
      const employeesProcessed = [];

      for (const employee of activeEmployees) {
        const employeeDistribution = distribution[employee.id];
        
        const payrollData = {
          company_id: companyId,
          employee_id: employee.id,
          periodo: period.periodo,
          period_id: periodId,
          salario_base: employee.salario_base,
          dias_trabajados: employee.dias_trabajo || 30,
          total_devengado: employeeDistribution.devengado,
          total_deducciones: employeeDistribution.deducciones,
          neto_pagado: employeeDistribution.neto,
          estado: 'procesada', // Estado consistente con el período cerrado
          created_at: period.created_at,
          // Marcador especial para identificar registros recuperados
          horas_extra: 0,
          bonificaciones: 0,
          auxilio_transporte: 0
        };

        const { error: insertError } = await supabase
          .from('payrolls')
          .insert(payrollData);

        if (insertError) {
          console.error(`❌ Error insertando registro para empleado ${employee.nombre}:`, insertError);
          throw insertError;
        }

        createdRecords.push(payrollData);
        employeesProcessed.push(`${employee.nombre} ${employee.apellido}`);
        
        console.log(`✅ Registro recuperado para: ${employee.nombre} ${employee.apellido}`);
      }

      // Actualizar contador de empleados en el período
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({ empleados_count: createdRecords.length })
        .eq('id', periodId);

      if (updateError) {
        console.error('❌ Error actualizando contador de empleados:', updateError);
      }

      // Validar que los totales coincidan (tolerancia de centavos por redondeo)
      const validationResult = this.validateRecoveredTotals(period, createdRecords);
      if (!validationResult.isValid) {
        console.warn('⚠️ Advertencia de validación:', validationResult.message);
      }

      console.log('✅ Recuperación completada exitosamente');
      
      return {
        success: true,
        message: `Período recuperado exitosamente. Se crearon ${createdRecords.length} registros individuales.`,
        recordsCreated: createdRecords.length,
        employeesProcessed
      };

    } catch (error) {
      console.error('❌ Error en recuperación de período:', error);
      throw error;
    }
  }

  /**
   * Detecta si un período está mal cerrado (tiene totales pero no registros individuales)
   */
  private static isBadlyClosedPeriod(period: any): boolean {
    return (
      period.estado === 'cerrado' &&
      period.empleados_count === 0 &&
      (period.total_devengado > 0 || period.total_deducciones > 0 || period.total_neto > 0)
    );
  }

  /**
   * Obtiene empleados activos para el período específico
   */
  private static async getActiveEmployeesForPeriod(companyId: string, period: any) {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .lte('fecha_ingreso', period.fecha_fin); // Solo empleados que ya estaban en la empresa

    if (error) {
      throw new Error(`Error obteniendo empleados: ${error.message}`);
    }

    return employees || [];
  }

  /**
   * Calcula distribución proporcional basada en salarios base
   */
  private static calculateProportionalDistribution(period: any, employees: any[]) {
    const totalSalarios = employees.reduce((sum, emp) => sum + Number(emp.salario_base), 0);
    
    const distribution: Record<string, { devengado: number; deducciones: number; neto: number }> = {};

    employees.forEach(employee => {
      const proporcion = Number(employee.salario_base) / totalSalarios;
      
      distribution[employee.id] = {
        devengado: Math.round(Number(period.total_devengado) * proporcion),
        deducciones: Math.round(Number(period.total_deducciones) * proporcion),
        neto: Math.round(Number(period.total_neto) * proporcion)
      };
    });

    // Ajustar diferencias de redondeo en el último empleado
    this.adjustRoundingDifferences(period, distribution, employees);

    return distribution;
  }

  /**
   * Ajusta diferencias de redondeo para que los totales coincidan exactamente
   */
  private static adjustRoundingDifferences(period: any, distribution: Record<string, any>, employees: any[]) {
    const lastEmployeeId = employees[employees.length - 1].id;
    
    // Calcular totales distribuidos
    const totalDistribuido = Object.values(distribution).reduce((acc: any, dist: any) => ({
      devengado: acc.devengado + dist.devengado,
      deducciones: acc.deducciones + dist.deducciones,
      neto: acc.neto + dist.neto
    }), { devengado: 0, deducciones: 0, neto: 0 });

    // Ajustar diferencias en el último empleado
    distribution[lastEmployeeId].devengado += Number(period.total_devengado) - totalDistribuido.devengado;
    distribution[lastEmployeeId].deducciones += Number(period.total_deducciones) - totalDistribuido.deducciones;
    distribution[lastEmployeeId].neto += Number(period.total_neto) - totalDistribuido.neto;
  }

  /**
   * Valida que los totales recuperados coincidan con los originales
   */
  private static validateRecoveredTotals(period: any, records: any[]) {
    const totalDevengado = records.reduce((sum, r) => sum + r.total_devengado, 0);
    const totalDeducciones = records.reduce((sum, r) => sum + r.total_deducciones, 0);
    const totalNeto = records.reduce((sum, r) => sum + r.neto_pagado, 0);

    const tolerance = 1; // Tolerancia de 1 peso por redondeo

    const devenagdoMatch = Math.abs(totalDevengado - Number(period.total_devengado)) <= tolerance;
    const deduccionesMatch = Math.abs(totalDeducciones - Number(period.total_deducciones)) <= tolerance;
    const netoMatch = Math.abs(totalNeto - Number(period.total_neto)) <= tolerance;

    return {
      isValid: devenagdoMatch && deduccionesMatch && netoMatch,
      message: !devenagdoMatch || !deduccionesMatch || !netoMatch 
        ? 'Los totales no coinciden exactamente (diferencia de redondeo)'
        : 'Totales validados correctamente'
    };
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
}
