import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export const useReferralCodeCapture = () => {
  const location = useLocation();

  useEffect(() => {
    const processReferralCode = async () => {
      // NÃO executar na página de SellerStudentRegistration para evitar conflitos
      if (location.pathname === "/student/register") {
        return;
      }

      // Captura código de referência da URL em qualquer página
      const params = new URLSearchParams(location.search);
      const refCode = params.get("ref");
      const sellerRegCode = params.get("code"); // Código de registro de seller

      if (refCode) {
        // ⚠️ IGNORAR códigos de Processo Seletivo (iniciam com sp_)
        if (refCode.toLowerCase().startsWith("sp_")) {
          return;
        }

        // Detecta automaticamente o tipo de código baseado no formato
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
            }
          } catch (err) {
            // Silencioso
          }
        }

        const isMatriculaRewardsCode = !isDirectSalesCode && !isSellerCode &&
          (refCode.startsWith("MATR") ||
            (refCode.length <= 8 && /^[A-Z0-9]+$/.test(refCode)));

        // ✅ NOVO FLUXO UNIFICADO: Salvar ambos os tipos no mesmo campo
        if (isSellerCode || isMatriculaRewardsCode) {
          const existingCode = localStorage.getItem("pending_referral_code");
          if (!existingCode || existingCode !== refCode) {
            localStorage.setItem("pending_referral_code", refCode);
            localStorage.setItem(
              "pending_referral_code_type",
              isSellerCode ? "seller" : "rewards",
            );
          }
        } else {
          // Código não reconhecido - tenta salvar como Matricula Rewards por padrão
          const existingCode = localStorage.getItem("pending_referral_code");
          if (!existingCode || existingCode !== refCode) {
            localStorage.setItem("pending_referral_code", refCode);
            localStorage.setItem("pending_referral_code_type", "rewards");
          }
        }
      }

      // Captura código de registro de seller
      if (sellerRegCode) {
        const existingRegCode = localStorage.getItem(
          "pending_seller_registration_code",
        );
        if (!existingRegCode || existingRegCode !== sellerRegCode) {
          localStorage.setItem(
            "pending_seller_registration_code",
            sellerRegCode,
          );
        }
      }
    };

    processReferralCode();
  }, [location.search, location.pathname]);

  return null;
};
