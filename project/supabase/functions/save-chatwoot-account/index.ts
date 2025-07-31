import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    // Validação básica
    if (!body.user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔧 Salvando dados do Chatwoot:', { 
      user_id: body.user_id,
      email: body.email,
      has_password: !!body.password
    });

    // Salvar dados do chatwoot
    const { data, error } = await supabase
      .from('chatwoot_accounts')
      .upsert({
        user_id: body.user_id,
        chatwoot_user_name: body.user_name,
        chatwoot_email: body.email,
        chatwoot_password: body.password,
        chatwoot_access_token: body.access_token,
        chatwoot_instance_name: body.instance_name,
        chatwoot_user_id: body.chatwoot_user_id,
        chatwoot_account_id: body.chatwoot_account_id,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (error) {
      console.error('❌ Erro ao salvar dados do Chatwoot:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Dados do Chatwoot salvos com sucesso:', { 
      user_id: body.user_id,
      data_id: data?.[0]?.id 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: data 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 