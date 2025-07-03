
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Servicio profesional tipo Aleluya CORREGIDO con datos reales y cálculos exactos
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

    // CÁLCULOS EXACTOS TIPO ALELUYA CORREGIDOS
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    
    // Determinar período correcto
    const esPeriodoQuincenal = diasTrabajados <= 15;
    const diasDelPeriodo = esPeriodoQuincenal ? 15 : 30;
    
    // Factor proporcional CORRECTO
    const factorProporcional = diasTrabajados / diasDelPeriodo;
    
    // Salario proporcional EXACTO
    const salarioProporcional = Math.round(salarioBase * factorProporcional);
    
    // Auxilio de transporte CORRECTO (subsidio de transporte legal 2024)
    const auxilioTransporteLegal = 162000; // Valor legal 2024
    const auxilioTransporte = Math.round(auxilioTransporteLegal * factorProporcional);
    
    // Horas extra CORRECTAS
    const horasDelPeriodo = esPeriodoQuincenal ? 120 : 240;
    const valorHoraOrdinaria = salarioBase / horasDelPeriodo;
    const valorHoraExtra = valorHoraOrdinaria * 1.25; // 25% recargo
    const totalHorasExtra = Math.round((employee.extraHours || 0) * valorHoraExtra);
    
    // Bonificaciones
    const bonificaciones = Number(employee.bonuses) || 0;
    
    // TOTAL DEVENGADO EXACTO
    const totalDevengado = salarioProporcional + auxilioTransporte + totalHorasExtra + bonificaciones;
    
    // DEDUCCIONES PROPORCIONALES EXACTAS
    const saludEmpleado = Math.round(salarioBase * 0.04 * factorProporcional); // 4% proporcional
    const pensionEmpleado = Math.round(salarioBase * 0.04 * factorProporcional); // 4% proporcional
    const fondoSolidaridad = salarioBase > 4000000 ? Math.round(salarioBase * 0.01 * factorProporcional) : 0;
    
    // Otras deducciones
    const totalDeduccionesCalculadas = saludEmpleado + pensionEmpleado + fondoSolidaridad;
    const otrasDeduccionesReales = Math.max(0, (employee.deductions || 0) - totalDeduccionesCalculadas);
    const totalDeducciones = totalDeduccionesCalculadas + otrasDeduccionesReales;
    
    // NETO A PAGAR EXACTO
    const netoAPagar = totalDevengado - totalDeducciones;

    // Usar datos REALES de empresa y empleado
    const nombreEmpresa = company.razon_social || 'Empresa';
    const nitEmpresa = company.nit || 'Sin NIT';
    const direccionEmpresa = company.direccion || 'Dirección no especificada';
    const telefonoEmpresa = company.telefono || '';
    const emailEmpresa = company.email || '';
    
    const nombreEmpleado = employee.name || 'Empleado';
    const cedulaEmpleado = employee.cedula || employee.id?.toString() || 'Sin cédula';
    const tipoDocumento = employee.tipo_documento || 'CC';
    const cargoEmpleado = employee.position || 'Empleado';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Nómina - ${nombreEmpleado}</title>
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
        <p><strong>${nombreEmpleado}</strong></p>
        <p>${tipoDocumento}: ${cedulaEmpleado}</p>
        <p>Cargo: ${cargoEmpleado}</p>
      </div>
      
      <div class="info-section">
        <h3>Período de Pago</h3>
        <p><strong>${formatDate(period.startDate)} - ${formatDate(period.endDate)}</strong></p>
        <p>Días trabajados: ${diasTrabajados}</p>
        <p>Días pagados: ${diasTrabajados}</p>
        <p>Salario Base: ${formatCurrency(salarioBase)}</p>
      </div>
    </div>

    <!-- Sección de Devengado EXACTA -->
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
          <tr>
            <td>Auxilio de Transporte</td>
            <td class="text-right">${formatCurrency(auxilioTransporte)}</td>
          </tr>
          ${bonificaciones > 0 ? `
          <tr>
            <td>Bonificaciones</td>
            <td class="text-right">${formatCurrency(bonificaciones)}</td>
          </tr>` : ''}
          ${totalHorasExtra > 0 ? `
          <tr>
            <td>Horas Extras y Recargos</td>
            <td class="text-right">${formatCurrency(totalHorasExtra)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td><strong>Total Devengado</strong></td>
            <td class="text-right"><strong>${formatCurrency(totalDevengado)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    ${totalHorasExtra > 0 ? `
    <!-- Sección de Horas Extras EXACTA -->
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
            <td class="text-center">${employee.extraHours || 0}</td>
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

    <!-- Sección de Deducciones EXACTA -->
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
          ${otrasDeduccionesReales > 0 ? `
          <tr>
            <td>Otras Deducciones</td>
            <td class="text-center">-</td>
            <td class="text-right">${formatCurrency(otrasDeduccionesReales)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td colspan="2"><strong>Total Deducciones</strong></td>
            <td class="text-right"><strong>${formatCurrency(totalDeducciones)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Total Neto a Pagar EXACTO -->
    <div class="section">
      <table>
        <tr class="highlight" style="background-color: #d1ecf1;">
          <td style="font-size: 16px; font-weight: bold; padding: 10px;">TOTAL NETO A PAGAR</td>
          <td class="text-right" style="font-size: 16px; font-weight: bold; padding: 10px;">${formatCurrency(netoAPagar)}</td>
        </tr>
      </table>
    </div>

    <!-- Firmas con datos REALES -->
    <div class="signatures">
      <div class="signature-box">
        <p><strong>Firma del Empleado</strong></p>
        <p>${nombreEmpleado}</p>
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
    </div>
  </div>
</body>
</html>`;
  }
}

// Convertidor HTML a PDF nativo mejorado
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

  convertHTMLToPDF(employee: any, period: any, company: any): Uint8Array {
    console.log('🎨 Generando PDF CORREGIDO con datos reales para:', employee.name);
    console.log('📊 Datos empresa:', { 
      nombre: company.razon_social,
      nit: company.nit,
      direccion: company.direccion
    });
    console.log('📊 Datos empleado:', { 
      nombre: employee.name,
      cedula: employee.cedula,
      salario: employee.baseSalary,
      diasTrabajados: employee.workedDays
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

    // Generar contenido PDF CORREGIDO
    const contentStream = this.generateCorrectedContentStream(employee, period, company);

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

  private generateCorrectedContentStream(employee: any, period: any, company: any): string {
    const formatCurrency = (amount: number) => '$' + amount.toLocaleString('es-CO');
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    // CÁLCULOS EXACTOS CORREGIDOS
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const esPeriodoQuincenal = diasTrabajados <= 15;
    const diasDelPeriodo = esPeriodoQuincenal ? 15 : 30;
    const factorProporcional = diasTrabajados / diasDelPeriodo;
    const salarioProporcional = Math.round(salarioBase * factorProporcional);
    
    // Auxilio de transporte CORRECTO
    const auxilioTransporteLegal = 162000;
    const auxilioTransporte = Math.round(auxilioTransporteLegal * factorProporcional);
    
    // Deducciones PROPORCIONALES
    const saludEmpleado = Math.round(salarioBase * 0.04 * factorProporcional);
    const pensionEmpleado = Math.round(salarioBase * 0.04 * factorProporcional);
    const fondoSolidaridad = salarioBase > 4000000 ? Math.round(salarioBase * 0.01 * factorProporcional) : 0;
    
    const horasDelPeriodo = esPeriodoQuincenal ? 120 : 240;
    const valorHoraOrdinaria = salarioBase / horasDelPeriodo;
    const valorHoraExtra = valorHoraOrdinaria * 1.25;
    const totalHorasExtra = Math.round((employee.extraHours || 0) * valorHoraExtra);
    
    const bonificaciones = Number(employee.bonuses) || 0;
    const totalDevengado = salarioProporcional + auxilioTransporte + bonificaciones + totalHorasExtra;
    const totalDeduccionesCalculadas = saludEmpleado + pensionEmpleado + fondoSolidaridad;
    const otrasDeduccionesReales = Math.max(0, (employee.deductions || 0) - totalDeduccionesCalculadas);
    const totalDeducciones = totalDeduccionesCalculadas + otrasDeduccionesReales;
    const salarioNeto = totalDevengado - totalDeducciones;

    const fechaInicio = formatDate(period.startDate);
    const fechaFin = formatDate(period.endDate);

    // Usar datos REALES
    const nombreEmpresa = company.razon_social || 'Empresa';
    const nitEmpresa = company.nit || 'Sin NIT';
    const direccionEmpresa = company.direccion || 'Dirección no especificada';
    const nombreEmpleado = employee.name || 'Empleado';
    const cedulaEmpleado = employee.cedula || employee.id?.toString() || 'Sin cédula';
    const tipoDocumento = employee.tipo_documento || 'CC';
    const cargoEmpleado = employee.position || 'Empleado';

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
(${this.escapeText(nombreEmpleado)}) Tj
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
(${this.escapeText('Dias pagados: ' + diasTrabajados)}) Tj
ET

BT
/F1 8 Tf
410 666 Td
(${this.escapeText('Salario Base: ' + formatCurrency(salarioBase))}) Tj
ET

50 655 m
562 655 l
S

BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 630 160 15 re
f
0 0 0 rg
115 635 Td
(${this.escapeText('DEVENGADO')}) Tj
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
(${this.escapeText('Salario')}) Tj
ET

BT
/F1 8 Tf
450 585 Td
(${this.escapeText(formatCurrency(salarioProporcional))}) Tj
ET

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

${bonificaciones > 0 ? `
BT
/F1 8 Tf
50 555 Td
(${this.escapeText('Bonificaciones')}) Tj
ET

BT
/F1 8 Tf
450 555 Td
(${this.escapeText(formatCurrency(bonificaciones))}) Tj
ET
` : ''}

${totalHorasExtra > 0 ? `
BT
/F1 8 Tf
50 540 Td
(${this.escapeText('Horas Extras y Recargos')}) Tj
ET

BT
/F1 8 Tf
450 540 Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET
` : ''}

50 525 m
562 525 l
S

BT
/F2 9 Tf
0 0.7 0 rg
50 505 Td
(${this.escapeText('Total Devengado')}) Tj
ET

BT
/F2 9 Tf
0 0.7 0 rg
450 505 Td
(${this.escapeText(formatCurrency(totalDevengado))}) Tj
ET

0 0 0 rg

${totalHorasExtra > 0 ? `
BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 475 200 15 re
f
0 0 0 rg
120 480 Td
(${this.escapeText('HORAS EXTRAS, ORDINARIAS Y RECARGOS')}) Tj
ET

BT
/F2 8 Tf
50 455 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 8 Tf
200 455 Td
(${this.escapeText('Cantidad')}) Tj
ET

BT
/F2 8 Tf
300 455 Td
(${this.escapeText('Valor Hora')}) Tj
ET

BT
/F2 8 Tf
450 455 Td
(${this.escapeText('Total')}) Tj
ET

50 450 m
562 450 l
S

BT
/F1 8 Tf
50 435 Td
(${this.escapeText('Hora Extra Ordinaria')}) Tj
ET

BT
/F1 8 Tf
200 435 Td
(${this.escapeText(String(employee.extraHours || 0))}) Tj
ET

BT
/F1 8 Tf
300 435 Td
(${this.escapeText(formatCurrency(valorHoraExtra))}) Tj
ET

BT
/F1 8 Tf
450 435 Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET

50 420 m
562 420 l
S
` : ''}

BT
/F2 12 Tf
0.9 0.9 0.9 rg
50 395 160 15 re
f
0 0 0 rg
115 400 Td
(${this.escapeText('DEDUCCIONES')}) Tj
ET

BT
/F2 8 Tf
50 375 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 8 Tf
200 375 Td
(${this.escapeText('%')}) Tj
ET

BT
/F2 8 Tf
450 375 Td
(${this.escapeText('Valor')}) Tj
ET

50 370 m
562 370 l
S

BT
/F1 8 Tf
50 355 Td
(${this.escapeText('Salud')}) Tj
ET

BT
/F1 8 Tf
200 355 Td
(${this.escapeText('4.0%')}) Tj
ET

BT
/F1 8 Tf
450 355 Td
(${this.escapeText(formatCurrency(saludEmpleado))}) Tj
ET

BT
/F1 8 Tf
50 340 Td
(${this.escapeText('Pension')}) Tj
ET

BT
/F1 8 Tf
200 340 Td
(${this.escapeText('4.0%')}) Tj
ET

BT
/F1 8 Tf
450 340 Td
(${this.escapeText(formatCurrency(pensionEmpleado))}) Tj
ET

${fondoSolidaridad > 0 ? `
BT
/F1 8 Tf
50 325 Td
(${this.escapeText('Fondo de Solidaridad')}) Tj
ET

BT
/F1 8 Tf
200 325 Td
(${this.escapeText('1.0%')}) Tj
ET

BT
/F1 8 Tf
450 325 Td
(${this.escapeText(formatCurrency(fondoSolidaridad))}) Tj
ET
` : ''}

${otrasDeduccionesReales > 0 ? `
BT
/F1 8 Tf
50 310 Td
(${this.escapeText('Otras Deducciones')}) Tj
ET

BT
/F1 8 Tf
200 310 Td
(${this.escapeText('-')}) Tj
ET

BT
/F1 8 Tf
450 310 Td
(${this.escapeText(formatCurrency(otrasDeduccionesReales))}) Tj
ET
` : ''}

50 295 m
562 295 l
S

BT
/F2 9 Tf
1 0 0 rg
50 275 Td
(${this.escapeText('Total Deducciones')}) Tj
ET

BT
/F2 9 Tf
1 0 0 rg
450 275 Td
(${this.escapeText(formatCurrency(totalDeducciones))}) Tj
ET

0 0 0 rg

50 255 m
562 255 l
2 w
S
1 w

BT
/F2 14 Tf
0 0.5 0.8 rg
50 225 Td
(${this.escapeText('TOTAL NETO A PAGAR')}) Tj
ET

BT
/F2 14 Tf
0 0.5 0.8 rg
350 225 Td
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
(${this.escapeText(nombreEmpleado)}) Tj
ET

BT
/F1 7 Tf
350 120 Td
(${this.escapeText(nombreEmpresa)}) Tj
ET

BT
/F1 7 Tf
50 108 Td
(${this.escapeText(tipoDocumento + ': ' + cedulaEmpleado)}) Tj
ET

BT
/F1 7 Tf
350 108 Td
(${this.escapeText('NIT: ' + nitEmpresa)}) Tj
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

  private buildPDF(catalogId: number): Uint8Array {
    console.log('🏗️ Construyendo PDF CORREGIDO con datos reales...');

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

    console.log('✅ PDF CORREGIDO generado exitosamente');
    console.log(`📊 Objetos creados: ${this.objects.length - 1}`);
    
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(pdf);
    
    console.log(`📋 Tamaño final del PDF: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  }
}

serve(async (req) => {
  console.log('🎨 PDF Generator CORREGIDO - Iniciando con datos reales...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido para PDF CORREGIDO');
    console.log('📊 Datos recibidos:', JSON.stringify(requestBody, null, 2));

    const { employee, period, company } = requestBody;

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

    // Validar que tengamos datos reales de empresa
    const companyData = company || {
      razon_social: 'Empresa Sin Nombre',
      nit: 'Sin NIT',
      direccion: 'Dirección no especificada'
    };

    console.log('🎨 Generando PDF CORREGIDO con datos reales...');
    console.log('🏢 Empresa:', companyData.razon_social);
    console.log('🆔 NIT:', companyData.nit);
    console.log('👤 Empleado:', employee.name);
    console.log('🆔 Cédula:', employee.cedula);
    console.log('📅 Período:', period.startDate, '-', period.endDate);
    console.log('💰 Salario base:', employee.baseSalary);
    console.log('📊 Días trabajados:', employee.workedDays);
    
    const converter = new AleluyaHTMLToPDFConverter();
    const pdfBytes = converter.convertHTMLToPDF(employee, period, companyData);
    
    console.log(`✅ PDF CORREGIDO generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validaciones mejoradas
    if (pdfBytes.length < 2000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes - posible error`);
    }
    
    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 15));
    if (!pdfString.startsWith('%PDF-')) {
      throw new Error(`Header PDF inválido: ${pdfString}`);
    }
    
    console.log('✅ PDF CORREGIDO validado correctamente');
    console.log(`🔍 Header verificado: ${pdfString.slice(0, 8)}`);
    console.log('🎨 Correcciones aplicadas: datos reales, cálculos exactos, auxilio de transporte, deducciones proporcionales');
    
    const fileName = `comprobante-corregido-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
    
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
    console.error('💥 ERROR en generador CORREGIDO:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF CORREGIDO: ${error.message}`,
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
