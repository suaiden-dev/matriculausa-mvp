// =====================================================
// Edge Function: generate-legal-pdf
// =====================================================
// Gera PDFs de documentos legais (contratos e aceites de termos)
// Salva no Storage e envia por email para info@matriculausa.com
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { jsPDF } from 'npm:jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  type: 'term_acceptance' | 'selection_process_contract' | 'registration_terms';
  user_id: string;
  related_id: string;
  trigger_table?: string;
  triggered_at?: string;
}

interface StudentData {
  student_name: string;
  student_email: string;
  country?: string;
  ip_address?: string;
  user_agent?: string;
  term_title?: string;
  term_content?: string;
  accepted_at?: string;
  identity_photo_path?: string;
  identity_photo_name?: string;
  payment_amount?: number;
  payment_method?: string;
  payment_date?: string;
  fee_type?: string;
  // Para registration_terms
  terms_of_service_content?: string;
  privacy_policy_content?: string;
  terms_of_service_title?: string;
  privacy_policy_title?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestData: GeneratePDFRequest = await req.json();
    const { type, user_id, related_id, trigger_table } = requestData;

    console.log(`[generate-legal-pdf] Iniciando geração de PDF: type=${type}, user_id=${user_id}, related_id=${related_id}, trigger_table=${trigger_table}`);

    // Check if localhost (development) - skip email sending
    const isLocalhost = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
    
    // =====================================================
    // 1. Verificar idempotência
    // =====================================================
    const { data: existingDoc } = await supabase
      .from('legal_documents')
      .select('id')
      .eq('user_id', user_id)
      .eq('document_type', type)
      .eq('related_id', related_id)
      .maybeSingle();

    if (existingDoc) {
      console.log(`[generate-legal-pdf] Documento já existe, abortando: ${existingDoc.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Documento já foi gerado anteriormente',
          document_id: existingDoc.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // 2. Coletar dados do banco
    // =====================================================
    let studentData: StudentData;

    if (type === 'registration_terms') {
      // Buscar ambos os termos de registro (terms_of_service e privacy_policy)
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('full_name, email, country')
        .eq('user_id', user_id)
        .limit(1);

      if (userError) {
        throw new Error(`Erro ao buscar user profile: ${userError.message}`);
      }

      if (!userProfiles || userProfiles.length === 0) {
        throw new Error(`User profile não encontrado para user_id: ${user_id}`);
      }

      const userProfile = userProfiles[0];

      // Buscar terms_of_service
      const { data: termsOfService, error: tosError } = await supabase
        .from('comprehensive_term_acceptance')
        .select(`
          id,
          accepted_at,
          ip_address,
          user_agent,
          application_terms (
            title,
            content
          )
        `)
        .eq('user_id', user_id)
        .eq('term_type', 'terms_of_service')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar privacy_policy
      const { data: privacyPolicy, error: ppError } = await supabase
        .from('comprehensive_term_acceptance')
        .select(`
          id,
          accepted_at,
          ip_address,
          user_agent,
          application_terms (
            title,
            content
          )
        `)
        .eq('user_id', user_id)
        .eq('term_type', 'privacy_policy')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tosError || !termsOfService) {
        throw new Error(`Erro ao buscar Terms of Service: ${tosError?.message || 'Não encontrado'}`);
      }

      if (ppError || !privacyPolicy) {
        throw new Error(`Erro ao buscar Privacy Policy: ${ppError?.message || 'Não encontrado'}`);
      }

      // Usar a data de aceite mais recente
      const mostRecentAcceptance = new Date(termsOfService.accepted_at) > new Date(privacyPolicy.accepted_at)
        ? termsOfService
        : privacyPolicy;

      studentData = {
        student_name: userProfile.full_name || 'N/A',
        student_email: userProfile.email || 'N/A',
        country: userProfile.country || 'N/A',
        ip_address: mostRecentAcceptance.ip_address || 'N/A',
        user_agent: mostRecentAcceptance.user_agent || 'N/A',
        term_title: 'Registration Terms Acceptance',
        accepted_at: mostRecentAcceptance.accepted_at || new Date().toISOString(),
        terms_of_service_content: termsOfService.application_terms?.content || '',
        privacy_policy_content: privacyPolicy.application_terms?.content || '',
        terms_of_service_title: termsOfService.application_terms?.title || 'Terms of Service',
        privacy_policy_title: privacyPolicy.application_terms?.title || 'Privacy Policy',
      };

    } else if (type === 'term_acceptance') {
      // Se for pagamento Zelle ou Stripe, buscar o último checkout_terms aceito
      // Caso contrário, buscar pelo related_id (term_acceptance_id)
      let termAcceptance;
      let termError;
      
      if (trigger_table === 'zelle_payments' || trigger_table === 'individual_fee_payments') {
        // Buscar último checkout_terms aceito pelo usuário
        const { data, error } = await supabase
          .from('comprehensive_term_acceptance')
          .select(`
            id,
            user_id,
            term_id,
            term_type,
            accepted_at,
            ip_address,
            user_agent,
            identity_photo_path,
            identity_photo_name,
            application_terms (
              title,
              content
            )
          `)
          .eq('user_id', user_id)
          .eq('term_type', 'checkout_terms')
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        termAcceptance = data;
        termError = error;
      } else {
        // Buscar pelo ID do term_acceptance
        const { data, error } = await supabase
          .from('comprehensive_term_acceptance')
          .select(`
            id,
            user_id,
            term_id,
            term_type,
            accepted_at,
            ip_address,
            user_agent,
            identity_photo_path,
            identity_photo_name,
            application_terms (
              title,
              content
            )
          `)
          .eq('id', related_id)
          .single();
        
        termAcceptance = data;
        termError = error;
      }

      if (termError || !termAcceptance) {
        throw new Error(`Erro ao buscar term acceptance: ${termError?.message || 'Não encontrado'}`);
      }

      // Buscar dados do usuário
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('full_name, email, country')
        .eq('user_id', user_id)
        .limit(1);

      if (userError) {
        throw new Error(`Erro ao buscar user profile: ${userError.message}`);
      }

      if (!userProfiles || userProfiles.length === 0) {
        throw new Error(`User profile não encontrado para user_id: ${user_id}`);
      }

      const userProfile = userProfiles[0];

      // Se for pagamento Zelle ou Stripe, buscar informações do pagamento
      let paymentInfo: any = null;
      if (trigger_table === 'zelle_payments') {
        const { data: payment, error: paymentError } = await supabase
          .from('zelle_payments')
          .select('fee_type, amount, status, verified_at, payment_date')
          .eq('id', related_id)
          .single();
        
        if (!paymentError && payment) {
          paymentInfo = payment;
          paymentInfo.payment_method_name = 'Zelle';
        }
      } else if (trigger_table === 'individual_fee_payments') {
        const { data: payment, error: paymentError } = await supabase
          .from('individual_fee_payments')
          .select('fee_type, amount, payment_method, payment_date, payment_intent_id')
          .eq('id', related_id)
          .single();
        
        if (!paymentError && payment) {
          paymentInfo = payment;
          paymentInfo.payment_method_name = payment.payment_method === 'stripe' ? 'Stripe' : payment.payment_method;
        }
      }

      studentData = {
        student_name: userProfile.full_name || 'N/A',
        student_email: userProfile.email || 'N/A',
        country: userProfile.country || 'N/A',
        ip_address: termAcceptance.ip_address || 'N/A',
        user_agent: termAcceptance.user_agent || 'N/A',
        term_title: termAcceptance.application_terms?.title || 'Checkout Terms',
        term_content: termAcceptance.application_terms?.content || '',
        accepted_at: termAcceptance.accepted_at || new Date().toISOString(),
        identity_photo_path: termAcceptance.identity_photo_path,
        identity_photo_name: termAcceptance.identity_photo_name,
        // Adicionar informações do pagamento se disponível
        payment_amount: paymentInfo?.amount || null,
        payment_method: paymentInfo?.payment_method_name || paymentInfo?.payment_method || null,
        payment_date: paymentInfo?.verified_at || paymentInfo?.payment_date || null,
        fee_type: paymentInfo?.fee_type || null,
      };

    } else if (type === 'selection_process_contract') {
      // Buscar dados de pagamento de Selection Process
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('full_name, email, country, has_paid_selection_process_fee, updated_at')
        .eq('user_id', user_id)
        .limit(1);

      if (userError) {
        throw new Error(`Erro ao buscar user profile: ${userError.message}`);
      }

      if (!userProfiles || userProfiles.length === 0) {
        throw new Error(`User profile não encontrado para user_id: ${user_id}`);
      }

      const userProfile = userProfiles[0];

      // Buscar termo de checkout mais recente aceito pelo usuário
      const { data: recentTerm } = await supabase
        .from('comprehensive_term_acceptance')
        .select(`
          ip_address,
          user_agent,
          accepted_at,
          identity_photo_path,
          identity_photo_name,
          application_terms (
            title,
            content
          )
        `)
        .eq('user_id', user_id)
        .eq('term_type', 'checkout_terms')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar valor pago (tentar obter do package ou usar valor padrão)
      const { data: packageData } = await supabase
        .from('simplified_packages')
        .select('selection_process_fee')
        .eq('user_id', user_id)
        .maybeSingle();

      const selectionProcessFee = packageData?.selection_process_fee || 600;

      studentData = {
        student_name: userProfile.full_name || 'N/A',
        student_email: userProfile.email || 'N/A',
        country: userProfile.country || 'N/A',
        ip_address: recentTerm?.ip_address || 'N/A',
        user_agent: recentTerm?.user_agent || 'N/A',
        term_title: 'Selection Process Service Agreement',
        term_content: recentTerm?.application_terms?.content || '',
        accepted_at: recentTerm?.accepted_at || userProfile.updated_at,
        identity_photo_path: recentTerm?.identity_photo_path,
        identity_photo_name: recentTerm?.identity_photo_name,
        payment_amount: selectionProcessFee,
        payment_method: 'Stripe/Zelle', // TODO: melhorar detecção do método
        payment_date: userProfile.updated_at,
      };
    } else {
      throw new Error(`Tipo de documento não suportado: ${type}`);
    }

    console.log(`[generate-legal-pdf] Dados coletados para ${studentData.student_name}`);

    // =====================================================
    // 3. Gerar PDF usando jsPDF
    // =====================================================
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = margin;

    // Helper function: add wrapped text
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12): number => {
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

    // Helper function: add separator
    const addSeparator = (y: number): number => {
      if (y > pdf.internal.pageSize.getHeight() - margin - 10) {
        pdf.addPage();
        y = margin;
      }
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      return y + 8;
    };

    // ===== HEADER =====
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    const headerTitle = type === 'registration_terms'
      ? 'REGISTRATION TERMS ACCEPTANCE DOCUMENT'
      : type === 'term_acceptance' 
      ? 'TERM ACCEPTANCE DOCUMENT' 
      : 'SELECTION PROCESS SERVICE AGREEMENT';
    pdf.text(headerTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    currentY = addSeparator(currentY);

    // ===== STUDENT INFORMATION =====
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
    pdf.text(studentData.student_name, margin + 15, currentY);
    currentY += 8;

    // Email
    pdf.setFont('helvetica', 'bold');
    pdf.text('Email:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(studentData.student_email, margin + 15, currentY);
    currentY += 8;

    // Country
    if (studentData.country && studentData.country !== 'N/A') {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Country:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(studentData.country, margin + 20, currentY);
      currentY += 8;
    }

    // Payment info (only for selection_process_contract)
    if (type === 'selection_process_contract' && studentData.payment_amount) {
      currentY += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Amount:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`$${studentData.payment_amount.toFixed(2)} USD`, margin + 40, currentY);
      currentY += 8;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Method:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(studentData.payment_method || 'N/A', margin + 40, currentY);
      currentY += 8;
    }

    currentY += 5;
    currentY = addSeparator(currentY);

    // Helper function: format term content (definida antes de ser usada)
    const formatTermContent = (content: string): number => {
        let processedHtml = content
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        const cleanText = processedHtml.replace(/<[^>]*>/g, '').trim();
        const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        
        paragraphs.forEach((paragraph) => {
          const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          
          lines.forEach((line) => {
            if (currentY > pdf.internal.pageSize.getHeight() - 40) {
              pdf.addPage();
              currentY = margin;
            }
            
            // Detect header types
            if (line.match(/^\d+\.\s+[A-Za-z]/)) {
              // Section header
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(line, margin, currentY, pageWidth - margin - 20, 11);
              currentY += 3;
            } else if (line.endsWith(':') || (line.match(/^[A-Z\s&/()]{3,}$/) && line.length < 80)) {
              // Subsection header
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(line, margin, currentY, pageWidth - margin - 20, 10);
              currentY += 2;
            } else {
              // Regular paragraph
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');
              currentY = addWrappedText(line, margin, currentY, pageWidth - margin - 20, 9);
              currentY += 2;
            }
          });
          
          currentY += 3; // Space between paragraphs
        });
        
        return currentY + 3;
    };

    // ===== TERM CONTENT =====
    if (type === 'registration_terms') {
      // Seção 1: Terms of Service
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PART 1: TERMS OF SERVICE', margin, currentY);
      currentY += 12;

      if (studentData.terms_of_service_content) {
        currentY = formatTermContent(studentData.terms_of_service_content);
        currentY += 10;
      }

      currentY = addSeparator(currentY);
      currentY += 5;

      // Seção 2: Privacy Policy
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PART 2: PRIVACY POLICY', margin, currentY);
      currentY += 12;

      if (studentData.privacy_policy_content) {
        currentY = formatTermContent(studentData.privacy_policy_content);
        currentY += 10;
      }

      currentY = addSeparator(currentY);
    } else if (studentData.term_content && currentY < pdf.internal.pageSize.getHeight() - 100) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AGREEMENT CONTENT', margin, currentY);
      currentY += 12;

      try {
        currentY = formatTermContent(studentData.term_content);
        currentY += 5;
      } catch (error) {
        console.error('[generate-legal-pdf] Error formatting term content:', error);
        // Fallback to simple text
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const plainText = studentData.term_content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .substring(0, 3000);
        currentY = addWrappedText(plainText, margin, currentY, pageWidth - margin - 20, 10);
        currentY += 8;
      }

      currentY = addSeparator(currentY);
    }

    // ===== ACCEPTANCE DETAILS =====
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ACCEPTANCE DETAILS', margin, currentY);
    currentY += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Document title
    pdf.setFont('helvetica', 'bold');
    pdf.text('Document:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    if (type === 'registration_terms') {
      currentY = addWrappedText('Registration Terms (Terms of Service + Privacy Policy)', margin + 30, currentY, pageWidth - margin - 90, 11);
    } else {
      currentY = addWrappedText(studentData.term_title || 'N/A', margin + 30, currentY, pageWidth - margin - 90, 11);
    }
    currentY += 3;

    // Date/Time
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date/Time:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    const formattedDate = new Date(studentData.accepted_at || new Date()).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    pdf.text(formattedDate, margin + 30, currentY);
    currentY += 8;

    // IP Address
    pdf.setFont('helvetica', 'bold');
    pdf.text('IP Address:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(studentData.ip_address || 'Not available', margin + 30, currentY);
    currentY += 8;

    // User Agent
    pdf.setFont('helvetica', 'bold');
    pdf.text('Browser/Device:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(studentData.user_agent || 'Not available', margin, currentY + 8, pageWidth - margin - 20, 9);
    currentY += 8;

    // ===== IDENTITY PHOTO (if available) =====
    // Note: Skipping photo embedding in Edge Function for simplicity
    // Photos are stored separately and can be viewed via Storage
    if (studentData.identity_photo_path) {
      currentY += 8;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Identity Photo:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY += 6;
      pdf.setFontSize(9);
      pdf.text(`Stored at: ${studentData.identity_photo_path}`, margin, currentY);
      currentY += 8;
    }

    // ===== FOOTER =====
    const footerY = pdf.internal.pageSize.getHeight() - 30;
    currentY = addSeparator(currentY + 10);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const legalText = `This document was automatically generated by MatriculaUSA system on ${new Date().toLocaleString('en-US')}. ` +
      'It serves as proof of agreement acceptance by the student mentioned above. ' +
      'This document has legal validity and can be used as evidence of user agreement with the presented terms.';
    
    addWrappedText(legalText, margin, footerY, pageWidth - margin - 20, 8);

    // =====================================================
    // 4. Save PDF to Storage
    // =====================================================
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = studentData.student_name.replace(/\s+/g, '_').toLowerCase();
    const filename = `${type}_${sanitizedName}_${timestamp}.pdf`;
    const storagePath = `${user_id}/${type}/${filename}`;

    const pdfOutput = pdf.output('arraybuffer');
    const pdfBytes = new Uint8Array(pdfOutput);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('legal-documents')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload do PDF: ${uploadError.message}`);
    }

    console.log(`[generate-legal-pdf] PDF salvo no Storage: ${storagePath}`);

    // =====================================================
    // 5. Register in legal_documents table
    // =====================================================
    const { data: documentRecord, error: insertError } = await supabase
      .from('legal_documents')
      .insert({
        user_id,
        document_type: type,
        related_id,
        storage_path: storagePath,
        filename,
        email_sent: false,
        metadata: {
          student_name: studentData.student_name,
          student_email: studentData.student_email,
          payment_amount: studentData.payment_amount,
          payment_method: studentData.payment_method,
          term_title: studentData.term_title,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao registrar documento: ${insertError.message}`);
    }

    console.log(`[generate-legal-pdf] Documento registrado: ${documentRecord.id}`);

    // =====================================================
    // 6. Send email (skip if localhost)
    // =====================================================
    if (isLocalhost) {
      console.log('[generate-legal-pdf] Localhost detectado, pulando envio de email');
    } else {
      try {
        // Get signed URL for PDF
        const { data: signedUrlData } = await supabase.storage
          .from('legal-documents')
          .createSignedUrl(storagePath, 3600 * 24 * 7); // 7 days

        // Buscar credenciais SMTP do system_settings
        const { data: smtpSettings } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_auth_user', 'smtp_auth_pass']);

        if (!smtpSettings || smtpSettings.length === 0) {
          throw new Error('Credenciais SMTP não configuradas no system_settings. Configure: smtp_host, smtp_port, smtp_secure, smtp_auth_user, smtp_auth_pass');
        }

        // Converter array de settings em objeto
        const smtpConfig: Record<string, string> = {};
        smtpSettings.forEach(setting => {
          smtpConfig[setting.key] = setting.value;
        });

        // Validar que todas as credenciais necessárias estão presentes
        const requiredKeys = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_auth_user', 'smtp_auth_pass'];
        const missingKeys = requiredKeys.filter(key => !smtpConfig[key]);
        if (missingKeys.length > 0) {
          throw new Error(`Credenciais SMTP incompletas. Faltando: ${missingKeys.join(', ')}`);
        }

        // Call send-smtp-email function
        // Usar apikey header para bypass de JWT verification
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-smtp-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            host: smtpConfig.smtp_host,
            port: parseInt(smtpConfig.smtp_port, 10),
            secure: smtpConfig.smtp_secure === 'true' || smtpConfig.smtp_secure === true,
            user: smtpConfig.smtp_auth_user,
            password: smtpConfig.smtp_auth_pass,
            to: 'info@matriculausa.com',
            subject: `Novo Documento Legal - ${studentData.student_name} - ${type === 'registration_terms' ? 'Termos de Registro' : type === 'term_acceptance' ? 'Aceite de Termos' : 'Contrato Selection Process'}`,
            html: `
              <h2>Novo Documento Legal Gerado</h2>
              <p><strong>Estudante:</strong> ${studentData.student_name}</p>
              <p><strong>Email:</strong> ${studentData.student_email}</p>
              <p><strong>Tipo:</strong> ${type === 'registration_terms' ? 'Termos de Registro (Terms of Service + Privacy Policy)' : type === 'term_acceptance' ? 'Aceite de Termos de Checkout' : 'Contrato de Selection Process'}</p>
              ${studentData.payment_amount ? `<p><strong>Valor:</strong> $${studentData.payment_amount.toFixed(2)} USD</p>` : ''}
              <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <br/>
              <p>O documento PDF foi gerado e salvo no sistema.</p>
              <p><strong>Link para download (válido por 7 dias):</strong> <a href="${signedUrlData?.signedUrl}">${signedUrlData?.signedUrl}</a></p>
              <p><strong>Nome do arquivo:</strong> ${filename}</p>
            `
          })
        });

        if (emailResponse.ok) {
          // Update email_sent status
          await supabase
            .from('legal_documents')
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString()
            })
            .eq('id', documentRecord.id);

          console.log('[generate-legal-pdf] Email enviado com sucesso');
        } else {
          const errorText = await emailResponse.text();
          throw new Error(`Erro ao enviar email: ${errorText}`);
        }
      } catch (emailError) {
        console.error('[generate-legal-pdf] Erro ao enviar email:', emailError);
        // Save error but don't fail the entire operation
        await supabase
          .from('legal_documents')
          .update({
            email_error: String(emailError)
          })
          .eq('id', documentRecord.id);
      }
    }

    // =====================================================
    // 7. Return success
    // =====================================================
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF gerado e salvo com sucesso',
        document_id: documentRecord.id,
        storage_path: storagePath,
        filename,
        email_sent: !isLocalhost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-legal-pdf] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
