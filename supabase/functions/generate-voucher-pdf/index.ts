
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Servicio de comprobantes profesionales integrado
class IntegratedVoucherService {
  static generateProfessionalVoucherHTML(data: any): string {
    const { employee, period, company } = data;
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Cálculos detallados
    const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
    
    // Deducciones calculadas
    const saludEmpleado = Math.round(employee.baseSalary * 0.04); // 4%
    const pensionEmpleado = Math.round(employee.baseSalary * 0.04); // 4%
    const fondoSolidaridad = employee.baseSalary > 4000000 ? Math.round(employee.baseSalary * 0.01) : 0; // 1% si > 4 SMMLV
    const otrasDeduccionesCalculadas = Math.max(0, employee.deductions - saludEmpleado - pensionEmpleado - fondoSolidaridad);
    
    // Horas extra calculadas
    const valorHoraExtra = Math.round((employee.baseSalary / 240) * 1.25); // Hora extra ordinaria
    const totalHorasExtra = employee.extraHours * valorHoraExtra;

    const documento = employee.documento || employee.id?.slice(0, 8) || 'N/A';
    const tipoDocumento = employee.tipo_documento || 'CC';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante de Nómina - ${employee.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Open Sans", Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; background: white; }
    .voucher-container { max-width: 800px; margin: 0 auto; background: white; }
    h1 { text-align: center; margin-bottom: 30px; color: #1e40af; font-size: 24px; font-weight: 600; }
    .section { margin-bottom: 25px; }
    .section-title { font-weight: 600; font-size: 16px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    table, th, td { border: 1px solid #e2e8f0; }
    th, td { padding: 12px 16px; text-align: left; vertical-align: top; }
    th { background-color: #f8fafc; font-weight: 600; color: #475569; font-size: 14px; }
    td { font-size: 14px; color: #1e293b; }
    .highlight { font-weight: 600; background-color: #dbeafe; color: #1e40af; }
    .negative { color: #dc2626; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .info-card { background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .info-card h3 { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 8px; }
    .info-card p { font-size: 14px; color: #1e293b; margin-bottom: 4px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
    .signatures { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .signature-box { text-align: center; width: 300px; }
    .signature-line { border-top: 1px solid #94a3b8; margin-bottom: 8px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .footer-brand { text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer-brand .brand { font-weight: 600; color: #1e40af; }
    .footer-brand .website { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="voucher-container">
    <h1>Comprobante de Nómina</h1>

    <!-- Información General en Cards -->
    <div class="info-grid">
      <div class="info-card">
        <h3>EMPRESA</h3>
        <p><strong>${company.razon_social || 'Mi Empresa'}</strong></p>
        <p>NIT: ${company.nit || 'N/A'}</p>
        ${company.direccion ? `<p>${company.direccion}</p>` : ''}
      </div>
      
      <div class="info-card">
        <h3>EMPLEADO</h3>
        <p><strong>${employee.name}</strong></p>
        <p>${tipoDocumento}: ${documento}</p>
        ${employee.position ? `<p>Cargo: ${employee.position}</p>` : ''}
      </div>
      
      <div class="info-card">
        <h3>PERÍODO DE PAGO</h3>
        <p><strong>${formatDate(period.startDate)} - ${formatDate(period.endDate)}</strong></p>
        <p>Días trabajados: ${employee.workedDays}</p>
        <p>Salario Base: ${formatCurrency(employee.baseSalary)}</p>
      </div>
    </div>

    <!-- Resumen del Pago -->
    <div class="section">
      <div class="section-title">💵 Resumen del Pago</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style="text-align: right;">Valor</th></tr>
        </thead>
        <tbody>
          <tr><td>Salario Proporcional</td><td style="text-align: right;">${formatCurrency(salarioProporcional)}</td></tr>
          ${employee.transportAllowance > 0 ? `<tr><td>Subsidio de Transporte</td><td style="text-align: right;">${formatCurrency(employee.transportAllowance)}</td></tr>` : ''}
          ${employee.bonuses > 0 ? `<tr><td>Bonificaciones</td><td style="text-align: right;">${formatCurrency(employee.bonuses)}</td></tr>` : ''}
          ${totalHorasExtra > 0 ? `<tr><td>Horas Extras y Recargos</td><td style="text-align: right;">${formatCurrency(totalHorasExtra)}</td></tr>` : ''}
          ${employee.deductions > 0 ? `<tr class="negative"><td>Deducciones</td><td style="text-align: right;">-${formatCurrency(employee.deductions)}</td></tr>` : ''}
          <tr class="highlight"><td><strong>Total Neto a Pagar</strong></td><td style="text-align: right;"><strong>${formatCurrency(employee.netPay)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${employee.extraHours > 0 ? `
    <!-- Horas Extras y Recargos -->
    <div class="section">
      <div class="section-title">⏱ Horas Extras, Ordinarias y Recargos</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Valor</th></tr>
        </thead>
        <tbody>
          <tr><td>Hora Extra Ordinaria</td><td style="text-align: center;">${employee.extraHours} horas</td><td style="text-align: right;">${formatCurrency(totalHorasExtra)}</td></tr>
          <tr class="highlight"><td colspan="2"><strong>Total pago por horas</strong></td><td style="text-align: right;"><strong>${formatCurrency(totalHorasExtra)}</strong></td></tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    ${employee.deductions > 0 ? `
    <!-- Retenciones y Deducciones -->
    <div class="section">
      <div class="section-title">💸 Retenciones y Deducciones</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style="text-align: center;">%</th><th style="text-align: right;">Valor</th></tr>
        </thead>
        <tbody>
          ${saludEmpleado > 0 ? `<tr><td>Salud</td><td style="text-align: center;">4%</td><td style="text-align: right;">${formatCurrency(saludEmpleado)}</td></tr>` : ''}
          ${pensionEmpleado > 0 ? `<tr><td>Pensión</td><td style="text-align: center;">4%</td><td style="text-align: right;">${formatCurrency(pensionEmpleado)}</td></tr>` : ''}
          ${fondoSolidaridad > 0 ? `<tr><td>Fondo de Solidaridad</td><td style="text-align: center;">1%</td><td style="text-align: right;">${formatCurrency(fondoSolidaridad)}</td></tr>` : ''}
          ${otrasDeduccionesCalculadas > 0 ? `<tr><td>Otros</td><td style="text-align: center;">-</td><td style="text-align: right;">${formatCurrency(otrasDeduccionesCalculadas)}</td></tr>` : ''}
          <tr class="highlight"><td colspan="2"><strong>Total Retenciones y Deducciones</strong></td><td style="text-align: right;"><strong>${formatCurrency(employee.deductions)}</strong></td></tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Footer con Firmas -->
    <div class="footer">
      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line">Firma del Empleado</div>
          <p><strong>${employee.name}</strong></p>
          <p>${tipoDocumento}: ${documento}</p>
        </div>
        <div class="signature-box">
          <div class="signature-line">Firma del Representante Legal</div>
          <p><strong>${company.razon_social || 'Mi Empresa'}</strong></p>
          <p>NIT: ${company.nit || 'N/A'}</p>
        </div>
      </div>
      
      <div class="footer-brand">
        <p>Este documento fue generado con <span class="brand">Finppi</span> – Software de Nómina y Seguridad Social</p>
        <p><a href="https://www.finppi.com" class="website">www.finppi.com</a></p>
        <p style="margin-top: 8px; font-size: 11px;">Generado el ${new Date().toLocaleString('es-CO')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}

// Convertidor HTML a PDF nativo mejorado
class HTMLToPDFConverter {
  private objects: string[] = [];
  private objectPositions: number[] = [];
  private currentObjectId = 1;

  constructor() {
    this.objects = [''];  // El objeto 0 siempre está vacío en PDF
    this.objectPositions = [0]; // Posición del objeto 0
  }

  private addObject(content: string): number {
    const id = this.currentObjectId++;
    this.objects.push(content);
    this.objectPositions.push(0); // Se calculará después
    return id;
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }

  convertHTMLToPDF(employee: any, period: any): Uint8Array {
    console.log('🔧 Generando PDF detallado para:', employee.name);

    // Preparar datos para el servicio integrado
    const voucherData = {
      employee: {
        ...employee,
        documento: employee.id?.slice(0, 8) || 'N/A',
        tipo_documento: 'CC'
      },
      period,
      company: {
        razon_social: 'Mi Empresa',
        nit: 'N/A'
      }
    };

    // Generar HTML detallado
    const detailedHTML = IntegratedVoucherService.generateProfessionalVoucherHTML(voucherData);
    console.log('✅ HTML detallado generado');

    // Crear fuentes
    const fontRegularId = this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>`);

    const fontBoldId = this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>`);

    // Convertir HTML a contenido PDF con todos los detalles
    const contentStream = this.generateDetailedContentStream(employee, period, voucherData);

    const contentStreamId = this.addObject(`<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream`);

    // Crear página
    const pageId = this.addObject(`<<
/Type /Page
/Parent 5 0 R
/MediaBox [0 0 612 792]
/Contents ${contentStreamId} 0 R
/Resources <<
  /Font <<
    /F1 ${fontRegularId} 0 R
    /F2 ${fontBoldId} 0 R
  >>
>>
>>`);

    // Crear catálogo de páginas
    const pagesId = this.addObject(`<<
/Type /Pages
/Kids [${pageId} 0 R]
/Count 1
>>`);

    // Crear catálogo raíz
    const catalogId = this.addObject(`<<
/Type /Catalog
/Pages ${pagesId} 0 R
>>`);

    return this.buildDetailedPDF(catalogId);
  }

  private generateDetailedContentStream(employee: any, period: any, data: any): string {
    const formatCurrency = (amount: number) => '$' + amount.toLocaleString('es-CO');
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    // Cálculos detallados
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const salarioNeto = Number(employee.netPay) || 0;
    const deducciones = Number(employee.deductions) || 0;
    const horasExtra = Number(employee.extraHours) || 0;
    const bonificaciones = Number(employee.bonuses) || 0;
    const subsidioTransporte = Number(employee.transportAllowance) || 0;

    // Deducciones calculadas
    const saludEmpleado = Math.round(salarioBase * 0.04);
    const pensionEmpleado = Math.round(salarioBase * 0.04);
    const fondoSolidaridad = salarioBase > 4000000 ? Math.round(salarioBase * 0.01) : 0;
    const otrasDeduccionesCalculadas = Math.max(0, deducciones - saludEmpleado - pensionEmpleado - fondoSolidaridad);

    // Horas extra
    const valorHoraExtra = Math.round((salarioBase / 240) * 1.25);
    const totalHorasExtra = horasExtra * valorHoraExtra;

    const fechaInicio = formatDate(period.startDate);
    const fechaFin = formatDate(period.endDate);

    return `BT
/F2 18 Tf
50 750 Td
(${this.escapeText('COMPROBANTE DE NOMINA DETALLADO')}) Tj
ET

BT
/F2 12 Tf
50 710 Td
(${this.escapeText('EMPRESA:')}) Tj
ET

BT
/F1 11 Tf
50 695 Td
(${this.escapeText('Mi Empresa S.A.S.')}) Tj
ET

BT
/F1 10 Tf
50 680 Td
(${this.escapeText('NIT: 900123456-1')}) Tj
ET

BT
/F2 12 Tf
200 710 Td
(${this.escapeText('EMPLEADO:')}) Tj
ET

BT
/F1 11 Tf
200 695 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 10 Tf
200 680 Td
(${this.escapeText('CC: ' + (employee.id?.slice(0, 8) || 'N/A'))}) Tj
ET

BT
/F2 12 Tf
400 710 Td
(${this.escapeText('PERIODO:')}) Tj
ET

BT
/F1 11 Tf
400 695 Td
(${this.escapeText(fechaInicio + ' - ' + fechaFin)}) Tj
ET

BT
/F1 10 Tf
400 680 Td
(${this.escapeText('Dias: ' + diasTrabajados)}) Tj
ET

50 660 m
550 660 l
S

BT
/F2 14 Tf
50 630 Td
(${this.escapeText('DETALLE DE DEVENGADO')}) Tj
ET

BT
/F1 10 Tf
50 600 Td
(${this.escapeText('Salario Base:')}) Tj
ET

BT
/F1 10 Tf
400 600 Td
(${this.escapeText(formatCurrency(salarioBase))}) Tj
ET

${subsidioTransporte > 0 ? `
BT
/F1 10 Tf
50 580 Td
(${this.escapeText('Subsidio Transporte:')}) Tj
ET

BT
/F1 10 Tf
400 580 Td
(${this.escapeText(formatCurrency(subsidioTransporte))}) Tj
ET
` : ''}

${bonificaciones > 0 ? `
BT
/F1 10 Tf
50 560 Td
(${this.escapeText('Bonificaciones:')}) Tj
ET

BT
/F1 10 Tf
400 560 Td
(${this.escapeText(formatCurrency(bonificaciones))}) Tj
ET
` : ''}

${totalHorasExtra > 0 ? `
BT
/F1 10 Tf
50 540 Td
(${this.escapeText('Horas Extra (' + horasExtra + ' hrs):')}) Tj
ET

BT
/F1 10 Tf
400 540 Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET
` : ''}

50 520 m
550 520 l
S

BT
/F2 14 Tf
50 490 Td
(${this.escapeText('DETALLE DE DEDUCCIONES')}) Tj
ET

${saludEmpleado > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
50 460 Td
(${this.escapeText('Salud (4%):')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 460 Td
(${this.escapeText('-' + formatCurrency(saludEmpleado))}) Tj
ET
` : ''}

${pensionEmpleado > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
50 440 Td
(${this.escapeText('Pension (4%):')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 440 Td
(${this.escapeText('-' + formatCurrency(pensionEmpleado))}) Tj
ET
` : ''}

${fondoSolidaridad > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
50 420 Td
(${this.escapeText('Fondo Solidaridad (1%):')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 420 Td
(${this.escapeText('-' + formatCurrency(fondoSolidaridad))}) Tj
ET
` : ''}

${otrasDeduccionesCalculadas > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
50 400 Td
(${this.escapeText('Otras Deducciones:')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 400 Td
(${this.escapeText('-' + formatCurrency(otrasDeduccionesCalculadas))}) Tj
ET
` : ''}

0 0 0 rg

50 380 m
550 380 l
S

BT
/F2 16 Tf
0 0.6 0 rg
50 350 Td
(${this.escapeText('TOTAL NETO A PAGAR:')}) Tj
ET

BT
/F2 16 Tf
0 0.6 0 rg
320 350 Td
(${this.escapeText(formatCurrency(salarioNeto))}) Tj
ET

0 0 0 rg

BT
/F1 8 Tf
50 120 Td
(${this.escapeText('Comprobante generado con Finppi - Sistema de Nomina Profesional')}) Tj
ET

BT
/F1 8 Tf
50 105 Td
(${this.escapeText('Fecha de generacion: ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET

BT
/F1 8 Tf
50 90 Td
(${this.escapeText('Incluye desglose detallado de devengados y deducciones por concepto')}) Tj
ET`;
  }

  private buildDetailedPDF(catalogId: number): Uint8Array {
    console.log('🏗️ Construyendo PDF detallado con estructura corregida...');

    let pdf = '%PDF-1.4\n';
    pdf += '%âãÏÓ\n';

    let currentPos = pdf.length;

    // Escribir objetos y registrar posiciones
    for (let i = 1; i < this.objects.length; i++) {
      this.objectPositions[i] = currentPos;
      const objContent = `${i} 0 obj\n${this.objects[i]}\nendobj\n`;
      pdf += objContent;
      currentPos += objContent.length;
    }

    const xrefPos = currentPos;

    // Generar tabla xref
    pdf += 'xref\n';
    pdf += `0 ${this.objects.length}\n`;
    pdf += '0000000000 65535 f \n';

    for (let i = 1; i < this.objects.length; i++) {
      const pos = String(this.objectPositions[i]).padStart(10, '0');
      pdf += `${pos} 00000 n \n`;
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<<\n/Size ${this.objects.length}\n/Root ${catalogId} 0 R\n>>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefPos}\n`;
    pdf += '%%EOF\n';

    console.log('✅ PDF detallado generado exitosamente');
    console.log(`📊 Objetos creados: ${this.objects.length - 1}`);
    
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(pdf);
    
    console.log(`📋 Tamaño final del PDF detallado: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  }
}

serve(async (req) => {
  console.log('🚀 PDF Generator Detallado - Iniciando...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido para PDF detallado');

    const { employee, period } = requestBody;

    if (!employee || !period) {
      console.error('❌ Datos faltantes');
      return new Response(
        JSON.stringify({ error: 'Faltan datos del empleado o período' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📄 Generando PDF detallado con desglose completo...');
    
    const converter = new HTMLToPDFConverter();
    const pdfBytes = converter.convertHTMLToPDF(employee, period);
    
    console.log(`✅ PDF detallado generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validaciones mejoradas
    if (pdfBytes.length < 2000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes - posible error`);
    }
    
    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 15));
    if (!pdfString.startsWith('%PDF-')) {
      throw new Error(`Header PDF inválido: ${pdfString}`);
    }
    
    console.log('✅ PDF detallado validado correctamente');
    console.log(`🔍 Header verificado: ${pdfString.slice(0, 8)}`);
    console.log('📊 Detalles incluidos: devengados, deducciones por concepto, horas extra');
    
    const fileName = `comprobante-detallado-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('💥 ERROR en generador detallado:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF detallado: ${error.message}`,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
