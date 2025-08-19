// Teste da Edge Function create-student-notification
const testNotification = async () => {
  try {
    console.log('Testando Edge Function create-student-notification...');
    
    // Teste sem autenticação (deve retornar erro 401)
    console.log('\n=== Teste 1: Sem autenticação ===');
    const response1 = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-student-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_user_id: 'test-user-id',
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'test',
        link: '/test',
      }),
    });
    
    console.log('Response 1 status:', response1.status);
    const responseData1 = await response1.json();
    console.log('Response 1 data:', responseData1);
    
    // Teste com payload inválido (deve retornar erro 400)
    console.log('\n=== Teste 2: Payload inválido ===');
    const response2 = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-student-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Sem student_user_id
        title: 'Test Notification',
        message: 'This is a test notification',
      }),
    });
    
    console.log('Response 2 status:', response2.status);
    const responseData2 = await response2.json();
    console.log('Response 2 data:', responseData2);
    
    // Teste com payload válido mas sem autenticação (deve retornar erro 401)
    console.log('\n=== Teste 3: Payload válido sem autenticação ===');
    const response3 = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-student-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_user_id: 'test-user-id',
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'test',
        link: '/test',
      }),
    });
    
    console.log('Response 3 status:', response3.status);
    const responseData3 = await response3.json();
    console.log('Response 3 data:', responseData3);
    
  } catch (error) {
    console.error('Error testing Edge Function:', error);
  }
};

// Executar o teste
testNotification();
