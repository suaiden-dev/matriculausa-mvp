import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  studentId: string;
  universityId: string;
  scholarshipId?: string;
  applicationId?: string;
  tipoNotf: string;
  customMessage?: string;
  redirectUrl?: string;
  metadata?: any;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    
    let {
      studentId,
      universityId,
      scholarshipId,
      applicationId,
      tipoNotf,
      customMessage,
      redirectUrl,
      metadata = {},
      tipos_documentos,
    } = body;

    // 0. Intelligent Webhook Detection & Mapping
    if (body.table === 'scholarship_applications' && body.record) {
      const { record, old_record } = body;
      studentId = record.student_id;
      scholarshipId = record.scholarship_id;
      applicationId = record.id;
      
      // Detecção de evento baseada no delta
      if (record.is_application_fee_paid && (!old_record || !old_record.is_application_fee_paid)) {
        tipoNotf = 'Application Fee Paga - Universidade';
      } else if (old_record?.documents && Array.isArray(record.documents) && JSON.stringify(record.documents) !== JSON.stringify(old_record.documents)) {
        // É uma alteração em documentos já existentes. 
        // Vamos verificar se realmente é um re-upload (algo que estava rejeitado e agora está em revisão)
        const oldDocs = Array.isArray(old_record.documents) ? old_record.documents : [];
        const hasReupload = record.documents.some((newDoc: any) => {
          const oldDoc = oldDocs.find((d: any) => d.type === newDoc.type);
          // Se o documento estava rejeitado e agora está 'under_review', ou se o URL mudou em um doc já existente
          return (oldDoc?.status === 'rejected' && newDoc.status === 'under_review') || 
                 (oldDoc?.url && oldDoc.url !== newDoc.url && newDoc.status === 'under_review');
        });

        if (hasReupload) {
          tipoNotf = 'Documento reenviado pelo aluno - Universidade';
          metadata.tipos_documentos = record.documents
            .filter((newDoc: any) => {
               const oldDoc = oldDocs.find((d: any) => d.type === newDoc.type);
               return (oldDoc?.status === 'rejected' && newDoc.status === 'under_review') || 
                      (oldDoc?.url && oldDoc.url !== newDoc.url && newDoc.status === 'under_review');
            })
            .map((d: any) => d.type);
        } else {
          // Se mudou mas não foi re-upload (ex: admin mudando status), não disparamos por aqui
          tipoNotf = null; 
        }
      } else {
        // Se old_record.documents estava vazio, é o primeiro upload (Onboarding), 
        // que já é tratado pelo trigger da tabela user_profiles.
        tipoNotf = null;
      }
    } 
    else if (body.table === 'user_profiles' && body.record) {
      const { record, old_record } = body;
      studentId = record.id;
      universityId = record.university_id; // Pega o university_id direto do perfil se disponível
      
      if (record.selected_application_id && (!old_record || record.selected_application_id !== old_record.selected_application_id)) {
        tipoNotf = 'Bolsa de estudo confirmada pelo aluno - Universidade';
        applicationId = record.selected_application_id;
      } else if (record.documents_uploaded && (!old_record || !old_record.documents_uploaded)) {
        tipoNotf = 'Documentos do onboarding enviados - Universidade';
      } else if (record.has_paid_reinstatement_package && (!old_record || !old_record.has_paid_reinstatement_package)) {
        tipoNotf = 'Reinstatement Fee Paga - Universidade';
      }
    }
    else if (body.table === 'document_request_uploads' && body.record) {
      const { record, old_record, type } = body;
      
      const { data: requestData } = await supabaseClient
        .from('document_requests')
        .select('is_global, university_id, scholarship_application_id, title')
        .eq('id', record.document_request_id)
        .single();
        
      if (requestData) {
        studentId = record.uploaded_by;
        universityId = requestData.university_id;
        applicationId = requestData.scholarship_application_id;
        
        // Determinar se é reenvio (verificando se já houve rejeição anterior para este documento)
        const { data: previousRejected } = await supabaseClient
          .from('document_request_uploads')
          .select('id')
          .eq('document_request_id', record.document_request_id)
          .eq('uploaded_by', record.uploaded_by)
          .eq('status', 'rejected')
          .limit(1);
          
        const isResubmission = (previousRejected && previousRejected.length > 0) || 
                               (type === 'UPDATE' && old_record?.status === 'rejected');

        if (type === 'INSERT' || (type === 'UPDATE' && record.status === 'under_review' && old_record?.status !== 'under_review')) {
          if (isResubmission) {
            tipoNotf = requestData.is_global 
              ? 'Documento global reenviado - Universidade' 
              : 'Documento reenviado pelo aluno - Universidade';
          } else {
            tipoNotf = requestData.is_global 
              ? 'Novo documento global enviado - Universidade' 
              : 'Novo documento enviado para análise - Universidade';
          }
        }
        
        metadata.document_title = requestData.title;
        tipos_documentos = [requestData.title];
      }
    }
    else if (body.table === 'transfer_form_uploads' && body.record) {
      const { record, old_record, type } = body;
      applicationId = record.application_id;
      studentId = record.uploaded_by;

      // Buscar universidade a partir da aplicação
      const { data: appData } = await supabaseClient
        .from('scholarship_applications')
        .select('scholarship_id, scholarships(university_id)')
        .eq('id', applicationId)
        .single();

      if (appData) {
        scholarshipId = appData.scholarship_id;
        const scholarship = Array.isArray(appData.scholarships) ? appData.scholarships[0] : appData.scholarships;
        universityId = scholarship?.university_id;
      }

      // Determinar se é reenvio
      const { data: previousRejected } = await supabaseClient
        .from('transfer_form_uploads')
        .select('id')
        .eq('application_id', applicationId)
        .eq('status', 'rejected')
        .limit(1);

      const isResubmission = (previousRejected && previousRejected.length > 0) || 
                             (type === 'UPDATE' && old_record?.status === 'rejected');

      if (type === 'INSERT' || (type === 'UPDATE' && record.status === 'under_review' && old_record?.status !== 'under_review')) {
        tipoNotf = isResubmission 
          ? 'Transfer Form reenviado - Universidade' 
          : 'Transfer Form Enviado - Universidade';
      }
      
      metadata.document_title = 'Transfer Form';
      tipos_documentos = ['Transfer Form'];
    }

    if (!studentId || !tipoNotf) {
      // Se não conseguimos identificar o evento, apenas logamos e retornamos sucesso (para não travar o webhook)
      console.log("[send-university-notification] Could not identify event from webhook payload. Skipping.");
      return new Response(JSON.stringify({ status: "skipped", message: "Event not identified" }), { headers: corsHeaders });
    }

    // 0.1 Fetch missing IDs (applicationId, scholarshipId, universityId)
    if (!applicationId && studentId && (tipoNotf.includes('Documentos') || tipoNotf.includes('onboarding') || tipoNotf.includes('Reinstatement') || tipoNotf.includes('global'))) {
      const { data: appData } = await supabaseClient
        .from("scholarship_applications")
        .select("id, scholarship_id")
        .eq("student_id", studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (appData) {
        applicationId = appData.id;
        scholarshipId = appData.scholarship_id;
      }
    }

    if (!scholarshipId && applicationId) {
      const { data: appData } = await supabaseClient
        .from("scholarship_applications")
        .select("scholarship_id")
        .eq("id", applicationId)
        .single();
      if (appData) scholarshipId = appData.scholarship_id;
    }

    if (!universityId && scholarshipId) {
      const { data: scholarshipData } = await supabaseClient
        .from("scholarships")
        .select("university_id")
        .eq("id", scholarshipId)
        .single();
      if (scholarshipData) universityId = scholarshipData.university_id;
    }

    if (!studentId || !universityId || !tipoNotf) {
      console.error("[send-university-notification] Missing mandatory data after resolution:", { studentId, universityId, tipoNotf });
      throw new Error("Could not resolve mandatory IDs (student, university, tipoNotf).");
    }

    console.log(`[send-university-notification] Processing event: ${tipoNotf} for student: ${studentId}`);

    // 1. Fetch Student Details
    const { data: student, error: studentError } = await supabaseClient
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", studentId) // Usando ID da PK (studentId pode ser user_id ou profile_id dependendo da tabela)
      .single();
    
    // Fallback se não achou pelo ID (tenta por user_id)
    if (studentError || !student) {
      const { data: studentFallback } = await supabaseClient
        .from("user_profiles")
        .select("full_name, email")
        .eq("user_id", studentId)
        .single();
      if (studentFallback) {
        studentId = studentId; // Mantém
      } else {
         console.error("Error fetching student:", studentError);
         throw new Error("Student profile not found.");
      }
    }
    const studentInfo = student || (await supabaseClient.from("user_profiles").select("full_name, email").eq("user_id", studentId).single()).data;

    if (!studentInfo) throw new Error("Student profile not found.");

    // 2. Fetch University Details
    const { data: university, error: uniError } = await supabaseClient
      .from("universities")
      .select("id, name, contact")
      .eq("id", universityId)
      .single();

    if (uniError || !university) {
      console.error("Error fetching university:", uniError);
      throw new Error("University not found.");
    }

    const contact = university.contact || {};
    const emailUniversidade = contact.admissionsEmail || contact.email || "";

    // 3. Fetch Scholarship Details (Optional)
    let scholarshipTitle = "N/A";
    if (scholarshipId) {
      const { data: scholarship } = await supabaseClient
        .from("scholarships")
        .select("title")
        .eq("id", scholarshipId)
        .single();
      if (scholarship) scholarshipTitle = scholarship.title;
    }

    // 4. Build Formatted Message
    const formattedMessage = customMessage || 
      (tipoNotf.includes('Application Fee') 
        ? `O aluno ${studentInfo.full_name} realizou o pagamento da Application Fee para a bolsa ${scholarshipTitle}.`
        : tipoNotf.includes('Documento reenviado') || tipoNotf.includes('global reenviado')
        ? `O aluno ${studentInfo.full_name} reenviou o documento "${metadata.document_title || 'pendente'}" para a bolsa ${scholarshipTitle}.`
        : tipoNotf.includes('global enviado')
        ? `O aluno ${studentInfo.full_name} enviou o documento "${metadata.document_title || 'Documento Global'}" para análise.`
        : tipoNotf.includes('confirmada')
        ? `O aluno ${studentInfo.full_name} confirmou a escolha da bolsa ${scholarshipTitle} para prosseguir.`
        : tipoNotf.includes('Reinstatement Fee')
        ? `O aluno ${studentInfo.full_name} realizou o pagamento da Reinstatement Fee para a bolsa ${scholarshipTitle}.`
        : tipoNotf.includes('Transfer Form')
        ? `O aluno ${studentInfo.full_name} ${tipoNotf.includes('reenviado') ? 'reenviou' : 'enviou'} o Transfer Form para a bolsa ${scholarshipTitle}.`
        : `O aluno ${studentInfo.full_name} disparou o evento: ${tipoNotf} para a bolsa ${scholarshipTitle}.`);

    // 5. Idempotency Check & In-App Notification Log
    let idempotencyKey = `${tipoNotf}-${studentId}-${scholarshipId || 'general'}-${new Date().toISOString().split('T')[0]}`;
    
    // Para uploads de documentos, queremos notificação individual SEMPRE (sem bloqueio diário)
    if ((body.table === 'document_request_uploads' || body.table === 'transfer_form_uploads') && body.record?.id) {
      idempotencyKey = `doc_upload_${body.record.id}`;
    }
    
    const { data: existingNotif } = await supabaseClient
      .from("university_notifications")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existingNotif) {
      console.log("[send-university-notification] Duplicate notification detected, skipping.");
      return new Response(
        JSON.stringify({ status: "skipped", message: "Notification already sent today." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const resolvedRedirectUrl = redirectUrl || (applicationId ? `/school/dashboard/student/${applicationId}` : "/school/dashboard/application-tracking");

    // 6. Send to n8n Webhook
    const n8nPayload = {
      tipo_notf: tipoNotf,
      email_aluno: studentInfo.email,
      nome_aluno: studentInfo.full_name,
      nome_bolsa: scholarshipTitle,
      nome_universidade: university.name,
      email_universidade: emailUniversidade,
      o_que_enviar: formattedMessage,
      redirect_url: resolvedRedirectUrl,
      application_id: applicationId,
      student_id: studentId,
      scholarship_id: scholarshipId,
      university_id: universityId,
      is_approved_by_university: metadata?.is_approved_by_university || false,
      fee_type: metadata?.fee_type || null,
      fee_amount: metadata?.fee_amount || 0,
      scholarship_fee_paid: metadata?.scholarship_fee_paid || false,
      metadata: metadata || {},
      tipos_documentos: tipos_documentos || metadata?.tipos_documentos || [],
    };

    console.log("[send-university-notification] Sending to n8n:", n8nPayload);

    const n8nResponse = await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      console.error("[send-university-notification] n8n Webhook failed:", await n8nResponse.text());
    }

    // 7. Record the notification in the database
    const { error: logError } = await supabaseClient.from("university_notifications").insert({
      university_id: universityId,
      title: tipoNotf,
      message: formattedMessage,
      type: "system_event",
      idempotency_key: idempotencyKey,
      metadata: n8nPayload,
      link: resolvedRedirectUrl
    });

    if (logError) {
      console.error("[send-university-notification] Error logging notification:", logError);
    }

    return new Response(
      JSON.stringify({ status: "success", n8n_status: n8nResponse.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("[send-university-notification] Critical error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
