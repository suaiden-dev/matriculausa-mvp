import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteAgencyPayload {
  email: string;
  full_name: string;
  company_name: string;
  agency_request_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify caller is authenticated admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is admin
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: callerProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: InviteAgencyPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.email || !body.full_name || !body.company_name || !body.agency_request_id) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if user already exists
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('user_id, role')
      .eq('email', body.email.toLowerCase())
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;
      // Update role to affiliate_admin
      await adminClient
        .from('user_profiles')
        .update({ role: 'affiliate_admin' })
        .eq('user_id', userId);
    } else {
      // Create new auth user (email_confirm = true so they can log in after setting password)
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: body.email.toLowerCase(),
        email_confirm: true,
        user_metadata: { full_name: body.full_name, role: 'affiliate_admin' },
      });
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: 'Failed to create user', details: authError?.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = authData.user.id;

      // Create user profile
      const { error: profileError } = await adminClient.from('user_profiles').insert({
        user_id: userId,
        email: body.email.toLowerCase(),
        full_name: body.full_name,
        role: 'affiliate_admin',
        status: 'active',
      });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ error: 'Failed to create profile', details: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Upsert affiliate_admins record to ensure is_active is true
    await adminClient.from('affiliate_admins').upsert({
      user_id: userId,
      company_name: body.company_name,
      is_active: true,
    }, { onConflict: 'user_id' });

    // Send password reset email so agency can set their password
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: body.email.toLowerCase(),
    });

    // Mark agency_request as approved
    await adminClient
      .from('agency_requests')
      .update({ status: 'approved', reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
      .eq('id', body.agency_request_id);

    // Create admin notification
    await adminClient.from('admin_notifications').insert({
      title: 'Nova agência aprovada',
      message: `Agência ${body.company_name} (${body.email}) foi aprovada como parceira.`,
      type: 'info',
      is_read: false,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId, message: 'Agency user created and password reset email sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
