
import { ExportHistory, ReportFilters } from '@/types/reports';

export class ReportsExportService {
  static async exportToExcel(
    reportType: string, 
    data: any[], 
    fileName: string, 
    filters: ReportFilters,
    generatedBy: string,
    onExportCreated: (exportItem: ExportHistory) => void
  ): Promise<ExportHistory> {
    console.log('Exporting to Excel:', { reportType, fileName, recordCount: data.length });
    
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`,
      format: 'excel',
      generatedBy,
      generatedAt: new Date().toISOString(),
      parameters: filters,
      downloadUrl: `#/download/${Date.now()}.xlsx`
    };
    
    console.log('Excel export completed:', newExport);
    onExportCreated(newExport);
    return newExport;
  }

  static async exportToPDF(
    reportType: string, 
    data: any[], 
    fileName: string, 
    filters: ReportFilters,
    generatedBy: string,
    onExportCreated: (exportItem: ExportHistory) => void
  ): Promise<ExportHistory> {
    console.log('Exporting to PDF:', { reportType, fileName, recordCount: data.length });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`,
      format: 'pdf',
      generatedBy,
      generatedAt: new Date().toISOString(),
      parameters: filters,
      downloadUrl: `#/download/${Date.now()}.pdf`
    };
    
    console.log('PDF export completed:', newExport);
    onExportCreated(newExport);
    return newExport;
  }

  static async exportToCSV(
    reportType: string, 
    data: any[], 
    fileName: string, 
    filters: ReportFilters,
    generatedBy: string,
    onExportCreated: (exportItem: ExportHistory) => void
  ): Promise<ExportHistory> {
    console.log('Exporting to CSV:', { reportType, fileName, recordCount: data.length });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}_${new Date().toISOString().split('T')[0]}.csv`,
      format: 'csv',
      generatedBy,
      generatedAt: new Date().toISOString(),
      parameters: filters,
      downloadUrl: `#/download/${Date.now()}.csv`
    };
    
    onExportCreated(newExport);
    return newExport;
  }

  private static generateCSVFromArray(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }
}
