import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

function corsResponse(body: any, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*', // Permite todos os headers (x-client-info, apikey, etc)
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

Deno.serve(async (req: Request) => {
  console.log('[Edge] Função forward-notification-to-n8n chamada');
  
  if (req.method === 'OPTIONS') {
    return corsResponse(null, 204);
  }

  if (req.method !== 'POST') {
    console.log('[Edge] Método não permitido:', req.method);
    return corsResponse({ error: 'Method Not Allowed' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
    console.log('[Edge] Body recebido:', JSON.stringify(body));
  } catch (e) {
    console.log('[Edge] JSON inválido:', e);
    return corsResponse({ error: 'Invalid JSON' }, 400);
  }

  // Headers a serem enviados para o n8n
  const n8nHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'PostmanRuntime/7.36.3',
  };

  // Selecionar URL de destino com base no campo `target`
  const N8N_URLS: Record<string, string> = {
    default: 'https://nwh.suaiden.com/webhook/notfmatriculausa',
    abandoned_cart: 'https://n8n.suaiden.com/webhook-test/carrinho-perdido',
  };
  const target = body?.target ?? 'default';
  const n8nUrl = N8N_URLS[target] ?? N8N_URLS.default;

  // Remover campo interno `target` antes de encaminhar
  const { target: _removed, ...forwardBody } = body;

  console.log('[Edge] Encaminhando para n8n URL:', n8nUrl);

  try {
    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      headers: n8nHeaders,
      body: JSON.stringify(forwardBody),
    });

    const n8nText = await n8nRes.text();
    console.log('[Edge] Resposta do n8n:', n8nRes.status, n8nText);

    return corsResponse({
      status: n8nRes.status,
      n8nResponse: n8nText,
    }, 200);
  } catch (err: any) {
    console.log('[Edge] Erro ao enviar para o n8n:', err);
    return corsResponse({
      error: 'Failed to forward to n8n',
      details: err?.message ? err.message : String(err),
    }, 500);
  }
}); 