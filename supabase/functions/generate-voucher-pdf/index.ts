
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Servicio profesional tipo Aleluya mejorado
class AleluyaVoucherService {
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

    // Cálculos exactos tipo Aleluya
    const salarioBase = employee.baseSalary;
    const diasTrabajados = employee.workedDays || 30;
    
    // Para períodos quincenales, ajustar cálculos proporcionales
    const esPeriodoQuincenal = period.type === 'quincenal' || diasTrabajados <= 15;
    const factorProporcional = esPeriodoQuincenal ? (diasTrabajados / 15) : (diasTrabajados / 30);
    
    const salarioProporcional = Math.round(salarioBase * factorProporcional);
    
    // Deducciones calculadas exactas
    const saludEmpleado = Math.round(salarioBase * 0.04); // 4.0%
    const pensionEmpleado = Math.round(salarioBase * 0.04); // 4.0%
    const fondoSolidaridad = salarioBase > 4000000 ? Math.round(salarioBase * 0.01) : 0; // 1% si > 4 SMMLV
    
    // Horas extra - cálculo exacto
    const valorHoraOrdinaria = salarioBase / (esPeriodoQuincenal ? 120 : 240);
    const valorHoraExtra = valorHoraOrdinaria * 1.25; // 25% recargo ordinario
    const totalHorasExtra = Math.round(employee.extraHours * valorHoraExtra);

    const documento = employee.id?.slice(0, 8) || 'N/A';
    const tipoDocumento = 'CC';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Nómina - ${employee.name}</title>
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
    <h1>Comprobante de Nómina</h1>

    <!-- Header con información tipo Aleluya -->
    <div class="header-info">
      <div class="info-section">
        <h3>Empresa</h3>
        <p><strong>${company.razon_social || 'Mi Empresa S.A.S.'}</strong></p>
        <p>NIT: ${company.nit || '900123456-1'}</p>
        <p>${company.direccion || 'Dirección empresa'}</p>
      </div>
      
      <div class="info-section">
        <h3>Empleado</h3>
        <p><strong>${employee.name}</strong></p>
        <p>${tipoDocumento}: ${documento}</p>
        <p>Cargo: ${employee.position || 'Empleado'}</p>
      </div>
      
      <div class="info-section">
        <h3>Período de Pago</h3>
        <p><strong>${formatDate(period.startDate)} - ${formatDate(period.endDate)}</strong></p>
        <p>Días trabajados: ${diasTrabajados}</p>
        <p>Salario Base: ${formatCurrency(salarioBase)}</p>
      </div>
    </div>

    <!-- Sección de Devengado -->
    <div class="section">
      <div class="section-title">DEVENGADO</div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Salario</td>
            <td class="text-right">${formatCurrency(salarioProporcional)}</td>
          </tr>
          ${employee.transportAllowance > 0 ? `
          <tr>
            <td>Auxilio de Transporte</td>
            <td class="text-right">${formatCurrency(employee.transportAllowance)}</td>
          </tr>` : ''}
          ${employee.bonuses > 0 ? `
          <tr>
            <td>Bonificaciones</td>
            <td class="text-right">${formatCurrency(employee.bonuses)}</td>
          </tr>` : ''}
          ${totalHorasExtra > 0 ? `
          <tr>
            <td>Horas Extras y Recargos</td>
            <td class="text-right">${formatCurrency(totalHorasExtra)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td><strong>Total Devengado</strong></td>
            <td class="text-right"><strong>${formatCurrency(employee.grossPay || (salarioProporcional + (employee.transportAllowance || 0) + (employee.bonuses || 0) + totalHorasExtra))}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    ${totalHorasExtra > 0 ? `
    <!-- Sección de Horas Extras tipo Aleluya -->
    <div class="section">
      <div class="section-title">HORAS EXTRAS, ORDINARIAS Y RECARGOS</div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-center">Cantidad</th>
            <th class="text-right">Valor Hora</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hora Extra Ordinaria</td>
            <td class="text-center">${employee.extraHours}</td>
            <td class="text-right">${formatCurrency(valorHoraExtra)}</td>
            <td class="text-right">${formatCurrency(totalHorasExtra)}</td>
          </tr>
          <tr class="highlight">
            <td colspan="3"><strong>Total Horas Extras</strong></td>
            <td class="text-right"><strong>${formatCurrency(totalHorasExtra)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>` : ''}

    <!-- Sección de Deducciones tipo Aleluya -->
    <div class="section">
      <div class="section-title">DEDUCCIONES</div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-center">%</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Salud</td>
            <td class="text-center">4.0%</td>
            <td class="text-right">${formatCurrency(saludEmpleado)}</td>
          </tr>
          <tr>
            <td>Pensión</td>
            <td class="text-center">4.0%</td>
            <td class="text-right">${formatCurrency(pensionEmpleado)}</td>
          </tr>
          ${fondoSolidaridad > 0 ? `
          <tr>
            <td>Fondo de Solidaridad</td>
            <td class="text-center">1.0%</td>
            <td class="text-right">${formatCurrency(fondoSolidaridad)}</td>
          </tr>` : ''}
          ${(employee.deductions - saludEmpleado - pensionEmpleado - fondoSolidaridad) > 0 ? `
          <tr>
            <td>Otras Deducciones</td>
            <td class="text-center">-</td>
            <td class="text-right">${formatCurrency(employee.deductions - saludEmpleado - pensionEmpleado - fondoSolidaridad)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td colspan="2"><strong>Total Deducciones</strong></td>
            <td class="text-right"><strong>${formatCurrency(employee.deductions)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Total Neto a Pagar -->
    <div class="section">
      <table>
        <tr class="highlight" style="background-color: #d1ecf1;">
          <td style="font-size: 16px; font-weight: bold; padding: 10px;">TOTAL NETO A PAGAR</td>
          <td class="text-right" style="font-size: 16px; font-weight: bold; padding: 10px;">${formatCurrency(employee.netPay)}</td>
        </tr>
      </table>
    </div>

    <!-- Firmas tipo Aleluya -->
    <div class="signatures">
      <div class="signature-box">
        <p><strong>Firma del Empleado</strong></p>
        <p>${employee.name}</p>
        <p>${tipoDocumento}: ${documento}</p>
      </div>
      <div class="signature-box">
        <p><strong>Firma del Empleador</strong></p>
        <p>${company.razon_social || 'Mi Empresa S.A.S.'}</p>
        <p>NIT: ${company.nit || '900123456-1'}</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-info">
      <p>Documento generado con <strong>Finppi</strong> - Sistema de Nómina Profesional</p>
      <p>www.finppi.com | Generado el ${new Date().toLocaleString('es-CO')}</p>
    </div>
  </div>
</body>
</html>`;
  }
}

// Convertidor HTML a PDF nativo mejorado tipo Aleluya
class AleluyaHTMLToPDFConverter {
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
      .replace(/\n/g, '\\n');
  }

  convertHTMLToPDF(employee: any, period: any): Uint8Array {
    console.log('🎨 Generando PDF tipo Aleluya para:', employee.name);

    const voucherData = {
      employee: {
        ...employee,
        documento: employee.id?.slice(0, 8) || 'N/A',
        tipo_documento: 'CC'
      },
      period,
      company: {
        razon_social: 'Mi Empresa S.A.S.',
        nit: '900123456-1',
        direccion: 'Calle 123 # 45-67, Bogotá'
      }
    };

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

    // Generar contenido PDF tipo Aleluya
    const contentStream = this.generateAleluyaContentStream(employee, period, voucherData);

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

    return this.buildAleluyaPDF(catalogId);
  }

  private generateAleluyaContentStream(employee: any, period: any, data: any): string {
    const formatCurrency = (amount: number) => '$' + amount.toLocaleString('es-CO');
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    // Cálculos tipo Aleluya
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const esPeriodoQuincenal = period.type === 'quincenal' || diasTrabajados <= 15;
    const factorProporcional = esPeriodoQuincenal ? (diasTrabajados / 15) : (diasTrabajados / 30);
    const salarioProporcional = Math.round(salarioBase * factorProporcional);
    
    const saludEmpleado = Math.round(salarioBase * 0.04);
    const pensionEmpleado = Math.round(salarioBase * 0.04);
    const fondoSolidaridad = salarioBase > 4000000 ? Math.round(salarioBase * 0.01) : 0;
    
    const valorHoraOrdinaria = salarioBase / (esPeriodoQuincenal ? 120 : 240);
    const valorHoraExtra = valorHoraOrdinaria * 1.25;
    const totalHorasExtra = Math.round((employee.extraHours || 0) * valorHoraExtra);
    
    const totalDevengado = salarioProporcional + (employee.transportAllowance || 0) + (employee.bonuses || 0) + totalHorasExtra;
    const salarioNeto = Number(employee.netPay) || (totalDevengado - (employee.deductions || 0));

    const fechaInicio = formatDate(period.startDate);
    const fechaFin = formatDate(period.endDate);

    return `BT
/F2 16 Tf
0 0 0 rg
306 750 Td
(${this.escapeText('COMPROBANTE DE NOMINA')}) Tj
ET

BT
/F2 10 Tf
50 720 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 9 Tf
50 705 Td
(${this.escapeText('Mi Empresa S.A.S.')}) Tj
ET

BT
/F1 8 Tf
50 692 Td
(${this.escapeText('NIT: 900123456-1')}) Tj
ET

BT
/F1 8 Tf
50 679 Td
(${this.escapeText('Calle 123 # 45-67, Bogota')}) Tj
ET

BT
/F2 10 Tf
230 720 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 9 Tf
230 705 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 8 Tf
230 692 Td
(${this.escapeText('CC: ' + (employee.id?.slice(0, 8) || 'N/A'))}) Tj
ET

BT
/F1 8 Tf
230 679 Td
(${this.escapeText('Cargo: ' + (employee.position || 'Empleado'))}) Tj
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

50 665 m
562 665 l
S

BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 640 160 15 re
f
0 0 0 rg
115 645 Td
(${this.escapeText('DEVENGADO')}) Tj
ET

BT
/F2 9 Tf
50 620 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 9 Tf
450 620 Td
(${this.escapeText('Valor')}) Tj
ET

50 615 m
562 615 l
S

BT
/F1 8 Tf
50 595 Td
(${this.escapeText('Salario')}) Tj
ET

BT
/F1 8 Tf
450 595 Td
(${this.escapeText(formatCurrency(salarioProporcional))}) Tj
ET

${employee.transportAllowance > 0 ? `
BT
/F1 8 Tf
50 580 Td
(${this.escapeText('Auxilio de Transporte')}) Tj
ET

BT
/F1 8 Tf
450 580 Td
(${this.escapeText(formatCurrency(employee.transportAllowance))}) Tj
ET
` : ''}

${employee.bonuses > 0 ? `
BT
/F1 8 Tf
50 565 Td
(${this.escapeText('Bonificaciones')}) Tj
ET

BT
/F1 8 Tf
450 565 Td
(${this.escapeText(formatCurrency(employee.bonuses))}) Tj
ET
` : ''}

${totalHorasExtra > 0 ? `
BT
/F1 8 Tf
50 550 Td
(${this.escapeText('Horas Extras y Recargos')}) Tj
ET

BT
/F1 8 Tf
450 550 Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET
` : ''}

50 535 m
562 535 l
S

BT
/F2 9 Tf
0 0.7 0 rg
50 515 Td
(${this.escapeText('Total Devengado')}) Tj
ET

BT
/F2 9 Tf
0 0.7 0 rg
450 515 Td
(${this.escapeText(formatCurrency(totalDevengado))}) Tj
ET

0 0 0 rg

${totalHorasExtra > 0 ? `
BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 485 200 15 re
f
0 0 0 rg
120 490 Td
(${this.escapeText('HORAS EXTRAS, ORDINARIAS Y RECARGOS')}) Tj
ET

BT
/F2 8 Tf
50 465 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 8 Tf
200 465 Td
(${this.escapeText('Cantidad')}) Tj
ET

BT
/F2 8 Tf
300 465 Td
(${this.escapeText('Valor Hora')}) Tj
ET

BT
/F2 8 Tf
450 465 Td
(${this.escapeText('Total')}) Tj
ET

50 460 m
562 460 l
S

BT
/F1 8 Tf
50 445 Td
(${this.escapeText('Hora Extra Ordinaria')}) Tj
ET

BT
/F1 8 Tf
200 445 Td
(${this.escapeText(String(employee.extraHours || 0))}) Tj
ET

BT
/F1 8 Tf
300 445 Td
(${this.escapeText(formatCurrency(valorHoraExtra))}) Tj
ET

BT
/F1 8 Tf
450 445 Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET

50 430 m
562 430 l
S
` : ''}

BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 405 160 15 re
f
0 0 0 rg
115 410 Td
(${this.escapeText('DEDUCCIONES')}) Tj
ET

BT
/F2 8 Tf
50 385 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 8 Tf
200 385 Td
(${this.escapeText('%')}) Tj
ET

BT
/F2 8 Tf
450 385 Td
(${this.escapeText('Valor')}) Tj
ET

50 380 m
562 380 l
S

BT
/F1 8 Tf
50 365 Td
(${this.escapeText('Salud')}) Tj
ET

BT
/F1 8 Tf
200 365 Td
(${this.escapeText('4.0%')}) Tj
ET

BT
/F1 8 Tf
450 365 Td
(${this.escapeText(formatCurrency(saludEmpleado))}) Tj
ET

BT
/F1 8 Tf
50 350 Td
(${this.escapeText('Pension')}) Tj
ET

BT
/F1 8 Tf
200 350 Td
(${this.escapeText('4.0%')}) Tj
ET

BT
/F1 8 Tf
450 350 Td
(${this.escapeText(formatCurrency(pensionEmpleado))}) Tj
ET

${fondoSolidaridad > 0 ? `
BT
/F1 8 Tf
50 335 Td
(${this.escapeText('Fondo de Solidaridad')}) Tj
ET

BT
/F1 8 Tf
200 335 Td
(${this.escapeText('1.0%')}) Tj
ET

BT
/F1 8 Tf
450 335 Td
(${this.escapeText(formatCurrency(fondoSolidaridad))}) Tj
ET
` : ''}

50 320 m
562 320 l
S

BT
/F2 9 Tf
1 0 0 rg
50 300 Td
(${this.escapeText('Total Deducciones')}) Tj
ET

BT
/F2 9 Tf
1 0 0 rg
450 300 Td
(${this.escapeText(formatCurrency(employee.deductions || 0))}) Tj
ET

0 0 0 rg

50 280 m
562 280 l
2 w
S
1 w

BT
/F2 14 Tf
0 0.5 0.8 rg
50 250 Td
(${this.escapeText('TOTAL NETO A PAGAR')}) Tj
ET

BT
/F2 14 Tf
0 0.5 0.8 rg
350 250 Td
(${this.escapeText(formatCurrency(salarioNeto))}) Tj
ET

0 0 0 rg

BT
/F1 8 Tf
50 150 Td
(${this.escapeText('_________________________')}) Tj
ET

BT
/F1 8 Tf
350 150 Td
(${this.escapeText('_________________________')}) Tj
ET

BT
/F2 8 Tf
50 135 Td
(${this.escapeText('Firma del Empleado')}) Tj
ET

BT
/F2 8 Tf
350 135 Td
(${this.escapeText('Firma del Empleador')}) Tj
ET

BT
/F1 7 Tf
50 120 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 7 Tf
350 120 Td
(${this.escapeText('Mi Empresa S.A.S.')}) Tj
ET

BT
/F1 7 Tf
50 108 Td
(${this.escapeText('CC: ' + (employee.id?.slice(0, 8) || 'N/A'))}) Tj
ET

BT
/F1 7 Tf
350 108 Td
(${this.escapeText('NIT: 900123456-1')}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
50 80 Td
(${this.escapeText('Documento generado con Finppi - Sistema de Nomina Profesional')}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
50 70 Td
(${this.escapeText('www.finppi.com | Generado el ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET`;
  }

  private buildAleluyaPDF(catalogId: number): Uint8Array {
    console.log('🏗️ Construyendo PDF tipo Aleluya con estructura profesional...');

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

    console.log('✅ PDF tipo Aleluya generado exitosamente');
    console.log(`📊 Objetos creados: ${this.objects.length - 1}`);
    
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(pdf);
    
    console.log(`📋 Tamaño final del PDF: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  }
}

serve(async (req) => {
  console.log('🎨 PDF Generator Tipo Aleluya - Iniciando...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido para PDF tipo Aleluya');

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

    console.log('🎨 Generando PDF tipo Aleluya con desglose completo...');
    
    const converter = new AleluyaHTMLToPDFConverter();
    const pdfBytes = converter.convertHTMLToPDF(employee, period);
    
    console.log(`✅ PDF tipo Aleluya generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validaciones mejoradas
    if (pdfBytes.length < 2000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes - posible error`);
    }
    
    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 15));
    if (!pdfString.startsWith('%PDF-')) {
      throw new Error(`Header PDF inválido: ${pdfString}`);
    }
    
    console.log('✅ PDF tipo Aleluya validado correctamente');
    console.log(`🔍 Header verificado: ${pdfString.slice(0, 8)}`);
    console.log('🎨 Detalles incluidos: diseño tipo Aleluya, devengados, deducciones exactas, horas extra');
    
    const fileName = `comprobante-aleluya-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
    
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
    console.error('💥 ERROR en generador tipo Aleluya:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF tipo Aleluya: ${error.message}`,
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
