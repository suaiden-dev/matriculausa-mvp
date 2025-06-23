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
    const { application_id, recipient_id, message, file_url, file_name } = await req.json();
    if (!application_id || !recipient_id || !message) {
      return new Response(JSON.stringify({ error: 'application_id, recipient_id e message são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inicializa o Supabase client com SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Extrai o usuário autenticado do JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insere a mensagem
    const { data: msg, error: msgError } = await supabase
      .from('application_messages')
      .insert({
        application_id,
        sender_id: user.id,
        recipient_id,
        message,
      })
      .select('id')
      .single();
    if (msgError || !msg) {
      return new Response(JSON.stringify({ error: 'Erro ao enviar mensagem.', details: msgError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se houver anexo, insere na tabela de anexos
    if (file_url) {
      const { error: attachError } = await supabase
        .from('application_message_attachments')
        .insert({
          message_id: msg.id,
          file_url,
          file_name: file_name || null,
        });
      if (attachError) {
        return new Response(JSON.stringify({ error: 'Mensagem enviada, mas falha ao salvar anexo.', details: attachError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 