
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 PDF Generator - Iniciando versión ultra-simple');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido:', JSON.stringify(requestBody, null, 2));

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

    console.log('📄 Generando PDF ultra-simple...');
    
    // Usar pdf-lib compatible con Deno
    const { PDFDocument, StandardFonts, rgb } = await import('https://cdn.skypack.dev/pdf-lib@1.17.1?dts');
    
    console.log('✅ pdf-lib importado correctamente');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    console.log('✅ Documento PDF creado');
    
    // Extraer datos básicos
    const nombre = String(employee.name || 'Empleado');
    const salarioBase = Number(employee.baseSalary) || 0;
    const salarioNeto = Number(employee.netPay) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    
    console.log(`✅ Datos extraídos: ${nombre}, Salario: ${salarioBase}`);
    
    // Formatear moneda manualmente (sin Intl)
    const formatMoney = (amount) => {
      const rounded = Math.round(amount);
      const str = rounded.toString();
      return '$' + str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    
    // Formatear fecha manualmente
    const formatSimpleDate = (dateStr) => {
      try {
        const date = new Date(dateStr);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return dateStr;
      }
    };
    
    console.log('✅ Funciones de formateo creadas');
    
    let yPos = 750;
    const leftMargin = 50;
    
    // TÍTULO
    page.drawText('COMPROBANTE DE NOMINA', {
      x: leftMargin,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8),
    });
    
    yPos -= 50;
    
    // INFORMACIÓN EMPLEADO
    page.drawText('EMPLEADO:', {
      x: leftMargin,
      y: yPos,
      size: 12,
      font: boldFont,
    });
    
    page.drawText(nombre, {
      x: leftMargin,
      y: yPos - 20,
      size: 11,
      font: font,
    });
    
    yPos -= 60;
    
    // PERÍODO
    page.drawText('PERIODO:', {
      x: leftMargin,
      y: yPos,
      size: 12,
      font: boldFont,
    });
    
    const fechaInicio = formatSimpleDate(period.startDate);
    const fechaFin = formatSimpleDate(period.endDate);
    
    page.drawText(`${fechaInicio} - ${fechaFin}`, {
      x: leftMargin,
      y: yPos - 20,
      size: 11,
      font: font,
    });
    
    page.drawText(`Dias trabajados: ${diasTrabajados}`, {
      x: leftMargin,
      y: yPos - 40,
      size: 10,
      font: font,
    });
    
    yPos -= 80;
    
    // CONCEPTOS DE PAGO
    page.drawText('RESUMEN DE PAGO', {
      x: leftMargin,
      y: yPos,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8),
    });
    
    yPos -= 30;
    
    // Salario Base
    page.drawText('Salario Base:', {
      x: leftMargin,
      y: yPos,
      size: 10,
      font: font,
    });
    
    page.drawText(formatMoney(salarioBase), {
      x: 400,
      y: yPos,
      size: 10,
      font: font,
    });
    
    yPos -= 20;
    
    // Subsidio transporte (si existe)
    if (employee.transportAllowance > 0) {
      page.drawText('Subsidio Transporte:', {
        x: leftMargin,
        y: yPos,
        size: 10,
        font: font,
      });
      
      page.drawText(formatMoney(employee.transportAllowance), {
        x: 400,
        y: yPos,
        size: 10,
        font: font,
      });
      
      yPos -= 20;
    }
    
    // Deducciones (si existen)
    if (employee.deductions > 0) {
      page.drawText('Deducciones:', {
        x: leftMargin,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0.8, 0.2, 0.2),
      });
      
      page.drawText('-' + formatMoney(employee.deductions), {
        x: 400,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0.8, 0.2, 0.2),
      });
      
      yPos -= 20;
    }
    
    yPos -= 20;
    
    // Línea separadora
    page.drawLine({
      start: { x: leftMargin, y: yPos },
      end: { x: 500, y: yPos },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    yPos -= 30;
    
    // TOTAL NETO
    page.drawText('TOTAL NETO:', {
      x: leftMargin,
      y: yPos,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.6, 0.2),
    });
    
    page.drawText(formatMoney(salarioNeto), {
      x: 350,
      y: yPos,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.6, 0.2),
    });
    
    yPos -= 80;
    
    // PIE DE PÁGINA
    page.drawText('Generado con Finppi - Sistema de Nomina', {
      x: leftMargin,
      y: yPos,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    console.log('✅ Contenido del PDF agregado');
    
    // Generar el PDF
    const pdfBytes = await pdfDoc.save();
    console.log(`✅ PDF generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validar que el PDF tenga contenido
    if (pdfBytes.length < 1000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes`);
    }
    
    // Validar header PDF
    const pdfArray = new Uint8Array(pdfBytes);
    const header = String.fromCharCode(...pdfArray.slice(0, 4));
    
    if (header !== '%PDF') {
      console.error('❌ Header inválido:', header);
      throw new Error(`Header PDF inválido: ${header}`);
    }
    
    console.log('✅ PDF validado correctamente - Header:', header);
    
    // Respuesta optimizada
    return new Response(pdfArray, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfArray.length.toString(),
        'Content-Disposition': `attachment; filename="comprobante-${nombre.replace(/\s+/g, '-')}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF: ${error.message}`,
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
