
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

    // Construir HTML simple por defecto
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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

    const sendOptions: any = {
      from: `${effectiveCompany} <onboarding@resend.dev>`,
      to: [employeeEmail],
      subject: effectiveSubject,
      html,
    };

    // Adjuntar PDF si viene en el payload
    if (attachment?.base64 && attachment?.fileName) {
      sendOptions.attachments = [
        {
          filename: attachment.fileName,
          content: attachment.base64,
        },
      ];
      console.log(`📎 Adjuntando archivo: ${attachment.fileName}`);
    }

    const emailResponse = await resend.emails.send(sendOptions);
    console.log('✅ Email sent:', emailResponse.data?.id);

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
      emailId: emailResponse.data?.id 
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
