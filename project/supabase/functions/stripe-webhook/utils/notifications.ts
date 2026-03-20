// @ts-ignore
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";

/**
 * Envia notificação de aceitação de termos com PDF após pagamento bem-sucedido
 */
export async function sendTermAcceptanceNotificationAfterPayment(
  supabase: any,
  userId: string,
  feeType: string,
) {
  try {
    console.log("[NOTIFICAÇÃO] Buscando dados do usuário para notificação...");
    const { data: userProfile, error: userError } = await supabase.from(
      "user_profiles",
    ).select("email, full_name, country, seller_referral_code").eq(
      "user_id",
      userId,
    ).single();
    
    if (userError || !userProfile) {
      console.error("[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:", userError);
      return;
    }

    const { data: termAcceptance, error: termError } = await supabase.from(
      "comprehensive_term_acceptance",
    ).select("term_id, accepted_at, ip_address, user_agent").eq(
      "user_id",
      userId,
    ).eq("term_type", "checkout_terms").order("accepted_at", {
      ascending: false,
    }).limit(1).single();

    if (termError || !termAcceptance) {
      console.error("[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:", termError);
      return;
    }

    const { data: termData, error: termDataError } = await supabase.from(
      "application_terms",
    ).select("title, content").eq("id", termAcceptance.term_id).single();

    if (termDataError || !termData) {
      console.error("[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:", termDataError);
      return;
    }

    // Get seller and affiliate data
    let sellerData = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase.from("sellers").select(
        "name, email, referral_code, user_id, affiliate_admin_id",
      ).eq("referral_code", userProfile.seller_referral_code).single();
      if (sellerResult) {
        sellerData = sellerResult;
      }
    }

    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase.from("affiliate_admins")
        .select("full_name, email").eq("id", sellerData.affiliate_admin_id)
        .single();
      if (affiliateResult) {
        affiliateAdminData = affiliateResult;
      }
    }

    // Generate PDF
    let pdfBlob = null;
    try {
      console.log("[NOTIFICAÇÃO] Gerando PDF para notificação...");
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = margin;

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

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("TERM ACCEPTANCE DOCUMENT", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("MatriculaUSA - Academic Management System", pageWidth / 2, currentY, { align: "center" });
      currentY += 20;
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("STUDENT INFORMATION", margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setFont("helvetica", "bold");
      pdf.text("Name:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(userProfile.full_name, margin + 30, currentY);
      currentY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Email:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(userProfile.email, margin + 30, currentY);
      currentY += 8;
      if (userProfile.country) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Country:", margin, currentY);
        pdf.setFont("helvetica", "normal");
        pdf.text(userProfile.country, margin + 40, currentY);
        currentY += 8;
      }
      currentY += 10;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("TERM ACCEPTANCE DETAILS", margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setFont("helvetica", "bold");
      pdf.text("Term Title:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      currentY = addWrappedText(termData.title, margin + 50, currentY, pageWidth - margin - 50, 11);
      currentY += 5;
      pdf.setFont("helvetica", "bold");
      pdf.text("Accepted At:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date(termAcceptance.accepted_at).toLocaleString(), margin + 50, currentY);
      currentY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("IP Address:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(termAcceptance.ip_address || "N/A", margin + 50, currentY);

      const pdfArrayBuffer = pdf.output("arraybuffer");
      pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    } catch (pdfError) {
      console.error("[NOTIFICAÇÃO] Erro ao gerar PDF:", pdfError);
      throw new Error("Failed to generate PDF for term acceptance notification");
    }

    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_admin: "admin@matriculausa.com",
      nome_admin: "Admin MatriculaUSA",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || "",
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment.`,
      term_title: termData.title,
      term_type: "checkout_terms",
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || "",
    };

    const formData = new FormData();
    Object.entries(webhookPayload).forEach(([key, value]) => {
      formData.append(key, value !== null && value !== undefined ? value.toString() : "");
    });

    const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
    formData.append("pdf", pdfBlob, fileName);

    const webhookResponse = await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
      method: "POST",
      body: formData,
    });

    if (webhookResponse.ok) {
      console.log("[NOTIFICAÇÃO] Notificação enviada com sucesso!");
    } else {
      console.warn("[NOTIFICAÇÃO] Erro ao enviar notificação:", webhookResponse.status);
    }
  } catch (error: any) {
    console.error("[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:", error);
  }
}
