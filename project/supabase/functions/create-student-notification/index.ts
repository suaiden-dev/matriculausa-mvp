// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

type CreateStudentNotificationInput = {
  student_id?: number; // user_profiles.id (BIGINT)
  user_id?: string; // auth.users.id (UUID) - mantido para compatibilidade
  title: string;
  message: string;
  type?: string; // ignorado no insert (schema atual não tem)
  link?: string;
};

function corsHeaders(origin: string | null) {
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    };
  }
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { status: 200, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
    }

    let body: CreateStudentNotificationInput;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON', details: String(e) }), { status: 400, headers: corsHeaders(origin) });
    }

    const { student_id, user_id, title, message } = body || {};
    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'title and message are required' }), { status: 400, headers: corsHeaders(origin) });
    }

    let resolvedStudentId: number | null = null;
    if (typeof student_id === 'number') {
      resolvedStudentId = student_id;
    } else if (user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user_id)
        .single();
      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: 'Student profile not found for provided user_id' }), { status: 404, headers: corsHeaders(origin) });
      }
      resolvedStudentId = profile.id as number;
    } else {
      return new Response(JSON.stringify({ error: 'student_id or user_id is required' }), { status: 400, headers: corsHeaders(origin) });
    }

    // Monta payload somente com colunas existentes no schema atual
    const insertPayload: Record<string, unknown> = {
      student_id: resolvedStudentId,
      title,
      message,
    };
    if (body.link) insertPayload.link = body.link;

    const { error: insertError } = await supabase
      .from('student_notifications')
      .insert(insertPayload);

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create notification', details: insertError.message }), { status: 500, headers: corsHeaders(origin) });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders(origin) });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: true, message: err?.message || 'Internal error' }), { status: 500, headers: corsHeaders(origin) });
  }
});


