import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
// @ts-ignore
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Busca todos os usuários admin do sistema
 * Retorna array com email, nome e telefone de cada admin
 * Em ambiente de desenvolvimento (localhost), filtra emails específicos
 */
async function getAllAdmins(supabase: SupabaseClient, isDevelopment: boolean = false): Promise<Array<{
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
}>> {
  // Emails a serem filtrados em ambiente de desenvolvimento
  const devBlockedEmails = [
    'luizedmiola@gmail.com',
    'chimentineto@gmail.com',
    'fsuaiden@gmail.com',
    'rayssathefuture@gmail.com',
    'gui.reis@live.com',
    'admin@matriculausa.com'
  ];
  
  try {
    // Buscar todos os admins da tabela user_profiles onde role = 'admin'
    const { data: adminProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, phone')
      .eq('role', 'admin');

    if (profileError) {
      console.error('[getAllAdmins] Erro ao buscar admins de user_profiles:', profileError);
      
      // Fallback: retornar admin padrão
      return [{
        user_id: '',
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin encontrado, usando admin padrão');
      return [{
        user_id: '',
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    // Filtrar emails bloqueados em desenvolvimento
    let admins = adminProfiles;
    if (isDevelopment) {
      const beforeFilter = admins.length;
      admins = admins.filter((admin: any) => !devBlockedEmails.includes(admin.email));
      if (beforeFilter !== admins.length) {
        console.log(`[getAllAdmins] Filtrados ${beforeFilter - admins.length} admin(s) em ambiente de desenvolvimento`);
      }
    }

    if (admins.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin válido após filtro, usando admin padrão');
      return [{
        user_id: '',
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    console.log(`[getAllAdmins] Encontrados ${admins.length} admin(s)${isDevelopment ? ' (filtrados para dev)' : ''}:`, admins.map((a: any) => a.email));

    return admins;
  } catch (error) {
    console.error('[getAllAdmins] Erro inesperado ao buscar admins:', error);
    return [{
      user_id: '',
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  }
}

/**
 * Envia notificação de aceitação de termos com PDF após pagamento bem-sucedido
 */
async function sendTermAcceptanceNotificationAfterPayment(userId: string, feeType: string, isDevelopment: boolean = false) {
  try {
    console.log('[NOTIFICAÇÃO] Buscando dados do usuário para notificação...');
    
    // Buscar perfil do usuário
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, country, seller_referral_code')
      .eq('user_id', userId)
      .single();
    
    if (userError || !userProfile) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:', userError);
      return;
    }
    
    // Buscar aceitação de termos mais recente
    const { data: termAcceptance, error: termError } = await supabase
      .from('comprehensive_term_acceptance')
      .select('term_id, accepted_at, ip_address, user_agent, identity_photo_path, identity_photo_name')
      .eq('user_id', userId)
      .eq('term_type', 'checkout_terms')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (termError) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:', termError);
      return;
    }
    
    if (!termAcceptance) {
      console.warn('[NOTIFICAÇÃO] Nenhuma aceitação de termos encontrada para o usuário');
      return;
    }
    
    // Buscar conteúdo do termo
    const { data: termData, error: termDataError } = await supabase
      .from('application_terms')
      .select('title, content')
      .eq('id', termAcceptance.term_id)
      .single();
    
    if (termDataError || !termData) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:', termDataError);
      return;
    }
    
    // Buscar dados do seller se houver
    let sellerData = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase
        .from('sellers')
        .select('name, email, referral_code, user_id, affiliate_admin_id')
        .eq('referral_code', userProfile.seller_referral_code)
        .single();
      
      if (sellerResult) {
        sellerData = sellerResult;
      }
    }
    
    // Buscar dados do affiliate admin se houver
    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase
        .from('affiliate_admins')
        .select('name, email')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      
      if (affiliateResult) {
        affiliateAdminData = {
          full_name: affiliateResult.name,
          email: affiliateResult.email
        };
      }
    }
    
    // Gerar PDF de aceitação de termos
    let pdfBlob = null;
    try {
      console.log('[NOTIFICAÇÃO] Gerando PDF para notificação...');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = margin;
      
      // Função para adicionar texto com quebra de linha
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        for (let i = 0; i < lines.length; i++) {
          if (y > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(lines[i], x, y);
          y += fontSize * 0.6;
        }
        return y;
      };
      
      // Cabeçalho do PDF
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM ACCEPTANCE DOCUMENT', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Linha separadora
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // Informações do estudante
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('STUDENT INFORMATION', margin, currentY);
      currentY += 12;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(userProfile.full_name, margin + 30, currentY);
      currentY += 8;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(userProfile.email, margin + 30, currentY);
      currentY += 8;
      
      if (userProfile.country) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Country:', margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(userProfile.country, margin + 40, currentY);
        currentY += 8;
      }
      
      currentY += 5;
      
      // Linha separadora
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // Conteúdo do termo (se houver)
      if (termData.content && termData.content.trim() !== '') {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TERM CONTENT', margin, currentY);
        currentY += 12;
        
        // Processar conteúdo HTML do termo
        const cleanText = termData.content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        const maxTermContentLength = 3000;
        const termContent = cleanText.length > maxTermContentLength 
          ? cleanText.substring(0, maxTermContentLength) + '...'
          : cleanText;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        currentY = addWrappedText(termContent, margin, currentY, pageWidth - margin - 20, 10);
        currentY += 8;
        
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }
      
      // Detalhes da aceitação
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM ACCEPTANCE DETAILS', margin, currentY);
      currentY += 12;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Term Title:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY = addWrappedText(termData.title, margin + 50, currentY, pageWidth - margin - 50, 11);
      currentY += 5;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Accepted At:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(termAcceptance.accepted_at).toLocaleString(), margin + 50, currentY);
      currentY += 8;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('IP Address:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(termAcceptance.ip_address || 'N/A', margin + 50, currentY);
      currentY += 10;
      
      // Incluir foto de identidade (se houver)
      if (termAcceptance.identity_photo_path && termAcceptance.identity_photo_path.trim() !== '') {
        try {
          console.log('[NOTIFICAÇÃO] Foto de identidade encontrada, incluindo no PDF:', termAcceptance.identity_photo_path);
          
          // Verificar se precisa de nova página
          const pageHeight = pdf.internal.pageSize.getHeight();
          if (currentY > pageHeight - margin - 80) {
            pdf.addPage();
            currentY = margin;
          }
          
          // Download da foto do Storage
          const { data: imageData, error: imageError } = await supabase.storage
            .from('identity-photos')
            .download(termAcceptance.identity_photo_path);
          
          if (!imageError && imageData) {
            try {
              // Converter para ArrayBuffer
              const imageArrayBuffer = await imageData.arrayBuffer();
              const imageBytes = new Uint8Array(imageArrayBuffer);
              
              // Converter para base64
              let binary = '';
              for (let i = 0; i < imageBytes.length; i++) {
                binary += String.fromCharCode(imageBytes[i]);
              }
              const imageBase64 = btoa(binary);
              
              // Determinar formato da imagem
              const fileExtension = termAcceptance.identity_photo_path.split('.').pop()?.toLowerCase() || 'jpg';
              const imageFormat = fileExtension === 'png' ? 'PNG' : 'JPEG';
              const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
              const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;
              
              // Adicionar seção de foto
              currentY += 10;
              pdf.setFontSize(14);
              pdf.setFont('helvetica', 'bold');
              pdf.text('IDENTITY PHOTO WITH DOCUMENT', margin, currentY);
              currentY += 12;
              
              // Calcular dimensões mantendo proporção
              const maxWidth = 280;
              const maxHeight = 320;
              const availableWidth = pageWidth - (2 * margin);
              
              const maxWidthUnits = maxWidth * 0.264583;
              const maxHeightUnits = maxHeight * 0.264583;
              const imageWidth = Math.min(maxWidthUnits, availableWidth * 0.9);
              
              let finalWidth = imageWidth;
              let finalHeight = 0;
              
              try {
                const imgProps = pdf.getImageProperties(imageDataUrl);
                const imgWidth = imgProps.width;
                const imgHeight = imgProps.height;
                const aspectRatio = imgHeight / imgWidth;
                
                finalHeight = imageWidth * aspectRatio;
                
                if (finalHeight > maxHeightUnits) {
                  finalHeight = maxHeightUnits;
                  finalWidth = finalHeight / aspectRatio;
                }
                
                pdf.addImage(imageDataUrl, imageFormat, margin, currentY, finalWidth, finalHeight, undefined, 'FAST');
                currentY += finalHeight + 10;
              } catch (propError) {
                console.warn('[NOTIFICAÇÃO] Erro ao obter dimensões da imagem:', propError);
                finalHeight = imageWidth * 1.33;
                pdf.addImage(imageDataUrl, imageFormat, margin, currentY, finalWidth, finalHeight, undefined, 'FAST');
                currentY += finalHeight + 10;
              }
              
              console.log('[NOTIFICAÇÃO] ✅ Foto de identidade incluída no PDF com sucesso!');
            } catch (conversionError) {
              console.error('[NOTIFICAÇÃO] Erro ao converter foto para base64:', conversionError);
            }
          } else {
            console.warn('[NOTIFICAÇÃO] Erro ao carregar foto:', imageError?.message);
          }
        } catch (photoError) {
          console.error('[NOTIFICAÇÃO] Erro ao processar foto:', photoError);
        }
      } else {
        console.log('[NOTIFICAÇÃO] Nenhuma foto de identidade encontrada');
      }
      
      // Gerar PDF blob
      const pdfArrayBuffer = pdf.output('arraybuffer');
      pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      console.log('[NOTIFICAÇÃO] PDF gerado com sucesso!');
    } catch (pdfError) {
      console.error('[NOTIFICAÇÃO] Erro ao gerar PDF:', pdfError);
      console.warn('[NOTIFICAÇÃO] Continuando sem PDF devido ao erro');
    }
    
    // Preparar payload de notificação
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || "",
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar: `Student ${userProfile.full_name} has accepted the Student Checkout Terms & Conditions and completed ${feeType} payment via Parcelow. This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || ""
    };
    
    console.log('[NOTIFICAÇÃO] Enviando notificação de aceitação de termos para o aluno:', userProfile.email);
    
    // Enviar notificação (com ou sem PDF)
    let webhookResponse;
    if (pdfBlob) {
      const formData = new FormData();
      Object.entries(webhookPayload).forEach(([key, value]) => {
        formData.append(key, value !== null && value !== undefined ? value.toString() : '');
      });
      
      const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      formData.append('pdf', pdfBlob, fileName);
      
      webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        body: formData
      });
    } else {
      webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.3'
        },
        body: JSON.stringify(webhookPayload)
      });
    }
    
    if (webhookResponse.ok) {
      console.log(`[NOTIFICAÇÃO] Notificação de aceitação de termos enviada com sucesso para ${userProfile.email}!`);
    } else {
      const errorText = await webhookResponse.text();
      console.warn(`[NOTIFICAÇÃO] Erro ao enviar notificação:`, webhookResponse.status, errorText);
    }
  } catch (error) {
    console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:', error);
  }
}

/**
 * Formata valor monetário
 */
function formatAmountWithCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currency === 'BRL' ? 'R$' : '$';
  return `${symbol}${amount.toFixed(2)}`;
}

Deno.serve(async (req) => {
  try {
    console.log('[parcelow-webhook] 🚀 Recebido webhook da Parcelow');
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    const payload = await req.json();
    console.log('[parcelow-webhook] 📥 Payload:', JSON.stringify(payload, null, 2));

    const event = payload.event;
    const parcelowOrder = payload.order;

    if (!parcelowOrder || !parcelowOrder.id) {
      console.error('[parcelow-webhook] ❌ Payload inválido: falta order.id');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // 1. Buscar pagamento original (tentar por order_id primeiro, depois por reference)
    let payment = null;
    let paymentError = null;

    // Tentar buscar por parcelow_order_id
    const { data: paymentById, error: errorById } = await supabase
      .from('individual_fee_payments')
      .select('*')
      .eq('parcelow_order_id', String(parcelowOrder.id))
      .maybeSingle();

    if (paymentById) {
      payment = paymentById;
      console.log('[parcelow-webhook] ✅ Pagamento encontrado por order_id:', payment.id);
    } else {
      // Tentar buscar por reference
      console.log('[parcelow-webhook] ⚠️ Pagamento não encontrado por order_id, tentando por reference...');
      
      const reference = parcelowOrder.reference;
      
      if (reference) {
        console.log('[parcelow-webhook] 🔍 Buscando por reference:', reference);
        
        // Buscar pagamento por parcelow_reference
        const { data: paymentByReference, error: errorByReference } = await supabase
          .from('individual_fee_payments')
          .select('*')
          .eq('parcelow_reference', reference)
          .eq('payment_method', 'parcelow')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (paymentByReference) {
          payment = paymentByReference;
          console.log('[parcelow-webhook] ✅ Pagamento encontrado por reference:', payment.id);
          
          // Atualizar o parcelow_order_id para futuras buscas
          await supabase
            .from('individual_fee_payments')
            .update({ parcelow_order_id: String(parcelowOrder.id) })
            .eq('id', payment.id);
          console.log('[parcelow-webhook] ✅ parcelow_order_id atualizado para:', parcelowOrder.id);
        } else {
          paymentError = errorByReference;
          console.error('[parcelow-webhook] ❌ Pagamento não encontrado por reference');
        }
      } else {
        console.error('[parcelow-webhook] ❌ Reference não encontrado no payload');
      }
    }

    if (!payment) {
      // Tentar buscar por metadata (fallback final)
      console.log('[parcelow-webhook] ⚠️ Pagamento não encontrado por order_id ou reference, tentando por metadata...');
      
      const metadata = parcelowOrder.metadata || {};
      const userId = metadata.user_id;
      const feeType = metadata.fee_type;

      if (userId && feeType) {
        console.log(`[parcelow-webhook] 🔍 Buscando por metadata: user_id=${userId}, fee_type=${feeType}`);
        
        const { data: paymentByMetadata, error: errorByMetadata } = await supabase
          .from('individual_fee_payments')
          .select('*')
          .eq('user_id', userId)
          .eq('fee_type', feeType)
          .eq('payment_method', 'parcelow')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (paymentByMetadata) {
          payment = paymentByMetadata;
          console.log('[parcelow-webhook] ✅ Pagamento encontrado por metadata:', payment.id);
          
          // Atualizar o parcelow_order_id para futuras buscas
          await supabase
            .from('individual_fee_payments')
            .update({ 
              parcelow_order_id: String(parcelowOrder.id),
              parcelow_reference: parcelowOrder.reference || payment.parcelow_reference
            })
            .eq('id', payment.id);
          console.log('[parcelow-webhook] ✅ parcelow_order_id/reference atualizados');
        }
      } else {
        console.error('[parcelow-webhook] ❌ Metadata incompleto ou ausente:', { userId, feeType });
        
        // Tentativa desesperada: parse do reference
        const reference = parcelowOrder.reference;
        if (reference && reference.startsWith('sel_proc_')) {
          console.log('[parcelow-webhook] ⚠️ Tentando identificar pagamento pelo prefixo do reference: sel_proc');
          // Infelizmente sem o userId não podemos buscar com segurança.
        }
      }
    }

    if (!payment) {
      console.error('[parcelow-webhook] ❌ Pagamento não encontrado para order_id:', parcelowOrder.id);
      console.error('[parcelow-webhook] ❌ Reference do pedido:', parcelowOrder.reference);
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404 });
    }

    // 2. Mapear status
    let newStatus = payment.parcelow_status || 'pending';
    let isPaid = false;

    switch (event) {
      case 'event_order_paid':
        newStatus = 'paid';
        isPaid = true;
        break;
      case 'event_order_declined':
      case 'event_order_canceled':
      case 'event_order_expired':
        newStatus = 'failed';
        break;
      case 'event_order_waiting':
      case 'event_order_waiting_payment':
      case 'event_order_waiting_docs':
        newStatus = 'pending';
        break;
    }

    console.log(`[parcelow-webhook] 🔄 Atualizando status: ${payment.parcelow_status} -> ${newStatus}`);

    // 3. Atualizar record de pagamento
    const { error: updateError } = await supabase
      .from('individual_fee_payments')
      .update({
        parcelow_status: newStatus,
        parcelow_checkout_url: parcelowOrder.checkout_url || payment.parcelow_checkout_url,
        payment_date: isPaid ? new Date().toISOString() : payment.payment_date,
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[parcelow-webhook] ❌ Erro ao atualizar pagamento:', updateError);
      throw updateError;
    }

    // 4. Se pago, processar lógica completa (igual ao Stripe)
    if (isPaid && payment.parcelow_status !== 'paid') {
      console.log('[parcelow-webhook] ✅ Pagamento CONFIRMADO! Processando lógica completa...');

      const userId = payment.user_id;
      const feeType = payment.fee_type;

      // 4.0. Verificar duplicação de processamento
      const { data: existingLogs } = await supabase
        .from('student_action_logs')
        .select('id, metadata')
        .eq('action_type', 'fee_payment')
        .eq('metadata->>order_id', String(parcelowOrder.id));

      if (existingLogs && existingLogs.length > 0) {
        const hasNotificationLog = existingLogs.some((log: any) => {
          const metadata = log.metadata || {};
          return metadata.notifications_sending === true || metadata.notifications_sent === true;
        });

        if (hasNotificationLog) {
          console.log(`[parcelow-webhook] ⚠️ Pagamento já processado anteriormente, ignorando duplicação`);
          return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // 4.1. Buscar perfil do usuário
      const { data: userProfile, error: profileFetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, seller_referral_code')
        .eq('user_id', userId)
        .single();

      if (profileFetchError || !userProfile) {
        console.error('[parcelow-webhook] ❌ Erro ao buscar perfil:', profileFetchError);
        return new Response(JSON.stringify({ error: 'User profile not found' }), { status: 404 });
      }

      // 4.2. Criar log de início de processamento (proteção contra duplicação)
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `${feeType} payment processing started (Parcelow ${parcelowOrder.id})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: feeType,
            payment_method: 'parcelow',
            order_id: String(parcelowOrder.id),
            amount: payment.amount,
            processing_started: true
          }
        });
        console.log('[parcelow-webhook] ✅ Log de início de processamento criado');
      } catch (logError) {
        console.error('[parcelow-webhook] ❌ Erro ao criar log:', logError);
      }

      // 4.3. Lógica específica por tipo de fee
      switch (feeType) {
        case 'selection_process':
          console.log('[parcelow-webhook] 🔄 Processando selection_process...');
          
          const { error: profileUpdateError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_selection_process_fee: true,
              selection_process_fee_payment_method: 'parcelow'
            })
            .eq('user_id', userId);
          
          if (profileUpdateError) {
            console.error('[parcelow-webhook] ❌ Erro ao atualizar perfil:', profileUpdateError);
          } else {
            console.log('[parcelow-webhook] ✅ has_paid_selection_process_fee atualizado!');
          }
          break;

        case 'application_fee':
          console.log('[parcelow-webhook] 🔄 Processando application_fee...');
          
          const appMetadata = parcelowOrder.metadata || {};
          const applicationId = appMetadata.application_id;
          
          if (applicationId) {
            const { error: appUpdateError } = await supabase
              .from('scholarship_applications')
              .update({ status: 'application_fee_paid' })
              .eq('id', applicationId);
            
            if (appUpdateError) {
              console.error('[parcelow-webhook] ❌ Erro ao atualizar application:', appUpdateError);
            } else {
              console.log('[parcelow-webhook] ✅ Application status atualizado para: application_fee_paid');
            }
          } else {
            console.warn('[parcelow-webhook] ⚠️ application_id não encontrado no metadata');
          }
          break;

        case 'scholarship_fee':
          console.log('[parcelow-webhook] 🔄 Processando scholarship_fee...');
          
          const scholarshipMetadata = parcelowOrder.metadata || {};
          const scholarshipsIds = scholarshipMetadata.scholarships_ids;
          
          if (scholarshipsIds) {
            const idsArray = typeof scholarshipsIds === 'string' 
              ? scholarshipsIds.split(',').map((id: string) => id.trim())
              : scholarshipsIds;
            
            console.log('[parcelow-webhook] 📚 Processando bolsas:', idsArray);
            
            for (const scholarshipId of idsArray) {
              const { error: scholarshipUpdateError } = await supabase
                .from('scholarship_applications')
                .update({ status: 'scholarship_fee_paid' })
                .eq('scholarship_id', scholarshipId)
                .eq('student_id', userProfile.id);
              
              if (scholarshipUpdateError) {
                console.error(`[parcelow-webhook] ❌ Erro ao atualizar scholarship ${scholarshipId}:`, scholarshipUpdateError);
              } else {
                console.log(`[parcelow-webhook] ✅ Scholarship ${scholarshipId} atualizada`);
              }
            }
          }
          break;

        case 'i20_control':
        case 'i20_control_fee':
          console.log('[parcelow-webhook] 🔄 Processando i20_control_fee...');
          
          const { error: i20UpdateError } = await supabase
            .from('user_profiles')
            .update({ has_paid_i20_control_fee: true })
            .eq('user_id', userId);
          
          if (i20UpdateError) {
            console.error('[parcelow-webhook] ❌ Erro ao atualizar i20 control:', i20UpdateError);
          } else {
            console.log('[parcelow-webhook] ✅ I-20 control fee status atualizado!');
          }
          break;

        default:
          console.warn('[parcelow-webhook] ⚠️ Fee type não reconhecido:', feeType);
      }

      // 4.4. Processar recompensas de referência (MatriculaCoins)
      try {
        const { data: usedCode, error: usedError } = await supabase
          .from('used_referral_codes')
          .select('*')
          .eq('user_id', userId)
          .order('applied_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (usedError) {
          console.error('[parcelow-webhook] Erro ao buscar código de referência:', usedError);
        }

        if (usedCode && usedCode.referrer_id) {
          const referrerId = usedCode.referrer_id;
          console.log('[parcelow-webhook] 🎁 Código de referência encontrado, processando recompensa...');
          console.log('[parcelow-webhook] Referrer:', referrerId, 'Código:', usedCode.affiliate_code);

          // Obter nome do usuário que pagou
          let referredDisplayName = userProfile.full_name || userId;

          // Upsert affiliate_referrals
          const { error: upsertRefError } = await supabase
            .from('affiliate_referrals')
            .upsert({
              referrer_id: referrerId,
              referred_id: userId,
              affiliate_code: usedCode.affiliate_code,
              payment_amount: Number(payment.amount || 0),
              credits_earned: 180,
              status: 'completed',
              payment_session_id: String(parcelowOrder.id),
              completed_at: new Date().toISOString()
            }, {
              onConflict: 'referred_id'
            });

          if (upsertRefError) {
            console.error('[parcelow-webhook] ❌ Erro ao upsert affiliate_referrals:', upsertRefError);
          } else {
            console.log('[parcelow-webhook] ✅ affiliate_referrals atualizado');
          }

          // Adicionar 180 MatriculaCoins ao padrinho
          console.log('[parcelow-webhook] 💰 Creditando 180 MatriculaCoins ao padrinho...');
          const description = `Referral reward: ${feeType} paid by ${referredDisplayName}`;
          
          const { error: rewardError } = await supabase.rpc('add_coins_to_user_matricula', {
            user_id_param: referrerId,
            coins_to_add: 180,
            reason: description
          });

          if (rewardError) {
            console.error('[parcelow-webhook] ❌ Erro ao adicionar créditos:', rewardError);
          } else {
            console.log('[parcelow-webhook] ✅ 180 MatriculaCoins creditados com sucesso!');

            // Enviar notificação de recompensa para o padrinho
            try {
              const { data: referrerProfile } = await supabase
                .from('user_profiles')
                .select('full_name, email')
                .eq('user_id', referrerId)
                .single();

              const { data: referredProfileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', userId)
                .single();

              if (referrerProfile?.email) {
                const rewardPayload = {
                  tipo_notf: "Recompensa de MatriculaCoins por Indicacao",
                  email_aluno: referrerProfile.email,
                  nome_aluno: referrerProfile.full_name || "Aluno",
                  referred_student_name: referredDisplayName,
                  referred_student_email: referredProfileData?.email || "",
                  payment_method: "Parcelow",
                  fee_type: feeType,
                  reward_type: "MatriculaCoins",
                  o_que_enviar: `Great news! Your friend ${referredDisplayName} has completed their enrollment process via Parcelow. 180 MatriculaCoins have been added to your account!`
                };

                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(rewardPayload),
                });
                
                console.log('[parcelow-webhook] ✅ Notificação de recompensa enviada!');
              }
            } catch (rewardNotifError) {
              console.error('[parcelow-webhook] ❌ Erro ao enviar notificação de recompensa:', rewardNotifError);
            }
          }
        } else {
          console.log('[parcelow-webhook] ⚠️ Nenhum código de referência encontrado');
        }
      } catch (referralError) {
        console.error('[parcelow-webhook] ❌ Erro ao processar recompensas de referência:', referralError);
      }

      // 4.5. Limpar carrinho
      try {
        const { error: cartError } = await supabase
          .from('user_cart')
          .delete()
          .eq('user_id', userId);

        if (cartError) {
          console.error('[parcelow-webhook] ❌ Erro ao limpar carrinho:', cartError);
        } else {
          console.log('[parcelow-webhook] ✅ Carrinho limpo');
        }
      } catch (cartCleanError) {
        console.error('[parcelow-webhook] ❌ Erro ao limpar carrinho:', cartCleanError);
      }

      // 4.6. Detectar ambiente (dev ou prod)
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const isDevelopment = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
      
      console.log('[parcelow-webhook] 🌍 Ambiente detectado:', isDevelopment ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');

      // 4.7. Buscar todos os admins
      const admins = await getAllAdmins(supabase, isDevelopment);

      // 4.8. Criar log de "notificações sendo enviadas" para evitar duplicação
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `${feeType} notifications sending started (Parcelow ${parcelowOrder.id})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: feeType,
            payment_method: 'parcelow',
            order_id: String(parcelowOrder.id),
            amount: payment.amount,
            notifications_sending: true
          }
        });
        console.log('[parcelow-webhook] ✅ Log de envio de notificações criado');
      } catch (logError) {
        console.error('[parcelow-webhook] ❌ Erro ao criar log de notificações:', logError);
      }

      // 4.9. Enviar notificação de aceitação de termos (com PDF)
      try {
        console.log('[parcelow-webhook] 📄 Enviando notificação de aceitação de termos...');
        await sendTermAcceptanceNotificationAfterPayment(userId, feeType, isDevelopment);
        console.log('[parcelow-webhook] ✅ Notificação de termos enviada!');
      } catch (termNotifError) {
        console.error('[parcelow-webhook] ❌ Erro ao enviar notificação de termos:', termNotifError);
      }

      // 4.10. Enviar notificações completas
      try {
        console.log('[parcelow-webhook] 📧 Iniciando envio de notificações...');

        const formattedAmount = formatAmountWithCurrency(payment.amount, 'USD');

        // 1. NOTIFICAÇÃO PARA O ALUNO
        const alunoNotificationPayload = {
          tipo_notf: 'Pagamento de ' + feeType + ' confirmado',
          email_aluno: userProfile.email,
          nome_aluno: userProfile.full_name,
          o_que_enviar: `O pagamento da taxa ${feeType} foi confirmado via Parcelow no valor de ${formattedAmount}. Agora você pode prosseguir com o processo de matrícula.`,
          payment_id: String(parcelowOrder.id),
          fee_type: feeType,
          amount: payment.amount,
          currency: 'USD',
          currency_symbol: '$',
          formatted_amount: formattedAmount,
          payment_method: 'parcelow'
        };

        console.log('[parcelow-webhook] 📧 Enviando notificação para aluno:', userProfile.email);
        
        const alunoNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3'
          },
          body: JSON.stringify(alunoNotificationPayload)
        });

        if (alunoNotificationResponse.ok) {
          console.log('[parcelow-webhook] ✅ Notificação para aluno enviada com sucesso!');
        } else {
          const errorText = await alunoNotificationResponse.text();
          console.error('[parcelow-webhook] ❌ Erro ao enviar notificação para aluno:', errorText);
        }

        // 2. NOTIFICAÇÃO IN-APP PARA ALUNO
        try {
          const { error: inAppError } = await supabase
            .from('student_notifications')
            .insert({
              student_id: userProfile.id,
              title: 'Payment Confirmed',
              message: `Your ${feeType.replace('_', ' ')} has been confirmed. You can now proceed to select your schools.`,
              link: '/student/dashboard/scholarships',
              created_at: new Date().toISOString()
            });

          if (inAppError) {
            console.error('[parcelow-webhook] ❌ Erro ao criar notificação in-app para aluno:', inAppError);
          } else {
            console.log('[parcelow-webhook] ✅ Notificação in-app criada para aluno!');
          }
        } catch (inAppEx) {
          console.error('[parcelow-webhook] ❌ Exceção ao criar notificação in-app:', inAppEx);
        }

        // 3. NOTIFICAÇÕES PARA SELLER/ADMIN/AFFILIATE (se houver seller_referral_code)
        if (userProfile.seller_referral_code) {
          console.log('[parcelow-webhook] 🔍 Buscando seller:', userProfile.seller_referral_code);
          
          const { data: sellerData, error: sellerError } = await supabase
            .from('sellers')
            .select('id, user_id, name, email, referral_code, commission_rate, affiliate_admin_id')
            .eq('referral_code', userProfile.seller_referral_code)
            .single();

          if (sellerData && !sellerError) {
            console.log('[parcelow-webhook] ✅ Seller encontrado:', sellerData.name);

            // Buscar telefone do seller
            const { data: sellerProfile } = await supabase
              .from('user_profiles')
              .select('phone')
              .eq('user_id', sellerData.user_id)
              .single();

            const sellerPhone = sellerProfile?.phone || "";

            // Buscar affiliate admin (se houver)
            let affiliateAdminData = {
              user_id: "",
              email: "",
              name: "Affiliate Admin",
              phone: ""
            };

            if (sellerData.affiliate_admin_id) {
              const { data: affiliateData } = await supabase
                .from('affiliate_admins')
                .select('user_id')
                .eq('id', sellerData.affiliate_admin_id)
                .single();

              if (affiliateData) {
                const { data: affiliateProfile } = await supabase
                  .from('user_profiles')
                  .select('email, full_name, phone')
                  .eq('user_id', affiliateData.user_id)
                  .single();

                if (affiliateProfile) {
                  affiliateAdminData = {
                    user_id: affiliateData.user_id,
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin",
                    phone: affiliateProfile.phone || ""
                  };
                  console.log('[parcelow-webhook] ✅ Affiliate admin encontrado:', affiliateAdminData.name);
                }
              }
            }

            // a) NOTIFICAÇÃO PARA TODOS OS ADMINS
            const adminNotificationPromises = admins.map(async (admin) => {
              const adminNotificationPayload = {
                tipo_notf: feeType === 'selection_process' ? "Student Selection Process Fee Payment" : feeType === 'scholarship_fee' ? "Student Scholarship Fee Payment" : "Student Application Fee Payment",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: userProfile.email,
                nome_aluno: userProfile.full_name,
                o_que_enviar: `Pagamento Parcelow de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code}). Affiliate: ${affiliateAdminData.name}`,
                payment_id: String(parcelowOrder.id),
                fee_type: feeType,
                amount: payment.amount,
                currency: 'USD',
                currency_symbol: '$',
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: 'parcelow',
                notification_type: "admin"
              };

              const adminResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(adminNotificationPayload)
              });

              if (adminResponse.ok) {
                console.log(`[parcelow-webhook] ✅ Notificação enviada para admin ${admin.email}`);
              } else {
                const errorText = await adminResponse.text();
                console.error(`[parcelow-webhook] ❌ Erro ao notificar admin ${admin.email}:`, errorText);
              }

              // Notificação in-app para admin
              if (admin.user_id) {
                try {
                  await supabase.from('admin_notifications').insert({
                    user_id: admin.user_id,
                    title: 'New ' + feeType.replace('_', ' ') + ' Payment',
                    message: `Student ${userProfile.full_name} has paid the ${feeType.replace('_', ' ')} (${formattedAmount}) via Parcelow.`,
                    type: 'payment',
                    link: '/admin/dashboard/payments',
                    metadata: {
                      student_id: userProfile.id,
                      student_name: userProfile.full_name,
                      amount: payment.amount,
                      fee_type: feeType,
                      payment_id: String(parcelowOrder.id)
                    }
                  });
                  console.log(`[parcelow-webhook] ✅ In-app notification criada para admin ${admin.email}`);
                } catch (adminInAppErr) {
                  console.error(`[parcelow-webhook] ❌ Erro ao criar in-app para admin:`, adminInAppErr);
                }
              }
            });

            await Promise.allSettled(adminNotificationPromises);

            // b) NOTIFICAÇÃO PARA SELLER
            const sellerNotificationPayload = {
              tipo_notf: feeType === 'selection_process' ? "Student Selection Process Fee Payment" : feeType === 'scholarship_fee' ? "Student Scholarship Fee Payment" : "Student Application Fee Payment",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: userProfile.email,
              nome_aluno: userProfile.full_name,
              o_que_enviar: `Parabéns! Seu aluno ${userProfile.full_name} pagou a taxa ${feeType} no valor de ${formattedAmount} via Parcelow. Sua comissão será calculada em breve.`,
              payment_id: String(parcelowOrder.id),
              fee_type: feeType,
              amount: payment.amount,
              currency: 'USD',
              currency_symbol: '$',
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: 'parcelow',
              notification_type: "seller"
            };

            const sellerResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(sellerNotificationPayload)
            });

            if (sellerResponse.ok) {
              console.log('[parcelow-webhook] ✅ Notificação enviada para seller!');
            } else {
              const errorText = await sellerResponse.text();
              console.error('[parcelow-webhook] ❌ Erro ao notificar seller:', errorText);
            }

            // Notificação in-app para seller
            if (sellerData.user_id) {
              try {
                await supabase.from('admin_notifications').insert({
                  user_id: sellerData.user_id,
                  title: 'New Commission Potential',
                  message: `Your student ${userProfile.full_name} has paid the ${feeType.replace('_', ' ')} (${formattedAmount}) via Parcelow.`,
                  type: 'payment',
                  link: '/admin/dashboard/users',
                  metadata: {
                    student_id: userProfile.id,
                    student_name: userProfile.full_name,
                    amount: payment.amount,
                    fee_type: feeType,
                    payment_id: String(parcelowOrder.id)
                  }
                });
                console.log('[parcelow-webhook] ✅ In-app notification criada para seller!');
              } catch (sellerInAppErr) {
                console.error('[parcelow-webhook] ❌ Erro ao criar in-app para seller:', sellerInAppErr);
              }
            }

            // c) NOTIFICAÇÃO PARA AFFILIATE ADMIN (se houver)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: feeType === 'selection_process' ? "Student Selection Process Fee Payment" : feeType === 'scholarship_fee' ? "Student Scholarship Fee Payment" : "Student Application Fee Payment",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                email_aluno: userProfile.email,
                nome_aluno: userProfile.full_name,
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                o_que_enviar: `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} via Parcelow.`,
                payment_id: String(parcelowOrder.id),
                fee_type: feeType,
                amount: payment.amount,
                currency: 'USD',
                currency_symbol: '$',
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: 'parcelow',
                notification_type: "affiliate_admin"
              };

              const affiliateResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(affiliateNotificationPayload)
              });

              if (affiliateResponse.ok) {
                console.log('[parcelow-webhook] ✅ Notificação enviada para affiliate admin!');
              } else {
                const errorText = await affiliateResponse.text();
                console.error('[parcelow-webhook] ❌ Erro ao notificar affiliate admin:', errorText);
              }

              // Notificação in-app para affiliate admin
              if (affiliateAdminData.user_id) {
                try {
                  await supabase.from('admin_notifications').insert({
                    user_id: affiliateAdminData.user_id,
                    title: 'Affiliate Payment',
                    message: `A student from your network (${userProfile.full_name}) has paid the ${feeType.replace('_', ' ')} (${formattedAmount}) via Parcelow.`,
                    type: 'payment',
                    link: '/admin/dashboard/affiliate-management',
                    metadata: {
                      student_id: userProfile.id,
                      student_name: userProfile.full_name,
                      amount: payment.amount,
                      fee_type: feeType,
                      payment_id: String(parcelowOrder.id)
                    }
                  });
                  console.log('[parcelow-webhook] ✅ In-app notification criada para affiliate admin!');
                } catch (affiliateInAppErr) {
                  console.error('[parcelow-webhook] ❌ Erro ao criar in-app para affiliate:', affiliateInAppErr);
                }
              }
            }
          } else {
            console.log('[parcelow-webhook] ⚠️ Seller não encontrado, notificando apenas admins');

            // Notificar apenas admins quando não há seller
            const adminNotificationPromises = admins.map(async (admin) => {
              const adminNotificationPayload = {
                tipo_notf: feeType === 'selection_process' ? "Student Selection Process Fee Payment" : feeType === 'scholarship_fee' ? "Student Scholarship Fee Payment" : "Student Application Fee Payment",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: userProfile.email,
                nome_aluno: userProfile.full_name,
                o_que_enviar: `Pagamento Parcelow de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} foi processado com sucesso.`,
                payment_id: String(parcelowOrder.id),
                fee_type: feeType,
                amount: payment.amount,
                currency: 'USD',
                currency_symbol: '$',
                formatted_amount: formattedAmount,
                payment_method: 'parcelow',
                notification_type: 'admin'
              };

              const adminResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(adminNotificationPayload)
              });

              if (adminResponse.ok) {
                console.log(`[parcelow-webhook] ✅ Notificação enviada para admin ${admin.email}`);
              } else {
                const errorText = await adminResponse.text();
                console.error(`[parcelow-webhook] ❌ Erro ao notificar admin ${admin.email}:`, errorText);
              }

              // Notificação in-app para admin
              if (admin.user_id) {
                try {
                  await supabase.from('admin_notifications').insert({
                    user_id: admin.user_id,
                    title: 'New ' + feeType.replace('_', ' ') + ' Payment',
                    message: `Student ${userProfile.full_name} has paid the ${feeType.replace('_', ' ')} (${formattedAmount}) via Parcelow.`,
                    type: 'payment',
                    link: '/admin/dashboard/payments',
                    metadata: {
                      student_id: userProfile.id,
                      student_name: userProfile.full_name,
                      amount: payment.amount,
                      fee_type: feeType,
                      payment_id: String(parcelowOrder.id)
                    }
                  });
                  console.log(`[parcelow-webhook] ✅ In-app notification criada para admin ${admin.email}`);
                } catch (adminInAppErr) {
                  console.error(`[parcelow-webhook] ❌ Erro ao criar in-app para admin:`, adminInAppErr);
                }
              }
            });

            await Promise.allSettled(adminNotificationPromises);
          }
        } else {
          console.log('[parcelow-webhook] ⚠️ Sem seller_referral_code, notificando apenas admins');

          // Notificar apenas admins quando não há seller_referral_code
          const adminNotificationPromises = admins.map(async (admin) => {
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Parcelow de " + feeType + " confirmado - Admin",
              email_admin: admin.email,
              nome_admin: admin.full_name,
              phone_admin: admin.phone,
              email_aluno: userProfile.email,
              nome_aluno: userProfile.full_name,
              o_que_enviar: `Pagamento Parcelow de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} foi processado com sucesso.`,
              payment_id: String(parcelowOrder.id),
              fee_type: feeType,
              amount: payment.amount,
              currency: 'USD',
              currency_symbol: '$',
              formatted_amount: formattedAmount,
              payment_method: 'parcelow',
              notification_type: 'admin'
            };

            const adminResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(adminNotificationPayload)
            });

            if (adminResponse.ok) {
              console.log(`[parcelow-webhook] ✅ Notificação enviada para admin ${admin.email}`);
            } else {
              const errorText = await adminResponse.text();
              console.error(`[parcelow-webhook] ❌ Erro ao notificar admin ${admin.email}:`, errorText);
            }

            // Notificação in-app para admin
            if (admin.user_id) {
              try {
                await supabase.from('admin_notifications').insert({
                  user_id: admin.user_id,
                  title: 'New ' + feeType.replace('_', ' ') + ' Payment',
                  message: `Student ${userProfile.full_name} has paid the ${feeType.replace('_', ' ')} (${formattedAmount}) via Parcelow.`,
                  type: 'payment',
                  link: '/admin/dashboard/payments',
                  metadata: {
                    student_id: userProfile.id,
                    student_name: userProfile.full_name,
                    amount: payment.amount,
                    fee_type: feeType,
                    payment_id: String(parcelowOrder.id)
                  }
                });
                console.log(`[parcelow-webhook] ✅ In-app notification criada para admin ${admin.email}`);
              } catch (adminInAppErr) {
                console.error(`[parcelow-webhook] ❌ Erro ao criar in-app para admin:`, adminInAppErr);
              }
            }
          });

          await Promise.allSettled(adminNotificationPromises);
        }
      } catch (notifError) {
        console.error('[parcelow-webhook] ❌ Erro ao processar notificações:', notifError);
      }

      // 4.11. Criar log final de conclusão
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `${feeType} paid via Parcelow (${parcelowOrder.id}) - Notifications sent`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: feeType,
            payment_method: 'parcelow',
            order_id: String(parcelowOrder.id),
            amount: payment.amount,
            notifications_sent: true
          }
        });
        console.log('[parcelow-webhook] ✅ Log de conclusão criado');
      } catch (logError) {
        console.error('[parcelow-webhook] ❌ Erro ao criar log de conclusão:', logError);
      }

      console.log('[parcelow-webhook] 🎉 Processamento completo finalizado com sucesso!');
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[parcelow-webhook] ❌ Erro geral:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
