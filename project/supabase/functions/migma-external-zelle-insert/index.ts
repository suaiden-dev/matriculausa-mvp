import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migma-webhook-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Verify shared secret
  const secret = req.headers.get("x-migma-webhook-secret");
  const expectedSecret = Deno.env.get("MIGMA_WEBHOOK_SECRET");

  if (!secret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { 
      amount, 
      screenshot_url, 
      metadata 
    } = body;

    // 1. Tentar encontrar o user_id e student_id local pelo e-mail
    const migmaAppId = metadata.migma_application_id || metadata.migmaApplicationId;
    const migmaProfId = metadata.migma_profile_id || metadata.migmaProfileId;
    const migmaUsrId = metadata.migma_user_id || metadata.migmaUserId;
    
    const studentEmail = metadata.migma_student_email || metadata.studentEmail;
    const studentName = metadata.migma_student_name || metadata.studentName;
    const universityName = metadata.migma_university_name || metadata.universityName || "Migma University";

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("user_id, id")
      .eq("email", studentEmail)
      .single();

    const localUserId = profile?.user_id || null;
    const localStudentId = profile?.id || null;

    console.log(`🔍 [migma-external-zelle-insert] Local lookup for ${studentEmail}: user_id=${localUserId}, profile_id=${localStudentId}`);
    console.log(`🆔 [migma-external-zelle-insert] Migma IDs: App=${migmaAppId}, Prof=${migmaProfId}, User=${migmaUsrId}`);

    // 2. Inserir em zelle_payments vinculado ao aluno local (se existir)
    const { data: payment, error: insertError } = await supabase
      .from("zelle_payments")
      .insert({
        user_id: localUserId,
        amount: amount,
        fee_type: "application_fee_migma",
        status: "pending_verification",
        screenshot_url: screenshot_url,
        metadata: {
          ...metadata,
          migma_application_id: migmaAppId,
          migma_profile_id: migmaProfId,
          migma_user_id: migmaUsrId,
          migma_student_email: studentEmail,
          migma_student_name: studentName,
          migma_university_name: universityName
        },
        currency: "USD"
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    console.log(`✅ [migma-external-zelle-insert] Payment created with ID: ${payment.id}`);

    // 3. Disparar n8n em background (Fire and forget)
    const n8nWebhookUrl = "https://nwh.suaiden.com/webhook/zelle-global";
    
    // Preparar payload completo para o n8n
    const n8nPayload = {
      source: "migma",
      payment_id: payment.id,
      fee_type_global: "application_fee_migma",
      amount: amount,
      image_url: screenshot_url,
      screenshot_url: screenshot_url,
      student_name: studentName,
      student_email: studentEmail,
      metadata: {
        ...metadata,
        migma_student_email: studentEmail,
        migma_student_name: studentName
      }
    };

    // Usamos waitUntil para não travar a resposta da função
    EdgeRuntime.waitUntil(
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload),
      }).catch(err => console.error("Erro ao notificar n8n:", err))
    );

    return new Response(JSON.stringify({ success: true, payment_id: payment.id }), { 
      headers: { ...CORS, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("Erro na função migma-external-zelle-insert:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...CORS, "Content-Type": "application/json" } 
    });
  }
});
