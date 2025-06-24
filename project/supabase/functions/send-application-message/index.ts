import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { application_id, text, file_url, file_name } = await req.json();
    if (!application_id || (!text && !file_url)) {
      return new Response(JSON.stringify({ error: 'A message must have text or an attachment.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      throw new Error('User not authenticated');
    }
    
    const sender_id = user.id;

    const { data: appData, error: appError } = await supabase
      .from('scholarship_applications')
      .select('student_id, scholarships(universities(user_id))')
      .eq('id', application_id)
      .single();

    if (appError || !appData) {
      throw new Error('Failed to retrieve application details or application not found.');
    }

    const studentId = appData.student_id;
    const universityUserId = appData.scholarships?.universities?.user_id;

    if (!studentId || !universityUserId) {
        throw new Error('Could not determine student or university from application.');
    }

    let recipient_id: string;
    if (sender_id === studentId) {
        recipient_id = universityUserId;
    } else if (sender_id === universityUserId) {
        recipient_id = studentId;
    } else {
        throw new Error('Sender is not part of this application.');
    }

    const { data: newMessage, error: msgError } = await supabase
      .from('application_messages')
      .insert({
        application_id,
        sender_id,
        recipient_id,
        message: text || '',
      })
      .select()
      .single();

    if (msgError || !newMessage) {
      throw new Error(`Failed to send message: ${msgError?.message}`);
    }

    if (file_url) {
      const { error: attachError } = await supabase
        .from('application_message_attachments')
        .insert({
          message_id: newMessage.id,
          file_url,
          file_name: file_name || null,
        });
      if (attachError) {
        // Log the error, but don't fail the whole request
        console.error('Failed to save attachment:', attachError.message);
      }
    }
    
    // The client expects the full message object for optimistic updates
    return new Response(JSON.stringify(newMessage), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 