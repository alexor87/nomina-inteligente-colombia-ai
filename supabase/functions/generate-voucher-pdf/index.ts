
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
    console.log('🔄 Iniciando generación de comprobante PDF PROFESIONAL');
    
    const requestBody = await req.json();
    console.log('📋 Datos recibidos para PDF profesional:', JSON.stringify(requestBody, null, 2));

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

    // Obtener información de la empresa
    let companyInfo = null;
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
            const { data: company } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profile.company_id)
              .single();
            
            companyInfo = company;
          }
        }
      }
    } catch (authError) {
      console.log('ℹ️ No se pudo obtener información de la empresa:', authError.message);
    }

    console.log('🏢 Información de empresa obtenida:', companyInfo?.razon_social || 'No disponible');

    // Generar HTML profesional del comprobante
    const professionalHTML = generateProfessionalVoucherHTML(employee, period, companyInfo);
    
    // Convertir HTML a PDF usando lógica simplificada pero profesional
    const pdfContent = await generateProfessionalPDF(professionalHTML, employee);

    console.log('✅ PDF profesional generado exitosamente');

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${employee.name.replace(/\s+/g, '-')}.pdf"`
      }
    });

  } catch (error) {
    console.error('💥 Error crítico generando PDF profesional:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Función para generar HTML profesional del comprobante
function generateProfessionalVoucherHTML(employee: any, period: any, companyInfo: any): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Pago - ${employee.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            background-color: #fff;
            padding: 20px;
        }
        
        .voucher-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #2563eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1e40af, #2563eb);
            padding: 20px;
            color: white;
            text-align: center;
        }
        
        .company-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .company-details {
            font-size: 10px;
            opacity: 0.9;
            margin-bottom: 15px;
        }
        
        .document-title {
            font-size: 16px;
            font-weight: bold;
            background: rgba(255,255,255,0.2);
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
        }
        
        .period-info {
            font-size: 10px;
            background: rgba(255,255,255,0.1);
            padding: 8px;
            border-radius: 3px;
        }
        
        .content {
            padding: 20px;
        }
        
        .employee-section {
            background: #f8fafc;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #2563eb;
        }
        
        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .employee-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .employee-field {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #e2e8f0;
        }
        
        .field-label {
            font-weight: bold;
            color: #475569;
        }
        
        .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .payment-table th {
            background: #1e40af;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
        }
        
        .payment-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            background: #fff;
        }
        
        .payment-table tr:nth-child(even) td {
            background: #f8fafc;
        }
        
        .amount-cell {
            text-align: right;
            font-weight: bold;
            color: #059669;
        }
        
        .deduction-amount {
            color: #dc2626;
        }
        
        .totals-section {
            background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .totals-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            text-align: center;
        }
        
        .total-item {
            padding: 15px;
            border-radius: 5px;
            border: 2px solid;
        }
        
        .total-devengado {
            background: #dcfce7;
            border-color: #22c55e;
            color: #15803d;
        }
        
        .total-deducciones {
            background: #fee2e2;
            border-color: #ef4444;
            color: #dc2626;
        }
        
        .total-neto {
            background: #dbeafe;
            border-color: #3b82f6;
            color: #1d4ed8;
        }
        
        .total-label {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .total-amount {
            font-size: 16px;
            font-weight: bold;
        }
        
        .footer {
            background: #f8fafc;
            padding: 15px;
            text-align: center;
            color: #64748b;
            font-size: 9px;
            border-top: 1px solid #e2e8f0;
        }
        
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin: 30px 0;
        }
        
        .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #94a3b8;
        }
    </style>
</head>
<body>
    <div class="voucher-container">
        <div class="header">
            <div class="company-name">${companyInfo?.razon_social || 'Mi Empresa'}</div>
            <div class="company-details">
                ${companyInfo?.nit ? `NIT: ${companyInfo.nit} | ` : ''}
                ${companyInfo?.telefono ? `Tel: ${companyInfo.telefono} | ` : ''}
                ${companyInfo?.email || ''}
            </div>
            <div class="document-title">COMPROBANTE DE PAGO DE NÓMINA</div>
            <div class="period-info">
                Período: ${formatDate(period.startDate)} - ${formatDate(period.endDate)} | 
                Tipo: ${period.type.toUpperCase()} | 
                Generado: ${formatDate(new Date().toISOString())}
            </div>
        </div>
        
        <div class="content">
            <div class="employee-section">
                <div class="section-title">📋 Información del Empleado</div>
                <div class="employee-grid">
                    <div class="employee-field">
                        <span class="field-label">Nombre:</span>
                        <span>${employee.name}</span>
                    </div>
                    <div class="employee-field">
                        <span class="field-label">Cargo:</span>
                        <span>${employee.position || 'No especificado'}</span>
                    </div>
                    <div class="employee-field">
                        <span class="field-label">EPS:</span>
                        <span>${employee.eps || 'No asignada'}</span>
                    </div>
                    <div class="employee-field">
                        <span class="field-label">AFP:</span>
                        <span>${employee.afp || 'No asignada'}</span>
                    </div>
                </div>
            </div>
            
            <div class="section-title">💰 Detalle de Pagos</div>
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th style="text-align: center;">Cantidad</th>
                        <th style="text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Salario Base (Mensual)</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell">${formatCurrency(employee.baseSalary)}</td>
                    </tr>
                    <tr>
                        <td>Salario Proporcional</td>
                        <td style="text-align: center;">${employee.workedDays} días</td>
                        <td class="amount-cell">${formatCurrency(salarioProporcional)}</td>
                    </tr>
                    <tr>
                        <td>Horas Extra</td>
                        <td style="text-align: center;">${employee.extraHours} hrs</td>
                        <td class="amount-cell">${formatCurrency(0)}</td>
                    </tr>
                    <tr>
                        <td>Bonificaciones</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell">${formatCurrency(employee.bonuses)}</td>
                    </tr>
                    <tr>
                        <td>Auxilio de Transporte</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell">${formatCurrency(employee.transportAllowance)}</td>
                    </tr>
                    ${employee.disabilities > 0 ? `
                    <tr>
                        <td>Incapacidades</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell deduction-amount">-${formatCurrency(employee.disabilities)}</td>
                    </tr>` : ''}
                </tbody>
            </table>
            
            <div class="totals-section">
                <div class="totals-grid">
                    <div class="total-item total-devengado">
                        <div class="total-label">Total Devengado</div>
                        <div class="total-amount">${formatCurrency(employee.grossPay)}</div>
                    </div>
                    
                    <div class="total-item total-deducciones">
                        <div class="total-label">Total Deducciones</div>
                        <div class="total-amount">-${formatCurrency(employee.deductions)}</div>
                    </div>
                    
                    <div class="total-item total-neto">
                        <div class="total-label">Neto a Pagar</div>
                        <div class="total-amount">${formatCurrency(employee.netPay)}</div>
                    </div>
                </div>
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <div>Elaboró</div>
                </div>
                <div class="signature-box">
                    <div>Empleado</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Este documento fue generado electrónicamente el ${new Date().toLocaleString('es-CO')}</p>
            <p>Comprobante de pago válido según normativa laboral colombiana</p>
        </div>
    </div>
</body>
</html>`;
}

// Función para generar PDF profesional desde HTML
async function generateProfessionalPDF(htmlContent: string, employee: any): Promise<Uint8Array> {
  console.log('📄 Generando PDF profesional desde HTML...');
  
  // Crear estructura básica de PDF con el HTML
  const textEncoder = new TextEncoder();
  
  // Convertir HTML a texto estructurado para PDF
  const cleanContent = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const pdfHeader = '%PDF-1.4\n';
  
  const pdfStructure = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${cleanContent.length + 500}
>>
stream
BT
/F1 12 Tf
50 750 Td
(═══════════════════════════════════════════════════════════════════) Tj 0 -20 Td
(                    COMPROBANTE DE PAGO PROFESIONAL                    ) Tj 0 -20 Td
(═══════════════════════════════════════════════════════════════════) Tj 0 -30 Td
(EMPLEADO: ${employee.name}) Tj 0 -20 Td
(CARGO: ${employee.position || 'No especificado'}) Tj 0 -20 Td
(EPS: ${employee.eps || 'No asignada'}) Tj 0 -15 Td
(AFP: ${employee.afp || 'No asignada'}) Tj 0 -30 Td
(───────────────────────────────────────────────────────────────────) Tj 0 -20 Td
(                           DETALLES DE PAGO                           ) Tj 0 -20 Td
(───────────────────────────────────────────────────────────────────) Tj 0 -20 Td
(Salario Base: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(employee.baseSalary)}) Tj 0 -15 Td
(Dias Trabajados: ${employee.workedDays}) Tj 0 -15 Td
(Horas Extra: ${employee.extraHours}) Tj 0 -15 Td
(Bonificaciones: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(employee.bonuses)}) Tj 0 -15 Td
(Auxilio Transporte: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(employee.transportAllowance)}) Tj 0 -30 Td
(═══════════════════════════════════════════════════════════════════) Tj 0 -20 Td
(TOTAL DEVENGADO: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(employee.grossPay)}) Tj 0 -15 Td
(TOTAL DEDUCCIONES: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(employee.deductions)}) Tj 0 -15 Td
(NETO A PAGAR: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(employee.netPay)}) Tj 0 -30 Td
(═══════════════════════════════════════════════════════════════════) Tj 0 -30 Td
(Generado: ${new Date().toLocaleDateString('es-CO')}) Tj 0 -15 Td
(Documento valido segun normativa laboral colombiana) Tj 0 -30 Td
(                    _______________    _______________                ) Tj 0 -20 Td
(                        Elaboro           Empleado                    ) Tj 0 -15 Td
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000301 00000 n 
0000002000 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
2100
%%EOF`;

  return textEncoder.encode(pdfStructure);
}
