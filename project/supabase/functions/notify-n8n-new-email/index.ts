import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailNotification {
  event: 'new_email_received';
  timestamp: string;
  conversation_id: string;
  university: {
    id: string;
    name: string;
  };
  email: {
    message_id: string;
    from: string;
    to: string;
    subject: string;
    body_preview: string;
    has_attachments: boolean;
    attachments_count: number;
    thread_id?: string;
  };
  processing: {
    ai_enabled: boolean;
    status: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📤 notify-n8n-new-email: Received notification request');
    
    const requestBody = await req.json();
    console.log('📤 notify-n8n-new-email: Request body:', JSON.stringify(requestBody, null, 2));

    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    if (!n8nWebhookUrl) {
      console.log('⚠️ N8N_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'N8N_WEBHOOK_URL not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Preparar dados da notificação
    const notificationData: EmailNotification = {
      event: 'new_email_received',
      timestamp: new Date().toISOString(),
      conversation_id: requestBody.conversation_id,
      university: {
        id: requestBody.university.id,
        name: requestBody.university.name
      },
      email: {
        message_id: requestBody.email.message_id,
        from: requestBody.email.from,
        to: requestBody.email.to,
        subject: requestBody.email.subject,
        body_preview: requestBody.email.body_preview,
        has_attachments: requestBody.email.has_attachments,
        attachments_count: requestBody.email.attachments_count,
        thread_id: requestBody.email.thread_id
      },
      processing: {
        ai_enabled: requestBody.processing.ai_enabled,
        status: requestBody.processing.status
      }
    };

    console.log('📤 Sending to n8n:', JSON.stringify(notificationData, null, 2));

    // Enviar para n8n
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send notification to n8n:', response.status, response.statusText, errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to send to n8n: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Notification sent to n8n successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent to n8n successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in notify-n8n-new-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 