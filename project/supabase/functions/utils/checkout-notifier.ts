/**
 * checkout-notifier.ts
 *
 * Utilitário para notificar o n8n quando um checkout é iniciado,
 * permitindo a recuperação de checkouts abandonados via Simplesdesk.
 *
 * CONTROLE DE AMBIENTE:
 * Para desabilitar em um ambiente específico, comente a linha abaixo
 * ou altere para `false`:
 */
const ABANDONED_CART_ENABLED = true;

const N8N_WEBHOOK_URL = 'https://nwh.suaiden.com/webhook/carrinho-perdido';

export interface CheckoutNotifierPayload {
  fee_type: string;
  payment_method: 'stripe' | 'parcelow' | 'zelle';
  student_id: string;
  student_name?: string | null;
  student_email?: string | null;
  student_phone?: string | null;
  checkout_url?: string | null;
}

/**
 * Notifica o n8n que um checkout foi iniciado.
 * Falhas são silenciosas — nunca interrompem o fluxo do aluno.
 */
export async function notifyCheckoutInitiated(payload: CheckoutNotifierPayload): Promise<void> {
  // === CONTROLE DE AMBIENTE ===
  // Para desabilitar, comente a linha abaixo ou altere ABANDONED_CART_ENABLED para false
  if (!ABANDONED_CART_ENABLED) return;
  // ===========================

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'checkout_initiated',
        ...payload,
      }),
    });

    if (!response.ok) {
      console.warn(`[checkout-notifier] n8n respondeu com status ${response.status}. Ignorando.`);
    } else {
      console.log(`[checkout-notifier] ✅ Notificação enviada ao n8n: ${payload.fee_type} via ${payload.payment_method}`);
    }
  } catch (err) {
    // Falha silenciosa — não deve interromper o checkout do aluno
    console.warn('[checkout-notifier] ⚠️ Falha ao notificar n8n (ignorado):', err);
  }
}
