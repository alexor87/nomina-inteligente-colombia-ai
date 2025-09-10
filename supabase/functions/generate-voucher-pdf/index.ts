
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts"

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

    const returnBase64: boolean = !!requestBody.returnBase64;

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

    // Permitir dos modos:
    // A) Con payrollId -> datos reales desde DB (modo existente)
    // B) Con employee + period -> datos directos del request (modo simple)
    let payrollData: any = null;
    let fileNameBase = 'comprobante';

    if (requestBody.payrollId) {
      console.log('✅ PayrollId found in request:', requestBody.payrollId);
      console.log('🔍 Fetching real payroll data from database for ID:', requestBody.payrollId);

      const { data, error: payrollError } = await supabase
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

      if (payrollError || !data) {
        console.error('❌ Error fetching payroll data:', payrollError);
        throw new Error('Payroll data not found');
      }
      payrollData = data;
      fileNameBase = `comprobante-${(data.employees.nombre || 'empleado').replace(/\s+/g, '-')}`;
      console.log('✅ Payroll data fetched successfully');
      console.log('🔍 Deduction values from DB - Salud:', data.salud_empleado, 'Pensión:', data.pension_empleado);
    } else if (requestBody.employee && requestBody.period) {
      // Modo mejorado: intentar resolver SIEMPRE desde la BD usando employee.id + periodo
      console.log('ℹ️ Using employee + period payload; attempting DB resolution');
      const emp = requestBody.employee;
      const per = requestBody.period;

      let resolvedFromDB: any = null;
      try {
        if (emp?.id && per?.startDate && per?.endDate) {
          console.log('🔎 Resolving payroll by employee_id and period dates:', emp.id, per.startDate, per.endDate);
          const { data: candidates, error: fetchError } = await supabase
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
            .eq('employee_id', emp.id)
            .order('updated_at', { ascending: false })
            .limit(20);

          if (fetchError) {
            console.warn('⚠️ Error fetching candidate payrolls:', fetchError);
          }

          if (candidates && candidates.length > 0) {
            resolvedFromDB = candidates.find((row: any) => {
              const fi = row?.payroll_periods_real?.fecha_inicio;
              const ff = row?.payroll_periods_real?.fecha_fin;
              return String(fi) === String(per.startDate) && String(ff) === String(per.endDate);
            }) || null;
          }
        }
      } catch (e) {
        console.warn('⚠️ Exception while resolving payroll from DB, will fallback to simple mode:', e);
      }

      if (resolvedFromDB) {
        console.log('✅ Resolved payroll from DB for employee + period');
        payrollData = resolvedFromDB;
        fileNameBase = `comprobante-${(resolvedFromDB.employees.nombre || 'empleado').replace(/\s+/g, '-')}`;
      } else {
        console.log('ℹ️ Falling back to simple payload (no DB record found)');
        const companyName = requestBody.companyName || 'Mi Empresa';
        const companyNit = requestBody.companyNit || 'N/A';

        const totalDevengado = Number(emp.grossPay ?? emp.baseSalary ?? 0);
        const totalDeducciones = Number(emp.deductions ?? 0);
        const netoPagado = Number(emp.netPay ?? (totalDevengado - totalDeducciones));

        payrollData = {
          employees: {
            id: emp.id,
            nombre: emp.name || 'Empleado',
            apellido: '',
            cedula: emp.id || 'N/A',
            cargo: emp.position || '',
            eps: emp.eps || '',
            afp: emp.afp || '',
            salario_base: Number(emp.baseSalary ?? 0),
            estado: 'activo',
          },
          payroll_periods_real: {
            id: 'temp',
            periodo: per.periodo || `${per.startDate} - ${per.endDate}`,
            fecha_inicio: per.startDate,
            fecha_fin: per.endDate,
            tipo_periodo: per.type || 'quincenal',
          },
          companies: {
            id: 'temp',
            razon_social: companyName,
            nit: companyNit,
            direccion: '',
            ciudad: '',
            telefono: '',
            email: '',
            logo_url: null,
          },
          dias_trabajados: Number(emp.workedDays ?? 15),
          horas_extra: Number(emp.extraHours ?? 0),
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          neto_pagado: netoPagado,
          // Usar deducciones específicas del empleado si están disponibles
          salud_empleado: Number(emp.healthDeduction ?? (totalDeducciones * 0.5)),
          pension_empleado: Number(emp.pensionDeduction ?? (totalDeducciones * 0.5)),
        };
        fileNameBase = `comprobante-${(emp.name || 'empleado').replace(/\s+/g, '-')}`;
      }
    } else {
      throw new Error('Provide payrollId or { employee, period }');
    }

    // === Generación de PDF ===
    const pdfBytes = await generateProfessionalVoucherPDF(payrollData);
    console.log('✅ PDF generated successfully: ' + pdfBytes.length + ' bytes');

    // Responder como JSON base64 si se solicita
    if (returnBase64) {
      const base64 = base64Encode(pdfBytes);
      const fileName = `${fileNameBase}.pdf`;
      return new Response(JSON.stringify({
        fileName,
        mimeType: 'application/pdf',
        base64,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Respuesta binaria (descarga)
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileNameBase}.pdf"`,
      },
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: (error as any).message }),
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

  // Datos normalizados
  const employee = payrollData.employees;
  const period = payrollData.payroll_periods_real;
  const company = payrollData.companies;

  // Datos numéricos
  const salarioBase = Number(employee.salario_base) || 0;
  const diasTrabajados = Number(payrollData.dias_trabajados) || 15;
  const totalDevengado = Number(payrollData.total_devengado) || 0;
  const totalDeducciones = Number(payrollData.total_deducciones) || 0;
  const netoPagado = Number(payrollData.neto_pagado) || 0;
  const horasExtra = Number(payrollData.horas_extra) || 0;

  // USAR VALORES REALES DE DEDUCCIONES DESDE LA BD
  const saludEmpleado = Number(payrollData.salud_empleado) || 0;
  const pensionEmpleado = Number(payrollData.pension_empleado) || 0;
  
  console.log('💰 Using real deduction values from DB - Salud:', saludEmpleado, 'Pensión:', pensionEmpleado);

  // Cálculos auxiliares (sin cambios funcionales)
  const salarioProporcional = Math.round((salarioBase * diasTrabajados) / 30);
  const valorHoraExtra = Math.round((salarioBase / 240) * 1.25);
  const totalHorasExtra = horasExtra > 0 ? horasExtra * valorHoraExtra : 0;

  // Utilidades de dibujo minimalista
  const drawSeparator = (y: number) => {
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0); // Negro
    doc.line(margin, y, pageWidth - margin, y);
  };

  const sectionTitle = (text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(normalizeText(text), margin, yPos);
    yPos += 6;
    drawSeparator(yPos);
    yPos += 8;
  };

  // Header simple (sin colores)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(normalizeText('COMPROBANTE DE NOMINA'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(normalizeText(company?.razon_social || 'Mi Empresa'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  drawSeparator(yPos);
  yPos += 12;

  // Información básica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(normalizeText('EMPLEADO:'), margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText(`${employee.nombre} ${employee.apellido || ''}`.trim()), margin + 35, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('CEDULA:'), margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.cedula || 'N/A', margin + 35, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('PERIODO:'), margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText(period?.periodo || 'N/A'), margin + 35, yPos);
  yPos += 12;

  drawSeparator(yPos);
  yPos += 12;

  // Sección: Datos de pago
  sectionTitle('DATOS DE PAGO');

  const lineHeight = 8;

  // Columna izquierda
  let leftY = yPos;
  doc.setFontSize(9);

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Salario Base:'), margin, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(salarioBase), margin + 50, leftY);
  leftY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Dias Trabajados:'), margin, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(diasTrabajados), margin + 50, leftY);
  leftY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Salario Proporcional:'), margin, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(salarioProporcional), margin + 50, leftY);
  leftY += lineHeight;

  if (totalHorasExtra > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText(`Horas Extra (${horasExtra}):`), margin, leftY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(totalHorasExtra), margin + 50, leftY);
    leftY += lineHeight;
  }

  // Columna derecha
  let rightY = yPos;
  const rightX = pageWidth / 2 + 10;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Total Devengado:'), rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(totalDevengado), rightX + 50, rightY);
  rightY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('Total Deducciones:'), rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(totalDeducciones), rightX + 50, rightY);
  rightY += lineHeight;

  // Neto a pagar (tipografía solo, sin fondo)
  rightY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(normalizeText('NETO A PAGAR:'), rightX, rightY);
  doc.text(formatCurrency(netoPagado), rightX + 50, rightY);

  yPos = Math.max(leftY, rightY) + 14;
  drawSeparator(yPos);
  yPos += 12;

  // Sección: Deducciones - USANDO VALORES REALES DE LA BD
  if (totalDeducciones > 0) {
    sectionTitle('DEDUCCIONES');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Mostrar deducciones reales de la base de datos
    if (saludEmpleado > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('Salud (4%):'), margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(saludEmpleado), margin + 40, yPos);
      yPos += lineHeight;
    }

    if (pensionEmpleado > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('Pension (4%):'), margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(pensionEmpleado), margin + 40, yPos);
      yPos += lineHeight;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('TOTAL:'), margin, yPos);
    doc.text(formatCurrency(totalDeducciones), margin + 40, yPos);
    yPos += 14;

    drawSeparator(yPos);
    yPos += 10;
  }

  // Footer sobrio (sin bloques de color)
  const footerY = pageHeight - 35;
  if (yPos < footerY - 10) {
    drawSeparator(footerY - 8);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const fechaGeneracion = new Date().toLocaleDateString('es-CO');
  doc.text(normalizeText('Generado: ' + fechaGeneracion), pageWidth / 2, footerY, { align: 'center' });
  doc.text(normalizeText('Software de Nomina Profesional - Finppi'), pageWidth / 2, footerY + 7, { align: 'center' });
  doc.text(normalizeText('Este comprobante es valido sin firma autografa'), pageWidth / 2, footerY + 14, { align: 'center' });

  // Salida PDF
  const pdfOutput = doc.output('arraybuffer');
  return new Uint8Array(pdfOutput);
}
