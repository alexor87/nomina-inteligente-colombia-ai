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

    // Validate base64 format
    if (!pdfBase64.match(/^[A-Za-z0-9+/]+=*$/)) {
      throw new Error('El PDF no está en formato base64 válido');
    }

    console.log('PDF attachment size (base64):', pdfBase64.length);
    
    // Validate period data
    if (!period.startDate || !period.endDate) {
      throw new Error('Datos del período incompletos: se requieren startDate y endDate');
    }

    const employeeName = `${employee.nombre} ${employee.apellido}`;
    const periodText = `${period.startDate} - ${period.endDate}`;
    
    // Email HTML template - Generic version
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprobante de Nómina</title>
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
            .message-section { 
              background: white; 
              padding: 25px; 
              margin: 20px 0; 
              border-radius: 8px; 
              border-left: 4px solid #667eea; 
              text-align: center;
            }
            .attachment-note {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .attachment-note strong { 
              color: #856404; 
              font-size: 16px;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd; 
              color: #666; 
              font-size: 12px; 
            }
            .company-info {
              background: white;
              padding: 20px;
              margin: 15px 0;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #e1e5e9;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 Comprobante de Nómina</h1>
            <p>Comprobante de pago adjunto</p>
          </div>
          
          <div class="content">
            <div class="message-section">
              <h2 style="color: #667eea; margin-bottom: 20px;">Estimado colaborador,</h2>
              <p style="font-size: 16px; margin-bottom: 15px;">
                La empresa <strong>${companyInfo?.razon_social || 'Su empresa'}</strong> le ha enviado 
                el comprobante de nómina correspondiente al período <strong>${periodText}</strong>.
              </p>
              <p style="font-size: 14px; color: #666;">
                Encontrará todos los detalles de su pago en el archivo PDF adjunto a este correo.
              </p>
            </div>

            <div class="attachment-note">
              <strong>📎 Archivo Adjunto:</strong><br>
              <span style="color: #666; font-size: 14px;">
                Su comprobante de nómina se encuentra en el archivo PDF adjunto
              </span>
            </div>

            <div class="company-info">
              <h3 style="color: #667eea; margin-bottom: 10px;">${companyInfo?.razon_social || 'Empresa'}</h3>
              ${companyInfo?.nit ? `<p style="margin: 5px 0;"><strong>NIT:</strong> ${companyInfo.nit}</p>` : ''}
              ${companyInfo?.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${companyInfo.email}</p>` : ''}
              ${companyInfo?.telefono ? `<p style="margin: 5px 0;"><strong>Teléfono:</strong> ${companyInfo.telefono}</p>` : ''}
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
      from: `${companyInfo?.razon_social || 'Nómina'} <notificaciones@finppi.com>`,
      to: emails,
      subject: `💰 Comprobante de Nómina - ${periodText}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Comprobante_${employee.nombre}_${employee.apellido}_${period.startDate.replace(/-/g, '')}.pdf`,
          content: pdfBase64
        },
      ],
    });

    console.log("Email response from Resend:", emailResponse);

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      
      // Handle specific Resend errors based on message content
      const errorMessage = emailResponse.error.message || '';
      
      if (errorMessage.includes('verify a domain') || errorMessage.includes('testing emails')) {
        throw new Error('Error de configuración: Para enviar emails a otros destinatarios, necesitas verificar un dominio en resend.com/domains y actualizar el email "from" para usar ese dominio verificado. Actualmente solo puedes enviar emails de prueba a tu propio email registrado.');
      }
      
      throw new Error(`Error del servicio de email: ${errorMessage}`);
    }

    // Verify we have a successful response
    if (!emailResponse.data?.id) {
      throw new Error('El email no se pudo enviar. Verifica la configuración de Resend.');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Comprobante enviado exitosamente a ${emails.length} destinatario(s)`,
        emailId: emailResponse.data.id 
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