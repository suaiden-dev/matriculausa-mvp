import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NgrokRequest {
  client_id?: string;
  user_id?: string;
  [key: string]: any; // outros parâmetros dinâmicos
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📤 send-to-ngrok-endpoint: Received request');
    
    const requestBody: NgrokRequest = await req.json();
    console.log('📤 send-to-ngrok-endpoint: Request body:', JSON.stringify(requestBody, null, 2));

    // Get current user session
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('User not authenticated');
    }

         // Preparar dados para enviar ao ngrok
     const ngrokData = {
       ...requestBody,
       user_id: user.id, // Adicionar user_id
       timestamp: new Date().toISOString(),
       source: 'matricula-usa'
     };

     // Se o client_id já for o user_id real, não substituir
     if (requestBody.client_id === user.id) {
       // Manter o client_id como está
     } else {
       // Substituir client_id pelo user_id
       ngrokData.client_id = user.id;
     }

         console.log('📤 send-to-ngrok-endpoint: Sending to ngrok:', JSON.stringify(ngrokData, null, 2));
     console.log('📤 send-to-ngrok-endpoint: Headers being sent:', {
       'Content-Type': 'application/json',
       'apikey': 'dGZvZVNVQUlERU4yMDI1Y2VtZUd1aWxoZXJtZQ==01983e6f-48be-7f83-bcca-df30867edaf6',
       'User-Agent': 'MatriculaUSA/1.0',
     });

     // Enviar para o endpoint ngrok
     const ngrokResponse = await fetch('https://78f512a1bd0d.ngrok-free.app', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'apikey': 'dGZvZVNVQUlERU4yMDI1Y2VtZUd1aWxoZXJtZQ==01983e6f-48be-7f83-bcca-df30867edaf6',
         'User-Agent': 'MatriculaUSA/1.0',
       },
       body: JSON.stringify(ngrokData)
     });

    if (!ngrokResponse.ok) {
      const errorText = await ngrokResponse.text();
      console.error('❌ Failed to send to ngrok:', ngrokResponse.status, ngrokResponse.statusText, errorText);
      throw new Error(`Ngrok endpoint error: ${ngrokResponse.status} ${ngrokResponse.statusText}`);
    }

    const ngrokResult = await ngrokResponse.text();
    console.log('✅ Successfully sent to ngrok:', ngrokResponse.status, ngrokResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data sent to ngrok endpoint successfully',
        ngrokStatus: ngrokResponse.status,
        ngrokResponse: ngrokResult,
        sentData: ngrokData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error sending to ngrok endpoint:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 