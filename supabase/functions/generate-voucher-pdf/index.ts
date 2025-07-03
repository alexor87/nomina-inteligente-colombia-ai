
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
    console.log('📄 INICIANDO GENERACIÓN DE PDF CORREGIDO');
    
    const requestBody = await req.json();
    console.log('📋 Datos recibidos:', JSON.stringify(requestBody, null, 2));

    const { employee, period } = requestBody;

    // Validación de datos de entrada
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

    // Validar datos críticos del empleado
    if (!employee.name || !employee.baseSalary || !employee.netPay) {
      console.error('❌ Datos del empleado incompletos');
      return new Response(
        JSON.stringify({ error: 'Datos del empleado incompletos' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Inicializar Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener información completa del empleado y empresa
    let companyInfo = null;
    let employeeComplete = employee;

    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.company_id) {
            // Obtener información de la empresa
            const { data: company } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profile.company_id)
              .single();
            
            companyInfo = company;

            // Obtener información completa del empleado
            const { data: employeeData } = await supabase
              .from('employees')
              .select('*')
              .eq('id', employee.id)
              .eq('company_id', profile.company_id)
              .single();
            
            if (employeeData) {
              employeeComplete = {
                ...employee,
                documento: employeeData.cedula,
                tipo_documento: employeeData.tipo_documento || 'CC',
                position: employeeData.cargo
              };
            }
          }
        }
      }
    } catch (authError) {
      console.log('ℹ️ No se pudo obtener información completa:', authError.message);
    }

    console.log('🏢 Información de empresa obtenida:', companyInfo?.razon_social || 'No disponible');
    console.log('👤 Información de empleado completada:', employeeComplete.name);

    // Generar PDF usando pdf-lib con funciones de formateo personalizadas
    const pdfContent = await generateCompatibleVoucherPDF(employeeComplete, period, companyInfo);

    console.log('✅ PDF GENERADO EXITOSAMENTE - TAMAÑO:', pdfContent.length, 'bytes');

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${employeeComplete.name.replace(/\s+/g, '-')}.pdf"`
      }
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO GENERANDO PDF:', error);
    console.error('Stack trace:', error.stack);
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

// FUNCIONES DE FORMATEO PERSONALIZADAS COMPATIBLES CON DENO
function formatCurrencyCustom(amount: number): string {
  // Función personalizada que no depende de Intl
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0';
  }
  
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${formatted}`;
}

function formatDateCustom(dateString: string): string {
  // Función personalizada que no depende de toLocaleDateString
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
}

function getCurrentDateTimeCustom(): string {
  // Función personalizada para fecha y hora actual
  try {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch (error) {
    console.error('Error obteniendo fecha actual:', error);
    return 'Fecha actual';
  }
}

// FUNCIÓN PRINCIPAL: Generar PDF compatible y sin elementos problemáticos
async function generateCompatibleVoucherPDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('📄 GENERANDO PDF COMPATIBLE...');
  
  try {
    // Importar pdf-lib desde esm.sh
    const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    // Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Obtener fuentes
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Colores seguros
    const primaryColor = rgb(0.12, 0.25, 0.69); // Azul corporativo
    const grayColor = rgb(0.4, 0.4, 0.4);
    const blackColor = rgb(0, 0, 0);
    
    // Validar y limpiar datos
    const safeName = String(employee.name || 'Empleado').substring(0, 50);
    const safeSalary = Number(employee.baseSalary) || 0;
    const safeNetPay = Number(employee.netPay) || 0;
    const safeWorkedDays = Number(employee.workedDays) || 30;
    const safeExtraHours = Number(employee.extraHours) || 0;
    const safeBonuses = Number(employee.bonuses) || 0;
    const safeDeductions = Number(employee.deductions) || 0;
    const safeTransportAllowance = Number(employee.transportAllowance) || 0;
    
    // Cálculos seguros
    const salarioProporcional = Math.round((safeSalary / 30) * safeWorkedDays);
    const saludEmpleado = Math.round(safeSalary * 0.04);
    const pensionEmpleado = Math.round(safeSalary * 0.04);
    const fondoSolidaridad = safeSalary > 4000000 ? Math.round(safeSalary * 0.01) : 0;
    const valorHoraExtra = Math.round((safeSalary / 240) * 1.25);
    const totalHorasExtra = safeExtraHours * valorHoraExtra;

    const documento = employee.documento || employee.cedula || employee.id?.slice(0, 8) || 'N/A';
    const tipoDocumento = employee.tipo_documento || 'CC';

    let yPosition = 800;

    // TÍTULO PRINCIPAL - SIN EMOJIS
    page.drawText('COMPROBANTE DE NOMINA', {
      x: 50,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: primaryColor,
    });
    
    yPosition -= 40;

    // INFORMACIÓN DE LA EMPRESA
    page.drawText('EMPRESA', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText(String(companyInfo?.razon_social || 'Mi Empresa').substring(0, 40), {
      x: 50,
      y: yPosition - 20,
      size: 11,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`NIT: ${String(companyInfo?.nit || 'N/A').substring(0, 20)}`, {
      x: 50,
      y: yPosition - 40,
      size: 10,
      font: font,
      color: grayColor,
    });

    // INFORMACIÓN DEL EMPLEADO
    page.drawText('EMPLEADO', {
      x: 200,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText(safeName, {
      x: 200,
      y: yPosition - 20,
      size: 11,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`${tipoDocumento}: ${String(documento).substring(0, 15)}`, {
      x: 200,
      y: yPosition - 40,
      size: 10,
      font: font,
      color: grayColor,
    });

    // PERÍODO DE PAGO
    page.drawText('PERIODO DE PAGO', {
      x: 350,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText(`${formatDateCustom(period.startDate)} - ${formatDateCustom(period.endDate)}`, {
      x: 350,
      y: yPosition - 20,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`Dias trabajados: ${safeWorkedDays}`, {
      x: 350,
      y: yPosition - 40,
      size: 9,
      font: font,
      color: grayColor,
    });

    yPosition -= 80;

    // RESUMEN DEL PAGO - SIN EMOJIS
    page.drawText('RESUMEN DEL PAGO', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 30;

    // Conceptos básicos - evitando estructuras complejas
    page.drawText('Salario Proporcional', {
      x: 70,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    page.drawText(formatCurrencyCustom(salarioProporcional), {
      x: 400,
      y: yPosition,
      size: 10,
      font: font,
      color: blackColor,
    });
    
    yPosition -= 20;

    if (safeTransportAllowance > 0) {
      page.drawText('Subsidio de Transporte', {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      page.drawText(formatCurrencyCustom(safeTransportAllowance), {
        x: 400,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 20;
    }

    if (safeBonuses > 0) {
      page.drawText('Bonificaciones', {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      page.drawText(formatCurrencyCustom(safeBonuses), {
        x: 400,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 20;
    }

    if (totalHorasExtra > 0) {
      page.drawText('Horas Extras y Recargos', {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      page.drawText(formatCurrencyCustom(totalHorasExtra), {
        x: 400,
        y: yPosition,
        size: 10,
        font: font,
        color: blackColor,
      });
      
      yPosition -= 20;
    }

    if (safeDeductions > 0) {
      page.drawText('Deducciones', {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0.86, 0.15, 0.15),
      });
      
      page.drawText(`-${formatCurrencyCustom(safeDeductions)}`, {
        x: 400,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0.86, 0.15, 0.15),
      });
      
      yPosition -= 20;
    }

    // TOTAL NETO DESTACADO
    page.drawRectangle({
      x: 50,
      y: yPosition - 10,
      width: 495,
      height: 25,
      color: rgb(0.85, 0.93, 1),
    });

    page.drawText('TOTAL NETO A PAGAR', {
      x: 70,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText(formatCurrencyCustom(safeNetPay), {
      x: 400,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 50;

    // FIRMAS - solo si hay espacio
    if (yPosition > 150) {
      page.drawText('_________________________', {
        x: 80,
        y: yPosition,
        size: 10,
        font: font,
        color: grayColor,
      });
      
      page.drawText('_________________________', {
        x: 320,
        y: yPosition,
        size: 10,
        font: font,
        color: grayColor,
      });

      page.drawText('Firma del Empleado', {
        x: 100,
        y: yPosition - 20,
        size: 9,
        font: font,
        color: grayColor,
      });
      
      page.drawText('Firma del Representante Legal', {
        x: 320,
        y: yPosition - 20,
        size: 9,
        font: font,
        color: grayColor,
      });

      page.drawText(safeName, {
        x: 100,
        y: yPosition - 40,
        size: 10,
        font: boldFont,
        color: blackColor,
      });
      
      page.drawText(String(companyInfo?.razon_social || 'Mi Empresa').substring(0, 30), {
        x: 320,
        y: yPosition - 40,
        size: 10,
        font: boldFont,
        color: blackColor,
      });
    }

    // FOOTER CON INFORMACIÓN
    page.drawText('Este documento fue generado con Finppi - Software de Nomina', {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: grayColor,
    });

    page.drawText(`Generado el ${getCurrentDateTimeCustom()}`, {
      x: 50,
      y: 35,
      size: 7,
      font: font,
      color: grayColor,
    });

    // Serializar el PDF con validación
    console.log('🔄 Serializando PDF...');
    const pdfBytes = await pdfDoc.save();
    
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error('PDF serializado está vacío');
    }
    
    console.log('✅ PDF serializado exitosamente, tamaño:', pdfBytes.length, 'bytes');
    
    // Verificar que es un PDF válido (comienza con %PDF)
    const pdfBuffer = new Uint8Array(pdfBytes);
    const header = String.fromCharCode(...pdfBuffer.slice(0, 4));
    if (!header.startsWith('%PDF')) {
      throw new Error('PDF generado no tiene header válido');
    }
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error en generateCompatibleVoucherPDF:', error);
    console.error('Stack trace:', error.stack);
    
    // Fallback: generar PDF ultra simple
    return await generateUltraSimplePDF(employee, period, companyInfo);
  }
}

// FALLBACK ULTRA SIMPLE: PDF básico garantizado
async function generateUltraSimplePDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('🔄 Generando PDF ultra simple como fallback...');
  
  try {
    const { PDFDocument, StandardFonts } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Datos seguros
    const safeName = String(employee.name || 'Empleado');
    const safeNetPay = Number(employee.netPay) || 0;
    
    // Contenido ultra básico
    page.drawText('COMPROBANTE DE NOMINA', {
      x: 50,
      y: 750,
      size: 18,
      font: font,
    });
    
    page.drawText(`Empleado: ${safeName}`, {
      x: 50,
      y: 700,
      size: 12,
      font: font,
    });
    
    page.drawText(`Periodo: ${formatDateCustom(period.startDate)} - ${formatDateCustom(period.endDate)}`, {
      x: 50,
      y: 680,
      size: 12,
      font: font,
    });
    
    page.drawText(`Total Neto: ${formatCurrencyCustom(safeNetPay)}`, {
      x: 50,
      y: 650,
      size: 14,
      font: font,
    });
    
    page.drawText(`Generado el ${getCurrentDateTimeCustom()}`, {
      x: 50,
      y: 50,
      size: 8,
      font: font,
    });
    
    const pdfBytes = await pdfDoc.save();
    console.log('✅ PDF ultra simple generado exitosamente');
    
    return new Uint8Array(pdfBytes);
    
  } catch (fallbackError) {
    console.error('❌ Error crítico en fallback PDF:', fallbackError);
    throw new Error('No se pudo generar el PDF ni con fallback: ' + fallbackError.message);
  }
}
