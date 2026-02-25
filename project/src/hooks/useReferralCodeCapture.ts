import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export const useReferralCodeCapture = () => {
  const location = useLocation();

  console.log("[useReferralCodeCapture] 🚀 Hook inicializado");

  useEffect(() => {
    const processReferralCode = async () => {
      console.log(
        "[useReferralCodeCapture] 🔍 Hook executado - pathname:",
        location.pathname,
        "search:",
        location.search,
      );
      console.log(
        "[useReferralCodeCapture] 🔍 URL completa:",
        window.location.href,
      );
      console.log(
        "[useReferralCodeCapture] 🔍 Timestamp:",
        new Date().toISOString(),
      );

      // NÃO executar na página de SellerStudentRegistration para evitar conflitos
      if (location.pathname === "/student/register") {
        console.log(
          "[useReferralCodeCapture] ⚠️ Página SellerStudentRegistration detectada, não executando hook",
        );
        return;
      }

      // Captura código de referência da URL em qualquer página
      const params = new URLSearchParams(location.search);
      const refCode = params.get("ref");
      const sellerRegCode = params.get("code"); // Código de registro de seller

      console.log("[useReferralCodeCapture] 🔍 Parâmetros da URL:", {
        refCode,
        sellerRegCode,
        search: location.search,
      });

      if (refCode) {
        console.log(
          "[useReferralCodeCapture] ✅ Código de referência detectado na URL:",
          refCode,
        );

        // ⚠️ IGNORAR códigos de Processo Seletivo (iniciam com sp_)
        // Estes códigos são internos para rastreamento de pagamento e não são indicações
        if (refCode.toLowerCase().startsWith("sp_")) {
          console.log(
            "[useReferralCodeCapture] ℹ️ Refência de Processo Seletivo (sp_) detectada. Ignorando como código de indicação.",
          );
          return;
        }
        // Detecta automaticamente o tipo de código baseado no formato
        // SUAIDEN e BRANT são códigos especiais de seller (Direct Sales)
        const directSalesCodes = ["SUAIDEN", "BRANT"];
        const isDirectSalesCode = directSalesCodes.includes(
          refCode.toUpperCase(),
        );

        // Verificar se é seller (incluindo Direct Sales)
        let isSellerCode = isDirectSalesCode || refCode.startsWith("SELLER_") ||
          refCode.length > 8;

        // Se não for claramente um seller, verificar na tabela sellers antes de classificar como rewards
        if (!isSellerCode && !refCode.startsWith("MATR")) {
          try {
            const { data: sellerCheck } = await supabase
              .from("sellers")
              .select("id")
              .eq("referral_code", refCode.toUpperCase())
              .eq("is_active", true)
              .maybeSingle();

            if (sellerCheck) {
              isSellerCode = true;
              console.log(
                "[useReferralCodeCapture] Código encontrado na tabela sellers, tratando como seller:",
                refCode,
              );
            }
          } catch (err) {
            console.error(
              "[useReferralCodeCapture] Erro ao verificar código na tabela sellers:",
              err,
            );
          }
        }

        const isMatriculaRewardsCode = !isDirectSalesCode && !isSellerCode &&
          (refCode.startsWith("MATR") ||
            (refCode.length <= 8 && /^[A-Z0-9]+$/.test(refCode)));

        console.log(
          "[useReferralCodeCapture] Análise do código de referência:",
          {
            code: refCode,
            isSellerCode,
            isMatriculaRewardsCode,
            length: refCode.length,
          },
        );

        // ✅ NOVO FLUXO UNIFICADO: Salvar ambos os tipos no mesmo campo
        if (isSellerCode || isMatriculaRewardsCode) {
          // ✅ Salvar código no campo único
          const existingCode = localStorage.getItem("pending_referral_code");
          if (!existingCode || existingCode !== refCode) {
            localStorage.setItem("pending_referral_code", refCode);
            // ✅ Salvar tipo para validação correta
            localStorage.setItem(
              "pending_referral_code_type",
              isSellerCode ? "seller" : "rewards",
            );
            console.log(
              "[useReferralCodeCapture] ✅ Código capturado:",
              refCode,
              "Tipo:",
              isSellerCode ? "seller" : "rewards",
            );
          }
        } else {
          // Código não reconhecido - tenta salvar como Matricula Rewards por padrão
          const existingCode = localStorage.getItem("pending_referral_code");
          if (!existingCode || existingCode !== refCode) {
            localStorage.setItem("pending_referral_code", refCode);
            localStorage.setItem("pending_referral_code_type", "rewards");
            console.log(
              "[useReferralCodeCapture] ⚠️ Código não reconhecido, salvo como Matricula Rewards:",
              refCode,
            );
          }
        }
      }

      // Captura código de registro de seller
      if (sellerRegCode) {
        console.log(
          "[useReferralCodeCapture] Código de registro de seller detectado na URL:",
          sellerRegCode,
        );

        const existingRegCode = localStorage.getItem(
          "pending_seller_registration_code",
        );
        if (!existingRegCode || existingRegCode !== sellerRegCode) {
          localStorage.setItem(
            "pending_seller_registration_code",
            sellerRegCode,
          );
          console.log(
            "[useReferralCodeCapture] ✅ Código de registro de seller capturado e salvo:",
            sellerRegCode,
          );
        }
      }

      // Log quando não há códigos de referência
      if (!refCode && !sellerRegCode) {
        console.log(
          "[useReferralCodeCapture] ℹ️ Nenhum código de referência encontrado na URL",
        );
      } else {
        console.log(
          "[useReferralCodeCapture] ✅ Códigos encontrados - refCode:",
          refCode,
          "sellerRegCode:",
          sellerRegCode,
        );
      }
    };

    processReferralCode();
  }, [location.search, location.pathname]);

  return null;
};
