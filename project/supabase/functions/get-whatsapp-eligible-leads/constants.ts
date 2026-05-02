export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Cooldown em dias: leads que já receberam WhatsApp nesse período são ignorados
export const COOLDOWN_DAYS = 7;

// Mínimo de horas após cadastro antes de enviar o primeiro WhatsApp
export const MIN_HOURS_SINCE_REGISTRATION = 24;

// Máximo de leads retornados por chamada
export const MAX_LEADS = 100;

// Modo de teste: retorna apenas o telefone especificado
export const TEST_MODE = Deno.env.get('WHATSAPP_TEST_MODE') === 'true';
export const TEST_PHONE = Deno.env.get('WHATSAPP_TEST_PHONE') || '';
