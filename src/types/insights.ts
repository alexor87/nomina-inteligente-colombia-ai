export type InsightType = 
  | 'comparison'
  | 'composition'
  | 'alert'
  | 'recommendation'
  | 'trend'
  | 'anomaly';

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface ReportInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  value?: number;
  percentage?: number;
  comparison?: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
    period: string;
  };
  actions?: InsightAction[];
  metadata?: Record<string, any>;
}

export interface InsightAction {
  label: string;
  type: 'navigate' | 'execute' | 'download' | 'simulate';
  payload?: Record<string, any>;
}

export interface ReportWithInsights {
  reportType: string;
  period: string;
  data: any[];
  summary: {
    totalRecords: number;
    totalAmount?: number;
    averageAmount?: number;
  };
  insights: ReportInsight[];
  generatedAt: string;
  narrative?: string;
}

export interface ComparativeMetrics {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  isSignificant: boolean;
}

export interface CompositionBreakdown {
  component: string;
  value: number;
  percentage: number;
  rank: number;
}

export interface AnomalyDetection {
  field: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  isAnomaly: boolean;
  severity: InsightSeverity;
}
