import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * receive-migma-transfer-form
 *
 * Called by Migma when a student uploads their filled Transfer Form.
 * Updates the migma_packages record with the filled form URL and
 * fires an n8n admin notification.
 *
 * Payload:
 * {
 *   student_email: string;
 *   student_name: string;
 *   filled_form_url: string;
 *   migma_application_id: string;
 * }
 *
 * Security: Authorization: Bearer <service_role> + x-migma-webhook-secret
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migma-webhook-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const secret = req.headers.get("x-migma-webhook-secret");
  const expectedSecret = Deno.env.get("MIGMA_WEBHOOK_SECRET");

  if (!secret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { student_email, student_name, filled_form_url, migma_application_id } = body;

    if (!student_email || !filled_form_url || !migma_application_id) {
      return new Response(
        JSON.stringify({ error: "student_email, filled_form_url, and migma_application_id are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    console.log(`[receive-migma-transfer-form] Processing for: ${student_email}`);

    // Find the most recent migma_package for this application
    const { data: pkg, error: pkgErr } = await supabase
      .from("migma_packages")
      .select("id")
      .eq("migma_application_id", migma_application_id)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pkgErr || !pkg) {
      // Fallback: find by email
      const { data: pkgByEmail, error: emailErr } = await supabase
        .from("migma_packages")
        .select("id")
        .eq("student_email", student_email)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (emailErr || !pkgByEmail) {
        console.error("[receive-migma-transfer-form] Package not found for:", student_email);
        return new Response(
          JSON.stringify({ error: "Package not found", detail: pkgErr?.message ?? emailErr?.message }),
          { status: 404, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }

      // Update via email fallback
      const { error: updateErr } = await supabase
        .from("migma_packages")
        .update({
          transfer_form_filled_url: filled_form_url,
          transfer_form_status: "submitted",
        })
        .eq("id", pkgByEmail.id);

      if (updateErr) throw updateErr;

      console.log(`[receive-migma-transfer-form] Updated package ${pkgByEmail.id} (via email fallback)`);
    } else {
      const { error: updateErr } = await supabase
        .from("migma_packages")
        .update({
          transfer_form_filled_url: filled_form_url,
          transfer_form_status: "submitted",
        })
        .eq("id", pkg.id);

      if (updateErr) throw updateErr;

      console.log(`[receive-migma-transfer-form] Updated package ${pkg.id}`);
    }

    // Notify admin via n8n
    EdgeRuntime.waitUntil(
      fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "PostmanRuntime/7.36.3" },
        body: JSON.stringify({
          tipo_notf: "Transfer Form preenchido recebido",
          nome_aluno: student_name,
          email_aluno: student_email,
          migma_application_id,
          filled_form_url,
          o_que_enviar: `O aluno ${student_name} (${student_email}) enviou o Transfer Form preenchido. Acesse o painel de admin para visualizar.`,
        }),
      }).catch((err) => console.error("[receive-migma-transfer-form] n8n notify error:", err))
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[receive-migma-transfer-form] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
