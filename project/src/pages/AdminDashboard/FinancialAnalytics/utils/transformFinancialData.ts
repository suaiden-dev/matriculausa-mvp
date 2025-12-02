import type { FinancialDataInputs, ProcessedFinancialData } from '../data/types';

/**
 * Processa applications e cria payment records
 * EXATAMENTE igual ao Payment Management
 */
function processApplications(
  applications: any[],
  overridesMap: { [key: string]: any },
  userSystemTypesMap: Map<string, string>,
  realPaymentAmounts: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number }>,
  getFeeAmount: (key: 'i20_control_fee' | 'application_fee') => number,
  globalFeesProcessed: { [userId: string]: { selection_process: boolean; i20_control: boolean; application_fee: boolean } },
  paymentRecords: any[]
): void {
  applications?.forEach((app: any) => {
    const student = app.user_profiles;
    const scholarship = app.scholarships;
    const university = scholarship?.universities;
    if (!student || !scholarship || !university) return;

    const studentName = student.full_name || 'Unknown Student';
    const studentEmail = student.email || '';
    const universityName = university.name || 'Unknown University';
    const sellerReferralCode = student.seller_referral_code || null;
    if (!studentName || !universityName) return;

    const dependents = Number(student?.dependents) || 0;
    const userOverrides = overridesMap[student?.user_id] || {};
    const realPaid = realPaymentAmounts?.get(student?.user_id);
    const systemType = userSystemTypesMap.get(student.user_id) || 'legacy';
    // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
    // Dependentes só afetam Application Fee ($100 por dependente)
    const dependentCost = systemType === 'simplified' ? 0 : (dependents * 150); // apenas selection process (legacy)

    // Helper: Verifica se o valor está dentro de uma faixa razoável (50% de tolerância)
    const isValueReasonable = (realValue: number, expectedValue: number): boolean => {
      const tolerance = 0.5; // 50% de tolerância
      const min = expectedValue * (1 - tolerance);
      const max = expectedValue * (1 + tolerance);
      return realValue >= min && realValue <= max;
    };

    // Selection Process Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let selectionProcessFee: number;
    const expectedSelectionProcess = systemType === 'simplified' ? 350 : 400;
    const expectedSelectionProcessWithDeps = expectedSelectionProcess + dependentCost;
    
    if (realPaid?.selection_process !== undefined && realPaid.selection_process > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.selection_process, expectedSelectionProcessWithDeps)) {
        selectionProcessFee = Math.round(realPaid.selection_process * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        if (userOverrides.selection_process_fee !== undefined) {
          selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
        } else {
          selectionProcessFee = Math.round((expectedSelectionProcess + dependentCost) * 100);
        }
      }
    } else if (userOverrides.selection_process_fee !== undefined) {
      selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
    } else {
      selectionProcessFee = Math.round((expectedSelectionProcess + dependentCost) * 100);
    }

    // I-20 Control Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let i20ControlFee: number;
    const expectedI20Control = getFeeAmount('i20_control_fee');
    
    if (realPaid?.i20_control !== undefined && realPaid.i20_control > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.i20_control, expectedI20Control)) {
        i20ControlFee = Math.round(realPaid.i20_control * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        if (userOverrides.i20_control_fee !== undefined) {
          i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
        } else {
          i20ControlFee = Math.round(expectedI20Control * 100);
        }
      }
    } else if (userOverrides.i20_control_fee !== undefined) {
      i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
    } else {
      i20ControlFee = Math.round(expectedI20Control * 100);
    }

    // Scholarship Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let scholarshipFee: number;
    const expectedScholarship = systemType === 'simplified' ? 550 : 900;
    
    if (realPaid?.scholarship !== undefined && realPaid.scholarship > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.scholarship, expectedScholarship)) {
        scholarshipFee = Math.round(realPaid.scholarship * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        if (userOverrides.scholarship_fee !== undefined) {
          scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
        } else {
          scholarshipFee = Math.round(expectedScholarship * 100);
        }
      }
    } else if (userOverrides.scholarship_fee !== undefined) {
      scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
    } else {
      scholarshipFee = Math.round(expectedScholarship * 100);
    }

    // Application Fee - Prioridade: valor real pago (se razoável) > scholarship.application_fee_amount > cálculo fixo
    let applicationFee: number;
    const expectedApplicationFee = scholarship?.application_fee_amount 
      ? (parseFloat(scholarship.application_fee_amount) > 1000 
          ? parseFloat(scholarship.application_fee_amount) 
          : parseFloat(scholarship.application_fee_amount) * 100)
      : getFeeAmount('application_fee') * 100;
    const expectedApplicationFeeWithDeps = dependents > 0
      ? expectedApplicationFee + (dependents * 10000) // $100 por dependente (para ambos os sistemas)
      : expectedApplicationFee;
    
    if (realPaid?.application !== undefined && realPaid.application > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.application, expectedApplicationFeeWithDeps / 100)) {
        applicationFee = Math.round(realPaid.application * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        if (scholarship?.application_fee_amount) {
          const rawValue = parseFloat(scholarship.application_fee_amount);
          applicationFee = rawValue > 1000 ? Math.round(rawValue) : Math.round(rawValue * 100);
        } else {
          applicationFee = Math.round(getFeeAmount('application_fee') * 100);
        }
        if (dependents > 0) {
          applicationFee += dependents * 10000; // $100 por dependente (para ambos os sistemas)
        }
      }
    } else if (scholarship?.application_fee_amount) {
      const rawValue = parseFloat(scholarship.application_fee_amount);
      applicationFee = rawValue > 1000 ? Math.round(rawValue) : Math.round(rawValue * 100);
      if (dependents > 0) {
        applicationFee += dependents * 10000; // $100 por dependente (para ambos os sistemas)
      }
    } else {
      applicationFee = Math.round(getFeeAmount('application_fee') * 100);
      if (dependents > 0) {
        applicationFee += dependents * 10000; // $100 por dependente (para ambos os sistemas)
      }
    }

    // Selection Process (global)
    if (student.has_paid_selection_process_fee && !globalFeesProcessed[student.user_id]?.selection_process) {
      paymentRecords.push({
        id: `${student.user_id}-selection`,
        student_id: student.user_id,
        fee_type: 'selection_process',
        amount: selectionProcessFee,
        status: 'paid',
        payment_method: student.selection_process_fee_payment_method || 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: universityName,
        created_at: app.created_at
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
      globalFeesProcessed[student.user_id].selection_process = true;
    }

    // Application Fee (global)
    if (app.is_application_fee_paid && !globalFeesProcessed[student.user_id]?.application_fee) {
      paymentRecords.push({
        id: `${student.user_id}-application`,
        student_id: student.user_id,
        fee_type: 'application',
        amount: applicationFee,
        status: 'paid',
        payment_method: app.application_fee_payment_method || 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: universityName,
        created_at: app.created_at
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
      globalFeesProcessed[student.user_id].application_fee = true;
    }

    // Scholarship Fee (não criar para bolsa específica ignorada)
    if (app.is_scholarship_fee_paid && scholarship.id !== '31c9b8e6-af11-4462-8494-c79854f3f66e') {
      paymentRecords.push({
        id: `${app.id}-scholarship`,
        student_id: student.user_id,
        fee_type: 'scholarship',
        amount: scholarshipFee,
        status: 'paid',
        payment_method: app.scholarship_fee_payment_method || 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: universityName,
        created_at: app.created_at
      });
    }

    // I-20 Control (global) - EXATAMENTE igual ao Payment Management
    if (student.has_paid_i20_control_fee && !globalFeesProcessed[student.user_id]?.i20_control) {
      paymentRecords.push({
        id: `${student.user_id}-i20`,
        student_id: student.user_id,
        fee_type: 'i20_control_fee',
        amount: i20ControlFee,
        status: 'paid',
        payment_method: student.i20_control_fee_payment_method || 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: universityName,
        created_at: app.created_at
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
      globalFeesProcessed[student.user_id].i20_control = true;
    }
  });
}

/**
 * Processa pagamentos Zelle
 * EXATAMENTE igual ao Payment Management
 */
function processZellePayments(
  applications: any[],
  paymentRecords: any[],
  zellePaymentsByUser: { [userId: string]: any[] }
): void {
  Object.keys(zellePaymentsByUser).forEach(userId => {
    const userZellePayments = zellePaymentsByUser[userId];
    const firstPayment = userZellePayments[0];
    const student = firstPayment.user_profiles;
    if (!student) return;
    const studentName = student.full_name || 'Unknown Student';
    const studentEmail = student.email || '';
    const sellerReferralCode = student.seller_referral_code || null;
    if (!studentName) return;

    const hasApplication = applications?.some(app => (app as any).user_profiles?.user_id === (student as any).user_id);
    if (hasApplication) return;

    const paidFeeTypes = new Set(userZellePayments.map(payment => {
      if (payment.fee_type === 'application_fee') return 'application';
      if (payment.fee_type === 'selection_process_fee') return 'selection_process';
      if (payment.fee_type === 'scholarship_fee') return 'scholarship';
      if (payment.fee_type === 'i20_control_fee') return 'i20_control_fee';
      return payment.fee_type_global;
    }));

    if (paidFeeTypes.has('selection_process')) {
      const selectionPayment = userZellePayments.find((p: any) => p.fee_type_global === 'selection_process' || p.fee_type === 'selection_process_fee');
      paymentRecords.push({
        id: `zelle-${selectionPayment.id}-selection`,
        student_id: userId,
        fee_type: 'selection_process',
        amount: Math.round(parseFloat(selectionPayment.amount) * 100),
        status: 'paid',
        payment_method: 'zelle',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: selectionPayment.created_at
      });
    }

    if (paidFeeTypes.has('application')) {
      const applicationPayment = userZellePayments.find((p: any) => p.fee_type_global === 'application' || p.fee_type === 'application_fee');
      const applicationAmount = Math.round(parseFloat(applicationPayment.amount) * 100);
      paymentRecords.push({
        id: `zelle-${applicationPayment.id}-application`,
        student_id: userId,
        fee_type: 'application',
        amount: applicationAmount,
        status: 'paid',
        payment_method: 'zelle',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: applicationPayment.created_at
      });
    }

    if (paidFeeTypes.has('scholarship')) {
      const scholarshipPayment = userZellePayments.find((p: any) => p.fee_type_global === 'scholarship' || p.fee_type === 'scholarship_fee');
      paymentRecords.push({
        id: `zelle-${scholarshipPayment.id}-scholarship`,
        student_id: userId,
        fee_type: 'scholarship',
        amount: Math.round(parseFloat(scholarshipPayment.amount) * 100),
        status: 'paid',
        payment_method: 'zelle',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: scholarshipPayment.created_at
      });
    }

    if (paidFeeTypes.has('i20_control_fee')) {
      const i20Payment = userZellePayments.find((p: any) => p.fee_type_global === 'i20_control_fee' || p.fee_type === 'i20_control_fee');
      paymentRecords.push({
        id: `zelle-${i20Payment.id}-i20`,
        student_id: userId,
        fee_type: 'i20_control_fee',
        amount: Math.round(parseFloat(i20Payment.amount) * 100),
        status: 'paid',
        payment_method: 'zelle',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: i20Payment.created_at
      });
    }
  });
}

/**
 * Processa usuários Stripe
 * EXATAMENTE igual ao Payment Management
 */
function processStripeUsers(
  stripeUsers: any[],
  applications: any[],
  zellePaymentsByUser: { [userId: string]: any[] },
  overridesMap: { [key: string]: any },
  userSystemTypesMap: Map<string, string>,
  realPaymentAmounts: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number }>,
  getFeeAmount: (key: 'i20_control_fee' | 'application_fee') => number,
  globalFeesProcessed: { [userId: string]: { selection_process: boolean; i20_control: boolean; application_fee: boolean } },
  paymentRecords: any[]
): void {
  stripeUsers?.forEach((stripeUser: any) => {
    if (!stripeUser) return;
    const studentName = stripeUser.full_name || 'Unknown Student';
    const studentEmail = stripeUser.email || '';
    const sellerReferralCode = stripeUser.seller_referral_code || null;
    if (!studentName) return;

    const hasApplication = applications?.some(app => (app as any).user_profiles?.user_id === (stripeUser as any).user_id);
    if (hasApplication) return;
    const hasZellePayment = zellePaymentsByUser && Object.keys(zellePaymentsByUser).includes(stripeUser.user_id);
    if (hasZellePayment) return;

    const dependents = Number(stripeUser?.dependents) || 0;
    const userOverrides = overridesMap[stripeUser?.user_id] || {};
    const systemType = userSystemTypesMap.get(stripeUser.user_id) || 'legacy';
    // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
    // Dependentes só afetam Application Fee ($100 por dependente)
    const dependentCost = systemType === 'simplified' ? 0 : (dependents * 150);

    // Helper: Verifica se o valor está dentro de uma faixa razoável (50% de tolerância)
    const isValueReasonable = (realValue: number, expectedValue: number): boolean => {
      const tolerance = 0.5; // 50% de tolerância
      const min = expectedValue * (1 - tolerance);
      const max = expectedValue * (1 + tolerance);
      return realValue >= min && realValue <= max;
    };

    let selectionProcessFee: number;
    const expectedSelectionProcess = systemType === 'simplified' ? 350 : 400;
    const expectedSelectionProcessWithDeps = expectedSelectionProcess + dependentCost;
    const realPaid = realPaymentAmounts?.get(stripeUser?.user_id);
    
    if (realPaid?.selection_process !== undefined && realPaid.selection_process > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.selection_process, expectedSelectionProcessWithDeps)) {
        selectionProcessFee = Math.round(realPaid.selection_process * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        if (userOverrides.selection_process_fee !== undefined) {
          selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
        } else {
          selectionProcessFee = Math.round((expectedSelectionProcess + dependentCost) * 100);
        }
      }
    } else if (userOverrides.selection_process_fee !== undefined) {
      selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
    } else {
      selectionProcessFee = Math.round((expectedSelectionProcess + dependentCost) * 100);
    }

    let i20ControlFee: number;
    const expectedI20Control = getFeeAmount('i20_control_fee');
    
    if (realPaid?.i20_control !== undefined && realPaid.i20_control > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.i20_control, expectedI20Control)) {
        i20ControlFee = Math.round(realPaid.i20_control * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        if (userOverrides.i20_control_fee !== undefined) {
          i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
        } else {
          i20ControlFee = Math.round(expectedI20Control * 100);
        }
      }
    } else if (userOverrides.i20_control_fee !== undefined) {
      i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
    } else {
      i20ControlFee = Math.round(expectedI20Control * 100);
    }

    let scholarshipFee: number;
    if (userOverrides.scholarship_fee !== undefined) {
      scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
    } else {
      const systemType = userSystemTypesMap.get(stripeUser.user_id) || 'legacy';
      const amount = systemType === 'simplified' ? 550 : 900;
      scholarshipFee = Math.round(amount * 100);
    }
    let applicationFee = Math.round(getFeeAmount('application_fee') * 100);
    // systemType já foi declarado acima, reutilizar
    if (systemType === 'legacy' && dependents > 0) {
      applicationFee += dependents * 10000;
    }

    if (stripeUser.has_paid_selection_process_fee) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-selection`,
        student_id: stripeUser.user_id,
        fee_type: 'selection_process',
        amount: selectionProcessFee,
        status: 'paid',
        payment_method: stripeUser.selection_process_fee_payment_method || 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: stripeUser.created_at
      });
    }

    if (stripeUser.is_application_fee_paid) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-application`,
        student_id: stripeUser.user_id,
        fee_type: 'application',
        amount: applicationFee,
        status: 'paid',
        payment_method: 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: stripeUser.created_at
      });
    }

    if (stripeUser.is_scholarship_fee_paid) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-scholarship`,
        student_id: stripeUser.user_id,
        fee_type: 'scholarship',
        amount: scholarshipFee,
        status: 'paid',
        payment_method: 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: stripeUser.created_at
      });
    }

    // I-20 Control Fee - EXATAMENTE igual ao Payment Management (sem verificar globalFeesProcessed)
    if (stripeUser.has_paid_i20_control_fee) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-i20`,
        student_id: stripeUser.user_id,
        fee_type: 'i20_control_fee',
        amount: i20ControlFee,
        status: 'paid',
        payment_method: stripeUser.i20_control_fee_payment_method || 'manual',
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: 'No University Selected',
        created_at: stripeUser.created_at
      });
    }
  });
}

/**
 * Transforma dados financeiros em payment records e breakdowns
 */
export async function transformFinancialData(
  inputs: FinancialDataInputs
): Promise<ProcessedFinancialData> {
  const {
    applications,
    zellePayments,
    stripeUsers,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts,
    getFeeAmount
  } = inputs;

  const paymentRecords: any[] = [];
  
  const paymentsByMethod: Record<string, { count: number; revenue: number }> = {
    'stripe': { count: 0, revenue: 0 },
    'zelle': { count: 0, revenue: 0 },
    'manual': { count: 0, revenue: 0 }
  };

  const paymentsByFeeType: Record<string, { count: number; revenue: number }> = {
    'selection_process': { count: 0, revenue: 0 },
    'application': { count: 0, revenue: 0 },
    'scholarship': { count: 0, revenue: 0 },
    'i20_control_fee': { count: 0, revenue: 0 }
  };

  const globalFeesProcessed: { [userId: string]: { selection_process: boolean; i20_control: boolean; application_fee: boolean } } = {};

  // Processar applications
  processApplications(
    applications,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts,
    getFeeAmount,
    globalFeesProcessed,
    paymentRecords
  );

  // Criar zellePaymentsByUser antes de processar (necessário para processStripeUsers)
  const zellePaymentsByUser: { [userId: string]: any[] } = {};
  zellePayments?.forEach((zellePayment: any) => {
    const student = zellePayment.user_profiles;
    if (student?.user_id) {
      if (!zellePaymentsByUser[student.user_id]) {
        zellePaymentsByUser[student.user_id] = [];
      }
      zellePaymentsByUser[student.user_id].push(zellePayment);
    }
  });
  
  // Processar Zelle payments
  processZellePayments(applications, paymentRecords, zellePaymentsByUser);

  // Processar Stripe users
  processStripeUsers(
    stripeUsers,
    applications,
    zellePaymentsByUser,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts,
    getFeeAmount,
    globalFeesProcessed,
    paymentRecords
  );

  // Calcular estatísticas
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const studentRevenue = paidRecords.reduce((sum, p) => sum + p.amount, 0);

  // Processar dados por método de pagamento
  paidRecords.forEach(record => {
    const method = record.payment_method || 'manual';
    // Mapear 'pix' para 'stripe' (Pix é processado via Stripe)
    const normalizedMethod = method === 'pix' ? 'stripe' : method;
    if (paymentsByMethod[normalizedMethod]) {
      paymentsByMethod[normalizedMethod].count++;
      paymentsByMethod[normalizedMethod].revenue += record.amount;
    } else {
      paymentsByMethod['manual'].count++;
      paymentsByMethod['manual'].revenue += record.amount;
    }
  });

  // Processar dados por tipo de taxa
  paidRecords.forEach(record => {
    const feeType = record.fee_type;
    if (paymentsByFeeType[feeType]) {
      paymentsByFeeType[feeType].count++;
      paymentsByFeeType[feeType].revenue += record.amount;
    }
  });

  const totalMethodRevenue = Object.values(paymentsByMethod).reduce((sum, method) => sum + method.revenue, 0);
  const totalFeeRevenue = Object.values(paymentsByFeeType).reduce((sum, fee) => sum + fee.revenue, 0);

  return {
    paymentRecords,
    paymentsByMethod,
    paymentsByFeeType,
    revenueData: [], // Será calculado em calculateMetrics
    metrics: {
      totalRevenue: studentRevenue,
      monthlyRevenue: studentRevenue,
      revenueGrowth: 0,
      totalPayments: paymentRecords.length,
      paidPayments: paidRecords.length,
      pendingPayments: 0,
      conversionRate: 0,
      averageTransactionValue: 0,
      totalStudents: 0,
      pendingPayouts: 0,
      completedPayouts: 0,
      completedAffiliatePayouts: 0,
      completedUniversityPayouts: 0,
      universityPayouts: 0,
      affiliatePayouts: 0
    },
    paymentMethodData: Object.entries(paymentsByMethod).map(([method, data]) => ({
      method: method === 'stripe' ? 'Stripe' : method === 'zelle' ? 'Zelle' : 'Outside',
      count: data.count,
      revenue: data.revenue,
      percentage: totalMethodRevenue > 0 ? (data.revenue / totalMethodRevenue) * 100 : 0
    })),
    feeTypeData: Object.entries(paymentsByFeeType).map(([feeType, data]) => ({
      feeType: feeType === 'selection_process' ? 'Selection Process' :
               feeType === 'application' ? 'Application Fee' :
               feeType === 'scholarship' ? 'Scholarship Fee' : 'I-20 Control Fee',
      count: data.count,
      revenue: data.revenue,
      percentage: totalFeeRevenue > 0 ? (data.revenue / totalFeeRevenue) * 100 : 0
    }))
  };
}
