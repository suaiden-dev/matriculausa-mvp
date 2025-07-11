import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req) => {
  console.log('[Edge] Função forward-notification-to-n8n chamada');
  if (req.method !== 'POST') {
    console.log('[Edge] Método não permitido:', req.method);
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
    console.log('[Edge] Body recebido:', JSON.stringify(body));
  } catch (e) {
    console.log('[Edge] JSON inválido:', e);
    return new Response('Invalid JSON', { status: 400 });
  }

  // Headers a serem enviados
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'PostmanRuntime/7.36.3',
  };
  console.log('[Edge] Headers enviados para n8n:', JSON.stringify(headers));

  try {
    const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
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
    }), { status: 200 });
  } catch (err) {
    console.log('[Edge] Erro ao enviar para o n8n:', err);
    return new Response(JSON.stringify({
      error: 'Failed to forward to n8n',
      details: err && err.message ? err.message : String(err),
    }), { status: 500 });
  }
}); 