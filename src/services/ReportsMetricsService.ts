
import { ExportHistory, ReportMetrics } from '@/types/reports';

export class ReportsMetricsService {
  static async loadExportHistory(): Promise<ExportHistory[]> {
    // Mock export history data
    return [
      {
        id: '1',
        reportType: 'payroll-summary',
        fileName: 'resumen-nomina-2024-01.xlsx',
        format: 'excel',
        generatedBy: 'admin@empresa.com',
        generatedAt: '2024-01-15T10:30:00Z',
        parameters: {
          dateRange: { from: '2024-01-01', to: '2024-01-31' },
          costCenters: ['Administración']
        },
        downloadUrl: '#download/resumen-nomina-2024-01.xlsx'
      },
      {
        id: '2',
        reportType: 'social-security',
        fileName: 'seguridad-social-2024-01.pdf',
        format: 'pdf',
        generatedBy: 'contador@empresa.com',
        generatedAt: '2024-01-10T14:20:00Z',
        parameters: {
          dateRange: { from: '2024-01-01', to: '2024-01-31' }
        },
        downloadUrl: '#download/seguridad-social-2024-01.pdf'
      }
    ];
  }

  static async getReportMetrics(): Promise<ReportMetrics> {
    // Mock metrics data
    return {
      averageCostPerEmployee: 2800000,
      averageBenefitLoad: 0.215,
      totalMonthlyCost: 28000000,
      employeeCount: 10
    };
  }

  static async createExportRecord(exportData: Omit<ExportHistory, 'id'>): Promise<ExportHistory> {
    const newExport: ExportHistory = {
      ...exportData,
      id: Date.now().toString()
    };
    
    // In production, save to database
    console.log('Creating export record:', newExport);
    
    return newExport;
  }
}
