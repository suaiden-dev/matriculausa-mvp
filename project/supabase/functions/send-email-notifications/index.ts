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
    console.log('[send-email-notifications] Iniciando verificação de notificações');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Para testes, aceitar chamadas sem autenticação
    console.log('[send-email-notifications] Usando Service Role Key para acesso ao banco');

    // Buscar mensagens não lidas há mais de 5 minutos (query simplificada)
    const { data: unreadMessages, error: messagesError } = await supabase
      .from('application_messages')
      .select(`
        id,
        application_id,
        sender_id,
        recipient_id,
        message,
        sent_at
      `)
      .eq('is_read', false)
      .is('email_sent', null)
      .lt('sent_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Mais de 5 minutos

    console.log('[send-email-notifications] Mensagens encontradas:', unreadMessages?.length || 0);

    if (messagesError) {
      console.error('[send-email-notifications] Erro ao buscar mensagens:', messagesError);
      throw new Error('Failed to fetch unread messages');
    }

    console.log(`[send-email-notifications] Encontradas ${unreadMessages?.length || 0} mensagens para notificar`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const message of unreadMessages || []) {
      try {
        console.log(`[send-email-notifications] Processando mensagem ${message.id}`);
        
        // Buscar dados da aplicação para esta mensagem específica
        const { data: appData, error: appError } = await supabase
          .from('scholarship_applications')
          .select(`
            student_id,
            scholarships(
              universities(
                name,
                contact,
                payment_contact_email,
                user_id
              )
            ),
            user_profiles!student_id(
              full_name,
              email,
              user_id
            )
          `)
          .eq('id', message.application_id)
          .single();

        if (appError || !appData) {
          console.warn('[send-email-notifications] Erro ao buscar dados da aplicação:', appError);
          continue;
        }

        const studentProfile = appData.user_profiles;
        const university = appData.scholarships?.universities;
        const universityContact = university?.contact;
        const universityEmail = universityContact?.email || university?.payment_contact_email;

        if (!studentProfile || !university || !universityEmail) {
          console.warn('[send-email-notifications] Dados incompletos para mensagem:', message.id);
          continue;
        }

        // Determinar direção da mensagem
        const isUniversityToStudent = message.sender_id === university.user_id;
        const isStudentToUniversity = message.sender_id === studentProfile.user_id;

        console.log(`[send-email-notifications] Direção da mensagem ${message.id}:`, {
          sender_id: message.sender_id,
          university_user_id: university.user_id,
          student_user_id: studentProfile.user_id,
          isUniversityToStudent,
          isStudentToUniversity
        });

        let emailPayload;

        if (isUniversityToStudent) {
          // Email para aluno
          emailPayload = {
            tipo_notf: "New message from university",
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name,
            nome_bolsa: "",
            nome_universidade: university.name,
            email_universidade: universityEmail,
            o_que_enviar: `You have a new message from "${university.name}" about your scholarship application. Access the chat to view and respond.`,
            contact_name: university.name,
            contact_position: "University",
            location: `student/dashboard/application/${message.application_id}/chat`,
            website: "matriculausa.com",
            notification_target: "student"
          };
        } else if (isStudentToUniversity) {
          // Email para universidade
          emailPayload = {
            tipo_notf: "New message from student",
            email_aluno: universityEmail,
            nome_aluno: university.name,
            nome_bolsa: "",
            nome_universidade: studentProfile.full_name,
            email_universidade: studentProfile.email,
            o_que_enviar: `You have a new message from "${studentProfile.full_name}" about the scholarship application. Access the dashboard to view and respond.`,
            contact_name: studentProfile.full_name,
            contact_position: "Student",
            location: `school-dashboard/student-details/${message.application_id}`,
            website: "matriculausa.com",
            notification_target: "university"
          };
        } else {
          console.warn('[send-email-notifications] Direção de mensagem não identificada:', message.id);
          continue;
        }

        console.log(`[send-email-notifications] Enviando email para mensagem ${message.id}:`, emailPayload);

        const emailResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload)
        });

        if (emailResponse.ok) {
          // Marcar como email enviado
          await supabase
            .from('application_messages')
            .update({ email_sent: new Date().toISOString() })
            .eq('id', message.id);

          emailsSent++;
          console.log(`[send-email-notifications] Email enviado para mensagem ${message.id} (${isUniversityToStudent ? 'aluno' : 'universidade'})`);
        } else {
          emailsFailed++;
          console.error(`[send-email-notifications] Erro ao enviar email para mensagem ${message.id}:`, emailResponse.status);
        }
      } catch (error) {
        emailsFailed++;
        console.error(`[send-email-notifications] Erro ao processar mensagem ${message.id}:`, error);
      }
    }

    const result = {
      success: true,
      messagesProcessed: unreadMessages?.length || 0,
      emailsSent,
      emailsFailed,
      timestamp: new Date().toISOString()
    };

    console.log('[send-email-notifications] Processamento concluído:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-email-notifications] Erro inesperado:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
