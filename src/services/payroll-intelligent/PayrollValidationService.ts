
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService } from '../PayrollPeriodService';

export interface ValidationResult {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  count?: number;
  employeeIds?: string[];
}

export class PayrollValidationService {
  // Validaciones específicas para el sistema inteligente
  static async validatePeriodCreation(
    startDate: string,
    endDate: string,
    periodType: string
  ): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = [];
    
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) {
        validations.push({
          type: 'error',
          message: 'No se pudo identificar la empresa',
          details: 'Verifica tu sesión y permisos'
        });
        return validations;
      }

      console.log('🔍 Validando período para empresa:', companyId);
      console.log('📅 Fechas del nuevo período:', { startDate, endDate, periodType });

      // 1. Validar empleados activos
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, nombre, apellido, salario_base, eps, afp, estado')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (empError) throw empError;

      if (!employees || employees.length === 0) {
        validations.push({
          type: 'error',
          message: 'No hay empleados activos registrados',
          details: 'Agrega empleados antes de crear un período de nómina'
        });
        return validations;
      }

      // 2. Validar datos incompletos de empleados
      const incompleteEmployees = employees.filter(emp => 
        !emp.salario_base || emp.salario_base <= 0 || !emp.eps || !emp.afp
      );

      if (incompleteEmployees.length > 0) {
        validations.push({
          type: 'error',
          message: 'Empleados con datos incompletos',
          details: `${incompleteEmployees.length} empleados necesitan información completa (salario, EPS, AFP)`,
          count: incompleteEmployees.length,
          employeeIds: incompleteEmployees.map(emp => emp.id)
        });
      }

      // 3. Validar salarios mínimos
      const lowSalaryEmployees = employees.filter(emp => 
        emp.salario_base && emp.salario_base < 1300000
      );

      if (lowSalaryEmployees.length > 0) {
        validations.push({
          type: 'warning',
          message: 'Empleados con salario inferior al mínimo',
          details: `${lowSalaryEmployees.length} empleados tienen salario menor a $1,300,000`,
          count: lowSalaryEmployees.length
        });
      }

      // 4. VALIDACIÓN MEJORADA DE SUPERPOSICIÓN DE PERÍODOS
      console.log('🔍 Buscando períodos existentes para detectar superposición...');
      
      // Primero verificar si hay períodos existentes
      const { data: allPeriods, error: allPeriodsError } = await supabase
        .from('payroll_periods')
        .select('id, fecha_inicio, fecha_fin, estado, tipo_periodo')
        .eq('company_id', companyId);

      if (allPeriodsError) {
        console.error('❌ Error consultando períodos:', allPeriodsError);
        throw allPeriodsError;
      }

      console.log('📊 Períodos encontrados en la empresa:', allPeriods?.length || 0);
      if (allPeriods && allPeriods.length > 0) {
        console.log('📋 Períodos existentes:', allPeriods);
      }

      // Solo validar superposición si hay períodos existentes
      if (allPeriods && allPeriods.length > 0) {
        // Buscar períodos que se superponen usando lógica mejorada
        const overlappingPeriods = allPeriods.filter(period => {
          const periodStart = new Date(period.fecha_inicio).getTime();
          const periodEnd = new Date(period.fecha_fin).getTime();
          const newStart = new Date(startDate).getTime();
          const newEnd = new Date(endDate).getTime();
          
          // Un período se superpone si:
          // 1. El nuevo período empieza antes de que termine el existente Y
          // 2. El nuevo período termina después de que empiece el existente
          const overlaps = newStart <= periodEnd && newEnd >= periodStart;
          
          if (overlaps) {
            console.log('⚠️ Superposición detectada con período:', {
              existente: { inicio: period.fecha_inicio, fin: period.fecha_fin, estado: period.estado },
              nuevo: { inicio: startDate, fin: endDate }
            });
          }
          
          return overlaps && period.estado !== 'cancelado';
        });

        if (overlappingPeriods.length > 0) {
          const conflictPeriod = overlappingPeriods[0];
          validations.push({
            type: 'error',
            message: 'Período se superpone con otros existentes',
            details: `El período del ${startDate} al ${endDate} se superpone con el período existente del ${conflictPeriod.fecha_inicio} al ${conflictPeriod.fecha_fin} (estado: ${conflictPeriod.estado})`,
            count: overlappingPeriods.length
          });
        }
      } else {
        console.log('✅ No hay períodos existentes, no es necesario validar superposición');
      }

      // 5. Validar novedades pendientes del período anterior
      const { data: pendingNovedades } = await supabase
        .from('payroll_novedades')
        .select('id, empleado_id, tipo_novedad')
        .eq('company_id', companyId)
        .gte('fecha_inicio', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Últimos 60 días

      if (pendingNovedades && pendingNovedades.length > 0) {
        validations.push({
          type: 'info',
          message: 'Novedades recientes detectadas',
          details: `Se aplicarán ${pendingNovedades.length} novedades al período`,
          count: pendingNovedades.length
        });
      }

      // 6. Validar configuración de empresa
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      if (!companySettings?.periodicity) {
        validations.push({
          type: 'warning',
          message: 'Periodicidad no configurada',
          details: 'Se usará configuración mensual por defecto'
        });
      } else if (companySettings.periodicity !== periodType) {
        validations.push({
          type: 'warning',
          message: 'Periodicidad inconsistente',
          details: `El período ${periodType} no coincide con la configuración ${companySettings.periodicity}`
        });
      }

      // Si no hay errores críticos, agregar mensaje de éxito
      const hasErrors = validations.some(v => v.type === 'error');
      if (!hasErrors) {
        validations.push({
          type: 'success',
          message: 'Validaciones completadas exitosamente',
          details: `${employees.length} empleados listos para liquidación`,
          count: employees.length
        });
      }

      console.log('📊 Resultado de validaciones:', {
        total: validations.length,
        errores: validations.filter(v => v.type === 'error').length,
        advertencias: validations.filter(v => v.type === 'warning').length,
        éxitos: validations.filter(v => v.type === 'success').length
      });

    } catch (error) {
      console.error('❌ Error en validaciones del sistema:', error);
      validations.push({
        type: 'error',
        message: 'Error en validaciones del sistema',
        details: `Error técnico: ${error instanceof Error ? error.message : 'Error desconocido'}. Contacta al administrador si el problema persiste.`
      });
    }

    return validations;
  }

  // Validar rendimiento del sistema para miles de empleados
  static async validateSystemCapacity(companyId: string): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = [];

    try {
      // Contar empleados activos
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (employeeCount && employeeCount > 1000) {
        validations.push({
          type: 'info',
          message: 'Procesamiento optimizado activado',
          details: `Sistema preparado para ${employeeCount} empleados. Tiempo estimado: ${Math.ceil(employeeCount / 100)} minutos`,
          count: employeeCount
        });
      }

      // Verificar límites del plan
      const { data: subscription } = await supabase
        .from('company_subscriptions')
        .select('max_employees, plan_type')
        .eq('company_id', companyId)
        .single();

      if (subscription && employeeCount && employeeCount > subscription.max_employees) {
        validations.push({
          type: 'warning',
          message: 'Límite de empleados excedido',
          details: `Plan ${subscription.plan_type} permite ${subscription.max_employees} empleados. Tienes ${employeeCount}`,
          count: employeeCount - subscription.max_employees
        });
      }

    } catch (error) {
      console.error('❌ Error validando capacidad:', error);
    }

    return validations;
  }
}
