import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Servicio HISTÓRICO que usa datos almacenados en lugar de recalcular
class HistoricalVoucherService {
  static generateVoucherHTML(historicalData: any): string {
    const { payroll, employee, period, company } = historicalData;
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount || 0);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Usar valores HISTÓRICOS almacenados (no recalcular)
    const salarioBase = Number(payroll.salario_base) || 0;
    const diasTrabajados = Number(payroll.dias_trabajados) || 30;
    const auxilioTransporte = Number(payroll.auxilio_transporte) || 0;
    const totalDevengado = Number(payroll.total_devengado) || 0;
    const totalDeducciones = Number(payroll.total_deducciones) || 0;
    const netoAPagar = Number(payroll.neto_pagado) || 0;
    
    // Deducciones históricas específicas
    const saludEmpleado = Number(payroll.salud_empleado) || 0;
    const pensionEmpleado = Number(payroll.pension_empleado) || 0;
    const horasExtra = Number(payroll.horas_extra) || 0;
    const bonificaciones = Number(payroll.bonificaciones) || 0;
    const recargoNocturno = Number(payroll.recargo_nocturno) || 0;
    const recargoDominical = Number(payroll.recargo_dominical) || 0;
    const vacaciones = Number(payroll.vacaciones) || 0;
    const prima = Number(payroll.prima) || 0;
    const cesantias = Number(payroll.cesantias) || 0;
    const interesesCesantias = Number(payroll.intereses_cesantias) || 0;
    const retencionFuente = Number(payroll.retencion_fuente) || 0;
    const otrasDeducciones = Number(payroll.otras_deducciones) || 0;

    // Datos REALES de empleado y empresa
    const nombreCompleto = `${employee.nombre || ''} ${employee.apellido || ''}`.trim();
    const cedulaEmpleado = employee.cedula || 'Sin cédula';
    const tipoDocumento = employee.tipo_documento || 'CC';
    const cargoEmpleado = employee.cargo || 'Empleado';

    const nombreEmpresa = company.razon_social || 'Empresa';
    const nitEmpresa = company.nit || 'Sin NIT';
    const direccionEmpresa = company.direccion || 'Dirección no especificada';
    const telefonoEmpresa = company.telefono || '';
    const emailEmpresa = company.email || '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Nómina - ${nombreCompleto}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Arial", sans-serif;
      margin: 30px;
      color: #000;
      line-height: 1.3;
      background: white;
    }
    
    .voucher-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    
    h1 {
      text-align: center;
      margin-bottom: 20px;
      color: #000;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .header-info {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
      border: 1px solid #ccc;
      padding: 10px;
    }
    
    .info-section {
      font-size: 12px;
    }
    
    .info-section h3 {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    
    .info-section p {
      margin-bottom: 2px;
    }
    
    .section {
      margin-bottom: 15px;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      padding: 5px;
      background-color: #f5f5f5;
      border: 1px solid #ccc;
      text-align: center;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      border: 1px solid #ccc;
    }
    
    th, td {
      padding: 6px 8px;
      text-align: left;
      vertical-align: middle;
      border: 1px solid #ccc;
      font-size: 12px;
    }
    
    th {
      background-color: #f8f8f8;
      font-weight: bold;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .highlight {
      font-weight: bold;
      background-color: #e8f4f8;
    }
    
    .total-row {
      font-weight: bold;
      background-color: #d4edda;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
    }
    
    .signature-box {
      text-align: center;
      width: 45%;
      border-top: 1px solid #666;
      padding-top: 5px;
    }
    
    .signature-box p {
      font-size: 11px;
      margin: 2px 0;
    }
    
    .footer-info {
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="voucher-container">
    <h1>Comprobante de Nómina HISTÓRICO</h1>

    <!-- Header con información REAL -->
    <div class="header-info">
      <div class="info-section">
        <h3>Empresa</h3>
        <p><strong>${nombreEmpresa}</strong></p>
        <p>NIT: ${nitEmpresa}</p>
        <p>${direccionEmpresa}</p>
        ${telefonoEmpresa ? `<p>Tel: ${telefonoEmpresa}</p>` : ''}
      </div>
      
      <div class="info-section">
        <h3>Empleado</h3>
        <p><strong>${nombreCompleto}</strong></p>
        <p>${tipoDocumento}: ${cedulaEmpleado}</p>
        <p>Cargo: ${cargoEmpleado}</p>
      </div>
      
      <div class="info-section">
        <h3>Período de Pago</h3>
        <p><strong>${formatDate(period.fecha_inicio)} - ${formatDate(period.fecha_fin)}</strong></p>
        <p>Días trabajados: ${diasTrabajados}</p>
        <p>Salario Base: ${formatCurrency(salarioBase)}</p>
      </div>
    </div>

    <!-- Sección de Devengado HISTÓRICO -->
    <div class="section">
      <div class="section-title">DEVENGADO (Valores Históricos)</div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Salario Base</td>
            <td class="text-right">${formatCurrency(salarioBase)}</td>
          </tr>
          ${auxilioTransporte > 0 ? `
          <tr>
            <td>Auxilio de Transporte</td>
            <td class="text-right">${formatCurrency(auxilioTransporte)}</td>
          </tr>` : ''}
          ${horasExtra > 0 ? `
          <tr>
            <td>Horas Extras</td>
            <td class="text-right">${formatCurrency(horasExtra)}</td>
          </tr>` : ''}
          ${recargoNocturno > 0 ? `
          <tr>
            <td>Recargo Nocturno</td>
            <td class="text-right">${formatCurrency(recargoNocturno)}</td>
          </tr>` : ''}
          ${recargoDominical > 0 ? `
          <tr>
            <td>Recargo Dominical</td>
            <td class="text-right">${formatCurrency(recargoDominical)}</td>
          </tr>` : ''}
          ${bonificaciones > 0 ? `
          <tr>
            <td>Bonificaciones</td>
            <td class="text-right">${formatCurrency(bonificaciones)}</td>
          </tr>` : ''}
          ${vacaciones > 0 ? `
          <tr>
            <td>Vacaciones</td>
            <td class="text-right">${formatCurrency(vacaciones)}</td>
          </tr>` : ''}
          ${prima > 0 ? `
          <tr>
            <td>Prima</td>
            <td class="text-right">${formatCurrency(prima)}</td>
          </tr>` : ''}
          ${cesantias > 0 ? `
          <tr>
            <td>Cesantías</td>
            <td class="text-right">${formatCurrency(cesantias)}</td>
          </tr>` : ''}
          ${interesesCesantias > 0 ? `
          <tr>
            <td>Intereses Cesantías</td>
            <td class="text-right">${formatCurrency(interesesCesantias)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td><strong>Total Devengado Histórico</strong></td>
            <td class="text-right"><strong>${formatCurrency(totalDevengado)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sección de Deducciones HISTÓRICAS -->
    <div class="section">
      <div class="section-title">DEDUCCIONES (Valores Históricos)</div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${saludEmpleado > 0 ? `
          <tr>
            <td>Salud Empleado</td>
            <td class="text-right">${formatCurrency(saludEmpleado)}</td>
          </tr>` : ''}
          ${pensionEmpleado > 0 ? `
          <tr>
            <td>Pensión Empleado</td>
            <td class="text-right">${formatCurrency(pensionEmpleado)}</td>
          </tr>` : ''}
          ${retencionFuente > 0 ? `
          <tr>
            <td>Retención en la Fuente</td>
            <td class="text-right">${formatCurrency(retencionFuente)}</td>
          </tr>` : ''}
          ${otrasDeducciones > 0 ? `
          <tr>
            <td>Otras Deducciones</td>
            <td class="text-right">${formatCurrency(otrasDeducciones)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td><strong>Total Deducciones Históricas</strong></td>
            <td class="text-right"><strong>${formatCurrency(totalDeducciones)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Total Neto HISTÓRICO -->
    <div class="section">
      <table>
        <tr class="highlight" style="background-color: #d1ecf1;">
          <td style="font-size: 16px; font-weight: bold; padding: 10px;">TOTAL NETO A PAGAR (HISTÓRICO)</td>
          <td class="text-right" style="font-size: 16px; font-weight: bold; padding: 10px;">${formatCurrency(netoAPagar)}</td>
        </tr>
      </table>
    </div>

    <!-- Firmas -->
    <div class="signatures">
      <div class="signature-box">
        <p><strong>Firma del Empleado</strong></p>
        <p>${nombreCompleto}</p>
        <p>${tipoDocumento}: ${cedulaEmpleado}</p>
      </div>
      <div class="signature-box">
        <p><strong>Firma del Empleador</strong></p>
        <p>${nombreEmpresa}</p>
        <p>NIT: ${nitEmpresa}</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-info">
      <p>Documento generado con <strong>Finppi</strong> - Sistema de Nómina Profesional</p>
      <p>www.finppi.com | Generado el ${new Date().toLocaleString('es-CO')}</p>
      <p><strong>✓ COMPROBANTE HISTÓRICO</strong> - Refleja los valores exactos liquidados originalmente</p>
    </div>
  </div>
</body>
</html>`;
  }
}

// Convertidor HTML a PDF nativo
class HistoricalHTMLToPDFConverter {
  private objects: string[] = [];
  private objectPositions: number[] = [];
  private currentObjectId = 1;

  constructor() {
    this.objects = [''];
    this.objectPositions = [0];
  }

  private addObject(content: string): number {
    const id = this.currentObjectId++;
    this.objects.push(content);
    this.objectPositions.push(0);
    return id;
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/ñ/g, '\\361')
      .replace(/Ñ/g, '\\321')
      .replace(/á/g, '\\341')
      .replace(/é/g, '\\351')
      .replace(/í/g, '\\355')
      .replace(/ó/g, '\\363')
      .replace(/ú/g, '\\372')
      .replace(/Á/g, '\\301')
      .replace(/É/g, '\\311')
      .replace(/Í/g, '\\315')
      .replace(/Ó/g, '\\323')
      .replace(/Ú/g, '\\332');
  }

  convertHTMLToPDF(historicalData: any): Uint8Array {
    console.log('🎨 Generando PDF HISTÓRICO con datos almacenados para:', historicalData.employee.nombre);
    console.log('📊 Datos históricos:', { 
      total_devengado: historicalData.payroll.total_devengado,
      total_deducciones: historicalData.payroll.total_deducciones,
      neto_pagado: historicalData.payroll.neto_pagado
    });

    // Crear fuentes
    const fontRegularId = this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
/Encoding /WinAnsiEncoding
>>`);

    const fontBoldId = this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
/Encoding /WinAnsiEncoding
>>`);

    // Generar contenido PDF HISTÓRICO
    const contentStream = this.generateHistoricalContentStream(historicalData);

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

    return this.buildPDF(catalogId);
  }

  private generateHistoricalContentStream(historicalData: any): string {
    const { payroll, employee, period, company } = historicalData;
    const formatCurrency = (amount: number) => '$' + (amount || 0).toLocaleString('es-CO');
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    // Usar valores HISTÓRICOS (no recalcular)
    const salarioBase = Number(payroll.salario_base) || 0;
    const diasTrabajados = Number(payroll.dias_trabajados) || 30;
    const auxilioTransporte = Number(payroll.auxilio_transporte) || 0;
    const totalDevengado = Number(payroll.total_devengado) || 0;
    const totalDeducciones = Number(payroll.total_deducciones) || 0;
    const netoAPagar = Number(payroll.neto_pagado) || 0;
    const saludEmpleado = Number(payroll.salud_empleado) || 0;
    const pensionEmpleado = Number(payroll.pension_empleado) || 0;
    const horasExtra = Number(payroll.horas_extra) || 0;
    const bonificaciones = Number(payroll.bonificaciones) || 0;

    const fechaInicio = formatDate(period.fecha_inicio);
    const fechaFin = formatDate(period.fecha_fin);

    // Datos REALES
    const nombreCompleto = `${employee.nombre || ''} ${employee.apellido || ''}`.trim();
    const cedulaEmpleado = employee.cedula || 'Sin cédula';
    const tipoDocumento = employee.tipo_documento || 'CC';
    const cargoEmpleado = employee.cargo || 'Empleado';
    const nombreEmpresa = company.razon_social || 'Empresa';
    const nitEmpresa = company.nit || 'Sin NIT';
    const direccionEmpresa = company.direccion || 'Dirección no especificada';

    return `BT
/F2 16 Tf
0 0 0 rg
306 750 Td
(${this.escapeText('COMPROBANTE DE NOMINA HISTORICO')}) Tj
ET

BT
/F2 10 Tf
50 720 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 9 Tf
50 705 Td
(${this.escapeText(nombreEmpresa)}) Tj
ET

BT
/F1 8 Tf
50 692 Td
(${this.escapeText('NIT: ' + nitEmpresa)}) Tj
ET

BT
/F1 8 Tf
50 679 Td
(${this.escapeText(direccionEmpresa)}) Tj
ET

BT
/F2 10 Tf
230 720 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 9 Tf
230 705 Td
(${this.escapeText(nombreCompleto)}) Tj
ET

BT
/F1 8 Tf
230 692 Td
(${this.escapeText(tipoDocumento + ': ' + cedulaEmpleado)}) Tj
ET

BT
/F1 8 Tf
230 679 Td
(${this.escapeText('Cargo: ' + cargoEmpleado)}) Tj
ET

BT
/F2 10 Tf
410 720 Td
(${this.escapeText('PERIODO DE PAGO')}) Tj
ET

BT
/F1 9 Tf
410 705 Td
(${this.escapeText(fechaInicio + ' - ' + fechaFin)}) Tj
ET

BT
/F1 8 Tf
410 692 Td
(${this.escapeText('Dias trabajados: ' + diasTrabajados)}) Tj
ET

BT
/F1 8 Tf
410 679 Td
(${this.escapeText('Salario Base: ' + formatCurrency(salarioBase))}) Tj
ET

50 655 m
562 655 l
S

BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 630 180 15 re
f
0 0 0 rg
130 635 Td
(${this.escapeText('DEVENGADO HISTORICO')}) Tj
ET

BT
/F2 9 Tf
50 610 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 9 Tf
450 610 Td
(${this.escapeText('Valor')}) Tj
ET

50 605 m
562 605 l
S

BT
/F1 8 Tf
50 585 Td
(${this.escapeText('Salario Base')}) Tj
ET

BT
/F1 8 Tf
450 585 Td
(${this.escapeText(formatCurrency(salarioBase))}) Tj
ET

${auxilioTransporte > 0 ? `
BT
/F1 8 Tf
50 570 Td
(${this.escapeText('Auxilio de Transporte')}) Tj
ET

BT
/F1 8 Tf
450 570 Td
(${this.escapeText(formatCurrency(auxilioTransporte))}) Tj
ET
` : ''}

${horasExtra > 0 ? `
BT
/F1 8 Tf
50 555 Td
(${this.escapeText('Horas Extras')}) Tj
ET

BT
/F1 8 Tf
450 555 Td
(${this.escapeText(formatCurrency(horasExtra))}) Tj
ET
` : ''}

${bonificaciones > 0 ? `
BT
/F1 8 Tf
50 540 Td
(${this.escapeText('Bonificaciones')}) Tj
ET

BT
/F1 8 Tf
450 540 Td
(${this.escapeText(formatCurrency(bonificaciones))}) Tj
ET
` : ''}

50 525 m
562 525 l
S

BT
/F2 9 Tf
0 0.7 0 rg
50 505 Td
(${this.escapeText('Total Devengado Historico')}) Tj
ET

BT
/F2 9 Tf
0 0.7 0 rg
450 505 Td
(${this.escapeText(formatCurrency(totalDevengado))}) Tj
ET

0 0 0 rg

BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 475 180 15 re
f
0 0 0 rg
130 480 Td
(${this.escapeText('DEDUCCIONES HISTORICAS')}) Tj
ET

BT
/F2 8 Tf
50 455 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 8 Tf
450 455 Td
(${this.escapeText('Valor')}) Tj
ET

50 450 m
562 450 l
S

${saludEmpleado > 0 ? `
BT
/F1 8 Tf
50 435 Td
(${this.escapeText('Salud Empleado')}) Tj
ET

BT
/F1 8 Tf
450 435 Td
(${this.escapeText(formatCurrency(saludEmpleado))}) Tj
ET
` : ''}

${pensionEmpleado > 0 ? `
BT
/F1 8 Tf
50 420 Td
(${this.escapeText('Pension Empleado')}) Tj
ET

BT
/F1 8 Tf
450 420 Td
(${this.escapeText(formatCurrency(pensionEmpleado))}) Tj
ET
` : ''}

50 405 m
562 405 l
S

BT
/F2 9 Tf
1 0 0 rg
50 385 Td
(${this.escapeText('Total Deducciones Historicas')}) Tj
ET

BT
/F2 9 Tf
1 0 0 rg
450 385 Td
(${this.escapeText(formatCurrency(totalDeducciones))}) Tj
ET

0 0 0 rg

50 365 m
562 365 l
2 w
S
1 w

BT
/F2 14 Tf
0 0.5 0.8 rg
50 335 Td
(${this.escapeText('TOTAL NETO HISTORICO')}) Tj
ET

BT
/F2 14 Tf
0 0.5 0.8 rg
350 335 Td
(${this.escapeText(formatCurrency(netoAPagar))}) Tj
ET

0 0 0 rg

BT
/F1 8 Tf
50 250 Td
(${this.escapeText('_________________________')}) Tj
ET

BT
/F1 8 Tf
350 250 Td
(${this.escapeText('_________________________')}) Tj
ET

BT
/F2 8 Tf
50 235 Td
(${this.escapeText('Firma del Empleado')}) Tj
ET

BT
/F2 8 Tf
350 235 Td
(${this.escapeText('Firma del Empleador')}) Tj
ET

BT
/F1 7 Tf
50 220 Td
(${this.escapeText(nombreCompleto)}) Tj
ET

BT
/F1 7 Tf
350 220 Td
(${this.escapeText(nombreEmpresa)}) Tj
ET

BT
/F1 7 Tf
50 208 Td
(${this.escapeText(tipoDocumento + ': ' + cedulaEmpleado)}) Tj
ET

BT
/F1 7 Tf
350 208 Td
(${this.escapeText('NIT: ' + nitEmpresa)}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
50 180 Td
(${this.escapeText('Documento HISTORICO con valores almacenados - Finppi')}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
50 170 Td
(${this.escapeText('www.finppi.com | Generado el ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET`;
  }

  private buildPDF(catalogId: number): Uint8Array {
    console.log('🏗️ Construyendo PDF HISTÓRICO...');

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

    console.log('✅ PDF HISTÓRICO generado exitosamente');
    
    const encoder = new TextEncoder();
    return encoder.encode(pdf);
  }
}

serve(async (req) => {
  console.log('🎨 PDF Generator HISTÓRICO - Usando datos almacenados...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido para PDF HISTÓRICO');

    const { employee_id, period_id } = requestBody;

    if (!employee_id || !period_id) {
      console.error('❌ Faltan employee_id o period_id');
      return new Response(
        JSON.stringify({ error: 'Se requieren employee_id y period_id' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Crear cliente Supabase para consultar datos históricos
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Consultando datos históricos almacenados...');

    // Consultar datos HISTÓRICOS almacenados (no recalcular)
    const { data: historicalData, error } = await supabase
      .from('payrolls')
      .select(`
        *,
        employees!inner(nombre, apellido, cedula, tipo_documento, cargo),
        companies!inner(razon_social, nit, direccion, telefono, email),
        payroll_periods_real!inner(fecha_inicio, fecha_fin, periodo)
      `)
      .eq('employee_id', employee_id)
      .eq('period_id', period_id)
      .single();

    if (error || !historicalData) {
      console.error('❌ Error consultando datos históricos:', error);
      return new Response(
        JSON.stringify({ error: 'No se encontraron datos históricos para este empleado y período' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Datos históricos encontrados:', {
      empleado: historicalData.employees.nombre,
      periodo: historicalData.payroll_periods_real.periodo,
      total_devengado: historicalData.total_devengado,
      neto_pagado: historicalData.neto_pagado
    });

    // Estructurar datos para el generador
    const voucherData = {
      payroll: historicalData,
      employee: historicalData.employees,
      period: historicalData.payroll_periods_real,
      company: historicalData.companies
    };

    console.log('🎨 Generando PDF HISTÓRICO...');
    
    const converter = new HistoricalHTMLToPDFConverter();
    const pdfBytes = converter.convertHTMLToPDF(voucherData);
    
    console.log(`✅ PDF HISTÓRICO generado - Tamaño: ${pdfBytes.length} bytes`);
    
    if (pdfBytes.length < 2000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes - posible error`);
    }
    
    const fileName = `comprobante-historico-${historicalData.employees.nombre?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
    
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
    console.error('💥 ERROR en generador HISTÓRICO:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF HISTÓRICO: ${error.message}`,
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
