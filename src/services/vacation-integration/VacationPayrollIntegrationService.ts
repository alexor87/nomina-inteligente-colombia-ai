
import { supabase } from '@/integrations/supabase/client';
import { 
  VacationIntegrationResult, 
  VacationProcessingOptions,
  VACATION_VISUAL_CONFIG 
} from '@/types/vacation-integration';
import { CreateNovedadData } from '@/types/novedades-enhanced';

export class VacationPayrollIntegrationService {
  
  /**
   * ✅ MÉTODO PRINCIPAL: Procesar ausencias/vacaciones para un período de nómina
   */
  static async processVacationsForPayroll(
    options: VacationProcessingOptions
  ): Promise<VacationIntegrationResult> {
    try {
      console.log('🏖️ Iniciando procesamiento de vacaciones para período:', options.periodId);

      // 1. Obtener ausencias pendientes del período
      const pendingVacations = await this.getPendingVacationsForPeriod(options);
      
      if (pendingVacations.length === 0) {
        return {
          processedVacations: 0,
          createdNovedades: 0,
          conflicts: [],
          success: true,
          message: 'No hay ausencias pendientes para procesar'
        };
      }

      console.log(`📋 Encontradas ${pendingVacations.length} ausencias pendientes`);

      // 2. Obtener salarios de empleados para cálculos
      const employeeSalaries = await this.getEmployeeSalaries(
        options.companyId,
        pendingVacations.map(v => v.employee_id)
      );

      // 3. Crear novedades automáticas
      const createdNovedades = await this.createAutomaticNovedades(
        pendingVacations,
        employeeSalaries,
        options.periodId
      );

      // 4. Marcar ausencias como procesadas
      await this.markVacationsAsProcessed(
        pendingVacations.map(v => v.id),
        options.periodId
      );

      console.log('✅ VacationPayrollIntegration completado exitosamente');

      return {
        processedVacations: pendingVacations.length,
        createdNovedades: createdNovedades.length,
        conflicts: [], // Por ahora sin conflictos
        success: true,
        message: `Se procesaron ${pendingVacations.length} ausencias y se crearon ${createdNovedades.length} novedades`
      };

    } catch (error) {
      console.error('❌ Error procesando vacaciones:', error);
      return {
        processedVacations: 0,
        createdNovedades: 0,
        conflicts: [],
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * ✅ Obtener ausencias pendientes que intersectan con el período de nómina
   */
  private static async getPendingVacationsForPeriod(
    options: VacationProcessingOptions
  ) {
    const { data, error } = await supabase
      .from('employee_vacation_periods')
      .select(`
        id,
        employee_id,
        company_id,
        type,
        start_date,
        end_date,
        days_count,
        observations,
        status
      `)
      .eq('company_id', options.companyId)
      .eq('status', 'pendiente')
      .or(`start_date.lte.${options.endDate},end_date.gte.${options.startDate}`);

    if (error) {
      throw new Error(`Error obteniendo ausencias: ${error.message}`);
    }

    return data || [];
  }

  /**
   * ✅ Obtener salarios base de empleados para cálculos
   */
  private static async getEmployeeSalaries(
    companyId: string,
    employeeIds: string[]
  ): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, salario_base')
      .eq('company_id', companyId)
      .in('id', employeeIds);

    if (error) {
      throw new Error(`Error obteniendo salarios: ${error.message}`);
    }

    const salaries: Record<string, number> = {};
    data?.forEach(emp => {
      salaries[emp.id] = Number(emp.salario_base) || 0;
    });

    return salaries;
  }

  /**
   * ✅ Crear novedades automáticas desde ausencias
   */
  private static async createAutomaticNovedades(
    vacations: any[],
    employeeSalaries: Record<string, number>,
    periodId: string
  ): Promise<string[]> {
    const createdIds: string[] = [];

    for (const vacation of vacations) {
      try {
        const salary = employeeSalaries[vacation.employee_id] || 0;
        const config = VACATION_VISUAL_CONFIG[vacation.type];
        
        if (!config) {
          console.warn(`⚠️ Configuración no encontrada para tipo: ${vacation.type}`);
          continue;
        }

        const valor = config.calculation(salary, vacation.days_count);

        // Solo crear novedad si tiene valor monetario
        if (Math.abs(valor) > 0) {
          const novedadData: CreateNovedadData = {
            company_id: vacation.company_id,
            empleado_id: vacation.employee_id,
            periodo_id: periodId,
            tipo_novedad: vacation.type,
            valor: Math.round(valor),
            dias: vacation.days_count,
            observacion: `Generado automáticamente desde vacaciones: ${vacation.type}. ${vacation.observations || ''}`.trim(),
            fecha_inicio: vacation.start_date,
            fecha_fin: vacation.end_date,
            base_calculo: 'automatico_vacaciones'
          };

          const { data, error } = await supabase
            .from('payroll_novedades')
            .insert(novedadData)
            .select('id')
            .single();

          if (error) {
            console.error(`❌ Error creando novedad para ausencia ${vacation.id}:`, error);
          } else if (data) {
            createdIds.push(data.id);
            console.log(`✅ Novedad creada para ausencia ${vacation.type}: ${valor}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando ausencia ${vacation.id}:`, error);
      }
    }

    return createdIds;
  }

  /**
   * ✅ Marcar ausencias como procesadas en el período
   */
  private static async markVacationsAsProcessed(
    vacationIds: string[],
    periodId: string
  ) {
    const { error } = await supabase
      .from('employee_vacation_periods')
      .update({
        status: 'liquidada',
        processed_in_period_id: periodId,
        updated_at: new Date().toISOString()
      })
      .in('id', vacationIds);

    if (error) {
      throw new Error(`Error marcando ausencias como procesadas: ${error.message}`);
    }

    console.log(`✅ ${vacationIds.length} ausencias marcadas como liquidadas`);
  }

  /**
   * ✅ Calcular valor monetario de una ausencia específica
   */
  static calculateVacationValue(
    type: string,
    employeeSalary: number,
    days: number
  ): number {
    const config = VACATION_VISUAL_CONFIG[type as keyof typeof VACATION_VISUAL_CONFIG];
    if (!config) return 0;
    
    return Math.round(config.calculation(employeeSalary, days));
  }

  /**
   * ✅ Verificar si hay ausencias que generen conflictos con el período
   */
  static async detectVacationConflicts(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('employee_vacation_periods')
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          days_count,
          status,
          employees!inner(nombre, apellido)
        `)
        .eq('company_id', companyId)
        .eq('status', 'pendiente')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (error) {
        console.error('Error detectando conflictos de vacaciones:', error);
        return [];
      }

      return (data || []).map(vacation => ({
        id: vacation.id,
        type: 'vacation_overlap',
        description: `${vacation.type} de ${(vacation.employees as any)?.nombre} ${(vacation.employees as any)?.apellido} del ${vacation.start_date} al ${vacation.end_date}`,
        severity: 'medium',
        data: vacation
      }));

    } catch (error) {
      console.error('Error en detectVacationConflicts:', error);
      return [];
    }
  }
}
