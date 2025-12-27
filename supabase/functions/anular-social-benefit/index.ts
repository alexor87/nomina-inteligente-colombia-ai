import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnulacionRequest {
  paymentId: string;
  motivo: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AnulacionRequest = await req.json();
    const { paymentId, motivo } = body;

    if (!paymentId || !motivo || motivo.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El motivo de anulación debe tener al menos 10 caracteres' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Anulando liquidación: ${paymentId}`);
    console.log(`   Usuario: ${user.id}, Motivo: ${motivo}`);

    // 1. Verificar que el pago existe y no está ya anulado
    const { data: payment, error: paymentError } = await supabase
      .from('social_benefit_payments')
      .select('id, company_id, benefit_type, period_label, total_amount, anulado')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Pago no encontrado:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Liquidación no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.anulado) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta liquidación ya fue anulada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Marcar el pago como anulado
    const { error: updatePaymentError } = await supabase
      .from('social_benefit_payments')
      .update({
        anulado: true,
        anulado_por: user.id,
        anulado_at: new Date().toISOString(),
        anulacion_motivo: motivo.trim()
      })
      .eq('id', paymentId);

    if (updatePaymentError) {
      console.error('❌ Error anulando pago:', updatePaymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al anular la liquidación', details: updatePaymentError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Revertir provisiones a estado 'calculado' y limpiar payment_id
    const { data: updatedProvisions, error: updateProvisionsError } = await supabase
      .from('social_benefit_calculations')
      .update({
        estado: 'calculado',
        payment_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId)
      .select('id');

    if (updateProvisionsError) {
      console.error('❌ Error revirtiendo provisiones:', updateProvisionsError);
      // Revertir la anulación del pago
      await supabase
        .from('social_benefit_payments')
        .update({
          anulado: false,
          anulado_por: null,
          anulado_at: null,
          anulacion_motivo: null
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ success: false, error: 'Error al revertir provisiones', details: updateProvisionsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const provisionsReverted = updatedProvisions?.length || 0;
    console.log(`✅ Liquidación anulada. Provisiones revertidas: ${provisionsReverted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Liquidación anulada exitosamente',
        paymentId,
        benefitType: payment.benefit_type,
        periodLabel: payment.period_label,
        totalAmount: payment.total_amount,
        provisionsReverted,
        anulado_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en anular-social-benefit:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
