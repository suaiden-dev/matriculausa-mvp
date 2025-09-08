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
  console.log('--- notify-university-both-fees-paid: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { 
      application_id, 
      user_id, 
      scholarship_id 
    } = await req.json();

    if (!application_id || !user_id || !scholarship_id) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    console.log(`Processing notification for application: ${application_id}, user: ${user_id}, scholarship: ${scholarship_id}`);

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

    // Buscar dados da aplicação e bolsa
    const { data: applicationData, error: appError } = await supabase
      .from('scholarship_applications')
      .select(`
        id,
        status,
        scholarships!inner(
          id,
          title,
          university_id,
          universities!inner(
            id,
            name,
            contact
          )
        )
      `)
      .eq('id', application_id)
      .single();

    if (appError || !applicationData) {
      console.error('Erro ao buscar dados da aplicação:', appError);
      return corsResponse({ error: 'Application data not found' }, 404);
    }

    const scholarship = applicationData.scholarships;
    const university = scholarship.universities;
    const contact = university.contact || {};
    const emailUniversidade = contact.admissionsEmail || contact.email || '';

    // Determinar se o aluno já foi aprovado pela universidade
    const isApprovedByUniversity = applicationData.status === 'approved';
    
    // Montar mensagem baseada no status de aprovação
    let mensagem, redirectUrl, tipoNotf;
    
    if (isApprovedByUniversity) {
      // Aluno já aprovado - redirecionar para Students
      mensagem = `O aluno ${alunoData.full_name} completou o pagamento de ambas as taxas (Application Fee e Scholarship Fee) para a bolsa "${scholarship.title}" da universidade ${university.name}. O aluno está pronto para matrícula. Acesse a página Students para acompanhar o processo.`;
      redirectUrl = '/school/dashboard/students';
      tipoNotf = 'Aluno aprovado - Pagamento completo realizado';
    } else {
      // Aluno ainda não aprovado - redirecionar para Selection Process
      mensagem = `O aluno ${alunoData.full_name} completou o pagamento de ambas as taxas (Application Fee e Scholarship Fee) para a bolsa "${scholarship.title}" da universidade ${university.name}. O aluno aguarda aprovação da universidade. Acesse a página Selection Process para revisar a candidatura.`;
      redirectUrl = '/school/dashboard/selection-process';
      tipoNotf = 'Aluno aguardando aprovação - Pagamento completo realizado';
    }

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
      is_approved_by_university: isApprovedByUniversity
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

    if (!n8nRes.ok) {
      console.error('[NOTIFICAÇÃO] Erro ao enviar para n8n:', n8nRes.status, n8nText);
      return corsResponse({ error: 'Failed to send notification' }, 500);
    }

    return corsResponse({ 
      status: 'success', 
      message: 'Notification sent successfully',
      redirect_url: redirectUrl,
      is_approved_by_university: isApprovedByUniversity
    }, 200);

  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in notify-university-both-fees-paid ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
});
