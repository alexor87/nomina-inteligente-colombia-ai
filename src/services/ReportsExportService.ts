
import { ExportHistory, ReportFilters } from '@/types/reports';

export class ReportsExportService {
  static async exportToExcel(
    reportType: string, 
    data: any[], 
    fileName: string, 
    filters: ReportFilters,
    onExportCreated: (exportItem: ExportHistory) => void
  ): Promise<ExportHistory> {
    // Simular exportación
    console.log('Exporting to Excel:', { reportType, fileName, recordCount: data.length });
    
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}.xlsx`,
      format: 'excel',
      generatedBy: 'admin@empresa.com',
      generatedAt: new Date().toISOString(),
      parameters: filters
    };
    
    onExportCreated(newExport);
    return newExport;
  }

  static async exportToPDF(
    reportType: string, 
    data: any[], 
    fileName: string, 
    filters: ReportFilters,
    onExportCreated: (exportItem: ExportHistory) => void
  ): Promise<ExportHistory> {
    console.log('Exporting to PDF:', { reportType, fileName, recordCount: data.length });
    
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}.pdf`,
      format: 'pdf',
      generatedBy: 'admin@empresa.com',
      generatedAt: new Date().toISOString(),
      parameters: filters
    };
    
    onExportCreated(newExport);
    return newExport;
  }
}
