import { 
  ReportInsight, 
  InsightType, 
  InsightSeverity,
  ComparativeMetrics,
  CompositionBreakdown,
  AnomalyDetection
} from '@/types/insights';

export class ReportInsightAnalyzer {
  /**
   * Genera insights automáticos multi-capa para un reporte
   */
  static generateInsights(
    reportType: string,
    currentData: any[],
    previousData?: any[],
    options?: {
      threshold?: number;
      topN?: number;
    }
  ): ReportInsight[] {
    const insights: ReportInsight[] = [];
    const threshold = options?.threshold || 0.15; // 15% change threshold
    const topN = options?.topN || 3;

    // Layer 1: Comparación Temporal
    if (previousData && previousData.length > 0) {
      const comparisonInsights = this.analyzeTemporalComparison(
        currentData,
        previousData,
        threshold
      );
      insights.push(...comparisonInsights);
    }

    // Layer 2: Composición (Top Contributors)
    const compositionInsights = this.analyzeComposition(currentData, topN);
    insights.push(...compositionInsights);

    // Layer 3: Detección de Anomalías
    const anomalyInsights = this.detectAnomalies(currentData, threshold);
    insights.push(...anomalyInsights);

    // Layer 4: Recomendaciones
    const recommendations = this.generateRecommendations(
      currentData,
      previousData,
      insights
    );
    insights.push(...recommendations);

    return insights;
  }

  /**
   * Layer 1: Análisis de comparación temporal
   */
  private static analyzeTemporalComparison(
    currentData: any[],
    previousData: any[],
    threshold: number
  ): ReportInsight[] {
    const insights: ReportInsight[] = [];

    // Comparar totales
    const currentTotal = this.calculateTotal(currentData);
    const previousTotal = this.calculateTotal(previousData);
    const change = currentTotal - previousTotal;
    const changePercentage = previousTotal !== 0 
      ? (change / previousTotal) * 100 
      : 0;

    if (Math.abs(changePercentage) >= threshold * 100) {
      const severity: InsightSeverity = 
        Math.abs(changePercentage) > 25 ? 'critical' :
        Math.abs(changePercentage) > 15 ? 'warning' : 'info';

      insights.push({
        id: `comparison-total-${Date.now()}`,
        type: 'comparison',
        severity,
        title: change > 0 
          ? `Aumento del ${Math.abs(changePercentage).toFixed(1)}% vs período anterior`
          : `Disminución del ${Math.abs(changePercentage).toFixed(1)}% vs período anterior`,
        description: `El costo total ${change > 0 ? 'aumentó' : 'disminuyó'} de ${this.formatCurrency(previousTotal)} a ${this.formatCurrency(currentTotal)}. ${change > 0 ? 'Esto representa un incremento' : 'Esto representa una reducción'} de ${this.formatCurrency(Math.abs(change))}.`,
        value: currentTotal,
        percentage: changePercentage,
        comparison: {
          current: currentTotal,
          previous: previousTotal,
          change,
          changePercentage,
          period: 'anterior'
        },
        actions: [
          {
            label: 'Ver detalle',
            type: 'navigate',
            payload: { view: 'detailed' }
          }
        ]
      });
    }

    return insights;
  }

  /**
   * Layer 2: Análisis de composición
   */
  private static analyzeComposition(
    data: any[],
    topN: number
  ): ReportInsight[] {
    const insights: ReportInsight[] = [];

    // Agrupar por centro de costos si existe
    if (data.length > 0 && data[0].costCenter) {
      const breakdown = this.calculateBreakdown(data, 'costCenter');
      const topContributors = breakdown.slice(0, topN);

      if (topContributors.length > 0) {
        const topContributor = topContributors[0];
        insights.push({
          id: `composition-top-${Date.now()}`,
          type: 'composition',
          severity: 'info',
          title: `${topContributor.component} representa el ${topContributor.percentage.toFixed(1)}% del costo`,
          description: `Los ${topN} centros de costos principales concentran el ${topContributors.reduce((sum, c) => sum + c.percentage, 0).toFixed(1)}% del costo total. ${topContributor.component} lidera con ${this.formatCurrency(topContributor.value)}.`,
          value: topContributor.value,
          percentage: topContributor.percentage,
          metadata: { breakdown: topContributors }
        });
      }
    }

    return insights;
  }

  /**
   * Layer 3: Detección de anomalías
   */
  private static detectAnomalies(
    data: any[],
    threshold: number
  ): ReportInsight[] {
    const insights: ReportInsight[] = [];

    if (data.length < 3) return insights;

    // Calcular estadísticas por empleado
    const employeeStats = data.map(record => ({
      id: record.employeeId || record.id,
      name: record.employeeName || record.nombre || 'Desconocido',
      value: record.totalCost || record.netPay || record.total || 0
    }));

    const values = employeeStats.map(s => s.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    // Detectar outliers (> 2 desviaciones estándar)
    const outliers = employeeStats.filter(stat => 
      Math.abs(stat.value - mean) > 2 * stdDev
    );

    if (outliers.length > 0) {
      const outlier = outliers[0];
      insights.push({
        id: `anomaly-outlier-${Date.now()}`,
        type: 'anomaly',
        severity: 'warning',
        title: `${outlier.name} tiene un costo atípico`,
        description: `El costo de ${this.formatCurrency(outlier.value)} está ${outlier.value > mean ? 'por encima' : 'por debajo'} del promedio (${this.formatCurrency(mean)}) en ${Math.abs(((outlier.value - mean) / mean) * 100).toFixed(1)}%. Revisa si hay novedades inusuales.`,
        value: outlier.value,
        metadata: { 
          mean, 
          stdDev,
          employeeId: outlier.id,
          employeeName: outlier.name
        },
        actions: [
          {
            label: 'Ver empleado',
            type: 'navigate',
            payload: { employeeId: outlier.id }
          }
        ]
      });
    }

    return insights;
  }

  /**
   * Layer 4: Generación de recomendaciones
   */
  private static generateRecommendations(
    currentData: any[],
    previousData: any[] | undefined,
    insights: ReportInsight[]
  ): ReportInsight[] {
    const recommendations: ReportInsight[] = [];

    // Recomendación basada en tendencia de aumento
    const comparisonInsight = insights.find(i => i.type === 'comparison');
    if (comparisonInsight && comparisonInsight.comparison) {
      const { changePercentage } = comparisonInsight.comparison;
      
      if (changePercentage > 15) {
        recommendations.push({
          id: `recommendation-budget-${Date.now()}`,
          type: 'recommendation',
          severity: 'warning',
          title: 'Considera ajustar el presupuesto',
          description: `Con un aumento del ${changePercentage.toFixed(1)}%, proyectamos que podrías superar tu presupuesto anual. Considera: 1) Revisar horas extra, 2) Optimizar bonificaciones, 3) Renegociar beneficios extralegales.`,
          actions: [
            {
              label: 'Simular escenarios',
              type: 'simulate',
              payload: { type: 'budget' }
            }
          ]
        });
      } else if (changePercentage < -10) {
        recommendations.push({
          id: `recommendation-savings-${Date.now()}`,
          type: 'recommendation',
          severity: 'success',
          title: 'Oportunidad de ahorro identificada',
          description: `La reducción del ${Math.abs(changePercentage).toFixed(1)}% representa un ahorro significativo. Documenta las acciones que generaron esta mejora para replicarlas.`,
          actions: [
            {
              label: 'Exportar reporte',
              type: 'download',
              payload: { format: 'pdf' }
            }
          ]
        });
      }
    }

    // Recomendación basada en anomalías
    const anomalyInsight = insights.find(i => i.type === 'anomaly');
    if (anomalyInsight) {
      recommendations.push({
        id: `recommendation-review-${Date.now()}`,
        type: 'recommendation',
        severity: 'info',
        title: 'Revisa costos atípicos',
        description: 'Detectamos valores que se desvían del promedio. Verifica que las novedades ingresadas sean correctas y estén justificadas.',
        actions: [
          {
            label: 'Ver novedades',
            type: 'navigate',
            payload: { view: 'novelties' }
          }
        ]
      });
    }

    return recommendations;
  }

  // Utility methods
  private static calculateTotal(data: any[]): number {
    return data.reduce((sum, record) => {
      const value = record.totalCost || 
                   record.netPay || 
                   record.total || 
                   record.valor || 
                   0;
      return sum + Number(value);
    }, 0);
  }

  private static calculateBreakdown(
    data: any[],
    field: string
  ): CompositionBreakdown[] {
    const groups = new Map<string, number>();
    let total = 0;

    data.forEach(record => {
      const key = record[field] || 'Sin especificar';
      const value = record.totalCost || record.netPay || record.total || 0;
      groups.set(key, (groups.get(key) || 0) + value);
      total += value;
    });

    return Array.from(groups.entries())
      .map(([component, value]) => ({
        component,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        rank: 0
      }))
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({ ...item, rank: index + 1 }));
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
