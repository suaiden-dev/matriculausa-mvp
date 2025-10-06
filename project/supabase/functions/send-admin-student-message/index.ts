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
    console.log('[send-admin-student-message] Starting processing');
    const { conversation_id, recipient_id, text, file_url, file_name } = await req.json();
    console.log('[send-admin-student-message] Payload received:', { conversation_id, recipient_id, text, file_url, file_name });
    
    if (!conversation_id || !recipient_id || (!text && !file_url)) {
      console.warn('[send-admin-student-message] Missing required fields or no content.');
      return new Response(JSON.stringify({ error: 'conversation_id, recipient_id and either text or file_url are required.' }), {
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
      console.error('[send-admin-student-message] Missing Authorization header');
      throw new Error('Missing Authorization header');
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('[send-admin-student-message] User not authenticated', userError);
      throw new Error('User not authenticated');
    }
    
    const sender_id = user.id;

    // Verify the conversation exists and the sender is part of it
    const { data: convData, error: convError } = await supabase
      .from('admin_student_conversations')
      .select('admin_id, student_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !convData) {
      console.error('[send-admin-student-message] Failed to retrieve conversation details', convError);
      throw new Error('Failed to retrieve conversation details or conversation not found.');
    }

    // Verify sender is part of the conversation
    if (sender_id !== convData.admin_id && sender_id !== convData.student_id) {
      console.error('[send-admin-student-message] Sender is not part of this conversation', { sender_id, admin_id: convData.admin_id, student_id: convData.student_id });
      throw new Error('Sender is not part of this conversation.');
    }

    // Verify recipient_id matches the other party in the conversation
    const expected_recipient = sender_id === convData.admin_id ? convData.student_id : convData.admin_id;
    if (recipient_id !== expected_recipient) {
      console.error('[send-admin-student-message] Invalid recipient_id', { recipient_id, expected_recipient });
      throw new Error('Invalid recipient_id for this conversation.');
    }

    // Insert the message
    const { data: newMessage, error: msgError } = await supabase
      .from('admin_student_messages')
      .insert({
        conversation_id,
        sender_id,
        recipient_id,
        message: text || '',
      })
      .select()
      .single();

    if (msgError || !newMessage) {
      console.error('[send-admin-student-message] Failed to send message', msgError);
      throw new Error(`Failed to send message: ${msgError?.message}`);
    }

    // Add attachment if provided
    if (file_url) {
      const { error: attachError } = await supabase
        .from('admin_student_message_attachments')
        .insert({
          message_id: newMessage.id,
          file_url,
          file_name: file_name || null,
        });
      
      if (attachError) {
        // Log the error, but don't fail the whole request
        console.error('[send-admin-student-message] Failed to save attachment:', attachError.message);
      }
    }
    
    console.log('[send-admin-student-message] Message sent successfully', newMessage);
    return new Response(JSON.stringify(newMessage), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-admin-student-message] Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});