import { supabase } from '../../../../../lib/supabase';
import jsPDF from 'jspdf';

export async function sendTermAcceptanceNotificationAfterPayment(userId: string, feeType: string) {
  try {
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, country, seller_referral_code')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) return;

    // Get the most recent term acceptance for this user (incluindo foto de identidade)
    const { data: termAcceptance, error: termError } = await supabase
      .from('comprehensive_term_acceptance')
      .select('term_id, accepted_at, ip_address, user_agent, identity_photo_path, identity_photo_name')
      .eq('user_id', userId)
      .eq('term_type', 'checkout_terms')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (termError || !termAcceptance) return;

    // Get term data (incluindo conteúdo)
    const { data: termData, error: termDataError } = await supabase
      .from('application_terms')
      .select('title, content')
      .eq('id', termAcceptance.term_id)
      .single();

    if (termDataError || !termData) return;

    // Get seller data if user has seller_referral_code
    let sellerData: any = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase
        .from('sellers')
        .select('name, email, referral_code, user_id, affiliate_admin_id')
        .eq('referral_code', userProfile.seller_referral_code)
        .single();
      if (sellerResult) sellerData = sellerResult;
    }

    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData: { full_name: string; email: string } | null = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase
        .from('affiliate_admins')
        .select('user_id')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      if (affiliateResult?.user_id) {
        const { data: userProfileResult } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', affiliateResult.user_id)
          .single();
        if (userProfileResult) {
          affiliateAdminData = {
            full_name: userProfileResult.full_name,
            email: userProfileResult.email,
          };
        }
      }
    }
    // Generate PDF (SEM conteúdo do termo, apenas foto)
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = margin;

    // Function to add wrapped text
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 12): number => {
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
    pdf.text('TERM ACCEPTANCE DOCUMENT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, { align: 'center' });
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
    if (termAcceptance.identity_photo_path && termAcceptance.identity_photo_path.trim() !== '') {
      try {
        console.log('[NOTIFICAÇÃO] Foto de identidade encontrada, incluindo no PDF:', termAcceptance.identity_photo_path);
        
        // Verificar se precisa de nova página
        const pageHeight = pdf.internal.pageSize.getHeight();
        if (currentY > pageHeight - margin - 80) {
          pdf.addPage();
          currentY = margin;
        }

        // Obter signed URL para a foto
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('identity-photos')
          .createSignedUrl(termAcceptance.identity_photo_path, 3600); // 1 hora de validade

        if (!signedUrlError && signedUrlData) {
          try {
            // Fazer download da imagem
            const imageResponse = await fetch(signedUrlData.signedUrl);
            const imageBlob = await imageResponse.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            // Adicionar seção de foto de identidade
            currentY += 10;
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('IDENTITY PHOTO WITH DOCUMENT', margin, currentY);
            currentY += 12;

            // Calcular dimensões da imagem mantendo proporção correta
            const maxWidth = 260; // mm
            const maxHeight = 300; // mma
            const availableWidth = pageWidth - (2 * margin);

            // Converter mm para unidades do PDF
            const maxWidthUnits = maxWidth * 0.264583;
            const maxHeightUnits = maxHeight * 0.264583;
            const imageWidth = Math.min(maxWidthUnits, availableWidth * 0.9);

            // Tentar obter dimensões reais da imagem
            let finalWidth = imageWidth;
            let finalHeight = 0;

            try {
              const img = new Image();
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
              });

              const aspectRatio = img.height / img.width;
              finalHeight = imageWidth * aspectRatio;

              // Se a altura exceder o máximo, ajustar pela altura
              if (finalHeight > maxHeightUnits) {
                finalHeight = maxHeightUnits;
                finalWidth = finalHeight / aspectRatio;
              }

              // Adicionar imagem com dimensões calculadas mantendo proporção
              pdf.addImage(
                imageUrl,
                termAcceptance.identity_photo_path.endsWith('.png') ? 'PNG' : 'JPEG',
                margin,
                currentY,
                finalWidth,
                finalHeight,
                undefined,
                'FAST'
              );

              currentY += finalHeight + 10;
              URL.revokeObjectURL(imageUrl);
            } catch (propError) {
              // Fallback: usar proporção estimada (assumir 3:4 para selfies verticais)
              console.warn('[NOTIFICAÇÃO] Não foi possível obter dimensões da imagem, usando proporção estimada:', propError);
              finalHeight = imageWidth * 1.33; // Proporção 3:4

              pdf.addImage(
                imageUrl,
                termAcceptance.identity_photo_path.endsWith('.png') ? 'PNG' : 'JPEG',
                margin,
                currentY,
                finalWidth,
                finalHeight,
                undefined,
                'FAST'
              );

              currentY += finalHeight + 10;
              URL.revokeObjectURL(imageUrl);
            }

            console.log('[NOTIFICAÇÃO] ✅ Foto de identidade incluída no PDF com sucesso!');
          } catch (conversionError) {
            console.error('[NOTIFICAÇÃO] Erro ao processar foto:', conversionError);
          }
        } else {
          console.warn('[NOTIFICAÇÃO] Erro ao obter signed URL da foto:', signedUrlError);
        }
      } catch (photoError) {
        console.error('[NOTIFICAÇÃO] Erro ao processar foto de identidade:', photoError);
      }
    } else {
      console.log('[NOTIFICAÇÃO] Nenhuma foto de identidade encontrada - gerando PDF sem foto');
    }

    // Generate PDF blob
    const pdfBlob = pdf.output('blob');
    if (!pdfBlob) throw new Error('PDF generation failed');

    // Detectar ambiente de desenvolvimento
    // Verificar se está em ambiente de desenvolvimento baseado na URL
    const isDevelopment = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('localhost') ||
      import.meta.env?.MODE === 'development' ||
      import.meta.env?.DEV === true
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
    
    // Filtrar emails em ambiente de desenvolvimento
    let emailSeller = sellerData?.email || '';
    let emailAffiliateAdmin = affiliateAdminData?.email || '';
    
    if (isDevelopment) {
      if (devBlockedEmails.includes(emailSeller)) {
        console.log(`[NOTIFICAÇÃO] Email de seller bloqueado em desenvolvimento: ${emailSeller}`);
        emailSeller = '';
      }
      if (devBlockedEmails.includes(emailAffiliateAdmin)) {
        console.log(`[NOTIFICAÇÃO] Email de affiliate admin bloqueado em desenvolvimento: ${emailAffiliateAdmin}`);
        emailAffiliateAdmin = '';
      }
    }

    // Build multipart form-data
    const webhookPayload = {
      tipo_notf: 'Student Term Acceptance',
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: emailSeller,
      nome_seller: sellerData?.name || 'N/A',
      email_affiliate_admin: emailAffiliateAdmin,
      nome_affiliate_admin: affiliateAdminData?.full_name || 'N/A',
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment via Zelle (manually approved). This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address || '',
      student_country: userProfile.country || '',
      seller_id: sellerData?.user_id || '',
      referral_code: sellerData?.referral_code || '',
      affiliate_admin_id: sellerData?.affiliate_admin_id || ''
    } as const;

    const formData = new FormData();
    Object.entries(webhookPayload).forEach(([key, value]) => {
      formData.append(key, value != null ? String(value) : '');
    });
    const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    formData.append('pdf', pdfBlob, fileName);

    await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      body: formData,
    });
  } catch (_) {
    // Intencionalmente silencioso para não quebrar fluxo de pagamento
  }
}


