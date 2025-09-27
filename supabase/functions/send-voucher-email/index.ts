import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, pdfBase64, employee, period, companyInfo } = await req.json();
    
    console.log('Sending voucher email to:', emails);
    console.log('Employee:', employee?.nombre, employee?.apellido);

    if (!emails || emails.length === 0) {
      throw new Error('No hay direcciones de email especificadas');
    }

    if (!pdfBase64) {
      throw new Error('No se proporcionó el PDF del comprobante');
    }

    // Convert base64 to buffer for attachment
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    const employeeName = `${employee.nombre} ${employee.apellido}`;
    const periodText = `${period.startDate} - ${period.endDate}`;
    
    // Email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprobante de Pago</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 30px; 
              border-radius: 10px 10px 0 0; 
              text-align: center; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
            }
            .content { 
              background: #f8f9fa; 
              padding: 30px; 
              border-radius: 0 0 10px 10px; 
            }
            .info-section { 
              background: white; 
              padding: 20px; 
              margin: 15px 0; 
              border-radius: 8px; 
              border-left: 4px solid #667eea; 
            }
            .info-section h3 { 
              margin: 0 0 10px 0; 
              color: #667eea; 
            }
            .amount { 
              background: #e8f5e8; 
              padding: 15px; 
              border-radius: 8px; 
              text-align: center; 
              margin: 20px 0; 
            }
            .amount .label { 
              font-size: 14px; 
              color: #666; 
              margin-bottom: 5px; 
            }
            .amount .value { 
              font-size: 24px; 
              font-weight: bold; 
              color: #2d5a2d; 
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd; 
              color: #666; 
              font-size: 12px; 
            }
            .attachment-note {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .attachment-note strong { color: #856404; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📧 Comprobante de Pago</h1>
            <p>Tu comprobante de nómina está listo</p>
          </div>
          
          <div class="content">
            <div class="info-section">
              <h3>👤 Información del Empleado</h3>
              <p><strong>Nombre:</strong> ${employeeName}</p>
              <p><strong>Cédula:</strong> ${employee.cedula || 'N/A'}</p>
              <p><strong>Cargo:</strong> ${employee.cargo || 'N/A'}</p>
            </div>

            <div class="info-section">
              <h3>📅 Información del Período</h3>
              <p><strong>Período:</strong> ${periodText}</p>
              <p><strong>Tipo:</strong> ${period.type || 'mensual'}</p>
            </div>

            <div class="amount">
              <div class="label">💰 Neto a Pagar</div>
              <div class="value">${formatCurrency(employee.neto_pagado || 0)}</div>
            </div>

            <div class="attachment-note">
              <strong>📎 Adjunto:</strong> Encontrarás tu comprobante de pago detallado en el archivo PDF adjunto a este correo.
            </div>

            <div class="info-section">
              <h3>🏢 ${companyInfo?.razon_social || 'Empresa'}</h3>
              <p><strong>NIT:</strong> ${companyInfo?.nit || 'N/A'}</p>
              ${companyInfo?.email ? `<p><strong>Email:</strong> ${companyInfo.email}</p>` : ''}
              ${companyInfo?.telefono ? `<p><strong>Teléfono:</strong> ${companyInfo.telefono}</p>` : ''}
            </div>
          </div>

          <div class="footer">
            <p>Este es un correo automático generado por el sistema de nómina.</p>
            <p>Generado el ${new Date().toLocaleString('es-CO')}</p>
          </div>
        </body>
      </html>
    `;

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: `${companyInfo?.razon_social || 'Nómina'} <onboarding@resend.dev>`,
      to: emails,
      subject: `💰 Comprobante de Pago - ${employeeName} - ${periodText}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Comprobante_${employee.nombre}_${employee.apellido}_${period.startDate.replace(/-/g, '')}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Comprobante enviado exitosamente a ${emails.length} destinatario(s)`,
        emailId: emailResponse.data?.id 
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );

  } catch (error: any) {
    console.error("Error sending voucher email:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error enviando el comprobante por email' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
};

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

serve(handler);