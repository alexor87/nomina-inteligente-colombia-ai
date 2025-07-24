
/**
 * Servicio de validación automática de períodos
 * Detecta y repara problemas en cálculos de nómina
 */

import { supabase } from '@/integrations/supabase/client';
import { PeriodRepairService } from './PeriodRepairService';
import { DeductionCalculationService } from './DeductionCalculationService';

export class PeriodValidationService {
  /**
   * ✅ Detectar períodos con problemas de cálculo
   */
  static async detectProblematicPeriods(companyId?: string): Promise<{
    periodsWithIssues: Array<{
      id: string;
      periodo: string;
      issueType: string;
      issueCount: number;
      totalEmployees: number;
      autoRepairable: boolean;
    }>;
    totalIssues: number;
  }> {
    try {
      // Obtener company_id del usuario autenticado
      if (!companyId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) throw new Error('Empresa no encontrada');
        companyId = profile.company_id;
      }

      // Obtener períodos de la empresa
      const { data: periods, error: periodsError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, empleados_count, total_deducciones, total_neto')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (periodsError) throw periodsError;

      const periodsWithIssues = [];
      
      for (const period of periods || []) {
        const validation = await DeductionCalculationService.validatePeriodDeductions(period.id);
        
        if (validation.hasIssues) {
          periodsWithIssues.push({
            id: period.id,
            periodo: period.periodo,
            issueType: 'deducciones_cero',
            issueCount: validation.issueCount,
            totalEmployees: validation.totalEmployees,
            autoRepairable: true
          });
        }
      }

      console.log(`🔍 Períodos con problemas detectados: ${periodsWithIssues.length}`);
      
      return {
        periodsWithIssues,
        totalIssues: periodsWithIssues.length
      };
    } catch (error) {
      console.error('Error detecting problematic periods:', error);
      return {
        periodsWithIssues: [],
        totalIssues: 0
      };
    }
  }

  /**
   * ✅ Reparar automáticamente períodos con problemas
   */
  static async autoRepairPeriods(companyId?: string): Promise<{
    repairedPeriods: Array<{
      id: string;
      periodo: string;
      success: boolean;
      message: string;
    }>;
    totalRepaired: number;
    totalAttempted: number;
  }> {
    try {
      console.log('🔧 Iniciando reparación automática...');
      
      const detection = await this.detectProblematicPeriods(companyId);
      const repairResults = [];
      
      for (const period of detection.periodsWithIssues) {
        if (period.autoRepairable) {
          try {
            console.log(`🔧 Reparando período: ${period.periodo}`);
            
            await PeriodRepairService.repairSpecificPeriod(period.id);
            
            repairResults.push({
              id: period.id,
              periodo: period.periodo,
              success: true,
              message: `Período reparado exitosamente`
            });
            
            console.log(`✅ Período reparado: ${period.periodo}`);
          } catch (error) {
            console.error(`❌ Error reparando período ${period.periodo}:`, error);
            
            repairResults.push({
              id: period.id,
              periodo: period.periodo,
              success: false,
              message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
            });
          }
        }
      }

      const totalRepaired = repairResults.filter(r => r.success).length;
      
      console.log(`✅ Reparación completada: ${totalRepaired}/${repairResults.length} períodos`);
      
      return {
        repairedPeriods: repairResults,
        totalRepaired,
        totalAttempted: repairResults.length
      };
    } catch (error) {
      console.error('Error in auto repair:', error);
      return {
        repairedPeriods: [],
        totalRepaired: 0,
        totalAttempted: 0
      };
    }
  }

  /**
   * ✅ Validar período específico en tiempo real
   */
  static async validateSpecificPeriod(periodId: string): Promise<{
    isValid: boolean;
    issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      autoRepairable: boolean;
    }>;
    summary: {
      totalEmployees: number;
      employeesWithIssues: number;
      totalDevengado: number;
      totalDeducciones: number;
      totalNeto: number;
    };
  }> {
    try {
      const issues = [];
      
      // Validar deducciones
      const deductionValidation = await DeductionCalculationService.validatePeriodDeductions(periodId);
      
      if (deductionValidation.hasIssues) {
        issues.push({
          type: 'deducciones_cero',
          description: deductionValidation.message,
          severity: 'high' as const,
          autoRepairable: true
        });
      }

      // Obtener resumen del período
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('empleados_count, total_devengado, total_deducciones, total_neto')
        .eq('id', periodId)
        .single();

      return {
        isValid: issues.length === 0,
        issues,
        summary: {
          totalEmployees: period?.empleados_count || 0,
          employeesWithIssues: deductionValidation.issueCount,
          totalDevengado: period?.total_devengado || 0,
          totalDeducciones: period?.total_deducciones || 0,
          totalNeto: period?.total_neto || 0
        }
      };
    } catch (error) {
      console.error('Error validating specific period:', error);
      return {
        isValid: false,
        issues: [{
          type: 'validation_error',
          description: 'Error al validar período',
          severity: 'high',
          autoRepairable: false
        }],
        summary: {
          totalEmployees: 0,
          employeesWithIssues: 0,
          totalDevengado: 0,
          totalDeducciones: 0,
          totalNeto: 0
        }
      };
    }
  }
}
