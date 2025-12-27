import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PaymentHistoryItem } from './SocialBenefitsLiquidationService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

const BENEFIT_LABELS: Record<string, string> = {
  prima: 'Prima de Servicios',
  cesantias: 'Cesantías',
  intereses_cesantias: 'Intereses de Cesantías',
  vacaciones: 'Vacaciones',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export class SocialBenefitsExportService {
  /**
   * Exporta una liquidación a Excel
   */
  static exportToExcel(payment: PaymentHistoryItem): void {
    const benefitLabel = BENEFIT_LABELS[payment.benefit_type] || payment.benefit_type;
    const employees = payment.payment_details?.employees || [];
    
    // Preparar datos
    const data = employees.map((emp: any, index: number) => ({
      'No.': index + 1,
      'Empleado': emp.name,
      'Quincenas': emp.periodsCount || '-',
      'Monto': emp.amount,
    }));

    // Agregar fila de totales
    data.push({
      'No.': '',
      'Empleado': 'TOTAL',
      'Quincenas': '',
      'Monto': payment.total_amount,
    });

    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 5 },   // No.
      { wch: 35 },  // Empleado
      { wch: 12 },  // Quincenas
      { wch: 18 },  // Monto
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Liquidación');

    // Generar nombre de archivo
    const dateStr = format(new Date(payment.created_at), 'yyyy-MM-dd');
    const filename = `Liquidacion_${benefitLabel.replace(/\s+/g, '_')}_${payment.period_label.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

    // Descargar
    XLSX.writeFile(wb, filename);
  }

  /**
   * Exporta una liquidación a PDF
   */
  static exportToPDF(payment: PaymentHistoryItem): void {
    const benefitLabel = BENEFIT_LABELS[payment.benefit_type] || payment.benefit_type;
    const employees = payment.payment_details?.employees || [];
    
    // Crear documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text('Liquidación de Prestaciones Sociales', pageWidth / 2, 20, { align: 'center' });

    // Subtítulo con tipo de prestación
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(benefitLabel, pageWidth / 2, 30, { align: 'center' });

    // Información del período
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateStr = format(new Date(payment.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es });
    doc.text(`Período: ${payment.period_label}`, 14, 45);
    doc.text(`Fecha de liquidación: ${dateStr}`, 14, 52);
    doc.text(`Empleados: ${payment.employees_count}`, 14, 59);

    // Estado
    if (payment.anulado) {
      doc.setTextColor(220, 53, 69);
      doc.text('Estado: ANULADO', pageWidth - 14, 45, { align: 'right' });
      if (payment.anulacion_motivo) {
        doc.setFontSize(8);
        doc.text(`Motivo: ${payment.anulacion_motivo}`, pageWidth - 14, 52, { align: 'right' });
      }
    } else {
      doc.setTextColor(40, 167, 69);
      doc.text('Estado: PAGADO', pageWidth - 14, 45, { align: 'right' });
    }

    // Tabla de empleados
    const tableData = employees.map((emp: any, index: number) => [
      (index + 1).toString(),
      emp.name,
      emp.periodsCount?.toString() || '-',
      formatCurrency(emp.amount),
    ]);

    // Fila de totales
    tableData.push([
      '',
      'TOTAL',
      '',
      formatCurrency(payment.total_amount),
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['No.', 'Empleado', 'Quincenas', 'Monto']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 40 },
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: 33,
        fontStyle: 'bold',
      },
      didParseCell: function (data) {
        // Estilo para la fila de totales
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    // Descargar
    const filename = `Liquidacion_${benefitLabel.replace(/\s+/g, '_')}_${payment.period_label.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  }

  /**
   * Exporta un resultado de liquidación recién realizada a Excel
   */
  static exportResultToExcel(
    result: { totalAmount: number; employeesCount: number; periodLabel: string },
    employees: Array<{ name: string; amount: number; periodsCount?: number }>,
    benefitType: string
  ): void {
    const benefitLabel = BENEFIT_LABELS[benefitType] || benefitType;
    
    const data = employees.map((emp, index) => ({
      'No.': index + 1,
      'Empleado': emp.name,
      'Quincenas': emp.periodsCount || '-',
      'Monto': emp.amount,
    }));

    data.push({
      'No.': '',
      'Empleado': 'TOTAL',
      'Quincenas': '',
      'Monto': result.totalAmount,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 35 },
      { wch: 12 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Liquidación');

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `Liquidacion_${benefitLabel.replace(/\s+/g, '_')}_${result.periodLabel.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  }

  /**
   * Exporta un resultado de liquidación recién realizada a PDF
   */
  static exportResultToPDF(
    result: { totalAmount: number; employeesCount: number; periodLabel: string },
    employees: Array<{ name: string; amount: number; periodsCount?: number }>,
    benefitType: string
  ): void {
    const benefitLabel = BENEFIT_LABELS[benefitType] || benefitType;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text('Liquidación de Prestaciones Sociales', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(benefitLabel, pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    doc.text(`Período: ${result.periodLabel}`, 14, 45);
    doc.text(`Fecha de liquidación: ${dateStr}`, 14, 52);
    doc.text(`Empleados: ${result.employeesCount}`, 14, 59);

    doc.setTextColor(40, 167, 69);
    doc.text('Estado: PAGADO', pageWidth - 14, 45, { align: 'right' });

    const tableData = employees.map((emp, index) => [
      (index + 1).toString(),
      emp.name,
      emp.periodsCount?.toString() || '-',
      formatCurrency(emp.amount),
    ]);

    tableData.push([
      '',
      'TOTAL',
      '-',
      formatCurrency(result.totalAmount),
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['No.', 'Empleado', 'Quincenas', 'Monto']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 40 },
      },
      didParseCell: function (data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const filename = `Liquidacion_${benefitLabel.replace(/\s+/g, '_')}_${result.periodLabel.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  }
}
