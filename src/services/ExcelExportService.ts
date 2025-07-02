import * as XLSX from 'xlsx';

export class ExcelExportService {
  static exportToExcel(data: any[], filename: string, sheetName: string = 'Reporte'): void {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Write the file
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Error al exportar a Excel');
    }
  }

  static exportPayrollSummaryExcel(data: any[], filename: string): void {
    const formattedData = data.map(item => ({
      'Empleado': item.employeeName,
      'Período': item.period,
      'Total Devengado': item.totalEarnings,
      'Total Deducciones': item.totalDeductions,
      'Neto Pagado': item.netPay,
      'Aportes Patronales': item.employerContributions,
      'Centro de Costo': item.costCenter
    }));

    this.exportToExcel(formattedData, filename, 'Resumen Nómina');
  }

  static exportLaborCostsExcel(data: any[], filename: string): void {
    const formattedData = data.map(item => ({
      'Empleado': item.employeeName,
      'Salario Base': item.baseSalary,
      'Beneficios': item.benefits,
      'Horas Extra': item.overtime,
      'Bonificaciones': item.bonuses,
      'Aportes Patronales': item.employerContributions,
      'Costo Total': item.totalCost,
      'Centro de Costo': item.costCenter
    }));

    this.exportToExcel(formattedData, filename, 'Costos Laborales');
  }

  static exportSocialSecurityExcel(data: any[], filename: string): void {
    const formattedData = data.map(item => ({
      'Empleado': item.employeeName,
      'Salud Empleado': item.healthEmployee,
      'Salud Empleador': item.healthEmployer,
      'Pensión Empleado': item.pensionEmployee,
      'Pensión Empleador': item.pensionEmployer,
      'ARL': item.arl,
      'Caja de Compensación': item.compensationBox,
      'Total': item.total
    }));

    this.exportToExcel(formattedData, filename, 'Seguridad Social');
  }
}