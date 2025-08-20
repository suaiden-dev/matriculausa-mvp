import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { 
      university_id, 
      student_name, 
      student_email, 
      scholarship_title, 
      amount, 
      transfer_id,
      application_id 
    } = await req.json()

    if (!university_id || !student_name || !scholarship_title || !amount) {
      throw new Error('Missing required parameters')
    }

    // Formatar o valor para exibição
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)

    // Criar notificação para a universidade
    const { data: notification, error: notificationError } = await supabase
      .from('university_notifications')
      .insert({
        university_id,
        title: '💰 Novo pagamento recebido via Stripe Connect',
        message: `Estudante ${student_name} (${student_email}) pagou ${formattedAmount} pela bolsa "${scholarship_title}". O valor foi transferido automaticamente para sua conta Stripe.`,
        type: 'stripe_connect_payment',
        metadata: {
          student_name,
          student_email,
          scholarship_title,
          amount,
          transfer_id,
          application_id,
          payment_method: 'stripe_connect'
        },
        link: '/school/dashboard/transfers',
        idempotency_key: `stripe_connect_payment:${transfer_id}:${application_id}`
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      throw notificationError
    }

    // Atualizar o status da aplicação se application_id foi fornecido
    if (application_id) {
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          stripe_transfer_status: 'transferred',
          stripe_transfer_id: transfer_id,
          stripe_transfer_amount: amount,
          stripe_transfer_date: new Date().toISOString()
        })
        .eq('id', application_id)

      if (updateError) {
        console.error('Error updating application:', updateError)
        // Não falhar se a atualização da aplicação falhar
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        message: 'Notification sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in notify-university-stripe-connect-payment:', error)
    
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
