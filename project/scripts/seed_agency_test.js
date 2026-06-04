import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Faltando VITE_SUPABASE_URL ou VITE_SUPABASE_SERVICE_ROLE_KEY no arquivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🚀 Iniciando Seeding de Teste para Agência Flexível...");
  const agencyEmail = 'josetxo6480@uorak.com';
  
  // 1. Encontrar o Perfil da Agência
  const { data: agencyProfile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('email', agencyEmail)
    .single();
    
  if (profileErr || !agencyProfile) {
    console.error("❌ Perfil da agência não encontrado:", profileErr);
    return;
  }
  
  const agencyUserId = agencyProfile.user_id;
  console.log("✅ ID da Agência encontrado:", agencyUserId);

  // 2. Encontrar o Registro Administrativo da Agência
  const { data: aaData, error: aaErr } = await supabase
    .from('affiliate_admins')
    .select('id')
    .eq('user_id', agencyUserId)
    .single();
    
  if (aaErr || !aaData) {
    console.error("❌ Registro affiliate_admin não encontrado:", aaErr);
    return;
  }
  const affiliateAdminId = aaData.id;
  
  // 3. Configurar Regras Flexíveis para o Teste
  const testRules = {
    selection_process: { type: 'fixed', value: 100 },
    scholarship: { type: 'percentage', value: 10 },
    i20_control: { type: 'fixed', value: 50 },
    application: { type: 'percentage', value: 5 }
  };
  
  await supabase
    .from('affiliate_admins')
    .update({ commission_rules: testRules })
    .eq('id', affiliateAdminId);
    
  console.log("✅ Regras de comissão flexíveis configuradas:", testRules);

  // 4. Encontrar código de vendedor ligado à agência
  let { data: sellers } = await supabase
    .from('sellers')
    .select('referral_code')
    .eq('affiliate_admin_id', affiliateAdminId);
    
  let referralCode = sellers && sellers.length > 0 ? sellers[0].referral_code : null;
  if (!referralCode) {
    console.error("❌ Nenhum vendedor encontrado para esta agência. Crie um no painel.");
    return;
  }
  
  console.log("✅ Código de indicação utilizado:", referralCode);

  // 5. Vincular um Estudante Uorak
  const studentEmail = 'test_student_123@uorak.com';
  let { data: studentProfile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('email', studentEmail)
    .single();
    
  if (!studentProfile) {
    console.log("Estudante fantasma não encontrado. Tentando criar...");
    // Necessita auth real em muitos casos, então o ideal é usar um que já exista.
    // Buscando o primeiro aluno @uorak livre
    const { data: freeStudent } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .like('email', '%@uorak.com')
        .eq('role', 'student')
        .limit(1)
        .single();

    if(freeStudent) {
        studentProfile = freeStudent;
        console.log("✅ Utilizando aluno existente:", freeStudent.email);
    } else {
        console.error("❌ Nenhum aluno @uorak disponível encontrado para o teste.");
        return;
    }
  } 

  // Vincular ao vendedor
  await supabase
    .from('user_profiles')
    .update({ seller_referral_code: referralCode })
    .eq('user_id', studentProfile.user_id);
  
  const studentId = studentProfile.user_id;
  console.log("✅ Estudante vinculado com sucesso ao código:", referralCode);

  // 6. Simular Pagamento: Selection Process ($400)
  console.log("💸 Disparando Pagamento RPC: Selection Process ($400)...");
  const { error: rpcErr } = await supabase.rpc('register_payment_billing', {
    user_id_param: studentId,
    fee_type_param: 'selection_process',
    amount_param: 400,
    payment_method_param: 'stripe'
  });
  
  if (rpcErr) {
    console.error("❌ Erro no RPC:", rpcErr);
  } else {
    console.log("✅ Pagamento processado! A comissão no banco de dados deve ser $100 (Fixo).");
  }

  // 7. Simular Pagamento: Scholarship ($900)
  console.log("💸 Disparando Pagamento RPC: Scholarship ($900)...");
  const { error: rpcErr2 } = await supabase.rpc('register_payment_billing', {
    user_id_param: studentId,
    fee_type_param: 'scholarship_fee',
    amount_param: 900,
    payment_method_param: 'stripe'
  });
  
  if (rpcErr2) {
    console.error("❌ Erro no RPC:", rpcErr2);
  } else {
    console.log("✅ Pagamento processado! A comissão no banco de dados deve ser $90 (10%).");
  }
  
  console.log("🎉 Seeding finalizado! Agora os Testes E2E podem ser executados com precisão matemática.");
}

run();
