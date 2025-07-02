
import * as XLSX from 'xlsx';

export class ExcelExportService {
  static exportToExcel(data: any[], filename: string, sheetName: string = 'Datos'): void {
    try {
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const colWidths = this.calculateColumnWidths(data);
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate buffer and download
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array'
      });

      this.downloadFile(excelBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Error al exportar a Excel');
    }
  }

  private static calculateColumnWidths(data: any[]): any[] {
    if (!data.length) return [];

    const headers = Object.keys(data[0]);
    const widths = headers.map(header => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Cap at 50 characters
    });

    return widths;
  }

  private static downloadFile(buffer: any, filename: string, mimeType: string): void {
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  static exportPayrollSummary(data: any[], filename: string): void {
    const formattedData = data.map(item => ({
      'Empleado': item.employeeName,
      'Período': item.period,
      'Total Devengado': item.totalEarnings,
      'Total Deducciones': item.totalDeductions,
      'Neto Pagado': item.netPay,
      'Aportes Empleador': item.employerContributions,
      'Centro de Costo': item.costCenter
    }));

    this.exportToExcel(formattedData, filename, 'Resumen Nómina');
  }

  static exportLaborCosts(data: any[], filename: string): void {
    const formattedData = data.map(item => ({
      'Empleado': item.employeeName,
      'Salario Base': item.baseSalary,
      'Beneficios': item.benefits,
      'Horas Extra': item.overtime,
      'Bonos': item.bonuses,
      'Aportes Patronales': item.employerContributions,
      'Costo Total': item.totalCost,
      'Centro de Costo': item.costCenter
    }));

    this.exportToExcel(formattedData, filename, 'Costos Laborales');
  }

  static exportSocialSecurity(data: any[], filename: string): void {
    const formattedData = data.map(item => ({
      'Empleado': item.employeeName,
      'Salud Empleado': item.healthEmployee,
      'Salud Empleador': item.healthEmployer,
      'Pensión Empleado': item.pensionEmployee,
      'Pensión Empleador': item.pensionEmployer,
      'ARL': item.arl,
      'Caja Compensación': item.compensationBox,
      'Total': item.total
    }));

    this.exportToExcel(formattedData, filename, 'Seguridad Social');
  }
}
