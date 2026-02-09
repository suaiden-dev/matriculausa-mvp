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
    const host = req.headers.get('host') || '';
    
    // Detectar desenvolvimento: localhost, 127.0.0.1, ou IPs privados (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isDevelopment = referer.includes('localhost') || 
                         referer.includes('192.168') || 
                         referer.includes('127.0.0.1') ||
                         referer.includes('10.') ||
                         referer.includes('172.') ||
                         origin.includes('localhost') ||
                         origin.includes('192.168') ||
                         origin.includes('127.0.0.1') ||
                         origin.includes('10.') ||
                         origin.includes('172.') ||
                         host.includes('localhost') ||
                         host.includes('192.168') ||
                         host.includes('127.0.0.1');
    
    // Extrair a URL base corretamente
    let frontendUrl = 'https://matriculausa.com'; // default produção
    if (isDevelopment) {
      // Prioridade: origin > referer > host
      const urlSource = origin || referer || (host ? `http://${host}` : 'http://localhost:5173');
      
      console.log('[sso-323-network-callback] 🔍 Tentando extrair URL do frontend:', {
        origin,
        referer,
        host,
        urlSource,
      });
      
      try {
        const url = new URL(urlSource);
        frontendUrl = `${url.protocol}//${url.host}`;
        console.log('[sso-323-network-callback] ✅ URL extraída com sucesso:', frontendUrl);
      } catch (e) {
        // Se falhar ao parsear, tentar detectar padrões conhecidos
        console.warn('[sso-323-network-callback] ⚠️ Erro ao parsear URL, usando fallback:', e);
        
        if (urlSource.includes('192.168.101.3')) {
          frontendUrl = 'http://192.168.101.3:5173';
        } else if (urlSource.includes('192.168')) {
          // Tentar extrair IP e porta do padrão
          const ipMatch = urlSource.match(/(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/);
          if (ipMatch) {
            const ip = ipMatch[1];
            const port = ipMatch[2] || '5173';
            frontendUrl = `http://${ip}:${port}`;
          } else {
            frontendUrl = 'http://192.168.101.3:5173';
          }
        } else if (urlSource.includes('localhost') || urlSource.includes('127.0.0.1')) {
          const portMatch = urlSource.match(/:(\d+)/);
          const port = portMatch ? portMatch[1] : '5173';
          frontendUrl = `http://localhost:${port}`;
        } else {
          frontendUrl = 'http://localhost:5173';
        }
        
        console.log('[sso-323-network-callback] ✅ URL definida via fallback:', frontendUrl);
      }
    }
    
    console.log('[sso-323-network-callback] Environment detection:', {
      referer,
      origin,
      host,
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

    console.log('[sso-323-network-callback] Link generated, checking for tokens...');
    console.log('[sso-323-network-callback] Has tokens in properties:', !!accessToken && !!refreshToken);
    console.log('[sso-323-network-callback] Action link:', actionLink);

    // Se temos tokens diretamente, usar
    if (accessToken && refreshToken) {
      console.log('[sso-323-network-callback] ✅ Tokens found in link properties');
      
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

    // Se não temos tokens, tentar verificar o magic link diretamente na Edge Function
    // Isso evita problemas de redirect_to em desenvolvimento
    if (actionLink) {
      console.log('[sso-323-network-callback] ⚠️ Tokens não encontrados, tentando verificar magic link diretamente...');
      
      try {
        const linkUrl = new URL(actionLink);
        const token = linkUrl.searchParams.get('token');
        const type = linkUrl.searchParams.get('type');
        
        if (token && type === 'magiclink') {
          console.log('[sso-323-network-callback] 🔑 Token extraído do magic link, verificando...');
          
          // Fazer fetch ao endpoint de verificação do Supabase Auth
          // IMPORTANTE: Incluir redirect_to correto para evitar redirecionamento para produção
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
          const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
          verifyUrl.searchParams.set('token', token);
          verifyUrl.searchParams.set('type', type);
          verifyUrl.searchParams.set('redirect_to', `${frontendUrl}/auth/callback`);
          
          console.log('[sso-323-network-callback] 🔗 Verificando token em:', verifyUrl.toString());
          console.log('[sso-323-network-callback] 🔗 redirect_to configurado:', `${frontendUrl}/auth/callback`);
          
          const verifyResponse = await fetch(verifyUrl.toString(), {
            method: 'GET',
            headers: {
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            },
            redirect: 'manual', // Não seguir redirects
          });

          console.log('[sso-323-network-callback] 📡 Status da verificação:', verifyResponse.status);

          // Se é um redirect, extrair tokens do Location header
          if (verifyResponse.status >= 300 && verifyResponse.status < 400) {
            const location = verifyResponse.headers.get('Location');
            console.log('[sso-323-network-callback] 🔄 Redirect detectado para:', location);
            
            if (location) {
              try {
                const redirectUrl = new URL(location);
                const hash = redirectUrl.hash.substring(1);
                const hashParams = new URLSearchParams(hash);
                const extractedAccessToken = hashParams.get('access_token');
                const extractedRefreshToken = hashParams.get('refresh_token');
                
                if (extractedAccessToken && extractedRefreshToken) {
                  console.log('[sso-323-network-callback] ✅ Tokens extraídos do redirect!');
                  
                  return new Response(
                    JSON.stringify({
                      success: true,
                      isNewUser,
                      userId,
                      email: network323User.email,
                      session: {
                        access_token: extractedAccessToken,
                        refresh_token: extractedRefreshToken,
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
              } catch (parseErr) {
                console.warn('[sso-323-network-callback] ⚠️ Erro ao parsear redirect:', parseErr);
              }
            }
          }
        }
      } catch (verifyErr) {
        console.warn('[sso-323-network-callback] ⚠️ Erro ao verificar magic link:', verifyErr);
      }
    }

    // Se não conseguimos obter tokens, retornar o link para o frontend processar
    // Mas ajustar o redirect_to para o ambiente correto
    if (actionLink) {
      try {
        const linkUrl = new URL(actionLink);
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        
        // O magic link deve apontar para o Supabase Auth
        if (linkUrl.origin !== new URL(supabaseUrl).origin) {
          const supabaseAuthUrl = new URL(supabaseUrl);
          linkUrl.protocol = supabaseAuthUrl.protocol;
          linkUrl.host = supabaseAuthUrl.host;
          actionLink = linkUrl.toString();
        }
        
        // Sempre garantir que o redirect_to está correto
        const redirectToParam = linkUrl.searchParams.get('redirect_to');
        const expectedRedirectTo = `${frontendUrl}/auth/callback`;
        
        if (redirectToParam !== expectedRedirectTo) {
          linkUrl.searchParams.set('redirect_to', expectedRedirectTo);
          actionLink = linkUrl.toString();
          console.log('[sso-323-network-callback] ✅ redirect_to corrigido:', expectedRedirectTo);
        }
        
        // Corrigir também a barra dupla no path se houver
        if (actionLink.includes('//auth/v1/verify')) {
          actionLink = actionLink.replace('//auth/v1/verify', '/auth/v1/verify');
        }
      } catch (e) {
        console.warn('[sso-323-network-callback] ⚠️ Não foi possível ajustar magic link:', e);
      }
    }
    
    console.log('[sso-323-network-callback] ⚠️ Retornando magic link para processamento no frontend');
    
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

