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

      // 3. Generar insights automáticos con AI
      const insights = await this.generateInsights(
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
   * Genera insights automáticos con AI (OpenAI)
   */
  private static async generateInsights(
    currentData: any[],
    previousData: any[] | undefined,
    reportType: string
  ): Promise<any[]> {
    try {
      // 1. Preparar contexto completo para AI
      const analysisContext = this.buildAnalysisContext(currentData, previousData, reportType);
      
      // 2. Invocar OpenAI con prompt profesional
      const insights = await this.generateAIInsights(analysisContext);
      
      return insights;
    } catch (error) {
      console.error('[ReportsHandler] Error generating AI insights, using fallback:', error);
      // Fallback a insights básicos
      return this.generateBasicInsights(currentData, previousData, reportType);
    }
  }

  /**
   * Prepara contexto estructurado para análisis AI
   */
  private static buildAnalysisContext(
    currentData: any[],
    previousData: any[] | undefined,
    reportType: string
  ): any {
    // Métricas actuales
    const currentTotal = currentData.reduce((sum, r) => sum + (r.neto_pagado || 0), 0);
    const currentAvg = currentData.length > 0 ? currentTotal / currentData.length : 0;
    
    // Comparación temporal
    let comparison = null;
    if (previousData && previousData.length > 0) {
      const previousTotal = previousData.reduce((sum, r) => sum + (r.neto_pagado || 0), 0);
      const change = currentTotal - previousTotal;
      comparison = {
        previousTotal,
        previousCount: previousData.length,
        change,
        changePercentage: previousTotal !== 0 ? (change / previousTotal) * 100 : 0
      };
    }
    
    // Composición por centro de costos
    const costCenters = new Map<string, { count: number, total: number }>();
    currentData.forEach(record => {
      const cc = record.employee?.centro_costos || 'Sin especificar';
      const value = record.neto_pagado || 0;
      const existing = costCenters.get(cc) || { count: 0, total: 0 };
      costCenters.set(cc, { count: existing.count + 1, total: existing.total + value });
    });
    
    const costCentersArray = Array.from(costCenters.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        percentage: (data.total / currentTotal) * 100
      }))
      .sort((a, b) => b.total - a.total);
    
    // Composición por tipo de contrato
    const contractTypes = new Map<string, { count: number, total: number }>();
    currentData.forEach(record => {
      const type = record.employee?.tipo_contrato || 'Sin especificar';
      const value = record.neto_pagado || 0;
      const existing = contractTypes.get(type) || { count: 0, total: 0 };
      contractTypes.set(type, { count: existing.count + 1, total: existing.total + value });
    });
    
    const contractTypesArray = Array.from(contractTypes.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        percentage: (data.total / currentTotal) * 100
      }))
      .sort((a, b) => b.total - a.total);
    
    // Detección de outliers
    const values = currentData.map(r => r.neto_pagado || 0);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    
    const outliers = currentData
      .filter(record => {
        const value = record.neto_pagado || 0;
        return Math.abs(value - mean) > 2 * stdDev;
      })
      .map(record => ({
        employeeName: record.employee?.nombre || 'Desconocido',
        value: record.neto_pagado || 0,
        deviationFromMean: ((record.neto_pagado || 0) - mean) / mean * 100
      }));
    
    return {
      reportType,
      metrics: {
        employeeCount: currentData.length,
        totalCost: currentTotal,
        averageCost: currentAvg,
        comparison
      },
      composition: {
        costCenters: costCentersArray.slice(0, 5),
        contractTypes: contractTypesArray
      },
      anomalies: outliers.slice(0, 3)
    };
  }

  /**
   * Genera insights usando OpenAI API con prompt tier 1
   */
  private static async generateAIInsights(context: any): Promise<any[]> {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY no configurado, usando insights básicos');
      return this.generateBasicInsights([], undefined, context.reportType);
    }
    
    const prompt = `Eres un CFO experto del año 2028 que trabaja con empresas tier 1 de payroll en Colombia.

**CONTEXTO DEL REPORTE:**
- Tipo: ${this.getReportLabel(context.reportType)}
- Empleados: ${context.metrics.employeeCount}
- Costo total: ${this.formatCurrency(context.metrics.totalCost)}
- Costo promedio: ${this.formatCurrency(context.metrics.averageCost)}

${context.metrics.comparison ? `
**COMPARACIÓN PERÍODO ANTERIOR:**
- Empleados período anterior: ${context.metrics.comparison.previousCount}
- Costo período anterior: ${this.formatCurrency(context.metrics.comparison.previousTotal)}
- Cambio: ${this.formatCurrency(context.metrics.comparison.change)} (${context.metrics.comparison.changePercentage.toFixed(1)}%)
` : '**COMPARACIÓN:** No hay datos del período anterior disponibles'}

**COMPOSICIÓN POR CENTRO DE COSTOS:**
${context.composition.costCenters.map((cc: any) => 
  `- ${cc.name}: ${cc.count} empleados, ${this.formatCurrency(cc.total)} (${cc.percentage.toFixed(1)}%)`
).join('\n')}

**COMPOSICIÓN POR TIPO DE CONTRATO:**
${context.composition.contractTypes.map((ct: any) => 
  `- ${ct.name}: ${ct.count} empleados, ${this.formatCurrency(ct.total)} (${ct.percentage.toFixed(1)}%)`
).join('\n')}

**ANOMALÍAS DETECTADAS:**
${context.anomalies.length > 0 ? context.anomalies.map((a: any) => 
  `- ${a.employeeName}: ${this.formatCurrency(a.value)} (desviación: ${a.deviationFromMean.toFixed(1)}%)`
).join('\n') : 'Ninguna anomalía detectada'}

---

**TU TAREA:**
Genera 3-4 insights ACCIONABLES siguiendo este formato JSON ESTRICTO:

{
  "insights": [
    {
      "type": "comparison|composition|alert|recommendation|trend|anomaly",
      "severity": "info|warning|critical|success",
      "title": "Título conciso de máximo 60 caracteres",
      "description": "Descripción detallada con CONTEXTO DE NEGOCIO real. Explica por qué importa, qué impacto tiene, qué implica para el futuro. Incluye números específicos y proyecciones cuando sea posible.",
      "value": 123456.78,
      "actions": ["Acción específica 1", "Acción específica 2"]
    }
  ]
}

**CRITERIOS DE CALIDAD (Tier 1):**
1. **Contextualizar**: No solo "bajó 25%", sino explicar causas probables (salida de personal, cambio de jornada, etc.) y consecuencias operativas
2. **Cuantificar impacto**: Siempre incluir proyección anual, ahorro/costo estimado, impacto en capacidad
3. **Predecir**: Proyectar tendencias ("si continúa este patrón, en 6 meses...", "esto representa un riesgo de...")
4. **Recomendar**: Acciones específicas y ejecutables (no "revisar presupuesto", sino "reasignar X del presupuesto de Y a Z")
5. **Comparar inteligentemente**: Mencionar si es normal para el tipo de empresa, si hay concentración de riesgo, etc.

**EVITAR:**
- ❌ Repetir números que ya están en el contexto sin análisis
- ❌ Recomendaciones vagas o genéricas
- ❌ Insights sin contexto o impacto de negocio
- ❌ Usar emojis en los títulos (ya los agregamos nosotros)

Devuelve SOLO el JSON válido, sin texto adicional ni markdown.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 2000
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en OpenAI API:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      
      // Parsear JSON del resultado (buscar el objeto JSON en el texto)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No se pudo parsear respuesta AI:', content);
        throw new Error('Invalid JSON in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const insights = parsed.insights || [];
      
      console.log(`✅ Generados ${insights.length} insights con OpenAI`);
      return insights;
      
    } catch (error) {
      console.error('❌ Error generando insights con OpenAI:', error);
      throw error; // Re-throw para activar fallback
    }
  }

  /**
   * Genera insights básicos (fallback sin AI)
   */
  private static generateBasicInsights(
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
