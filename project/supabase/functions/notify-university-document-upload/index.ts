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

    const { user_id, tipos_documentos } = body;
    if (!user_id || !tipos_documentos || !Array.isArray(tipos_documentos) || tipos_documentos.length === 0) {
      console.log('[Edge] user_id ou tipos_documentos ausente/incorreto no body');
      return new Response('user_id e tipos_documentos obrigatórios', { status: 400, headers: corsHeaders(origin) });
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

    // 2. Descobrir contexto (document_request ou revisão manual)
    const first = String(tipos_documentos[0] || '').trim();
    let contextTitle = '';
    let scholarshipId: string | null = null;

    // Helper para pegar aplicação mais recente do aluno
    const fetchLatestApplicationForUser = async (): Promise<string | null> => {
      // user_profiles.id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user_id)
        .single();
      if (!profile) return null;

      const { data: app } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return app?.scholarship_id ?? null;
    };

    if (first === 'manual_review') {
      contextTitle = 'Revisão manual de documentos';
      scholarshipId = await fetchLatestApplicationForUser();
      // Fallback: tentar selected_scholarship_id no perfil
      if (!scholarshipId) {
        const { data: sel } = await supabase
          .from('user_profiles')
          .select('selected_scholarship_id')
          .eq('user_id', user_id)
          .single();
        scholarshipId = sel?.selected_scholarship_id ?? null;
      }
    } else {
      // Fluxo padrão: tipos_documentos[0] é o id do document_request
      const document_request_id = first;
      const { data: docReq, error: docReqError } = await supabase
        .from('document_requests')
        .select('id, title, scholarship_application_id')
        .eq('id', document_request_id)
        .single();
      if (docReqError || !docReq) {
        console.log('[Edge] Document request não encontrado:', docReqError);
        return new Response('Document request não encontrado', { status: 404, headers: corsHeaders(origin) });
      }
      console.log('[Edge] Dados do document_request:', docReq);

      contextTitle = docReq.title || 'documento';

      const { data: app, error: appError } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id')
        .eq('id', docReq.scholarship_application_id)
        .single();
      if (appError || !app) {
        console.log('[Edge] Application não encontrada:', appError);
        return new Response('Application não encontrada', { status: 404, headers: corsHeaders(origin) });
      }
      console.log('[Edge] Dados da aplicação:', app);
      scholarshipId = app.scholarship_id;
    }

    // 4. Buscar dados da bolsa
    if (!scholarshipId) {
      // Último fallback: usar a universidade do próprio aluno (se existir)
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('university_id')
        .eq('user_id', user_id)
        .single();
      if (prof?.university_id) {
        const { data: universidade, error: univError } = await supabase
          .from('universities')
          .select('id, name, contact')
          .eq('id', prof.university_id)
          .single();
        if (!univError && universidade) {
          const nomeAluno = aluno.full_name;
          const nomeUniversidade = universidade.name;
          const emailAluno = aluno.email;
          const contact = universidade.contact || {};
          const emailUniversidade = contact.admissionsEmail || contact.email || '';
          const mensagem = `O aluno ${nomeAluno} iniciou revisão manual de documentos para ${nomeUniversidade}. Acesse o painel da universidade para revisar.`;
          const payload = {
            tipo_notf: 'Novo documento enviado pelo aluno',
            email_aluno: emailAluno,
            nome_aluno: nomeAluno,
            email_universidade: emailUniversidade,
            o_que_enviar: mensagem,
          };
          try {
            const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'PostmanRuntime/7.36.3' }, body: JSON.stringify(payload)
            });
            const n8nText = await n8nRes.text();
            return new Response(JSON.stringify({ status: n8nRes.status, n8nResponse: n8nText, payload }), { status: 200, headers: corsHeaders(origin) });
          } catch (e) {
            return new Response(JSON.stringify({ error: true, message: 'Erro ao enviar para o n8n', details: e?.message }), { status: 500, headers: corsHeaders(origin) });
          }
        }
      }
      console.log('[Edge] Nenhum scholarship_id encontrado para notificação. Encerrando com sucesso (skipped).');
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no_scholarship_context' }), { status: 200, headers: corsHeaders(origin) });
    }

    const { data: scholarship, error: scholarshipError } = await supabase
      .from('scholarships')
      .select('id, university_id')
      .eq('id', scholarshipId)
      .single();
    if (scholarshipError || !scholarship) {
      console.log('[Edge] Scholarship não encontrada:', scholarshipError);
      return new Response(JSON.stringify({ status: 'skipped', reason: 'scholarship_not_found' }), { status: 200, headers: corsHeaders(origin) });
    }
    console.log('[Edge] Dados da scholarship:', scholarship);

    // 5. Buscar dados da universidade
    const { data: universidade, error: univError } = await supabase
      .from('universities')
      .select('id, name, contact')
      .eq('id', scholarship.university_id)
      .single();
    if (univError || !universidade) {
      console.log('[Edge] Universidade não encontrada:', univError);
      return new Response('Universidade não encontrada', { status: 404, headers: corsHeaders(origin) });
    }
    console.log('[Edge] Dados da universidade:', universidade);

    // Montar mensagem customizada
    const nomeAluno = aluno.full_name;
    const nomeUniversidade = universidade.name;
    const emailAluno = aluno.email;
    const contact = universidade.contact || {};
    const emailUniversidade = contact.admissionsEmail || contact.email || '';
    const tipos = contextTitle || 'documento';
    const mensagem = first === 'manual_review'
      ? `O aluno ${nomeAluno} iniciou revisão manual de documentos para ${nomeUniversidade}. Acesse o painel da universidade para revisar.`
      : `O aluno ${nomeAluno} enviou ${tipos} solicitado para ${nomeUniversidade}. Acesse o painel da universidade para revisar o(s) arquivo(s).`;
    console.log('[Edge] Mensagem customizada:', mensagem);

    // Montar body padrão
    const payload = {
      tipo_notf: 'Novo documento enviado pelo aluno',
      email_aluno: emailAluno,
      nome_aluno: nomeAluno,
      email_universidade: emailUniversidade,
      o_que_enviar: mensagem,
    };
    console.log('[Edge] Payload para n8n:', payload);

    // Enviar para o n8n
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
      }), { status: 200, headers: corsHeaders(origin) });
    } catch (n8nErr) {
      console.log('[Edge] Erro ao enviar para o n8n:', n8nErr);
      return new Response(JSON.stringify({ error: true, message: 'Erro ao enviar para o n8n', details: n8nErr?.message }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  } catch (err: any) {
    console.log('[Edge] Erro inesperado:', err);
    return new Response(JSON.stringify({ error: true, message: err?.message || 'Erro interno', stack: err?.stack }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}); 