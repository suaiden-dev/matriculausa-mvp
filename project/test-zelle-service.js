// Teste simples do serviço Zelle
import { zellePaymentService } from './src/services/ZellePaymentService.js';

async function testZelleService() {
  console.log('🧪 Testando serviço Zelle...');
  
  try {
    // Testar conexão
    const connectionTest = await zellePaymentService.testConnection();
    console.log('✅ Conexão PostgreSQL:', connectionTest ? 'OK' : 'FALHOU');
    
    // Testar criação de código Zelle
    const testCode = 'ZELLE123456789';
    console.log('🔍 Testando criação de código:', testCode);
    
    const createResult = await zellePaymentService.createPayment(testCode);
    console.log('✅ Criação de código Zelle:', createResult.success ? 'OK' : 'FALHOU');
    
    if (createResult.success) {
      console.log('📊 Dados do código:', createResult.data);
      
      // Testar busca do código
      const searchResult = await zellePaymentService.getCodeByConfirmationCode(testCode);
      console.log('✅ Busca do código:', searchResult.success ? 'OK' : 'FALHOU');
      
      if (searchResult.success) {
        console.log('📊 Código encontrado:', searchResult.data);
        
        // Testar marcar como usado
        const markUsedResult = await zellePaymentService.markCodeAsUsed(testCode);
        console.log('✅ Marcar como usado:', markUsedResult.success ? 'OK' : 'FALHOU');
        
        if (markUsedResult.success) {
          console.log('📊 Código marcado como usado:', markUsedResult.data);
        }
      }
    }
    
    // Testar listagem de códigos
    const listResult = await zellePaymentService.listCodes({ limit: 5 });
    console.log('✅ Listagem de códigos:', listResult.success ? 'OK' : 'FALHOU');
    
    if (listResult.success) {
      console.log('📊 Códigos encontrados:', listResult.data?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await zellePaymentService.close();
  }
}

testZelleService();
