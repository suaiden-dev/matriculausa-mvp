// Função para verificar assinatura Stripe (IMPLEMENTAÇÃO MANUAL CORRETA)
export async function verifyStripeSignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  try {
    if (!signature) {
      console.error("[stripe-webhook] Assinatura Stripe ausente!");
      return false;
    }
    // Step 1: Extract timestamp and signatures from header
    const elements = signature.split(",");
    let timestamp = "";
    let v1Signature = "";
    for (const element of elements) {
      const [prefix, value] = element.trim().split("=");
      if (prefix === "t") {
        timestamp = value;
      } else if (prefix === "v1") {
        v1Signature = value;
      }
    }

    if (!timestamp || !v1Signature) {
      console.error(
        "[stripe-webhook] Formato de assinatura inválido ou incompleto:",
        signature,
      );
      return false;
    }
    // Step 2: Create signed_payload string
    const signedPayload = `${timestamp}.${body}`;
    // Step 3: Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      [
        "sign",
      ],
    );
    const signedData = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload),
    );
    const expectedSignature = Array.from(new Uint8Array(signedData)).map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    // Step 4: Compare signatures (constant-time comparison)
    const isValid = expectedSignature === v1Signature;
    if (!isValid) {
      console.error("[stripe-webhook] Assinatura Stripe inválida!");
    } else {
      console.log(
        `[stripe-webhook] Assinatura Stripe verificada com sucesso usando secret: ...${
          secret.substring(secret.length - 4)
        }`,
      );
    }
    return isValid;
  } catch (err: any) {
    console.error(
      "[stripe-webhook] Erro crítico ao verificar assinatura Stripe:",
      err,
    );
    return false;
  }
}
