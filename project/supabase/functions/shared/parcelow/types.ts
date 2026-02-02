/**
 * TypeScript types e interfaces para Parcelow
 */

/**
 * Dados do cliente para criação de pedido
 */
export interface ParcelowCustomer {
  name: string;
  email: string;
  phone: string;
  tax_id: string; // CPF (brasileiro) - obrigatório
}

/**
 * Dados do pedido Parcelow
 */
export interface ParcelowOrderData {
  amount: number;
  currency: string;
  description: string;
  customer: ParcelowCustomer;
  metadata: Record<string, any>;
}

/**
 * Resposta da API de criação de pedido
 */
export interface ParcelowOrderResponse {
  id: string;
  checkout_url: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
}

/**
 * Evento do webhook Parcelow
 */
export interface ParcelowWebhookEvent {
  event: 'event_order_paid' | 'event_order_declined' | 'event_order_canceled' | 'event_order_refunded' | 'event_order_pending';
  order: ParcelowOrderResponse;
  metadata?: Record<string, any>;
}

/**
 * Tipos de fee suportados
 */
export type FeeType = 'selection_process' | 'application_fee' | 'scholarship_fee' | 'i20_control';
