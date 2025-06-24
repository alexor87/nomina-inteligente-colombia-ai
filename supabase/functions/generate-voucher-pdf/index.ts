
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
        @page {
          size: A4;
          margin: 20mm;
        }
        body { 
          font-family: Arial, sans-serif; 
          margin: 0;
          padding: 0;
          background-color: white;
          color: #333;
          font-size: 12px;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .company-logo {
          width: 80px;
          height: 50px;
          background-color: #f8fafc;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-weight: bold;
          color: #64748b;
        }
        .company-info, .employee-info { 
          margin-bottom: 25px; 
          background-color: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .section-title { 
          font-weight: bold; 
          color: #1e293b; 
          font-size: 14px; 
          margin-bottom: 12px;
          text-transform: uppercase;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 5px;
          letter-spacing: 0.5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 25px;
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 10px 0; 
          border-bottom: 1px solid #e2e8f0; 
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 500;
          color: #475569;
        }
        .detail-value {
          font-weight: 600;
          color: #1e293b;
        }
        .total-row { 
          font-weight: bold; 
          background-color: #f1f5f9; 
          padding: 15px; 
          margin-top: 15px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }
        .net-pay-row {
          background-color: #dbeafe; 
          font-size: 16px;
          color: #1d4ed8;
          border: 2px solid #3b82f6;
        }
        .signature-section { 
          margin-top: 40px; 
          text-align: center;
          border-top: 2px solid #e2e8f0;
          padding-top: 25px;
        }
        .payroll-details {
          margin-bottom: 25px;
        }
        .earnings-section, .deductions-section {
          margin-bottom: 25px;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .section-header {
          background-color: #f8fafc;
          padding: 12px 15px;
          font-weight: bold;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-content {
          padding: 15px;
        }
        @media print {
          body { 
            margin: 0;
            font-size: 11px;
          }
          .header { 
            page-break-inside: avoid; 
          }
          .info-grid {
            page-break-inside: avoid;
          }
          .earnings-section, .deductions-section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-logo">LOGO</div>
        <h1 style="margin: 0; color: #1e293b; font-size: 18px;">COMPROBANTE DE PAGO DE NÓMINA</h1>
        <p style="margin: 10px 0 0 0; color: #64748b;"><strong>Período:</strong> ${new Date(voucher.startDate).toLocaleDateString('es-CO')} al ${new Date(voucher.endDate).toLocaleDateString('es-CO')}</p>
      </div>

      <div class="info-grid">
        <div class="company-info">
          <div class="section-title">Información de la Empresa</div>
          <div class="detail-row">
            <span class="detail-label">Razón Social:</span>
            <span class="detail-value">${companyInfo?.razon_social || 'No especificada'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">NIT:</span>
            <span class="detail-value">${companyInfo?.nit || 'No especificado'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dirección:</span>
            <span class="detail-value">${companyInfo?.direccion || 'No especificada'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Teléfono:</span>
            <span class="detail-value">${companyInfo?.telefono || 'No especificado'}</span>
          </div>
        </div>

        <div class="employee-info">
          <div class="section-title">Información del Empleado</div>
          <div class="detail-row">
            <span class="detail-label">Nombre:</span>
            <span class="detail-value">${voucher.employeeName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Cédula:</span>
            <span class="detail-value">${voucher.employeeCedula}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Período:</span>
            <span class="detail-value">${voucher.periodo}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">ID Empleado:</span>
            <span class="detail-value">${voucher.employeeId}</span>
          </div>
        </div>
      </div>

      <div class="earnings-section">
        <div class="section-header">💰 DEVENGADOS</div>
        <div class="section-content">
          <div class="detail-row">
            <span class="detail-label">Salario Básico</span>
            <span class="detail-value">$${voucher.salaryDetails.baseSalary.toLocaleString('es-CO')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Horas Extra</span>
            <span class="detail-value">$${voucher.salaryDetails.overtime.toLocaleString('es-CO')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Bonificaciones</span>
            <span class="detail-value">$${voucher.salaryDetails.bonuses.toLocaleString('es-CO')}</span>
          </div>
          <div class="total-row">
            <div class="detail-row">
              <span>TOTAL DEVENGADO</span>
              <span>$${voucher.salaryDetails.totalEarnings.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="deductions-section">
        <div class="section-header">📉 DEDUCCIONES</div>
        <div class="section-content">
          <div class="detail-row">
            <span class="detail-label">Salud (4%)</span>
            <span class="detail-value">$${voucher.salaryDetails.healthContribution.toLocaleString('es-CO')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Pensión (4%)</span>
            <span class="detail-value">$${voucher.salaryDetails.pensionContribution.toLocaleString('es-CO')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Retención en la Fuente</span>
            <span class="detail-value">$${voucher.salaryDetails.withholdingTax.toLocaleString('es-CO')}</span>
          </div>
          <div class="total-row">
            <div class="detail-row">
              <span>TOTAL DEDUCCIONES</span>
              <span>$${voucher.salaryDetails.totalDeductions.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="total-row net-pay-row">
        <div class="detail-row">
          <span style="font-size: 18px;">💵 NETO A PAGAR</span>
          <span style="font-size: 18px;">$${voucher.netPay.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div class="signature-section">
        <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p style="margin-top: 25px; font-size: 11px; color: #64748b;">
          Este documento fue generado electrónicamente y es válido sin firma autógrafa.
        </p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 20px;">
          Para consultas sobre este comprobante, contacte al departamento de recursos humanos.
        </p>
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

    const { voucherId, regenerate = false } = await req.json();

    console.log('Generating voucher PDF for:', voucherId);

    // Obtener datos del comprobante
    const { data: voucher, error: voucherError } = await supabase
      .from('payroll_vouchers')
      .select(`
        *,
        employees (nombre, apellido, cedula, email),
        payrolls (salario_base, total_devengado, total_deducciones, salud_empleado, pension_empleado, retencion_fuente, bonificaciones)
      `)
      .eq('id', voucherId)
      .single();

    if (voucherError || !voucher) {
      console.error('Voucher not found:', voucherError);
      throw new Error('Comprobante no encontrado');
    }

    console.log('Voucher found:', voucher.id);

    // Obtener información de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', voucher.company_id)
      .single();

    console.log('Company found:', company?.razon_social);

    const voucherData: VoucherData = {
      voucherId: voucher.id,
      companyId: voucher.company_id,
      employeeName: `${voucher.employees.nombre} ${voucher.employees.apellido}`,
      employeeId: voucher.employee_id,
      employeeCedula: voucher.employees.cedula,
      periodo: voucher.periodo,
      startDate: voucher.start_date,
      endDate: voucher.end_date,
      netPay: voucher.net_pay,
      salaryDetails: {
        baseSalary: voucher.payrolls?.salario_base || voucher.net_pay,
        overtime: 0,
        bonuses: voucher.payrolls?.bonificaciones || 0,
        totalEarnings: voucher.payrolls?.total_devengado || voucher.net_pay,
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
        updated_at: new Date().toISOString()
      })
      .eq('id', voucherId);

    console.log('Voucher updated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      htmlContent: htmlContent,
      fileName: `comprobante_${voucherData.employeeCedula}_${voucherData.periodo.replace(/\s+/g, '_')}.html`
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
