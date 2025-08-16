// Teste da Edge Function de notificação para universidades
// Este arquivo pode ser usado para testar a função localmente ou em produção

const testNotification = async () => {
  const SUPABASE_URL = 'http://localhost:54321'; // Para teste local
  // const SUPABASE_URL = 'https://seu-projeto.supabase.co'; // Para produção
  
  const testPayload = {
    student_id: '123e4567-e89b-12d3-a456-426614174000',
    student_name: 'João Silva',
    student_email: 'joao.silva@email.com',
    university_id: '987fcdeb-51a2-43d1-b456-426614174001',
    university_name: 'Universidade de Teste',
    university_email: 'admissions@testuniversity.edu', // opcional
    discount_amount: 500,
    discount_type: 'Tuition Discount',
    cost_coins: 1000,
    redemption_id: '456e7890-e89b-12d3-a456-426614174002'
  };

  try {
    console.log('🧪 Testando notificação para universidade...');
    console.log('📤 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-university-discount-redemption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📋 Resultado:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Teste bem-sucedido! Notificação enviada.');
      console.log('📧 Email enviado para:', result.sent_to);
    } else {
      console.error('❌ Teste falhou:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
};

// Teste com dados mínimos (sem email da universidade)
const testNotificationMinimal = async () => {
  const SUPABASE_URL = 'http://localhost:54321';
  
  const minimalPayload = {
    student_id: '123e4567-e89b-12d3-a456-426614174000',
    student_name: 'Maria Santos',
    university_id: '987fcdeb-51a2-43d1-b456-426614174001',
    university_name: 'Universidade Sem Email',
    discount_amount: 250,
    cost_coins: 500,
    redemption_id: '789e0123-e89b-12d3-a456-426614174003'
  };

  try {
    console.log('\n🧪 Testando notificação com dados mínimos...');
    console.log('📤 Payload mínimo:', JSON.stringify(minimalPayload, null, 2));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-university-discount-redemption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      },
      body: JSON.stringify(minimalPayload)
    });

    const result = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📋 Resultado:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Teste mínimo bem-sucedido!');
      console.log('📧 Email enviado para:', result.sent_to);
    } else {
      console.error('❌ Teste mínimo falhou:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste mínimo:', error);
  }
};

// Executar testes
const runTests = async () => {
  console.log('🚀 Iniciando testes da Edge Function de notificação...\n');
  
  await testNotification();
  await testNotificationMinimal();
  
  console.log('\n🏁 Testes concluídos!');
};

// Executar se chamado diretamente
if (typeof window === 'undefined') {
  // Node.js environment
  runTests();
} else {
  // Browser environment
  console.log('🌐 Para executar os testes, use o console do navegador:');
  console.log('runTests()');
}
