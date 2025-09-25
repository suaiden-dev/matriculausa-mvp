// Script simples para testar as variáveis de ambiente
console.log('🔍 Verificando variáveis de ambiente...\n');

console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada');

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.log('\n⚠️ ATENÇÃO: Variáveis de ambiente não configuradas!');
  console.log('💡 Configure as variáveis antes de executar os scripts de diagnóstico:');
  console.log('   export VITE_SUPABASE_URL="sua_url_do_supabase"');
  console.log('   export VITE_SUPABASE_ANON_KEY="sua_chave_anonima"');
} else {
  console.log('\n✅ Variáveis de ambiente configuradas corretamente!');
  console.log('🚀 Você pode executar os scripts de diagnóstico agora.');
}
