import { HandlerResponse } from '../core/response-builder.ts';

interface ReportRequest {
  reportType: string;
  period: string;
  periodId?: string;
  filters?: {
    employeeIds?: string[];
    costCenters?: string[];
    contractTypes?: string[];
  };
  companyId: string;
  includeComparison?: boolean;
}

interface ReportData {
  type: string;
  period: string;
  data: any[];
  previousData?: any[];
  summary: {
    totalRecords: number;
    totalAmount: number;
    averageAmount: number;
  };
}

export class ReportsHandler {
  /**
   * Helper: Detecta si un string es un UUID
   */
  private static looksLikeUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Maneja solicitudes de generación de reportes con insights
   */
  static async handleReportGeneration(
    request: ReportRequest,
    supabaseClient: any
  ): Promise<HandlerResponse> {
    try {
      console.log('[ReportsHandler] Generating report:', request.reportType);

      // 1. Obtener datos del reporte actual
      const reportData = await this.fetchReportData(
        request.reportType,
        request.periodId || request.period,
        request.companyId,
        request.filters,
        supabaseClient
      );

      if (!reportData || reportData.data.length === 0) {
        return {
          message: `No encontré datos para el reporte de **${this.getReportLabel(request.reportType)}** en el período ${request.period}.\n\n¿Quieres intentar con otro período?`,
          emotionalState: 'concerned',
          contextualActions: ['Cambiar período', 'Ver otros reportes'],
          quickReplies: [
            { value: 'change_period', label: 'Cambiar período', icon: '📅' },
            { value: 'other_reports', label: 'Otros reportes', icon: '📊' }
          ]
        };
      }

      // 2. Si se solicita comparación, obtener datos del período anterior
      let previousData: any[] | undefined;
      if (request.includeComparison !== false) {
        previousData = await this.fetchPreviousPeriodData(
          request.reportType,
          request.periodId || request.period,
          request.companyId,
          request.filters,
          supabaseClient
        );
      }

      // 3. Generar insights automáticos
      const insights = this.generateInsights(
        reportData.data,
        previousData,
        request.reportType
      );

      // 4. Crear narrativa del reporte
      const narrative = this.createReportNarrative(
        reportData,
        insights,
        request.reportType
      );

      // 5. Formatear respuesta
      const response = this.formatReportResponse(
        reportData,
        insights,
        narrative,
        request
      );

      return response;
    } catch (error) {
      console.error('[ReportsHandler] Error:', error);
      return {
        message: '❌ Ocurrió un error al generar el reporte. Por favor intenta de nuevo.',
        emotionalState: 'concerned',
        contextualActions: ['Reintentar', 'Ayuda']
      };
    }
  }

  /**
   * Obtiene datos del reporte desde la base de datos
   */
  private static async fetchReportData(
    reportType: string,
    periodOrId: string,
    companyId: string,
    filters: any,
    supabaseClient: any
  ): Promise<ReportData> {
    console.log('[ReportsHandler] fetchReportData called with:', { reportType, periodOrId, companyId });
    
    // Resolver período por ID o nombre
    let periodData;
    if (this.looksLikeUUID(periodOrId)) {
      console.log('[ReportsHandler] Resolving period by UUID:', periodOrId);
      const { data, error } = await supabaseClient
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', periodOrId)
        .single();
      
      if (error) {
        console.error('[ReportsHandler] Error fetching period by ID:', error);
        throw new Error(`Período no encontrado: ${error.message}`);
      }
      periodData = data;
    } else {
      console.log('[ReportsHandler] Resolving period by name:', periodOrId);
      const { data, error } = await supabaseClient
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo', periodOrId)
        .single();
      
      if (error) {
        console.error('[ReportsHandler] Error fetching period by name:', error);
        throw new Error(`Período no encontrado: ${error.message}`);
      }
      periodData = data;
    }

    if (!periodData) {
      throw new Error('Período no encontrado');
    }

    console.log('[ReportsHandler] Period resolved:', periodData.periodo);

    let query = supabaseClient
      .from('payrolls')
      .select(`
        *,
        employee:employees(id, nombre, apellido, centro_costos, tipo_contrato)
      `)
      .eq('company_id', companyId)
      .eq('period_id', periodData.id);

    // Aplicar filtros
    if (filters?.employeeIds && filters.employeeIds.length > 0) {
      console.log('[ReportsHandler] Applying employee filter:', filters.employeeIds);
      query = query.in('employee_id', filters.employeeIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ReportsHandler] Error fetching payroll data:', error);
      throw error;
    }

    const safeData = data ?? [];
    console.log('[ReportsHandler] Fetched payroll records:', safeData.length);

    // Calcular summary
    const totalAmount = safeData.reduce((sum: number, r: any) => sum + (r.neto_pagado || 0), 0);
    const averageAmount = safeData.length > 0 ? totalAmount / safeData.length : 0;

    return {
      type: reportType,
      period: periodData.periodo,
      data: safeData,
      summary: {
        totalRecords: safeData.length,
        totalAmount,
        averageAmount
      }
    };
  }

  /**
   * Obtiene datos del período anterior para comparación
   */
  private static async fetchPreviousPeriodData(
    reportType: string,
    currentPeriodOrId: string,
    companyId: string,
    filters: any,
    supabaseClient: any
  ): Promise<any[] | undefined> {
    try {
      console.log('[ReportsHandler] Fetching previous period data for:', currentPeriodOrId);
      
      // Resolver período actual por ID o nombre
      let currentPeriodData;
      if (this.looksLikeUUID(currentPeriodOrId)) {
        const { data } = await supabaseClient
          .from('payroll_periods_real')
          .select('fecha_inicio, fecha_fin')
          .eq('company_id', companyId)
          .eq('id', currentPeriodOrId)
          .single();
        currentPeriodData = data;
      } else {
        const { data } = await supabaseClient
          .from('payroll_periods_real')
          .select('fecha_inicio, fecha_fin')
          .eq('company_id', companyId)
          .eq('periodo', currentPeriodOrId)
          .single();
        currentPeriodData = data;
      }

      if (!currentPeriodData) {
        console.log('[ReportsHandler] Current period not found for comparison');
        return undefined;
      }

      // Calcular fecha del período anterior
      const currentStart = new Date(currentPeriodData.fecha_inicio);
      const previousMonth = new Date(currentStart);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const { data: previousPeriod } = await supabaseClient
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .gte('fecha_inicio', previousMonth.toISOString().split('T')[0])
        .lt('fecha_inicio', currentStart.toISOString().split('T')[0])
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single();

      if (!previousPeriod) {
        console.log('[ReportsHandler] No previous period found');
        return undefined;
      }

      // Obtener datos del período anterior
      const { data } = await supabaseClient
        .from('payrolls')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_id', previousPeriod.id);

      console.log('[ReportsHandler] Previous period records:', data?.length || 0);
      return data || undefined;
    } catch (error) {
      console.error('[ReportsHandler] Error fetching previous period:', error);
      return undefined;
    }
  }

  /**
   * Genera insights automáticos multi-capa
   */
  private static generateInsights(
    currentData: any[],
    previousData: any[] | undefined,
    reportType: string
  ): any[] {
    const insights: any[] = [];

    // Layer 1: Comparación temporal
    if (previousData && previousData.length > 0) {
      const currentTotal = currentData.reduce((sum, r) => sum + (r.neto_pagado || 0), 0);
      const previousTotal = previousData.reduce((sum, r) => sum + (r.neto_pagado || 0), 0);
      const change = currentTotal - previousTotal;
      const changePercentage = previousTotal !== 0 ? (change / previousTotal) * 100 : 0;

      if (Math.abs(changePercentage) >= 10) {
        insights.push({
          type: 'comparison',
          severity: Math.abs(changePercentage) > 25 ? 'critical' : 'warning',
          title: change > 0 
            ? `📈 Aumento del ${Math.abs(changePercentage).toFixed(1)}% vs período anterior`
            : `📉 Disminución del ${Math.abs(changePercentage).toFixed(1)}% vs período anterior`,
          description: `El costo total ${change > 0 ? 'aumentó' : 'disminuyó'} de ${this.formatCurrency(previousTotal)} a ${this.formatCurrency(currentTotal)}.`,
          value: currentTotal,
          change: changePercentage
        });
      }
    }

    // Layer 2: Composición por centro de costos
    const costCenterGroups = new Map<string, number>();
    currentData.forEach(record => {
      const cc = record.employee?.centro_costos || 'Sin especificar';
      const value = record.neto_pagado || 0;
      costCenterGroups.set(cc, (costCenterGroups.get(cc) || 0) + value);
    });

    if (costCenterGroups.size > 1) {
      const sorted = Array.from(costCenterGroups.entries())
        .sort((a, b) => b[1] - a[1]);
      const top = sorted[0];
      const total = Array.from(costCenterGroups.values())
        .reduce((sum, v) => sum + v, 0);
      const percentage = (top[1] / total) * 100;

      insights.push({
        type: 'composition',
        severity: 'info',
        title: `🏢 ${top[0]} concentra el ${percentage.toFixed(1)}% del costo`,
        description: `Este centro de costos lidera con ${this.formatCurrency(top[1])} del total.`,
        value: top[1],
        percentage
      });
    }

    // Layer 3: Detección de anomalías
    const values = currentData.map(r => r.neto_pagado || 0);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    const outliers = currentData.filter(record => {
      const value = record.neto_pagado || 0;
      return Math.abs(value - mean) > 2 * stdDev;
    });

    if (outliers.length > 0) {
      const outlier = outliers[0];
      insights.push({
        type: 'anomaly',
        severity: 'warning',
        title: `⚠️ Costo atípico detectado`,
        description: `${outlier.employee?.nombre || 'Un empleado'} tiene un valor de ${this.formatCurrency(outlier.neto_pagado)} que se desvía significativamente del promedio.`,
        value: outlier.neto_pagado
      });
    }

    // Layer 4: Recomendaciones
    const comparisonInsight = insights.find(i => i.type === 'comparison');
    if (comparisonInsight && comparisonInsight.change > 15) {
      insights.push({
        type: 'recommendation',
        severity: 'warning',
        title: '💡 Considera revisar el presupuesto',
        description: 'Con este aumento, proyectamos que podrías superar tu presupuesto anual. Revisa horas extra y bonificaciones.',
        actions: ['Simular escenarios', 'Ver detalle de novedades']
      });
    }

    return insights;
  }

  /**
   * Crea una narrativa del reporte
   */
  private static createReportNarrative(
    reportData: ReportData,
    insights: any[],
    reportType: string
  ): string {
    const { summary } = reportData;
    let narrative = `📊 **${this.getReportLabel(reportType)}**\n\n`;
    
    narrative += `En ${reportData.period} procesaste **${summary.totalRecords} empleados** `;
    narrative += `con un costo total de **${this.formatCurrency(summary.totalAmount)}** `;
    narrative += `(promedio: ${this.formatCurrency(summary.averageAmount)} por empleado).\n\n`;

    // Agregar principales hallazgos
    const criticalInsights = insights.filter(i => 
      i.severity === 'critical' || i.severity === 'warning'
    );

    if (criticalInsights.length > 0) {
      narrative += `**🎯 Hallazgos principales:**\n`;
      criticalInsights.slice(0, 2).forEach(insight => {
        narrative += `• ${insight.title}\n`;
      });
    }

    return narrative;
  }

  /**
   * Formatea la respuesta final del reporte
   */
  private static formatReportResponse(
    reportData: ReportData,
    insights: any[],
    narrative: string,
    request: ReportRequest
  ): HandlerResponse {
    // Formatear insights para mostrar
    const insightsText = insights.slice(0, 4).map(insight => 
      `${insight.title}`
    ).join('\n');

    const message = `${narrative}\n${insightsText}\n\n¿Qué quieres hacer ahora?`;

    return {
      message,
      emotionalState: 'analyzing',
      contextualActions: [
        'Exportar Excel',
        'Exportar PDF',
        'Ver detalle',
        'Comparar períodos'
      ],
      quickReplies: [
        { value: 'export_excel', label: 'Exportar Excel', icon: '📥' },
        { value: 'export_pdf', label: 'Exportar PDF', icon: '📄' },
        { value: 'view_detail', label: 'Ver detalle', icon: '🔍' },
        { value: 'compare', label: 'Comparar', icon: '📈' }
      ],
      conversationState: {
        reportType: request.reportType,
        period: request.period,
        periodId: request.periodId,
        reportData: reportData.data,
        insights
      }
    };
  }

  // Utility methods
  private static getReportLabel(reportType: string): string {
    const labels: Record<string, string> = {
      payroll_summary: 'Resumen de Nómina',
      labor_cost: 'Costos Laborales',
      social_security: 'Seguridad Social',
      novelty_history: 'Historial de Novedades'
    };
    return labels[reportType] || reportType;
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
