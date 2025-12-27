import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class PDFExportService {
  static exportToPDF(data: any[], filename: string, title: string, columns: any[]): void {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text(title, 14, 22);

      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);

      // Add table
      autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: data.map(item => columns.map(col => col.dataKey ? item[col.dataKey] : '')),
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      // Save the PDF
      doc.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Error al exportar a PDF');
    }
  }

  static exportPayrollSummaryPDF(data: any[], filename: string): void {
    const columns = [
      { header: 'Empleado', dataKey: 'employeeName' },
      { header: 'Período', dataKey: 'period' },
      { header: 'Total Devengado', dataKey: 'totalEarnings' },
      { header: 'Total Deducciones', dataKey: 'totalDeductions' },
      { header: 'Neto Pagado', dataKey: 'netPay' },
      { header: 'Centro Costo', dataKey: 'costCenter' }
    ];

    this.exportToPDF(data, filename, 'Resumen de Nómina por Período', columns);
  }

  static exportLaborCostsPDF(data: any[], filename: string): void {
    const columns = [
      { header: 'Empleado', dataKey: 'employeeName' },
      { header: 'Salario Base', dataKey: 'baseSalary' },
      { header: 'Beneficios', dataKey: 'benefits' },
      { header: 'Horas Extra', dataKey: 'overtime' },
      { header: 'Aportes Patronales', dataKey: 'employerContributions' },
      { header: 'Costo Total', dataKey: 'totalCost' }
    ];

    this.exportToPDF(data, filename, 'Reporte de Costos Laborales', columns);
  }

  static exportSocialSecurityPDF(data: any[], filename: string): void {
    const columns = [
      { header: 'Empleado', dataKey: 'employeeName' },
      { header: 'Salud Empleado', dataKey: 'healthEmployee' },
      { header: 'Salud Empleador', dataKey: 'healthEmployer' },
      { header: 'Pensión Empleado', dataKey: 'pensionEmployee' },
      { header: 'Pensión Empleador', dataKey: 'pensionEmployer' },
      { header: 'ARL', dataKey: 'arl' },
      { header: 'Total', dataKey: 'total' }
    ];

    this.exportToPDF(data, filename, 'Seguridad Social y Parafiscales', columns);
  }
}
