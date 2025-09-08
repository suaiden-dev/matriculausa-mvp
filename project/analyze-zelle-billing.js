/**
 * Script para analisar pagamentos Zelle que precisam ser contabilizados no faturamento
 * 
 * Este script:
 * 1. Analisa os pagamentos Zelle aprovados que não foram contabilizados
 * 2. Calcula os valores que seriam adicionados ao faturamento
 * 3. Mostra um relatório detalhado antes de aplicar a correção
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeZellePayments() {
  console.log('🔍 Analisando pagamentos Zelle para faturamento...\n');

  try {
    // 1. Analisar pagamentos individuais
    console.log('📊 Análise detalhada dos pagamentos:');
    const { data: payments, error: paymentsError } = await supabase
      .rpc('analyze_zelle_payments_for_billing');

    if (paymentsError) {
      console.error('❌ Erro ao analisar pagamentos:', paymentsError);
      return;
    }

    console.log(`\n📋 Encontrados ${payments.length} pagamentos Zelle aprovados:`);
    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ ID do Pagamento │ Usuário           │ Tipo de Taxa    │ Valor  │ Tem Referral │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤');

    payments.forEach(payment => {
      const paymentId = payment.payment_id.substring(0, 8) + '...';
      const userEmail = payment.user_email.substring(0, 20) + '...';
      const feeType = payment.fee_type.padEnd(15);
      const amount = `$${payment.amount}`.padStart(8);
      const hasReferral = payment.has_referral_code ? '✅ Sim' : '❌ Não';
      
      console.log(`│ ${paymentId.padEnd(16)} │ ${userEmail.padEnd(18)} │ ${feeType} │ ${amount} │ ${hasReferral.padEnd(12)} │`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────────────────┘');

    // 2. Calcular totais
    console.log('\n💰 Calculando totais que seriam contabilizados:');
    const { data: totals, error: totalsError } = await supabase
      .rpc('calculate_zelle_billing_totals');

    if (totalsError) {
      console.error('❌ Erro ao calcular totais:', totalsError);
      return;
    }

    if (totals && totals.length > 0) {
      const total = totals[0];
      
      console.log(`\n📈 RESUMO DOS VALORES QUE SERIAM CONTABILIZADOS:`);
      console.log(`   • Total de pagamentos: ${total.total_payments}`);
      console.log(`   • Valor total: $${total.total_amount}`);
      
      console.log(`\n📊 Por tipo de taxa:`);
      const byFeeType = total.by_fee_type;
      Object.keys(byFeeType).forEach(feeType => {
        const data = byFeeType[feeType];
        console.log(`   • ${feeType}: ${data.count} pagamentos = $${data.amount}`);
      });

      console.log(`\n👥 Por referrer (seller):`);
      const byReferrer = total.by_referrer;
      Object.keys(byReferrer).forEach(referrerId => {
        const data = byReferrer[referrerId];
        console.log(`   • ${data.email}: ${data.count} pagamentos = $${data.amount}`);
      });

      // 3. Verificar se há divergências
      console.log(`\n⚠️  VERIFICAÇÃO DE DIVERGÊNCIAS:`);
      
      // Buscar pagamentos que já estão na tabela affiliate_referrals
      const { data: existingReferrals, error: referralsError } = await supabase
        .from('affiliate_referrals')
        .select('payment_amount, payment_session_id')
        .like('payment_session_id', 'zelle_%');

      if (!referralsError && existingReferrals) {
        const existingAmount = existingReferrals.reduce((sum, ref) => sum + (ref.payment_amount || 0), 0);
        console.log(`   • Valor já contabilizado em affiliate_referrals: $${existingAmount}`);
        console.log(`   • Valor que seria adicionado: $${total.total_amount}`);
        console.log(`   • Total após correção: $${existingAmount + total.total_amount}`);
      }

      // 4. Mostrar próximos passos
      console.log(`\n🚀 PRÓXIMOS PASSOS:`);
      console.log(`   1. Revisar os valores acima`);
      console.log(`   2. Se estiver correto, executar a correção:`);
      console.log(`      await supabase.rpc('fix_zelle_payments_billing')`);
      console.log(`   3. Verificar se a correção foi aplicada:`);
      console.log(`      await supabase.rpc('verify_zelle_billing_fix')`);

    } else {
      console.log('✅ Nenhum pagamento Zelle precisa ser contabilizado no faturamento.');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar análise
analyzeZellePayments();
