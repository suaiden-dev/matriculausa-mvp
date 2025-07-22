import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DraftRequest {
  originalEmail: {
    from: string;
    subject: string;
    content: string;
  };
  universityContext?: string;
  tone?: 'professional' | 'friendly' | 'formal';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { originalEmail, universityContext, tone = 'professional' }: DraftRequest = await req.json()

    if (!originalEmail) {
      throw new Error('Original email content is required')
    }

    // Simulate AI response without actual AI integration
    const mockResponses = {
      professional: `Dear ${originalEmail.from.split('@')[0] || 'Student'},

Thank you for your inquiry regarding ${originalEmail.subject.toLowerCase().includes('scholarship') ? 'scholarship opportunities' : 'our university programs'}.

We have received your message and our admissions team will review your request within 24-48 hours. You can expect a detailed response with all the information you need.

In the meantime, you may find helpful information on our website or feel free to contact our admissions office directly.

Best regards,
University Admissions Team`,
      
      friendly: `Hi ${originalEmail.from.split('@')[0] || 'there'}! 👋

Thanks so much for reaching out about ${originalEmail.subject.toLowerCase().includes('scholarship') ? 'scholarships' : 'our programs'}!

We're excited about your interest and our team will get back to you with all the details you need within the next day or two.

Feel free to check out our website in the meantime, and don't hesitate to reach out if you have any urgent questions!

Cheers,
The Admissions Team`,
      
      formal: `Dear ${originalEmail.from.split('@')[0] || 'Student'},

We acknowledge receipt of your inquiry dated ${new Date().toLocaleDateString()} regarding ${originalEmail.subject}.

This communication serves to confirm that your request has been received and is currently under review by our admissions department. You will receive a comprehensive response within 48 hours.

For immediate assistance, please contact our admissions office at the provided contact information.

Sincerely,
University Admissions Department`
    }

    const generatedText = mockResponses[tone] || mockResponses.professional

    return new Response(
      JSON.stringify({
        success: true,
        draft: generatedText,
        originalEmail: originalEmail,
        generatedAt: new Date().toISOString(),
        note: 'AI integration pending - using template response'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating draft:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallbackDraft: `Dear ${originalEmail?.from || 'Student'},

Thank you for your inquiry regarding ${originalEmail?.subject || 'your application'}.

We appreciate your interest in our university and would be happy to assist you with any questions you may have about our programs, admission requirements, or application process.

Please feel free to reach out if you need any additional information or clarification.

Best regards,
University Admissions Team`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 