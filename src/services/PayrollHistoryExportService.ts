
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';

export class PayrollHistoryExportService {
  static async exportToCSV(periods: PayrollHistoryPeriod[], filename: string = 'historial-nomina') {
    const csvContent = this.generateCSVContent(periods);
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  static async exportToExcel(periods: PayrollHistoryPeriod[], filename: string = 'historial-nomina') {
    // Para una implementación completa de Excel, usaríamos una librería como xlsx
    // Por ahora, exportamos como CSV con extensión xlsx
    const csvContent = this.generateCSVContent(periods);
    this.downloadFile(csvContent, `${filename}.xlsx`, 'application/vnd.ms-excel');
  }

  private static generateCSVContent(periods: PayrollHistoryPeriod[]): string {
    const headers = [
      'Período',
      'Fecha Inicio',
      'Fecha Fin',
      'Tipo',
      'Estado',
      'Empleados',
      'Total Devengado',
      'Total Deducciones',
      'Total Neto',
      'Costo Total',
      'Estado Pago',
      'Fecha Creación'
    ];

    const rows = periods.map(period => [
      period.period,
      period.startDate,
      period.endDate,
      period.type,
      period.status,
      period.employeesCount.toString(),
      period.totalGrossPay.toString(),
      period.totalDeductions.toString(),
      period.totalNetPay.toString(),
      period.totalCost.toString(),
      period.paymentStatus,
      new Date(period.createdAt).toLocaleDateString('es-ES')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static generateSummaryReport(periods: PayrollHistoryPeriod[]): string {
    const totalPeriods = periods.length;
    const totalGrossPay = periods.reduce((sum, p) => sum + p.totalGrossPay, 0);
    const totalNetPay = periods.reduce((sum, p) => sum + p.totalNetPay, 0);
    const totalEmployees = periods.reduce((sum, p) => sum + p.employeesCount, 0);
    const avgGrossPay = totalPeriods > 0 ? totalGrossPay / totalPeriods : 0;

    return `
RESUMEN DEL HISTORIAL DE NÓMINA
===============================

Total de Períodos: ${totalPeriods}
Total Devengado: ${formatCurrency(totalGrossPay)}
Total Neto Pagado: ${formatCurrency(totalNetPay)}
Total Empleados: ${totalEmployees}
Promedio Devengado por Período: ${formatCurrency(avgGrossPay)}

Estados de Períodos:
- Cerrados: ${periods.filter(p => p.status === 'cerrado').length}
- Borradores: ${periods.filter(p => p.status === 'borrador').length}
- Con Errores: ${periods.filter(p => p.status === 'con_errores').length}

Generado el: ${new Date().toLocaleString('es-ES')}
    `;
  }
}
