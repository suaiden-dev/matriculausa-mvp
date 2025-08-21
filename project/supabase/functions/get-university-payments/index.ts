import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PaymentData {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  payment_type: string;
  amount_charged: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_payment_intent_id?: string;
  transfer_status?: string;
  transfer_method?: string;
}

interface PaymentStats {
  total_revenue: number;
  total_payments: number;
  completed_payments: number;
  pending_payments: number;
  processing_payments: number;
}

interface GetPaymentsResponse {
  payments: PaymentData[];
  stats: PaymentStats;
  total_count: number;
  page: number;
  page_size: number;
}

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
      page = 1, 
      page_size = 20, 
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

    // Get total count for pagination
    const { count: totalCount } = await query.count();

    // Apply pagination
    const offset = (page - 1) * page_size;
    query = query.range(offset, offset + page_size - 1);
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

    // Transform data
    const transformedPayments: PaymentData[] = (payments || []).map(payment => {
      const transfer = transfers?.find(t => t.payment_id === payment.id);
      return {
        id: payment.id,
        student_id: payment.student_id,
        student_name: payment.user_profiles?.full_name || 'Unknown',
        student_email: payment.user_profiles?.email || 'Unknown',
        university_id: payment.university_id,
        university_name: payment.universities?.name || 'Unknown',
        payment_type: payment.payment_type,
        amount_charged: payment.amount_charged,
        currency: payment.currency,
        status: payment.status,
        created_at: payment.created_at,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        transfer_status: transfer?.transfer_status || 'pending',
        transfer_method: transfer?.transfer_method || 'stripe',
      };
    });

    // Calculate stats
    const { data: statsData } = await supabase
      .from('payments')
      .select('status, amount_charged')
      .eq('university_id', university_id);

    const stats: PaymentStats = {
      total_revenue: 0,
      total_payments: 0,
      completed_payments: 0,
      pending_payments: 0,
      processing_payments: 0,
    };

    statsData?.forEach(payment => {
      stats.total_payments++;
      if (payment.status === 'succeeded') {
        stats.completed_payments++;
        stats.total_revenue += Number(payment.amount_charged) || 0;
      } else if (payment.status === 'pending') {
        stats.pending_payments++;
      } else if (payment.status === 'processing') {
        stats.processing_payments++;
      }
    });

    const response: GetPaymentsResponse = {
      payments: transformedPayments,
      stats,
      total_count: totalCount || 0,
      page,
      page_size,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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
