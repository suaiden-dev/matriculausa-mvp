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
    console.log('[edit-application-message] Iniciando edição de mensagem');
    const { message_id, text } = await req.json();
    
    if (!message_id || !text) {
      return new Response(JSON.stringify({ error: 'Message ID and text are required' }), {
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
      console.error('[edit-application-message] Missing Authorization header');
      throw new Error('Missing Authorization header');
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('[edit-application-message] User not authenticated', userError);
      throw new Error('User not authenticated');
    }

    // Verificar se a mensagem existe e se o usuário é o remetente
    const { data: message, error: messageError } = await supabase
      .from('application_messages')
      .select('id, sender_id, message, sent_at')
      .eq('id', message_id)
      .single();

    if (messageError || !message) {
      console.error('[edit-application-message] Message not found', messageError);
      throw new Error('Message not found');
    }

    if (message.sender_id !== user.id) {
      console.error('[edit-application-message] User is not the sender of this message');
      throw new Error('You can only edit your own messages');
    }

    // Verificar se a mensagem foi enviada há menos de 24 horas (opcional)
    const messageTime = new Date(message.sent_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      console.error('[edit-application-message] Message is too old to edit');
      throw new Error('Messages can only be edited within 24 hours');
    }

    // Atualizar a mensagem
    const { data: updatedMessage, error: updateError } = await supabase
      .from('application_messages')
      .update({ 
        message: text.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', message_id)
      .select()
      .single();

    if (updateError || !updatedMessage) {
      console.error('[edit-application-message] Failed to update message', updateError);
      throw new Error(`Failed to update message: ${updateError?.message}`);
    }

    console.log('[edit-application-message] Message updated successfully:', updatedMessage.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: updatedMessage 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[edit-application-message] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
