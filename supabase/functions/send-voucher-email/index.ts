
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('📧 send-voucher-email payload:', JSON.stringify(body, null, 2));

    const {
      voucherId,
      employeeEmail,
      employeeName,
      period,
      netPay,
      companyName,
      subject,
      attachment, // { fileName, base64, mimeType }
    } = body;

    if (!employeeEmail) {
      throw new Error('employeeEmail is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail)) {
      throw new Error('Invalid email format');
    }

    // Si viene voucherId, intentar obtener datos de DB (compatibilidad con versión anterior)
    let companyDisplayName = companyName;
    let periodLabel = period?.periodo || (period ? `${period.startDate} - ${period.endDate}` : undefined);
    if (voucherId) {
      const { data: voucher, error } = await supabase
        .from('payroll_vouchers')
        .select(`
          *,
          employees (nombre, apellido),
          companies (razon_social)
        `)
        .eq('id', voucherId)
        .single();

      if (!error && voucher) {
        companyDisplayName = companyDisplayName || voucher.companies?.razon_social || companyDisplayName;
        periodLabel = periodLabel || voucher.periodo || periodLabel;
      } else {
        console.warn('⚠️ Comprobante no encontrado o error:', error);
      }
    }

    const effectiveCompany = companyDisplayName || 'Mi Empresa';
    const effectiveSubject = subject || `Comprobante de Pago - ${periodLabel || ''}`.trim();

    // Function to build email content with optional test mode indicator
    const buildEmailContent = (isTestMode = false) => {
      const testModeNotice = isTestMode ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 12px; margin: 16px 0;">
          <strong>⚠️ MODO PRUEBA:</strong> Este email fue enviado en modo de pruebas de Resend. 
          El comprobante original era para <strong>${employeeName}</strong> (${employeeEmail}).
        </div>
      ` : '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${testModeNotice}
          <h2 style="color: #333; margin-bottom: 16px;">Comprobante de Pago</h2>
          <p>Estimado/a <strong>${employeeName || ''}</strong>,</p>
          <p>Adjunto encontrarás tu comprobante de pago${periodLabel ? ` correspondiente al período <strong>${periodLabel}</strong>` : ''}.</p>
          ${typeof netPay === 'number' ? `
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <strong>Neto a pagar:</strong> ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(netPay)}
            </div>
          ` : ''}
          <p>Saludos,<br/><strong>${effectiveCompany}</strong></p>
          <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">Este es un mensaje automático, por favor no responder.</p>
        </div>
      `;
    };

    // Function to send email
    const sendEmail = async (toEmail: string, isTestMode = false) => {
      const emailSubject = isTestMode ? `[MODO PRUEBA] ${effectiveSubject}` : effectiveSubject;
      
      const sendOptions: any = {
        from: `${effectiveCompany} <onboarding@resend.dev>`,
        to: [toEmail],
        subject: emailSubject,
        html: buildEmailContent(isTestMode),
      };

      // Adjuntar PDF si viene en el payload
      if (attachment?.base64 && attachment?.fileName) {
        // Clean base64 content (remove any data URL prefix if present)
        let cleanBase64 = attachment.base64;
        if (cleanBase64.includes(',')) {
          cleanBase64 = cleanBase64.split(',')[1];
        }
        
        sendOptions.attachments = [
          {
            filename: attachment.fileName,
            content: cleanBase64,
          },
        ];
        console.log(`📎 Adjuntando archivo: ${attachment.fileName}`);
      }

      return await resend.emails.send(sendOptions);
    };

    console.log('📤 Sending email with Resend...');
    
    try {
      // First attempt: send to the original email
      const { data: emailData, error: emailError } = await sendEmail(employeeEmail, false);
      
      if (emailError) {
        console.error('❌ Resend error:', emailError);
        
        // Check if it's a 403 error (test mode restriction)
        if (emailError.statusCode === 403 && emailError.error && emailError.error.includes('You can only send testing emails to your own email address')) {
          console.log('🔄 Detected test mode restriction, attempting to send to allowed email...');
          
          // Extract the allowed email from the error message
          const errorMessage = emailError.error;
          const emailMatch = errorMessage.match(/\(([^)]+@[^)]+)\)/);
          const allowedEmail = emailMatch ? emailMatch[1] : null;
          
          if (allowedEmail) {
            console.log(`📧 Retrying with allowed email: ${allowedEmail}`);
            
            // Second attempt: send to the allowed email in test mode
            const { data: testEmailData, error: testEmailError } = await sendEmail(allowedEmail, true);
            
            if (testEmailError) {
              console.error('❌ Test email also failed:', testEmailError);
              throw new Error(`Failed to send test email: ${testEmailError.message || 'Unknown error'}`);
            }
            
            if (!testEmailData || !testEmailData.id) {
              console.error('❌ No email ID returned from test email');
              throw new Error('Test email was not sent - no confirmation ID received');
            }
            
            console.log('✅ Test email sent successfully:', testEmailData.id);
            
            // Return success with test mode indicator
            return new Response(JSON.stringify({ 
              success: true, 
              emailId: testEmailData.id,
              testMode: true,
              originalRecipient: employeeEmail,
              actualRecipient: allowedEmail,
              message: `Email sent in test mode to ${allowedEmail} (original recipient: ${employeeEmail})`
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          } else {
            throw new Error('Could not extract allowed email from Resend error message');
          }
        } else {
          throw new Error(`Failed to send email: ${emailError.message || 'Unknown Resend error'}`);
        }
      }

      if (!emailData || !emailData.id) {
        console.error('❌ No email ID returned from Resend');
        throw new Error('Email was not sent - no confirmation ID received from Resend');
      }

      console.log('✅ Email sent successfully:', emailData.id);

      // Actualizar el estado del comprobante si tenemos voucherId
      if (voucherId) {
        await supabase
          .from('payroll_vouchers')
          .update({ 
            sent_to_employee: true,
            sent_date: new Date().toISOString(),
            voucher_status: 'enviado'
          })
          .eq('id', voucherId);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailData.id,
        testMode: false,
        message: `Email sent successfully to ${employeeEmail}`
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (error: any) {
      // If it's not a Resend error, throw it up
      throw error;
    }

  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Failed to send email',
      details: error.stack || 'No additional details'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
