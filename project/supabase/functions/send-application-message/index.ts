import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[send-application-message] Iniciando processamento');
    const { application_id, text, file_url, file_name } = await req.json();
    console.log('[send-application-message] Payload recebido:', { application_id, text, file_url, file_name });
    if (!application_id || (!text && !file_url)) {
      console.warn('[send-application-message] Mensagem sem texto ou anexo.');
      return new Response(JSON.stringify({ error: 'A message must have text or an attachment.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[send-application-message] Missing Authorization header');
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('[send-application-message] User not authenticated', userError);
      throw new Error('User not authenticated');
    }
    
    const sender_id = user.id;

    const { data: appData, error: appError } = await supabase
      .from('scholarship_applications')
      .select(`
        student_id, 
        scholarships(
          universities(
            user_id,
            name,
            contact,
            payment_contact_email
          )
        ),
        user_profiles!student_id(
          full_name,
          email
        )
      `)
      .eq('id', application_id)
      .single();

    if (appError || !appData) {
      console.error('[send-application-message] Falha ao buscar detalhes da aplicação', appError);
      throw new Error('Failed to retrieve application details or application not found.');
    }

    const studentProfileId = appData.student_id;
    const universityUserId = appData.scholarships?.universities?.user_id;
    const universityName = appData.scholarships?.universities?.name;
    const universityContact = appData.scholarships?.universities?.contact;
    const universityEmail = universityContact?.email || appData.scholarships?.universities?.payment_contact_email;
    const studentName = appData.user_profiles?.full_name;
    const studentEmail = appData.user_profiles?.email;

    // Buscar o user_id do estudante (auth.users.id) a partir do user_profiles
    const { data: studentProfile, error: studentProfileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('id', studentProfileId)
      .single();

    if (studentProfileError || !studentProfile) {
      console.error('[send-application-message] Não foi possível buscar user_id do estudante', studentProfileError);
      throw new Error('Could not retrieve student user_id from user_profiles.');
    }

    const studentUserId = studentProfile.user_id;

    if (!studentUserId || !universityUserId) {
        console.error('[send-application-message] Não foi possível determinar studentUserId ou universityUserId', { studentUserId, universityUserId });
        throw new Error('Could not determine student or university from application.');
    }

    let recipient_id: string;
    if (sender_id === studentUserId) {
        recipient_id = universityUserId;
    } else if (sender_id === universityUserId) {
        recipient_id = studentUserId;
    } else {
        console.error('[send-application-message] Sender não faz parte da aplicação', { sender_id, studentUserId, universityUserId });
        throw new Error('Sender is not part of this application.');
    }

    const { data: newMessage, error: msgError } = await supabase
      .from('application_messages')
      .insert({
        application_id,
        sender_id,
        recipient_id,
        message: text || '',
      })
      .select()
      .single();

    if (msgError || !newMessage) {
      console.error('[send-application-message] Falha ao enviar mensagem', msgError);
      throw new Error(`Failed to send message: ${msgError?.message}`);
    }

    let attachments: any[] = [];
    if (file_url) {
      const { data: attachmentData, error: attachError } = await supabase
        .from('application_message_attachments')
        .insert({
          message_id: newMessage.id,
          file_url,
          file_name: file_name || null,
        })
        .select()
        .single();
      if (attachError) {
        // Log the error, but don't fail the whole request
        console.error('[send-application-message] Falha ao salvar anexo:', attachError.message);
      } else {
        attachments = [attachmentData];
      }
    }
    
    // A notificação por email será enviada via cron job que roda a cada hora
    // verificando mensagens não lidas há mais de 1 hora

    // The client expects the full message object for optimistic updates
    const responseMessage = {
      ...newMessage,
      attachments: attachments
    };
    
    console.log('[send-application-message] Mensagem enviada com sucesso', responseMessage);
    return new Response(JSON.stringify(responseMessage), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-application-message] Erro inesperado:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 