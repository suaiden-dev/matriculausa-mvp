import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
// @ts-ignore
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Emails a serem filtrados em ambiente de desenvolvimento
const devBlockedEmails = [
  'luizedmiola@gmail.com',
  'chimentineto@gmail.com',
  'fsuaiden@gmail.com',
  'rayssathefuture@gmail.com',
  'gui.reis@live.com',
  'admin@matriculausa.com'
];

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

    // ✅ MELHORIA: Tentar encontrar uma foto real se o aceite atual tiver mock ou for nulo
    let finalPhotoPath = termAcceptance.identity_photo_path;
    let finalPhotoName = termAcceptance.identity_photo_name;

    if (!finalPhotoPath || finalPhotoPath === 'mock_localhost_photo.png') {
      console.log('[NOTIFICAÇÃO] Foto no aceite atual é nula ou mock. Buscando foto real em outros aceites...');
      const { data: altTerm } = await supabase
        .from('comprehensive_term_acceptance')
        .select('identity_photo_path, identity_photo_name')
        .eq('user_id', userId)
        .not('identity_photo_path', 'is', null)
        .neq('identity_photo_path', '')
        .neq('identity_photo_path', 'mock_localhost_photo.png')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (altTerm) {
        finalPhotoPath = altTerm.identity_photo_path;
        finalPhotoName = altTerm.identity_photo_name;
        console.log('[NOTIFICAÇÃO] ✅ Foto real encontrada em outro aceite:', finalPhotoPath);
      }
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

        // Função para formatar conteúdo HTML do termo (baseada no pdfGenerator.ts)
        const formatTermContent = (content: string): number => {
          const elements: Array<{text: string, type: 'h1' | 'h2' | 'h3' | 'p' | 'strong'}> = [];
          
          // Replace HTML entities first
          let processedHtml = content
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          // Remove HTML tags but preserve line breaks for block elements
          // This ensures that <p>Title</p><p>Text</p> becomes "Title\n\nText"
          const cleanText = processedHtml
            .replace(/<\/p>/g, '\n\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<\/h[1-6]>/g, '\n\n')
            .replace(/<[^>]*>/g, '')
            .trim();
          
          // Split into paragraphs by double line breaks or single line breaks that look like separate items
          const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
          
          paragraphs.forEach((paragraph, paragraphIndex) => {
            const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            lines.forEach((line, lineIndex) => {
              let type: 'h1' | 'h2' | 'h3' | 'p' | 'strong' = 'p';
              
              // Main titles (first line of document or standalone short lines that look like titles)
              if ((paragraphIndex === 0 && lineIndex === 0) || 
                  (lines.length === 1 && line.length < 60 && line.match(/^[A-Z\s]+$/) && !line.match(/^\d+\./))) {
                type = 'h1';
              }
              // Section headers (numbered like "1. Purpose")
              else if (line.match(/^\d+\.\s+[A-Z\s]+/) || line.match(/^\d+\.\s+[A-Z][a-z]+/)) {
                type = 'h2';
              }
              // Subsection headers (lines ending with colon or all caps short lines)
              else if (line.endsWith(':') || (line.match(/^[A-Z\s&/()]{3,}$/) && line.length < 80)) {
                type = 'h3';
              }
              else {
                type = 'p';
              }
              
              elements.push({ text: line, type });
            });
            
            if (paragraphIndex < paragraphs.length - 1) {
              elements.push({ text: '', type: 'p' });
            }
          });

          elements.forEach((element) => {
            if (element.text === '') {
              currentY += 3;
              return;
            }
            
            if (currentY > pdf.internal.pageSize.getHeight() - 30) {
              pdf.addPage();
              currentY = margin;
            }
            
            switch (element.type) {
              case 'h1':
                currentY += 2;
                pdf.setFontSize(13);
                pdf.setFont('helvetica', 'bold');
                currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 13);
                currentY += 2;
                break;
                
              case 'h2':
                currentY += 2;
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 11);
                currentY += 3;
                break;
                
              case 'h3':
              case 'strong':
                currentY += 2;
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 10);
                currentY += 2;
                break;
                
              case 'p':
              default:
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 9);
                currentY += 2;
                break;
            }
          });
          
          return currentY;
        };

        try {
          currentY = formatTermContent(termData.content);
        } catch (error) {
          console.error('[NOTIFICAÇÃO] Erro ao formatar conteúdo do termo:', error);
          // Fallback to simple text
          const fallbackText = termData.content.replace(/<[^>]*>/g, '').substring(0, 3000);
          currentY = addWrappedText(fallbackText, margin, currentY, pageWidth - margin - 20, 9);
        }
        
        currentY += 8;
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }
      
      // Detalhes da aceitação
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      currentY += 5;
      if (currentY > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        currentY = margin;
      }
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
      currentY += 12;
      
      // Incluir foto de identidade (se houver)
      if (finalPhotoPath && finalPhotoPath.trim() !== '') {
        try {
          console.log('[NOTIFICAÇÃO] Foto de identidade para inclusão no PDF:', finalPhotoPath);
          
          if (finalPhotoPath === 'mock_localhost_photo.png') {
             // Fallback informativo para ambiente localhost
             currentY += 10;
             pdf.setFontSize(10);
              pdf.setFont('helvetica', 'italic');
              pdf.text('[Localhost Mock Photo]', margin, currentY);
              currentY += 8;
          } else {
            // Download da foto do Storage
            const { data: imageData, error: imageError } = await supabase.storage
              .from('identity-photos')
              .download(finalPhotoPath);
            
            if (!imageError && imageData) {
              try {
                // Converter para ArrayBuffer e Base64 usando o encoder seguro
                const imageArrayBuffer = await imageData.arrayBuffer();
                const imageBytes = new Uint8Array(imageArrayBuffer);
                const base64Image = base64Encode(imageBytes);
                
                // Determinar formato da imagem
                const fileExtension = finalPhotoPath.split('.').pop()?.toLowerCase() || 'jpg';
                const imageFormat = fileExtension === 'png' ? 'PNG' : 'JPEG';
                const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
                const imageDataUrl = `data:${mimeType};base64,${base64Image}`;
                
                // Adicionar seção de foto com conferência de página
                currentY += 10;
                if (currentY > pdf.internal.pageSize.getHeight() - 40) {
                  pdf.addPage();
                  currentY = margin;
                }
                
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('IDENTITY PHOTO WITH DOCUMENT', margin, currentY);
                currentY += 12;
                
                // Calcular dimensões (limitar largura e altura proporcionalmente)
                const availableWidth = pageWidth - (2 * margin);
                const targetWidth = Math.min(120, availableWidth * 0.9);
                const maxHeightAllowed = 160;
                
                let renderWidth = targetWidth;
                let renderHeight = 0;
                
                try {
                  const props = pdf.getImageProperties(imageDataUrl);
                  const ratio = props.height / props.width;
                  renderHeight = renderWidth * ratio;
                  
                  if (renderHeight > maxHeightAllowed) {
                    renderHeight = maxHeightAllowed;
                    renderWidth = renderHeight / ratio;
                  }
                  
                  if (currentY + renderHeight > pdf.internal.pageSize.getHeight() - margin) {
                    pdf.addPage();
                    currentY = margin;
                  }
                  
                  pdf.addImage(imageDataUrl, imageFormat, margin, currentY, renderWidth, renderHeight, undefined, 'FAST');
                  currentY += renderHeight + 10;
                } catch (pErr) {
                  console.warn('[NOTIFICAÇÃO] Erro ao obter props da imagem, usando fallback:', pErr);
                  renderHeight = renderWidth * 1.33;
                  if (currentY + renderHeight > pdf.internal.pageSize.getHeight() - margin) {
                    pdf.addPage();
                    currentY = margin;
                  }
                  pdf.addImage(imageDataUrl, imageFormat, margin, currentY, renderWidth, renderHeight, undefined, 'FAST');
                  currentY += renderHeight + 10;
                }
                console.log('[NOTIFICAÇÃO] ✅ Foto de identidade incluída no PDF!');
              } catch (convErr) {
                console.error('[NOTIFICAÇÃO] Erro na conversão/processamento da imagem:', convErr);
              }
            } else {
              console.warn('[NOTIFICAÇÃO] Falha ao baixar foto real do storage:', imageError?.message);
            }
          }
        } catch (photoErr) {
          console.error('[NOTIFICAÇÃO] Erro geral ao processar foto:', photoErr);
        }
      }
      
      // Gerar PDF blob
      const pdfArrayBuffer = pdf.output('arraybuffer');
      pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      console.log('[NOTIFICAÇÃO] PDF gerado com sucesso!');
    } catch (pdfError) {
      console.error('[NOTIFICAÇÃO] Erro ao gerar PDF:', pdfError);
      console.warn('[NOTIFICAÇÃO] Continuando sem PDF devido ao erro');
    }
    
    // Filtrar emails em ambiente de desenvolvimento
    let emailAluno = userProfile.email;
    let emailSellerAcceptance = sellerData?.email || "";
    let emailAffiliateAdminAcceptance = affiliateAdminData?.email || "";
    
    if (isDevelopment) {
      if (devBlockedEmails.includes(emailAluno)) {
        console.log(`[NOTIFICAÇÃO] Email de aluno bloqueado em desenvolvimento: ${emailAluno}`);
        emailAluno = "";
      }
      if (emailSellerAcceptance && devBlockedEmails.includes(emailSellerAcceptance)) {
        console.log(`[NOTIFICAÇÃO] Email de seller bloqueado em desenvolvimento: ${emailSellerAcceptance}`);
        emailSellerAcceptance = "";
      }
      if (emailAffiliateAdminAcceptance && devBlockedEmails.includes(emailAffiliateAdminAcceptance)) {
        console.log(`[NOTIFICAÇÃO] Email de affiliate admin bloqueado em desenvolvimento: ${emailAffiliateAdminAcceptance}`);
        emailAffiliateAdminAcceptance = "";
      }
    }

    // Preparar payload de notificação
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_aluno: emailAluno,
      nome_aluno: userProfile.full_name,
      email_seller: emailSellerAcceptance,
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: emailAffiliateAdminAcceptance,
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

Deno.serve(async (req: Request) => {
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
    const event = payload.event;
    const parcelowOrder = payload.order;

    if (!parcelowOrder || !parcelowOrder.id) {
      console.error('[parcelow-webhook] ❌ Payload inválido: falta order.id');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // 1. Identificar userId: primeiro por email do cliente; se não encontrar, por reference/order_id do pedido
    // (Parcelow pode enviar email vinculado ao CPF de outro pagamento fora do sistema)
    const clientEmail = parcelowOrder.client?.email ?? '';
    const reference = parcelowOrder.reference || '';

    let userId: string | null = null;
    let payment: any = null;

    // 1a. Buscar pagamento por order_id ou reference (registro criado no checkout tem o user_id correto)
    const { data: paymentById } = await supabase
      .from('individual_fee_payments')
      .select('*')
      .eq('parcelow_order_id', String(parcelowOrder.id))
      .maybeSingle();

    if (paymentById) {
      payment = paymentById;
      userId = payment.user_id;
    }

    if (!userId && reference) {
      const { data: paymentByRef } = await supabase
        .from('individual_fee_payments')
        .select('*')
        .eq('parcelow_reference', reference)
        .eq('payment_method', 'parcelow')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (paymentByRef) {
        payment = paymentByRef;
        userId = payment.user_id;
        if (!payment.parcelow_order_id || payment.parcelow_order_id !== String(parcelowOrder.id)) {
          await supabase
            .from('individual_fee_payments')
            .update({ parcelow_order_id: String(parcelowOrder.id) })
            .eq('id', payment.id);
        }
      }
    }

    // 1b. Se ainda não temos userId, tentar por email (comportamento original)
    if (!userId && clientEmail) {
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
      if (!authError && authUser?.users) {
        const user = authUser.users.find((u: any) => u.email === clientEmail);
        if (user) userId = user.id;
      }
    }

    if (!userId) {
      console.error('[parcelow-webhook] ❌ Usuário não encontrado (email:', clientEmail, ', reference:', reference, ')');
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Garantir que temos o payment record para este pedido (para eventos que chegam antes do insert)
    if (!payment) {
      const { data: paymentById2 } = await supabase
        .from('individual_fee_payments')
        .select('*')
        .eq('parcelow_order_id', String(parcelowOrder.id))
        .maybeSingle();
      if (paymentById2) payment = paymentById2;
      else if (reference) {
        const { data: paymentByRef2 } = await supabase
          .from('individual_fee_payments')
          .select('*')
          .eq('parcelow_reference', reference)
          .eq('user_id', userId)
          .eq('payment_method', 'parcelow')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (paymentByRef2) {
          payment = paymentByRef2;
          await supabase
            .from('individual_fee_payments')
            .update({ parcelow_order_id: String(parcelowOrder.id) })
            .eq('id', payment.id);
        }
      }
    }

    // 3. Extrair amounts do pedido Parcelow (em centavos USD)
    const netAmount = (parcelowOrder.order_amount || parcelowOrder.net_amount || (parcelowOrder.items?.[0]?.amount)) 
      ? ((parcelowOrder.order_amount || parcelowOrder.net_amount || parcelowOrder.items?.[0]?.amount) / 100) 
      : (payment?.amount || 0);
    
    // O total_usd da Parcelow inclui as taxas cobradas do merchant (nós).
    // Para registrar o valor que o aluno REALMENTE pagou (bruto no checkout),
    // subtraímos a service_tax e merchant_tax do total_usd.
    const rawTotalUsd = parcelowOrder.total_usd || parcelowOrder.totalUsd || parcelowOrder.total_amount_usd || 0;
    const rawGrossAmount = rawTotalUsd ? (rawTotalUsd / 100) : netAmount;
    
    const serviceFee = (
      parcelowOrder.service_tax || 
      parcelowOrder.service_tax_usd || 
      parcelowOrder.service_fee || 
      parcelowOrder.serviceTax || 
      0
    ) / 100;
    
    const merchantFee = (
      parcelowOrder.merchant_tax || 
      parcelowOrder.merchant_tax_usd || 
      parcelowOrder.merchant_fee || 
      parcelowOrder.merchantTax || 
      0
    ) / 100;
    
    // Valor bruto que o aluno viu na tela (Preço + IOF + Taxas de Serviço)
    // Subtraímos apenas as taxas que são custo exclusivo do merchant/plataforma
    const grossAmount = rawTotalUsd 
      ? Number((rawGrossAmount - merchantFee).toFixed(2))
      : netAmount;
      
    const feeAmountUSD = Number(Math.max(0, grossAmount - netAmount).toFixed(2));
    
    // Manter paymentAmount para compatibilidade com o resto do código
    const paymentAmount = netAmount;

    console.log('[parcelow-webhook] 💰 Valores detalhados:', {
      raw_total_usd: rawTotalUsd,
      raw_gross_amount: rawGrossAmount,
      service_fee: serviceFee,
      merchant_fee: merchantFee,
      liquido_final: netAmount,
      bruto_final: grossAmount,
      taxa_aluno: feeAmountUSD,
      order_id: parcelowOrder.id || parcelowOrder.order_id
    });

    // 4. Mapear status
    let newStatus = payment?.parcelow_status || 'pending';
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
      case 'event_order_antifraud_review':
        newStatus = 'processing';
        break;
      case 'event_order_in_review':
        newStatus = 'processing';
        break;
      case 'event_order_confirmed':
        newStatus = 'confirmed';
        console.log('[parcelow-webhook] ✅ Pedido confirmado, aguardando pagamento');
        break;
      case 'event_order_waiting':
      case 'event_order_waiting_payment':
      case 'event_order_waiting_docs':
        newStatus = 'pending';
        break;
      default:
        console.warn('[parcelow-webhook] ⚠️ Evento não mapeado:', event);
        newStatus = 'pending';
    }

    console.log(`[parcelow-webhook] 🔄 Status mapeado: ${newStatus} (isPaid: ${isPaid})`);

    // Determinar fee_type:
    // 1. Pelo registro no banco (mais confiável)
    // 2. Pelo prefixo da reference (resiliência)
    // 3. Pelo metadata (último recurso)
    let feeType = 'unknown';

    if (payment?.fee_type) {
      feeType = payment.fee_type;
      console.log('[parcelow-webhook] 📋 Fee type recuperado do banco de dados:', feeType);
    } else {
      // Tentar detectar pelo prefixo da reference
      if (reference.startsWith('app_fee_') || reference.startsWith('applicatio_') || reference.startsWith('app_') || reference.startsWith('ap_')) {
        feeType = 'application_fee';
      } else if (reference.startsWith('sp_') || reference.startsWith('selection_')) {
        feeType = 'selection_process';
      } else if (reference.startsWith('sf_') || reference.startsWith('scholarship_') || reference.startsWith('scholarshi_')) {
        feeType = 'scholarship_fee';
      } else if (reference.startsWith('i20_')) {
        feeType = 'i20_control';
      } else {
        // Fallback para metadata se existir (Parcelow Sandbox às vezes retorna, Produção raramente)
        const metaFee = parcelowOrder.metadata?.fee_type;
        if (metaFee) {
          if (metaFee === 'application_fee' || metaFee === 'selection_process' || metaFee === 'scholarship_fee' || metaFee === 'i20_control' || metaFee === 'i20_control_fee') {
             // Normalizar para nomes padrão
             if (metaFee === 'i20_control_fee') feeType = 'i20_control';
             else if (metaFee === 'selection_process_fee') feeType = 'selection_process';
             else feeType = metaFee;
          }
        }
      }
    }

    console.log('[parcelow-webhook] 📋 Fee type detectado inicialmente:', feeType);

    // 4. Atualizar ou criar record de pagamento
    if (payment) {
      console.log(`[parcelow-webhook] 🔄 Atualizando payment record: ${payment.parcelow_status} -> ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from('individual_fee_payments')
        .update({
          parcelow_status: newStatus,
          parcelow_checkout_url: parcelowOrder.checkout_url || payment.parcelow_checkout_url,
          payment_date: isPaid ? new Date().toISOString() : payment.payment_date,
          gross_amount_usd: grossAmount,
          fee_amount_usd: feeAmountUSD,
          amount: netAmount // Garantir que o valor líquido está correto
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('[parcelow-webhook] ❌ Erro ao atualizar pagamento:', updateError);
        throw updateError;
      }
      
      console.log('[parcelow-webhook] ✅ Payment record atualizado');
    } else if (isPaid) {
      // Se o pagamento foi confirmado mas o record não existe, criar agora
      console.log('[parcelow-webhook] 📝 Criando payment record (não existia)...');
      
      const { error: insertError } = await supabase
        .from('individual_fee_payments')
        .insert({
          user_id: userId,
          fee_type: feeType !== 'unknown' ? feeType : 'application_fee', // Usa o tipo detectado
          amount: netAmount,
          gross_amount_usd: grossAmount,
          fee_amount_usd: feeAmountUSD,
          payment_date: new Date().toISOString(),
          payment_method: 'parcelow',
          parcelow_order_id: String(parcelowOrder.id),
          parcelow_reference: parcelowOrder.reference,
          parcelow_status: 'paid',
          parcelow_checkout_url: parcelowOrder.checkout_url
        });
      
      if (insertError) {
        console.error('[parcelow-webhook] ❌ Erro ao criar payment record:', insertError);
      } else {
        console.log('[parcelow-webhook] ✅ Payment record criado com sucesso');
      }
    } else {
      console.log('[parcelow-webhook] ⚠️ Payment record não existe e pagamento não foi confirmado ainda');
    }

    // 4.0. Detectar ambiente (dev ou prod) - verificar redirect_success URL
    const redirectUrl = parcelowOrder.redirect_success || '';
    const isDevelopment = 
      redirectUrl.includes('localhost') || 
      redirectUrl.includes('127.0.0.1') || 
      redirectUrl.includes('staging-matriculausa.netlify.app');
    console.log('[parcelow-webhook] 🌍 Ambiente detectado:', isDevelopment ? 'DESENVOLVIMENTO/STAGING' : 'PRODUÇÃO');

    // 5. Se pago, processar lógica completa (igual ao Stripe)
    if (isPaid) {
      console.log('[parcelow-webhook] ✅ Pagamento CONFIRMADO! Processando lógica completa...');
      
      // 4.1. Verificar duplicação de processamento
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
            amount: paymentAmount,
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
              selection_process_fee_payment_method: 'parcelow',
              selection_process_paid_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          
          if (profileUpdateError) {
            console.error('[parcelow-webhook] ❌ Erro ao atualizar perfil:', profileUpdateError);
          } else {
            console.log('[parcelow-webhook] ✅ has_paid_selection_process_fee atualizado!');
          }
          break;

        case 'application':
        case 'application_fee':
          console.log('[parcelow-webhook] 🔄 Processando application_fee...');
          
          // IMPORTANTE: Parcelow NÃO retorna metadata no webhook!
          // Solução: Buscar a aplicação mais recente do usuário que ainda não foi paga
          // (mesmo approach que o Stripe, mas sem depender de metadata)
          
          // Buscar a aplicação mais recente que ainda não foi paga
          const { data: application, error: appFetchError } = await supabase
            .from('scholarship_applications')
            .select('id, student_id, scholarship_id, student_process_type, status')
            .eq('student_id', userProfile.id)
            .eq('is_application_fee_paid', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (appFetchError || !application) {
            console.error('[parcelow-webhook] ❌ Nenhuma aplicação não paga encontrada para o usuário:', userId);
            console.error('[parcelow-webhook] ❌ Error:', appFetchError);
            break;
          }
          
          console.log('[parcelow-webhook] ✅ Aplicação encontrada:', application.id);
          
          // Atualizar a aplicação (mesmo código do Stripe)
          const updateData: any = {
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            is_application_fee_paid: true,
            application_fee_payment_method: 'parcelow'
          };
          
          // Preservar o status atual se já estiver 'approved'
          if (application.status !== 'approved') {
            updateData.status = 'under_review';
            console.log('[parcelow-webhook] ✅ Application status set to under_review');
          } else {
            console.log('[parcelow-webhook] ✅ Preserving approved status');
          }
          
          const { error: appUpdateError } = await supabase
            .from('scholarship_applications')
            .update(updateData)
            .eq('id', application.id)
            .eq('student_id', userProfile.id);
          
          if (appUpdateError) {
            console.error('[parcelow-webhook] ❌ Erro ao atualizar application:', appUpdateError);
          } else {
            console.log('[parcelow-webhook] ✅ Application atualizada com sucesso');
          }

          // Atualizar perfil do usuário por redundância
          await supabase
            .from('user_profiles')
            .update({ 
              is_application_fee_paid: true,
              application_fee_paid_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          break;

        case 'scholarship':
        case 'scholarship_fee':
          console.log('[parcelow-webhook] 🔄 Processando scholarship_fee...');
          
          const scholarshipMetadata = parcelowOrder.metadata || {};
          let scholarshipsIds = scholarshipMetadata.scholarships_ids || scholarshipMetadata.scholarship_id;
          
          if (!scholarshipsIds) {
            console.log('[parcelow-webhook] 🔍 Metadata scholarships_ids não encontrado, buscando aplicação mais recente não paga...');
            const { data: latestApp } = await supabase
              .from('scholarship_applications')
              .select('id, scholarship_id')
              .eq('student_id', userProfile.id)
              .eq('is_scholarship_fee_paid', false)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (latestApp) {
              console.log('[parcelow-webhook] ✅ Aplicação encontrada via busca:', latestApp.id);
              scholarshipsIds = latestApp.scholarship_id;
            }
          }

          if (scholarshipsIds) {
            const idsArray = typeof scholarshipsIds === 'string' 
              ? scholarshipsIds.split(',').map((id: string) => id.trim())
              : (Array.isArray(scholarshipsIds) ? scholarshipsIds : [scholarshipsIds]);
            
            console.log('[parcelow-webhook] 📚 Processando bolsas:', idsArray);
            
            for (const scholarshipId of idsArray) {
              const { error: scholarshipUpdateError } = await supabase
                .from('scholarship_applications')
                .update({ 
                  // Removido status: 'scholarship_fee_paid' pois não é um valor válido na constraint (CHECK status IN ...)
                  is_scholarship_fee_paid: true,
                  scholarship_fee_payment_method: 'parcelow'
                  // nota: scholarship_fee_paid_at não existe nesta tabela, apenas em user_profiles
                })
                .eq('scholarship_id', scholarshipId)
                .eq('student_id', userProfile.id)
                .is('is_scholarship_fee_paid', false); // Só atualizar se não estiver pago
              
              if (scholarshipUpdateError) {
                console.error(`[parcelow-webhook] ❌ Erro ao atualizar scholarship ${scholarshipId}:`, scholarshipUpdateError);
              } else {
                console.log(`[parcelow-webhook] ✅ Scholarship ${scholarshipId} atualizada`);
              }
            }
          } else {
            console.error('[parcelow-webhook] ❌ Nenhum ID de bolsa encontrado para processar');
          }

          // Atualizar perfil do usuário por redundância
          await supabase
            .from('user_profiles')
            .update({ 
              is_scholarship_fee_paid: true,
              scholarship_fee_paid_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          break;

        case 'i20_control':
        case 'i20_control_fee':
          console.log('[parcelow-webhook] 🔄 Processando i20_control_fee...');
          
          const { error: i20UpdateError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_i20_control_fee: true,
              i20_control_fee_payment_method: 'parcelow',
              i20_paid_at: new Date().toISOString()
            })
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

      // 4.4. Processar notificações de recompensa (MatriculaCoins) apenas para I20
      // Nota: A lógica de crédito de moedas e atualização de status do referral 
      // agora é gerenciada pelo trigger 'handle_i20_payment_rewards' no banco de dados.
      // Aqui apenas enviamos a notificação para o padrinho.
      if (feeType === 'i20_control' || feeType === 'i20_control_fee') {
        try {
          const { data: usedCode, error: usedError } = await supabase
            .from('used_referral_codes')
            .select('*')
            .eq('user_id', userId)
            .order('applied_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!usedError && usedCode && usedCode.referrer_id) {
            const referrerId = usedCode.referrer_id;
            console.log('[parcelow-webhook] 🎁 Enviando notificação de recompensa para o padrinho...');

            const { data: referrerProfile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', referrerId)
              .single();

            if (referrerProfile?.email) {
              let emailReferrerFinal = referrerProfile.email;
              if (isDevelopment && devBlockedEmails.includes(emailReferrerFinal)) {
                console.log('[parcelow-webhook] 🚫 Email de padrinho bloqueado em desenvolvimento:', emailReferrerFinal);
                emailReferrerFinal = "";
              }

              if (emailReferrerFinal) {
                let referredDisplayName = userProfile.full_name || userId;
                
                const rewardPayload = {
                  tipo_notf: "Recompensa de MatriculaCoins por Indicacao",
                  email_aluno: emailReferrerFinal,
                  nome_aluno: referrerProfile.full_name || "Aluno",
                  referred_student_name: referredDisplayName,
                  referred_student_email: userProfile.email || "",
                  payment_method: "parcelow",
                  fee_type: "I20 Control Fee",
                  reward_type: "MatriculaCoins",
                  o_que_enviar: `Congratulations! Your friend ${referredDisplayName} has completed the I20 payment. 180 MatriculaCoins have been added to your account!`
                };

                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(rewardPayload),
                });
                console.log('✅ [parcelow-webhook] Notificação de recompensa enviada!');
              }
            }
          }
        } catch (rewardError) {
          console.error('[parcelow-webhook] ❌ Erro ao processar recompensas de referência:', rewardError);
        }
      } else {
        console.log(`[parcelow-webhook] ℹ️ Recompensas ignoradas para fee_type: ${feeType} (recompensas são vinculadas apenas ao I20)`);
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
            amount: paymentAmount,
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

        const formattedAmount = formatAmountWithCurrency(paymentAmount, 'USD');

        // 1. NOTIFICAÇÃO PARA O ALUNO
        // Define tipo_notf baseado no fee_type para consistência com Stripe
        let tipoNotfAluno = 'Pagamento de ' + feeType + ' confirmado';
        if (feeType === 'scholarship_fee') {
          tipoNotfAluno = 'Pagamento de taxa de bolsa confirmado';
        } else if (feeType === 'i20_control' || feeType === 'i20_control_fee') {
          tipoNotfAluno = 'Pagamento de I-20 control fee confirmado';
        } else if (feeType === 'application_fee' || feeType === 'application') {
          tipoNotfAluno = 'Novo pagamento de application fee';
        }
        
        let emailAlunoFinal = userProfile.email;
        if (isDevelopment && devBlockedEmails.includes(emailAlunoFinal)) {
          console.log('[parcelow-webhook] 🚫 Email de aluno bloqueado em desenvolvimento:', emailAlunoFinal);
          emailAlunoFinal = "";
        }

        const alunoNotificationPayload = {
          tipo_notf: tipoNotfAluno,
          email_aluno: emailAlunoFinal,
          nome_aluno: userProfile.full_name,
          o_que_enviar: `O pagamento da taxa ${feeType} foi confirmado via Parcelow no valor de ${formattedAmount}. Agora você pode prosseguir com o processo de matrícula.`,
          payment_id: String(parcelowOrder.id),
          fee_type: feeType,
          amount: paymentAmount,
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
              // Define tipo_notf para admin baseado no fee_type
              let tipoNotfAdmin = `Pagamento Parcelow de ${feeType} confirmado - Admin`;
              if (feeType === 'scholarship_fee') {
                tipoNotfAdmin = 'Pagamento Parcelow de scholarship_fee confirmado - Admin';
              } else if (feeType === 'i20_control' || feeType === 'i20_control_fee') {
                tipoNotfAdmin = 'Pagamento Parcelow de i20_control_fee confirmado - Admin';
              } else if (feeType === 'application_fee' || feeType === 'application') {
                tipoNotfAdmin = 'Pagamento Parcelow de application_fee confirmado - Admin';
              } else if (feeType === 'selection_process') {
                tipoNotfAdmin = 'Pagamento Parcelow de selection_process confirmado - Admin';
              }
              
              const adminNotificationPayload = {
                tipo_notf: tipoNotfAdmin,
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: userProfile.email,
                nome_aluno: userProfile.full_name,
                o_que_enviar: `Pagamento Parcelow de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code}). Affiliate: ${affiliateAdminData.name}`,
                payment_id: String(parcelowOrder.id),
                fee_type: feeType,
                amount: paymentAmount,
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
                      amount: paymentAmount,
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
            // Define tipo_notf para seller baseado no fee_type
            let tipoNotfSeller = `Pagamento Parcelow de ${feeType} confirmado - Seller`;
            let oQueEnviarSeller = `Parabéns! Seu aluno ${userProfile.full_name} pagou a taxa ${feeType} no valor de ${formattedAmount} via Parcelow. Sua comissão será calculada em breve.`;

            if (feeType === 'scholarship_fee') {
              tipoNotfSeller = 'Pagamento Parcelow de scholarship_fee confirmado - Seller';
            } else if (feeType === 'i20_control' || feeType === 'i20_control_fee') {
              tipoNotfSeller = "Pagamento Parcelow de I-20 Control Fee confirmado - Seller";
              oQueEnviarSeller = `Parabéns! Seu aluno ${userProfile.full_name} pagou a taxa I-20 Control Fee no valor de ${formattedAmount} via Parcelow. Sua comissão será calculada em breve.`;
            } else if (feeType === 'application_fee' || feeType === 'application') {
              tipoNotfSeller = 'Pagamento Parcelow de application_fee confirmado - Seller';
            } else if (feeType === 'selection_process') {
              tipoNotfSeller = 'Pagamento Parcelow de selection_process confirmado - Seller';
            }
            
            let emailSellerFinal = sellerData.email;
            if (isDevelopment && devBlockedEmails.includes(emailSellerFinal)) {
              console.log('[parcelow-webhook] 🚫 Email de seller bloqueado em desenvolvimento:', emailSellerFinal);
              emailSellerFinal = "";
            }

            const sellerNotificationPayload = {
              tipo_notf: tipoNotfSeller,
              email_seller: emailSellerFinal,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: userProfile.email,
              nome_aluno: userProfile.full_name,
              o_que_enviar: oQueEnviarSeller,
              payment_id: String(parcelowOrder.id),
              fee_type: feeType,
              amount: paymentAmount,
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
                    amount: paymentAmount,
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
              // Define tipo_notf para affiliate admin baseado no fee_type
              let tipoNotfAffiliate = `Pagamento Parcelow de ${feeType} confirmado - Affiliate Admin`;
              let oQueEnviarAffiliate = `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} via Parcelow.`;

              if (feeType === 'scholarship_fee') {
                tipoNotfAffiliate = 'Pagamento Parcelow de scholarship_fee confirmado - Affiliate Admin';
              } else if (feeType === 'i20_control' || feeType === 'i20_control_fee') {
                tipoNotfAffiliate = "Pagamento Parcelow de I-20 Control Fee confirmado - Affiliate Admin";
                oQueEnviarAffiliate = `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de I-20 Control Fee no valor de ${formattedAmount} do aluno ${userProfile.full_name} via Parcelow.`;
              } else if (feeType === 'application_fee' || feeType === 'application') {
                tipoNotfAffiliate = 'Pagamento Parcelow de application_fee confirmado - Affiliate Admin';
              } else if (feeType === 'selection_process') {
                tipoNotfAffiliate = 'Pagamento Parcelow de selection_process confirmado - Affiliate Admin';
              }
              
              let emailAffiliateFinal = affiliateAdminData.email;
              if (isDevelopment && devBlockedEmails.includes(emailAffiliateFinal)) {
                console.log('[parcelow-webhook] 🚫 Email de affiliate admin bloqueado em desenvolvimento:', emailAffiliateFinal);
                emailAffiliateFinal = "";
              }

              const affiliateNotificationPayload = {
                tipo_notf: tipoNotfAffiliate,
                email_affiliate_admin: emailAffiliateFinal,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                email_aluno: userProfile.email,
                nome_aluno: userProfile.full_name,
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                o_que_enviar: `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de ${feeType} no valor de ${formattedAmount} do aluno ${userProfile.full_name} via Parcelow.`,
                payment_id: String(parcelowOrder.id),
                fee_type: feeType,
                amount: paymentAmount,
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
                      amount: paymentAmount,
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
                amount: paymentAmount,
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
                      amount: paymentAmount,
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
              amount: paymentAmount,
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
                    amount: paymentAmount,
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
            amount: paymentAmount,
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
