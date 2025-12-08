import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Import jsPDF for Deno environment
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Emails a serem filtrados em ambiente de desenvolvimento
const devBlockedEmails = [
  'luizedmiola@gmail.com',
  'chimentineto@gmail.com',
  'fsuaiden@gmail.com',
  'rayssathefuture@gmail.com',
  'gui.reis@live.com',
  'admin@matriculausa.com'
];

// Function to send term acceptance notification with PDF after successful payment
async function sendTermAcceptanceNotificationAfterPayment(userId: string, feeType: string) {
  try {
    console.log('[NOTIFICAÇÃO] Buscando dados do usuário para notificação...');
    
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, country, seller_referral_code')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:', userError);
      return;
    }

    // Get the most recent term acceptance for this user (incluindo foto de identidade)
    // ✅ BACKWARD COMPATIBLE: Campos identity_photo_path e identity_photo_name são opcionais
    // Se não existirem na tabela (produção antiga), serão null e o PDF será gerado sem foto
    const { data: termAcceptance, error: termError } = await supabase
      .from('comprehensive_term_acceptance')
      .select('term_id, accepted_at, ip_address, user_agent, identity_photo_path, identity_photo_name')
      .eq('user_id', userId)
      .eq('term_type', 'checkout_terms')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // ✅ Usar maybeSingle() para não falhar se não houver registro

    if (termError) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:', termError);
      return;
    }
    
    if (!termAcceptance) {
      console.warn('[NOTIFICAÇÃO] Nenhuma aceitação de termos encontrada para o usuário');
      return;
    }

    // Get term content
    const { data: termData, error: termDataError } = await supabase
      .from('application_terms')
      .select('title, content')
      .eq('id', termAcceptance.term_id)
      .single();

    if (termDataError || !termData) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:', termDataError);
      return;
    }

    // Get seller data if user has seller_referral_code
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

    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase
        .from('affiliate_admins')
        .select('full_name, email')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      
      if (affiliateResult) {
        affiliateAdminData = affiliateResult;
      }
    }

    // Generate PDF for the term acceptance (SEM conteúdo do termo, apenas foto)
    let pdfBlob: Blob | null = null;
    try {
      console.log('[NOTIFICAÇÃO] Gerando PDF para notificação (sem conteúdo do termo, apenas foto)...');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = margin;
      
      // Function to add wrapped text
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 12) => {
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
      
      // PDF Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM ACCEPTANCE DOCUMENT', pageWidth / 2, currentY, {
        align: 'center'
      });
      currentY += 15;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, {
        align: 'center'
      });
      currentY += 20;
      
      // Separator line
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // Student Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('STUDENT INFORMATION', margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      // Name
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(userProfile.full_name, margin + 30, currentY);
      currentY += 8;
      
      // Email
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(userProfile.email, margin + 30, currentY);
      currentY += 8;
      
      // Country
      if (userProfile.country) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Country:', margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(userProfile.country, margin + 40, currentY);
        currentY += 8;
      }
      currentY += 5;
      // Separator line
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // ✅ TERM CONTENT SECTION
      if (termData.content && termData.content.trim() !== '') {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TERM CONTENT', margin, currentY);
        currentY += 12;
        
        // Função para formatar conteúdo HTML do termo (igual ao pdfGenerator.ts)
        const formatTermContent = (content: string): number => {
          // Parse HTML content
          const parseHtmlContent = (html: string) => {
            const elements: Array<{text: string, type: 'h1' | 'h2' | 'h3' | 'p' | 'strong'}> = [];
            
            // Replace HTML entities first
            let processedHtml = html
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            
            // Remove HTML tags completely and work with plain text
            const cleanText = processedHtml.replace(/<[^>]*>/g, '').trim();
            
            // Split into paragraphs by double line breaks, then by single line breaks
            const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
            
            paragraphs.forEach((paragraph, paragraphIndex) => {
              const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
              
              lines.forEach((line, lineIndex) => {
                let type: 'h1' | 'h2' | 'h3' | 'p' | 'strong' = 'p';
                
                // Main titles (first line of document or standalone short lines that look like titles)
                if ((paragraphIndex === 0 && lineIndex === 0) || 
                    (lines.length === 1 && line.length < 60 && line.match(/^[A-Z]/) && !line.match(/^\d+\./))) {
                  type = 'h1';
                }
                // Section headers (numbered like "1. Purpose")
                else if (line.match(/^\d+\.\s+[A-Za-z]/)) {
                  type = 'h2';
                }
                // Subsection headers (lines ending with colon or all caps short lines)
                else if (line.endsWith(':') || (line.match(/^[A-Z\s&/()]{3,}$/) && line.length < 80)) {
                  type = 'h3';
                }
                // Everything else is paragraph content
                else {
                  type = 'p';
                }
                
                elements.push({ text: line, type });
              });
              
              // Add spacing between paragraphs
              if (paragraphIndex < paragraphs.length - 1) {
                elements.push({ text: '', type: 'p' });
              }
            });
            
            return elements;
          };
          
          const elements = parseHtmlContent(content);
          
          elements.forEach((element) => {
            // Skip empty elements but add small spacing
            if (element.text === '') {
              currentY += 3;
              return;
            }
            
            // Check if we need a new page
            if (currentY > pdf.internal.pageSize.getHeight() - 40) {
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
                currentY += 3;
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
          
          return currentY + 3;
        };
        
        try {
          currentY = formatTermContent(termData.content);
          currentY += 5; // Espaço extra após o conteúdo
        } catch (error) {
          console.error('[NOTIFICAÇÃO] Erro ao formatar conteúdo do termo:', error);
          // Fallback to simple text if formatting fails
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          let plainTextContent = termData.content
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
          const termContent = plainTextContent.length > maxTermContentLength 
            ? plainTextContent.substring(0, maxTermContentLength) + '...'
            : plainTextContent;
          
          currentY = addWrappedText(termContent, margin, currentY, pageWidth - margin - 20, 10);
          currentY += 8;
        }
        
        // Separator line
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }
      
      // Term Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM ACCEPTANCE DETAILS', margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      // Term Title
      pdf.setFont('helvetica', 'bold');
      pdf.text('Term Title:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY = addWrappedText(termData.title, margin + 50, currentY, pageWidth - margin - 50, 11);
      currentY += 5;
      
      // Acceptance Date
      pdf.setFont('helvetica', 'bold');
      pdf.text('Accepted At:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(termAcceptance.accepted_at).toLocaleString(), margin + 50, currentY);
      currentY += 8;
      
      // IP Address
      pdf.setFont('helvetica', 'bold');
      pdf.text('IP Address:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(termAcceptance.ip_address || 'N/A', margin + 50, currentY);
      currentY += 10;
      
      // ✅ Identity Photo Section (se houver foto) - SEM conteúdo do termo
      // BACKWARD COMPATIBLE: Em produção (sem frontend atualizado), identity_photo_path será null e esta seção será pulada
      if (termAcceptance.identity_photo_path && termAcceptance.identity_photo_path.trim() !== '') {
        try {
          console.log('[NOTIFICAÇÃO] Foto de identidade encontrada, incluindo no PDF:', termAcceptance.identity_photo_path);
          
          // Verificar se precisa de nova página
          const pageHeight = pdf.internal.pageSize.getHeight();
          if (currentY > pageHeight - margin - 80) {
            pdf.addPage();
            currentY = margin;
          }
          
          // Download da foto do Storage (bucket privado)
          const { data: imageData, error: imageError } = await supabase.storage
            .from('identity-photos')
            .download(termAcceptance.identity_photo_path);
          
          if (!imageError && imageData) {
            try {
              // Converter para ArrayBuffer
              const imageArrayBuffer = await imageData.arrayBuffer();
              const imageBytes = new Uint8Array(imageArrayBuffer);
              
              // Converter para base64 (compatível com Deno)
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
              
              // Adicionar seção de foto de identidade
              currentY += 10;
              pdf.setFontSize(14);
              pdf.setFont('helvetica', 'bold');
              pdf.text('IDENTITY PHOTO WITH DOCUMENT', margin, currentY);
              currentY += 12;
              
              // ✅ Calcular dimensões da imagem mantendo proporção correta
              const maxWidth = 120; // mm
              const maxHeight = 160; // mm
              const availableWidth = pageWidth - (2 * margin);
              
              // Converter mm para unidades do PDF
              const maxWidthUnits = maxWidth * 0.264583;
              const maxHeightUnits = maxHeight * 0.264583;
              const imageWidth = Math.min(maxWidthUnits, availableWidth * 0.9); // 90% da largura disponível
              
              // Tentar obter dimensões reais da imagem usando getImageProperties
              let finalWidth = imageWidth;
              let finalHeight = 0;
              
              try {
                const imgProps = pdf.getImageProperties(imageDataUrl);
                const imgWidth = imgProps.width;
                const imgHeight = imgProps.height;
                const aspectRatio = imgHeight / imgWidth;
                
                // Calcular altura baseada na largura e proporção real
                finalHeight = imageWidth * aspectRatio;
                
                // Se a altura exceder o máximo, ajustar pela altura
                if (finalHeight > maxHeightUnits) {
                  finalHeight = maxHeightUnits;
                  finalWidth = finalHeight / aspectRatio;
                }
                
                // Adicionar imagem com dimensões calculadas mantendo proporção
                pdf.addImage(
                  imageDataUrl,
                  imageFormat,
                  margin,
                  currentY,
                  finalWidth,
                  finalHeight,
                  undefined,
                  'FAST'
                );
                
                currentY += finalHeight + 10;
              } catch (propError) {
                // Fallback: usar proporção estimada (assumir 3:4 para selfies verticais)
                console.warn('[NOTIFICAÇÃO] Não foi possível obter dimensões da imagem, usando proporção estimada:', propError);
                finalHeight = imageWidth * 1.33; // Proporção 3:4
                
                pdf.addImage(
                  imageDataUrl,
                  imageFormat,
                  margin,
                  currentY,
                  finalWidth,
                  finalHeight,
                  undefined,
                  'FAST'
                );
                
                currentY += finalHeight + 10;
              }
              
              console.log('[NOTIFICAÇÃO] ✅ Foto de identidade incluída no PDF com sucesso!');
            } catch (conversionError) {
              console.error('[NOTIFICAÇÃO] Erro ao converter foto para base64:', conversionError);
              // Continuar sem foto - não quebrar o fluxo
            }
          } else {
            console.warn('[NOTIFICAÇÃO] Erro ao carregar foto de identidade do Storage:', imageError?.message || 'Unknown error');
            // ✅ BACKWARD COMPATIBLE: Continuar sem foto - não quebrar o PDF
          }
        } catch (photoError) {
          console.error('[NOTIFICAÇÃO] Erro ao processar foto de identidade:', photoError);
          // ✅ BACKWARD COMPATIBLE: Continuar sem foto - não quebrar o PDF
        }
      } else {
        // ✅ BACKWARD COMPATIBLE: Sem foto (produção antiga ou usuário não fez upload)
        console.log('[NOTIFICAÇÃO] Nenhuma foto de identidade encontrada - gerando PDF sem foto (comportamento normal para produção)');
      }
      
      // Generate PDF blob
      const pdfArrayBuffer = pdf.output('arraybuffer');
      pdfBlob = new Blob([pdfArrayBuffer], {
        type: 'application/pdf'
      });
      console.log('[NOTIFICAÇÃO] PDF gerado com sucesso!');
    } catch (pdfError) {
      console.error('[NOTIFICAÇÃO] Erro ao gerar PDF:', pdfError);
      // Continue without PDF but log the error
      console.warn('[NOTIFICAÇÃO] Continuando sem PDF devido ao erro na geração');
      // Don't throw error to avoid breaking the payment process
    }

    // Detectar ambiente de desenvolvimento
    // Verificar se está em ambiente de teste/desenvolvimento
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'test' || 
                          Deno.env.get('ENVIRONMENT') === 'development' ||
                          supabaseUrl.includes('localhost') ||
                          supabaseUrl.includes('127.0.0.1') ||
                          supabaseUrl.includes('.supabase.co') && supabaseUrl.includes('test');
    
    // Filtrar emails em ambiente de desenvolvimento
    let emailSeller = sellerData?.email || "";
    let emailAffiliateAdmin = affiliateAdminData?.email || "";
    
    if (isDevelopment) {
      if (devBlockedEmails.includes(emailSeller)) {
        console.log(`[NOTIFICAÇÃO] Email de seller bloqueado em desenvolvimento: ${emailSeller}`);
        emailSeller = "";
      }
      if (devBlockedEmails.includes(emailAffiliateAdmin)) {
        console.log(`[NOTIFICAÇÃO] Email de affiliate admin bloqueado em desenvolvimento: ${emailAffiliateAdmin}`);
        emailAffiliateAdmin = "";
      }
    }
    
    // Prepare notification payload
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: emailSeller,
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: emailAffiliateAdmin,
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment via Zelle. This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address || "",
      student_country: userProfile.country || "",
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || ""
    };

    console.log('[NOTIFICAÇÃO] Enviando webhook com payload:', webhookPayload);

    // Send webhook notification
    let webhookResponse;
    if (pdfBlob) {
      // Send webhook notification with PDF
      const formData = new FormData();
      
      // Add each field individually for n8n to process correctly
      Object.entries(webhookPayload).forEach(([key, value]) => {
        formData.append(key, value !== null && value !== undefined ? value.toString() : '');
      });
      
      // Add PDF with descriptive filename
      const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      formData.append('pdf', pdfBlob, fileName);
      console.log('[NOTIFICAÇÃO] PDF anexado à notificação:', fileName);
      
      webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        body: formData,
      });
    } else {
      // Send webhook notification without PDF
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
      console.log('[NOTIFICAÇÃO] Notificação enviada com sucesso!');
    } else {
      const errorText = await webhookResponse.text();
      console.warn('[NOTIFICAÇÃO] Erro ao enviar notificação:', webhookResponse.status, errorText);
    }

  } catch (error) {
    console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:', error);
    // Don't throw error to avoid breaking the payment process
  }
}

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const {
      payment_id,
      valid,
      reason,
      validation_details,
      metadata = {}
    } = await req.json();

    // Validar parâmetros obrigatórios
    if (!payment_id || typeof valid !== 'boolean') {
      return corsResponse({ 
        error: 'Missing required fields: payment_id, valid' 
      }, 400);
    }

    console.log('[validate-zelle-payment-result] Processing validation result for payment:', payment_id, 'Valid:', valid);

    // Buscar o pagamento
    const { data: payment, error: fetchError } = await supabase
      .from('zelle_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      console.error('[validate-zelle-payment-result] Payment not found:', payment_id);
      return corsResponse({ error: 'Payment not found' }, 404);
    }

    // Atualizar status do pagamento
    const newStatus = valid ? 'verified' : 'rejected';
    const { error: updateError } = await supabase
      .from('zelle_payments')
      .update({
        status: newStatus,
        admin_notes: reason || (valid ? 'Automatically verified by n8n' : 'Automatically rejected by n8n'),
        verified_at: valid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          validation_result: {
            valid,
            reason,
            validation_details,
            validated_at: new Date().toISOString(),
            ...metadata
          }
        }
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('[validate-zelle-payment-result] Error updating payment status:', updateError);
      return corsResponse({ error: 'Failed to update payment status' }, 500);
    }

    // Se o pagamento foi validado, atualizar o sistema automaticamente
    if (valid) {
      console.log('[validate-zelle-payment-result] Payment validated, updating system...');
      
      try {
        // Atualizar perfil do usuário baseado no tipo de taxa
        if (payment.fee_type === 'scholarship_fee') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              is_scholarship_fee_paid: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for scholarship fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for scholarship fee');
            
            // Note: Term acceptance notification with PDF is only sent for selection_process_fee
          }
        }

        // Se for application_fee, criar ou atualizar aplicação
        if (payment.fee_type === 'application_fee' && payment.metadata?.scholarships_ids) {
          const scholarshipsIds = payment.metadata.scholarships_ids;
          const scholarshipId = Array.isArray(scholarshipsIds) ? scholarshipsIds[0] : scholarshipsIds;
          
          // Verificar se já existe uma aplicação
          const { data: existingApp, error: findError } = await supabase
            .from('scholarship_applications')
            .select('id, status')
            .eq('student_id', payment.user_id)
            .eq('scholarship_id', scholarshipId)
            .single();

          if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('[validate-zelle-payment-result] Error finding existing application:', findError);
          } else if (existingApp) {
            // Atualizar aplicação existente - preservar status 'approved' se já estiver
            const updateData: any = { 
              updated_at: new Date().toISOString()
            };
            
            // Só mudar status se não estiver 'approved' (universidade já aprovou)
            if (existingApp.status !== 'approved') {
              updateData.status = 'under_review'; // Status válido conforme constraint
            }
            
            const { error: updateAppError } = await supabase
              .from('scholarship_applications')
              .update(updateData)
              .eq('id', existingApp.id);

            if (updateAppError) {
              console.error('[validate-zelle-payment-result] Error updating application:', updateAppError);
            } else {
              console.log('[validate-zelle-payment-result] Application updated for application fee');
            }
          } else {
            // Criar nova aplicação
            const { error: createAppError } = await supabase
              .from('scholarship_applications')
              .insert({
                student_id: payment.user_id,
                scholarship_id: scholarshipId,
                status: 'under_review', // Nova aplicação sempre começa com este status
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (createAppError) {
              console.error('[validate-zelle-payment-result] Error creating application:', createAppError);
            } else {
              console.log('[validate-zelle-payment-result] New application created for application fee');
            }
          }
        }

        // Se for selection_process, atualizar perfil do usuário
        if (payment.fee_type === 'selection_process') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_selection_process_fee: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for selection process fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for selection process fee');
            
            // Send term acceptance notification with PDF after successful payment
            try {
              console.log('[NOTIFICAÇÃO] Enviando notificação de aceitação de termos com PDF após pagamento Zelle bem-sucedido...');
              await sendTermAcceptanceNotificationAfterPayment(payment.user_id, 'selection_process');
              console.log('[NOTIFICAÇÃO] Notificação enviada com sucesso');
            } catch (notificationError) {
              console.error('[NOTIFICAÇÃO] Erro ao enviar notificação:', notificationError);
              // Don't fail the payment processing if notification fails
            }
          }
        }

        // Se for enrollment_fee, atualizar perfil do usuário
        if (payment.fee_type === 'enrollment_fee') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_college_enrollment_fee: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for enrollment fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for enrollment fee');
            
            // Note: Term acceptance notification with PDF is only sent for selection_process_fee
          }
        }

        // Se for i20_control, atualizar perfil do usuário
        if (payment.fee_type === 'i20_control' || payment.fee_type === 'i-20_control_fee') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_i20_control_fee: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for i20 control fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for i20 control fee');
            
            // Note: Term acceptance notification with PDF is only sent for selection_process_fee
          }
        }

        // Enviar notificação para universidade se for application_fee
        if (payment.fee_type === 'application_fee' && payment.metadata?.scholarships_ids) {
          try {
            console.log('[validate-zelle-payment-result] Sending notification to university for application fee payment...');
            
            // Buscar dados do aluno
            const { data: alunoData, error: alunoError } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', payment.user_id)
              .single();
            
            if (alunoError || !alunoData) {
              console.warn('[validate-zelle-payment-result] Student not found for notification:', alunoError);
            } else {
              const scholarshipsIds = payment.metadata.scholarships_ids;
              const scholarshipId = Array.isArray(scholarshipsIds) ? scholarshipsIds[0] : scholarshipsIds;
              
              // Buscar dados da bolsa
              const { data: scholarship, error: scholarshipError } = await supabase
                .from('scholarships')
                .select('title, university_id')
                .eq('id', scholarshipId)
                .single();
              
              if (!scholarshipError && scholarship) {
                // Buscar dados da universidade
                const { data: universidade, error: univError } = await supabase
                  .from('universities')
                  .select('name, contact')
                  .eq('id', scholarship.university_id)
                  .single();
                
                if (!univError && universidade) {
                  const contact = universidade.contact || {};
                  const emailUniversidade = contact.admissionsEmail || contact.email || '';
                  
                  // Montar mensagem para n8n
                  const mensagem = `O aluno ${alunoData.full_name} pagou a taxa de aplicação de $${payment.amount} via Zelle para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Acesse o painel para revisar a candidatura.`;
                  const payload = {
                    tipo_notf: 'Novo pagamento de application fee',
                    email_aluno: alunoData.email,
                    nome_aluno: alunoData.full_name,
                    nome_bolsa: scholarship.title,
                    nome_universidade: universidade.name,
                    email_universidade: emailUniversidade,
                    o_que_enviar: mensagem,
                  };
                  
                  console.log('[validate-zelle-payment-result] Sending webhook to n8n:', payload);
                  
                  // Enviar para o n8n
                  const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Agent': 'PostmanRuntime/7.36.3',
                    },
                    body: JSON.stringify(payload),
                  });
                  
                  const n8nText = await n8nRes.text();
                  console.log('[validate-zelle-payment-result] N8n response:', n8nRes.status, n8nText);
                } else {
                  console.warn('[validate-zelle-payment-result] University not found for notification:', univError);
                }
              } else {
                console.warn('[validate-zelle-payment-result] Scholarship not found for notification:', scholarshipError);
              }
            }
          } catch (notifError) {
            console.error('[validate-zelle-payment-result] Error sending notification to university:', notifError);
            // Não falhar o processo se a notificação falhar
          }
        }

        console.log('[validate-zelle-payment-result] System updated successfully for validated payment');
        
        // Chamar approve-zelle-payment-automatic para enviar emails via webhook
        try {
          console.log('[validate-zelle-payment-result] Chamando approve-zelle-payment-automatic para enviar emails...');
          
          // Preparar dados para approve-zelle-payment-automatic
          const feeTypeGlobal = payment.fee_type_global || payment.fee_type;
          const scholarshipIds = payment.metadata?.scholarships_ids || null;
          
          const approveResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/approve-zelle-payment-automatic`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              user_id: payment.user_id,
              fee_type_global: feeTypeGlobal,
              temp_payment_id: payment.id,
              scholarship_ids: scholarshipIds
            })
          });

          if (approveResponse.ok) {
            const approveResult = await approveResponse.json();
            console.log('[validate-zelle-payment-result] ✅ approve-zelle-payment-automatic executado com sucesso:', approveResult);
          } else {
            const errorText = await approveResponse.text();
            console.error('[validate-zelle-payment-result] ❌ Erro ao chamar approve-zelle-payment-automatic:', approveResponse.status, errorText);
          }
        } catch (approveError) {
          console.error('[validate-zelle-payment-result] ❌ Erro ao chamar approve-zelle-payment-automatic:', approveError);
          // Não falhar o processo se a chamada falhar
        }
      } catch (error) {
        console.error('[validate-zelle-payment-result] Error updating system:', error);
        // Não falhar o processo se não conseguir atualizar o sistema
      }
    }

    console.log('[validate-zelle-payment-result] Validation result processed successfully');

    return corsResponse({ 
      success: true,
      payment_id: payment_id,
      status: newStatus,
      message: `Payment ${newStatus} automatically by n8n`
    }, 200);

  } catch (error) {
    console.error('[validate-zelle-payment-result] Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
