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
  console.log('--- notify-university-scholarship-fee-paid: Request received ---');
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

    console.log(`Processing scholarship fee notification for application: ${application_id}, user: ${user_id}, scholarship: ${scholarship_id}`);

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
    // Primeiro tentar buscar por ID da aplicação
    let { data: applicationData, error: appError } = await supabase
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
      .eq('id', application_id)
      .single();

    // Se não encontrar por ID, tentar buscar por student_id
    if (appError || !applicationData) {
      console.log('Tentando buscar aplicação por student_id...');
      const { data: appDataByStudent, error: appErrorByStudent } = await supabase
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
      
      if (appErrorByStudent || !appDataByStudent) {
        console.error('Erro ao buscar dados da aplicação por ID e student_id:', appError, appErrorByStudent);
        return corsResponse({ error: 'Application data not found' }, 404);
      }
      
      applicationData = appDataByStudent;
    }

    const scholarship = applicationData.scholarships;
    const university = scholarship.universities;
    const contact = university.contact || {};
    const emailUniversidade = contact.admissionsEmail || contact.email || '';

    // Verificar se a Scholarship Fee realmente foi paga
    if (!applicationData.is_scholarship_fee_paid) {
      console.log('Scholarship fee not paid yet, skipping notification');
      return corsResponse({ 
        status: 'skipped', 
        message: 'Scholarship fee not paid yet' 
      }, 200);
    }

    // Determinar se o aluno já foi aprovado pela universidade
    const isApprovedByUniversity = applicationData.status === 'approved';
    const applicationFeePaid = applicationData.is_application_fee_paid;
    
    // Montar mensagem baseada no status de aprovação e pagamento da application fee
    let mensagem, redirectUrl, tipoNotf;
    
    if (isApprovedByUniversity) {
      if (applicationFeePaid) {
        // Student approved and both fees paid
        mensagem = `Student ${alunoData.full_name} has completed the Scholarship Fee payment ($400.00) for the scholarship "${scholarship.title}" at ${university.name}. The student has paid both fees and is ready for enrollment. Please access the Students page to track the process.`;
        redirectUrl = '/school/dashboard/students';
        tipoNotf = 'Approved Student - Scholarship Fee Paid (Both Fees Paid)';
      } else {
        // Student approved, Scholarship Fee paid, but Application Fee pending (rare case)
        mensagem = `Student ${alunoData.full_name} has completed the Scholarship Fee payment ($400.00) for the scholarship "${scholarship.title}" at ${university.name}. The student still needs to pay the Application Fee ($${scholarship.application_fee_amount ? (scholarship.application_fee_amount / 100).toFixed(2) : '350.00'}) to complete the process. Please access the Students page to track the progress.`;
        redirectUrl = '/school/dashboard/students';
        tipoNotf = 'Approved Student - Scholarship Fee Paid (Application Fee Pending)';
      }
    } else {
      // Student not yet approved - redirect to Selection Process
      mensagem = `Student ${alunoData.full_name} has completed the Scholarship Fee payment ($400.00) for the scholarship "${scholarship.title}" at ${university.name}. The student awaits university approval. Please access the Selection Process page to review the application.`;
      redirectUrl = '/school/dashboard/selection-process';
      tipoNotf = 'Student Awaiting Approval - Scholarship Fee Paid';
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
      is_approved_by_university: isApprovedByUniversity,
      fee_type: 'scholarship_fee',
      fee_amount: 40000, // $400.00 em centavos
      application_fee_paid: applicationFeePaid
    };

    console.log('[NOTIFICAÇÃO SCHOLARSHIP FEE] Payload para n8n:', payload);

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
            fee_type: 'scholarship_fee',
            fee_amount: 40000,
            is_approved_by_university: isApprovedByUniversity,
            application_fee_paid: applicationFeePaid
          },
          idempotency_key: notificationKey,
        });

      if (notificationError) {
        // Unique violation means duplicate — ignore
        if ((notificationError as any).code === '23505') {
          console.log(`[NOTIFICAÇÃO SCHOLARSHIP FEE] Notificação duplicada ignorada`);
        } else {
          console.error(`[NOTIFICAÇÃO SCHOLARSHIP FEE] Erro ao inserir notificação in-app:`, notificationError);
        }
      } else {
        console.log(`[NOTIFICAÇÃO SCHOLARSHIP FEE] Notificação in-app inserida com sucesso`);
      }
    } catch (notificationErr) {
      console.error(`[NOTIFICAÇÃO SCHOLARSHIP FEE] Erro ao inserir notificação in-app:`, notificationErr);
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
    console.log('[NOTIFICAÇÃO SCHOLARSHIP FEE] Resposta do n8n:', n8nRes.status, n8nText);

    if (!n8nRes.ok) {
      console.error('[NOTIFICAÇÃO SCHOLARSHIP FEE] Erro ao enviar para n8n:', n8nRes.status, n8nText);
      return corsResponse({ error: 'Failed to send notification' }, 500);
    }

    return corsResponse({ 
      status: 'success', 
      message: 'Scholarship fee notification sent successfully',
      redirect_url: redirectUrl,
      is_approved_by_university: isApprovedByUniversity,
      application_fee_paid: applicationFeePaid
    }, 200);

  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in notify-university-scholarship-fee-paid ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
});
