
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_PAYROLL_STATES } from '@/constants/payrollStatesUnified';

interface DiagnosticResult {
  companyId: string;
  totalPeriods: number;
  periodsReal: any[];
  payrollsData: any[];
  stateDistribution: Record<string, number>;
  issues: string[];
  recommendations: string[];
  timestamp: string;
}

export class PayrollDiagnosticService {
  
  static async generateCompleteDiagnostic(companyId: string): Promise<DiagnosticResult> {
    try {
      console.log('🔍 DIAGNÓSTICO COMPLETO INICIADO para empresa:', companyId);
      
      // Obtener todos los períodos de payroll_periods_real
      const { data: periodsReal, error: periodsError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (periodsError) {
        console.error('Error cargando períodos reales:', periodsError);
        throw periodsError;
      }

      // Obtener datos únicos de payrolls
      const { data: payrollsData, error: payrollsError } = await supabase
        .from('payrolls')
        .select('periodo, estado, created_at, updated_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (payrollsError) {
        console.error('Error cargando datos de payrolls:', payrollsError);
        throw payrollsError;
      }

      // Analizar distribución de estados
      const stateDistribution: Record<string, number> = {};
      
      periodsReal.forEach(period => {
        const estado = period.estado;
        stateDistribution[estado] = (stateDistribution[estado] || 0) + 1;
      });

      // Obtener períodos únicos de payrolls
      const uniquePayrollPeriods = [...new Set(payrollsData.map(p => p.periodo))];

      // Detectar problemas
      const issues: string[] = [];
      const recommendations: string[] = [];

      // 1. Períodos que están solo en payroll_periods_real
      const periodsOnlyInReal = periodsReal.filter(pr => 
        !uniquePayrollPeriods.includes(pr.periodo)
      );

      if (periodsOnlyInReal.length > 0) {
        issues.push(`Períodos solo en payroll_periods_real: ${periodsOnlyInReal.map(p => p.periodo).join(', ')}`);
        recommendations.push('Crear registros de nómina para períodos faltantes');
      }

      // 2. Períodos que están solo en payrolls
      const periodsOnlyInPayrolls = uniquePayrollPeriods.filter(periodo => 
        !periodsReal.some(pr => pr.periodo === periodo)
      );

      if (periodsOnlyInPayrolls.length > 0) {
        issues.push(`Períodos solo en payrolls: ${periodsOnlyInPayrolls.join(', ')}`);
        recommendations.push('Crear períodos faltantes en payroll_periods_real');
      }

      // 3. Estados no reconocidos
      const invalidStates = periodsReal.filter(p => 
        !Object.values(UNIFIED_PAYROLL_STATES).includes(p.estado)
      );

      if (invalidStates.length > 0) {
        issues.push(`Estados no reconocidos encontrados: ${invalidStates.map(p => `${p.periodo}:${p.estado}`).join(', ')}`);
        recommendations.push('Normalizar estados usando el enum unificado');
      }

      // 4. Múltiples períodos en borrador
      const draftPeriods = periodsReal.filter(p => p.estado === UNIFIED_PAYROLL_STATES.BORRADOR);
      if (draftPeriods.length > 1) {
        issues.push(`Múltiples períodos en borrador: ${draftPeriods.length}`);
        recommendations.push('Revisar períodos en borrador múltiples');
      }

      // 5. Períodos sin period_id en payrolls
      const { data: missingPeriodIds } = await supabase
        .from('payrolls')
        .select('periodo')
        .eq('company_id', companyId)
        .is('period_id', null);

      if (missingPeriodIds && missingPeriodIds.length > 0) {
        issues.push(`Registros de nómina sin period_id: ${missingPeriodIds.length}`);
        recommendations.push('Actualizar period_id en registros de nómina');
      }

      // Agregar recomendaciones generales
      if (issues.length === 0) {
        recommendations.push('✅ Los datos están correctamente sincronizados');
      } else {
        recommendations.unshift('Sincronizar datos entre payroll_periods_real y payrolls');
      }

      const diagnostic: DiagnosticResult = {
        companyId,
        totalPeriods: periodsReal.length + uniquePayrollPeriods.length,
        periodsReal: periodsReal || [],
        payrollsData: payrollsData || [],
        stateDistribution,
        issues,
        recommendations,
        timestamp: new Date().toISOString()
      };

      console.log('📊 DIAGNÓSTICO COMPLETO:', diagnostic);
      
      // Log del reporte
      this.logDiagnosticReport(diagnostic);
      
      return diagnostic;

    } catch (error) {
      console.error('💥 Error en diagnóstico completo:', error);
      throw error;
    }
  }

  static async runDiagnosticAndLog(companyId: string): Promise<void> {
    try {
      console.log('🚀 EJECUTANDO DIAGNÓSTICO AUTOMÁTICO...');
      const diagnostic = await this.generateCompleteDiagnostic(companyId);
      
      // El diagnóstico ya incluye logging interno
      console.log('✅ Diagnóstico completado exitosamente');
      
    } catch (error) {
      console.error('❌ Error ejecutando diagnóstico:', error);
      throw error;
    }
  }

  private static logDiagnosticReport(diagnostic: DiagnosticResult): void {
    console.log('\n📋 REPORTE DE DIAGNÓSTICO:');
    console.log('==========================');
    console.log(`📊 Total de períodos: ${diagnostic.totalPeriods}`);
    console.log(`📅 Períodos en payroll_periods_real: ${diagnostic.periodsReal.length}`);
    console.log(`💰 Períodos en payrolls: ${[...new Set(diagnostic.payrollsData.map(p => p.periodo))].length}`);
    
    console.log('\n🎯 DISTRIBUCIÓN DE ESTADOS:');
    Object.entries(diagnostic.stateDistribution).forEach(([estado, count]) => {
      console.log(`  ${estado}: ${count}`);
    });
    
    if (diagnostic.issues.length > 0) {
      console.log('\n⚠️ PROBLEMAS DETECTADOS:');
      diagnostic.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n💡 RECOMENDACIONES:');
    diagnostic.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    console.log('==========================');
  }
}
