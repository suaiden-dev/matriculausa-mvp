import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [validate-qrcode-proxy] ===== INICIANDO PROXY DE VALIDAÇÃO =====');
    
    const body = await req.json();
    console.log('📋 [validate-qrcode-proxy] Payload recebido:', body);

    // Chamar o webhook correto
    const response = await fetch('https://nwh.suaiden.com/webhook/validar-qrcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 [validate-qrcode-proxy] Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [validate-qrcode-proxy] Erro no webhook:', errorText);
      return new Response(JSON.stringify({
        error: `Webhook error: ${response.status} - ${errorText}`
      }), { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const result = await response.text();
    console.log('✅ [validate-qrcode-proxy] Resposta do webhook:', result);

    return new Response(result, { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('💥 [validate-qrcode-proxy] Erro:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Erro interno do servidor'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}) 