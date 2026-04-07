import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-migma-api-key',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Autenticação
  const migmaKey = req.headers.get('x-migma-api-key');
  if (!migmaKey || migmaKey !== Deno.env.get('MIGMA_SECRET_KEY')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing x-migma-api-key header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  const email = url.searchParams.get('email');

  if (!userId && !email) {
    return new Response(
      JSON.stringify({ error: 'Missing query param: user_id or email required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Buscar perfil — apenas alunos da Migma
    let profileQuery = supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        country,
        status,
        academic_level,
        field_of_interest,
        created_at,
        source,
        migma_seller_id,
        migma_agent_id,
        has_paid_selection_process_fee,
        is_application_fee_paid,
        is_scholarship_fee_paid,
        has_paid_i20_control_fee,
        has_paid_college_enrollment_fee,
        documents_status,
        documents_uploaded,
        selected_scholarship_id,
        selection_survey_passed
      `)
      .eq('source', 'migma');

    if (userId) {
      profileQuery = profileQuery.eq('user_id', userId);
    } else if (email) {
      profileQuery = profileQuery.eq('email', email);
    }

    const { data: profile, error: profileError } = await profileQuery.maybeSingle();

    if (profileError) {
      console.error('[migma-get-student-status] Profile query error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Student not found or does not belong to Migma' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar candidaturas a bolsas
    const { data: applications } = await supabase
      .from('scholarship_applications')
      .select(`
        id,
        scholarship_id,
        status,
        created_at,
        is_application_fee_paid,
        is_scholarship_fee_paid,
        is_placement_fee_paid,
        student_process_type
      `)
      .eq('student_id', profile.id) // usa profile.id (não user_id)
      .order('created_at', { ascending: false });

    // 3. Buscar solicitações de documentos pendentes
    const { data: pendingDocRequests } = await supabase
      .from('document_requests')
      .select('id, document_name, status, required, created_at')
      .eq('user_id', profile.user_id)
      .neq('status', 'approved')
      .order('created_at', { ascending: false });

    // 4. Buscar documentos enviados pelo aluno
    const { data: studentDocs } = await supabase
      .from('student_documents')
      .select('id, type, file_url, status, created_at')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false });

    // 5. Buscar histórico de pagamentos
    const { data: payments } = await supabase
      .from('individual_fee_payments')
      .select('id, fee_type, amount, payment_method, payment_date, source')
      .eq('user_id', profile.user_id)
      .order('payment_date', { ascending: false });

    // 6. Buscar notificações não lidas
    const { data: notifications } = await supabase
      .from('student_notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('user_id', profile.user_id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // 7. Determinar etapa atual do aluno no fluxo
    const currentStep = determineCurrentStep(profile);

    console.log('[migma-get-student-status] ✅ Status retrieved for:', { user_id: profile.user_id });

    return new Response(
      JSON.stringify({
        profile,
        current_step: currentStep,
        applications: applications || [],
        pending_document_requests: pendingDocRequests || [],
        student_documents: studentDocs || [],
        payments: payments || [],
        unread_notifications: notifications || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[migma-get-student-status] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Determina em qual etapa do fluxo o aluno está,
 * baseado nos flags de pagamento e documentos.
 */
function determineCurrentStep(profile: Record<string, any>): string {
  if (!profile.has_paid_selection_process_fee) return 'selection_process_payment';
  if (!profile.selection_survey_passed) return 'selection_survey';
  if (!profile.is_application_fee_paid) return 'scholarship_selection';
  if (!profile.documents_uploaded) return 'document_upload';
  if (!profile.is_scholarship_fee_paid) return 'scholarship_fee_payment';
  if (!profile.has_paid_college_enrollment_fee) return 'placement_fee_payment';
  if (profile.documents_status === 'pending' || profile.documents_status === 'analyzing') return 'document_review';
  if (!profile.has_paid_i20_control_fee) return 'i20_control_fee';
  return 'completed';
}
