
import jsPDF from 'jspdf';
import { PayrollVoucher } from '@/types/vouchers';

export class VoucherPDFService {
  static async generatePDF(voucher: PayrollVoucher, companyInfo: any, voucherData: any): Promise<Blob> {
    const doc = new jsPDF();
    
    // Configurar fuente
    doc.setFont('helvetica', 'normal');
    
    // Encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE PAGO DE NÓMINA', 105, 20, { align: 'center' });
    
    // Logo placeholder
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.rect(20, 30, 40, 25);
    doc.text('LOGO', 40, 45, { align: 'center' });
    
    // Información de la empresa
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA EMPRESA', 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`Razón Social: ${companyInfo?.razon_social || 'No especificada'}`, 20, 80);
    doc.text(`NIT: ${companyInfo?.nit || 'No especificado'}`, 20, 90);
    doc.text(`Dirección: ${companyInfo?.direccion || 'No especificada'}`, 20, 100);
    doc.text(`Teléfono: ${companyInfo?.telefono || 'No especificado'}`, 20, 110);
    
    // Información del empleado
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL EMPLEADO', 120, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${voucher.employeeName}`, 120, 80);
    doc.text(`Cédula: ${voucher.employeeCedula}`, 120, 90);
    doc.text(`Período: ${voucher.periodo}`, 120, 100);
    doc.text(`Fechas: ${new Date(voucher.startDate).toLocaleDateString('es-CO')} - ${new Date(voucher.endDate).toLocaleDateString('es-CO')}`, 120, 110);
    
    // Línea separadora
    doc.line(20, 125, 190, 125);
    
    // Devengados
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 DEVENGADOS', 20, 140);
    
    let yPos = 150;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Tabla de devengados
    doc.text('Concepto', 25, yPos);
    doc.text('Valor', 150, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    doc.text('Salario Básico', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.baseSalary.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 10;
    
    doc.text('Horas Extra', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.overtime.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 10;
    
    doc.text('Bonificaciones', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.bonuses.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 10;
    
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DEVENGADO', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.totalEarnings.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 20;
    
    // Deducciones
    doc.setFontSize(12);
    doc.text('📉 DEDUCCIONES', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Concepto', 25, yPos);
    doc.text('Valor', 150, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    doc.text('Salud (4%)', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.healthContribution.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 10;
    
    doc.text('Pensión (4%)', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.pensionContribution.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 10;
    
    doc.text('Retención en la Fuente', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.withholdingTax.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 10;
    
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DEDUCCIONES', 25, yPos);
    doc.text(`$${voucherData.salaryDetails.totalDeductions.toLocaleString('es-CO')}`, 150, yPos);
    yPos += 20;
    
    // Neto a pagar
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.rect(20, yPos - 5, 170, 15);
    doc.text('💵 NETO A PAGAR', 25, yPos + 5);
    doc.text(`$${voucher.netPay.toLocaleString('es-CO')}`, 150, yPos + 5);
    yPos += 25;
    
    // Pie de página
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 105, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(8);
    doc.text('Este documento fue generado electrónicamente y es válido sin firma autógrafa.', 105, yPos, { align: 'center' });
    
    return doc.output('blob');
  }

  static downloadPDF(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  static async generateAndDownload(voucher: PayrollVoucher, companyInfo: any, voucherData: any): Promise<void> {
    const pdfBlob = await this.generatePDF(voucher, companyInfo, voucherData);
    const filename = `comprobante_${voucher.employeeCedula}_${voucher.periodo.replace(/\s+/g, '_').replace(/[\/\\:*?"<>|]/g, '_')}.pdf`;
    this.downloadPDF(pdfBlob, filename);
  }
}
