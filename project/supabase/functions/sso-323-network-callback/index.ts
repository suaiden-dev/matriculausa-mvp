// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL da Edge Function do 323 Network para validar token
const NETWORK323_VALIDATE_URL = 'https://pgdvbanwumqjmqeybqnw.supabase.co/functions/v1/validate-user-for-external';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { token } = await req.json();

    if (!token) {
      console.error('[sso-323-network-callback] Missing token');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sso-323-network-callback] Validating token with 323 Network...');

    // 1. Validar token com 323 Network
    const validateResponse = await fetch(NETWORK323_VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!validateResponse.ok) {
      const errorData = await validateResponse.json().catch(() => ({ error: 'Invalid token' }));
      console.error('[sso-323-network-callback] Token validation failed:', errorData);
      return new Response(
        JSON.stringify({ error: errorData.error || 'Invalid or expired token', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validateData = await validateResponse.json();

    if (!validateData.valid || !validateData.user) {
      console.error('[sso-323-network-callback] Token validation returned invalid:', validateData);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const network323User = validateData.user;
    console.log('[sso-323-network-callback] Token validated. User:', network323User.email);

    // 2. Criar cliente admin do Matrícula US
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Buscar usuário existente por email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('[sso-323-network-callback] Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === network323User.email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Usuário já existe - atualizar profile se necessário
      userId = existingUser.id;
      console.log('[sso-323-network-callback] User already exists:', userId);

      // Atualizar user_profiles
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          full_name: network323User.full_name || network323User.first_name + ' ' + network323User.last_name,
          phone: network323User.phone || null,
          country: network323User.country || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.warn('[sso-323-network-callback] Error updating profile:', updateError);
        // Não falhar se houver erro ao atualizar profile
      }
    } else {
      // Criar novo usuário
      isNewUser = true;
      console.log('[sso-323-network-callback] Creating new user...');

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: network323User.email,
        email_confirm: network323User.email_confirmed || true,
        user_metadata: {
          source: '323-network',
          external_id: network323User.id, // ID do 323 Network
          full_name: network323User.full_name || network323User.first_name + ' ' + network323User.last_name,
          first_name: network323User.first_name,
          last_name: network323User.last_name,
        },
      });

      if (createError) {
        console.error('[sso-323-network-callback] Error creating user:', createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log('[sso-323-network-callback] New user created:', userId);

      // Criar user_profiles (o trigger pode criar automaticamente, mas vamos garantir)
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: network323User.email,
          full_name: network323User.full_name || network323User.first_name + ' ' + network323User.last_name,
          phone: network323User.phone || null,
          country: network323User.country || null,
          role: 'student', // Default role
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.warn('[sso-323-network-callback] Error creating/updating profile:', profileError);
        // Não falhar se houver erro ao criar profile (pode já existir pelo trigger)
      }
    }

    // 4. Detectar ambiente do frontend
    const referer = req.headers.get('referer') || '';
    const origin = req.headers.get('origin') || '';
    const isDevelopment = referer.includes('localhost') || 
                         referer.includes('192.168') || 
                         referer.includes('127.0.0.1') ||
                         origin.includes('localhost') ||
                         origin.includes('192.168') ||
                         origin.includes('127.0.0.1');
    
    // Extrair a URL base corretamente
    let frontendUrl = 'https://matriculausa.com'; // default produção
    if (isDevelopment) {
      // Tentar extrair do referer ou origin
      const urlSource = referer || origin || 'http://localhost:5173';
      try {
        const url = new URL(urlSource);
        frontendUrl = `${url.protocol}//${url.host}`;
      } catch {
        // Se falhar, usar valores padrão
        if (urlSource.includes('192.168')) {
          frontendUrl = 'http://192.168.101.3:5173';
        } else {
          frontendUrl = 'http://localhost:5173';
        }
      }
    }
    
    console.log('[sso-323-network-callback] Environment detection:', {
      referer,
      origin,
      isDevelopment,
      frontendUrl,
    });

    // 4. Gerar link de autenticação (magic link)
    console.log('[sso-323-network-callback] Generating authentication link for user:', userId);
    console.log('[sso-323-network-callback] RedirectTo será:', `${frontendUrl}/auth/callback`);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: network323User.email,
      options: {
        redirectTo: `${frontendUrl}/auth/callback`,
      },
    });

    if (linkError) {
      console.error('[sso-323-network-callback] Error generating link:', linkError);
      throw linkError;
    }

    // O generateLink retorna um link, mas também pode retornar tokens nas properties
    // Vamos verificar se há tokens diretamente
    const accessToken = linkData.properties?.access_token;
    const refreshToken = linkData.properties?.refresh_token;
    let actionLink = linkData.properties?.action_link;

    // Se temos um magic link, SEMPRE ajustar para garantir que aponta para o Supabase Auth
    if (actionLink) {
      try {
        const linkUrl = new URL(actionLink);
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        
        // O magic link deve apontar para o Supabase Auth, não para o frontend
        // Se o link está apontando para o frontend, corrigir para apontar para o Supabase
        if (linkUrl.origin !== new URL(supabaseUrl).origin) {
          console.log('[sso-323-network-callback] ⚠️ Magic link aponta para frontend, corrigindo para Supabase Auth');
          const supabaseAuthUrl = new URL(supabaseUrl);
          linkUrl.protocol = supabaseAuthUrl.protocol;
          linkUrl.host = supabaseAuthUrl.host;
          actionLink = linkUrl.toString();
          console.log('[sso-323-network-callback] ✅ Magic link corrigido para Supabase Auth:', actionLink);
        }
        
        // Sempre garantir que o redirect_to está correto
        const redirectToParam = linkUrl.searchParams.get('redirect_to');
        const expectedRedirectTo = `${frontendUrl}/auth/callback`;
        
        console.log('[sso-323-network-callback] Verificando redirect_to:', {
          atual: redirectToParam,
          esperado: expectedRedirectTo,
          precisaAjuste: redirectToParam !== expectedRedirectTo,
        });
        
        if (redirectToParam !== expectedRedirectTo) {
          linkUrl.searchParams.set('redirect_to', expectedRedirectTo);
          actionLink = linkUrl.toString();
          console.log('[sso-323-network-callback] ✅ redirect_to corrigido:', actionLink);
        } else {
          console.log('[sso-323-network-callback] ✅ redirect_to já está correto');
        }
        
        // Corrigir também a barra dupla no path se houver
        if (actionLink.includes('//auth/v1/verify')) {
          actionLink = actionLink.replace('//auth/v1/verify', '/auth/v1/verify');
          console.log('[sso-323-network-callback] ✅ Barra dupla corrigida no path');
        }
      } catch (e) {
        console.warn('[sso-323-network-callback] ⚠️ Não foi possível ajustar magic link:', e);
      }
    }

    console.log('[sso-323-network-callback] Link generated, checking for tokens...');
    console.log('[sso-323-network-callback] Action link:', actionLink);

    // Se temos tokens diretamente, usar
    if (accessToken && refreshToken) {
      console.log('[sso-323-network-callback] Tokens found in link properties');
      
      return new Response(
        JSON.stringify({
          success: true,
          isNewUser,
          userId,
          email: network323User.email,
          session: {
            access_token: accessToken,
            refresh_token: refreshToken,
          },
          user: {
            id: userId,
            email: network323User.email,
            full_name: network323User.full_name || network323User.first_name + ' ' + network323User.last_name,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não temos tokens, retornar o link para o frontend processar
    // O frontend pode usar o link para fazer login automaticamente
    console.log('[sso-323-network-callback] No tokens in properties, returning link for frontend processing');
    
    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        userId,
        email: network323User.email,
        magicLink: actionLink,
        user: {
          id: userId,
          email: network323User.email,
          full_name: network323User.full_name || network323User.first_name + ' ' + network323User.last_name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[sso-323-network-callback] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

