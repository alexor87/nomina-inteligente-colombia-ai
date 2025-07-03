
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 INICIANDO GENERACIÓN PDF PROFESIONAL');
    
    const requestBody = await req.json();
    console.log('📋 Datos recibidos:', JSON.stringify(requestBody, null, 2));

    const { employee, period } = requestBody;

    // Validación básica
    if (!employee || !period) {
      console.error('❌ Faltan datos del empleado o período');
      return new Response(
        JSON.stringify({ error: 'Faltan datos del empleado o período' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generar PDF profesional
    const pdfBuffer = await generateProfessionalPDF(employee, period);

    console.log('✅ PDF PROFESIONAL GENERADO - TAMAÑO:', pdfBuffer.byteLength, 'bytes');

    // CRÍTICO: Respuesta binaria correcta para PDFs
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Content-Disposition': `attachment; filename="comprobante-${employee.name.replace(/\s+/g, '-')}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateProfessionalPDF(employee: any, period: any): Promise<ArrayBuffer> {
  console.log('📄 Generando PDF profesional con Puppeteer...');
  
  try {
    // Crear HTML profesional para el comprobante
    const htmlContent = generateProfessionalHTML(employee, period);
    
    // Usar Puppeteer para generar PDF desde HTML
    const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts');
    
    console.log('🔄 Iniciando navegador...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar página para PDF
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    console.log('📊 Generando PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    console.log('✅ PDF generado exitosamente');
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error generando PDF profesional:', error);
    
    // FALLBACK: Usar método simple si Puppeteer falla
    console.log('🔄 Usando fallback simple...');
    return await generateSimplePDFFallback(employee, period);
  }
}

function generateProfessionalHTML(employee: any, period: any): string {
  // Datos seguros
  const nombre = String(employee.name || 'Empleado');
  const salarioNeto = Number(employee.netPay) || 0;
  const salarioBase = Number(employee.baseSalary) || 0;
  const diasTrabajados = Number(employee.workedDays) || 30;
  const deducciones = Number(employee.deductions) || 0;
  const bonificaciones = Number(employee.bonuses) || 0;
  const auxilioTransporte = Number(employee.transportAllowance) || 0;
  
  // Formatear números
  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };
  
  // Formatear fechas
  const formatDate = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return fecha;
    }
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Nómina</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        
        .company-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            background: #f8fafc;
        }
        
        .info-card h3 {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .info-card p {
            font-size: 14px;
            color: #111827;
            font-weight: 500;
        }
        
        .info-card .small {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        
        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .table th {
            background: #f1f5f9;
            font-weight: 600;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
        }
        
        .table td {
            font-size: 14px;
        }
        
        .table .amount {
            text-align: right;
            font-weight: 500;
        }
        
        .total-row {
            background: #eff6ff !important;
            font-weight: bold;
        }
        
        .total-row td {
            color: #2563eb;
            font-size: 16px;
        }
        
        .footer {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }
        
        .signature {
            text-align: center;
            padding: 20px 0;
        }
        
        .signature-line {
            border-top: 1px solid #374151;
            margin-bottom: 10px;
            padding-top: 10px;
        }
        
        .signature p {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .signature .name {
            font-size: 14px;
            color: #111827;
            font-weight: 600;
        }
        
        .footer-info {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
        }
        
        .footer-info .brand {
            color: #2563eb;
            font-weight: 600;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1 class="title">Comprobante de Nómina</h1>
        </div>

        <!-- Company and Employee Info -->
        <div class="company-info">
            <div class="info-card">
                <h3>Empresa</h3>
                <p>Mi Empresa</p>
                <p class="small">NIT: N/A</p>
            </div>
            
            <div class="info-card">
                <h3>Empleado</h3>
                <p>${nombre}</p>
                <p class="small">CC: ${employee.id?.slice(0, 8) || 'N/A'}</p>
            </div>
            
            <div class="info-card">
                <h3>Período de Pago</h3>
                <p>${formatDate(period.startDate)} - ${formatDate(period.endDate)}</p>
                <p class="small">Días trabajados: ${diasTrabajados}</p>
            </div>
        </div>

        <!-- Payment Summary -->
        <div class="section">
            <h2 class="section-title">💵 Resumen del Pago</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Salario Base</td>
                        <td class="amount">${formatCurrency(salarioBase)}</td>
                    </tr>
                    ${auxilioTransporte > 0 ? `
                    <tr>
                        <td>Subsidio de Transporte</td>
                        <td class="amount">${formatCurrency(auxilioTransporte)}</td>
                    </tr>
                    ` : ''}
                    ${bonificaciones > 0 ? `
                    <tr>
                        <td>Bonificaciones</td>
                        <td class="amount">${formatCurrency(bonificaciones)}</td>
                    </tr>
                    ` : ''}
                    ${deducciones > 0 ? `
                    <tr>
                        <td style="color: #dc2626;">Deducciones</td>
                        <td class="amount" style="color: #dc2626;">-${formatCurrency(deducciones)}</td>
                    </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td><strong>Total Neto a Pagar</strong></td>
                        <td class="amount"><strong>${formatCurrency(salarioNeto)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Signatures -->
        <div class="footer">
            <div class="signature">
                <div class="signature-line"></div>
                <p>Firma del Empleado</p>
                <p class="name">${nombre}</p>
                <p>CC: ${employee.id?.slice(0, 8) || 'N/A'}</p>
            </div>
            <div class="signature">
                <div class="signature-line"></div>
                <p>Firma del Representante Legal</p>
                <p class="name">Mi Empresa</p>
                <p>NIT: N/A</p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer-info">
            <p>Este documento fue generado con <span class="brand">Finppi</span> – Software de Nómina y Seguridad Social</p>
            <p><a href="https://www.finppi.com" style="color: #2563eb;">www.finppi.com</a></p>
            <p>Generado el ${new Date().toLocaleString('es-CO')}</p>
        </div>
    </div>
</body>
</html>
  `;
}

async function generateSimplePDFFallback(employee: any, period: any): Promise<Uint8Array> {
  console.log('📄 Generando PDF simple como fallback...');
  
  try {
    // Importar pdf-lib como fallback
    const { PDFDocument, StandardFonts } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const nombre = String(employee.name || 'Empleado');
    const salarioNeto = Number(employee.netPay) || 0;
    const fechaInicio = period.startDate || '';
    const fechaFin = period.endDate || '';
    
    const formatCurrency = (valor: number) => {
      return '$' + Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    
    const formatDate = (fecha: string) => {
      try {
        const date = new Date(fecha);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      } catch {
        return fecha;
      }
    };

    let yPos = 750;
    
    // Título
    page.drawText('COMPROBANTE DE NOMINA', {
      x: 50,
      y: yPos,
      size: 18,
      font: font,
    });
    
    yPos -= 60;
    
    // Empleado
    page.drawText(`Empleado: ${nombre}`, {
      x: 50,
      y: yPos,
      size: 12,
      font: font,
    });
    
    yPos -= 30;
    
    // Período
    page.drawText(`Periodo: ${formatDate(fechaInicio)} - ${formatDate(fechaFin)}`, {
      x: 50,
      y: yPos,
      size: 12,
      font: font,
    });
    
    yPos -= 30;
    
    // Salario base
    if (employee.baseSalary) {
      page.drawText(`Salario Base: ${formatCurrency(employee.baseSalary)}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 30;
    }
    
    yPos -= 20;
    
    // Total neto
    page.drawText(`TOTAL NETO: ${formatCurrency(salarioNeto)}`, {
      x: 50,
      y: yPos,
      size: 16,
      font: font,
    });
    
    yPos -= 80;
    
    // Fecha de generación
    const ahora = new Date();
    const fechaGeneracion = `${ahora.getDate().toString().padStart(2, '0')}/${(ahora.getMonth() + 1).toString().padStart(2, '0')}/${ahora.getFullYear()}`;
    
    page.drawText(`Generado: ${fechaGeneracion}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
    });
    
    const pdfBytes = await pdfDoc.save();
    console.log('✅ PDF fallback generado, tamaño:', pdfBytes.length);
    
    return new Uint8Array(pdfBytes);
    
  } catch (error) {
    console.error('❌ Error en fallback:', error);
    throw new Error('No se pudo generar el PDF: ' + error.message);
  }
}
