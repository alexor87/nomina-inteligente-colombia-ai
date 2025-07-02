import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoucherData {
  voucherId: string;
  companyId: string;
  employeeName: string;
  employeeId: string;
  employeeCedula: string;
  employeePosition: string;
  periodo: string;
  startDate: string;
  endDate: string;
  netPay: number;
  salaryDetails: {
    baseSalary: number;
    extraHours: number;
    nightSurcharge: number;
    sundaySurcharge: number;
    transportAllowance: number;
    bonuses: number;
    totalEarnings: number;
    healthContribution: number;
    pensionContribution: number;
    withholdingTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };
}

const generatePDFBuffer = async (voucher: VoucherData, companyInfo: any): Promise<Uint8Array> => {
  // Importar jsPDF dinámicamente
  const { jsPDF } = await import("https://esm.sh/jspdf@2.5.1");
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Crear nuevo documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configurar fuente
  doc.setFont('helvetica');
  
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // ENCABEZADO
  // Logo/Inicial de la empresa
  doc.setFillColor(102, 126, 234);
  doc.rect(margin, yPosition, 15, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const logoLetter = companyInfo?.razon_social ? companyInfo.razon_social.charAt(0).toUpperCase() : 'E';
  doc.text(logoLetter, margin + 7.5, yPosition + 10, { align: 'center' });

  // Información de la empresa
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo?.razon_social || 'Empresa', margin + 20, yPosition + 6);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${companyInfo?.nit || 'No especificado'}`, margin + 20, yPosition + 12);
  doc.text(`${companyInfo?.direccion || 'No especificada'}`, margin + 20, yPosition + 16);

  // Título del documento
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE NÓMINA', pageWidth - margin, yPosition + 6, { align: 'right' });
  
  // Información del período
  doc.setFillColor(248, 249, 255);
  doc.rect(pageWidth - margin - 60, yPosition + 10, 60, 15, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${voucher.periodo}`, pageWidth - margin - 58, yPosition + 15);
  doc.text(`Desde: ${new Date(voucher.startDate).toLocaleDateString('es-CO')}`, pageWidth - margin - 58, yPosition + 19);
  doc.text(`Hasta: ${new Date(voucher.endDate).toLocaleDateString('es-CO')}`, pageWidth - margin - 58, yPosition + 23);

  yPosition += 40;

  // INFORMACIÓN DEL EMPLEADO
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, yPosition, contentWidth, 25, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('👤 Información del Empleado', margin + 5, yPosition + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  
  // Primera columna
  doc.text('NOMBRE COMPLETO', margin + 5, yPosition + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(voucher.employeeName, margin + 5, yPosition + 19);

  // Segunda columna
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('DOCUMENTO', margin + 70, yPosition + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(voucher.employeeCedula, margin + 70, yPosition + 19);

  // Tercera columna
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('CARGO', margin + 120, yPosition + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(voucher.employeePosition || 'No especificado', margin + 120, yPosition + 19);

  yPosition += 35;

  // TABLA DE DEVENGOS
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('💰 Devengos', margin, yPosition);
  yPosition += 10;

  // Encabezados de tabla
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Concepto', margin + 3, yPosition + 5);
  doc.text('Valor', pageWidth - margin - 25, yPosition + 5, { align: 'right' });
  yPosition += 8;

  // Filas de devengos
  const earnings = [
    { label: 'Salario Base', value: voucher.salaryDetails.baseSalary },
    { label: 'Horas Extra', value: voucher.salaryDetails.extraHours, show: voucher.salaryDetails.extraHours > 0 },
    { label: 'Recargo Nocturno', value: voucher.salaryDetails.nightSurcharge, show: voucher.salaryDetails.nightSurcharge > 0 },
    { label: 'Recargo Dominical', value: voucher.salaryDetails.sundaySurcharge, show: voucher.salaryDetails.sundaySurcharge > 0 },
    { label: 'Auxilio de Transporte', value: voucher.salaryDetails.transportAllowance, show: voucher.salaryDetails.transportAllowance > 0 },
    { label: 'Bonificaciones', value: voucher.salaryDetails.bonuses, show: voucher.salaryDetails.bonuses > 0 }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  for (const earning of earnings) {
    if (earning.show !== false) {
      doc.setTextColor(31, 41, 55);
      doc.text(earning.label, margin + 3, yPosition + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(formatCurrency(earning.value), pageWidth - margin - 3, yPosition + 4, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 6;
    }
  }

  yPosition += 5;

  // TABLA DE DEDUCCIONES
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('📉 Deducciones', margin, yPosition);
  yPosition += 10;

  // Encabezados de tabla
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Concepto', margin + 3, yPosition + 5);
  doc.text('Valor', pageWidth - margin - 25, yPosition + 5, { align: 'right' });
  yPosition += 8;

  // Filas de deducciones
  const deductions = [
    { label: 'Salud (4%)', value: voucher.salaryDetails.healthContribution, show: voucher.salaryDetails.healthContribution > 0 },
    { label: 'Pensión (4%)', value: voucher.salaryDetails.pensionContribution, show: voucher.salaryDetails.pensionContribution > 0 },
    { label: 'Retención en la Fuente', value: voucher.salaryDetails.withholdingTax, show: voucher.salaryDetails.withholdingTax > 0 },
    { label: 'Otras Deducciones', value: voucher.salaryDetails.otherDeductions, show: voucher.salaryDetails.otherDeductions > 0 }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  for (const deduction of deductions) {
    if (deduction.show !== false) {
      doc.setTextColor(31, 41, 55);
      doc.text(deduction.label, margin + 3, yPosition + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(formatCurrency(deduction.value), pageWidth - margin - 3, yPosition + 4, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 6;
    }
  }

  yPosition += 10;

  // TOTALES
  doc.setFillColor(102, 126, 234);
  doc.rect(margin, yPosition, contentWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Total Devengado:', margin + 5, yPosition + 8);
  doc.text(formatCurrency(voucher.salaryDetails.totalEarnings), pageWidth - margin - 5, yPosition + 8, { align: 'right' });
  
  doc.text('Total Deducciones:', margin + 5, yPosition + 14);
  doc.text(formatCurrency(voucher.salaryDetails.totalDeductions), pageWidth - margin - 5, yPosition + 14, { align: 'right' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NETO A PAGAR:', margin + 5, yPosition + 21);
  doc.text(formatCurrency(voucher.netPay), pageWidth - margin - 5, yPosition + 21, { align: 'right' });

  yPosition += 35;

  // NETO A PAGAR DESTACADO
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, yPosition, contentWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('💵 NETO A PAGAR', pageWidth / 2, yPosition + 8, { align: 'center' });
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(voucher.netPay), pageWidth / 2, yPosition + 16, { align: 'center' });

  yPosition += 30;

  // FOOTER
  doc.setDrawColor(240, 240, 240);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const generationDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  doc.text(`Fecha de generación: ${generationDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  
  doc.setFillColor(254, 243, 199);
  doc.rect(margin, yPosition, contentWidth, 12, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(7);
  doc.text('⚠️ IMPORTANTE: Este comprobante es un documento informativo y no reemplaza la nómina electrónica oficial.', margin + 2, yPosition + 4);
  doc.text('Para consultas sobre este comprobante, contacte al departamento de recursos humanos.', margin + 2, yPosition + 8);
  
  yPosition += 18;
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(6);
  doc.text('Comprobante generado electrónicamente • Válido sin firma autógrafa', pageWidth / 2, yPosition, { align: 'center' });

  // Convertir a buffer
  const pdfBuffer = doc.output('arraybuffer');
  return new Uint8Array(pdfBuffer);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    const { voucherId, regenerate = false, employee, period } = requestBody;

    console.log('Generating voucher PDF for:', { voucherId, employee: employee?.name, period: period?.startDate });

    let voucherData: VoucherData;
    let company: any;

    if (voucherId) {
      // Existing voucher flow
      const { data: voucher, error: voucherError } = await supabase
        .from('payroll_vouchers')
        .select(`
          *,
          employees (nombre, apellido, cedula, email, cargo),
          payrolls (
            salario_base, 
            total_devengado, 
            total_deducciones, 
            salud_empleado, 
            pension_empleado, 
            retencion_fuente, 
            bonificaciones,
            horas_extra,
            recargo_nocturno,
            recargo_dominical,
            auxilio_transporte,
            otras_deducciones
          )
        `)
        .eq('id', voucherId)
        .single();

      if (voucherError || !voucher) {
        console.error('Voucher not found:', voucherError);
        throw new Error('Comprobante no encontrado');
      }

      console.log('Voucher found:', voucher.id);

      // Obtener información de la empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', voucher.company_id)
        .single();

      company = companyData;

      voucherData = {
        voucherId: voucher.id,
        companyId: voucher.company_id,
        employeeName: `${voucher.employees.nombre} ${voucher.employees.apellido}`,
        employeeId: voucher.employee_id,
        employeeCedula: voucher.employees.cedula,
        employeePosition: voucher.employees.cargo,
        periodo: voucher.periodo,
        startDate: voucher.start_date,
        endDate: voucher.end_date,
        netPay: voucher.net_pay,
        salaryDetails: {
          baseSalary: voucher.payrolls?.salario_base || voucher.net_pay,
          extraHours: voucher.payrolls?.horas_extra || 0,
          nightSurcharge: voucher.payrolls?.recargo_nocturno || 0,
          sundaySurcharge: voucher.payrolls?.recargo_dominical || 0,
          transportAllowance: voucher.payrolls?.auxilio_transporte || 0,
          bonuses: voucher.payrolls?.bonificaciones || 0,
          totalEarnings: voucher.payrolls?.total_devengado || voucher.net_pay,
          healthContribution: voucher.payrolls?.salud_empleado || 0,
          pensionContribution: voucher.payrolls?.pension_empleado || 0,
          withholdingTax: voucher.payrolls?.retencion_fuente || 0,
          otherDeductions: voucher.payrolls?.otras_deducciones || 0,
          totalDeductions: voucher.payrolls?.total_deducciones || 0
        }
      };
    } else if (employee && period) {
      // Direct generation from employee and period data
      console.log('Generating voucher from direct employee data');
      
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: userCompany } = await supabase
        .from('user_company_assignments')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userCompany) throw new Error('Usuario sin empresa asignada');

      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userCompany.company_id)
        .single();

      company = companyData;

      // Get employee details from database
      const { data: employeeData } = await supabase
        .from('employees')
        .select('nombre, apellido, cedula, cargo')
        .eq('id', employee.id)
        .single();

      const transportAllowance = employee.baseSalary <= 2600000 ? 200000 : 0;
      const healthContribution = employee.baseSalary * 0.04;
      const pensionContribution = employee.baseSalary * 0.04;
      const totalDeductions = healthContribution + pensionContribution + (employee.deductions || 0);
      const totalEarnings = employee.baseSalary + transportAllowance + (employee.bonuses || 0);

      voucherData = {
        voucherId: 'temp-' + Date.now(),
        companyId: userCompany.company_id,
        employeeName: employeeData ? `${employeeData.nombre} ${employeeData.apellido}` : employee.name,
        employeeId: employee.id,
        employeeCedula: employeeData?.cedula || 'Sin documento',
        employeePosition: employeeData?.cargo || employee.position || 'Sin cargo',
        periodo: `${period.startDate} - ${period.endDate}`,
        startDate: period.startDate,
        endDate: period.endDate,
        netPay: employee.netPay || totalEarnings - totalDeductions,
        salaryDetails: {
          baseSalary: employee.baseSalary,
          extraHours: employee.extraHours || 0,
          nightSurcharge: 0,
          sundaySurcharge: 0,
          transportAllowance,
          bonuses: employee.bonuses || 0,
          totalEarnings,
          healthContribution,
          pensionContribution,
          withholdingTax: 0,
          otherDeductions: (employee.deductions || 0) - healthContribution - pensionContribution,
          totalDeductions
        }
      };
    } else {
      throw new Error('Datos insuficientes: se requiere voucherId o employee + period');
    }

    console.log('Company found:', company?.razon_social);

    // Generar PDF buffer
    const pdfBuffer = await generatePDFBuffer(voucherData, company);
    
    // Update voucher status only if it's an existing voucher
    if (voucherId && voucherId !== 'temp-' + Date.now()) {
      await supabase
        .from('payroll_vouchers')
        .update({ 
          voucher_status: 'generado',
          updated_at: new Date().toISOString()
        })
        .eq('id', voucherId);

      console.log('Voucher updated successfully');
    }

    const fileName = `comprobante-nomina_${voucherData.employeeCedula}_${voucherData.periodo.replace(/\s+/g, '_')}.pdf`;

    return new Response(pdfBuffer, {
      headers: { 
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        ...corsHeaders 
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
