
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
    console.log('🚀 INICIANDO GENERACIÓN PDF DEFINITIVA');
    
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

    // Generar PDF usando solo pdf-lib (compatible con Deno)
    const pdfBuffer = await generateDenoPDF(employee, period);

    console.log('✅ PDF GENERADO EXITOSAMENTE - TAMAÑO:', pdfBuffer.length, 'bytes');

    // Verificar que el PDF es válido
    if (pdfBuffer.length < 100) {
      throw new Error('PDF generado está vacío o corrupto');
    }

    // Verificar header PDF
    const pdfHeader = String.fromCharCode(...pdfBuffer.slice(0, 4));
    if (pdfHeader !== '%PDF') {
      throw new Error('Buffer generado no es un PDF válido');
    }

    console.log('✅ PDF VALIDADO CORRECTAMENTE');

    // Respuesta binaria optimizada para PDFs
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="comprobante-${employee.name.replace(/\s+/g, '-')}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO EN PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
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

async function generateDenoPDF(employee: any, period: any): Promise<Uint8Array> {
  console.log('📄 Generando PDF con pdf-lib compatible con Deno...');
  
  try {
    // Importar pdf-lib de forma segura
    const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 en points
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Extraer y limpiar datos
    const nombre = String(employee.name || 'Empleado').substring(0, 50);
    const salarioBase = Number(employee.baseSalary) || 0;
    const salarioNeto = Number(employee.netPay) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const deducciones = Number(employee.deductions) || 0;
    const bonificaciones = Number(employee.bonuses) || 0;
    const auxilioTransporte = Number(employee.transportAllowance) || 0;
    const horasExtra = Number(employee.extraHours) || 0;
    
    console.log('📊 Datos procesados:', { nombre, salarioBase, salarioNeto, diasTrabajados });
    
    // Función para formatear moneda (sin Intl para compatibilidad Deno)
    const formatCurrency = (valor: number): string => {
      const rounded = Math.round(valor);
      const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `$${formatted}`;
    };
    
    // Función para formatear fechas (sin toLocaleDateString)
    const formatDate = (fecha: string): string => {
      try {
        const date = new Date(fecha);
        const day = date.getUTCDate().toString().padStart(2, '0');
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return fecha.substring(0, 10);
      }
    };
    
    const fechaInicio = formatDate(period.startDate);
    const fechaFin = formatDate(period.endDate);
    const fechaGeneracion = formatDate(new Date().toISOString());
    
    // Colores
    const azulTitulo = rgb(0.15, 0.4, 0.8);
    const grisTexto = rgb(0.3, 0.3, 0.3);
    const azulFondo = rgb(0.95, 0.97, 1);
    
    let yPos = 750;
    const margenIzq = 50;
    const margenDer = 545;
    
    // TÍTULO PRINCIPAL
    page.drawText('COMPROBANTE DE NÓMINA', {
      x: margenIzq,
      y: yPos,
      size: 20,
      font: boldFont,
      color: azulTitulo,
    });
    
    yPos -= 50;
    
    // INFORMACIÓN DE LA EMPRESA Y EMPLEADO
    page.drawRectangle({
      x: margenIzq - 10,
      y: yPos - 30,
      width: 510,
      height: 80,
      color: azulFondo,
    });
    
    // Empresa
    page.drawText('EMPRESA:', {
      x: margenIzq,
      y: yPos,
      size: 10,
      font: boldFont,
      color: grisTexto,
    });
    
    page.drawText('Mi Empresa', {
      x: margenIzq,
      y: yPos - 15,
      size: 12,
      font: font,
    });
    
    page.drawText('NIT: N/A', {
      x: margenIzq,
      y: yPos - 30,
      size: 10,
      font: font,
      color: grisTexto,
    });
    
    // Empleado
    page.drawText('EMPLEADO:', {
      x: 300,
      y: yPos,
      size: 10,
      font: boldFont,
      color: grisTexto,
    });
    
    page.drawText(nombre, {
      x: 300,
      y: yPos - 15,
      size: 12,
      font: font,
    });
    
    page.drawText(`CC: ${employee.id?.slice(0, 8) || 'N/A'}`, {
      x: 300,
      y: yPos - 30,
      size: 10,
      font: font,
      color: grisTexto,
    });
    
    yPos -= 100;
    
    // PERÍODO
    page.drawText('PERÍODO DE PAGO:', {
      x: margenIzq,
      y: yPos,
      size: 12,
      font: boldFont,
      color: azulTitulo,
    });
    
    page.drawText(`${fechaInicio} - ${fechaFin}`, {
      x: margenIzq,
      y: yPos - 20,
      size: 11,
      font: font,
    });
    
    page.drawText(`Días trabajados: ${diasTrabajados}`, {
      x: 300,
      y: yPos - 20,
      size: 11,
      font: font,
    });
    
    yPos -= 60;
    
    // RESUMEN DE PAGO
    page.drawText('RESUMEN DEL PAGO', {
      x: margenIzq,
      y: yPos,
      size: 14,
      font: boldFont,
      color: azulTitulo,
    });
    
    yPos -= 30;
    
    // Tabla de conceptos
    const conceptos = [
      ['Salario Base', formatCurrency(salarioBase)],
      ...(auxilioTransporte > 0 ? [['Subsidio de Transporte', formatCurrency(auxilioTransporte)]] : []),
      ...(bonificaciones > 0 ? [['Bonificaciones', formatCurrency(bonificaciones)]] : []),
      ...(horasExtra > 0 ? [['Horas Extras', formatCurrency(horasExtra * ((salarioBase / 240) * 1.25))]] : []),
      ...(deducciones > 0 ? [['Deducciones', `-${formatCurrency(deducciones)}`]] : []),
    ];
    
    // Dibujar tabla
    for (const [concepto, valor] of conceptos) {
      page.drawText(concepto, {
        x: margenIzq,
        y: yPos,
        size: 10,
        font: font,
      });
      
      page.drawText(valor, {
        x: margenDer - valor.length * 6,
        y: yPos,
        size: 10,
        font: font,
      });
      
      yPos -= 20;
    }
    
    yPos -= 10;
    
    // Línea separadora
    page.drawLine({
      start: { x: margenIzq, y: yPos },
      end: { x: margenDer, y: yPos },
      thickness: 1,
      color: grisTexto,
    });
    
    yPos -= 25;
    
    // TOTAL NETO
    page.drawRectangle({
      x: margenIzq - 10,
      y: yPos - 15,
      width: 510,
      height: 30,
      color: azulFondo,
    });
    
    page.drawText('TOTAL NETO A PAGAR:', {
      x: margenIzq,
      y: yPos,
      size: 14,
      font: boldFont,
      color: azulTitulo,
    });
    
    const totalNeto = formatCurrency(salarioNeto);
    page.drawText(totalNeto, {
      x: margenDer - totalNeto.length * 8,
      y: yPos,
      size: 14,
      font: boldFont,
      color: azulTitulo,
    });
    
    yPos -= 80;
    
    // FIRMAS
    page.drawText('Firma del Empleado', {
      x: margenIzq,
      y: yPos,
      size: 10,
      font: font,
      color: grisTexto,
    });
    
    page.drawLine({
      start: { x: margenIzq, y: yPos + 20 },
      end: { x: margenIzq + 150, y: yPos + 20 },
      thickness: 1,
      color: grisTexto,
    });
    
    page.drawText('Firma del Empleador', {
      x: 350,
      y: yPos,
      size: 10,
      font: font,
      color: grisTexto,
    });
    
    page.drawLine({
      start: { x: 350, y: yPos + 20 },
      end: { x: 500, y: yPos + 20 },
      thickness: 1,
      color: grisTexto,
    });
    
    yPos -= 60;
    
    // PIE DE PÁGINA
    page.drawText(`Generado el ${fechaGeneracion} con Finppi - www.finppi.com`, {
      x: margenIzq,
      y: yPos,
      size: 8,
      font: font,
      color: grisTexto,
    });
    
    // Generar PDF
    const pdfBytes = await pdfDoc.save();
    console.log('✅ PDF generado exitosamente, tamaño:', pdfBytes.length);
    
    return new Uint8Array(pdfBytes);
    
  } catch (error) {
    console.error('❌ Error en generación PDF:', error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
