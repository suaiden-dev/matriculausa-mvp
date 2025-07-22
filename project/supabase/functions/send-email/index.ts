import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  access_token: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { access_token, to, subject, body, threadId }: SendEmailRequest = await req.json()

    if (!access_token || !to || !subject || !body) {
      throw new Error('Missing required fields: access_token, to, subject, body')
    }

    // Create email message in Gmail format
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\r\n')

    // Encode the email content
    const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    // Prepare the request body
    const requestBody: any = {
      raw: encodedEmail
    }

    // If replying to a thread, include the thread ID
    if (threadId) {
      requestBody.threadId = threadId
    }

    // Send email via Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text()
      console.error('Gmail send error:', error)
      throw new Error(`Gmail send error: ${gmailResponse.status}`)
    }

    const result = await gmailResponse.json()

    // Log the successful send
    console.log('Email sent successfully:', {
      messageId: result.id,
      threadId: result.threadId,
      to: to,
      subject: subject,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        threadId: result.threadId,
        sentAt: new Date().toISOString(),
        to: to,
        subject: subject
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 