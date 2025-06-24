
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
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          background-color: white;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #333; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .company-logo {
          width: 100px;
          height: 60px;
          background-color: #f0f0f0;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd;
        }
        .company-info { 
          margin-bottom: 20px; 
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
        }
        .employee-info { 
          margin-bottom: 30px; 
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
        }
        .payroll-details { 
          margin-bottom: 30px; 
        }
        .section-title { 
          font-weight: bold; 
          color: #333; 
          font-size: 16px; 
          margin-bottom: 10px;
          text-transform: uppercase;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 8px 0; 
          border-bottom: 1px solid #eee; 
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .total-row { 
          font-weight: bold; 
          background-color: #f5f5f5; 
          padding: 15px; 
          margin-top: 10px;
          border-radius: 5px;
        }
        .net-pay-row {
          background-color: #e3f2fd; 
          font-size: 18px;
          color: #1976d2;
        }
        .signature-section { 
          margin-top: 50px; 
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media print {
          body { margin: 0; }
          .header { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-logo">LOGO</div>
        <h1>COMPROBANTE DE PAGO DE NÓMINA</h1>
        <p><strong>Período:</strong> ${voucher.startDate} al ${voucher.endDate}</p>
      </div>

      <div class="info-grid">
        <div class="company-info">
          <div class="section-title">Información de la Empresa</div>
          <p><strong>Razón Social:</strong> ${companyInfo.razon_social}</p>
          <p><strong>NIT:</strong> ${companyInfo.nit}</p>
          <p><strong>Dirección:</strong> ${companyInfo.direccion || 'No especificada'}</p>
          <p><strong>Teléfono:</strong> ${companyInfo.telefono || 'No especificado'}</p>
        </div>

        <div class="employee-info">
          <div class="section-title">Información del Empleado</div>
          <p><strong>Nombre:</strong> ${voucher.employeeName}</p>
          <p><strong>Cédula:</strong> ${voucher.employeeCedula}</p>
          <p><strong>Período:</strong> ${voucher.periodo}</p>
          <p><strong>Empleado ID:</strong> ${voucher.employeeId}</p>
        </div>
      </div>

      <div class="payroll-details">
        <div class="section-title">Devengados</div>
        <div class="detail-row">
          <span>Salario Básico</span>
          <span>$${voucher.salaryDetails.baseSalary.toLocaleString('es-CO')}</span>
        </div>
        <div class="detail-row">
          <span>Horas Extra</span>
          <span>$${voucher.salaryDetails.overtime.toLocaleString('es-CO')}</span>
        </div>
        <div class="detail-row">
          <span>Bonificaciones</span>
          <span>$${voucher.salaryDetails.bonuses.toLocaleString('es-CO')}</span>
        </div>
        <div class="total-row">
          <div class="detail-row">
            <span>TOTAL DEVENGADO</span>
            <span>$${voucher.salaryDetails.totalEarnings.toLocaleString('es-CO')}</span>
          </div>
        </div>

        <div class="section-title" style="margin-top: 30px;">Deducciones</div>
        <div class="detail-row">
          <span>Salud (4%)</span>
          <span>$${voucher.salaryDetails.healthContribution.toLocaleString('es-CO')}</span>
        </div>
        <div class="detail-row">
          <span>Pensión (4%)</span>
          <span>$${voucher.salaryDetails.pensionContribution.toLocaleString('es-CO')}</span>
        </div>
        <div class="detail-row">
          <span>Retención en la Fuente</span>
          <span>$${voucher.salaryDetails.withholdingTax.toLocaleString('es-CO')}</span>
        </div>
        <div class="total-row">
          <div class="detail-row">
            <span>TOTAL DEDUCCIONES</span>
            <span>$${voucher.salaryDetails.totalDeductions.toLocaleString('es-CO')}</span>
          </div>
        </div>

        <div class="total-row net-pay-row" style="margin-top: 20px;">
          <div class="detail-row">
            <span>NETO A PAGAR</span>
            <span>$${voucher.netPay.toLocaleString('es-CO')}</span>
          </div>
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
        <p style="margin-top: 20px;">Este documento fue generado electrónicamente y es válido sin firma.</p>
        <p style="font-size: 12px; color: #666; margin-top: 30px;">
          Para consultas sobre este comprobante, contacte al departamento de recursos humanos.
        </p>
      </div>
    </body>
    </html>
  `;
};

// Función para convertir HTML a PDF usando Puppeteer (simulado)
const convertHtmlToPdf = async (htmlContent: string): Promise<Uint8Array> => {
  // En un entorno real, aquí usarías una librería como Puppeteer o jsPDF
  // Por ahora, retornamos el HTML como bytes para simular un PDF
  const encoder = new TextEncoder();
  return encoder.encode(htmlContent);
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
      employeeCedula: voucher.employees.cedula,
      periodo: voucher.periodo,
      startDate: voucher.start_date,
      endDate: voucher.end_date,
      netPay: voucher.net_pay,
      salaryDetails: {
        baseSalary: voucher.payrolls?.salario_base || 0,
        overtime: 0, // Podríamos obtener esto de la tabla payrolls
        bonuses: voucher.payrolls?.bonificaciones || 0,
        totalEarnings: voucher.payrolls?.total_devengado || 0,
        healthContribution: voucher.payrolls?.salud_empleado || 0,
        pensionContribution: voucher.payrolls?.pension_empleado || 0,
        withholdingTax: voucher.payrolls?.retencion_fuente || 0,
        totalDeductions: voucher.payrolls?.total_deducciones || 0
      }
    };

    const htmlContent = generatePDFContent(voucherData, company);
    
    // Generar PDF (simulado)
    const pdfBytes = await convertHtmlToPdf(htmlContent);
    
    // Crear URL única para el PDF
    const fileName = `comprobante_${voucherData.employeeCedula}_${voucherData.periodo.replace(/\s+/g, '_')}.pdf`;
    const pdfUrl = `${supabaseUrl}/storage/v1/object/vouchers/${fileName}`;

    // Actualizar el comprobante con el estado generado y URL del PDF
    await supabase
      .from('payroll_vouchers')
      .update({ 
        voucher_status: 'generado',
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', voucherId);

    return new Response(JSON.stringify({ 
      success: true, 
      pdfUrl: pdfUrl,
      fileName: fileName,
      htmlContent: htmlContent,
      pdfBlob: Array.from(pdfBytes) // Convertir a array para enviar
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    
    // Marcar el comprobante con error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { voucherId } = await req.json();
    if (voucherId) {
      await supabase
        .from('payroll_vouchers')
        .update({ voucher_status: 'error' })
        .eq('id', voucherId);
    }

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
