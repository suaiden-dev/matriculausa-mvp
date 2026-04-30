import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migma-webhook-secret",
};

interface MigmaFile {
  name: string;
  url: string;
  type: "formulario" | "documento";
  category: string;
}

interface PackagePayload {
  student_email: string;
  student_name: string;
  migma_application_id: string;
  zip_url: string;
  zip_expires_at: string;
  process_type?: string;
  files: MigmaFile[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Verify shared secret
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
    const body: PackagePayload = await req.json();
    const { student_email, student_name, migma_application_id, zip_url, zip_expires_at, process_type, files } = body;

    if (!student_email || !zip_url) {
      return new Response(JSON.stringify({ error: "student_email and zip_url are required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Look up local user by email
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("email", student_email)
      .maybeSingle();

    const localUserId = profile?.user_id ?? null;

    console.log(`[receive-migma-package] Student ${student_email} → local user_id: ${localUserId ?? "not found"}`);

    // Mark student as migma source so the admin UI shows the correct view
    if (localUserId) {
      await supabase
        .from("user_profiles")
        .update({ source: "migma" })
        .eq("user_id", localUserId);
    }

    // Insert package record
    const { data: pkg, error: insertError } = await supabase
      .from("migma_packages")
      .insert({
        student_email,
        student_name,
        student_user_id: localUserId,
        migma_application_id,
        zip_url,
        zip_expires_at: zip_expires_at ?? null,
        process_type: process_type ?? null,
        files: files ?? [],
        status: "received",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    console.log(`[receive-migma-package] Package created: ${pkg.id}`);

    // Fire n8n notification in background (non-blocking)
    const n8nPayload = {
      tipo_notf: "Novo pacote recebido do Migma",
      nome_aluno: student_name,
      email_aluno: student_email,
      migma_application_id,
      package_id: pkg.id,
      o_que_enviar: `Novo pacote de documentos recebido do Migma para o aluno ${student_name} (${student_email}). Acesse o painel de admin para visualizar.`,
    };

    EdgeRuntime.waitUntil(
      fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "PostmanRuntime/7.36.3" },
        body: JSON.stringify(n8nPayload),
      }).catch((err) => console.error("[receive-migma-package] n8n notify error:", err))
    );

    return new Response(JSON.stringify({ success: true, package_id: pkg.id }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[receive-migma-package] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
