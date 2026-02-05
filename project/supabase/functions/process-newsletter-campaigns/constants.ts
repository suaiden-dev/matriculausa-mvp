export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const n8nUrl = 'https://nwh.suaiden.com/webhook/notfmatriculausa';
export const baseUrl = Deno.env.get('BASE_URL') || 'https://matriculausa.com';

// Modo de teste: apenas enviar para email específico
export const TEST_MODE = Deno.env.get('NEWSLETTER_TEST_MODE') === 'true';
export const TEST_EMAIL = Deno.env.get('NEWSLETTER_TEST_EMAIL') || 'antoniocruzgomes940@gmail.com';
