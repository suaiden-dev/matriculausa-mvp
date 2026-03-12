import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Helper function to create responses with CORS headers
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
  console.log('--- verify-stripe-session: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    
    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-04-10',
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0',
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);
    console.log(`Verifying session ID: ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const feeType = session.metadata?.fee_type;
      const applicationId = session.metadata?.application_id;

      console.log(`Processing successful payment. UserID: ${userId}, FeeType: ${feeType}, ApplicationID: ${applicationId}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);

      // Buscar o perfil do usuário para obter o student_id correto
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (profileError || !userProfile) throw new Error('User profile não encontrado.');
      const studentId = userProfile.id;

      // --- Lógica Condicional de Pagamento ---

      if (feeType === 'application_fee') {
        if (!applicationId) {
          console.error('application_id ausente no metadata ao verificar sessão Stripe:', session.metadata);
          return corsResponse({ error: 'application_id ausente no metadata.' }, 400);
        }
        console.log('Processing: Application Fee');
        // Atualiza perfil (flag global) e SOMENTE a aplicação correta (flag da aplicação)
        const { error: profileError2 } = await supabase
          .from('user_profiles')
          .update({ 
            is_application_fee_paid: true,
            application_fee_payment_method: session.metadata?.payment_method || 'stripe'
          })
          .eq('user_id', userId);
        if (profileError2) throw new Error(`Failed to update user_profiles: ${profileError2.message}`);
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({ is_application_fee_paid: true })
          .eq('id', applicationId)
          .eq('student_id', studentId);
        if (appError) throw new Error(`Failed to update scholarship_application: ${appError.message}`);
        const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
        if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
        console.log(`[verify-stripe-session] Application fee marked as paid for user ${userId}, application ${applicationId}.`);

        // Remover todas as outras aplicações do aluno para que não apareçam mais para universidades
        try {
          const { error: delErr } = await supabase
            .from('scholarship_applications')
            .delete()
            .neq('id', applicationId)
            .eq('student_id', studentId);
          if (delErr) console.error('[CLEANUP] Erro ao remover outras aplicações do aluno:', delErr.message);
          else console.log('[CLEANUP] Outras aplicações do aluno removidas com sucesso');
        } catch (cleanupErr) {
          console.error('[CLEANUP] Exceção ao remover outras aplicações:', cleanupErr);
        }
        
        // --- Notificação para a universidade via n8n ---
        try {
          // Buscar dados do aluno
          const { data: alunoData, error: alunoError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', userId)
            .single();
          if (alunoError || !alunoData) throw new Error('Aluno não encontrado para notificação');

          // Buscar dados da aplicação usando student_id correto
          const { data: application, error: appFetchError } = await supabase
            .from('scholarship_applications')
            .select('id, scholarship_id')
            .eq('id', applicationId)
            .eq('student_id', studentId)
            .single();
          if (appFetchError || !application) throw new Error('Application não encontrada para notificação');
          // Log extra para depuração do scholarship_id
          if (!application.scholarship_id) {
            console.error('[NOTIFICAÇÃO] scholarship_id ausente na aplicação:', application);
            throw new Error('Application inconsistente: scholarship_id ausente.');
          }
          console.log('[NOTIFICAÇÃO] scholarship_id encontrado na aplicação:', application.scholarship_id);

          // Buscar dados da bolsa
          const { data: scholarship, error: scholarshipError } = await supabase
            .from('scholarships')
            .select('id, title, university_id')
            .eq('id', application.scholarship_id)
            .single();
          console.log('[NOTIFICAÇÃO] Resultado da busca na tabela scholarships:', scholarship, scholarshipError);
          if (scholarshipError || !scholarship) throw new Error('Bolsa não encontrada para notificação');

          // Buscar dados da universidade
          const { data: universidade, error: univError } = await supabase
            .from('universities')
            .select('id, name, contact')
            .eq('id', scholarship.university_id)
            .single();
          if (univError || !universidade) throw new Error('Universidade não encontrada para notificação');
          const contact = universidade.contact || {};
          const emailUniversidade = contact.admissionsEmail || contact.email || '';

          // Montar mensagem
          const mensagem = `O aluno ${alunoData.full_name} selecionou a bolsa "${scholarship.title}" da universidade ${universidade.name} e pagou a taxa de aplicação. Acesse o painel para revisar a candidatura.`;
          const payload = {
            tipo_notf: 'Novo pagamento de application fee',
            email_aluno: alunoData.email,
            nome_aluno: alunoData.full_name,
            nome_bolsa: scholarship.title,
            nome_universidade: universidade.name,
            email_universidade: emailUniversidade,
            o_que_enviar: mensagem,
          };
          console.log('[NOTIFICAÇÃO] Payload para n8n:', payload);
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
          console.log('[NOTIFICAÇÃO] Resposta do n8n:', n8nRes.status, n8nText);

          // ✅ IN-APP NOTIFICATION FOR STUDENT (Application Fee)
          try {
            await supabase.from('student_notifications').insert({
                student_id: studentId,
                title: 'Application Fee Confirmed',
                message: `Your Application Fee for ${scholarship.title} at ${universidade.name} has been confirmed.`,
                link: '/student/dashboard/applications',
                created_at: new Date().toISOString()
            });
          } catch (inAppError) {
             console.error('Error creating in-app notification:', inAppError);
          }

        } catch (notifErr) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar universidade:', notifErr);
        }
        // --- Fim da notificação ---
        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else if (feeType === 'scholarship_fee') {
        if (!applicationId) {
          console.error('application_id ausente no metadata ao verificar sessão Stripe:', session.metadata);
          return corsResponse({ error: 'application_id ausente no metadata.' }, 400);
        }
        console.log('Processing: Scholarship Fee');
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ 
            status: 'approved',
            scholarship_fee_payment_method: session.metadata?.payment_method || 'stripe'
          })
          .eq('student_id', studentId)
          .eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status for scholarship fee: ${updateError.message}`);

        // Também atualizar o perfil do usuário para consistência
        await supabase.from('user_profiles').update({
          is_scholarship_fee_paid: true,
          scholarship_fee_payment_method: session.metadata?.payment_method || 'stripe'
        }).eq('user_id', userId);

        // Remover todas as outras aplicações do aluno
        try {
          const { error: delErr } = await supabase
            .from('scholarship_applications')
            .delete()
            .neq('id', applicationId)
            .eq('student_id', studentId);
          if (delErr) console.error('[CLEANUP] Erro ao remover outras aplicações do aluno:', delErr.message);
        } catch (cleanupErr) {
          console.error('[CLEANUP] Exceção ao remover outras aplicações:', cleanupErr);
        }
        // ✅ IN-APP NOTIFICATION FOR STUDENT (Scholarship Fee)
        try {
          await supabase.from('student_notifications').insert({
              student_id: studentId,
              title: 'Scholarship Fee Confirmed',
              message: 'Your Scholarship Fee has been confirmed. You are now approved!',
              link: '/student/dashboard/applications',
              created_at: new Date().toISOString()
          });
        } catch (inAppError) {
           console.error('Error creating in-app notification:', inAppError);
        }
        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else if (feeType === 'placement_fee') {
        console.log('Processing: Placement Fee');
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            is_placement_fee_paid: true,
            placement_fee_paid_at: new Date().toISOString(),
            placement_fee_payment_method: session.metadata?.payment_method || 'stripe'
          })
          .eq('user_id', userId);
        if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);
        
        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else if (feeType === 'selection_process') {
        console.log('Processing: Selection Process Fee');
        // Atualiza perfil do usuário
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_selection_process_fee: true,
            selection_process_fee_payment_method: session.metadata?.payment_method || 'stripe'
          })
          .eq('user_id', userId);
        if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);
        // Se houver applicationId, atualiza a aplicação
        if (applicationId) {
          const { error: updateError } = await supabase
            .from('scholarship_applications')
            .update({ status: 'selection_process_paid' })
            .eq('student_id', studentId)
            .eq('id', applicationId);
          if (updateError) throw new Error(`Failed to update application status for selection process fee: ${updateError.message}`);
        }
        // Limpa carrinho
        const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
        if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);

        // ✅ IN-APP NOTIFICATION FOR STUDENT (Selection Process Fee)
        try {
          await supabase.from('student_notifications').insert({
              student_id: studentId,
              title: 'Payment Confirmed',
              message: 'Your Selection Process Fee has been confirmed. You can now proceed to select your schools.',
              link: '/student/dashboard/applications',
              created_at: new Date().toISOString()
          });
        } catch (inAppError) {
           console.error('Error creating in-app notification:', inAppError);
        }

        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else {
        console.warn(`Unhandled fee_type: ${feeType}`);
        return corsResponse({ error: `fee_type inválido: ${feeType}` }, 400);
      }
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}); 