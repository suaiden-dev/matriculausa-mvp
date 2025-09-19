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
    console.log('[delete-application-message] Iniciando exclusão de mensagem');
    const { message_id } = await req.json();
    
    if (!message_id) {
      return new Response(JSON.stringify({ error: 'Message ID is required' }), {
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
      console.error('[delete-application-message] Missing Authorization header');
      throw new Error('Missing Authorization header');
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('[delete-application-message] User not authenticated', userError);
      throw new Error('User not authenticated');
    }

    // Verificar se a mensagem existe e se o usuário é o remetente
    const { data: message, error: messageError } = await supabase
      .from('application_messages')
      .select('id, sender_id, sent_at')
      .eq('id', message_id)
      .single();

    if (messageError || !message) {
      console.error('[delete-application-message] Message not found', messageError);
      throw new Error('Message not found');
    }

    if (message.sender_id !== user.id) {
      console.error('[delete-application-message] User is not the sender of this message');
      throw new Error('You can only delete your own messages');
    }

    // Verificar se a mensagem foi enviada há menos de 1 hora (opcional)
    const messageTime = new Date(message.sent_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 1) {
      console.error('[delete-application-message] Message is too old to delete');
      throw new Error('Messages can only be deleted within 1 hour');
    }

    // Deletar anexos primeiro (se houver)
    const { error: attachmentsError } = await supabase
      .from('application_message_attachments')
      .delete()
      .eq('message_id', message_id);

    if (attachmentsError) {
      console.warn('[delete-application-message] Failed to delete attachments:', attachmentsError);
      // Continuar mesmo se falhar ao deletar anexos
    }

    // Deletar a mensagem
    const { error: deleteError } = await supabase
      .from('application_messages')
      .delete()
      .eq('id', message_id);

    if (deleteError) {
      console.error('[delete-application-message] Failed to delete message', deleteError);
      throw new Error(`Failed to delete message: ${deleteError.message}`);
    }

    console.log('[delete-application-message] Message deleted successfully:', message_id);

    return new Response(JSON.stringify({ 
      success: true, 
      message_id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[delete-application-message] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

