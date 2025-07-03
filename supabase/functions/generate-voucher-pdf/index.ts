
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('📄 INICIANDO GENERACIÓN DE PDF ULTRA SIMPLE');
    
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

    // Generar PDF ultra simple
    const pdfContent = await generateUltraSimplePDF(employee, period);

    console.log('✅ PDF ULTRA SIMPLE GENERADO - TAMAÑO:', pdfContent.length, 'bytes');

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${employee.name.replace(/\s+/g, '-')}.pdf"`
      }
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// FUNCIÓN ULTRA SIMPLE: Solo texto básico, sin decoraciones
async function generateUltraSimplePDF(employee: any, period: any): Promise<Uint8Array> {
  console.log('📄 Generando PDF ultra simple...');
  
  try {
    // Importar pdf-lib
    const { PDFDocument, StandardFonts } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    // Crear documento
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    
    // Solo fuente básica
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Datos seguros y simples
    const nombre = String(employee.name || 'Empleado');
    const salarioNeto = Number(employee.netPay) || 0;
    const fechaInicio = period.startDate || '';
    const fechaFin = period.endDate || '';
    
    // Función simple para formatear números
    const formatearDinero = (valor: number) => {
      return '$' + Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    
    // Función simple para formatear fechas
    const formatearFecha = (fecha: string) => {
      try {
        const date = new Date(fecha);
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        const año = date.getFullYear();
        return `${dia}/${mes}/${año}`;
      } catch {
        return fecha;
      }
    };

    // Contenido ultra básico - solo texto negro
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
    page.drawText(`Periodo: ${formatearFecha(fechaInicio)} - ${formatearFecha(fechaFin)}`, {
      x: 50,
      y: yPos,
      size: 12,
      font: font,
    });
    
    yPos -= 30;
    
    // Salario base si existe
    if (employee.baseSalary) {
      page.drawText(`Salario Base: ${formatearDinero(employee.baseSalary)}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 30;
    }
    
    // Días trabajados si existe
    if (employee.workedDays) {
      page.drawText(`Dias Trabajados: ${employee.workedDays}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 30;
    }
    
    yPos -= 20;
    
    // Total neto (más grande)
    page.drawText(`TOTAL NETO: ${formatearDinero(salarioNeto)}`, {
      x: 50,
      y: yPos,
      size: 16,
      font: font,
    });
    
    yPos -= 80;
    
    // Fecha de generación
    const ahora = new Date();
    const fechaGeneracion = `${ahora.getDate().toString().padStart(2, '0')}/${(ahora.getMonth() + 1).toString().padStart(2, '0')}/${ahora.getFullYear()} ${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    
    page.drawText(`Generado: ${fechaGeneracion}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
    });
    
    // Generar PDF
    console.log('🔄 Generando bytes del PDF...');
    const pdfBytes = await pdfDoc.save();
    
    console.log('✅ PDF generado exitosamente, tamaño:', pdfBytes.length);
    
    return new Uint8Array(pdfBytes);
    
  } catch (error) {
    console.error('❌ Error en generateUltraSimplePDF:', error);
    throw new Error('No se pudo generar el PDF: ' + error.message);
  }
}
