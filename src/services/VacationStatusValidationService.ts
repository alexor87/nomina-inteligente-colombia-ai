
import { supabase } from '@/integrations/supabase/client';

export interface StatusValidationResult {
  id: string;
  currentStatus: string;
  correctStatus: string;
  hasPayrollRecord: boolean;
  hasPeriodClosed: boolean;
  employeeName: string;
  needsCorrection: boolean;
}

export interface StatusCorrectionResult {
  totalChecked: number;
  correctedCount: number;
  falsePositives: StatusValidationResult[];
  success: boolean;
  message: string;
}

export class VacationStatusValidationService {
  
  /**
   * 🔍 VALIDACIÓN: Verificar si una ausencia está realmente liquidada
   */
  static async validateVacationStatus(vacationId: string): Promise<boolean> {
    console.log('🔍 Validating vacation status for ID:', vacationId);
    
    // Obtener datos de la ausencia
    const { data: vacation, error: vacationError } = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees(id, nombre, apellido, salario_base)
      `)
      .eq('id', vacationId)
      .single();

    if (vacationError || !vacation) {
      console.error('❌ Error getting vacation data:', vacationError);
      return false;
    }

    // Si no tiene período asignado, definitivamente no está liquidada
    if (!vacation.processed_in_period_id) {
      return false;
    }

    // Verificar si existe registro en payrolls para este empleado y período
    const { data: payrollRecord } = await supabase
      .from('payrolls')
      .select('id, estado')
      .eq('employee_id', vacation.employee_id)
      .eq('period_id', vacation.processed_in_period_id)
      .single();

    // Verificar si existe novedad procesada con valor calculado
    const { data: novedadRecord } = await supabase
      .from('payroll_novedades')
      .select('id, valor')
      .eq('empleado_id', vacation.employee_id)
      .eq('periodo_id', vacation.processed_in_period_id)
      .eq('tipo_novedad', vacation.type)
      .eq('fecha_inicio', vacation.start_date)
      .eq('fecha_fin', vacation.end_date)
      .single();

    const hasPayrollProcessing = payrollRecord && payrollRecord.estado === 'procesada';
    const hasNovedadWithValue = novedadRecord && novedadRecord.valor !== 0;

    console.log('📊 Validation results:', {
      vacationId,
      hasPayrollProcessing,
      hasNovedadWithValue,
      periodId: vacation.processed_in_period_id
    });

    return hasPayrollProcessing || hasNovedadWithValue;
  }

  /**
   * 🔍 AUDITORÍA: Verificar estados de todas las ausencias
   */
  static async auditAllVacationStatuses(companyId?: string): Promise<StatusValidationResult[]> {
    console.log('🔍 Starting vacation status audit');

    // Obtener company_id si no se proporciona
    if (!companyId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!profile?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }
      companyId = profile.company_id;
    }

    // Obtener todas las ausencias marcadas como "liquidada"
    const { data: vacations, error } = await supabase
      .from('employee_vacation_periods')
      .select(`
        *,
        employee:employees(id, nombre, apellido, salario_base)
      `)
      .eq('company_id', companyId)
      .eq('status', 'liquidada')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error getting vacations for audit:', error);
      throw error;
    }

    const results: StatusValidationResult[] = [];

    for (const vacation of vacations || []) {
      const isReallyLiquidated = await this.validateVacationStatus(vacation.id);
      
      // Verificar si el período está cerrado
      let hasPeriodClosed = false;
      if (vacation.processed_in_period_id) {
        const { data: period } = await supabase
          .from('payroll_periods_real')
          .select('estado')
          .eq('id', vacation.processed_in_period_id)
          .single();
        
        hasPeriodClosed = period?.estado === 'cerrado';
      }

      // Verificar si existe registro de payroll
      let hasPayrollRecord = false;
      if (vacation.processed_in_period_id) {
        const { data: payroll } = await supabase
          .from('payrolls')
          .select('id')
          .eq('employee_id', vacation.employee_id)
          .eq('period_id', vacation.processed_in_period_id)
          .single();
        
        hasPayrollRecord = !!payroll;
      }

      const correctStatus = isReallyLiquidated ? 'liquidada' : 'pendiente';
      const needsCorrection = vacation.status !== correctStatus;

      results.push({
        id: vacation.id,
        currentStatus: vacation.status,
        correctStatus,
        hasPayrollRecord,
        hasPeriodClosed,
        employeeName: `${vacation.employee?.nombre || ''} ${vacation.employee?.apellido || ''}`.trim(),
        needsCorrection
      });
    }

    console.log('📊 Audit completed:', {
      totalChecked: results.length,
      needingCorrection: results.filter(r => r.needsCorrection).length
    });

    return results;
  }

  /**
   * 🔧 CORRECCIÓN: Corregir estados incorrectos masivamente
   */
  static async correctFalseStatuses(companyId?: string): Promise<StatusCorrectionResult> {
    console.log('🔧 Starting mass status correction');

    const auditResults = await this.auditAllVacationStatuses(companyId);
    const falsePositives = auditResults.filter(result => result.needsCorrection);

    if (falsePositives.length === 0) {
      return {
        totalChecked: auditResults.length,
        correctedCount: 0,
        falsePositives: [],
        success: true,
        message: 'Todos los estados están correctos'
      };
    }

    let correctedCount = 0;
    const errors: string[] = [];

    // Corregir cada registro falso
    for (const falsePositive of falsePositives) {
      try {
        const { error } = await supabase
          .from('employee_vacation_periods')
          .update({ 
            status: falsePositive.correctStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', falsePositive.id);

        if (error) {
          errors.push(`Error corrigiendo ${falsePositive.employeeName}: ${error.message}`);
        } else {
          correctedCount++;
          console.log(`✅ Corregido estado para ${falsePositive.employeeName}: ${falsePositive.currentStatus} -> ${falsePositive.correctStatus}`);
        }
      } catch (error: any) {
        errors.push(`Error inesperado para ${falsePositive.employeeName}: ${error.message}`);
      }
    }

    const success = errors.length === 0;
    const message = success 
      ? `Se corrigieron ${correctedCount} estados incorrectos`
      : `Se corrigieron ${correctedCount} de ${falsePositives.length} estados. Errores: ${errors.join(', ')}`;

    console.log('📊 Mass correction completed:', {
      totalChecked: auditResults.length,
      correctedCount,
      success
    });

    return {
      totalChecked: auditResults.length,
      correctedCount,
      falsePositives,
      success,
      message
    };
  }

  /**
   * 🎯 CALCULAR ESTADO CORRECTO: Lógica mejorada para determinar el estado real
   */
  static async calculateCorrectStatus(
    vacation: any,
    periodStatusMap: Record<string, string> = {}
  ): Promise<'pendiente' | 'liquidada' | 'cancelada'> {
    
    // Si está explícitamente cancelada, mantener ese estado
    if (vacation.status === 'cancelada') {
      return 'cancelada';
    }

    // Si no tiene período asignado, está pendiente
    if (!vacation.processed_in_period_id) {
      return 'pendiente';
    }

    // Validar si realmente está liquidada
    const isReallyLiquidated = await this.validateVacationStatus(vacation.id);
    
    return isReallyLiquidated ? 'liquidada' : 'pendiente';
  }
}
