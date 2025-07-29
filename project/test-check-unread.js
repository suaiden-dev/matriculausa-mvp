// Script de teste para check-unread-emails
// Execute: node test-check-unread.js

const SUPABASE_URL = 'https://wgy8bw13.supabase.co'; // Substitua pelo seu
const EMAIL = 'seu-email@gmail.com'; // Substitua pelo email conectado
const ACCESS_TOKEN = 'seu-access-token'; // Substitua pelo token do usuário

async function testCheckUnreadEmails() {
  console.log('🧪 Testando check-unread-emails...');
  console.log('📧 Email:', EMAIL);
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/check-unread-emails?email=${encodeURIComponent(EMAIL)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );

    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.text();
    console.log('📊 Response:', data);

    if (response.ok) {
      console.log('✅ Teste passou!');
    } else {
      console.log('❌ Teste falhou!');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testCheckUnreadEmails(); 