import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers },
  });
}

Deno.serve(async (req) => {
  console.log('--- verify-stripe-session-selection-process-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);
    console.log(`Verifying session ID: ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;

      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);

      // Atualiza perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ has_paid_selection_process_fee: true })
        .eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Se houver applicationId, atualiza a aplicação
      if (applicationId) {
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'selection_process_paid' })
          .eq('student_id', userId)
          .eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status for selection process fee: ${updateError.message}`);
      }

      // Verifica se o usuário utilizou algum código de referência
      const { data: usedCode, error: usedError } = await supabase
        .from('used_referral_codes')
        .select('*')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (usedError) {
        console.error('Error fetching used_referral_codes:', usedError);
      }

      if (usedCode && usedCode.referrer_id) {
        const referrerId = usedCode.referrer_id as string;
        console.log('[Referral Reward] Found referrer:', referrerId, 'affiliate_code:', usedCode.affiliate_code);

        // Obter nome/email do usuário que pagou (referred)
        let referredDisplayName = '';
        try {
          const { data: referredProfile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', userId)
            .maybeSingle();
          if (referredProfile?.full_name) {
            referredDisplayName = referredProfile.full_name;
          } else {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            referredDisplayName = authUser?.user?.email || userId;
          }
        } catch (e) {
          console.warn('[Referral Reward] Could not resolve referred user name, using ID. Error:', e);
          referredDisplayName = userId;
        }

        // Upsert affiliate_referrals (1 por referred_id) com créditos de 200 e dados do pagamento
        const { error: upsertRefError } = await supabase
          .from('affiliate_referrals')
          .upsert({
            referrer_id: referrerId,
            referred_id: userId,
            affiliate_code: usedCode.affiliate_code,
            payment_amount: Number(session.amount_total ? session.amount_total / 100 : 0),
            credits_earned: 180,
            status: 'completed',
            payment_session_id: sessionId,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'referred_id' });

        if (upsertRefError) {
          console.error('[Referral Reward] Failed to upsert affiliate_referrals:', upsertRefError);
        }

        // Evitar duplicidade: se já existe transação com reference_type = 'selection_process_referral' e reference_id = usedCode.id, não creditar novamente
        const { data: existingTx, error: txFetchError } = await supabase
          .from('matriculacoin_transactions')
          .select('id')
          .eq('user_id', referrerId)
          .eq('reference_id', usedCode.id)
          .eq('reference_type', 'selection_process_referral')
          .maybeSingle();

        if (txFetchError) {
          console.error('[Referral Reward] Failed to check existing transaction:', txFetchError);
        }

        if (!existingTx) {
          console.log('[Referral Reward] Crediting 180 MatriculaCoins to referrer...');
          const description = `Referral reward: Selection Process Fee paid by ${referredDisplayName}`;

          const { error: rewardError } = await supabase.rpc('add_credits_to_user', {
            user_id_param: referrerId,
            amount_param: 180,
            reference_id_param: usedCode.id,
            reference_type_param: 'selection_process_referral',
            description_param: description,
          });

          if (rewardError) {
            console.error('[Referral Reward] Failed to add credits:', rewardError);
          } else {
            console.log('[Referral Reward] 180 MatriculaCoins credited successfully');
          }
        } else {
          console.log('[Referral Reward] Transaction already exists. Skipping duplicate credit.');
        }
      } else {
        console.log('[Referral Reward] No used referral code found for this user.');
      }

      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-selection-process-fee ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
});