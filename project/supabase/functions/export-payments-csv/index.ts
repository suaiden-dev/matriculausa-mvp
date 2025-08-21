import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { 
      university_id, 
      status_filter, 
      payment_type_filter, 
      date_from, 
      date_to,
      search_query 
    } = await req.json();

    if (!university_id) {
      return new Response(JSON.stringify({ error: 'University ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('payments')
      .select(`
        id,
        student_id,
        payment_type,
        amount_charged,
        currency,
        status,
        created_at,
        stripe_payment_intent_id,
        user_profiles!student_id(full_name, email),
        universities!university_id(name)
      `)
      .eq('university_id', university_id);

    // Apply filters
    if (status_filter && status_filter !== 'all') {
      query = query.eq('status', status_filter);
    }
    if (payment_type_filter && payment_type_filter !== 'all') {
      query = query.eq('payment_type', payment_type_filter);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    if (search_query) {
      query = query.or(`user_profiles.full_name.ilike.%${search_query}%,user_profiles.email.ilike.%${search_query}%`);
    }

    // Get all payments (no pagination for export)
    query = query.order('created_at', { ascending: false });
    const { data: payments, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get transfer status for each payment
    const { data: transfers } = await supabase
      .from('payment_transfers')
      .select('payment_id, transfer_status, transfer_method')
      .in('payment_id', payments?.map(p => p.id) || []);

    // Create CSV content
    const csvHeaders = [
      'Payment ID',
      'Student Name',
      'Student Email',
      'Payment Type',
      'Amount',
      'Currency',
      'Status',
      'Transfer Status',
      'Transfer Method',
      'Created Date',
      'Stripe Payment Intent ID'
    ];

    const csvRows = (payments || []).map(payment => {
      const transfer = transfers?.find(t => t.payment_id === payment.id);
      const createdDate = new Date(payment.created_at).toLocaleDateString('en-US');
      
      return [
        payment.id,
        payment.user_profiles?.full_name || 'Unknown',
        payment.user_profiles?.email || 'Unknown',
        payment.payment_type,
        payment.amount_charged,
        payment.currency,
        payment.status,
        transfer?.transfer_status || 'pending',
        transfer?.transfer_method || 'stripe',
        createdDate,
        payment.stripe_payment_intent_id || ''
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });

    return new Response(csvBlob, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments_export_${new Date().toISOString().split('T')[0]}.csv"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
