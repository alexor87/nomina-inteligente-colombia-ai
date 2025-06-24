
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
  periodo: string;
  startDate: string;
  endDate: string;
  netPay: number;
  salaryDetails: {
    baseSalary: number;
    overtime: number;
    bonuses: number;
    totalEarnings: number;
    healthContribution: number;
    pensionContribution: number;
    withholdingTax: number;
    totalDeductions: number;
  };
}

const generatePDFContent = (voucher: VoucherData, companyInfo: any) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Comprobante de Pago - ${voucher.employeeName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { margin-bottom: 20px; }
        .employee-info { margin-bottom: 30px; }
        .payroll-details { margin-bottom: 30px; }
        .section-title { font-weight: bold; color: #333; font-size: 16px; margin-bottom: 10px; }
        .detail-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; background-color: #f5f5f5; padding: 10px; margin-top: 10px; }
        .signature-section { margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>COMPROBANTE DE PAGO DE NÓMINA</h1>
        <p>Período: ${voucher.startDate} - ${voucher.endDate}</p>
      </div>

      <div class="company-info">
        <div class="section-title">INFORMACIÓN DE LA EMPRESA</div>
        <p><strong>Razón Social:</strong> ${companyInfo.razon_social}</p>
        <p><strong>NIT:</strong> ${companyInfo.nit}</p>
        <p><strong>Dirección:</strong> ${companyInfo.direccion || 'No especificada'}</p>
      </div>

      <div class="employee-info">
        <div class="section-title">INFORMACIÓN DEL EMPLEADO</div>
        <p><strong>Nombre:</strong> ${voucher.employeeName}</p>
        <p><strong>Período:</strong> ${voucher.periodo}</p>
      </div>

      <div class="payroll-details">
        <div class="section-title">DEVENGADOS</div>
        <div class="detail-row">
          <span>Salario Básico</span>
          <span>$${voucher.salaryDetails.baseSalary.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span>Horas Extra</span>
          <span>$${voucher.salaryDetails.overtime.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span>Bonificaciones</span>
          <span>$${voucher.salaryDetails.bonuses.toLocaleString()}</span>
        </div>
        <div class="total-row">
          <div class="detail-row">
            <span>TOTAL DEVENGADO</span>
            <span>$${voucher.salaryDetails.totalEarnings.toLocaleString()}</span>
          </div>
        </div>

        <div class="section-title" style="margin-top: 30px;">DEDUCCIONES</div>
        <div class="detail-row">
          <span>Salud (4%)</span>
          <span>$${voucher.salaryDetails.healthContribution.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span>Pensión (4%)</span>
          <span>$${voucher.salaryDetails.pensionContribution.toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span>Retención en la Fuente</span>
          <span>$${voucher.salaryDetails.withholdingTax.toLocaleString()}</span>
        </div>
        <div class="total-row">
          <div class="detail-row">
            <span>TOTAL DEDUCCIONES</span>
            <span>$${voucher.salaryDetails.totalDeductions.toLocaleString()}</span>
          </div>
        </div>

        <div class="total-row" style="background-color: #e3f2fd; margin-top: 20px;">
          <div class="detail-row">
            <span style="font-size: 18px;">NETO A PAGAR</span>
            <span style="font-size: 18px;">$${voucher.netPay.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="signature-section">
        <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
        <p>Este documento fue generado electrónicamente.</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { voucherId } = await req.json();

    // Obtener datos del comprobante
    const { data: voucher, error: voucherError } = await supabase
      .from('payroll_vouchers')
      .select(`
        *,
        employees (nombre, apellido, cedula),
        payrolls (salario_base, total_devengado, total_deducciones, salud_empleado, pension_empleado, retencion_fuente)
      `)
      .eq('id', voucherId)
      .single();

    if (voucherError || !voucher) {
      throw new Error('Comprobante no encontrado');
    }

    // Obtener información de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', voucher.company_id)
      .single();

    const voucherData: VoucherData = {
      voucherId: voucher.id,
      companyId: voucher.company_id,
      employeeName: `${voucher.employees.nombre} ${voucher.employees.apellido}`,
      employeeId: voucher.employee_id,
      periodo: voucher.periodo,
      startDate: voucher.start_date,
      endDate: voucher.end_date,
      netPay: voucher.net_pay,
      salaryDetails: {
        baseSalary: voucher.payrolls?.salario_base || 0,
        overtime: 0,
        bonuses: 0,
        totalEarnings: voucher.payrolls?.total_devengado || 0,
        healthContribution: voucher.payrolls?.salud_empleado || 0,
        pensionContribution: voucher.payrolls?.pension_empleado || 0,
        withholdingTax: voucher.payrolls?.retencion_fuente || 0,
        totalDeductions: voucher.payrolls?.total_deducciones || 0
      }
    };

    const htmlContent = generatePDFContent(voucherData, company);

    // Actualizar el comprobante con el estado generado
    await supabase
      .from('payroll_vouchers')
      .update({ 
        voucher_status: 'generado',
        pdf_url: `#/voucher/${voucherId}.pdf` // URL simulada
      })
      .eq('id', voucherId);

    return new Response(JSON.stringify({ 
      success: true, 
      pdfUrl: `#/voucher/${voucherId}.pdf`,
      htmlContent 
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
