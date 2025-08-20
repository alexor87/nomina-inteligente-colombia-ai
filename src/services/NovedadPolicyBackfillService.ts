import { supabase } from '@/integrations/supabase/client';
import { CompanyPayrollPoliciesService } from './CompanyPayrollPoliciesService';
import { IncapacityCalculationService } from './IncapacityCalculationService';

interface BackfillResult {
  success: boolean;
  processed: number;
  updated: number;
  updatedCount?: number;
  errors: string[];
}

interface AnalysisResult {
  totalIncapacities: number;
  periodsAffected: string[];
  employeesAffected: number;
}

export class NovedadPolicyBackfillService {
  /**
   * ✅ ANALYZE: Check incapacities that would be affected by policy change
   */
  static async analyzeIncapacitiesForBackfill(companyId: string): Promise<AnalysisResult> {
    try {
      console.log('🔍 Analyzing incapacities for backfill...', { companyId });

      // Get open period IDs first
      const { data: openPeriods, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso']);

      if (periodError) {
        throw periodError;
      }

      if (!openPeriods || openPeriods.length === 0) {
        return {
          totalIncapacities: 0,
          periodsAffected: [],
          employeesAffected: 0
        };
      }

      const openPeriodIds = openPeriods.map(p => p.id);

      // Count incapacities in open periods
      const { data: incapacities, error: incapacityError } = await supabase
        .from('payroll_novedades')
        .select('id, empleado_id, periodo_id')
        .eq('company_id', companyId)
        .eq('tipo_novedad', 'incapacidad')
        .in('periodo_id', openPeriodIds);

      if (incapacityError) {
        throw incapacityError;
      }

      const uniqueEmployees = new Set(incapacities?.map(i => i.empleado_id) || []);

      return {
        totalIncapacities: incapacities?.length || 0,
        periodsAffected: openPeriods.map(p => p.periodo),
        employeesAffected: uniqueEmployees.size
      };

    } catch (error) {
      console.error('❌ Error analyzing incapacities:', error);
      throw error;
    }
  }

  /**
   * ✅ BACKFILL: Update existing incapacities with new policy
   */
  static async backfillIncapacitiesWithNewPolicy(
    companyId: string,
    newPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor'
  ): Promise<BackfillResult> {
    try {
      console.log('🔄 Starting backfill with new policy...', { companyId, newPolicy });

      const result = await this.backfillIncapacityNovelties(companyId, undefined, false);
      
      return {
        ...result,
        updatedCount: result.updated
      };

    } catch (error) {
      console.error('❌ Error in backfill:', error);
      return {
        success: false,
        processed: 0,
        updated: 0,
        updatedCount: 0,
        errors: [`Backfill error: ${error}`]
      };
    }
  }

  /**
   * ✅ BACKFILL: Update existing incapacities with proper policy-aware calculations
   */
  static async backfillIncapacityNovelties(
    companyId: string, 
    periodId?: string,
    dryRun: boolean = false
  ): Promise<BackfillResult> {
    const result: BackfillResult = {
      success: false,
      processed: 0,
      updated: 0,
      errors: []
    };

    try {
      console.log('🔄 Starting incapacity novelties backfill...', { companyId, periodId, dryRun });

      // Get company's incapacity policy
      const policies = await CompanyPayrollPoliciesService.getPayrollPolicies(companyId);
      const incapacityPolicy = policies?.incapacity_policy || 'standard_2d_100_rest_66';

      console.log('📋 Using incapacity policy:', incapacityPolicy);

      // Get open period IDs first
      const { data: openPeriods, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso']);

      if (periodError) {
        throw periodError;
      }

      if (!openPeriods || openPeriods.length === 0) {
        console.log('⚠️ No open periods found');
        result.success = true;
        return result;
      }

      const openPeriodIds = openPeriods.map(p => p.id);

      // Build query for incapacities
      let query = supabase
        .from('payroll_novedades')
        .select(`
          id,
          empleado_id,
          periodo_id,
          tipo_novedad,
          subtipo,
          valor,
          dias,
          fecha_inicio,
          fecha_fin,
          base_calculo,
          employees!inner(salario_base)
        `)
        .eq('company_id', companyId)
        .eq('tipo_novedad', 'incapacidad')
        .in('periodo_id', openPeriodIds);

      if (periodId) {
        query = query.eq('periodo_id', periodId);
      }

      const { data: novelties, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      console.log(`📊 Found ${novelties?.length || 0} incapacity novelties to process`);

      if (!novelties || novelties.length === 0) {
        result.success = true;
        return result;
      }

      // Process each incapacity
      for (const novedad of novelties) {
        result.processed++;

        try {
          const employeeSalary = (novedad.employees as any)?.salario_base || 0;
          
          if (employeeSalary <= 0) {
            result.errors.push(`Salary not found for employee ${novedad.empleado_id}`);
            continue;
          }

          // Calculate correct value using current policy
          const correctValue = IncapacityCalculationService.computeIncapacityValue(
            employeeSalary,
            novedad.dias || 0,
            novedad.subtipo,
            incapacityPolicy
          );

          const expectedBreakdown = IncapacityCalculationService.calculateExpectedValueByPolicy(
            employeeSalary,
            novedad.dias || 0,
            novedad.subtipo || 'general',
            incapacityPolicy
          );

          // Create detailed base_calculo
          const updatedBaseCalculo = JSON.stringify({
            salario_base: employeeSalary,
            valor_original_usuario: novedad.valor,
            valor_calculado: correctValue,
            factor_calculo: correctValue / employeeSalary * 30, // Approximate factor
            detalle_calculo: expectedBreakdown.breakdown,
            policy_snapshot: {
              incapacity_policy: incapacityPolicy,
              calculation_date: new Date().toISOString(),
              salary_used: employeeSalary,
              days_used: novedad.dias,
              subtipo_used: novedad.subtipo,
              backfilled: true
            },
            breakdown: expectedBreakdown
          });

          // Only update if there's a significant difference or missing breakdown
          const shouldUpdate = 
            !novedad.base_calculo || 
            Math.abs((novedad.valor || 0) - correctValue) > 1;

          if (shouldUpdate && !dryRun) {
            const { error: updateError } = await supabase
              .from('payroll_novedades')
              .update({
                valor: correctValue,
                base_calculo: updatedBaseCalculo,
                updated_at: new Date().toISOString()
              })
              .eq('id', novedad.id);

            if (updateError) {
              result.errors.push(`Failed to update ${novedad.id}: ${updateError.message}`);
              continue;
            }

            result.updated++;
            console.log(`✅ Updated incapacity ${novedad.id}: ${novedad.valor} → ${correctValue}`);
          } else if (shouldUpdate && dryRun) {
            console.log(`🔍 DRY RUN - Would update ${novedad.id}: ${novedad.valor} → ${correctValue}`);
            result.updated++;
          }

        } catch (noveltyError) {
          result.errors.push(`Error processing ${novedad.id}: ${noveltyError}`);
          console.error('Error processing novelty:', noveltyError);
        }
      }

      result.success = result.errors.length < result.processed * 0.5; // Success if <50% errors

      console.log('✅ Backfill completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Backfill failed:', error);
      result.errors.push(`Global error: ${error}`);
      return result;
    }
  }

  /**
   * ✅ BATCH RECALCULATION: Recalculate multiple novelties using backend service
   */
  static async recalculateNoveltyBatch(
    companyId: string,
    noveltyIds: string[]
  ): Promise<BackfillResult> {
    const result: BackfillResult = {
      success: false,
      processed: 0,
      updated: 0,
      errors: []
    };

    try {
      console.log('🔄 Starting batch recalculation for novelties:', noveltyIds);

      for (const noveltyId of noveltyIds) {
        result.processed++;

        try {
          // Get novedad details
          const { data: novedad, error: fetchError } = await supabase
            .from('payroll_novedades')
            .select(`
              id,
              empleado_id,
              tipo_novedad,
              subtipo,
              dias,
              horas,
              valor,
              employees!inner(salario_base)
            `)
            .eq('id', noveltyId)
            .eq('company_id', companyId)
            .single();

          if (fetchError || !novedad) {
            result.errors.push(`Novelty ${noveltyId} not found`);
            continue;
          }

          const employeeSalary = (novedad.employees as any)?.salario_base || 0;

          // Call backend calculation service
          const { data: backendResponse, error: backendError } = await supabase.functions.invoke('payroll-calculations', {
            body: {
              action: 'calculate-novedad',
              data: {
                tipoNovedad: novedad.tipo_novedad,
                subtipo: novedad.subtipo,
                salarioBase: employeeSalary,
                dias: novedad.dias,
                horas: novedad.horas,
                fechaPeriodo: new Date().toISOString().split('T')[0]
              }
            }
          });

          if (backendError || !backendResponse.success) {
            result.errors.push(`Backend calculation failed for ${noveltyId}: ${backendError?.message || backendResponse.error}`);
            continue;
          }

          const calculationResult = backendResponse.data;

          // Store base_calculo as JSON string
          const baseCalculoJson = JSON.stringify({
            salario_base: employeeSalary,
            valor_original_usuario: novedad.valor,
            valor_calculado: calculationResult.valor,
            factor_calculo: calculationResult.factorCalculo,
            detalle_calculo: calculationResult.detalleCalculo,
            policy_snapshot: {
              calculation_date: new Date().toISOString(),
              salary_used: employeeSalary,
              recalculated: true
            },
            breakdown: calculationResult.jornadaInfo
          });

          // Update with backend result
          const { error: updateError } = await supabase
            .from('payroll_novedades')
            .update({
              valor: calculationResult.valor,
              base_calculo: baseCalculoJson,
              updated_at: new Date().toISOString()
            })
            .eq('id', noveltyId);

          if (updateError) {
            result.errors.push(`Failed to update ${noveltyId}: ${updateError.message}`);
            continue;
          }

          result.updated++;
          console.log(`✅ Recalculated novelty ${noveltyId}: ${novedad.valor} → ${calculationResult.valor}`);

        } catch (noveltyError) {
          result.errors.push(`Error processing ${noveltyId}: ${noveltyError}`);
        }
      }

      result.success = result.updated > 0;
      return result;

    } catch (error) {
      console.error('❌ Batch recalculation failed:', error);
      result.errors.push(`Global error: ${error}`);
      return result;
    }
  }
}
