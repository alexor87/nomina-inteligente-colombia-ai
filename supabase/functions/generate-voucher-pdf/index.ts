
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

const generatePDFContent = (voucher: VoucherData, companyInfo: any) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comprobante de Nómina - ${voucher.employeeName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
          font-size: 14px;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 30px;
          background: white;
        }

        /* Header Section */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
        }

        .company-section {
          flex: 1;
        }

        .company-logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 16px;
        }

        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .company-details {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.5;
        }

        .document-info {
          text-align: right;
          flex-shrink: 0;
        }

        .document-title {
          font-size: 28px;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .period-info {
          background: #f8f9ff;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
          font-size: 13px;
          color: #4b5563;
        }

        /* Employee Section */
        .employee-section {
          background: #f9fafb;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
          border: 1px solid #e5e7eb;
        }

        .employee-header {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
        }

        .employee-header::before {
          content: "👤";
          margin-right: 8px;
          font-size: 18px;
        }

        .employee-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .employee-field {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .field-value {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        /* Tables */
        .section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }

        .earnings-title::before {
          content: "💰";
          margin-right: 10px;
          font-size: 20px;
        }

        .deductions-title::before {
          content: "📉";
          margin-right: 10px;
          font-size: 20px;
        }

        .payroll-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .payroll-table th {
          background: #f9fafb;
          padding: 16px 20px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e5e7eb;
        }

        .payroll-table th:last-child {
          text-align: right;
        }

        .payroll-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          color: #1f2937;
        }

        .payroll-table td:last-child {
          text-align: right;
          font-weight: 600;
        }

        .payroll-table tr:hover {
          background: #f9fafb;
        }

        /* Totals */
        .totals-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin: 32px 0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 16px;
        }

        .total-row:last-child {
          margin-bottom: 0;
          padding-top: 16px;
          border-top: 2px solid rgba(255, 255, 255, 0.3);
          font-size: 24px;
          font-weight: 800;
        }

        .net-pay-section {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 32px;
          border-radius: 16px;
          text-align: center;
          margin: 32px 0;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        }

        .net-pay-label {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .net-pay-amount {
          font-size: 36px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .net-pay-text {
          font-size: 12px;
          opacity: 0.8;
        }

        /* Footer */
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 2px solid #f0f0f0;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }

        .generation-info {
          margin-bottom: 16px;
          font-weight: 500;
        }

        .disclaimer {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
          color: #92400e;
          font-size: 11px;
          line-height: 1.4;
        }

        /* Print Styles */
        @media print {
          body {
            font-size: 12px;
          }
          
          .container {
            padding: 20px;
            max-width: none;
          }
          
          .header {
            margin-bottom: 20px;
            padding-bottom: 20px;
          }
          
          .section {
            margin-bottom: 20px;
          }
          
          .net-pay-section {
            margin: 20px 0;
            padding: 20px;
          }
          
          .footer {
            margin-top: 30px;
          }
        }

        /* Responsive */
        @media (max-width: 600px) {
          .container {
            padding: 20px 16px;
          }
          
          .header {
            flex-direction: column;
            text-align: left;
          }
          
          .document-info {
            text-align: left;
            margin-top: 20px;
          }
          
          .employee-grid {
            grid-template-columns: 1fr;
          }
          
          .payroll-table th,
          .payroll-table td {
            padding: 12px 16px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="company-section">
            <div class="company-logo">
              ${companyInfo?.razon_social ? companyInfo.razon_social.charAt(0).toUpperCase() : 'E'}
            </div>
            <div class="company-name">${companyInfo?.razon_social || 'Empresa'}</div>
            <div class="company-details">
              <div><strong>NIT:</strong> ${companyInfo?.nit || 'No especificado'}</div>
              <div><strong>Dirección:</strong> ${companyInfo?.direccion || 'No especificada'}</div>
              <div><strong>Teléfono:</strong> ${companyInfo?.telefono || 'No especificado'}</div>
              <div><strong>Email:</strong> ${companyInfo?.email || 'No especificado'}</div>
            </div>
          </div>
          
          <div class="document-info">
            <div class="document-title">COMPROBANTE DE NÓMINA</div>
            <div class="period-info">
              <div><strong>Período:</strong> ${voucher.periodo}</div>
              <div><strong>Desde:</strong> ${new Date(voucher.startDate).toLocaleDateString('es-CO')}</div>
              <div><strong>Hasta:</strong> ${new Date(voucher.endDate).toLocaleDateString('es-CO')}</div>
            </div>
          </div>
        </div>

        <!-- Employee Information -->
        <div class="employee-section">
          <div class="employee-header">Información del Empleado</div>
          <div class="employee-grid">
            <div class="employee-field">
              <div class="field-label">Nombre Completo</div>
              <div class="field-value">${voucher.employeeName}</div>
            </div>
            <div class="employee-field">
              <div class="field-label">Documento</div>
              <div class="field-value">${voucher.employeeCedula}</div>
            </div>
            <div class="employee-field">
              <div class="field-label">Cargo</div>
              <div class="field-value">${voucher.employeePosition || 'No especificado'}</div>
            </div>
            <div class="employee-field">
              <div class="field-label">ID Empleado</div>
              <div class="field-value">${voucher.employeeId}</div>
            </div>
          </div>
        </div>

        <!-- Earnings Section -->
        <div class="section">
          <div class="section-title earnings-title">Devengos</div>
          <table class="payroll-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salario Base</td>
                <td>${formatCurrency(voucher.salaryDetails.baseSalary)}</td>
              </tr>
              ${voucher.salaryDetails.extraHours > 0 ? `
              <tr>
                <td>Horas Extra</td>
                <td>${formatCurrency(voucher.salaryDetails.extraHours)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.nightSurcharge > 0 ? `
              <tr>
                <td>Recargo Nocturno</td>
                <td>${formatCurrency(voucher.salaryDetails.nightSurcharge)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.sundaySurcharge > 0 ? `
              <tr>
                <td>Recargo Dominical</td>
                <td>${formatCurrency(voucher.salaryDetails.sundaySurcharge)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.transportAllowance > 0 ? `
              <tr>
                <td>Auxilio de Transporte</td>
                <td>${formatCurrency(voucher.salaryDetails.transportAllowance)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.bonuses > 0 ? `
              <tr>
                <td>Bonificaciones</td>
                <td>${formatCurrency(voucher.salaryDetails.bonuses)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Deductions Section -->
        <div class="section">
          <div class="section-title deductions-title">Deducciones</div>
          <table class="payroll-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${voucher.salaryDetails.healthContribution > 0 ? `
              <tr>
                <td>Salud (4%)</td>
                <td>${formatCurrency(voucher.salaryDetails.healthContribution)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.pensionContribution > 0 ? `
              <tr>
                <td>Pensión (4%)</td>
                <td>${formatCurrency(voucher.salaryDetails.pensionContribution)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.withholdingTax > 0 ? `
              <tr>
                <td>Retención en la Fuente</td>
                <td>${formatCurrency(voucher.salaryDetails.withholdingTax)}</td>
              </tr>
              ` : ''}
              ${voucher.salaryDetails.otherDeductions > 0 ? `
              <tr>
                <td>Otras Deducciones</td>
                <td>${formatCurrency(voucher.salaryDetails.otherDeductions)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row">
            <span>Total Devengado:</span>
            <span>${formatCurrency(voucher.salaryDetails.totalEarnings)}</span>
          </div>
          <div class="total-row">
            <span>Total Deducciones:</span>
            <span>${formatCurrency(voucher.salaryDetails.totalDeductions)}</span>
          </div>
          <div class="total-row">
            <span>NETO A PAGAR:</span>
            <span>${formatCurrency(voucher.netPay)}</span>
          </div>
        </div>

        <!-- Net Pay Highlight -->
        <div class="net-pay-section">
          <div class="net-pay-label">💵 NETO A PAGAR</div>
          <div class="net-pay-amount">${formatCurrency(voucher.netPay)}</div>
          <div class="net-pay-text">Valor neto a transferir al empleado</div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="generation-info">
            <strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          
          <div class="disclaimer">
            ⚠️ <strong>Importante:</strong> Este comprobante es un documento informativo y no reemplaza la nómina electrónica oficial. 
            Para consultas sobre este comprobante, contacte al departamento de recursos humanos.
          </div>
          
          <div style="margin-top: 16px; font-size: 10px; opacity: 0.7;">
            Comprobante generado electrónicamente • Válido sin firma autógrafa
          </div>
        </div>
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

    // Obtener datos del comprobante con información completa
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

    const fileName = `comprobante-nomina_${voucherData.employeeCedula}_${voucherData.periodo.replace(/\s+/g, '_')}.html`;

    return new Response(JSON.stringify({ 
      success: true, 
      htmlContent: htmlContent,
      fileName: fileName
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
