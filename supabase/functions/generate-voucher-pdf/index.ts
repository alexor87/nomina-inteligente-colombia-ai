
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
    console.log('🔄 INICIANDO GENERACIÓN DE PDF - VERSIÓN ROBUSTA');
    
    const requestBody = await req.json();
    console.log('📋 Datos recibidos:', JSON.stringify(requestBody, null, 2));

    const { employee, period } = requestBody;

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

    // Generar PDF usando pdf-lib (más estable que jsPDF)
    const pdfContent = await generateRobustVoucherPDF(employeeComplete, period, companyInfo);

    console.log('✅ PDF GENERADO EXITOSAMENTE');

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

// FUNCIÓN ROBUSTA: Generar PDF usando pdf-lib
async function generateRobustVoucherPDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('📄 GENERANDO PDF CON LIBRERÍA ROBUSTA...');
  
  try {
    // Importar pdf-lib desde esm.sh (más estable para Deno)
    const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    // Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Obtener fuentes
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Colores
    const primaryColor = rgb(0.12, 0.25, 0.69); // Azul corporativo
    const grayColor = rgb(0.4, 0.4, 0.4);
    const blackColor = rgb(0, 0, 0);
    
    // Función auxiliar para formatear moneda
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    // Función auxiliar para formatear fecha
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Cálculos detallados
    const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
    const saludEmpleado = Math.round(employee.baseSalary * 0.04);
    const pensionEmpleado = Math.round(employee.baseSalary * 0.04);
    const fondoSolidaridad = employee.baseSalary > 4000000 ? Math.round(employee.baseSalary * 0.01) : 0;
    const valorHoraExtra = Math.round((employee.baseSalary / 240) * 1.25);
    const totalHorasExtra = employee.extraHours * valorHoraExtra;

    const documento = employee.documento || employee.cedula || employee.id?.slice(0, 8) || 'N/A';
    const tipoDocumento = employee.tipo_documento || 'CC';

    let yPosition = 800;

    // TÍTULO PRINCIPAL
    page.drawText('COMPROBANTE DE NÓMINA', {
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
    
    page.drawText(companyInfo?.razon_social || 'Mi Empresa', {
      x: 50,
      y: yPosition - 20,
      size: 11,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`NIT: ${companyInfo?.nit || 'N/A'}`, {
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
    
    page.drawText(employee.name, {
      x: 200,
      y: yPosition - 20,
      size: 11,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`${tipoDocumento}: ${documento}`, {
      x: 200,
      y: yPosition - 40,
      size: 10,
      font: font,
      color: grayColor,
    });

    // PERÍODO DE PAGO
    page.drawText('PERÍODO DE PAGO', {
      x: 350,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText(`${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, {
      x: 350,
      y: yPosition - 20,
      size: 10,
      font: boldFont,
      color: blackColor,
    });
    
    page.drawText(`Días trabajados: ${employee.workedDays}`, {
      x: 350,
      y: yPosition - 40,
      size: 9,
      font: font,
      color: grayColor,
    });

    yPosition -= 80;

    // RESUMEN DEL PAGO
    page.drawText('💵 RESUMEN DEL PAGO', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 30;

    // Tabla de conceptos
    const conceptos = [
      ['Salario Proporcional', formatCurrency(salarioProporcional)],
      ...(employee.transportAllowance > 0 ? [['Subsidio de Transporte', formatCurrency(employee.transportAllowance)]] : []),
      ...(employee.bonuses > 0 ? [['Bonificaciones', formatCurrency(employee.bonuses)]] : []),
      ...(totalHorasExtra > 0 ? [['Horas Extras y Recargos', formatCurrency(totalHorasExtra)]] : []),
      ...(employee.deductions > 0 ? [['Deducciones', `-${formatCurrency(employee.deductions)}`]] : []),
    ];

    conceptos.forEach((concepto, index) => {
      const isTotal = index === conceptos.length - 1 && concepto[0] === 'Deducciones';
      const textColor = isTotal ? rgb(0.86, 0.15, 0.15) : blackColor;
      
      page.drawText(concepto[0], {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: textColor,
      });
      
      page.drawText(concepto[1], {
        x: 400,
        y: yPosition,
        size: 10,
        font: font,
        color: textColor,
      });
      
      yPosition -= 20;
    });

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
    
    page.drawText(formatCurrency(employee.netPay), {
      x: 400,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 50;

    // FIRMAS
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

      page.drawText(employee.name, {
        x: 100,
        y: yPosition - 40,
        size: 10,
        font: boldFont,
        color: blackColor,
      });
      
      page.drawText(companyInfo?.razon_social || 'Mi Empresa', {
        x: 320,
        y: yPosition - 40,
        size: 10,
        font: boldFont,
        color: blackColor,
      });
    }

    // FOOTER CON MARCA FINPPI
    page.drawText('Este documento fue generado con Finppi – Software de Nómina', {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: grayColor,
    });

    page.drawText(`Generado el ${new Date().toLocaleString('es-CO')}`, {
      x: 50,
      y: 35,
      size: 7,
      font: font,
      color: grayColor,
    });

    // Serializar el PDF
    const pdfBytes = await pdfDoc.save();
    console.log('✅ PDF serialized successfully, size:', pdfBytes.length);
    
    return new Uint8Array(pdfBytes);
    
  } catch (error) {
    console.error('❌ Error en generateRobustVoucherPDF:', error);
    console.error('Stack trace:', error.stack);
    
    // Fallback: generar PDF simple en caso de error
    return await generateSimpleFallbackPDF(employee, period, companyInfo);
  }
}

// FALLBACK: PDF simple si falla la versión principal
async function generateSimpleFallbackPDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('🔄 Generando PDF fallback simple...');
  
  try {
    const { PDFDocument, StandardFonts } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Contenido básico
    page.drawText('COMPROBANTE DE NÓMINA', {
      x: 50,
      y: 750,
      size: 18,
      font: font,
    });
    
    page.drawText(`Empleado: ${employee.name}`, {
      x: 50,
      y: 700,
      size: 12,
      font: font,
    });
    
    page.drawText(`Período: ${period.startDate} - ${period.endDate}`, {
      x: 50,
      y: 680,
      size: 12,
      font: font,
    });
    
    page.drawText(`Total Neto: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(employee.netPay)}`, {
      x: 50,
      y: 650,
      size: 14,
      font: font,
    });
    
    const pdfBytes = await pdfDoc.save();
    console.log('✅ Fallback PDF generated successfully');
    
    return new Uint8Array(pdfBytes);
    
  } catch (fallbackError) {
    console.error('❌ Error en fallback PDF:', fallbackError);
    throw new Error('No se pudo generar el PDF: ' + fallbackError.message);
  }
}
