
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
    console.log('🔄 INICIANDO GENERACIÓN DE PDF PROFESIONAL');
    
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

            // Obtener información completa del empleado (incluyendo documento)
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

    // Generar PDF profesional usando una librería más confiable
    const pdfContent = await generateProfessionalVoucherPDF(employeeComplete, period, companyInfo);

    console.log('✅ PDF PROFESIONAL GENERADO EXITOSAMENTE');

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${employeeComplete.name.replace(/\s+/g, '-')}.pdf"`
      }
    });

  } catch (error) {
    console.error('💥 ERROR CRÍTICO GENERANDO PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// FUNCIÓN PRINCIPAL: Generar PDF profesional usando jsPDF optimizado
async function generateProfessionalVoucherPDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('📄 GENERANDO PDF PROFESIONAL CON JSPDF AVANZADO...');
  
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

  // Cálculos detallados profesionales
  const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
  
  // Deducciones calculadas detalladamente
  const saludEmpleado = Math.round(employee.baseSalary * 0.04); // 4%
  const pensionEmpleado = Math.round(employee.baseSalary * 0.04); // 4%
  const fondoSolidaridad = employee.baseSalary > 4000000 ? Math.round(employee.baseSalary * 0.01) : 0; // 1% si > 4 SMMLV
  const otrasDeduccionesCalculadas = Math.max(0, employee.deductions - saludEmpleado - pensionEmpleado - fondoSolidaridad);
  
  // Horas extra calculadas con valor real
  const valorHoraExtra = Math.round((employee.baseSalary / 240) * 1.25); // Hora extra ordinaria
  const totalHorasExtra = employee.extraHours * valorHoraExtra;

  const documento = employee.documento || employee.cedula || employee.id?.slice(0, 8) || 'N/A';
  const tipoDocumento = employee.tipo_documento || 'CC';

  // Convertir HTML a PDF usando jsPDF avanzado
  try {
    console.log('📄 CONVIRTIENDO A PDF PROFESIONAL MEJORADO...');
    
    // Importar jsPDF desde ESM
    const jsPDFModule = await import('https://cdn.skypack.dev/jspdf@2.5.1');
    const { jsPDF } = jsPDFModule.default || jsPDFModule;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configurar colores y fuentes profesionales
    const primaryColor = [30, 64, 175]; // Azul corporativo
    const secondaryColor = [51, 130, 246]; // Azul claro
    const grayColor = [107, 114, 128]; // Gris
    const lightGrayColor = [243, 244, 246]; // Gris claro

    let yPos = 20;

    // ENCABEZADO PROFESIONAL
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(...primaryColor);
    pdf.text('COMPROBANTE DE NÓMINA', 105, yPos, { align: 'center' });
    
    // Línea divisoria
    pdf.setDrawColor(...secondaryColor);
    pdf.setLineWidth(1);
    pdf.line(20, yPos + 5, 190, yPos + 5);
    
    yPos += 20;

    // INFORMACIÓN EN TRES COLUMNAS (DISEÑO PROFESIONAL)
    const colWidth = 56;
    const startX = 20;

    // Fondo gris claro para las tarjetas
    pdf.setFillColor(...lightGrayColor);
    pdf.rect(startX, yPos - 3, colWidth, 35, 'F');
    pdf.rect(startX + colWidth + 2, yPos - 3, colWidth, 35, 'F');
    pdf.rect(startX + (colWidth + 2) * 2, yPos - 3, colWidth, 35, 'F');

    // Bordes azules para las tarjetas
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(2);
    pdf.line(startX, yPos - 3, startX, yPos + 32); // Línea izquierda empresa
    pdf.line(startX + colWidth + 2, yPos - 3, startX + colWidth + 2, yPos + 32); // Línea izquierda empleado
    pdf.line(startX + (colWidth + 2) * 2, yPos - 3, startX + (colWidth + 2) * 2, yPos + 32); // Línea izquierda período

    // EMPRESA
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...primaryColor);
    pdf.text('EMPRESA', startX + 2, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(companyInfo?.razon_social || 'Mi Empresa', startX + 2, yPos + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    pdf.text(`NIT: ${companyInfo?.nit || 'N/A'}`, startX + 2, yPos + 15);
    if (companyInfo?.direccion) {
      pdf.text(companyInfo.direccion.substring(0, 25), startX + 2, yPos + 22);
    }

    // EMPLEADO
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...primaryColor);
    pdf.text('EMPLEADO', startX + colWidth + 4, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(employee.name, startX + colWidth + 4, yPos + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    pdf.text(`${tipoDocumento}: ${documento}`, startX + colWidth + 4, yPos + 15);
    if (employee.position) {
      pdf.text(`Cargo: ${employee.position}`, startX + colWidth + 4, yPos + 22);
    }

    // PERÍODO DE PAGO
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...primaryColor);
    pdf.text('PERÍODO DE PAGO', startX + (colWidth + 2) * 2 + 2, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, startX + (colWidth + 2) * 2 + 2, yPos + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    pdf.text(`Días trabajados: ${employee.workedDays}`, startX + (colWidth + 2) * 2 + 2, yPos + 15);
    pdf.text(`Salario Base: ${formatCurrency(employee.baseSalary)}`, startX + (colWidth + 2) * 2 + 2, yPos + 22);

    yPos += 45;

    // RESUMEN DEL PAGO - TABLA PROFESIONAL
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...primaryColor);
    pdf.text('💵 RESUMEN DEL PAGO', 20, yPos);
    yPos += 10;

    // Tabla con fondo y bordes profesionales
    const tableStartY = yPos;
    const rowHeight = 8;
    let currentY = tableStartY;

    // Encabezado de tabla
    pdf.setFillColor(...primaryColor);
    pdf.rect(20, currentY, 170, rowHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text('CONCEPTO', 25, currentY + 5);
    pdf.text('VALOR', 165, currentY + 5);
    currentY += rowHeight;

    // Filas de datos con alternado de colores
    const tableData = [
      ['Salario Proporcional', formatCurrency(salarioProporcional)],
      ...(employee.transportAllowance > 0 ? [['Subsidio de Transporte', formatCurrency(employee.transportAllowance)]] : []),
      ...(employee.bonuses > 0 ? [['Bonificaciones', formatCurrency(employee.bonuses)]] : []),
      ...(totalHorasExtra > 0 ? [['Horas Extras y Recargos', formatCurrency(totalHorasExtra)]] : []),
      ...(employee.deductions > 0 ? [['Deducciones', `-${formatCurrency(employee.deductions)}`]] : []),
    ];

    tableData.forEach((row, index) => {
      // Alternar colores de fondo
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(20, currentY, 170, rowHeight, 'F');
      }
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      
      if (row[0] === 'Deducciones') {
        pdf.setTextColor(220, 38, 38); // Rojo para deducciones
      } else {
        pdf.setTextColor(0, 0, 0);
      }
      
      pdf.text(row[0], 25, currentY + 5);
      pdf.text(row[1], 165, currentY + 5);
      currentY += rowHeight;
    });

    // Total neto destacado
    pdf.setFillColor(...secondaryColor);
    pdf.rect(20, currentY, 170, rowHeight + 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('TOTAL NETO A PAGAR', 25, currentY + 6);
    pdf.text(formatCurrency(employee.netPay), 165, currentY + 6);
    currentY += rowHeight + 5;

    yPos = currentY + 10;

    // HORAS EXTRAS (si existen)
    if (employee.extraHours > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(...primaryColor);
      pdf.text('⏱ HORAS EXTRAS, ORDINARIAS Y RECARGOS', 20, yPos);
      yPos += 10;

      // Tabla de horas extra
      pdf.setFillColor(...primaryColor);
      pdf.rect(20, yPos, 170, rowHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('CONCEPTO', 25, yPos + 5);
      pdf.text('CANTIDAD', 100, yPos + 5);
      pdf.text('VALOR', 165, yPos + 5);
      yPos += rowHeight;

      pdf.setFillColor(248, 250, 252);
      pdf.rect(20, yPos, 170, rowHeight, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Hora Extra Ordinaria', 25, yPos + 5);
      pdf.text(`${employee.extraHours} horas`, 100, yPos + 5);
      pdf.text(formatCurrency(totalHorasExtra), 165, yPos + 5);
      yPos += rowHeight;

      // Total horas
      pdf.setFillColor(...secondaryColor);
      pdf.rect(20, yPos, 170, rowHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Total pago por horas', 25, yPos + 5);
      pdf.text(formatCurrency(totalHorasExtra), 165, yPos + 5);
      yPos += rowHeight + 10;
    }

    // DEDUCCIONES DETALLADAS (si existen)
    if (employee.deductions > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(...primaryColor);
      pdf.text('💸 RETENCIONES Y DEDUCCIONES', 20, yPos);
      yPos += 10;

      // Tabla de deducciones
      pdf.setFillColor(...primaryColor);
      pdf.rect(20, yPos, 170, rowHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('CONCEPTO', 25, yPos + 5);
      pdf.text('%', 100, yPos + 5);
      pdf.text('VALOR', 165, yPos + 5);
      yPos += rowHeight;

      const deductionData = [
        ...(saludEmpleado > 0 ? [['Salud', '4%', formatCurrency(saludEmpleado)]] : []),
        ...(pensionEmpleado > 0 ? [['Pensión', '4%', formatCurrency(pensionEmpleado)]] : []),
        ...(fondoSolidaridad > 0 ? [['Fondo de Solidaridad', '1%', formatCurrency(fondoSolidaridad)]] : []),
        ...(otrasDeduccionesCalculadas > 0 ? [['Otros', '-', formatCurrency(otrasDeduccionesCalculadas)]] : []),
      ];

      deductionData.forEach((row, index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(20, yPos, 170, rowHeight, 'F');
        }
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(row[0], 25, yPos + 5);
        pdf.text(row[1], 100, yPos + 5);
        pdf.text(row[2], 165, yPos + 5);
        yPos += rowHeight;
      });

      // Total deducciones
      pdf.setFillColor(...secondaryColor);
      pdf.rect(20, yPos, 170, rowHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Total Retenciones y Deducciones', 25, yPos + 5);
      pdf.text(formatCurrency(employee.deductions), 165, yPos + 5);
      yPos += rowHeight + 10;
    }

    // FIRMAS (en la parte inferior)
    yPos = Math.max(yPos, 240); // Asegurar que esté en la parte inferior

    // Línea divisoria
    pdf.setDrawColor(...grayColor);
    pdf.setLineWidth(0.5);
    pdf.line(20, yPos, 190, yPos);
    yPos += 10;

    // Espacios para firmas
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    
    // Líneas de firma
    pdf.line(30, yPos, 80, yPos);
    pdf.line(110, yPos, 160, yPos);
    
    pdf.text('Firma del Empleado', 45, yPos + 5);
    pdf.text('Firma del Representante Legal', 115, yPos + 5);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text(employee.name, 45, yPos + 12);
    pdf.text(companyInfo?.razon_social || 'Mi Empresa', 115, yPos + 12);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...grayColor);
    pdf.text(`${tipoDocumento}: ${documento}`, 45, yPos + 18);
    pdf.text(`NIT: ${companyInfo?.nit || 'N/A'}`, 115, yPos + 18);

    // FOOTER CON MARCA FINPPI
    yPos += 30;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...grayColor);
    pdf.text('Este documento fue generado con ', 105, yPos, { align: 'center' });
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.text('Finppi', 135, yPos);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    pdf.text(' – Software de Nómina y Seguridad Social', 144, yPos);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...secondaryColor);
    pdf.text('www.finppi.com', 105, yPos + 5, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...grayColor);
    pdf.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 105, yPos + 10, { align: 'center' });

    return new Uint8Array(pdf.output('arraybuffer'));
    
  } catch (error) {
    console.error('❌ Error generando PDF profesional:', error);
    throw error;
  }
}
