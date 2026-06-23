import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getUniversityEmailTemplate } from "./email-templates.ts";

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

Deno.serve(async (req: Request) => {
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
        tipoNotf = 'Application Fee Paid - University';
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
          tipoNotf = 'Document resubmitted by student - University';
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
        tipoNotf = 'Scholarship confirmed by student - University';
        applicationId = record.selected_application_id;
      } else if (record.documents_uploaded && (!old_record || !old_record.documents_uploaded)) {
        tipoNotf = 'Onboarding documents submitted - University';
      } else if (record.has_paid_reinstatement_package && (!old_record || !old_record.has_paid_reinstatement_package)) {
        tipoNotf = 'Reinstatement Fee Paid - University';
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
              ? 'Global document resubmitted - University' 
              : 'Document resubmitted by student - University';
          } else {
            tipoNotf = requestData.is_global 
              ? 'New global document submitted - University' 
              : 'New document submitted for review - University';
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
          ? 'Transfer Form resubmitted - University' 
          : 'Transfer Form Submitted - University';
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
    if (!applicationId && studentId && (tipoNotf.toLowerCase().includes('document') || tipoNotf.toLowerCase().includes('onboarding') || tipoNotf.toLowerCase().includes('reinstatement') || tipoNotf.toLowerCase().includes('global'))) {
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
      .select("id, name, contact, user_id")
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
      (tipoNotf.toLowerCase().includes('application fee') 
        ? `Student ${studentInfo.full_name} has paid the Application Fee for the scholarship ${scholarshipTitle}.`
        : tipoNotf.toLowerCase().includes('resubmitted')
        ? `Student ${studentInfo.full_name} has resubmitted the document "${metadata.document_title || 'pending'}" for the scholarship ${scholarshipTitle}.`
        : tipoNotf.toLowerCase().includes('global document') || tipoNotf.toLowerCase().includes('new global')
        ? `Student ${studentInfo.full_name} has submitted the document "${metadata.document_title || 'Global Document'}" for review.`
        : tipoNotf.toLowerCase().includes('confirmed')
        ? `Student ${studentInfo.full_name} has confirmed the scholarship choice ${scholarshipTitle} to proceed.`
        : tipoNotf.toLowerCase().includes('reinstatement fee')
        ? `Student ${studentInfo.full_name} has paid the Reinstatement Fee for the scholarship ${scholarshipTitle}.`
        : tipoNotf.toLowerCase().includes('transfer form')
        ? `Student ${studentInfo.full_name} has ${tipoNotf.toLowerCase().includes('resubmitted') ? 'resubmitted' : 'submitted'} the Transfer Form for the scholarship ${scholarshipTitle}.`
        : `Student ${studentInfo.full_name} triggered the event: ${tipoNotf} for the scholarship ${scholarshipTitle}.`);

    // 5. Compute idempotency key (uniqueness is enforced atomically by the
    // unique index on idempotency_key at insert time — see step 7).
    let idempotencyKey = `${tipoNotf}-${studentId}-${scholarshipId || 'general'}-${new Date().toISOString().split('T')[0]}`;

    // Para uploads de documentos, queremos notificação individual SEMPRE (sem bloqueio diário)
    if ((body.table === 'document_request_uploads' || body.table === 'transfer_form_uploads') && body.record?.id) {
      idempotencyKey = `doc_upload_${body.record.id}`;
    }

    const resolvedRedirectUrl = redirectUrl || (applicationId ? `/school/dashboard/student/${applicationId}` : "/school/dashboard/application-tracking");

    // 6. Collect all recipient emails (representatives + generic university contact)
    const recipientEmails: string[] = [];

    // 6a. Generic university contact emails
    if (emailUniversidade) {
      recipientEmails.push(emailUniversidade);
    }

    // 6b. University representatives
    // school_manager users: linked via user_profiles.university_id
    const { data: managers } = await supabaseClient
      .from("user_profiles")
      .select("email, full_name")
      .eq("university_id", universityId)
      .in("role", ["school", "school_manager"]);

    if (managers && managers.length > 0) {
      for (const rep of managers) {
        if (rep.email && !recipientEmails.includes(rep.email)) {
          recipientEmails.push(rep.email);
        }
      }
    }

    // school owner: linked via universities.user_id (may not have university_id in user_profiles)
    if (university.user_id) {
      const { data: ownerProfile } = await supabaseClient
        .from("user_profiles")
        .select("email, full_name")
        .eq("user_id", university.user_id)
        .maybeSingle();

      if (ownerProfile?.email && !recipientEmails.includes(ownerProfile.email)) {
        recipientEmails.push(ownerProfile.email);
      }
    }

    console.log(`[send-university-notification] Found ${recipientEmails.length} recipient(s) for university ${universityId}:`, recipientEmails);

    if (recipientEmails.length === 0) {
      console.warn("[send-university-notification] No recipient emails found. Skipping email send.");
    }

    // 6c. Build email content based on event type (one template per tipoNotf)
    const tiposDocsList = Array.isArray(tipos_documentos)
      ? tipos_documentos.join(", ")
      : (tipos_documentos
          || (Array.isArray(metadata?.tipos_documentos) ? metadata.tipos_documentos.join(", ") : metadata?.tipos_documentos)
          || "");

    const formattedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" });

    const { subject: emailSubject, html: emailHtml } = getUniversityEmailTemplate(tipoNotf, {
      nome_universidade: university.name,
      nome_aluno: studentInfo.full_name,
      email_aluno: studentInfo.email || "",
      nome_bolsa: scholarshipTitle,
      tipos_documentos: tiposDocsList,
      date: formattedDate,
    });

    console.log(`[send-university-notification] Selected template for "${tipoNotf}": subject="${emailSubject}"`);

    // 7. Atomic idempotency lock — record the notification BEFORE sending emails.
    // The unique index on idempotency_key guarantees that two concurrent
    // invocations of the same event cannot both proceed: the loser receives a
    // 23505 (unique_violation) and skips sending, preventing duplicate emails.
    const baseMetadata = {
      tipo_notf: tipoNotf,
      student_id: studentId,
      student_name: studentInfo.full_name,
      student_email: studentInfo.email,
      scholarship_title: scholarshipTitle,
      university_name: university.name,
      application_id: applicationId,
      scholarship_id: scholarshipId,
      recipients: recipientEmails,
      metadata: metadata || {},
      tipos_documentos: tipos_documentos || metadata?.tipos_documentos || [],
    };

    const { data: insertedNotif, error: lockError } = await supabaseClient
      .from("university_notifications")
      .insert({
        university_id: universityId,
        title: tipoNotf,
        message: formattedMessage,
        type: "system_event",
        idempotency_key: idempotencyKey,
        metadata: baseMetadata,
        link: resolvedRedirectUrl,
      })
      .select("id")
      .single();

    if (lockError) {
      // 23505 = unique_violation → another invocation already handled this event
      if ((lockError as any).code === "23505") {
        console.log("[send-university-notification] Duplicate event (idempotency lock). Skipping email send.");
        return new Response(
          JSON.stringify({ status: "skipped", message: "Notification already processed." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      // Erro de insert não relacionado a duplicidade: registra mas segue com o
      // envio, pois entregar o e-mail é o objetivo principal da função.
      console.error("[send-university-notification] Could not record notification (continuing to send):", lockError);
    }

    // 8. Send email to all recipients via internal send-email function
    const emailResults: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const recipientEmail of recipientEmails) {
      try {
        const { error: invokeError } = await supabaseClient.functions.invoke("send-email", {
          body: {
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
          },
        });

        if (invokeError) {
          console.error(`[send-university-notification] Error sending email to ${recipientEmail}:`, invokeError);
          emailResults.push({ email: recipientEmail, success: false, error: String(invokeError) });
        } else {
          console.log(`[send-university-notification] Email sent to ${recipientEmail}`);
          emailResults.push({ email: recipientEmail, success: true });
        }
      } catch (emailErr: any) {
        console.error(`[send-university-notification] Unexpected error sending email to ${recipientEmail}:`, emailErr);
        emailResults.push({ email: recipientEmail, success: false, error: emailErr?.message });
      }
    }

    // 9. Update the notification record with per-recipient send results (audit trail)
    if (insertedNotif?.id) {
      const { error: updateError } = await supabaseClient
        .from("university_notifications")
        .update({ metadata: { ...baseMetadata, email_results: emailResults } })
        .eq("id", insertedNotif.id);

      if (updateError) {
        console.error("[send-university-notification] Error updating notification with results:", updateError);
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    console.log(`[send-university-notification] Completed: ${successCount}/${recipientEmails.length} emails sent`);

    return new Response(
      JSON.stringify({
        status: "success",
        emails_sent: successCount,
        emails_total: recipientEmails.length,
        recipients: recipientEmails,
      }),
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
