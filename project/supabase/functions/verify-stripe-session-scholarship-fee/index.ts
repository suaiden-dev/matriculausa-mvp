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
  console.log('--- verify-stripe-session-scholarship-fee: Request received ---');
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
      // scholarships_ids pode ser um array ou string separada por vírgula
      const scholarshipsIds = session.metadata?.scholarships_ids;

      console.log(`Processing successful payment. UserID: ${userId}, ScholarshipsIDs: ${scholarshipsIds}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);
      if (!scholarshipsIds) return corsResponse({ error: 'Scholarships IDs missing in session metadata.' }, 400);

      // Busca o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, user_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found:', profileError);
        return corsResponse({ error: 'User profile not found' }, 404);
      }

      console.log(`User profile found: ${userProfile.id} for auth user: ${userId}`);

      // Atualiza perfil do usuário para marcar que pagou a scholarship fee (usando userId para user_profiles)
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({ is_scholarship_fee_paid: true })
        .eq('user_id', userId);
      if (profileUpdateError) throw new Error(`Failed to update user_profiles: ${profileUpdateError.message}`);

      console.log('User profile updated - scholarship fee paid');

      // Atualiza status das aplicações relacionadas para 'approved' (usando userProfile.id)
      const scholarshipIdsArray = scholarshipsIds.split(',').map((id: string) => id.trim());
      console.log(`Updating applications for student_id: ${userProfile.id}, scholarship_ids: ${scholarshipIdsArray}`);
      const { data: updatedApps, error: appError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'approved', is_scholarship_fee_paid: true })
        .eq('student_id', userProfile.id)
        .in('scholarship_id', scholarshipIdsArray)
        .select('id');
      if (appError) throw new Error(`Failed to update scholarship_applications: ${appError.message}`);

      console.log('Scholarship applications updated to approved status');

      // --- Notificação para a universidade via n8n ---
      try {
        // Buscar dados do aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', userId)
          .single();
        if (alunoError || !alunoData) throw new Error('Aluno não encontrado para notificação');

        // Para cada scholarship, enviar notificação
        for (const scholarshipId of scholarshipIdsArray) {
          try {
            // Buscar dados da bolsa
            const { data: scholarship, error: scholarshipError } = await supabase
              .from('scholarships')
              .select('id, title, university_id')
              .eq('id', scholarshipId)
              .single();
            if (scholarshipError || !scholarship) continue;

            // Buscar dados da universidade
            const { data: universidade, error: univError } = await supabase
              .from('universities')
              .select('id, name, contact')
              .eq('id', scholarship.university_id)
              .single();
            if (univError || !universidade) continue;

            const contact = universidade.contact || {};
            const emailUniversidade = contact.admissionsEmail || contact.email || '';
            if (!emailUniversidade) continue;

            // Montar mensagem
            const mensagem = `O aluno ${alunoData.full_name} pagou a taxa de bolsa para "${scholarship.title}" da universidade ${universidade.name}. O aluno foi aprovado e pode prosseguir com a matrícula.`;
            const payload = {
              tipo_notf: 'Pagamento de taxa de bolsa',
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              email_universidade: emailUniversidade,
              o_que_enviar: mensagem,
            };
            console.log('[NOTIFICAÇÃO] Payload para n8n (scholarship fee):', payload);

            // Enviar para o n8n
            const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3',
              },
              body: JSON.stringify(payload),
            });
            const n8nText = await n8nRes.text();
            console.log('[NOTIFICAÇÃO] Resposta do n8n (scholarship fee):', n8nRes.status, n8nText);
          } catch (notifErr) {
            console.error('[NOTIFICAÇÃO] Erro ao notificar universidade para scholarship:', scholarshipId, notifErr);
          }
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro geral ao notificar universidades:', notifErr);
      }
      // --- Fim da notificação ---

      // Limpa carrinho (opcional)
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.', application_ids: updatedApps?.map(app => app.id) || [] }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-scholarship-fee ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}); 