import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-migma-api-key',
};

interface CreateStudentPayload {
  email: string;
  full_name: string;
  phone?: string;
  country?: string;
  migma_seller_id?: string;
  migma_agent_id?: string;
  password?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Autenticação: validar chave da Migma
  const migmaKey = req.headers.get('x-migma-api-key');
  if (!migmaKey || migmaKey !== Deno.env.get('MIGMA_SECRET_KEY')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing x-migma-api-key header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: CreateStudentPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validar campos obrigatórios
  if (!body.email || !body.full_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: email, full_name' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Usa service_role para ter permissão total de criar usuários
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Verificar se o aluno já existe pelo email
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('user_id, id, source')
      .eq('email', body.email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: 'Student already exists',
          message: `Email ${body.email} já está cadastrado`,
          user_id: existingUser.user_id,
          profile_id: existingUser.id,
          source: existingUser.source,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Criar conta no auth com app_metadata identificando como Migma
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password || crypto.randomUUID(), // senha temporária se não fornecida
      email_confirm: true, // confirmar email automaticamente (Migma faz próprio processo)
      app_metadata: {
        app: 'migma', // claim que o hook injeta no JWT
      },
      user_metadata: {
        full_name: body.full_name,
      },
    });

    if (authError || !authData.user) {
      console.error('[migma-create-student] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user', details: authError?.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // 3. Inserir perfil com source='migma'
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone || null,
        country: body.country || null,
        source: 'migma',
        migma_seller_id: body.migma_seller_id || null,
        migma_agent_id: body.migma_agent_id || null,
        role: 'student',
        status: 'active',
      })
      .select('id, user_id, email, full_name, source, migma_seller_id')
      .single();

    if (profileError) {
      console.error('[migma-create-student] Profile error:', profileError);
      // Reverter: deletar o usuário auth criado
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to create student profile', details: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Notificar admin do Matricula USA
    await supabase.from('admin_notifications').insert({
      title: '[MIGMA] Novo aluno cadastrado',
      message: `${body.full_name} (${body.email}) foi cadastrado pela Migma${body.migma_seller_id ? ` — Vendedor: ${body.migma_seller_id}` : ''}.`,
      type: 'student_registered',
      is_read: false,
    }).throwOnError();

    console.log('[migma-create-student] ✅ Student created:', { userId, email: body.email });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        profile_id: profile.id,
        profile,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[migma-create-student] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
