import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetAttachmentRequest {
  messageId: string;
  attachmentId: string;
}

// Função para renovar access token usando refresh token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messageId, attachmentId }: GetAttachmentRequest = await req.json();
    
    console.log('📎 Attachment request:', { messageId, attachmentId });

    if (!messageId || !attachmentId) {
      throw new Error('Missing required fields: messageId, attachmentId');
    }

    // Get current user session
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('User not authenticated');
    }

    // Get user's Gmail connection
    const { data: connections, error: connectionError } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .limit(1);

    if (connectionError || !connections || connections.length === 0) {
      throw new Error('No Gmail connection found');
    }

    const connection = connections[0];
    let accessToken = connection.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(connection.expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
      accessToken = await refreshAccessToken(connection.refresh_token);
      
      // Update the connection with new token
      await supabase
        .from('email_connections')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        })
        .eq('id', connection.id);
    }

    // Get attachment from Gmail API
    console.log('🔍 Fetching attachment from Gmail API...');
    const gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
    console.log('📡 Gmail API URL:', gmailUrl);
    
    const gmailResponse = await fetch(gmailUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Gmail API response status:', gmailResponse.status);
    
    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      console.error('❌ Gmail attachment error:', error);
      throw new Error(`Gmail attachment error: ${gmailResponse.status}`);
    }

    const result = await gmailResponse.json();

    console.log('✅ Attachment retrieved successfully:', {
      messageId,
      attachmentId,
      size: result.size,
      hasData: !!result.data,
      dataLength: result.data ? result.data.length : 0,
      timestamp: new Date().toISOString()
    });

    if (!result.data) {
      throw new Error('No attachment data received from Gmail API');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        size: result.size
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error getting attachment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 