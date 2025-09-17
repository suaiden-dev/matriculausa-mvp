import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for internal operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let configId: string | null = null;

    if (req.method === 'POST') {
      // Manual sync for specific config
      const { config_id } = await req.json();
      configId = config_id;

      // Create client with user auth for permission check
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify config belongs to user
      const { data: config, error: configError } = await supabaseClient
        .from('email_configurations')
        .select('id')
        .eq('id', configId)
        .eq('user_id', user.id)
        .single();

      if (configError || !config) {
        return new Response(
          JSON.stringify({ error: 'Configuration not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get configurations to sync
    let query = supabaseAdmin
      .from('email_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('sync_enabled', true);

    if (configId) {
      query = query.eq('id', configId);
    }

    const { data: configurations, error: configsError } = await query;

    if (configsError) {
      throw configsError;
    }

    const results: Array<{
      configId: string;
      success: boolean;
      emailsFound?: number;
      emailsSaved?: number;
      error?: string;
    }> = [];

    for (const config of configurations) {
      try {
        const syncResult = await syncEmails(config, supabaseAdmin);
        results.push({
          configId: config.id,
          success: true,
          emailsFound: syncResult.emailsFound,
          emailsSaved: syncResult.emailsSaved
        });
      } catch (error) {
        results.push({
          configId: config.id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Email sync completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function syncEmails(config: any, supabaseAdmin: any) {
  // Ensure Node Buffer exists for libraries expecting it (imapflow)
  const { Buffer } = await import('https://esm.sh/buffer@6.0.3?bundle');
  // @ts-ignore - global assignment for polyfill
  if (!(globalThis as any).Buffer) {
    // @ts-ignore
    (globalThis as any).Buffer = Buffer;
  }

  const { ImapFlow } = await import('https://esm.sh/imapflow@1.0.164');
  const CryptoJS = await import('https://esm.sh/crypto-js@4.2.0');

  // Decrypt password
  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.default.AES.decrypt(encryptedData, Deno.env.get('EMAIL_ENCRYPTION_KEY') || 'default-key');
    return bytes.toString(CryptoJS.default.enc.Utf8);
  };

  const client = new ImapFlow({
    host: config.imap_host,
    port: config.imap_port,
    secure: config.imap_secure,
    auth: {
      user: config.imap_auth_user,
      pass: decryptData(config.imap_auth_pass)
    }
  });

  try {
    await client.connect();
    
    // Open INBOX
    await client.mailboxOpen('INBOX');

    // Search for unseen emails
    let searchQuery: any = { unseen: true };
    
    // If we have a last sync date, search since then
    if (config.last_sync_at) {
      const lastSync = new Date(config.last_sync_at);
      searchQuery = { since: lastSync };
    }

    const messages = await client.search(searchQuery);
    
    if (messages.length === 0) {
      await client.logout();
      return { emailsFound: 0, emailsSaved: 0 };
    }

    const emails: any[] = [];
    
    // Fetch emails in batches
    for await (const message of client.fetch(messages, {
      envelope: true,
      source: true,
      bodyStructure: true,
      headers: true
    })) {
      try {
        // Parse email
        const { default: addressparser } = await import('https://esm.sh/addressparser@1.0.1');
        
        const envelope = message.envelope;
        const headers = message.headers || new Map();
        
        // Get body content
        let textContent = '';
        let htmlContent = '';
        
        // Try to get text and HTML content from source
        if (message.source) {
          const sourceStr = new TextDecoder().decode(message.source);
          
          // Simple parsing - in production you'd want a proper email parser
          const textMatch = sourceStr.match(/Content-Type: text\/plain[^]*?^$/m);
          const htmlMatch = sourceStr.match(/Content-Type: text\/html[^]*?^$/m);
          
          if (textMatch) {
            textContent = textMatch[0].split('\n\n').slice(1).join('\n\n').trim();
          }
          if (htmlMatch) {
            htmlContent = htmlMatch[0].split('\n\n').slice(1).join('\n\n').trim();
          }
        }

        const emailData = {
          email_config_id: config.id,
          message_id: envelope.messageId || `${message.uid}-${Date.now()}`,
          subject: envelope.subject || '',
          from_address: envelope.from?.[0]?.address || '',
          from_name: envelope.from?.[0]?.name || '',
          to_addresses: envelope.to?.map((addr: any) => addr.address) || [],
          cc_addresses: envelope.cc?.map((addr: any) => addr.address) || [],
          bcc_addresses: envelope.bcc?.map((addr: any) => addr.address) || [],
          reply_to: envelope.replyTo?.[0]?.address || '',
          text_content: textContent || '',
          html_content: htmlContent || '',
          received_date: envelope.date || new Date(),
          is_read: false
        };

        emails.push(emailData);
      } catch (parseError) {
        console.error('Error parsing email:', parseError);
      }
    }

    await client.logout();

    // Save emails to database
    let emailsSaved = 0;
    if (emails.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('received_emails')
        .upsert(emails, {
          onConflict: 'email_config_id,message_id',
          ignoreDuplicates: true
        });

      if (insertError) {
        console.error('Failed to save emails:', insertError);
      } else {
        emailsSaved = emails.length;
      }
    }

    // Update last sync time
    await supabaseAdmin
      .from('email_configurations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    return { 
      emailsFound: messages.length, 
      emailsSaved 
    };

  } catch (error) {
    await client.logout();
    throw error;
  }
}