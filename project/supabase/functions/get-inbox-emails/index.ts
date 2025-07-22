import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
  priority: 'high' | 'normal' | 'low';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { access_token, maxResults = 20 } = await req.json()

    if (!access_token) {
      throw new Error('Access token is required')
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text()
      console.error('Gmail API error:', error)
      throw new Error(`Gmail API error: ${gmailResponse.status}`)
    }

    const gmailData = await gmailResponse.json()
    
    // Fetch detailed information for each email
    const emails: Email[] = await Promise.all(
      gmailData.messages?.slice(0, 10).map(async (message: any) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!detailResponse.ok) {
          console.error(`Failed to fetch email ${message.id}`)
          return null
        }

        const detail = await detailResponse.json()
        
        // Extract headers
        const headers = detail.payload?.headers || []
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown'
        const to = headers.find((h: any) => h.name === 'To')?.value || ''
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString()

        // Determine priority based on subject and sender
        let priority: 'high' | 'normal' | 'low' = 'normal'
        const subjectLower = subject.toLowerCase()
        const fromLower = from.toLowerCase()
        
        if (subjectLower.includes('urgent') || subjectLower.includes('asap') || 
            fromLower.includes('admissions') || fromLower.includes('financial')) {
          priority = 'high'
        } else if (subjectLower.includes('newsletter') || subjectLower.includes('promotion')) {
          priority = 'low'
        }

        return {
          id: message.id,
          threadId: message.threadId,
          from: from,
          to: to,
          subject: subject,
          snippet: detail.snippet || '',
          date: new Date(date).toLocaleString(),
          isRead: !detail.labelIds?.includes('UNREAD'),
          hasAttachments: detail.payload?.parts?.some((part: any) => part.filename) || false,
          priority: priority
        }
      }) || []
    )

    // Filter out null values and sort by date
    const validEmails = emails.filter(email => email !== null).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return new Response(
      JSON.stringify({
        success: true,
        emails: validEmails,
        total: validEmails.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error fetching emails:', error)
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