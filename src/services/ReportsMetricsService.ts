
import { ReportMetrics, ExportHistory } from '@/types/reports';

export class ReportsMetricsService {
  static async getReportMetrics(): Promise<ReportMetrics> {
    // Simular cálculo de métricas desde la base de datos
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      averageCostPerEmployee: 3455000,
      averageBenefitLoad: 0.42,
      totalMonthlyCost: 15120000,
      employeeCount: 4
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
        parameters: { 
          dateRange: { from: '2025-01-01', to: '2025-01-31' }
        },
        downloadUrl: '#/download/resumen_nomina_enero_2025.xlsx'
      },
      {
        id: '2',
        reportType: 'labor-costs',
        fileName: 'costos_laborales_enero_2025.pdf',
        format: 'pdf',
        generatedBy: 'contador@empresa.com',
        generatedAt: '2025-01-20T14:15:00Z',
        parameters: { 
          costCenters: ['Administración', 'Ventas']
        },
        downloadUrl: '#/download/costos_laborales_enero_2025.pdf'
      },
      {
        id: '3',
        reportType: 'social-security',
        fileName: 'aportes_seguridad_social_enero_2025.xlsx',
        format: 'excel',
        generatedBy: 'admin@empresa.com',
        generatedAt: '2025-01-25T16:45:00Z',
        parameters: { 
          dateRange: { from: '2025-01-01', to: '2025-01-31' }
        },
        downloadUrl: '#/download/aportes_seguridad_social_enero_2025.xlsx'
      }
    ];
  }

  static async getReportUsageStats(): Promise<{
    mostUsedReports: Array<{ reportType: string; count: number }>;
    exportsByFormat: Array<{ format: string; count: number }>;
    recentActivity: Array<{ action: string; timestamp: string; user: string }>;
  }> {
    return {
      mostUsedReports: [
        { reportType: 'payroll-summary', count: 45 },
        { reportType: 'labor-costs', count: 32 },
        { reportType: 'social-security', count: 28 },
        { reportType: 'novelty-history', count: 22 },
        { reportType: 'income-retention', count: 15 },
        { reportType: 'accounting-export', count: 12 }
      ],
      exportsByFormat: [
        { format: 'excel', count: 89 },
        { format: 'pdf', count: 45 },
        { format: 'csv', count: 20 }
      ],
      recentActivity: [
        { action: 'Exportó reporte de nómina', timestamp: '2025-01-25T16:45:00Z', user: 'admin@empresa.com' },
        { action: 'Guardó filtro "Empleados Activos"', timestamp: '2025-01-25T15:30:00Z', user: 'contador@empresa.com' },
        { action: 'Generó certificados CIR', timestamp: '2025-01-25T14:20:00Z', user: 'admin@empresa.com' }
      ]
    };
  }
}
