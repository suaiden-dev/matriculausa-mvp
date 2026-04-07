import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-migma-api-key',
};

// Mapeamento fee_type → campo boolean em user_profiles
const FEE_TYPE_PROFILE_FLAG: Record<string, string> = {
  selection_process: 'has_paid_selection_process_fee',
  application: 'is_application_fee_paid',
  scholarship: 'is_scholarship_fee_paid',
  i20_control: 'has_paid_i20_control_fee',
  placement: 'has_paid_college_enrollment_fee',
  college_enrollment: 'has_paid_college_enrollment_fee',
};

type FeeType =
  | 'selection_process'
  | 'application'
  | 'scholarship'
  | 'i20_control'
  | 'placement'
  | 'college_enrollment'
  | 'ds160_package'
  | 'i539_cos_package'
  | 'reinstatement_fee';

type PaymentMethod = 'stripe' | 'zelle' | 'manual' | 'parcelow';

interface PaymentPayload {
  user_id: string;
  fee_type: FeeType;
  amount: number;
  payment_method: PaymentMethod;
  payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  zelle_payment_id?: string | null;
  gross_amount_usd?: number | null;
  fee_amount_usd?: number | null;
  parcelow_order_id?: string | null;
  parcelow_checkout_url?: string | null;
  parcelow_reference?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Autenticação
  const migmaKey = req.headers.get('x-migma-api-key');
  if (!migmaKey || migmaKey !== Deno.env.get('MIGMA_SECRET_KEY')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing x-migma-api-key header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: PaymentPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validar campos obrigatórios
  if (!body.user_id || !body.fee_type || body.amount == null || !body.payment_method) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: user_id, fee_type, amount, payment_method' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Verificar que o aluno pertence à Migma
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email, source')
      .eq('user_id', body.user_id)
      .eq('source', 'migma') // garante que é aluno da Migma
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Student not found or does not belong to Migma', user_id: body.user_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Registrar pagamento via RPC (mesma função usada pelo Matricula USA)
    const { data: paymentData, error: paymentError } = await supabase.rpc('insert_individual_fee_payment', {
      p_user_id: body.user_id,
      p_fee_type: body.fee_type,
      p_amount: body.amount,
      p_payment_date: new Date().toISOString(),
      p_payment_method: body.payment_method,
      p_payment_intent_id: body.payment_intent_id || null,
      p_stripe_charge_id: body.stripe_charge_id || null,
      p_zelle_payment_id: body.zelle_payment_id || null,
      p_gross_amount_usd: body.gross_amount_usd || null,
      p_fee_amount_usd: body.fee_amount_usd || null,
      p_parcelow_order_id: body.parcelow_order_id || null,
      p_parcelow_checkout_url: body.parcelow_checkout_url || null,
      p_parcelow_reference: body.parcelow_reference || null,
    });

    if (paymentError) {
      console.error('[migma-payment-completed] RPC error:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment', details: paymentError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Atualizar flag de pagamento no user_profiles (se aplicável para este fee_type)
    const profileFlag = FEE_TYPE_PROFILE_FLAG[body.fee_type];
    if (profileFlag) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ [profileFlag]: true, updated_at: new Date().toISOString() })
        .eq('user_id', body.user_id);

      if (updateError) {
        console.warn('[migma-payment-completed] Failed to update profile flag:', updateError.message);
        // Não retorna erro — o pagamento já foi registrado
      }
    }

    // 4. Criar notificação para o admin do Matricula USA
    const feeLabels: Record<string, string> = {
      selection_process: 'Taxa de Processo Seletivo',
      application: 'Taxa de Inscrição',
      scholarship: 'Taxa de Bolsa',
      i20_control: 'Taxa I-20',
      placement: 'Placement Fee',
      college_enrollment: 'Taxa de Matrícula',
    };

    await supabase.from('admin_notifications').insert({
      title: `[MIGMA] Pagamento recebido — ${feeLabels[body.fee_type] || body.fee_type}`,
      message: `Aluno ${profile.full_name} (${profile.email}) pagou ${feeLabels[body.fee_type] || body.fee_type} via ${body.payment_method}. Valor: USD ${body.amount.toFixed(2)}`,
      type: 'payment',
      is_read: false,
    });

    const result = Array.isArray(paymentData) ? paymentData[0] : paymentData;

    console.log('[migma-payment-completed] ✅ Payment recorded:', {
      user_id: body.user_id,
      fee_type: body.fee_type,
      amount: body.amount,
      payment_id: result?.payment_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: result?.payment_id,
        record_id: result?.id,
        profile_flag_updated: profileFlag || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[migma-payment-completed] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
