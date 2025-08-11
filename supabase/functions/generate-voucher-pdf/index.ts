
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utilidad para normalizar texto con acentos a ASCII para mejor compatibilidad PDF
function normalizeText(text: string): string {
  return text
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ÁÀÄÂ]/g, 'A')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/[Ñ]/g, 'N')
    .replace(/[Ç]/g, 'C');
}

// Función mejorada para formatear moneda
function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount === null || amount === undefined) {
    console.warn('⚠️ formatCurrency recibió valor inválido:', amount);
    return '$0';
  }
  
  // Formatear sin decimales para PDF
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

serve(async (req) => {
  console.log('🚀 Starting PDF generation...');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const requestBody = await req.json();
    console.log('📥 Full request body received:', JSON.stringify(requestBody, null, 2));

    // Validate request
    if (!requestBody.payrollId) {
      throw new Error('payrollId is required');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log('✅ User authenticated:', user.id);
    console.log('✅ PayrollId found in request:', requestBody.payrollId);

    console.log('🔍 Fetching real payroll data from database for ID:', requestBody.payrollId);

    // Fetch real payroll data
    const { data: payrollData, error: payrollError } = await supabase
      .from('payrolls')
      .select(`
        *,
        employees!inner(
          id,
          nombre,
          apellido,
          cedula,
          cargo,
          eps,
          afp,
          salario_base,
          estado
        ),
        payroll_periods_real!inner(
          id,
          periodo,
          fecha_inicio,
          fecha_fin,
          tipo_periodo
        ),
        companies!inner(
          id,
          razon_social,
          nit,
          direccion,
          ciudad,
          telefono,
          email,
          logo_url
        )
      `)
      .eq('id', requestBody.payrollId)
      .single();

    if (payrollError || !payrollData) {
      console.error('❌ Error fetching payroll data:', payrollError);
      throw new Error('Payroll data not found');
    }

    console.log('✅ Payroll data fetched successfully: {');
    console.log('  employee: "' + payrollData.employees.nombre + '",');
    console.log('  period: "' + payrollData.payroll_periods_real.periodo + '",');
    console.log('  company: "' + payrollData.companies.razon_social + '"');
    console.log('}');

    console.log('🎨 UX DESIGNER MODE: Creating PDF with REAL DATABASE values...');
    console.log('📊 Valores reales desde base de datos:');
    console.log('- Total devengado DB:', payrollData.total_devengado);
    console.log('- Deducciones DB:', payrollData.total_deducciones);
    console.log('- Neto a pagar DB:', payrollData.neto_pagado);
    console.log('- Días trabajados:', payrollData.dias_trabajados);
    console.log('- Horas extra:', payrollData.horas_extra);

    console.log('🔧 Generando PDF para:', payrollData.employees.nombre);
    console.log('📋 KISS: Generando PDF sin logo para máxima confiabilidad');

    console.log('🎨 PROFESSIONAL MODE: Creating complete voucher with all required elements...');

    // Generate professional PDF
    const pdfBytes = await generateProfessionalVoucherPDF(payrollData);

    console.log('🏗️ Building PDF structure...');
    console.log('✅ PDF built: ' + pdfBytes.length + ' bytes, 7 objects');
    console.log('✅ PDF generated successfully: ' + pdfBytes.length + ' bytes');

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${payrollData.employees.nombre.replace(/\s+/g, '-')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function generateProfessionalVoucherPDF(payrollData: any): Promise<Uint8Array> {
  // Importar jsPDF dinámicamente
  const jsPDF = (await import('https://esm.sh/jspdf@2.5.1')).default;

  const doc = new (jsPDF as any)();
  
  // Configuración inicial
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPos = margin;

  // Datos normalizados para mejor renderizado
  const employee = payrollData.employees;
  const period = payrollData.payroll_periods_real;
  const company = payrollData.companies;

  // CORRECCIÓN: Usar datos reales de la base de datos
  const salarioBase = Number(employee.salario_base) || 0;
  const diasTrabajados = Number(payrollData.dias_trabajados) || 15;
  const totalDevengado = Number(payrollData.total_devengado) || 0;
  const totalDeducciones = Number(payrollData.total_deducciones) || 0;
  const netoPagado = Number(payrollData.neto_pagado) || 0;
  const horasExtra = Number(payrollData.horas_extra) || 0;
  
  // Cálculos auxiliares
  const salarioProporcional = Math.round((salarioBase * diasTrabajados) / 30);
  const valorHoraExtra = Math.round((salarioBase / 240) * 1.25);
  const totalHorasExtra = horasExtra > 0 ? horasExtra * valorHoraExtra : 0;
  
  // === HEADER PRINCIPAL ===
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  
  // Título normalizado sin acentos
  const titleText = normalizeText('COMPROBANTE DE NOMINA');
  doc.text(titleText, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  const companyText = normalizeText(company.razon_social || 'Mi Empresa');
  doc.text(companyText, pageWidth / 2, 25, { align: 'center' });
  
  yPos = 45;

  // === INFORMACIÓN BÁSICA ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Empleado
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('EMPLEADO:'), margin, yPos);
  doc.setFont('helvetica', 'normal');
  const employeeName = normalizeText(`${employee.nombre} ${employee.apellido || ''}`.trim());
  doc.text(employeeName, margin + 35, yPos);
  yPos += 7;

  // Documento
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('CEDULA:'), margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.cedula || 'N/A', margin + 35, yPos);
  yPos += 7;

  // Período
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('PERIODO:'), margin, yPos);
  doc.setFont('helvetica', 'normal');
  const periodText = normalizeText(period.periodo || 'N/A');
  doc.text(periodText, margin + 35, yPos);
  yPos += 10;

  // === SECCIÓN DATOS DE PAGO (CORREGIDA) ===
  yPos += 5;
  
  // Header de datos de pago
  doc.setFillColor(52, 152, 219);
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const datosTitle = normalizeText('DATOS DE PAGO');
  doc.text(datosTitle, margin + 5, yPos + 2);
  
  yPos += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  // CORRECCIÓN: Ajustar posiciones Y para evitar solapamiento
  const lineHeight = 8; // Aumentado de 6 a 8 para más separación
  
  // Columna izquierda - Conceptos base
  let leftColumnY = yPos;
  
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Salario Base:'), margin, leftColumnY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(salarioBase), margin + 50, leftColumnY);
  leftColumnY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Dias Trabajados:'), margin, leftColumnY);
  doc.setFont('helvetica', 'normal');
  doc.text(diasTrabajados.toString(), margin + 50, leftColumnY);
  leftColumnY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Salario Proporcional:'), margin, leftColumnY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(salarioProporcional), margin + 50, leftColumnY);
  leftColumnY += lineHeight;

  // Horas extra solo si existen
  if (totalHorasExtra > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('Horas Extra (' + horasExtra + '):'), margin, leftColumnY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(totalHorasExtra), margin + 50, leftColumnY);
    leftColumnY += lineHeight;
  }

  // Columna derecha - Deducciones y neto (CORREGIDA)
  let rightColumnY = yPos;
  const rightColumnX = pageWidth / 2 + 10; // Más separación entre columnas
  
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Total Devengado:'), rightColumnX, rightColumnY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(totalDevengado), rightColumnX + 50, rightColumnY);
  rightColumnY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Total Deducciones:'), rightColumnX, rightColumnY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(totalDeducciones), rightColumnX + 50, rightColumnY);
  rightColumnY += lineHeight;

  // NETO A PAGAR - destacado
  rightColumnY += 3; // Espacio extra antes del neto
  doc.setFillColor(46, 204, 113);
  doc.rect(rightColumnX - 2, rightColumnY - 4, 85, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('NETO A PAGAR:'), rightColumnX, rightColumnY);
  doc.text(formatCurrency(netoPagado), rightColumnX + 50, rightColumnY);

  // Actualizar yPos para siguiente sección
  yPos = Math.max(leftColumnY, rightColumnY) + 20;

  // === SECCIÓN DEDUCCIONES DETALLADAS ===
  if (totalDeducciones > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(231, 76, 60);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const deduccionesTitle = normalizeText('DEDUCCIONES');
    doc.text(deduccionesTitle, margin + 5, yPos + 2);
    
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    // Deducciones calculadas
    const saludEmpleado = Math.round(salarioBase * 0.04);
    const pensionEmpleado = Math.round(salarioBase * 0.04);

    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('Salud (4%):'), margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(saludEmpleado), margin + 40, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('Pension (4%):'), margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(pensionEmpleado), margin + 40, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('TOTAL:'), margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totalDeducciones), margin + 40, yPos);
    yPos += 15;
  }

  // === FOOTER PROFESIONAL ===
  const footerY = pageHeight - 40;
  
  doc.setFillColor(44, 62, 80);
  doc.rect(0, footerY - 5, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const fechaGeneracion = new Date().toLocaleDateString('es-CO');
  const footerText1 = normalizeText('Generado: ' + fechaGeneracion);
  const footerText2 = normalizeText('Software de Nomina Profesional - Finppi');
  const footerText3 = normalizeText('Este comprobante es valido sin firma autografa');
  
  doc.text(footerText1, pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text(footerText2, pageWidth / 2, footerY + 12, { align: 'center' });
  doc.text(footerText3, pageWidth / 2, footerY + 19, { align: 'center' });

  // Generar PDF
  const pdfOutput = doc.output('arraybuffer');
  return new Uint8Array(pdfOutput);
}
