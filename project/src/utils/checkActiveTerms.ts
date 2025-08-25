import { supabase } from '../lib/supabase';

export async function checkActiveTerms() {
  try {
    console.log('🔍 Verificando termos ativos...');
    
    const { data, error } = await supabase
      .from('affiliate_terms')
      .select('*')
      .eq('status', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar termos:', error);
      return null;
    }

    if (data && data.length > 0) {
      console.log('✅ Termos ativos encontrados:', data.length);
      data.forEach((term, index) => {
        console.log(`📋 Termo ${index + 1}:`, {
          id: term.id,
          title: term.title,
          version: term.version,
          status: term.status,
          created_at: term.created_at,
          updated_at: term.updated_at
        });
      });
      return data;
    } else {
      console.log('⚠️ Nenhum termo ativo encontrado');
      return [];
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return null;
  }
}

export async function createTestTerm() {
  try {
    console.log('🔍 Criando termo de teste...');
    
    const { data, error } = await supabase
      .from('affiliate_terms')
      .insert({
        title: 'Termos e Condições de Teste',
        content: `
          <h2>Termos e Condições de Teste</h2>
          <p>Este é um termo de teste para verificar a funcionalidade de aceitação.</p>
          <ul>
            <li>Item 1: Aceitar os termos</li>
            <li>Item 2: Concordar com as condições</li>
            <li>Item 3: Confirmar o entendimento</li>
          </ul>
          <p><strong>Importante:</strong> Ao aceitar estes termos, você concorda com todas as condições estabelecidas.</p>
        `,
        status: true,
        version: 1
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar termo:', error);
      return null;
    }

    console.log('✅ Termo de teste criado com sucesso:', data);
    return data;
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return null;
  }
}
