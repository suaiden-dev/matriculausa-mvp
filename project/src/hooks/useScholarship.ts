import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Scholarship } from "../types";

export function useScholarship(id: string | undefined) {
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  // Inicia como true quando há um id para evitar o flash do estado de erro
  // entre a montagem do componente e o início do fetch no useEffect
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setScholarship(null);
      return;
    }

    async function fetchScholarship() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("scholarships")
          .select(`
            id,
            title,
            description,
            amount,
            deadline,
            requirements,
            field_of_study,
            level,
            delivery_mode,
            eligibility,
            benefits,
            is_exclusive,
            is_active,
            is_highlighted,
            featured_order,
            university_id,
            created_at,
            updated_at,
            needcpt,
            visaassistance,
            scholarshipvalue,
            image_url,
            original_value_per_credit,
            original_annual_value,
            annual_value_with_scholarship,
            scholarship_type,
            work_permissions,
            application_fee_amount,
            placement_fee_amount,
            is_test,
            min_gpa,
            min_english_proficiency,
            internal_fees,
            universities (id, name, logo_url, image_url, location, is_approved, university_fees_page_url)
          `)
          .eq("id", id)
          .single();

        if (error) {
          console.error("❌ [useScholarship] Erro ao buscar bolsa:", error);
          setError(error.message);
          setScholarship(null);
        } else {
          setScholarship(data as unknown as Scholarship);
        }
      } catch (err) {
        console.error("❌ [useScholarship] Erro inesperado:", err);
        setError("Erro inesperado ao carregar os detalhes da bolsa");
        setScholarship(null);
      } finally {
        setLoading(false);
      }
    }

    fetchScholarship();
  }, [id]);

  return { scholarship, loading, error };
}
