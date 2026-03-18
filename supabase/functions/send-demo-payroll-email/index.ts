import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoEmailRequest {
  userEmail: string;
  employeeName: string;
  pdfBase64: string;
  period: string;
  netPay: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting — 5 demo emails/hour per user (anti-spam)
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
  const rateLimit = await checkRateLimit(serviceClient, req.headers.get('Authorization') || '', 'send-demo-payroll-email');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter, corsHeaders);

  try {
    const { userEmail, employeeName, pdfBase64, period, netPay }: DemoEmailRequest = await req.json();

    console.log('📧 Sending demo payroll email:', { userEmail, employeeName, period });

    const emailResponse = await resend.emails.send({
      from: "MAYA <notificaciones@finppi.com>",
      to: [userEmail],
      subject: `Comprobante Demo - ${employeeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; }
            .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
            .footer { background: #2d3748; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Comprobante de Nómina Demo</h1>
              <p>MAYA - Sistema de Gestión de Nómina</p>
            </div>
            
            <div class="content">
              <h2>¡Hola! 👋</h2>
              <p>Este es el comprobante de nómina <strong>demo</strong> que acabas de generar en MAYA.</p>
              
              <div class="summary">
                <h3>📋 Resumen de la Liquidación</h3>
                <p><strong>Empleado:</strong> ${employeeName}</p>
                <p><strong>Período:</strong> ${period}</p>
                <div class="amount">
                  $${new Intl.NumberFormat('es-CO').format(netPay)}
                </div>
                <p style="text-align: center; color: #666;">Neto a pagar</p>
              </div>
              
              <p>📎 <strong>El comprobante PDF está adjunto a este email.</strong></p>
              
              <p>Esta fue solo una demostración de cómo funciona MAYA. Cuando registres empleados reales, podrás:</p>
              <ul>
                <li>✅ Calcular nóminas con precisión colombiana</li>
                <li>✅ Generar comprobantes oficiales</li>
                <li>✅ Enviarlos automáticamente a tus empleados</li>
                <li>✅ Gestionar novedades, vacaciones y más</li>
              </ul>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://tu-dominio.com/modules/employees" class="button">
                  ➕ Crear Primer Empleado Real
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>MAYA</strong> - Tu asistente de nómina inteligente</p>
              <p style="font-size: 12px; margin-top: 10px;">
                Este es un email automático de demostración. No responder.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [{
        filename: `comprobante-demo-${employeeName.replace(/\s/g, '-')}.pdf`,
        content: pdfBase64
      }]
    });

    console.log('✅ Demo email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('❌ Error sending demo email:', error);
    
    // Handle specific Resend errors
    if (error.message?.includes('API key')) {
      return new Response(JSON.stringify({ 
        error: 'Resend API key not configured. Please add RESEND_API_KEY secret.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send email' 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
