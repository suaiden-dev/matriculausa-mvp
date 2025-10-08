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
  try {
    console.log('[Edge] Requisição recebida');
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    console.log('[Edge] Body recebido:', JSON.stringify(body));

    const { title, description, due_date, attachment_url, scholarship_application_id, created_by, university_id, status, applicable_student_types, is_global } = body;
    
    console.log('[Edge] Dados extraídos do body:');
    console.log('[Edge] - scholarship_application_id:', scholarship_application_id);
    console.log('[Edge] - university_id:', university_id);
    console.log('[Edge] - is_global:', is_global);
    console.log('[Edge] - title:', title);
    console.log('[Edge] - attachment_url:', attachment_url);

    if (!title || !created_by || !university_id) {
      console.log('[Edge] Campos obrigatórios ausentes:', { title, created_by, university_id });
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400, headers: corsHeaders });
    }

    // Buscar application apenas se houver scholarship_application_id válido
    let application = null;
    let applicationError = null;
    console.log('[Edge] scholarship_application_id recebido:', scholarship_application_id);
    if (scholarship_application_id) {
      console.log('[Edge] Buscando application com ID:', scholarship_application_id);
      ({ data: application, error: applicationError } = await supabase
        .from('scholarship_applications')
        .select('*')
        .eq('id', scholarship_application_id)
        .single());
      console.log('[Edge] Application encontrada:', application);
      if (applicationError) {
        console.log('[Edge] Erro ao buscar application:', applicationError);
        // Se necessário, trate o erro aqui
      }
    } else {
      console.log('[Edge] Nenhum scholarship_application_id fornecido');
    }

    // 1. Criar o registro em document_requests
    console.log('[Edge] Tentando criar document_request:', {
      title,
      description,
      due_date,
      scholarship_application_id: scholarship_application_id || null,
      created_by,
      university_id,
      status: 'open',
      is_global: is_global !== undefined ? is_global : true,
      applicable_student_types
    });
    
    const insertData = {
      title,
      description,
      due_date,
      attachment_url: attachment_url || null,
      scholarship_application_id: scholarship_application_id || null,
      created_by,
      university_id,
      status: 'open',
      is_global: is_global !== undefined ? is_global : true,
      applicable_student_types
    };
    
    console.log('[Edge] Dados para inserção:', insertData);
    
    const { data: docReq, error: docReqError } = await supabase
      .from('document_requests')
      .insert(insertData)
      .select();
    if (docReqError) {
      console.log('[Edge] Erro ao criar document_request:', docReqError);
      return new Response(JSON.stringify({ error: 'Failed to create document request.' }), { status: 500, headers: corsHeaders });
    }
    console.log('[Edge] document_request criado com sucesso:', docReq);

    // 2. Notificar via n8n (com dados completos)
    try {
      // Buscar dados necessários para a notificação
      let emailAluno = '';
      let nomeAluno = '';
      let nomeBolsa = '';
      let nomeUniversidade = '';
      let emailUniversidade = '';
      let isPayloadReady = false;

      if (!is_global) {
        // Request individual: exige scholarship_application_id
        if (!scholarship_application_id) {
          console.log('[Edge] ERRO: scholarship_application_id ausente para request individual.');
          return new Response(JSON.stringify({ error: 'Missing scholarship_application_id for individual request.' }), { status: 400, headers: corsHeaders });
        }
        
        // Buscar application primeiro
        console.log('[Edge] Buscando application com ID:', scholarship_application_id);
        const { data: application, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select('id, student_id, scholarship_id, status, applied_at, created_at, updated_at')
          .eq('id', scholarship_application_id)
          .single();
        
        console.log('[Edge] Resultado da busca da application:', { application, applicationError });
        
        if (applicationError || !application) {
          console.log('[Edge] ERRO: Application não encontrada. ID:', scholarship_application_id, 'erro:', applicationError);
          return new Response(JSON.stringify({ error: 'Application not found.' }), { status: 400, headers: corsHeaders });
        }
        
        // Buscar dados do aluno - tentar primeiro por user_id, depois por id
        console.log('[Edge] Buscando aluno com student_id:', application.student_id);
        let { data: alunoData, error: alunoError } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', application.student_id)
          .single();
        
        console.log('[Edge] Resultado da busca do aluno por user_id:', { alunoData, alunoError });
        
        // Se não encontrou por user_id, tentar por id
        if (alunoError || !alunoData) {
          console.log('[Edge] Tentando buscar aluno por id:', application.student_id);
          const { data: alunoData2, error: alunoError2 } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', application.student_id)
            .single();
          
          console.log('[Edge] Resultado da busca do aluno por id:', { alunoData2, alunoError2 });
          
          if (!alunoError2 && alunoData2) {
            alunoData = alunoData2;
            alunoError = null;
          }
        }
        
        if (alunoError || !alunoData) {
          console.log('[Edge] ERRO: Aluno não encontrado. student_id:', application.student_id, 'erro:', alunoError);
          // Em vez de retornar erro, usar valores padrão
          nomeAluno = 'Aluno';
          emailAluno = 'aluno@exemplo.com';
        } else {
          nomeAluno = alunoData.full_name || 'Aluno';
          emailAluno = alunoData.email || 'aluno@exemplo.com';
        }
        
        // Buscar dados da bolsa
        console.log('[Edge] Buscando bolsa com scholarship_id:', application.scholarship_id);
        const { data: scholarshipData, error: scholarshipError } = await supabase
          .from('scholarships')
          .select('title, university_id')
          .eq('id', application.scholarship_id)
          .single();
        
        console.log('[Edge] Resultado da busca da bolsa:', { scholarshipData, scholarshipError });
        
        if (scholarshipError || !scholarshipData) {
          console.log('[Edge] ERRO: Bolsa não encontrada. scholarship_id:', application.scholarship_id, 'erro:', scholarshipError);
          nomeBolsa = 'Bolsa';
        } else {
          nomeBolsa = scholarshipData.title || 'Bolsa';
          
          // Buscar dados da universidade
          if (scholarshipData.university_id) {
            console.log('[Edge] Buscando universidade com university_id:', scholarshipData.university_id);
            const { data: universidadeData, error: universidadeError } = await supabase
              .from('universities')
              .select('name, contact')
              .eq('id', scholarshipData.university_id)
              .single();
            
            console.log('[Edge] Resultado da busca da universidade:', { universidadeData, universidadeError });
            
            if (universidadeError || !universidadeData) {
              console.log('[Edge] ERRO: Universidade não encontrada. university_id:', scholarshipData.university_id, 'erro:', universidadeError);
              nomeUniversidade = 'Universidade';
              emailUniversidade = 'universidade@exemplo.com';
            } else {
              nomeUniversidade = universidadeData.name || 'Universidade';
              const contact = universidadeData.contact || {};
              emailUniversidade = contact.admissionsEmail || contact.email || 'universidade@exemplo.com';
            }
          } else {
            nomeUniversidade = 'Universidade';
            emailUniversidade = 'universidade@exemplo.com';
          }
        }
        
        isPayloadReady = true;
      } else {
        // Request global: só busca universidade
        if (!university_id) {
          console.log('[Edge] ERRO: university_id ausente para request global.');
          return new Response(JSON.stringify({ error: 'Missing university_id for global request.' }), { status: 400, headers: corsHeaders });
        }
        const { data: universidadeData, error: universidadeError } = await supabase
          .from('universities')
          .select('name, contact')
          .eq('id', university_id)
          .single();
        if (universidadeError || !universidadeData) {
          console.log('[Edge] ERRO: Universidade não encontrada (global):', universidadeError);
          return new Response(JSON.stringify({ error: 'University not found.' }), { status: 400, headers: corsHeaders });
        }
        nomeUniversidade = universidadeData.name;
        const contact = universidadeData.contact || {};
        emailUniversidade = contact.admissionsEmail || contact.email || '';
        isPayloadReady = true;
      }

      // Montar mensagem no padrão correto
      const mensagem = `A universidade ${nomeUniversidade} solicitou o documento "${title}" para o aluno ${nomeAluno} referente à bolsa "${nomeBolsa}". Acesse o painel para revisar a solicitação.`;

      if (!isPayloadReady) {
        console.log('[Edge] ERRO: Payload incompleto, notificação não será enviada.');
        return new Response(JSON.stringify({ error: 'Incomplete payload, notification not sent.' }), { status: 400, headers: corsHeaders });
      }

      const payload = {
        tipo_notf: 'Novo documento solicitado',
        email_aluno: emailAluno,
        nome_aluno: nomeAluno,
        nome_bolsa: nomeBolsa,
        nome_universidade: nomeUniversidade,
        email_universidade: emailUniversidade,
        o_que_enviar: mensagem
      };
      console.log('[Edge] Payload final para n8n:', payload);
      
      const n8nResponse = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!n8nResponse.ok) {
        console.log('[Edge] n8n retornou erro:', n8nResponse.status, await n8nResponse.text());
      } else {
        console.log('[Edge] Notificação enviada com sucesso para n8n');
      }
    } catch (n8nError) {
      console.log('[Edge] Erro ao notificar n8n:', n8nError);
      // Não falha a criação do document_request por causa da notificação
    }

    return new Response(JSON.stringify({ success: true, document_request: docReq[0] }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.log('[Edge] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), { status: 500, headers: corsHeaders });
  }
}); 