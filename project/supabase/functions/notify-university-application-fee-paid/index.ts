import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

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
  console.log('--- notify-university-application-fee-paid: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { 
      application_id, 
      user_id, 
      scholarship_id 
    } = await req.json();

    if (!application_id || !user_id) {
      return corsResponse({ error: 'Missing required parameters: application_id and user_id are required' }, 400);
    }

    console.log(`Processing application fee notification for application: ${application_id}, user: ${user_id}, scholarship: ${scholarship_id}`);

    // Buscar dados do aluno
    const { data: alunoData, error: alunoError } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', user_id)
      .single();

    if (alunoError || !alunoData) {
      console.error('Erro ao buscar dados do aluno:', alunoError);
      return corsResponse({ error: 'Student data not found' }, 404);
    }

    // Buscar dados da aplicação e bolsa por student_id
    console.log(`Buscando aplicação para student_id: ${application_id}`);
    const { data: applicationData, error: appError } = await supabase
      .from('scholarship_applications')
      .select(`
        id,
        status,
        is_application_fee_paid,
        is_scholarship_fee_paid,
        scholarships!inner(
          id,
          title,
          university_id,
          application_fee_amount,
          universities!inner(
            id,
            name,
            contact
          )
        )
      `)
      .eq('student_id', application_id)
      .single();

    if (appError || !applicationData) {
      console.error('Erro ao buscar dados da aplicação por student_id:', appError);
      return corsResponse({ error: 'Application data not found' }, 404);
    }

    const scholarship = applicationData.scholarships;
    const university = scholarship.universities;
    const contact = university.contact || {};
    const emailUniversidade = contact.admissionsEmail || contact.email || '';

    // Verificar se a Application Fee realmente foi paga
    if (!applicationData.is_application_fee_paid) {
      console.log('Application fee not paid yet, skipping notification');
      return corsResponse({ 
        status: 'skipped', 
        message: 'Application fee not paid yet' 
      }, 200);
    }

    // Para pagamentos Zelle de application fee, sempre enviar notificação padrão
    // independente do status da aplicação
    console.log(`[DEBUG] Status da aplicação: ${applicationData.status}`);
    console.log(`[DEBUG] is_application_fee_paid: ${applicationData.is_application_fee_paid}`);
    console.log(`[DEBUG] is_scholarship_fee_paid: ${applicationData.is_scholarship_fee_paid}`);
    
    // Sempre enviar notificação de "Application Fee Payment Received" para pagamentos Zelle
    const mensagem = `Student ${alunoData.full_name} has completed the Application Fee payment ($${scholarship.application_fee_amount ? (scholarship.application_fee_amount).toFixed(2) : '350.00'}) for the scholarship "${scholarship.title}" at ${university.name}. The student awaits university approval. Please access the Selection Process page to review the application.`;
    const redirectUrl = '/school/dashboard/selection-process';
    const tipoNotf = 'Application Fee Payment Received';
    
    // Para o payload, sempre usar valores padrão para notificação de application fee
    const isApprovedByUniversity = false; // Sempre false para notificação de application fee
    const scholarshipFeePaid = false; // Sempre false para notificação de application fee

    const payload = {
      tipo_notf: tipoNotf,
      email_aluno: alunoData.email,
      nome_aluno: alunoData.full_name,
      nome_bolsa: scholarship.title,
      nome_universidade: university.name,
      email_universidade: emailUniversidade,
      o_que_enviar: mensagem,
      redirect_url: redirectUrl,
      application_id: application_id,
      scholarship_id: scholarship_id,
      university_id: university.id,
      is_approved_by_university: isApprovedByUniversity,
      fee_type: 'application_fee',
      fee_amount: scholarship.application_fee_amount || 35000, // em centavos
      scholarship_fee_paid: scholarshipFeePaid
    };

    console.log('[NOTIFICAÇÃO APPLICATION FEE] Payload para n8n:', payload);

    // Inserir notificação in-app para a universidade
    try {
      const notificationKey = `${university.id}:${mensagem.replace(/\s+/g, ' ').trim()}`.slice(0, 512);
      const { error: notificationError } = await supabase
        .from('university_notifications')
        .insert({
          university_id: university.id,
          title: tipoNotf,
          message: mensagem,
          type: 'payment_notification',
          link: redirectUrl,
          metadata: {
            application_id: application_id,
            user_id: user_id,
            scholarship_id: scholarship_id,
            fee_type: 'application_fee',
            fee_amount: scholarship.application_fee_amount || 35000,
            is_approved_by_university: isApprovedByUniversity,
            scholarship_fee_paid: scholarshipFeePaid
          },
          idempotency_key: notificationKey,
        });

      if (notificationError) {
        // Unique violation means duplicate — ignore
        if ((notificationError as any).code === '23505') {
          console.log(`[NOTIFICAÇÃO APPLICATION FEE] Notificação duplicada ignorada`);
        } else {
          console.error(`[NOTIFICAÇÃO APPLICATION FEE] Erro ao inserir notificação in-app:`, notificationError);
        }
      } else {
        console.log(`[NOTIFICAÇÃO APPLICATION FEE] Notificação in-app inserida com sucesso`);
      }
    } catch (notificationErr) {
      console.error(`[NOTIFICAÇÃO APPLICATION FEE] Erro ao inserir notificação in-app:`, notificationErr);
    }

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
    console.log('[NOTIFICAÇÃO APPLICATION FEE] Resposta do n8n:', n8nRes.status, n8nText);

    if (!n8nRes.ok) {
      console.error('[NOTIFICAÇÃO APPLICATION FEE] Erro ao enviar para n8n:', n8nRes.status, n8nText);
      return corsResponse({ error: 'Failed to send notification' }, 500);
    }

    return corsResponse({ 
      status: 'success', 
      message: 'Application fee notification sent successfully',
      redirect_url: redirectUrl,
      is_approved_by_university: isApprovedByUniversity,
      scholarship_fee_paid: scholarshipFeePaid
    }, 200);

  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in notify-university-application-fee-paid ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
});
