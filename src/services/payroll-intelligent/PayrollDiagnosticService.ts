
import { supabase } from '@/integrations/supabase/client';

export interface PeriodDiagnostic {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  tipo_periodo: string;
  company_id: string;
  created_at: string;
  source: 'payroll_periods_real' | 'payrolls';
}

export interface DiagnosticReport {
  totalPeriods: number;
  periodsReal: PeriodDiagnostic[];
  payrollsData: PeriodDiagnostic[];
  stateDistribution: Record<string, number>;
  issues: string[];
  recommendations: string[];
}

export class PayrollDiagnosticService {
  static async generateCompleteDiagnostic(companyId: string): Promise<DiagnosticReport> {
    console.log('🔍 DIAGNÓSTICO COMPLETO INICIADO para empresa:', companyId);
    
    try {
      // 1. Obtener todos los períodos de payroll_periods_real
      const { data: periodsReal, error: periodsError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (periodsError) {
        console.error('❌ Error consultando payroll_periods_real:', periodsError);
        throw periodsError;
      }

      // 2. Obtener datos de payrolls agrupados por período
      const { data: payrollsData, error: payrollsError } = await supabase
        .from('payrolls')
        .select('periodo, created_at, estado')
        .eq('company_id', companyId);

      if (payrollsError) {
        console.error('❌ Error consultando payrolls:', payrollsError);
        throw payrollsError;
      }

      // 3. Procesar datos de payrolls
      const payrollsPeriods = this.processPayrollsData(payrollsData || [], companyId);

      // 4. Convertir períodos reales
      const periodsRealProcessed: PeriodDiagnostic[] = (periodsReal || []).map(period => ({
        id: period.id,
        periodo: period.periodo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        estado: period.estado,
        tipo_periodo: period.tipo_periodo,
        company_id: period.company_id,
        created_at: period.created_at,
        source: 'payroll_periods_real' as const
      }));

      // 5. Analizar distribución de estados
      const stateDistribution = this.analyzeStateDistribution([
        ...periodsRealProcessed,
        ...payrollsPeriods
      ]);

      // 6. Detectar problemas
      const issues = this.detectIssues(periodsRealProcessed, payrollsPeriods);
      
      // 7. Generar recomendaciones
      const recommendations = this.generateRecommendations(issues, stateDistribution);

      const report: DiagnosticReport = {
        totalPeriods: periodsRealProcessed.length + payrollsPeriods.length,
        periodsReal: periodsRealProcessed,
        payrollsData: payrollsPeriods,
        stateDistribution,
        issues,
        recommendations
      };

      console.log('📊 DIAGNÓSTICO COMPLETO:', report);
      return report;

    } catch (error) {
      console.error('💥 Error en diagnóstico completo:', error);
      throw error;
    }
  }

  private static processPayrollsData(payrollsData: any[], companyId: string): PeriodDiagnostic[] {
    const periodsMap = new Map<string, PeriodDiagnostic>();

    payrollsData.forEach(payroll => {
      if (!periodsMap.has(payroll.periodo)) {
        periodsMap.set(payroll.periodo, {
          id: `payroll-${payroll.periodo}`,
          periodo: payroll.periodo,
          fecha_inicio: 'N/A',
          fecha_fin: 'N/A',
          estado: payroll.estado || 'desconocido',
          tipo_periodo: 'desconocido',
          company_id: companyId,
          created_at: payroll.created_at,
          source: 'payrolls' as const
        });
      }
    });

    return Array.from(periodsMap.values());
  }

  private static analyzeStateDistribution(periods: PeriodDiagnostic[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    periods.forEach(period => {
      distribution[period.estado] = (distribution[period.estado] || 0) + 1;
    });

    return distribution;
  }

  private static detectIssues(periodsReal: PeriodDiagnostic[], payrollsPeriods: PeriodDiagnostic[]): string[] {
    const issues: string[] = [];

    // 1. Verificar si no hay períodos
    if (periodsReal.length === 0 && payrollsPeriods.length === 0) {
      issues.push('No se encontraron períodos en ninguna tabla');
    }

    // 2. Verificar inconsistencias de nombres
    const realPeriodNames = new Set(periodsReal.map(p => p.periodo));
    const payrollPeriodNames = new Set(payrollsPeriods.map(p => p.periodo));
    
    const onlyInReal = Array.from(realPeriodNames).filter(name => !payrollPeriodNames.has(name));
    const onlyInPayrolls = Array.from(payrollPeriodNames).filter(name => !realPeriodNames.has(name));

    if (onlyInReal.length > 0) {
      issues.push(`Períodos solo en payroll_periods_real: ${onlyInReal.join(', ')}`);
    }

    if (onlyInPayrolls.length > 0) {
      issues.push(`Períodos solo en payrolls: ${onlyInPayrolls.join(', ')}`);
    }

    // 3. Verificar estados problemáticos
    const problematicStates = periodsReal.filter(p => 
      !['borrador', 'cerrado', 'procesada', 'pagada'].includes(p.estado)
    );

    if (problematicStates.length > 0) {
      issues.push(`Estados no reconocidos encontrados: ${problematicStates.map(p => `${p.periodo}:${p.estado}`).join(', ')}`);
    }

    // 4. Verificar período activo
    const activePeriods = periodsReal.filter(p => p.estado === 'borrador');
    if (activePeriods.length > 1) {
      issues.push(`Múltiples períodos activos encontrados: ${activePeriods.map(p => p.periodo).join(', ')}`);
    }

    return issues;
  }

  private static generateRecommendations(issues: string[], stateDistribution: Record<string, number>): string[] {
    const recommendations: string[] = [];

    // Recomendaciones basadas en problemas detectados
    if (issues.some(issue => issue.includes('No se encontraron períodos'))) {
      recommendations.push('Crear un período inicial automáticamente');
    }

    if (issues.some(issue => issue.includes('solo en'))) {
      recommendations.push('Sincronizar datos entre payroll_periods_real y payrolls');
    }

    if (issues.some(issue => issue.includes('Estados no reconocidos'))) {
      recommendations.push('Normalizar estados usando el enum unificado');
    }

    if (issues.some(issue => issue.includes('Múltiples períodos activos'))) {
      recommendations.push('Cerrar períodos adicionales o consolidar');
    }

    // Recomendaciones basadas en distribución de estados
    if (stateDistribution['borrador'] && stateDistribution['borrador'] > 1) {
      recommendations.push('Revisar períodos en borrador múltiples');
    }

    if (!stateDistribution['borrador']) {
      recommendations.push('Crear nuevo período en borrador para continuar operaciones');
    }

    return recommendations;
  }

  static async runDiagnosticAndLog(companyId: string): Promise<void> {
    try {
      console.log('🚀 EJECUTANDO DIAGNÓSTICO AUTOMÁTICO...');
      const report = await this.generateCompleteDiagnostic(companyId);
      
      console.log('📋 REPORTE DE DIAGNÓSTICO:');
      console.log('==========================');
      console.log(`📊 Total de períodos: ${report.totalPeriods}`);
      console.log(`📅 Períodos en payroll_periods_real: ${report.periodsReal.length}`);
      console.log(`💰 Períodos en payrolls: ${report.payrollsData.length}`);
      
      console.log('\n🎯 DISTRIBUCIÓN DE ESTADOS:');
      Object.entries(report.stateDistribution).forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });
      
      console.log('\n⚠️ PROBLEMAS DETECTADOS:');
      report.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 RECOMENDACIONES:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      
      console.log('==========================');
      
    } catch (error) {
      console.error('💥 Error en diagnóstico automático:', error);
    }
  }
}
