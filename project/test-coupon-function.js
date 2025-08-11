const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://your-project.supabase.co'; // Substitua pela sua URL
const supabaseKey = 'your-anon-key'; // Substitua pela sua chave

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCouponFunction() {
  console.log('🧪 Testando Edge Function process-registration-coupon...');
  
  try {
    const { data, error } = await supabase.functions.invoke('process-registration-coupon', {
      body: {
        user_id: 'test-user-id',
        affiliate_code: 'TEST123'
      }
    });

    console.log('📊 Resposta da função:');
    console.log('Data:', data);
    console.log('Error:', error);
    
  } catch (error) {
    console.error('❌ Erro ao chamar função:', error);
  }
}

testCouponFunction();
