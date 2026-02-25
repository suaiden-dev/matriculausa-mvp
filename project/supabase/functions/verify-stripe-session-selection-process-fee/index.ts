import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import Stripe from "npm:stripe@17.7.0";
// @ts-ignore
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { getStripeConfig } from "./stripe-config.ts";
// Import jsPDF for Deno environment
// @ts-ignore
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";

// @ts-ignore
const supabase = createClient(
  // @ts-ignore
  Deno.env.get("SUPABASE_URL") ?? "",
  // @ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/**
 * Busca todos os usuários admin do sistema
 * Retorna array com email, nome e telefone de cada admin
 * Em ambiente de desenvolvimento (localhost), filtra emails específicos
 */
async function getAllAdmins(
  supabase: SupabaseClient,
  isDevelopment: boolean = false,
): Promise<
  Array<{
    user_id: string;
    email: string;
    full_name: string;
    phone: string;
  }>
> {
  // Emails a serem filtrados em ambiente de desenvolvimento
  const devBlockedEmails = [
    "luizedmiola@gmail.com",
    "chimentineto@gmail.com",
    "fsuaiden@gmail.com",
    "rayssathefuture@gmail.com",
    "gui.reis@live.com",
    "admin@matriculausa.com",
  ];

  try {
    // Buscar todos os admins da tabela user_profiles onde role = 'admin'
    // Usar RPC ou query direta - tentar primeiro com user_profiles
    const { data: adminProfiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, email, full_name, phone")
      .eq("role", "admin");

    if (profileError) {
      console.error(
        "[getAllAdmins] Erro ao buscar admins de user_profiles:",
        profileError,
      );

      // Fallback: tentar buscar de auth.users usando raw_user_meta_data
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin
          .listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter((user: any) =>
              user.user_metadata?.role === "admin" ||
              user.email === "admin@matriculausa.com"
            )
            .map((user: any) => ({
              user_id: user.id,
              email: user.email || "",
              full_name: user.user_metadata?.full_name ||
                user.user_metadata?.name || "Admin MatriculaUSA",
              phone: user.user_metadata?.phone || "",
            }))
            .filter((admin: any) => admin.email); // Apenas admins com email

          if (adminUsers.length > 0) {
            // Filtrar emails bloqueados em desenvolvimento
            const filteredAdmins = isDevelopment
              ? adminUsers.filter((admin: any) =>
                !devBlockedEmails.includes(admin.email)
              )
              : adminUsers;
            console.log(
              `[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${
                isDevelopment ? " (filtrados para dev)" : ""
              }:`,
              filteredAdmins.map((a: any) => a.email),
            );
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              user_id: "",
              email: "admin@matriculausa.com",
              full_name: "Admin MatriculaUSA",
              phone: "",
            }];
          }
        }
      } catch (authFallbackError) {
        console.error(
          "[getAllAdmins] Erro no fallback para auth.users:",
          authFallbackError,
        );
      }

      // Fallback final: retornar admin padrão se houver erro
      return [{
        user_id: "",
        email: "admin@matriculausa.com",
        full_name: "Admin MatriculaUSA",
        phone: "",
      }];
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn(
        "[getAllAdmins] Nenhum admin encontrado em user_profiles, tentando auth.users...",
      );

      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin
          .listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter((user: any) =>
              user.user_metadata?.role === "admin" ||
              user.email === "admin@matriculausa.com"
            )
            .map((user: any) => ({
              user_id: user.id,
              email: user.email || "",
              full_name: user.user_metadata?.full_name ||
                user.user_metadata?.name || "Admin MatriculaUSA",
              phone: user.user_metadata?.phone || "",
            }))
            .filter((admin: any) => admin.email);

          if (adminUsers.length > 0) {
            // Filtrar emails bloqueados em desenvolvimento
            const filteredAdmins = isDevelopment
              ? adminUsers.filter((admin: any) =>
                !devBlockedEmails.includes(admin.email)
              )
              : adminUsers;
            console.log(
              `[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${
                isDevelopment ? " (filtrados para dev)" : ""
              }:`,
              filteredAdmins.map((a: any) => a.email),
            );
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              user_id: "",
              email: "admin@matriculausa.com",
              full_name: "Admin MatriculaUSA",
              phone: "",
            }];
          }
        }
      } catch (authFallbackError) {
        console.error(
          "[getAllAdmins] Erro no fallback para auth.users:",
          authFallbackError,
        );
      }

      // Fallback final: retornar admin padrão se não houver admins
      console.warn(
        "[getAllAdmins] Nenhum admin encontrado, usando admin padrão",
      );
      return [{
        user_id: "",
        email: "admin@matriculausa.com",
        full_name: "Admin MatriculaUSA",
        phone: "",
      }];
    }

    // Se algum admin não tem email em user_profiles, buscar de auth.users
    const adminsWithEmail = await Promise.all(
      adminProfiles.map(async (profile: any) => {
        if (profile.email) {
          return {
            user_id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name || "Admin MatriculaUSA",
            phone: profile.phone || "",
          };
        } else {
          // Buscar email de auth.users se não estiver em user_profiles
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(
              profile.user_id,
            );
            return {
              user_id: profile.user_id,
              email: authUser?.user?.email || "",
              full_name: profile.full_name ||
                authUser?.user?.user_metadata?.full_name ||
                "Admin MatriculaUSA",
              phone: profile.phone || authUser?.user?.user_metadata?.phone ||
                "",
            };
          } catch (e) {
            console.warn(
              `[getAllAdmins] Erro ao buscar email para user_id ${profile.user_id}:`,
              e,
            );
            return null;
          }
        }
      }),
    );

    // Filtrar nulos e admins sem email
    let admins = adminsWithEmail
      .filter((
        admin: any,
      ): admin is {
        user_id: string;
        email: string;
        full_name: string;
        phone: string;
      } => admin !== null && !!admin.email);

    // Filtrar emails bloqueados em desenvolvimento
    if (isDevelopment) {
      const beforeFilter = admins.length;
      admins = admins.filter((admin: any) =>
        !devBlockedEmails.includes(admin.email)
      );
      if (beforeFilter !== admins.length) {
        console.log(
          `[getAllAdmins] Filtrados ${
            beforeFilter - admins.length
          } admin(s) em ambiente de desenvolvimento`,
        );
      }
    }

    if (admins.length === 0) {
      console.warn(
        "[getAllAdmins] Nenhum admin válido encontrado após processamento, usando admin padrão",
      );
      return [{
        user_id: "",
        email: "admin@matriculausa.com",
        full_name: "Admin MatriculaUSA",
        phone: "",
      }];
    }

    console.log(
      `[getAllAdmins] Encontrados ${admins.length} admin(s)${
        isDevelopment ? " (filtrados para dev)" : ""
      }:`,
      admins.map((a: any) => a.email),
    );

    return admins;
  } catch (error) {
    console.error("[getAllAdmins] Erro inesperado ao buscar admins:", error);
    // Fallback: retornar admin padrão em caso de erro
    return [{
      user_id: "",
      email: "admin@matriculausa.com",
      full_name: "Admin MatriculaUSA",
      phone: "",
    }];
  }
}
// Function to send term acceptance notification with PDF after successful payment
async function sendTermAcceptanceNotificationAfterPayment(
  userId: string,
  feeType: string,
  isDevelopment: boolean = false,
) {
  try {
    console.log("[NOTIFICAÇÃO] Buscando dados do usuário para notificação...");
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase.from(
      "user_profiles",
    ).select("email, full_name, country, seller_referral_code").eq(
      "user_id",
      userId,
    ).single();
    if (userError || !userProfile) {
      console.error(
        "[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:",
        userError,
      );
      return;
    }
    // Get the most recent term acceptance for this user (incluindo foto de identidade)
    // ✅ BACKWARD COMPATIBLE: Campos identity_photo_path e identity_photo_name são opcionais
    // Se não existirem na tabela (produção antiga), serão null e o PDF será gerado sem foto
    const { data: termAcceptance, error: termError } = await supabase
      .from("comprehensive_term_acceptance")
      .select(
        "term_id, accepted_at, ip_address, user_agent, identity_photo_path, identity_photo_name",
      )
      .eq("user_id", userId)
      .eq("term_type", "checkout_terms")
      .order("accepted_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(); // ✅ Usar maybeSingle() para não falhar se não houver registro

    if (termError) {
      console.error(
        "[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:",
        termError,
      );
      return;
    }

    if (!termAcceptance) {
      console.warn(
        "[NOTIFICAÇÃO] Nenhuma aceitação de termos encontrada para o usuário",
      );
      return;
    }
    // Get term content
    const { data: termData, error: termDataError } = await supabase.from(
      "application_terms",
    ).select("title, content").eq("id", termAcceptance.term_id).single();
    if (termDataError || !termData) {
      console.error(
        "[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:",
        termDataError,
      );
      return;
    }
    // Get seller data if user has seller_referral_code
    let sellerData = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase.from("sellers").select(
        "name, email, referral_code, user_id, affiliate_admin_id",
      ).eq("referral_code", userProfile.seller_referral_code).single();
      if (sellerResult) {
        sellerData = sellerResult;
      }
    }
    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase.from("affiliate_admins")
        .select("name, email").eq("id", sellerData.affiliate_admin_id).single();
      if (affiliateResult) {
        affiliateAdminData = {
          full_name: affiliateResult.name,
          email: affiliateResult.email,
        };
      }
    }
    // Generate PDF for the term acceptance
    let pdfBlob = null;
    try {
      console.log("[NOTIFICAÇÃO] Gerando PDF para notificação...");
      // Create PDF document
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = margin;
      // Function to add wrapped text
      const addWrappedText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        fontSize: number = 12,
      ) => {
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
      pdf.setFont("helvetica", "bold");
      pdf.text("TERM ACCEPTANCE DOCUMENT", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 15;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "MatriculaUSA - Academic Management System",
        pageWidth / 2,
        currentY,
        {
          align: "center",
        },
      );
      currentY += 20;
      // Separator line
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      // Student Information
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("STUDENT INFORMATION", margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      // Name
      pdf.setFont("helvetica", "bold");
      pdf.text("Name:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(userProfile.full_name, margin + 30, currentY);
      currentY += 8;
      // Email
      pdf.setFont("helvetica", "bold");
      pdf.text("Email:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(userProfile.email, margin + 30, currentY);
      currentY += 8;
      // Country
      if (userProfile.country) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Country:", margin, currentY);
        pdf.setFont("helvetica", "normal");
        pdf.text(userProfile.country, margin + 40, currentY);
        currentY += 8;
      }
      currentY += 5;
      // Separator line
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      // ✅ TERM CONTENT SECTION
      if (termData.content && termData.content.trim() !== "") {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("TERM CONTENT", margin, currentY);
        currentY += 12;

        // Função para formatar conteúdo HTML do termo (igual ao pdfGenerator.ts)
        const formatTermContent = (content: string): number => {
          // Parse HTML content
          const parseHtmlContent = (html: string) => {
            const elements: Array<
              { text: string; type: "h1" | "h2" | "h3" | "p" | "strong" }
            > = [];

            // Replace HTML entities first
            let processedHtml = html
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");

            // Remove HTML tags completely and work with plain text
            const cleanText = processedHtml.replace(/<[^>]*>/g, "").trim();

            // Split into paragraphs by double line breaks, then by single line breaks
            const paragraphs = cleanText.split(/\n\s*\n/).map((p) => p.trim())
              .filter((p) => p.length > 0);

            paragraphs.forEach((paragraph, paragraphIndex) => {
              const lines = paragraph.split("\n").map((line) => line.trim())
                .filter((line) => line.length > 0);

              lines.forEach((line, lineIndex) => {
                let type: "h1" | "h2" | "h3" | "p" | "strong" = "p";

                // Main titles (first line of document or standalone short lines that look like titles)
                if (
                  (paragraphIndex === 0 && lineIndex === 0) ||
                  (lines.length === 1 && line.length < 60 &&
                    line.match(/^[A-Z]/) && !line.match(/^\d+\./))
                ) {
                  type = "h1";
                } // Section headers (numbered like "1. Purpose")
                else if (line.match(/^\d+\.\s+[A-Za-z]/)) {
                  type = "h2";
                } // Subsection headers (lines ending with colon or all caps short lines)
                else if (
                  line.endsWith(":") ||
                  (line.match(/^[A-Z\s&/()]{3,}$/) && line.length < 80)
                ) {
                  type = "h3";
                } // Everything else is paragraph content
                else {
                  type = "p";
                }

                elements.push({ text: line, type });
              });

              // Add spacing between paragraphs
              if (paragraphIndex < paragraphs.length - 1) {
                elements.push({ text: "", type: "p" });
              }
            });

            return elements;
          };

          const elements = parseHtmlContent(content);

          elements.forEach((element) => {
            // Skip empty elements but add small spacing
            if (element.text === "") {
              currentY += 3;
              return;
            }

            // Check if we need a new page
            if (currentY > pdf.internal.pageSize.getHeight() - 40) {
              pdf.addPage();
              currentY = margin;
            }

            switch (element.type) {
              case "h1":
                currentY += 2;
                pdf.setFontSize(13);
                pdf.setFont("helvetica", "bold");
                currentY = addWrappedText(
                  element.text,
                  margin,
                  currentY,
                  pageWidth - margin - 20,
                  13,
                );
                currentY += 2;
                break;

              case "h2":
                currentY += 2;
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                currentY = addWrappedText(
                  element.text,
                  margin,
                  currentY,
                  pageWidth - margin - 20,
                  11,
                );
                currentY += 3;
                break;

              case "h3":
              case "strong":
                currentY += 3;
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "bold");
                currentY = addWrappedText(
                  element.text,
                  margin,
                  currentY,
                  pageWidth - margin - 20,
                  10,
                );
                currentY += 2;
                break;

              case "p":
              default:
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "normal");
                currentY = addWrappedText(
                  element.text,
                  margin,
                  currentY,
                  pageWidth - margin - 20,
                  9,
                );
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
          console.error(
            "[NOTIFICAÇÃO] Erro ao formatar conteúdo do termo:",
            error,
          );
          // Fallback to simple text if formatting fails
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          let plainTextContent = termData.content
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim();

          const maxTermContentLength = 3000;
          const termContent = plainTextContent.length > maxTermContentLength
            ? plainTextContent.substring(0, maxTermContentLength) + "..."
            : plainTextContent;

          currentY = addWrappedText(
            termContent,
            margin,
            currentY,
            pageWidth - margin - 20,
            10,
          );
          currentY += 8;
        }

        // Separator line
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }

      // Term Information
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("TERM ACCEPTANCE DETAILS", margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      // Term Title
      pdf.setFont("helvetica", "bold");
      pdf.text("Term Title:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      currentY = addWrappedText(
        termData.title,
        margin + 50,
        currentY,
        pageWidth - margin - 50,
        11,
      );
      currentY += 5;
      // Acceptance Date
      pdf.setFont("helvetica", "bold");
      pdf.text("Accepted At:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        new Date(termAcceptance.accepted_at).toLocaleString(),
        margin + 50,
        currentY,
      );
      currentY += 8;
      // IP Address
      pdf.setFont("helvetica", "bold");
      pdf.text("IP Address:", margin, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.text(termAcceptance.ip_address || "N/A", margin + 50, currentY);
      currentY += 10;

      // ✅ BACKWARD COMPATIBLE: Identity Photo Section (se houver foto)
      // Em produção (sem frontend atualizado), identity_photo_path será null e esta seção será pulada
      // Em desenvolvimento (com frontend atualizado), a foto será incluída no PDF
      if (
        termAcceptance.identity_photo_path &&
        termAcceptance.identity_photo_path.trim() !== ""
      ) {
        try {
          console.log(
            "[NOTIFICAÇÃO] Foto de identidade encontrada, incluindo no PDF:",
            termAcceptance.identity_photo_path,
          );

          // Verificar se precisa de nova página
          const pageHeight = pdf.internal.pageSize.getHeight();
          if (currentY > pageHeight - margin - 80) {
            pdf.addPage();
            currentY = margin;
          }

          // Download da foto do Storage (bucket privado)
          const { data: imageData, error: imageError } = await supabase.storage
            .from("identity-photos")
            .download(termAcceptance.identity_photo_path);

          if (!imageError && imageData) {
            try {
              // Converter para ArrayBuffer
              const imageArrayBuffer = await imageData.arrayBuffer();
              const imageBytes = new Uint8Array(imageArrayBuffer);

              // Converter para base64 (compatível com Deno)
              let binary = "";
              for (let i = 0; i < imageBytes.length; i++) {
                binary += String.fromCharCode(imageBytes[i]);
              }
              const imageBase64 = btoa(binary);

              // Determinar formato da imagem
              const fileExtension =
                termAcceptance.identity_photo_path.split(".").pop()
                  ?.toLowerCase() || "jpg";
              const imageFormat = fileExtension === "png" ? "PNG" : "JPEG";
              const mimeType = fileExtension === "png"
                ? "image/png"
                : "image/jpeg";
              const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

              // Adicionar seção de foto de identidade
              currentY += 10;
              pdf.setFontSize(14);
              pdf.setFont("helvetica", "bold");
              pdf.text("IDENTITY PHOTO WITH DOCUMENT", margin, currentY);
              currentY += 12;

              // ✅ Calcular dimensões da imagem mantendo proporção correta
              // Dimensões máximas permitidas (em mm) - aumentadas para melhor visualização
              const maxWidth = 280; // mm - aumentado de 80 para 120
              const maxHeight = 320; // mm - aumentado de 120 para 160 (para imagens verticais)
              const pageWidth = pdf.internal.pageSize.getWidth();
              const availableWidth = pageWidth - (2 * margin);

              // Converter mm para unidades do PDF
              const maxWidthUnits = maxWidth * 0.264583;
              const maxHeightUnits = maxHeight * 0.264583;
              const imageWidth = Math.min(maxWidthUnits, availableWidth * 0.9); // 90% da largura disponível (aumentado de 85%)

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
                  "FAST",
                );

                currentY += finalHeight + 10;
              } catch (propError) {
                // Fallback: usar proporção estimada (assumir 3:4 para selfies verticais)
                console.warn(
                  "[NOTIFICAÇÃO] Não foi possível obter dimensões da imagem, usando proporção estimada:",
                  propError,
                );
                finalHeight = imageWidth * 1.33; // Proporção 3:4

                pdf.addImage(
                  imageDataUrl,
                  imageFormat,
                  margin,
                  currentY,
                  finalWidth,
                  finalHeight,
                  undefined,
                  "FAST",
                );

                currentY += finalHeight + 10;
              }

              // ✅ Removido: Informação sobre a foto (não necessário no PDF)

              console.log(
                "[NOTIFICAÇÃO] ✅ Foto de identidade incluída no PDF com sucesso!",
              );
            } catch (conversionError) {
              console.error(
                "[NOTIFICAÇÃO] Erro ao converter foto para base64:",
                conversionError,
              );
              // Continuar sem foto - não quebrar o fluxo
            }
          } else {
            console.warn(
              "[NOTIFICAÇÃO] Erro ao carregar foto de identidade do Storage:",
              imageError?.message || "Unknown error",
            );
            // ✅ BACKWARD COMPATIBLE: Continuar sem foto - não quebrar o PDF
            // Não adicionar nota para não confundir usuários em produção
          }
        } catch (photoError) {
          console.error(
            "[NOTIFICAÇÃO] Erro ao processar foto de identidade:",
            photoError,
          );
          // ✅ BACKWARD COMPATIBLE: Continuar sem foto - não quebrar o PDF
          // Não adicionar nota para não confundir usuários em produção
        }
      } else {
        // ✅ BACKWARD COMPATIBLE: Sem foto (produção antiga ou usuário não fez upload)
        // PDF será gerado normalmente sem a seção de foto
        console.log(
          "[NOTIFICAÇÃO] Nenhuma foto de identidade encontrada - gerando PDF sem foto (comportamento normal para produção)",
        );
      }

      // Generate PDF blob
      const pdfArrayBuffer = pdf.output("arraybuffer");
      pdfBlob = new Blob([
        pdfArrayBuffer,
      ], {
        type: "application/pdf",
      });
      console.log("[NOTIFICAÇÃO] PDF gerado com sucesso!");
    } catch (pdfError) {
      console.error("[NOTIFICAÇÃO] Erro ao gerar PDF:", pdfError);
      // Continue without PDF but log the error
      console.warn(
        "[NOTIFICAÇÃO] Continuando sem PDF devido ao erro na geração",
      );
      // Don't throw error to avoid breaking the payment process
    }
    // Prepare notification payload - enviar apenas para o ALUNO
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || "",
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar:
        `Student ${userProfile.full_name} has accepted the Student Checkout Terms & Conditions and completed ${feeType} payment via Stripe. This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: "checkout_terms",
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || "",
    };

    console.log(
      "[NOTIFICAÇÃO] Enviando notificação de aceitação de termos para o aluno:",
      userProfile.email,
    );

    // Enviar apenas UMA notificação para o ALUNO
    let webhookResponse;
    if (pdfBlob) {
      // Send webhook notification with PDF
      const formData = new FormData();
      // Add each field individually for n8n to process correctly
      Object.entries(webhookPayload).forEach(([key, value]) => {
        formData.append(
          key,
          value !== null && value !== undefined ? value.toString() : "",
        );
      });
      // Add PDF with descriptive filename
      const fileName = `term_acceptance_${
        userProfile.full_name.replace(/\s+/g, "_").toLowerCase()
      }_${new Date().toISOString().split("T")[0]}.pdf`;
      formData.append("pdf", pdfBlob, fileName);
      webhookResponse = await fetch(
        "https://nwh.suaiden.com/webhook/notfmatriculausa",
        {
          method: "POST",
          body: formData,
        },
      );
    } else {
      // Send webhook notification without PDF
      webhookResponse = await fetch(
        "https://nwh.suaiden.com/webhook/notfmatriculausa",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "PostmanRuntime/7.36.3",
          },
          body: JSON.stringify(webhookPayload),
        },
      );
    }

    if (webhookResponse.ok) {
      console.log(
        `[NOTIFICAÇÃO] Notificação de aceitação de termos enviada com sucesso para o aluno ${userProfile.email}!`,
      );
    } else {
      const errorText = await webhookResponse.text();
      console.warn(
        `[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos para o aluno ${userProfile.email}:`,
        webhookResponse.status,
        errorText,
      );
    }
  } catch (error) {
    console.error(
      "[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:",
      error,
    );
    // Don't throw error to avoid breaking the payment process
  }
}
function corsResponse(body: any, status: number = 200) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  };
  if (status === 204) {
    return new Response(null, {
      status,
      headers,
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
    },
  });
}

// Função auxiliar para determinar moeda e símbolo baseado na session do Stripe
function getCurrencyInfo(session: any) {
  const currency = session.currency?.toLowerCase() || "usd";
  const isPix = session.payment_method_types?.includes("pix") ||
    session.metadata?.payment_method === "pix";

  // Se for PIX ou currency for BRL, usar Real
  if (currency === "brl" || isPix) {
    return {
      currency: "BRL",
      symbol: "R$",
      code: "brl",
    };
  }

  // Caso contrário, usar Dólar
  return {
    currency: "USD",
    symbol: "$",
    code: "usd",
  };
}

// Função auxiliar para formatar valor com moeda
function formatAmountWithCurrency(amount: number, session: any) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}
// @ts-ignore
Deno.serve(async (req: Request) => {
  console.log(
    "--- verify-stripe-session-selection-process-fee: Request received ---",
  );
  try {
    if (req.method === "OPTIONS") return corsResponse(null, 204);
    if (req.method !== "POST") {
      return corsResponse({
        error: "Method Not Allowed",
      }, 405);
    }

    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);

    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      apiVersion: "2025-07-30.preview", // Versão preview para FX Quotes API
      appInfo: {
        name: "MatriculaUSA Integration",
        version: "1.0.0",
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    const { sessionId } = await req.json();
    if (!sessionId) {
      return corsResponse({
        error: "Session ID is required",
      }, 400);
    }
    console.log(`Verifying session ID: ${sessionId}`);

    // Verificar se esta sessão já foi processada para evitar duplicação
    // Verificar se há qualquer log de fee_payment para esta sessão
    const { data: allExistingLogs } = await supabase
      .from("student_action_logs")
      .select("id, metadata, created_at")
      .eq("action_type", "fee_payment")
      .eq("metadata->>session_id", sessionId)
      .order("created_at", { ascending: false });

    if (allExistingLogs && allExistingLogs.length > 0) {
      // Verificar se há um log que indica que as notificações já foram enviadas ou estão sendo enviadas
      const hasNotificationLog = allExistingLogs.some((log: any) => {
        const metadata = log.metadata || {};
        return metadata.notifications_sending === true ||
          metadata.notifications_sent === true;
      });

      if (hasNotificationLog) {
        console.log(
          `[DUPLICAÇÃO] Session ${sessionId} já está processando ou processou notificações, retornando sucesso sem reprocessar.`,
        );
        return corsResponse({
          status: "complete",
          message: "Session already processing or processed notifications.",
        }, 200);
      }

      // Verificar se há múltiplos logs de processing_started (indicando chamadas simultâneas)
      const processingLogs = allExistingLogs.filter((log: any) => {
        const metadata = log.metadata || {};
        return metadata.processing_started === true;
      });

      if (processingLogs.length > 1) {
        // Se há múltiplos logs de processamento, verificar se algum foi criado há mais de 2 segundos
        // Isso indica que o processamento já está em andamento
        const now = new Date();
        const recentProcessingLogs = processingLogs.filter((log: any) => {
          const logTime = new Date(log.created_at);
          const secondsDiff = (now.getTime() - logTime.getTime()) / 1000;
          return secondsDiff < 2; // Log criado há menos de 2 segundos
        });

        if (recentProcessingLogs.length > 1) {
          console.log(
            `[DUPLICAÇÃO] Múltiplos logs de processamento detectados para session ${sessionId}, retornando sucesso para evitar duplicação.`,
          );
          return corsResponse({
            status: "complete",
            message: "Multiple processing logs detected, avoiding duplication.",
          }, 200);
        }
      }

      // Se há logs mas nenhum indica notificações, ainda pode processar (pode ser apenas o log de processing_started)
      console.log(
        `[DUPLICAÇÃO] Session ${sessionId} tem logs mas notificações ainda não foram enviadas, continuando processamento.`,
      );
    }

    let session;
    try {
      // Expandir payment_intent para obter o ID completo
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });
      console.log(
        `Session status: ${session.status}, Payment status: ${session.payment_status}`,
      );
    } catch (stripeError: any) {
      console.error(
        `Stripe error retrieving session ${sessionId}:`,
        stripeError.message,
      );

      // Verificar se é erro de sessão não encontrada
      if (stripeError.message?.includes("No such checkout.session")) {
        console.error(
          `Session ${sessionId} not found - may have expired or been processed already`,
        );
        return corsResponse({
          error:
            "Session not found. It may have expired or been processed already.",
          details: stripeError.message,
          sessionId: sessionId,
        }, 404);
      }

      // Outros erros do Stripe
      return corsResponse({
        error: "Stripe API error.",
        details: stripeError.message,
        sessionId: sessionId,
      }, 500);
    }
    if (session.payment_status === "paid" && session.status === "complete") {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;

      // Detectar se é PIX através dos payment_method_types ou metadata
      const isPixPayment = session.payment_method_types?.includes("pix") ||
        session.metadata?.payment_method === "pix";

      // Para pagamentos via Stripe, sempre usar 'stripe' como payment_method na tabela individual_fee_payments
      // Mas para user_profiles, usar 'pix' se for PIX, 'stripe' caso contrário
      const paymentMethodForIndividualFee = "stripe"; // Sempre 'stripe' para individual_fee_payments
      const paymentMethodForUserProfile = isPixPayment ? "pix" : "stripe"; // 'pix' ou 'stripe' para user_profiles

      // Variável para lógica de conversão (usada para detectar PIX)
      const paymentMethod = session.payment_method_types?.[0] ||
        (isPixPayment ? "pix" : "stripe");

      console.log(
        `Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}, Payment Method: ${paymentMethodForUserProfile}`,
      );
      if (!userId) {
        return corsResponse({
          error: "User ID (client_reference_id) missing in session.",
        }, 400);
      }

      // Buscar userProfile para criar log e processar
      const { data: userProfile, error: profileFetchError } = await supabase
        .from("user_profiles").select("id").eq("user_id", userId).single();

      if (profileFetchError || !userProfile) {
        console.error("User profile not found:", profileFetchError);
        return corsResponse({
          error: "User profile not found",
        }, 404);
      }

      // Criar log ANTES de processar para evitar duplicação em chamadas simultâneas
      try {
        await supabase.rpc("log_student_action", {
          p_student_id: userProfile.id,
          p_action_type: "fee_payment",
          p_action_description:
            `Selection Process Fee payment processing started (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: "student",
          p_metadata: {
            fee_type: "selection_process",
            payment_method: paymentMethodForUserProfile,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            session_id: sessionId,
            application_id: applicationId,
            processing_started: true,
          },
        });
        console.log(
          "[DUPLICAÇÃO] Log de processamento criado para evitar duplicação",
        );
      } catch (logError) {
        // Se falhar ao criar log, verificar novamente se já existe (race condition)
        const { data: recheckLog } = await supabase
          .from("student_action_logs")
          .select("id")
          .eq("action_type", "fee_payment")
          .eq("metadata->>session_id", sessionId)
          .single();

        if (recheckLog) {
          console.log(
            `[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`,
          );
          return corsResponse({
            status: "complete",
            message: "Session already being processed.",
          }, 200);
        }
        console.error(
          "[DUPLICAÇÃO] Erro ao criar log, mas continuando processamento:",
          logError,
        );
      }

      // Atualiza perfil do usuário
      const { error: profileError } = await supabase.from("user_profiles")
        .update({
          has_paid_selection_process_fee: true,
          selection_process_fee_payment_method: paymentMethodForUserProfile, // 'pix' ou 'stripe'
        }).eq("user_id", userId);
      if (profileError) {
        throw new Error(
          `Failed to update user_profiles: ${profileError.message}`,
        );
      }

      // Registrar pagamento na tabela individual_fee_payments
      let individualFeePaymentId = null;
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total
          ? session.amount_total / 100
          : 0;
        const currency = session.currency?.toUpperCase() || "USD";
        // Obter payment_intent_id: pode ser string ou objeto PaymentIntent
        let paymentIntentId = "";
        if (typeof session.payment_intent === "string") {
          paymentIntentId = session.payment_intent;
        } else if (
          session.payment_intent &&
          typeof session.payment_intent === "object" &&
          "id" in session.payment_intent
        ) {
          paymentIntentId = (session.payment_intent as any).id;
        }

        // Para pagamentos PIX (BRL), buscar o valor líquido recebido em USD do BalanceTransaction
        // Sempre buscar o valor líquido, independente do ambiente
        const shouldFetchNetAmount = true;

        // Debug: Log das condições
        console.log(
          `[Individual Fee Payment] DEBUG - currency: ${currency}, paymentMethod: ${paymentMethod}, paymentIntentId: ${paymentIntentId}, shouldFetchNetAmount: ${shouldFetchNetAmount}, isProduction: ${config.environment.isProduction}`,
        );

        let paymentAmount = paymentAmountRaw;
        let grossAmountUsd: number | null = null;
        let feeAmountUsd: number | null = null;

        // Buscar valores do Stripe para PIX/BRL ou para qualquer pagamento com paymentIntentId (incluindo cartão USD)
        if (paymentIntentId && shouldFetchNetAmount) {
          console.log(
            `✅ Buscando valor líquido, bruto e taxas do Stripe (ambiente: ${config.environment.environment})`,
          );
          try {
            // Buscar PaymentIntent com latest_charge expandido para obter balance_transaction
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentIntentId,
              {
                expand: ["latest_charge.balance_transaction"],
              },
            );

            if (paymentIntent.latest_charge) {
              const charge = typeof paymentIntent.latest_charge === "string"
                ? await stripe.charges.retrieve(paymentIntent.latest_charge, {
                  expand: ["balance_transaction"],
                })
                : paymentIntent.latest_charge;

              if (charge.balance_transaction) {
                const balanceTransaction =
                  typeof charge.balance_transaction === "string"
                    ? await stripe.balanceTransactions.retrieve(
                      charge.balance_transaction,
                    )
                    : charge.balance_transaction;

                // O valor líquido (net) já está em USD e já considera taxas e conversão de moeda
                if (
                  balanceTransaction.net &&
                  balanceTransaction.currency === "usd"
                ) {
                  paymentAmount = balanceTransaction.net / 100; // net está em centavos

                  // Buscar valor bruto (amount) em USD
                  if (
                    balanceTransaction.amount &&
                    balanceTransaction.currency === "usd"
                  ) {
                    grossAmountUsd = balanceTransaction.amount / 100; // amount está em centavos
                    console.log(
                      `[Individual Fee Payment] Valor bruto recebido do Stripe: ${grossAmountUsd} USD`,
                    );
                  }

                  // Buscar taxas (fee) em USD
                  if (
                    balanceTransaction.fee &&
                    balanceTransaction.currency === "usd"
                  ) {
                    feeAmountUsd = balanceTransaction.fee / 100; // fee está em centavos
                    console.log(
                      `[Individual Fee Payment] Taxas recebidas do Stripe: ${feeAmountUsd} USD`,
                    );
                  }

                  console.log(
                    `[Individual Fee Payment] Valor líquido recebido do Stripe (após taxas e conversão): ${paymentAmount} USD`,
                  );
                  console.log(
                    `[Individual Fee Payment] Valor bruto: ${
                      grossAmountUsd || balanceTransaction.amount / 100
                    } ${balanceTransaction.currency}, Taxas: ${
                      feeAmountUsd || (balanceTransaction.fee || 0) / 100
                    } ${balanceTransaction.currency}`,
                  );
                } else {
                  // Fallback: usar exchange_rate do metadata se disponível (apenas para BRL)
                  if (currency === "BRL" && session.metadata?.exchange_rate) {
                    const exchangeRate = parseFloat(
                      session.metadata.exchange_rate,
                    );
                    if (exchangeRate > 0) {
                      paymentAmount = paymentAmountRaw / exchangeRate;
                      console.log(
                        `[Individual Fee Payment] Usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`,
                      );
                    }
                  }
                }
              } else {
                // Fallback: usar exchange_rate do metadata (apenas para BRL)
                if (currency === "BRL" && session.metadata?.exchange_rate) {
                  const exchangeRate = parseFloat(
                    session.metadata.exchange_rate,
                  );
                  if (exchangeRate > 0) {
                    paymentAmount = paymentAmountRaw / exchangeRate;
                    console.log(
                      `[Individual Fee Payment] BalanceTransaction não disponível, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`,
                    );
                  }
                }
              }
            } else {
              // Fallback: usar exchange_rate do metadata (apenas para BRL)
              if (currency === "BRL" && session.metadata?.exchange_rate) {
                const exchangeRate = parseFloat(session.metadata.exchange_rate);
                if (exchangeRate > 0) {
                  paymentAmount = paymentAmountRaw / exchangeRate;
                  console.log(
                    `[Individual Fee Payment] PaymentIntent sem charge, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`,
                  );
                }
              }
            }
          } catch (stripeError) {
            console.error(
              "[Individual Fee Payment] Erro ao buscar valor líquido do Stripe:",
              stripeError,
            );
            // Fallback: usar exchange_rate do metadata (apenas para BRL)
            if (currency === "BRL" && session.metadata?.exchange_rate) {
              const exchangeRate = parseFloat(session.metadata.exchange_rate);
              if (exchangeRate > 0) {
                paymentAmount = paymentAmountRaw / exchangeRate;
                console.log(
                  `[Individual Fee Payment] Erro ao buscar do Stripe, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`,
                );
              }
            }
          }
        } else if (
          (currency === "BRL" || paymentMethod === "pix") &&
          !shouldFetchNetAmount
        ) {
          // Em produção (ou quando desativado), usar exchange_rate do metadata
          console.log(
            `⚠️ Busca de valor líquido DESATIVADA (ambiente: ${config.environment.environment}), usando exchange_rate do metadata`,
          );
          if (session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              paymentAmount = paymentAmountRaw / exchangeRate;
              console.log(
                `[Individual Fee Payment] Usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`,
              );
            }
          }
        } else if (currency === "BRL" && session.metadata?.exchange_rate) {
          // Para outros pagamentos BRL (não PIX), usar exchange_rate do metadata
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            paymentAmount = paymentAmountRaw / exchangeRate;
            console.log(
              `[Individual Fee Payment] Convertendo BRL para USD: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`,
            );
          }
        } else {
          // Debug: Se não entrou em nenhum bloco
          console.log(
            `[Individual Fee Payment] DEBUG - Não entrou em nenhum bloco de conversão. currency: ${currency}, paymentMethod: ${paymentMethod}, hasExchangeRate: ${!!session
              .metadata?.exchange_rate}`,
          );
        }

        console.log(
          "[Individual Fee Payment] Recording selection_process fee payment...",
        );
        console.log(
          `[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD (líquido): ${paymentAmount} USD${
            grossAmountUsd ? `, Valor bruto: ${grossAmountUsd} USD` : ""
          }${feeAmountUsd ? `, Taxas: ${feeAmountUsd} USD` : ""}`,
        );
        const { data: insertResult, error: insertError } = await supabase.rpc(
          "insert_individual_fee_payment",
          {
            p_user_id: userId,
            p_fee_type: "selection_process",
            p_amount: paymentAmount, // Valor líquido em USD (após taxas e conversão para PIX)
            p_payment_date: paymentDate,
            p_payment_method: "stripe",
            p_payment_intent_id: paymentIntentId,
            p_stripe_charge_id: null,
            p_zelle_payment_id: null,
            p_gross_amount_usd: grossAmountUsd, // Valor bruto em USD (quando disponível)
            p_fee_amount_usd: feeAmountUsd, // Taxas em USD (quando disponível)
          },
        );

        if (insertError) {
          console.warn(
            "[Individual Fee Payment] Warning: Could not record fee payment:",
            insertError,
          );
        } else {
          console.log(
            "[Individual Fee Payment] Selection process fee recorded successfully:",
            insertResult,
          );
          individualFeePaymentId = insertResult?.id || null;
        }
      } catch (recordError) {
        console.warn(
          "[Individual Fee Payment] Warning: Failed to record individual fee payment:",
          recordError,
        );
        // Não quebra o fluxo - continua normalmente
      }

      // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

      // Log the payment action
      try {
        const { data: userProfile } = await supabase.from("user_profiles")
          .select("id, full_name").eq("user_id", userId).single();
        if (userProfile) {
          await supabase.rpc("log_student_action", {
            p_student_id: userProfile.id,
            p_action_type: "fee_payment",
            p_action_description:
              `Selection Process Fee paid via Stripe (${sessionId})`,
            p_performed_by: userId,
            p_performed_by_type: "student",
            p_metadata: {
              fee_type: "selection_process",
              payment_method: "stripe",
              amount: session.amount_total / 100,
              session_id: sessionId,
              application_id: applicationId,
            },
          });
        }
      } catch (logError) {
        console.error("Failed to log payment action:", logError);
      }
      // Se houver applicationId, atualiza a aplicação
      if (applicationId) {
        const { error: updateError } = await supabase.from(
          "scholarship_applications",
        ).update({
          status: "selection_process_paid",
        }).eq("student_id", userId).eq("id", applicationId);
        if (updateError) {
          throw new Error(
            `Failed to update application status for selection process fee: ${updateError.message}`,
          );
        }
      }
      // Verifica se o usuário utilizou algum código de referência
      const { data: usedCode, error: usedError } = await supabase.from(
        "used_referral_codes",
      ).select("*").eq("user_id", userId).order("applied_at", {
        ascending: false,
      }).limit(1).maybeSingle();
      if (usedError) {
        console.error("Error fetching used_referral_codes:", usedError);
      }
      if (usedCode && usedCode.referrer_id) {
        const referrerId = usedCode.referrer_id;
        console.log(
          "[Referral Tracking] Found referrer:",
          referrerId,
          "affiliate_code:",
          usedCode.affiliate_code,
        );

        // Obter nome/email do usuário que pagou (referred)
        let referredDisplayName = "";
        try {
          const { data: referredProfile } = await supabase.from("user_profiles")
            .select("full_name").eq("user_id", userId).maybeSingle();
          if (referredProfile?.full_name) {
            referredDisplayName = referredProfile.full_name;
          } else {
            const { data: authUser } = await supabase.auth.admin.getUserById(
              userId,
            );
            referredDisplayName = authUser?.user?.email || userId;
          }
        } catch (e) {
          console.warn(
            "[Referral Tracking] Could not resolve referred user name, using ID. Error:",
            e,
          );
          referredDisplayName = userId;
        }

        // ✅ NOVO: Atualizar status para 'selection_process_paid' ao invés de creditar coins
        console.log(
          "[Referral Tracking] Updating referral status to selection_process_paid...",
        );
        try {
          await supabase.rpc("update_referral_status", {
            p_referred_user_id: userId,
            p_new_status: "selection_process_paid",
            p_timestamp: new Date().toISOString(),
          });
          console.log("[Referral Tracking] ✅ Status updated successfully");

          // Enviar notificação de progresso para o padrinho
          try {
            const { data: referrerProfile } = await supabase
              .from("user_profiles")
              .select("full_name, email")
              .eq("user_id", referrerId)
              .single();

            const { data: referredProfileData } = await supabase
              .from("user_profiles")
              .select("email")
              .eq("user_id", userId)
              .single();

            if (referrerProfile?.email) {
              const progressPayload = {
                tipo_notf:
                  "Progresso de Indicacao - Selection Process Fee Pago",
                email_aluno: referrerProfile.email,
                nome_aluno: referrerProfile.full_name || "Aluno",
                referred_student_name: referredDisplayName,
                referred_student_email: referredProfileData?.email || "",
                payment_method: "Stripe",
                fee_type: "Selection Process Fee",
                o_que_enviar:
                  `Good news! Your friend ${referredDisplayName} has paid the Selection Process Fee. You'll receive 180 MatriculaCoins when they complete the I20 payment!`,
              };

              console.log(
                "📤 [Referral Tracking] Enviando notificação de progresso para o padrinho...",
              );
              await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(progressPayload),
              });
              console.log(
                "✅ [Referral Tracking] Notificação de progresso enviada com sucesso!",
              );
            }
          } catch (progressNotifError) {
            console.error(
              "❌ [Referral Tracking] Erro ao enviar notificação de progresso:",
              progressNotifError,
            );
          }
        } catch (statusError) {
          console.error(
            "[Referral Tracking] ❌ Failed to update referral status:",
            statusError,
          );
        }
      } else {
        console.log(
          "[Referral Tracking] No used referral code found for this user.",
        );
      }
      // Limpa carrinho
      const { error: cartError } = await supabase.from("user_cart").delete().eq(
        "user_id",
        userId,
      );
      if (cartError) {
        throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      }

      // Verificar novamente ANTES de criar o log de notificações (proteção contra race condition)
      const { data: preCheckLogs } = await supabase
        .from("student_action_logs")
        .select("id, metadata")
        .eq("action_type", "fee_payment")
        .eq("metadata->>session_id", sessionId);

      if (preCheckLogs && preCheckLogs.length > 0) {
        const hasNotificationLog = preCheckLogs.some((log: any) => {
          const metadata = log.metadata || {};
          return metadata.notifications_sending === true ||
            metadata.notifications_sent === true;
        });

        if (hasNotificationLog) {
          console.log(
            `[DUPLICAÇÃO] Notificações já estão sendo enviadas ou foram enviadas para session ${sessionId}, retornando sucesso.`,
          );
          return corsResponse({
            status: "complete",
            message: "Notifications already being sent or sent",
          }, 200);
        }
      }

      // Criar log de "notificações sendo enviadas" ANTES de enviar para evitar duplicação
      // Isso marca que o processamento de notificações está em andamento
      try {
        const { data: userProfile } = await supabase.from("user_profiles")
          .select("id, full_name").eq("user_id", userId).single();
        if (userProfile) {
          const { error: notificationLogError } = await supabase.rpc(
            "log_student_action",
            {
              p_student_id: userProfile.id,
              p_action_type: "fee_payment",
              p_action_description:
                `Selection Process Fee notifications sending started (${sessionId})`,
              p_performed_by: userId,
              p_performed_by_type: "student",
              p_metadata: {
                fee_type: "selection_process",
                payment_method: "stripe",
                amount: session.amount_total ? session.amount_total / 100 : 0,
                session_id: sessionId,
                notifications_sending: true,
              },
            },
          );

          if (notificationLogError) {
            // Se falhar ao criar log, verificar novamente se já existe (race condition)
            const { data: recheckLogs } = await supabase
              .from("student_action_logs")
              .select("id, metadata")
              .eq("action_type", "fee_payment")
              .eq("metadata->>session_id", sessionId);

            if (recheckLogs && recheckLogs.length > 0) {
              const hasNotificationLog = recheckLogs.some((log: any) => {
                const metadata = log.metadata || {};
                return metadata.notifications_sending === true ||
                  metadata.notifications_sent === true;
              });

              if (hasNotificationLog) {
                console.log(
                  `[DUPLICAÇÃO] Notificações já estão sendo enviadas ou foram enviadas para session ${sessionId}, retornando sucesso.`,
                );
                return corsResponse({
                  status: "complete",
                  message: "Notifications already being sent or sent",
                }, 200);
              }
            }
            console.error(
              "[DUPLICAÇÃO] Erro ao criar log de notificações, mas continuando:",
              notificationLogError,
            );
          } else {
            console.log(
              "[DUPLICAÇÃO] Log de envio de notificações criado para evitar duplicação",
            );

            // Verificar novamente após criar o log para garantir que não há duplicação
            // (em caso de race condition onde dois eventos criaram o log simultaneamente)
            const { data: verifyLogs } = await supabase
              .from("student_action_logs")
              .select("id, metadata")
              .eq("action_type", "fee_payment")
              .eq("metadata->>session_id", sessionId);

            if (verifyLogs && verifyLogs.length > 0) {
              const notificationLogs = verifyLogs.filter((log: any) => {
                const metadata = log.metadata || {};
                return metadata.notifications_sending === true ||
                  metadata.notifications_sent === true;
              });

              if (notificationLogs.length > 1) {
                console.log(
                  `[DUPLICAÇÃO] Múltiplos logs de notificações detectados para session ${sessionId}, retornando sucesso para evitar duplicação.`,
                );
                return corsResponse({
                  status: "complete",
                  message:
                    "Multiple notification logs detected, avoiding duplication",
                }, 200);
              }
            }
          }
        }
      } catch (logError) {
        console.error(
          "[DUPLICAÇÃO] Erro ao criar log de notificações:",
          logError,
        );
        // Verificar se já existe um log antes de continuar
        const { data: allLogs } = await supabase
          .from("student_action_logs")
          .select("id, metadata")
          .eq("action_type", "fee_payment")
          .eq("metadata->>session_id", sessionId);

        if (allLogs && allLogs.length > 0) {
          const hasNotificationLog = allLogs.some((log: any) => {
            const metadata = log.metadata || {};
            return metadata.notifications_sending === true ||
              metadata.notifications_sent === true;
          });

          if (hasNotificationLog) {
            console.log(
              `[DUPLICAÇÃO] Notificações já estão sendo enviadas ou foram enviadas para session ${sessionId}, retornando sucesso.`,
            );
            return corsResponse({
              status: "complete",
              message: "Notifications already being sent or sent",
            }, 200);
          }
        }
      }

      // --- NOTIFICAÇÕES VIA WEBHOOK N8N (para PIX e cartão) ---
      try {
        console.log(
          `📤 [verify-stripe-session-selection-process-fee] Iniciando notificações...`,
        );
        // Detectar ambiente de desenvolvimento
        const isDevelopment = config.environment.isTest ||
          config.environment.environment === "test";

        // Buscar dados do aluno (incluindo seller_referral_code)
        const { data: alunoData, error: alunoError } = await supabase.from(
          "user_profiles",
        ).select("id, full_name, email, seller_referral_code").eq(
          "user_id",
          userId,
        ).single();
        // Buscar todos os admins do sistema
        // Em ambiente de desenvolvimento (test), filtrar emails específicos
        const admins = await getAllAdmins(supabase, isDevelopment);
        if (alunoError || !alunoData) {
          console.error(
            "[NOTIFICAÇÃO] Erro ao buscar dados do aluno:",
            alunoError,
          );
          return corsResponse({
            status: "complete",
            message: "Session verified and processed successfully.",
          }, 200);
        }
        // Send term acceptance notification with PDF after successful payment
        try {
          console.log(
            "[NOTIFICAÇÃO] Enviando notificação de aceitação de termos...",
          );
          await sendTermAcceptanceNotificationAfterPayment(
            userId,
            "selection_process",
            isDevelopment,
          );
          console.log(
            "[NOTIFICAÇÃO] Notificação de aceitação de termos enviada com sucesso!",
          );
        } catch (notificationError) {
          console.error(
            "[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:",
            notificationError,
          );
          // Continue with other notifications even if term acceptance fails
        }
        // 1. NOTIFICAÇÃO PARA O ALUNO
        const currencyInfo = getCurrencyInfo(session);
        const amountValue = session.amount_total / 100;
        const formattedAmount = formatAmountWithCurrency(amountValue, session);

        // Detectar método de pagamento para campo interno (pix ou stripe)
        const isPixPayment = session.payment_method_types?.includes("pix") ||
          session.metadata?.payment_method === "pix";
        const paymentMethodForNotification = isPixPayment ? "pix" : "stripe";

        const alunoNotificationPayload = {
          tipo_notf: "Pagamento de selection process confirmado",
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          o_que_enviar:
            `O pagamento da taxa de processo seletivo foi confirmado para ${alunoData.full_name}. Agora você pode selecionar as escolas para aplicar.`,
          payment_id: sessionId,
          fee_type: "selection_process",
          amount: amountValue,
          currency: currencyInfo.currency,
          currency_symbol: currencyInfo.symbol,
          formatted_amount: formattedAmount,
          payment_method: paymentMethodForNotification,
        };
        console.log(
          "[NOTIFICAÇÃO ALUNO] Enviando notificação para aluno:",
          alunoNotificationPayload,
        );
        const alunoNotificationResponse = await fetch(
          "https://nwh.suaiden.com/webhook/notfmatriculausa",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "PostmanRuntime/7.36.3",
            },
            body: JSON.stringify(alunoNotificationPayload),
          },
        );
        const alunoResult = await alunoNotificationResponse.text();
        console.log(
          "[NOTIFICAÇÃO ALUNO] Resposta do n8n (aluno):",
          alunoNotificationResponse.status,
          alunoResult,
        );

        // ✅ IN-APP NOTIFICATION FOR STUDENT (Selection Process Fee)
        try {
          if (alunoData?.id) {
            console.log(
              "[NOTIFICAÇÃO ALUNO] Criando notificação in-app de pagamento...",
            );
            const { error: inAppError } = await supabase
              .from("student_notifications")
              .insert({
                student_id: alunoData.id,
                title: "Payment Confirmed",
                message:
                  "Your Selection Process Fee has been confirmed. You can now proceed to select your schools.",
                link: "/student/dashboard/scholarships", // Redirect to applications to enhance flow
                // is_read removed to use database default
                created_at: new Date().toISOString(),
              });

            if (inAppError) {
              console.error(
                "[NOTIFICAÇÃO ALUNO] Erro ao criar notificação in-app:",
                inAppError,
              );
            } else {
              console.log(
                "[NOTIFICAÇÃO ALUNO] Notificação in-app criada com sucesso!",
              );
            }
          } else {
            console.warn(
              "[NOTIFICAÇÃO ALUNO] Dados do aluno (ID) não encontrados para notificação in-app.",
            );
          }
        } catch (inAppEx) {
          console.error(
            "[NOTIFICAÇÃO ALUNO] Exceção ao criar notificação in-app:",
            inAppEx,
          );
        }
        // 2. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(
          `📤 [verify-stripe-session-selection-process-fee] DEBUG - alunoData.seller_referral_code:`,
          alunoData.seller_referral_code,
        );
        console.log(
          `📤 [verify-stripe-session-selection-process-fee] DEBUG - alunoData completo:`,
          alunoData,
        );
        if (alunoData.seller_referral_code) {
          console.log(
            `📤 [verify-stripe-session-selection-process-fee] ✅ CÓDIGO SELLER ENCONTRADO! Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`,
          );
          // Buscar informações do seller através do seller_referral_code
          console.log(
            `📤 [verify-stripe-session-selection-process-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`,
          );
          // Query simplificada para evitar erro de relacionamento
          const { data: sellerData, error: sellerError } = await supabase.from(
            "sellers",
          ).select(`
              id,
              user_id,
              name,
              email,
              referral_code,
              commission_rate,
              affiliate_admin_id
            `).eq("referral_code", alunoData.seller_referral_code).single();
          console.log(
            `📤 [verify-stripe-session-selection-process-fee] Resultado da busca do seller:`,
            {
              sellerData,
              sellerError,
            },
          );
          if (sellerData && !sellerError) {
            console.log(
              `📤 [verify-stripe-session-selection-process-fee] ✅ SELLER ENCONTRADO! Dados:`,
              sellerData,
            );
            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = {
              user_id: "",
              email: "",
              name: "Affiliate Admin",
              phone: "",
            };
            if (sellerData.affiliate_admin_id) {
              console.log(
                `📤 [verify-stripe-session-selection-process-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`,
              );
              const { data: affiliateData, error: affiliateError } =
                await supabase.from("affiliate_admins").select("user_id").eq(
                  "id",
                  sellerData.affiliate_admin_id,
                ).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } =
                  await supabase.from("user_profiles").select(
                    "email, full_name, phone",
                  ).eq("user_id", affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    user_id: affiliateData.user_id,
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin",
                    phone: affiliateProfile.phone || "",
                  };
                  console.log(
                    `📤 [verify-stripe-session-selection-process-fee] Affiliate admin encontrado:`,
                    affiliateAdminData,
                  );
                }
              }
            }
            // NOTIFICAÇÕES SEPARADAS PARA ADMIN, SELLER E AFFILIATE ADMIN
            // 1. NOTIFICAÇÃO PARA TODOS OS ADMINS
            // Detectar método de pagamento para campo interno (pix ou stripe)
            const isPixPayment =
              session.payment_method_types?.includes("pix") ||
              session.metadata?.payment_method === "pix";
            const paymentMethodForNotification = isPixPayment
              ? "pix"
              : "stripe";

            const adminNotificationPromises = admins.map(async (admin) => {
              const adminNotificationPayload = {
                tipo_notf:
                  "Pagamento Stripe de selection process confirmado - Admin",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                o_que_enviar:
                  `Pagamento Stripe de selection process no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code}). Affiliate: ${affiliateAdminData.name}`,
                payment_id: sessionId,
                fee_type: "selection_process",
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: paymentMethodForNotification,
                notification_type: "admin",
              };
              console.log(
                `📧 [verify-stripe-session-selection-process-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN ${admin.email}:`,
                adminNotificationPayload,
              );
              const adminNotificationResponse = await fetch(
                "https://nwh.suaiden.com/webhook/notfmatriculausa",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "PostmanRuntime/7.36.3",
                  },
                  body: JSON.stringify(adminNotificationPayload),
                },
              );
              if (adminNotificationResponse.ok) {
                const adminResult = await adminNotificationResponse.text();
                console.log(
                  `📧 [verify-stripe-session-selection-process-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`,
                  adminResult,
                );
              } else {
                const adminError = await adminNotificationResponse.text();
                console.error(
                  `📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`,
                  adminError,
                );
              }

              // ✅ IN-APP NOTIFICATION FOR ADMIN
              if (admin.user_id) {
                try {
                  const { error: insertError } = await supabase.from(
                    "admin_notifications",
                  ).insert({
                    user_id: admin.user_id,
                    title: "New Selection Process Payment",
                    message:
                      `Student ${alunoData.full_name} has paid the Selection Process Fee (${formattedAmount}).`,
                    type: "payment",
                    link: "/admin/dashboard/payments",
                    metadata: {
                      student_id: alunoData.id,
                      student_name: alunoData.full_name,
                      amount: amountValue,
                      fee_type: "selection_process",
                      payment_id: sessionId,
                    },
                  });

                  if (insertError) {
                    console.error(
                      `[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`,
                      insertError,
                    );
                  } else {
                    console.log(
                      `[NOTIFICAÇÃO ADMIN] ✅ In-app notification criada com sucesso para admin ${admin.email} (ID: ${admin.user_id})`,
                    );
                  }
                } catch (adminInAppErr) {
                  console.error(
                    `[NOTIFICAÇÃO ADMIN] Exceção ao criar in-app notification para admin ${admin.email}:`,
                    adminInAppErr,
                  );
                }
              } else {
                console.warn(
                  `[NOTIFICAÇÃO ADMIN] ⚠️ Admin ${admin.email} não possui user_id, pulando in-app notification.`,
                );
              }
            });
            await Promise.allSettled(adminNotificationPromises);
            // 2. NOTIFICAÇÃO PARA SELLER
            // Buscar telefone do seller
            const { data: sellerProfile, error: sellerProfileError } =
              await supabase.from("user_profiles").select("phone").eq(
                "user_id",
                sellerData.user_id,
              ).single();
            const sellerPhone = sellerProfile?.phone || "";
            const sellerNotificationPayload = {
              tipo_notf:
                "Pagamento Stripe de selection process confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar:
                `Parabéns! Seu aluno ${alunoData.full_name} pagou a taxa de selection process no valor de ${formattedAmount}. Sua comissão será calculada em breve.`,
              payment_id: sessionId,
              fee_type: "selection_process",
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: paymentMethodForNotification,
              notification_type: "seller",
            };
            console.log(
              "📧 [verify-stripe-session-selection-process-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA SELLER:",
              sellerNotificationPayload,
            );
            const sellerNotificationResponse = await fetch(
              "https://nwh.suaiden.com/webhook/notfmatriculausa",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "PostmanRuntime/7.36.3",
                },
                body: JSON.stringify(sellerNotificationPayload),
              },
            );
            if (sellerNotificationResponse.ok) {
              const sellerResult = await sellerNotificationResponse.text();
              console.log(
                "📧 [verify-stripe-session-selection-process-fee] Notificação para SELLER enviada com sucesso:",
                sellerResult,
              );
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error(
                "📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para SELLER:",
                sellerError,
              );
            }
            // ✅ IN-APP NOTIFICATION FOR SELLER
            if (sellerData.user_id) {
              try {
                await supabase.from("admin_notifications").insert({
                  user_id: sellerData.user_id,
                  title: "New Commission Potential",
                  message:
                    `Your student ${alunoData.full_name} has paid the Selection Process Fee (${formattedAmount}).`,
                  type: "payment",
                  link: "/admin/dashboard/users",
                  metadata: {
                    student_id: alunoData.id,
                    student_name: alunoData.full_name,
                    amount: amountValue,
                    fee_type: "selection_process",
                    payment_id: sessionId,
                  },
                });
              } catch (sellerInAppErr) {
                console.error(
                  `[NOTIFICAÇÃO SELLER] Erro ao criar in-app notification para seller ${sellerData.email}:`,
                  sellerInAppErr,
                );
              }
            }
            // 3. NOTIFICAÇÃO PARA AFFILIATE ADMIN (se houver)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf:
                  "Pagamento Stripe de selection process confirmado - Affiliate Admin",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                o_que_enviar:
                  `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de selection process no valor de ${formattedAmount} do aluno ${alunoData.full_name}.`,
                payment_id: sessionId,
                fee_type: "selection_process",
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: paymentMethodForNotification,
                notification_type: "affiliate_admin",
              };
              console.log(
                "📧 [verify-stripe-session-selection-process-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA AFFILIATE ADMIN:",
                affiliateNotificationPayload,
              );
              const affiliateNotificationResponse = await fetch(
                "https://nwh.suaiden.com/webhook/notfmatriculausa",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "PostmanRuntime/7.36.3",
                  },
                  body: JSON.stringify(affiliateNotificationPayload),
                },
              );
              if (affiliateNotificationResponse.ok) {
                const affiliateResult = await affiliateNotificationResponse
                  .text();
                console.log(
                  "📧 [verify-stripe-session-selection-process-fee] Notificação para AFFILIATE ADMIN enviada com sucesso:",
                  affiliateResult,
                );
              } else {
                const affiliateError = await affiliateNotificationResponse
                  .text();
                console.error(
                  "📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para AFFILIATE ADMIN:",
                  affiliateError,
                );
              }
              // ✅ IN-APP NOTIFICATION FOR AFFILIATE ADMIN
              if (affiliateAdminData.user_id) {
                try {
                  await supabase.from("admin_notifications").insert({
                    user_id: affiliateAdminData.user_id,
                    title: "Affiliate Payment",
                    message:
                      `A student from your network (${alunoData.full_name}) has paid the Selection Process Fee (${formattedAmount}).`,
                    type: "payment",
                    link: "/admin/dashboard/affiliate-management",
                    metadata: {
                      student_id: alunoData.id,
                      student_name: alunoData.full_name,
                      amount: amountValue,
                      fee_type: "selection_process",
                      payment_id: sessionId,
                    },
                  });
                } catch (affiliateInAppErr) {
                  console.error(
                    `[NOTIFICAÇÃO AFFILIATE] Erro ao criar in-app notification para affiliate ${affiliateAdminData.email}:`,
                    affiliateInAppErr,
                  );
                }
              }
            } else {
              console.log(
                "📧 [verify-stripe-session-selection-process-fee] Não há affiliate admin para notificar",
              );
            }
          } else {
            console.log(
              `📤 [verify-stripe-session-selection-process-fee] ❌ SELLER NÃO ENCONTRADO para seller_referral_code: ${alunoData.seller_referral_code}`,
            );
            console.log(
              `📤 [verify-stripe-session-selection-process-fee] ❌ ERRO na busca do seller:`,
              sellerError,
            );

            // Notificação para todos os admins quando NÃO há seller
            const currencyInfo = getCurrencyInfo(session);
            const amountValue = session.amount_total / 100;
            const formattedAmount = formatAmountWithCurrency(
              amountValue,
              session,
            );

            // Detectar método de pagamento para campo interno (pix ou stripe)
            const isPixPayment =
              session.payment_method_types?.includes("pix") ||
              session.metadata?.payment_method === "pix";
            const paymentMethodForNotification = isPixPayment
              ? "pix"
              : "stripe";

            const adminNotificationPromises = admins.map(async (admin) => {
              const adminNotificationPayload = {
                tipo_notf:
                  "Pagamento Stripe de selection process confirmado - Admin",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                o_que_enviar:
                  `Pagamento Stripe de selection process no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso.`,
                payment_id: sessionId,
                fee_type: "selection_process",
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                payment_method: paymentMethodForNotification,
                notification_type: "admin",
              };
              console.log(
                `📧 [verify-stripe-session-selection-process-fee] Enviando notificação para admin ${admin.email} (sem seller):`,
                adminNotificationPayload,
              );
              const adminNotificationResponse = await fetch(
                "https://nwh.suaiden.com/webhook/notfmatriculausa",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "PostmanRuntime/7.36.3",
                  },
                  body: JSON.stringify(adminNotificationPayload),
                },
              );
              if (adminNotificationResponse.ok) {
                const adminResult = await adminNotificationResponse.text();
                console.log(
                  `📧 [verify-stripe-session-selection-process-fee] Notificação para admin ${admin.email} enviada com sucesso:`,
                  adminResult,
                );
              } else {
                const adminError = await adminNotificationResponse.text();
                console.error(
                  `📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para admin ${admin.email}:`,
                  adminError,
                );
              }

              // ✅ IN-APP NOTIFICATION FOR ADMIN
              if (admin.user_id) {
                try {
                  const { error: insertError } = await supabase.from(
                    "admin_notifications",
                  ).insert({
                    user_id: admin.user_id,
                    title: "New Selection Process Payment",
                    message:
                      `Student ${alunoData.full_name} has paid the Selection Process Fee (${formattedAmount}).`,
                    type: "payment",
                    link: "/admin/dashboard/payments",
                    metadata: {
                      student_id: alunoData.id,
                      student_name: alunoData.full_name,
                      amount: amountValue,
                      fee_type: "selection_process",
                      payment_id: sessionId,
                    },
                  });

                  if (insertError) {
                    console.error(
                      `[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`,
                      insertError,
                    );
                  } else {
                    console.log(
                      `[NOTIFICAÇÃO ADMIN] ✅ In-app notification criada com sucesso para admin ${admin.email} (ID: ${admin.user_id})`,
                    );
                  }
                } catch (adminInAppErr) {
                  console.error(
                    `[NOTIFICAÇÃO ADMIN] Exceção ao criar in-app notification para admin ${admin.email}:`,
                    adminInAppErr,
                  );
                }
              } else {
                console.warn(
                  `[NOTIFICAÇÃO ADMIN] ⚠️ Admin ${admin.email} não possui user_id, pulando in-app notification.`,
                );
              }
            });
            await Promise.allSettled(adminNotificationPromises);
          }
        } else {
          console.log(
            `📤 [verify-stripe-session-selection-process-fee] ❌ NENHUM SELLER_REFERRAL_CODE encontrado, não há seller para notificar`,
          );

          // Notificação para todos os admins quando NÃO há seller_referral_code
          const currencyInfo = getCurrencyInfo(session);
          const amountValue = session.amount_total / 100;
          const formattedAmount = formatAmountWithCurrency(
            amountValue,
            session,
          );

          // Detectar método de pagamento para campo interno (pix ou stripe)
          const isPixPayment = session.payment_method_types?.includes("pix") ||
            session.metadata?.payment_method === "pix";
          const paymentMethodForNotification = isPixPayment ? "pix" : "stripe";

          const adminNotificationPromises = admins.map(async (admin) => {
            const adminNotificationPayload = {
              tipo_notf:
                "Pagamento Stripe de selection process confirmado - Admin",
              email_admin: admin.email,
              nome_admin: admin.full_name,
              phone_admin: admin.phone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar:
                `Pagamento Stripe de selection process no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso.`,
              payment_id: sessionId,
              fee_type: "selection_process",
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              payment_method: paymentMethodForNotification,
              notification_type: "admin",
            };
            console.log(
              `📧 [verify-stripe-session-selection-process-fee] Enviando notificação para admin ${admin.email} (sem seller):`,
              adminNotificationPayload,
            );
            const adminNotificationResponse = await fetch(
              "https://nwh.suaiden.com/webhook/notfmatriculausa",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "PostmanRuntime/7.36.3",
                },
                body: JSON.stringify(adminNotificationPayload),
              },
            );
            if (adminNotificationResponse.ok) {
              const adminResult = await adminNotificationResponse.text();
              console.log(
                `📧 [verify-stripe-session-selection-process-fee] Notificação para admin ${admin.email} enviada com sucesso:`,
                adminResult,
              );
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error(
                `📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para admin ${admin.email}:`,
                adminError,
              );
            }

            // ✅ IN-APP NOTIFICATION FOR ADMIN
            // ✅ IN-APP NOTIFICATION FOR ADMIN
            if (admin.user_id) {
              try {
                const { error: insertError } = await supabase.from(
                  "admin_notifications",
                ).insert({
                  user_id: admin.user_id,
                  title: "New Selection Process Payment",
                  message:
                    `Student ${alunoData.full_name} has paid the Selection Process Fee (${formattedAmount}).`,
                  type: "payment",
                  link: "/admin/dashboard/payments",
                  metadata: {
                    student_id: alunoData.id,
                    student_name: alunoData.full_name,
                    amount: amountValue,
                    fee_type: "selection_process",
                    payment_id: sessionId,
                  },
                });

                if (insertError) {
                  console.error(
                    `[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`,
                    insertError,
                  );
                } else {
                  console.log(
                    `[NOTIFICAÇÃO ADMIN] ✅ In-app notification criada com sucesso para admin ${admin.email} (ID: ${admin.user_id})`,
                  );
                }
              } catch (adminInAppErr) {
                console.error(
                  `[NOTIFICAÇÃO ADMIN] Exceção ao criar in-app notification para admin ${admin.email}:`,
                  adminInAppErr,
                );
              }
            } else {
              console.warn(
                `[NOTIFICAÇÃO ADMIN] ⚠️ Admin ${admin.email} não possui user_id, pulando in-app notification.`,
              );
            }
          });
          await Promise.allSettled(adminNotificationPromises);
        }
      } catch (notifErr) {
        console.error(
          "[NOTIFICAÇÃO] Erro ao notificar selection process via n8n:",
          notifErr,
        );
      }

      // Atualizar log para marcar que as notificações foram enviadas
      try {
        const { data: userProfile } = await supabase.from("user_profiles")
          .select("id, full_name").eq("user_id", userId).single();
        if (userProfile) {
          await supabase.rpc("log_student_action", {
            p_student_id: userProfile.id,
            p_action_type: "fee_payment",
            p_action_description:
              `Selection Process Fee paid via Stripe (${sessionId}) - Notifications sent`,
            p_performed_by: userId,
            p_performed_by_type: "student",
            p_metadata: {
              fee_type: "selection_process",
              payment_method: "stripe",
              amount: session.amount_total ? session.amount_total / 100 : 0,
              session_id: sessionId,
              notifications_sent: true,
            },
          });
          console.log(
            "[DUPLICAÇÃO] Log de conclusão criado após envio de notificações",
          );
        }
      } catch (logError) {
        console.error("Failed to log payment completion:", logError);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      // Para PIX, retornar resposta especial que força redirecionamento
      if (paymentMethod === "pix") {
        console.log("[PIX] Forçando redirecionamento para PIX...");
        // Extrair informações do pagamento para retornar ao frontend
        const amountPaid = session.amount_total
          ? session.amount_total / 100
          : null;
        const currency = session.currency?.toUpperCase() || "USD";
        const promotionalCouponReturn = session.metadata?.promotional_coupon ||
          null;
        const originalAmountReturn = session.metadata?.original_amount
          ? parseFloat(session.metadata.original_amount)
          : null;
        const finalAmountReturn = session.metadata?.final_amount
          ? parseFloat(session.metadata.final_amount)
          : null;

        // Se for PIX (BRL), converter para USD usando a taxa de câmbio do metadata
        let amountPaidUSD = amountPaid || 0;
        if (
          currency === "BRL" && session.metadata?.exchange_rate && amountPaid
        ) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            amountPaidUSD = amountPaid / exchangeRate;
          }
        }

        // Obter gross_amount_usd do metadata (valor bruto que o aluno realmente pagou, com markup)
        // IMPORTANTE: Se for PIX, o gross_amount está em BRL, precisa converter para USD
        let grossAmountUsdFromMetadata: number | null = null;
        if (session.metadata?.gross_amount) {
          const grossAmountRaw = parseFloat(session.metadata.gross_amount);
          // Se for PIX (currency BRL), converter para USD usando exchange_rate
          if (currency === "BRL" && session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              grossAmountUsdFromMetadata = grossAmountRaw / exchangeRate;
              console.log(
                `[verify-stripe-session-selection-process-fee] 💱 Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`,
              );
            } else {
              grossAmountUsdFromMetadata = grossAmountRaw; // Fallback se exchange_rate inválido
            }
          } else {
            // Se não for PIX, já está em USD
            grossAmountUsdFromMetadata = grossAmountRaw;
          }
        }
        const grossAmountUsd = grossAmountUsdFromMetadata || amountPaidUSD ||
          amountPaid || 0;

        return corsResponse({
          status: "complete",
          message: "PIX payment verified and processed successfully.",
          payment_method: "pix",
          redirect_required: true,
          redirect_url: "http://localhost:5173/student/dashboard/scholarships",
          amount_paid: amountPaidUSD || amountPaid || 0,
          gross_amount_usd: grossAmountUsd, // Valor bruto em USD (valor que o aluno realmente pagou, com markup)
          amount_paid_original: amountPaid || 0,
          currency: currency,
          promotional_coupon: promotionalCouponReturn,
          original_amount: originalAmountReturn,
          final_amount: finalAmountReturn,
        }, 200);
      }

      // Extrair informações do pagamento para retornar ao frontend
      const amountPaid = session.amount_total
        ? session.amount_total / 100
        : null;
      const currency = session.currency?.toUpperCase() || "USD";
      const promotionalCouponReturn = session.metadata?.promotional_coupon ||
        null;
      const originalAmountReturn = session.metadata?.original_amount
        ? parseFloat(session.metadata.original_amount)
        : null;
      const finalAmountReturn = session.metadata?.final_amount
        ? parseFloat(session.metadata.final_amount)
        : null;

      // Obter gross_amount_usd do metadata (valor bruto que o aluno realmente pagou, com markup)
      // IMPORTANTE: Se for PIX, o gross_amount está em BRL, precisa converter para USD
      let grossAmountUsdFromMetadata: number | null = null;
      if (session.metadata?.gross_amount) {
        const grossAmountRaw = parseFloat(session.metadata.gross_amount);
        // Se for PIX (currency BRL), converter para USD usando exchange_rate
        if (currency === "BRL" && session.metadata?.exchange_rate) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            grossAmountUsdFromMetadata = grossAmountRaw / exchangeRate;
            console.log(
              `[verify-stripe-session-selection-process-fee] 💱 Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`,
            );
          } else {
            grossAmountUsdFromMetadata = grossAmountRaw; // Fallback se exchange_rate inválido
          }
        } else {
          // Se não for PIX, já está em USD
          grossAmountUsdFromMetadata = grossAmountRaw;
        }
      }

      // Se for PIX (BRL), converter para USD usando a taxa de câmbio do metadata
      let amountPaidUSD = amountPaid || 0;
      if (currency === "BRL" && session.metadata?.exchange_rate && amountPaid) {
        const exchangeRate = parseFloat(session.metadata.exchange_rate);
        if (exchangeRate > 0) {
          amountPaidUSD = amountPaid / exchangeRate;
        }
      }

      // Priorizar gross_amount_usd do metadata (valor bruto pago), senão usar amountPaidUSD
      const grossAmountUsd = grossAmountUsdFromMetadata || amountPaidUSD ||
        amountPaid || 0;

      return corsResponse({
        status: "complete",
        message: "Session verified and processed successfully.",
        amount_paid: amountPaidUSD || amountPaid || 0, // Valor líquido em USD (após taxas)
        gross_amount_usd: grossAmountUsd, // Valor bruto em USD (valor que o aluno realmente pagou, com markup)
        amount_paid_original: amountPaid || 0, // Valor original na moeda da sessão
        currency: currency,
        promotional_coupon: promotionalCouponReturn,
        original_amount: originalAmountReturn,
        final_amount: finalAmountReturn,
      }, 200);
    }

    // Se chegou aqui, a sessão não está paga ou completa
    console.log("Session not paid or complete.");
    console.log("Session not ready.");
    return corsResponse({
      message: "Session not ready.",
      status: session.status,
      payment_status: session.payment_status,
    }, 202);
  } catch (error: any) {
    console.error("Unhandled error:", error.message);
    return corsResponse({
      error: "Internal Server Error",
      details: error.message,
    }, 500);
  }
});
