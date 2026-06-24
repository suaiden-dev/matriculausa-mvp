/**
 * email-templates.ts
 *
 * Templates de e-mail enviados às universidades pela função
 * `send-university-notification`. Cada tipo de evento (tipoNotf) tem o seu
 * próprio template, espelhando exatamente os 9 templates que antes viviam no
 * n8n. Use `getUniversityEmailTemplate(tipoNotf, data)` para obter o
 * `{ subject, html }` correto.
 */

const LOGO_URL =
  "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg";

export interface UniversityEmailData {
  nome_universidade: string;
  nome_aluno: string;
  email_aluno: string;
  nome_bolsa: string;
  /** Já formatado como string (ex: "Transcript, Passport"). */
  tipos_documentos?: string;
  /** Data já formatada (ex: "June 22, 2026"). */
  date: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Layout base compartilhado por todos os templates: header com logo, área de
 * conteúdo, assinatura padrão e footer. O `innerContent` é o miolo específico
 * de cada evento.
 */
function baseLayout(title: string, innerContent: string, footerText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #fff; }
    .header { background-color: #0052cc; padding: 20px; text-align: center; }
    .header img { max-width: 120px; height: auto; }
    .content { padding: 30px 20px; line-height: 1.6; }
    .content p { margin-bottom: 15px; }
    .details-box { background-color: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 5px; padding: 15px; margin: 20px 0; color: #004085; }
    .action-required { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; color: #856404; }
    .next-steps { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0; color: #155724; }
    .resubmission-badge { background-color: #fdecea; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0; color: #721c24; }
    .congrats-banner { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0; color: #155724; text-align: center; font-size: 18px; }
    .footer { padding: 15px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #777; }
    a { color: #0052cc; text-decoration: none; }
    .icon { font-size: 24px; margin-right: 10px; }
    @media screen and (max-width:600px) { .wrapper { width: 100% !important; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="${LOGO_URL}" alt="Matrícula USA">
    </div>
    <div class="content">
${innerContent}
      <p><strong>Please do not reply to this email.</strong></p>
      <br>
      <p>Best regards,<br>
      <strong>Matrícula USA Team</strong><br>
      <a href="https://matriculausa.com/">https://matriculausa.com/</a></p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>`;
}

// 1. Student Application Review Required
function studentApplicationReview(d: UniversityEmailData): RenderedEmail {
  const inner = `      <strong><span class="icon">📋</span>Application Review Required</strong>
      <br><br>
      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student applied to your one of your scholarships and submitted all required documents. Your review and decision are now needed to move the process forward.</p>
      <div class="details-box">
        <strong>Application Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Submission Date:</strong> ${d.date}<br>
        <strong>Status:</strong> Awaiting Your Decision
      </div>
      <div class="action-required">
        <strong>⚠️ Action Required — Approve or Reject the Application:</strong><br>
        Please access your university dashboard to review the submitted documents and make your decision. The student is waiting for your response to proceed.
      </div>
      <div class="next-steps">
        <strong>How to proceed:</strong><br>
        • Log in to your university dashboard at Matrícula USA<br>
        • Open the student's application and review all submitted documents<br>
        • Verify that the documents meet your scholarship requirements<br>
        • <strong>Approve</strong> the application to move the student to the next stage, or<br>
        • <strong>Reject</strong> the application with feedback so the student can make corrections<br>
        • The student will be automatically notified of your decision
      </div>
      <p>Your timely review is important to keep the process moving and to provide a good experience for the student. We recommend reviewing the application within 5 business days.</p>
      <p>To access the dashboard and review this application, please log in to your account at Matrícula USA.</p>`;
  return {
    subject: "Student Application Review Required",
    html: baseLayout(
      "📋 Student Application Review Required",
      inner,
      "You are receiving this message because a student has submitted their application documents for your scholarship program and is awaiting your decision. This is an automated notification from Matrícula USA."
    ),
  };
}

// 2. New Student Enrollment
function newStudentEnrollment(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <div class="congrats-banner">
        🎉 Congratulations!<br>
        <span style="font-size: 15px; font-weight: normal;">A new student has chosen your university's scholarship to move forward with their application.</span>
      </div>
      <p>We are happy to let you know that <strong>${d.nome_aluno}</strong> has selected your institution and is excited to begin the process. This is a great opportunity for both the student and your university.</p>
      <div class="details-box">
        <strong>Student Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Enrollment Date:</strong> ${d.date}
      </div>
      <p>The student will soon begin uploading their required documents. You will receive a new notification as soon as their application is ready for your review.</p>
      <p>Thank you for being part of the Matrícula USA network and for providing students with life-changing opportunities.</p>`;
  return {
    subject: "New Student Enrollment",
    html: baseLayout(
      "🎉 New Student Enrollment",
      inner,
      "You are receiving this message because a student has selected your university's scholarship program. This is an automated notification from Matrícula USA."
    ),
  };
}

// 3. Document Resubmission
function documentResubmission(d: UniversityEmailData): RenderedEmail {
  const inner = `      <strong><span class="icon">🔄</span>Document Resubmission — New Review Required</strong>
      <br><br>
      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has resubmitted their documents following a previous rejection. The updated documents are now available for your review and a new decision is required.</p>
      <div class="resubmission-badge">
        <strong>🔁 This is a resubmission.</strong><br>
        This student's documents were previously reviewed and rejected. They have since made the necessary corrections and resubmitted for a second analysis.
      </div>
      <div class="details-box">
        <strong>Application Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Resubmitted Documents:</strong> ${d.tipos_documentos || ""}<br>
        <strong>Resubmission Date:</strong> ${d.date}<br>
        <strong>Status:</strong> Awaiting New Decision
      </div>
      <div class="action-required">
        <strong>⚠️ Action Required — Re-evaluate and Approve or Reject:</strong><br>
        Please access your university dashboard to review the updated documents and issue a new decision. The student has addressed the previous feedback and is awaiting your response.
      </div>
      <div class="next-steps">
        <strong>How to proceed:</strong><br>
        • Log in to your university dashboard at Matrícula USA<br>
        • Open the student's application and review the resubmitted documents<br>
        • Compare with your previous rejection criteria to verify corrections were made<br>
        • <strong>Approve</strong> the application if the documents now meet your requirements, or<br>
        • <strong>Reject</strong> again with updated feedback if further corrections are still needed<br>
        • The student will be automatically notified of your new decision
      </div>
      <p>This student has shown commitment by promptly addressing your feedback and resubmitting. We recommend completing your review within 5 business days.</p>
      <p>To access the dashboard and review this application, please log in to your account at Matrícula USA.</p>`;
  return {
    subject: "Document Resubmission — Review Required",
    html: baseLayout(
      "🔄 Document Resubmission — Review Required",
      inner,
      "You are receiving this message because a student has resubmitted their documents after a previous rejection and is awaiting a new decision. This is an automated notification from Matrícula USA."
    ),
  };
}

// 4. Application Fee Payment
function applicationFeePayment(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has successfully paid the Application Fee and is now ready to proceed with your scholarship program.</p>
      <div class="details-box">
        <strong>Payment Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>Payment Date:</strong> ${d.date}
      </div>
      <p>The student will now move forward with uploading their required documents. You will receive a notification once their application is ready for your review.</p>`;
  return {
    subject: "Application Fee Payment",
    html: baseLayout(
      "💳 Application Fee Payment Received",
      inner,
      "You are receiving this message because a student has paid the Application Fee for your scholarship program. This is an automated notification from Matrícula USA."
    ),
  };
}

// 5. Reinstatement Fee Payment
function reinstatementFeePayment(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has successfully paid the Reinstatement Fee and is now ready to proceed with your scholarship program.</p>
      <div class="details-box">
        <strong>Payment Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>Payment Date:</strong> ${d.date}
      </div>
      <p>The student will now move forward with uploading their required documents. You will receive a notification once their application is ready for your review.</p>`;
  return {
    subject: "Reinstatement Fee Payment",
    html: baseLayout(
      "💳 Reinstatement Fee Payment Received",
      inner,
      "You are receiving this message because a student has paid the Reinstatement Fee for your scholarship program. This is an automated notification from Matrícula USA."
    ),
  };
}

// 6. New Global Document Upload
function newGlobalDocument(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has submitted their global documents and is now awaiting your approval to continue with the scholarship application process.</p>
      <div class="details-box">
        <strong>Submission Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Documents:</strong> ${d.tipos_documentos || ""}<br>
        <strong>Submission Date:</strong> ${d.date}<br>
        <strong>Status:</strong> Awaiting Approval
      </div>
      <div class="action-required">
        <strong>⚠️ Action Required — Review and Approve or Reject:</strong><br>
        Please access your university dashboard to review the submitted global documents and issue your decision. The student cannot move forward until your approval is confirmed.
      </div>
      <p>To review and approve this submission, please log in to your account at Matrícula USA.</p>`;
  return {
    subject: "New Global Document Upload Notification",
    html: baseLayout(
      "📄 Global Documents Submitted — Approval Required",
      inner,
      "You are receiving this message because a student has submitted their global documents for your scholarship program and is awaiting your approval. This is an automated notification from Matrícula USA."
    ),
  };
}

// 7. Global Document Resubmission
function globalDocumentResubmission(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has resubmitted their global documents following a previous rejection and is once again awaiting your approval to continue with the scholarship application process.</p>
      <div class="resubmission-badge">
        <strong>🔁 This is a resubmission.</strong><br>
        These global documents were previously reviewed and rejected by your team. The student has made the necessary corrections and resubmitted for a new evaluation.
      </div>
      <div class="details-box">
        <strong>Submission Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Documents:</strong> ${d.tipos_documentos || ""}<br>
        <strong>Resubmission Date:</strong> ${d.date}<br>
        <strong>Status:</strong> Awaiting New Approval
      </div>
      <div class="action-required">
        <strong>⚠️ Action Required — Re-evaluate and Approve or Reject:</strong><br>
        Please access your university dashboard to review the updated global documents and issue a new decision. The student cannot move forward until your approval is confirmed.
      </div>
      <p>To review and approve this resubmission, please log in to your account at Matrícula USA.</p>`;
  return {
    subject: "Global Document Resubmission Notification",
    html: baseLayout(
      "🔄 Global Document Resubmission — Approval Required",
      inner,
      "You are receiving this message because a student has resubmitted their global documents after a previous rejection and is awaiting your new approval. This is an automated notification from Matrícula USA."
    ),
  };
}

// 8. Transfer Form Submitted
function transferFormSubmitted(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has submitted their Transfer Form and is now awaiting your review and decision to proceed with the scholarship application process.</p>
      <div class="details-box">
        <strong>Submission Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Submission Date:</strong> ${d.date}<br>
        <strong>Status:</strong> Awaiting Approval
      </div>
      <div class="action-required">
        <strong>⚠️ Action Required — Review and Approve or Reject:</strong><br>
        Please access your university dashboard to review the submitted Transfer Form and issue your decision. The student cannot move forward until your approval is confirmed.
      </div>
      <p>To review and approve this submission, please log in to your account at Matrícula USA.</p>`;
  return {
    subject: "Transfer Form Submitted",
    html: baseLayout(
      "📋 Transfer Form Submitted — Review Required",
      inner,
      "You are receiving this message because a student has submitted their Transfer Form and is awaiting your approval. This is an automated notification from Matrícula USA."
    ),
  };
}

// 9. Transfer Form Resubmission
function transferFormResubmission(d: UniversityEmailData): RenderedEmail {
  const inner = `      <p>Hello ${d.nome_universidade} Team,</p>
      <p>A student has submitted an updated Transfer Form and is awaiting your review and decision to continue with the scholarship application process.</p>
      <div class="details-box">
        <strong>Submission Details:</strong><br>
        <strong>Student Name:</strong> ${d.nome_aluno}<br>
        <strong>Student Email:</strong> ${d.email_aluno}<br>
        <strong>Scholarship:</strong> ${d.nome_bolsa}<br>
        <strong>University:</strong> ${d.nome_universidade}<br>
        <strong>Submission Date:</strong> ${d.date}<br>
        <strong>Status:</strong> Awaiting Approval
      </div>
      <div class="action-required">
        <strong>⚠️ Action Required — Review and Approve or Reject:</strong><br>
        Please access your university dashboard to review the updated Transfer Form and issue your decision. The student cannot move forward until your approval is confirmed.
      </div>
      <p>To review and approve this submission, please log in to your account at Matrícula USA.</p>`;
  return {
    subject: "Transfer Form Resubmission",
    html: baseLayout(
      "🔄 Transfer Form Resubmission — Review Required",
      inner,
      "You are receiving this message because a student has submitted an updated Transfer Form and is awaiting your approval. This is an automated notification from Matrícula USA."
    ),
  };
}

/**
 * Mapeia o `tipoNotf` gerado pela função para o template correto.
 * A ordem das verificações importa: do mais específico para o mais genérico.
 */
export function getUniversityEmailTemplate(
  tipoNotf: string,
  data: UniversityEmailData
): RenderedEmail {
  const t = (tipoNotf || "").toLowerCase();

  // Pagamentos
  if (t.includes("reinstatement")) return reinstatementFeePayment(data);
  if (t.includes("application fee")) return applicationFeePayment(data);

  // Transfer Form
  if (t.includes("transfer form") && t.includes("resubmit")) return transferFormResubmission(data);
  if (t.includes("transfer form")) return transferFormSubmitted(data);

  // Documentos globais
  if (t.includes("global") && t.includes("resubmit")) return globalDocumentResubmission(data);
  if (t.includes("global")) return newGlobalDocument(data);

  // Reenvio de documento (não global)
  if (t.includes("resubmit")) return documentResubmission(data);

  // Matrícula / escolha de bolsa confirmada
  if (t.includes("confirmed") || t.includes("enrollment")) return newStudentEnrollment(data);

  // Default: revisão de documentos enviados (onboarding, novo documento, etc.)
  return studentApplicationReview(data);
}
