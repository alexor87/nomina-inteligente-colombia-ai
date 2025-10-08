import { supabase } from '@/integrations/supabase/client';
import { ReportsDBService } from '@/services/ReportsDBService';
import { 
  MayaReportRequest, 
  MayaReportResult, 
  PeriodResolution,
  ReportFilters 
} from '../types/reports';

/**
 * MAYA REPORT SERVICE
 * 
 * Servicio especializado que encapsula toda la lógica de generación
 * de reportes para Maya, separando responsabilidades y promoviendo
 * reutilización de código.
 * 
 * Responsabilidades:
 * ✅ Resolver alias de períodos a IDs reales
 * ✅ Construir filtros estructurados
 * ✅ Delegar obtención de datos a ReportsDBService
 * ✅ Invocar edge function para insights con AI
 * ✅ Formatear respuesta final
 */
export class MayaReportService {
  
  /**
   * Método principal: Genera un reporte completo con insights de AI
   */
  static async generateReport(request: MayaReportRequest): Promise<MayaReportResult> {
    console.log('📊 [MayaReportService] Generando reporte:', request.reportType);
    
    try {
      // 1. Resolver período si es necesario
      const periodResolution = await this.resolvePeriod(
        request.period,
        request.periodId,
        request.companyId
      );
      
      console.log('📅 [MayaReportService] Período resuelto:', periodResolution);
      
      // 2. Construir filtros estructurados
      const filters = this.buildFilters(request, periodResolution.periodId);
      
      // 3. Obtener datos del reporte (reutiliza ReportsDBService)
      const reportData = await this.fetchReportData(request.reportType, filters);
      
      console.log('📦 [MayaReportService] Datos obtenidos:', reportData.length, 'registros');
      
      // 4. Enriquecer con insights de AI
      const aiResult = await this.enhanceWithAI(reportData, {
        ...request,
        periodId: periodResolution.periodId,
        period: periodResolution.periodName
      });
      
      console.log('✅ [MayaReportService] Reporte generado exitosamente');
      
      return {
        success: true,
        reportType: request.reportType,
        
        // Para el flujo
        reportTitle: this.getReportLabel(request.reportType),
        summary: aiResult.message || aiResult.narrative || 'Reporte generado',
        insights: this.formatInsightsForDisplay(aiResult.insights || []),
        
        // Datos originales (para acciones posteriores)
        narrative: aiResult.message || aiResult.narrative,
        insightsData: aiResult.insights || [],
        reportData: aiResult.data || reportData,
        executableActions: aiResult.contextualActions || []
      };
      
    } catch (error: any) {
      console.error('❌ [MayaReportService] Error:', error);
      throw error;
    }
  }
  
  /**
   * Resuelve alias de períodos ('current_month', 'last_month') a IDs reales
   */
  private static async resolvePeriod(
    period: string,
    periodId: string | undefined,
    companyId: string
  ): Promise<PeriodResolution> {
    
    // Si ya tenemos periodId, usarlo
    if (periodId) {
      const { data: match } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('id', periodId)
        .maybeSingle();
      
      if (match) {
        return {
          periodId: match.id,
          periodName: match.periodo
        };
      }
    }
    
    // Resolver alias de período
    try {
      // Período actual
      if (period === 'current_month' || period === 'current_quarter' || period === 'current_year') {
        const { PayrollDomainService } = await import('@/services/PayrollDomainService');
        const situation = await PayrollDomainService.detectCurrentPeriodSituation();
        
        if (situation?.currentPeriod) {
          return {
            periodId: situation.currentPeriod.id,
            periodName: situation.currentPeriod.periodo
          };
        }
      }
      
      // Período anterior
      if (period === 'last_month') {
        const { data: recent } = await supabase
          .from('payroll_periods_real')
          .select('id, periodo, fecha_inicio')
          .eq('company_id', companyId)
          .order('fecha_inicio', { ascending: false })
          .limit(2);
        
        if (recent && recent.length > 1) {
          return {
            periodId: recent[1].id,
            periodName: recent[1].periodo
          };
        }
      }
      
      // Buscar por nombre exacto
      if (period) {
        const { data: match } = await supabase
          .from('payroll_periods_real')
          .select('id, periodo')
          .eq('company_id', companyId)
          .eq('periodo', period)
          .maybeSingle();
        
        if (match) {
          return {
            periodId: match.id,
            periodName: match.periodo
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ [MayaReportService] Error resolviendo período:', error);
    }
    
    // Fallback: usar el período tal cual
    return {
      periodId: periodId || '',
      periodName: period
    };
  }
  
  /**
   * Construye filtros estructurados para ReportsDBService
   */
  private static buildFilters(
    request: MayaReportRequest,
    periodId: string
  ): ReportFilters {
    return {
      periodId,
      employeeIds: request.filters?.employeeIds,
      costCenters: request.filters?.costCenters,
      contractTypes: request.filters?.contractTypes
    };
  }
  
  /**
   * Obtiene datos del reporte usando ReportsDBService
   */
  private static async fetchReportData(
    reportType: string,
    filters: ReportFilters
  ): Promise<any[]> {
    
    console.log('🔄 [MayaReportService] Obteniendo datos para tipo:', reportType);
    
    switch (reportType) {
      case 'payroll_summary':
        return await ReportsDBService.getPayrollSummaryReport(filters, false).then(r => r.data);
      
      case 'labor_cost':
        return await ReportsDBService.getLaborCostReport(filters);
      
      case 'social_security':
        return await ReportsDBService.getSocialSecurityReport(filters);
      
      case 'novelty_history':
        return await ReportsDBService.getNoveltyHistoryReport(filters);
      
      case 'accounting_export':
        return await ReportsDBService.getAccountingExports(filters);
      
      default:
        console.warn('⚠️ [MayaReportService] Tipo de reporte desconocido:', reportType);
        return [];
    }
  }
  
  /**
   * Enriquece datos con insights generados por AI
   */
  private static async enhanceWithAI(
    data: any[],
    request: MayaReportRequest
  ): Promise<any> {
    
    console.log('🤖 [MayaReportService] Generando insights con AI');
    
    const reportRequest = {
      reportType: request.reportType,
      period: request.period,
      periodId: request.periodId,
      companyId: request.companyId,
      filters: request.filters,
      includeComparison: request.includeComparison
    };
    
    console.log('🚀 [MayaReportService] Invocando edge function:', {
      action: 'generate_report',
      reportType: request.reportType,
      period: request.period,
      hasPeriodId: !!request.periodId,
      hasCompanyId: !!request.companyId
    });
    
    const { data: result, error } = await supabase.functions.invoke('maya-intelligence', {
      body: {
        action: 'generate_report',
        reportRequest,
        sessionId: `report-flow-${Date.now()}`
      }
    });
    
    if (error) {
      console.error('❌ [MayaReportService] Error en edge function:', error);
      throw new Error(`Error al generar insights: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Formatea insights array a texto legible
   */
  private static formatInsightsForDisplay(insights: any[]): string {
    if (!insights || insights.length === 0) {
      return 'No se encontraron insights significativos para este período.';
    }
    
    return insights
      .map((insight) => {
        const emoji = insight.severity === 'critical' ? '🔴' :
                      insight.severity === 'warning' ? '⚠️' : 'ℹ️';
        return `${emoji} **${insight.title}**\n   ${insight.description}`;
      })
      .join('\n\n');
  }
  
  /**
   * Obtiene etiqueta legible para tipo de reporte
   */
  private static getReportLabel(reportType: string): string {
    const labels: Record<string, string> = {
      payroll_summary: 'Resumen de Nómina',
      labor_cost: 'Costos Laborales',
      social_security: 'Seguridad Social',
      novelty_history: 'Historial de Novedades',
      accounting_export: 'Exportación Contable'
    };
    return labels[reportType] || reportType;
  }
}
