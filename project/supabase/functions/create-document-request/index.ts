import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Configurações
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const n8nUrl = 'https://nwh.suaiden.com/webhook/notfmatriculausa';

Deno.serve(async (req) => {
  console.log('[Edge] Requisição recebida');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
    console.log('[Edge] Body recebido:', JSON.stringify(body));
  } catch (e) {
    console.log('[Edge] Erro ao fazer parse do body:', e);
    return new Response(JSON.stringify({ error: 'Invalid JSON', details: e.message }), { status: 400, headers: corsHeaders });
  }

  try {
    const {
      title,
      description,
      due_date,
      scholarship_application_id,
      created_by,
      university_id
    } = body;

    if (!title || !scholarship_application_id || !created_by || !university_id) {
      console.log('[Edge] Campos obrigatórios ausentes:', { title, scholarship_application_id, created_by, university_id });
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400, headers: corsHeaders });
    }

    // 1. Criar o registro em document_requests
    const { data: docReq, error: docReqError } = await supabase
      .from('document_requests')
      .insert({
        title,
        description,
        due_date,
        scholarship_application_id,
        created_by,
        university_id,
        status: 'open',
      })
      .select()
      .single();
    if (docReqError) {
      console.log('[Edge] Erro ao criar document_request:', docReqError);
      return new Response(JSON.stringify({ error: 'Failed to create document request', details: docReqError.message }), { status: 500, headers: corsHeaders });
    }

    // 2. Buscar dados do aluno e universidade
    const { data: appData, error: appError } = await supabase
      .from('scholarship_applications')
      .select('student_id, scholarships(universities(name))')
      .eq('id', scholarship_application_id)
      .maybeSingle();
    if (appError || !appData) {
      console.log('[Edge] Erro ao buscar application:', appError);
      return new Response(JSON.stringify({ error: 'Failed to fetch application data' }), { status: 500, headers: corsHeaders });
    }
    const studentProfileId = appData.student_id;
    const universityName = appData.scholarships?.universities?.name || 'University';

    // Buscar dados do aluno
    const { data: studentProfile, error: studentError } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', studentProfileId)
      .maybeSingle();
    if (studentError || !studentProfile) {
      console.log('[Edge] Erro ao buscar student_profile:', studentError);
      return new Response(JSON.stringify({ error: 'Failed to fetch student profile' }), { status: 500, headers: corsHeaders });
    }

    // 3. Montar payload para o n8n
    const n8nPayload = {
      tipo_notf: 'Novo pedido de documento',
      email_aluno: studentProfile.email,
      nome_aluno: studentProfile.full_name,
      o_que_enviar: `You have new documents requested by ${universityName}: ${title}. Please log in to your student area and upload the required files as soon as possible.`
    };
    console.log('[Edge] Payload enviado para n8n:', JSON.stringify(n8nPayload));

    // 4. Enviar para o n8n
    let n8nStatus = null;
    let n8nResponse = null;
    try {
      const n8nRes = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      });
      n8nStatus = n8nRes.status;
      n8nResponse = await n8nRes.text();
      console.log('[Edge] Resposta do n8n:', n8nStatus, n8nResponse);
    } catch (err) {
      n8nStatus = 'fetch_error';
      n8nResponse = String(err);
      console.log('[Edge] Erro ao enviar para o n8n:', err);
    }

    return new Response(JSON.stringify({
      success: true,
      document_request: docReq,
      n8n: { status: n8nStatus, response: n8nResponse }
    }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.log('[Edge] Erro inesperado:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}); 