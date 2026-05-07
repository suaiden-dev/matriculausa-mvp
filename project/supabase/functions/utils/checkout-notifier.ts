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

  const start = Date.now();
  const summary = { fee: payload.fee_type, method: payload.payment_method, student: payload.student_id };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'CheckoutNotifier/1.0'
      },
      body: JSON.stringify({
        event: 'checkout_initiated',
        ...payload,
      }),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No response body');
      console.warn(`[checkout-notifier] ❌ Erro ${response.status} após ${duration}ms. Payload: ${JSON.stringify(summary)}. Body: ${errorBody}`);
    } else {
      console.log(`[checkout-notifier] ✅ Notificação enviada em ${duration}ms: ${JSON.stringify(summary)}`);
    }
  } catch (err) {
    // Falha silenciosa — não deve interromper o checkout do aluno
    console.warn('[checkout-notifier] ⚠️ Falha na rede ao notificar n8n (ignorado):', err);
  }
}
