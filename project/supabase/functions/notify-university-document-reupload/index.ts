import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

function corsHeaders(origin: string | null) {
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    };
  }
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  try {
    console.log('[Edge] Requisição recebida:', req.method, req.url);
    if (req.method === 'OPTIONS') {
      console.log('[Edge] OPTIONS recebido, respondendo CORS');
      return new Response('ok', { status: 200, headers: corsHeaders(origin) });
    }

    if (req.method !== 'POST') {
      console.log('[Edge] Método não permitido:', req.method);
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
    }

    let body: any;
    try {
      body = await req.json();
      console.log('[Edge] Body recebido:', JSON.stringify(body));
    } catch (e) {
      console.log('[Edge] JSON inválido:', e);
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders(origin) });
    }

    const { 
      user_id, 
      application_id, 
      document_type, 
      document_label, 
      university_id, 
      scholarship_title,
      is_reupload 
    } = body;

    if (!user_id || !application_id || !document_type || !university_id) {
      console.log('[Edge] Campos obrigatórios ausentes');
      return new Response('user_id, application_id, document_type e university_id são obrigatórios', { 
        status: 400, 
        headers: corsHeaders(origin) 
      });
    }

    // 1. Buscar dados do aluno
    const { data: aluno, error: alunoError } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', user_id)
      .single();
    
    if (alunoError || !aluno) {
      console.log('[Edge] Aluno não encontrado:', alunoError);
      return new Response('Aluno não encontrado', { status: 404, headers: corsHeaders(origin) });
    }
    console.log('[Edge] Dados do aluno:', aluno);

    // 2. Buscar dados da universidade
    const { data: universidade, error: univError } = await supabase
      .from('universities')
      .select('id, name, contact')
      .eq('id', university_id)
      .single();
    
    if (univError || !universidade) {
      console.log('[Edge] Universidade não encontrada:', univError);
      return new Response('Universidade não encontrada', { status: 404, headers: corsHeaders(origin) });
    }
    console.log('[Edge] Dados da universidade:', universidade);

    // 3. Montar mensagens
    const nomeAluno = aluno.full_name;
    const nomeUniversidade = universidade.name;
    const emailAluno = aluno.email;
    const contact = universidade.contact || {};
    const emailUniversidade = contact.admissionsEmail || contact.email || '';
    const docLabel = document_label || document_type;
    const bolsaTitulo = scholarship_title || 'bolsa selecionada';

    const notifMessage = `Student ${nomeAluno} re-uploaded the ${docLabel} document for ${bolsaTitulo}. Please review the updated document.`;
    const n8nMessage = `O aluno ${nomeAluno} reenviou o documento ${docLabel} para a bolsa ${bolsaTitulo}. Por favor, revise o documento atualizado.`;

    console.log('[Edge] Mensagem de notificação:', notifMessage);

    // 4. Inserir notificação in-app
    try {
      const { error: notifError } = await supabase.from('university_notifications').insert({
        university_id: universidade.id,
        title: 'Document re-uploaded',
        message: notifMessage,
        type: 'document_reupload',
        link: '/school/dashboard/selection-process',
        metadata: {
          user_id,
          application_id,
          document_type,
          document_label: docLabel,
          scholarship_title: bolsaTitulo,
          is_reupload: true
        },
        idempotency_key: `${universidade.id}:${user_id}:${application_id}:${document_type}:${Date.now()}`
      });

      if (notifError) {
        console.log('[Edge] Erro ao inserir notificação in-app:', notifError);
        // Continuar mesmo com erro na notificação in-app
      } else {
        console.log('[Edge] Notificação in-app inserida com sucesso');
      }
    } catch (notifErr) {
      console.log('[Edge] Erro ao inserir notificação in-app:', notifErr);
    }

    // 5. Montar payload para n8n
    const payload = {
      tipo_notf: 'Documento reenviado pelo aluno',
      email_aluno: emailAluno,
      nome_aluno: nomeAluno,
      nome_bolsa: bolsaTitulo,
      nome_universidade: nomeUniversidade,
      email_universidade: emailUniversidade,
      o_que_enviar: n8nMessage,
      document_type: document_type,
      document_label: docLabel,
      application_id: application_id,
      is_reupload: true
    };
    console.log('[Edge] Payload para n8n:', payload);

    // 6. Enviar para o n8n
    try {
      const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.3',
        },
        body: JSON.stringify(payload),
      });
      const n8nText = await n8nRes.text();
      console.log('[Edge] Resposta do n8n:', n8nRes.status, n8nText);
      
      return new Response(JSON.stringify({
        status: n8nRes.status,
        n8nResponse: n8nText,
        payload,
        success: true
      }), { status: 200, headers: corsHeaders(origin) });
    } catch (n8nErr) {
      console.log('[Edge] Erro ao enviar para o n8n:', n8nErr);
      return new Response(JSON.stringify({ 
        error: true, 
        message: 'Erro ao enviar para o n8n', 
        details: n8nErr?.message 
      }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  } catch (err: any) {
    console.log('[Edge] Erro inesperado:', err);
    return new Response(JSON.stringify({ 
      error: true, 
      message: err?.message || 'Erro interno', 
      stack: err?.stack 
    }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
});
