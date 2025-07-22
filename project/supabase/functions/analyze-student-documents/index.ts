import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (req.method !== "POST") {
    console.log('[Edge] Método não permitido:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await req.json();
    console.log('[Edge] Body recebido:', JSON.stringify(body));
  } catch (e) {
    console.log('[Edge] JSON inválido:', e);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // URL do webhook do n8n via secret
  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  if (!webhookUrl) {
    console.log('[Edge] Webhook URL não configurada');
    return new Response(
      JSON.stringify({ error: 'Webhook URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Headers a serem enviados
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Supabase-Edge-Function/1.0',
  };
  console.log('[Edge] Headers enviados para n8n:', JSON.stringify(headers));

  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Logar todos os headers recebidos do n8n
    const receivedHeaders: Record<string, string> = {};
    n8nRes.headers.forEach((value, key) => {
      receivedHeaders[key] = value;
    });
    console.log('[Edge] Headers recebidos do n8n:', JSON.stringify(receivedHeaders));

    const n8nText = await n8nRes.text();
    console.log('[Edge] Resposta do n8n:', n8nRes.status, n8nText);

    return new Response(JSON.stringify({
      status: n8nRes.status,
      n8nResponse: n8nText,
      n8nHeaders: receivedHeaders,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.log('[Edge] Erro ao enviar para o n8n:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to forward to n8n',
        details: err && err.message ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 