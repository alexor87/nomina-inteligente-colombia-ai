
import { ReportMetrics, ExportHistory } from '@/types/reports';

export class ReportsMetricsService {
  static async getReportMetrics(): Promise<ReportMetrics> {
    return {
      averageCostPerEmployee: 3000000,
      averageBenefitLoad: 0.42,
      totalMonthlyCost: 15000000,
      employeeCount: 5
    };
  }

  static async loadExportHistory(): Promise<ExportHistory[]> {
    // Mock data - En producción cargar desde Supabase
    return [
      {
        id: '1',
        reportType: 'payroll-summary',
        fileName: 'resumen_nomina_enero_2025.xlsx',
        format: 'excel',
        generatedBy: 'admin@empresa.com',
        generatedAt: '2025-01-15T10:30:00Z',
        parameters: { dateRange: { from: '2025-01-01', to: '2025-01-31' } }
      }
    ];
  }
}
