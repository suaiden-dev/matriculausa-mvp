import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

Deno.serve(async (req: Request) => {
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, provider, redirect_uri } = await req.json();

    if (!code || !provider || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let tokens: OAuthTokens;

    if (provider === 'google') {
      // Trocar código por tokens do Google
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Google token exchange error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange Google code for tokens' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const googleTokens: GoogleTokenResponse = await tokenResponse.json();
      tokens = {
        access_token: googleTokens.access_token,
        refresh_token: googleTokens.refresh_token,
        expires_in: googleTokens.expires_in,
        token_type: googleTokens.token_type,
      };

    } else if (provider === 'microsoft') {
      // Trocar código por tokens do Microsoft
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
          client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Microsoft token exchange error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange Microsoft code for tokens' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const microsoftTokens: MicrosoftTokenResponse = await tokenResponse.json();
      tokens = {
        access_token: microsoftTokens.access_token,
        refresh_token: microsoftTokens.refresh_token,
        expires_in: microsoftTokens.expires_in,
        token_type: microsoftTokens.token_type,
      };

    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported provider' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Retornar tokens (o frontend vai salvar na tabela)
    return new Response(
      JSON.stringify({
        success: true,
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          token_type: tokens.token_type,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in exchange-oauth-code:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 