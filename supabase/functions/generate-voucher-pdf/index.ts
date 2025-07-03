
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
    workedDays: number;
    extraHours: number;
    extraHoursPay: number;
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
  // Importar jsPDF correctamente
  const jsPDFModule = await import("https://esm.sh/jspdf@2.5.1");
  const { jsPDF } = jsPDFModule.default || jsPDFModule;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica');
  
  let yPosition = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // HEADER PRINCIPAL
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, yPosition, contentWidth, 25, 'F');
  
  // Logo/Inicial empresa
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 12, yPosition + 12.5, 8, 'F');
  doc.setTextColor(41, 128, 185);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const logoLetter = companyInfo?.razon_social ? companyInfo.razon_social.charAt(0).toUpperCase() : 'E';
  doc.text(logoLetter, margin + 12, yPosition + 16, { align: 'center' });

  // Información empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo?.razon_social || 'EMPRESA', margin + 25, yPosition + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${companyInfo?.nit || 'No especificado'}`, margin + 25, yPosition + 16);
  doc.text(`${companyInfo?.direccion || 'Dirección no especificada'}`, margin + 25, yPosition + 21);

  // Título documento
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE PAGO', pageWidth - margin - 5, yPosition + 12, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${voucher.periodo}`, pageWidth - margin - 5, yPosition + 18, { align: 'right' });

  yPosition += 35;

  // INFORMACIÓN DEL EMPLEADO
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPosition, contentWidth, 20, 'F');
  
  doc.setTextColor(52, 73, 94);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL EMPLEADO', margin + 5, yPosition + 8);

  // Datos empleado en dos columnas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(85, 85, 85);
  
  // Columna izquierda
  doc.text('NOMBRE:', margin + 5, yPosition + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(voucher.employeeName, margin + 25, yPosition + 14);
  
  // Columna derecha
  doc.setFont('helvetica', 'normal');
  doc.text('DOCUMENTO:', margin + 105, yPosition + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(voucher.employeeCedula, margin + 135, yPosition + 14);
  
  doc.setFont('helvetica', 'normal');
  doc.text('CARGO:', margin + 105, yPosition + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(voucher.employeePosition || 'No especificado', margin + 125, yPosition + 18);

  yPosition += 30;

  // RESUMEN DEL PAGO (Destacado)
  doc.setFillColor(46, 204, 113);
  doc.rect(margin, yPosition, contentWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DEL PAGO', pageWidth / 2, yPosition + 8, { align: 'center' });
  
  doc.setFontSize(20);
  doc.text(formatCurrency(voucher.netPay), pageWidth / 2, yPosition + 18, { align: 'center' });

  yPosition += 35;

  // TABLA: DEVENGOS
  doc.setTextColor(52, 73, 94);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVENGOS', margin, yPosition);
  yPosition += 8;

  // Encabezado tabla
  doc.setFillColor(189, 195, 199);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', margin + 2, yPosition + 5);
  doc.text('DÍAS/HORAS', margin + 80, yPosition + 5);
  doc.text('VALOR', pageWidth - margin - 20, yPosition + 5, { align: 'right' });
  yPosition += 8;

  // Calcular salario proporcional para el PDF
  const dailySalary = voucher.salaryDetails.baseSalary / 30;
  const proportionalSalary = Math.round(dailySalary * voucher.salaryDetails.workedDays);

  // Filas de conceptos de devengos
  const devengosConceptos = [
    { concepto: 'Salario Básico', cantidad: voucher.salaryDetails.workedDays + ' días', valor: proportionalSalary },
    { concepto: 'Horas Extra 25%', cantidad: voucher.salaryDetails.extraHours + ' hrs', valor: voucher.salaryDetails.extraHoursPay || 0, show: voucher.salaryDetails.extraHours > 0 },
    { concepto: 'Auxilio de Transporte', cantidad: voucher.salaryDetails.workedDays + ' días', valor: voucher.salaryDetails.transportAllowance || 0, show: voucher.salaryDetails.transportAllowance > 0 },
    { concepto: 'Bonificaciones', cantidad: '1', valor: voucher.salaryDetails.bonuses || 0, show: voucher.salaryDetails.bonuses > 0 }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);

  for (const concepto of devengosConceptos) {
    if (concepto.show !== false && concepto.valor > 0) {
      doc.text(concepto.concepto, margin + 2, yPosition + 4);
      doc.text(concepto.cantidad, margin + 80, yPosition + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 125, 50);
      doc.text(formatCurrency(concepto.valor), pageWidth - margin - 2, yPosition + 4, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(85, 85, 85);
      yPosition += 6;
    }
  }

  // Total devengado
  yPosition += 3;
  doc.setFillColor(232, 245, 233);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 94, 32);
  doc.setFontSize(10);
  doc.text('TOTAL DEVENGADO', margin + 2, yPosition + 5);
  doc.text(formatCurrency(voucher.salaryDetails.totalEarnings), pageWidth - margin - 2, yPosition + 5, { align: 'right' });

  yPosition += 15;

  // TABLA: DEDUCCIONES
  doc.setTextColor(52, 73, 94);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DEDUCCIONES', margin, yPosition);
  yPosition += 8;

  // Encabezado tabla
  doc.setFillColor(189, 195, 199);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', margin + 2, yPosition + 5);
  doc.text('BASE', margin + 70, yPosition + 5);
  doc.text('%', margin + 110, yPosition + 5);
  doc.text('VALOR', pageWidth - margin - 20, yPosition + 5, { align: 'right' });
  yPosition += 8;

  // Base para deducciones (sin auxilio de transporte)
  const baseForDeductions = proportionalSalary + (voucher.salaryDetails.extraHoursPay || 0) + (voucher.salaryDetails.bonuses || 0);
  
  const deduccionesConceptos = [
    { concepto: 'Salud (4%)', base: baseForDeductions, porcentaje: '4.00%', valor: voucher.salaryDetails.healthContribution, show: voucher.salaryDetails.healthContribution > 0 },
    { concepto: 'Pensión (4%)', base: baseForDeductions, porcentaje: '4.00%', valor: voucher.salaryDetails.pensionContribution, show: voucher.salaryDetails.pensionContribution > 0 },
    { concepto: 'Retención Fuente', base: baseForDeductions, porcentaje: 'Var', valor: voucher.salaryDetails.withholdingTax || 0, show: voucher.salaryDetails.withholdingTax > 0 },
    { concepto: 'Otras Deducciones', base: 0, porcentaje: '-', valor: voucher.salaryDetails.otherDeductions || 0, show: voucher.salaryDetails.otherDeductions > 0 }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);

  for (const deduccion of deduccionesConceptos) {
    if (deduccion.show !== false && deduccion.valor > 0) {
      doc.text(deduccion.concepto, margin + 2, yPosition + 4);
      doc.text(deduccion.base > 0 ? formatCurrency(deduccion.base) : '-', margin + 62, yPosition + 4);
      doc.text(deduccion.porcentaje, margin + 110, yPosition + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(211, 47, 47);
      doc.text(formatCurrency(deduccion.valor), pageWidth - margin - 2, yPosition + 4, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(85, 85, 85);
      yPosition += 6;
    }
  }

  // Total deducciones
  yPosition += 3;
  doc.setFillColor(255, 235, 238);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(183, 28, 28);
  doc.setFontSize(10);
  doc.text('TOTAL DEDUCCIONES', margin + 2, yPosition + 5);
  doc.text(formatCurrency(voucher.salaryDetails.totalDeductions), pageWidth - margin - 2, yPosition + 5, { align: 'right' });

  yPosition += 15;

  // NETO A PAGAR FINAL
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, yPosition, contentWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NETO A PAGAR', margin + 5, yPosition + 10);
  doc.setFontSize(18);
  doc.text(formatCurrency(voucher.netPay), pageWidth - margin - 5, yPosition + 10, { align: 'right' });

  yPosition += 30;

  // FIRMAS
  const firmaWidth = 60;
  const espacioFirmas = (contentWidth - (firmaWidth * 2)) / 3;
  
  // Líneas para firmas
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + espacioFirmas, yPosition, margin + espacioFirmas + firmaWidth, yPosition);
  doc.line(pageWidth - margin - espacioFirmas - firmaWidth, yPosition, pageWidth - margin - espacioFirmas, yPosition);
  
  // Etiquetas firmas
  doc.setTextColor(85, 85, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPLEADO', margin + espacioFirmas + (firmaWidth / 2), yPosition + 5, { align: 'center' });
  doc.text('EMPLEADOR', pageWidth - margin - espacioFirmas - (firmaWidth / 2), yPosition + 5, { align: 'center' });

  yPosition += 15;

  // FOOTER LEGAL
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPosition, contentWidth, 15, 'F');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.text('Este comprobante de pago es válido sin firma autógrafa • Generado electrónicamente', pageWidth / 2, yPosition + 5, { align: 'center' });
  
  const generationDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha de generación: ${generationDate}`, pageWidth / 2, yPosition + 10, { align: 'center' });

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
    const { voucherId, employee, period } = requestBody;

    console.log('🔄 Generando comprobante PDF para:', { voucherId, employee: employee?.name, period: period?.startDate });

    let voucherData: VoucherData;
    let company: any;

    if (voucherId) {
      // Flujo de voucher existente
      const { data: voucher, error: voucherError } = await supabase
        .from('payroll_vouchers')
        .select(`
          *,
          employees (nombre, apellido, cedula, email, cargo),
          payrolls (*)
        `)
        .eq('id', voucherId)
        .single();

      if (voucherError || !voucher) {
        console.error('Voucher no encontrado:', voucherError);
        throw new Error('Comprobante no encontrado');
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', voucher.company_id)
        .single();

      company = companyData;

      // Usar datos del payroll si están disponibles
      const payrollData = voucher.payrolls;
      const baseSalary = payrollData?.salario_base || voucher.net_pay;
      const workedDays = payrollData?.dias_trabajados || 30;
      const dailySalary = baseSalary / 30;
      const proportionalSalary = Math.round(dailySalary * workedDays);

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
          baseSalary: baseSalary,
          workedDays: workedDays,
          extraHours: payrollData?.horas_extra || 0,
          extraHoursPay: Math.round((payrollData?.horas_extra || 0) * (baseSalary / 192) * 1.25),
          nightSurcharge: payrollData?.recargo_nocturno || 0,
          sundaySurcharge: payrollData?.recargo_dominical || 0,
          transportAllowance: payrollData?.auxilio_transporte || 0,
          bonuses: payrollData?.bonificaciones || 0,
          totalEarnings: payrollData?.total_devengado || voucher.net_pay,
          healthContribution: payrollData?.salud_empleado || Math.round(proportionalSalary * 0.04),
          pensionContribution: payrollData?.pension_empleado || Math.round(proportionalSalary * 0.04),
          withholdingTax: payrollData?.retencion_fuente || 0,
          otherDeductions: payrollData?.otras_deducciones || 0,
          totalDeductions: payrollData?.total_deducciones || Math.round(proportionalSalary * 0.08)
        }
      };
    } else if (employee && period) {
      // Generación directa desde datos del empleado
      console.log('🔄 Generando comprobante desde datos directos del empleado');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Usuario sin empresa asignada');

      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      company = companyData;

      const { data: employeeData } = await supabase
        .from('employees')
        .select('nombre, apellido, cedula, cargo')
        .eq('id', employee.id)
        .single();

      // Calcular valores usando la lógica corregida
      const baseSalary = employee.baseSalary || 0;
      const workedDays = employee.workedDays || 30;
      const extraHours = employee.extraHours || 0;
      const bonuses = employee.bonuses || 0;
      
      // Cálculo proporcional como Aleluya
      const dailySalary = baseSalary / 30;
      const proportionalSalary = Math.round(dailySalary * workedDays);
      
      // Horas extra
      const hourlyRate = baseSalary / 192;
      const extraHoursPay = Math.round(extraHours * hourlyRate * 1.25);
      
      // Auxilio de transporte
      const transportAllowance = baseSalary <= 2600000 ? Math.round((200000 / 30) * workedDays) : 0;
      
      // Total devengado
      const totalEarnings = proportionalSalary + extraHoursPay + transportAllowance + bonuses;
      
      // Deducciones sobre base sin auxilio
      const baseForDeductions = proportionalSalary + extraHoursPay + bonuses;
      const healthContribution = Math.round(baseForDeductions * 0.04);
      const pensionContribution = Math.round(baseForDeductions * 0.04);
      const totalDeductions = healthContribution + pensionContribution;
      const netPay = totalEarnings - totalDeductions;

      voucherData = {
        voucherId: 'temp-' + Date.now(),
        companyId: profile.company_id,
        employeeName: employeeData ? `${employeeData.nombre} ${employeeData.apellido}` : employee.name,
        employeeId: employee.id,
        employeeCedula: employeeData?.cedula || 'Sin documento',
        employeePosition: employeeData?.cargo || employee.position || 'Sin cargo',
        periodo: `${period.startDate} - ${period.endDate}`,
        startDate: period.startDate,
        endDate: period.endDate,
        netPay: netPay,
        salaryDetails: {
          baseSalary,
          workedDays,
          extraHours,
          extraHoursPay,
          nightSurcharge: 0,
          sundaySurcharge: 0,
          transportAllowance,
          bonuses,
          totalEarnings,
          healthContribution,
          pensionContribution,
          withholdingTax: 0,
          otherDeductions: 0,
          totalDeductions
        }
      };
    } else {
      throw new Error('Datos insuficientes: se requiere voucherId o employee + period');
    }

    console.log('🏢 Empresa encontrada:', company?.razon_social);
    console.log('📄 Datos del voucher:', JSON.stringify(voucherData, null, 2));

    const pdfBuffer = await generatePDFBuffer(voucherData, company);
    
    if (voucherId && !voucherId.startsWith('temp-')) {
      await supabase
        .from('payroll_vouchers')
        .update({ 
          voucher_status: 'generado',
          updated_at: new Date().toISOString()
        })
        .eq('id', voucherId);

      console.log('✅ Voucher actualizado exitosamente');
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
    console.error('❌ Error generando PDF:', error);
    
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
