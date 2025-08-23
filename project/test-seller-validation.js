import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://fitpynguasqqutuhzifx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSellerValidation() {
  console.log('🧪 Testando validação do seller: SELLER_A4LZ8R5NL');
  
  try {
    // 1. Verificar se o seller existe na tabela sellers
    console.log('\n📊 Verificando tabela sellers...');
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('*')
      .eq('referral_code', 'SELLER_A4LZ8R5NL');

    if (sellersError) {
      console.error('❌ Erro ao acessar sellers:', sellersError);
      return;
    }

    console.log('✅ Sellers encontrados:', sellers);

    // 2. Verificar se o seller está ativo
    if (sellers && sellers.length > 0) {
      const seller = sellers[0];
      console.log('\n🔍 Detalhes do seller:', {
        id: seller.id,
        referral_code: seller.referral_code,
        is_active: seller.is_active,
        email: seller.email,
        name: seller.name
      });

      if (seller.is_active) {
        console.log('✅ Seller está ativo!');
      } else {
        console.log('❌ Seller está inativo!');
      }
    } else {
      console.log('❌ Seller não encontrado na tabela sellers');
    }

    // 3. Verificar se existe na tabela user_profiles
    console.log('\n📊 Verificando user_profiles...');
    if (sellers && sellers.length > 0) {
      const seller = sellers[0];
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', seller.user_id);

      if (profileError) {
        console.error('❌ Erro ao acessar user_profiles:', profileError);
      } else if (userProfile) {
        console.log('✅ User profile encontrado:', {
          id: userProfile.id,
          role: userProfile.role,
          email: userProfile.email,
          full_name: userProfile.full_name
        });
      } else {
        console.log('❌ User profile não encontrado');
      }
    }

    // 4. Testar a validação como o sistema faz
    console.log('\n🧪 Testando validação como o sistema...');
    const { data: validationResult, error: validationError } = await supabase
      .from('sellers')
      .select('referral_code, is_active')
      .eq('referral_code', 'SELLER_A4LZ8R5NL')
      .eq('is_active', true)
      .single();

    if (validationError) {
      console.error('❌ Erro na validação:', validationError);
    } else if (validationResult) {
      console.log('✅ Validação bem-sucedida:', validationResult);
    } else {
      console.log('❌ Validação falhou - nenhum resultado');
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

testSellerValidation();
