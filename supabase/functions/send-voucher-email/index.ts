
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

    const { voucherId, employeeEmail } = await req.json();

    // Obtener datos del comprobante
    const { data: voucher, error } = await supabase
      .from('payroll_vouchers')
      .select(`
        *,
        employees (nombre, apellido),
        companies (razon_social)
      `)
      .eq('id', voucherId)
      .single();

    if (error || !voucher) {
      throw new Error('Comprobante no encontrado');
    }

    const employeeName = `${voucher.employees.nombre} ${voucher.employees.apellido}`;
    const companyName = voucher.companies.razon_social;

    const emailResponse = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [employeeEmail],
      subject: `Comprobante de Pago - ${voucher.periodo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Comprobante de Pago de Nómina</h2>
          
          <p>Estimado/a <strong>${employeeName}</strong>,</p>
          
          <p>Adjunto encontrará su comprobante de pago correspondiente al período <strong>${voucher.periodo}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles del Pago</h3>
            <p><strong>Período:</strong> ${voucher.start_date} - ${voucher.end_date}</p>
            <p><strong>Valor Neto:</strong> $${voucher.net_pay.toLocaleString()}</p>
          </div>
          
          <p>Si tiene alguna pregunta sobre su comprobante de pago, no dude en contactar al departamento de recursos humanos.</p>
          
          <p>Saludos cordiales,<br>
          <strong>${companyName}</strong></p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Este es un mensaje automático, por favor no responda a este email.
          </p>
        </div>
      `,
    });

    // Actualizar el estado del comprobante
    await supabase
      .from('payroll_vouchers')
      .update({ 
        sent_to_employee: true,
        sent_date: new Date().toISOString(),
        voucher_status: 'enviado'
      })
      .eq('id', voucherId);

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
