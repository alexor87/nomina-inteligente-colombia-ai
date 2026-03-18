import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, role, companyName, inviteUrl } = await req.json();

    if (!to || !inviteUrl || !companyName) {
      throw new Error('Faltan campos requeridos: to, companyName, inviteUrl');
    }

    const roleLabels: Record<string, string> = {
      administrador: 'Administrador',
      rrhh: 'Recursos Humanos',
      contador: 'Contador',
      asistente: 'Asistente',
      consultor: 'Consultor',
      visualizador: 'Visualizador',
      soporte: 'Soporte externo',
    };

    const roleLabel = roleLabels[role] || role;
    const recipientName = name || 'Compañero de equipo';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitación a ${companyName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .header {
              background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0 0 8px 0;
              font-size: 26px;
            }
            .header p {
              margin: 0;
              opacity: 0.9;
              font-size: 15px;
            }
            .content {
              padding: 32px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 16px;
              color: #1a1a2e;
            }
            .message {
              color: #555;
              font-size: 15px;
              margin-bottom: 24px;
            }
            .role-badge {
              display: inline-block;
              background: #EEF2FF;
              color: #4F46E5;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 28px;
            }
            .cta-container {
              text-align: center;
              margin: 32px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
              color: white !important;
              text-decoration: none;
              padding: 14px 36px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              letter-spacing: 0.3px;
            }
            .expiry-note {
              background: #FFF8E1;
              border-left: 4px solid #F59E0B;
              padding: 12px 16px;
              border-radius: 4px;
              font-size: 13px;
              color: #78450A;
              margin-top: 24px;
            }
            .footer {
              text-align: center;
              padding: 20px 30px;
              border-top: 1px solid #eee;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👋 ¡Te han invitado!</h1>
              <p>Únete al equipo de ${companyName}</p>
            </div>
            <div class="content">
              <p class="greeting">Hola, ${recipientName}</p>
              <p class="message">
                <strong>${companyName}</strong> te ha invitado a colaborar en su plataforma de gestión de nómina.
                Tu rol será:
              </p>
              <div>
                <span class="role-badge">📋 ${roleLabel}</span>
              </div>
              <div class="cta-container">
                <a href="${inviteUrl}" class="cta-button">
                  Aceptar invitación
                </a>
              </div>
              <div class="expiry-note">
                ⏳ Esta invitación es válida por <strong>7 días</strong>. Si no reconoces este mensaje, puedes ignorarlo.
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático de Finppi Nómina Inteligente.</p>
              <p>© ${new Date().getFullYear()} Finppi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: 'MAYA <notificaciones@finppi.com>',
      to: [to],
      subject: `📩 Invitación de ${companyName} — Nómina Inteligente`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Error del servicio de email: ${emailResponse.error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Error enviando invitación' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
