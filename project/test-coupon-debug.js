// Script para testar a Edge Function de cupom
import { createClient } from '@supabase/supabase-js';

// Credenciais corretas do Supabase
const supabaseUrl = 'https://fitpynguasqqutuhzifx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function invokeAndPrint(body) {
  try {
    const { data, error } = await supabase.functions.invoke('process-registration-coupon', { body });
    console.log('📊 Resposta da função:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
  } catch (err) {
    console.error('❌ Erro ao chamar função:', err);
    if (err?.context) {
      try {
        const json = await err.context.json();
        console.error('🧩 Corpo do erro:', JSON.stringify(json, null, 2));
      } catch (_) {
        try {
          const text = await err.context.text();
          console.error('🧩 Corpo do erro (texto):', text);
        } catch (_) {}
      }
    }
  }
}

async function testCouponFunction() {
  console.log('🧪 Testando Edge Function process-registration-coupon...');

  // Buscar um código ativo existente
  const { data: affiliateCodes, error: affiliateError } = await supabase
    .from('affiliate_codes')
    .select('code, is_active')
    .eq('is_active', true);

  if (affiliateError) {
    console.error('❌ Erro ao buscar códigos:', affiliateError);
    return;
  }

  console.log('📋 Códigos de afiliado ativos:', affiliateCodes);

  if (affiliateCodes && affiliateCodes.length > 0) {
    const testCode = affiliateCodes[0].code;
    console.log('🧪 Usando código de teste:', testCode);
    console.log('📞 Chamando função...');
    await invokeAndPrint({ user_id: 'test-user-123', affiliate_code: testCode });
  } else {
    console.log('⚠️ Nenhum código de afiliado ativo encontrado, criando TEST123...');
    const { data: newCode, error: createError } = await supabase
      .from('affiliate_codes')
      .insert({ user_id: 'test-referrer-id', code: 'TEST123', is_active: true, total_referrals: 0 })
      .select()
      .single();
    if (createError) {
      console.error('❌ Erro ao criar código de teste:', createError);
      return;
    }
    console.log('✅ Código de teste criado:', newCode);
    await invokeAndPrint({ user_id: 'test-user-123', affiliate_code: 'TEST123' });
  }
}

await testCouponFunction();
