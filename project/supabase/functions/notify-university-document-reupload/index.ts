import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';

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

/**
 * Busca todos os usuários admin do sistema
 * Retorna array com email, nome e telefone de cada admin
 * Em ambiente de desenvolvimento (localhost), filtra emails específicos
 */
async function getAllAdmins(supabase: SupabaseClient, isDevelopment: boolean = false): Promise<Array<{
  email: string;
  full_name: string;
  phone: string;
}>> {
  // Emails a serem filtrados em ambiente de desenvolvimento
  const devBlockedEmails = [
    'luizedmiola@gmail.com',
    'chimentineto@gmail.com',
    'fsuaiden@gmail.com',
    'rayssathefuture@gmail.com',
    'gui.reis@live.com',
    'admin@matriculausa.com'
  ];
  
  try {
    // Buscar todos os admins da tabela user_profiles onde role = 'admin'
    const { data: adminProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, phone')
      .eq('role', 'admin');

    if (profileError) {
      console.error('[getAllAdmins] Erro ao buscar admins de user_profiles:', profileError);
      
      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            const filteredAdmins = isDevelopment 
              ? adminUsers.filter(admin => !devBlockedEmails.includes(admin.email))
              : adminUsers;
            console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              email: 'admin@matriculausa.com',
              full_name: 'Admin MatriculaUSA',
              phone: ''
            }];
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin encontrado em user_profiles, tentando auth.users...');
      
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            const filteredAdmins = isDevelopment 
              ? adminUsers.filter(admin => !devBlockedEmails.includes(admin.email))
              : adminUsers;
            console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              email: 'admin@matriculausa.com',
              full_name: 'Admin MatriculaUSA',
              phone: ''
            }];
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    // Se algum admin não tem email em user_profiles, buscar de auth.users
    const adminsWithEmail = await Promise.all(
      adminProfiles.map(async (profile) => {
        if (profile.email) {
          return {
            email: profile.email,
            full_name: profile.full_name || 'Admin MatriculaUSA',
            phone: profile.phone || ''
          };
        } else {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              email: authUser?.user?.email || '',
              full_name: profile.full_name || authUser?.user?.user_metadata?.full_name || 'Admin MatriculaUSA',
              phone: profile.phone || authUser?.user?.user_metadata?.phone || ''
            };
          } catch (e) {
            console.warn(`[getAllAdmins] Erro ao buscar email para user_id ${profile.user_id}:`, e);
            return null;
          }
        }
      })
    );

    // Filtrar nulos e admins sem email
    let admins = adminsWithEmail
      .filter((admin): admin is { email: string; full_name: string; phone: string } => 
        admin !== null && !!admin.email
      );

    // Filtrar emails bloqueados em desenvolvimento
    if (isDevelopment) {
      const beforeFilter = admins.length;
      admins = admins.filter(admin => !devBlockedEmails.includes(admin.email));
      if (beforeFilter !== admins.length) {
        console.log(`[getAllAdmins] Filtrados ${beforeFilter - admins.length} admin(s) em ambiente de desenvolvimento`);
      }
    }

    if (admins.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin válido encontrado após processamento, usando admin padrão');
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    console.log(`[getAllAdmins] Encontrados ${admins.length} admin(s)${isDevelopment ? ' (filtrados para dev)' : ''}:`, admins.map(a => a.email));

    return admins;
  } catch (error) {
    console.error('[getAllAdmins] Erro inesperado ao buscar admins:', error);
    return [{
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  }
}

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

    // 4. Detectar ambiente de desenvolvimento
    const originHeader = req.headers.get('origin') || '';
    const isDevelopment = originHeader.includes('localhost') || 
                          originHeader.includes('127.0.0.1') || 
                          originHeader.includes('0.0.0.0');

    // 5. Buscar todos os administradores
    const admins = await getAllAdmins(supabase, isDevelopment);
    console.log(`[Edge] Encontrados ${admins.length} admin(s) para notificação${isDevelopment ? ' (filtrados para dev)' : ''}`);

    // 6. Inserir notificação in-app para universidade
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

    // 7. Montar payload para n8n (universidade)
    const universityPayload = {
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
    console.log('[Edge] Payload para n8n (universidade):', universityPayload);

    // 8. Enviar notificações em paralelo: universidade e todos os admins
    const notificationPromises: Promise<any>[] = [];

    // Notificação para universidade
    notificationPromises.push(
      fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.3',
        },
        body: JSON.stringify(universityPayload),
      }).then(async (res) => {
        const text = await res.text();
        console.log('[Edge] Resposta do n8n (universidade):', res.status, text);
        return { type: 'university', status: res.status, response: text };
      }).catch((err) => {
        console.error('[Edge] Erro ao enviar notificação para universidade:', err);
        return { type: 'university', error: err.message };
      })
    );

    // Notificações para todos os administradores
    const adminNotificationPromises = admins.map(async (admin) => {
      const adminPayload = {
        tipo_notf: 'Documento reenviado pelo aluno - Admin',
        email_admin: admin.email,
        nome_admin: admin.full_name,
        phone_admin: admin.phone || '',
        email_aluno: emailAluno,
        nome_aluno: nomeAluno,
        phone_aluno: '', // Pode ser adicionado se necessário
        o_que_enviar: `O aluno ${nomeAluno} reenviou o documento ${docLabel} para a bolsa ${bolsaTitulo} (${nomeUniversidade}). Por favor, revise o documento atualizado no painel administrativo.`,
        document_type: document_type,
        document_label: docLabel,
        application_id: application_id,
        scholarship_title: bolsaTitulo,
        university_name: nomeUniversidade,
        is_reupload: true,
        notification_type: 'admin'
      };

      try {
        const response = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3',
          },
          body: JSON.stringify(adminPayload),
        });

        const responseText = await response.text();
        if (response.ok) {
          console.log(`[Edge] ✅ Notificação enviada para admin ${admin.email}`);
          return { success: true, email: admin.email, status: response.status };
        } else {
          console.error(`[Edge] ❌ Erro ao enviar notificação para admin ${admin.email}:`, response.status, responseText);
          return { success: false, email: admin.email, status: response.status, error: responseText };
        }
      } catch (error) {
        console.error(`[Edge] ❌ Erro ao enviar notificação para admin ${admin.email}:`, error);
        return { success: false, email: admin.email, error: String(error) };
      }
    });

    notificationPromises.push(...adminNotificationPromises);

    // Aguardar todas as notificações
    const results = await Promise.allSettled(notificationPromises);
    
    const universityResult = results[0];
    const adminResults = results.slice(1);

    console.log('[Edge] Resultados das notificações:', {
      university: universityResult.status === 'fulfilled' ? universityResult.value : universityResult.reason,
      admins: adminResults.map(r => r.status === 'fulfilled' ? r.value : r.reason)
    });

    // Retornar resposta com status das notificações
    const universityStatus = universityResult.status === 'fulfilled' 
      ? (universityResult.value as any).status || 200
      : 500;

    return new Response(JSON.stringify({
      status: universityStatus,
      universityNotification: universityResult.status === 'fulfilled' ? universityResult.value : null,
      adminNotifications: adminResults.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) }),
      payload: universityPayload,
      success: true
    }), { status: 200, headers: corsHeaders(origin) });
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
