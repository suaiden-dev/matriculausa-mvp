import type { PaymentRecord, PaymentStats } from '../data/types';

interface TransformInputs {
  applications: any[];
  zellePayments: any[];
  stripeUsers: any[];
  overridesMap: Record<string, any>;
  userSystemTypesMap: Map<string, string>;
  individualPaymentDates: Map<string, Map<string, string>>;
  getFeeAmount: (key: 'i20_control_fee' | 'application_fee') => number;
  realPaymentAmounts?: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number }>;
}

export function transformPaymentsToRecordsAndStats({
  applications,
  zellePayments,
  stripeUsers,
  overridesMap,
  userSystemTypesMap,
  individualPaymentDates,
  getFeeAmount,
  realPaymentAmounts,
}: TransformInputs): { paymentRecords: PaymentRecord[]; stats: PaymentStats } {
  const paymentRecords: PaymentRecord[] = [];

  // Mapas para evitar duplicação de taxas globais
  const globalFeesProcessed: { [userId: string]: { selection_process: boolean; i20_control: boolean; application_fee: boolean } } = {};

  // Applications → registros
  applications?.forEach((app: any) => {
    const student = app.user_profiles;
    const scholarship = app.scholarships;
    const university = scholarship?.universities;
    if (!student || !scholarship || !university) return;

    const studentName = student.full_name || 'Unknown Student';
    const studentEmail = student.email || '';
    const universityName = university.name || 'Unknown University';
    const scholarshipTitle = scholarship.title || 'Unknown Scholarship';
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
        console.log(`[PaymentManagement] Valor de selection_process muito discrepante para ${studentEmail}: ${realPaid.selection_process} (esperado ~${expectedSelectionProcessWithDeps}), usando cálculo fixo`);
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
        console.log(`[PaymentManagement] Valor de i20_control muito discrepante para ${studentEmail}: ${realPaid.i20_control} (esperado ~${expectedI20Control}), usando cálculo fixo`);
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
        console.log(`[PaymentManagement] Valor de scholarship muito discrepante para ${studentEmail}: ${realPaid.scholarship} (esperado ~${expectedScholarship}), usando cálculo fixo`);
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
        console.log(`[PaymentManagement] Valor de application muito discrepante para ${studentEmail}: ${realPaid.application} (esperado ~${expectedApplicationFeeWithDeps / 100}), usando cálculo fixo`);
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
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: university.id,
        university_name: universityName,
        scholarship_id: scholarship.id,
        scholarship_title: scholarshipTitle,
        field_of_study: scholarship?.field_of_study || null,
        fee_type: 'selection_process',
        amount: selectionProcessFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(student.user_id)?.get('selection_process') || student.last_payment_date || app.paid_at || app.created_at,
        created_at: app.created_at,
        payment_method: student.selection_process_fee_payment_method || 'manual',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: scholarship.id ? [scholarship.id] : [],
      } as PaymentRecord);
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
      globalFeesProcessed[student.user_id].selection_process = true;
    }

    // Application Fee (global)
    if (app.is_application_fee_paid && !globalFeesProcessed[student.user_id]?.application_fee) {
      paymentRecords.push({
        id: `${student.user_id}-application`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: university.id,
        university_name: universityName,
        scholarship_id: scholarship.id,
        scholarship_title: scholarshipTitle,
        field_of_study: scholarship?.field_of_study || null,
        fee_type: 'application',
        amount: applicationFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(student.user_id)?.get('application') || student.last_payment_date || app.paid_at || app.created_at,
        created_at: app.created_at,
        payment_method: app.application_fee_payment_method || 'manual',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: scholarship.id ? [scholarship.id] : [],
      } as PaymentRecord);
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
      globalFeesProcessed[student.user_id].application_fee = true;
    }

    // Scholarship Fee (não criar para bolsa específica ignorada)
    if (app.is_scholarship_fee_paid && scholarship.id !== '31c9b8e6-af11-4462-8494-c79854f3f66e') {
      paymentRecords.push({
        id: `${app.id}-scholarship`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: university.id,
        university_name: universityName,
        scholarship_id: scholarship.id,
        scholarship_title: scholarshipTitle,
        field_of_study: scholarship?.field_of_study || null,
        fee_type: 'scholarship',
        amount: scholarshipFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(student.user_id)?.get('scholarship') || student.last_payment_date || app.paid_at || app.created_at,
        created_at: app.created_at,
        payment_method: app.scholarship_fee_payment_method || 'manual',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: scholarship.id ? [scholarship.id] : [],
      } as PaymentRecord);
    }

    // I-20 Control (global)
    if (student.has_paid_i20_control_fee && !globalFeesProcessed[student.user_id]?.i20_control) {
      paymentRecords.push({
        id: `${student.user_id}-i20`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: university.id,
        university_name: universityName,
        scholarship_id: scholarship.id,
        scholarship_title: scholarshipTitle,
        field_of_study: scholarship?.field_of_study || null,
        fee_type: 'i20_control_fee',
        amount: i20ControlFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(student.user_id)?.get('i20_control') || student.last_payment_date || app.paid_at || app.created_at,
        created_at: app.created_at,
        payment_method: student.i20_control_fee_payment_method || 'manual',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: scholarship.id ? [scholarship.id] : [],
      } as PaymentRecord);
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
      globalFeesProcessed[student.user_id].i20_control = true;
    }
  });

  // Zelle → registros (para usuários sem application)
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

  Object.keys(zellePaymentsByUser).forEach(userId => {
    const userZellePayments = zellePaymentsByUser[userId];
    const firstPayment = userZellePayments[0];
    const student = firstPayment.user_profiles;
    if (!student) return;
    const studentName = student.full_name || 'Unknown Student';
    const studentEmail = student.email || '';
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
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'selection_process',
        amount: Math.round(parseFloat(selectionPayment.amount) * 100),
        status: 'paid',
        payment_date: individualPaymentDates.get(selectionPayment.user_id)?.get('selection_process') || selectionPayment.admin_approved_at || selectionPayment.created_at,
        created_at: selectionPayment.created_at,
        payment_proof_url: selectionPayment.screenshot_url,
        admin_notes: selectionPayment.admin_notes,
        zelle_status: 'approved',
        reviewed_by: selectionPayment.admin_approved_by,
        reviewed_at: selectionPayment.admin_approved_at,
        payment_method: 'zelle',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (paidFeeTypes.has('application')) {
      const applicationPayment = userZellePayments.find((p: any) => p.fee_type_global === 'application' || p.fee_type === 'application_fee');
      const applicationAmount = Math.round(parseFloat(applicationPayment.amount) * 100);
      paymentRecords.push({
        id: `zelle-${applicationPayment.id}-application`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'application',
        amount: applicationAmount,
        status: 'paid',
        payment_date: individualPaymentDates.get(applicationPayment.user_id)?.get('application') || applicationPayment.admin_approved_at || applicationPayment.created_at,
        created_at: applicationPayment.created_at,
        payment_proof_url: applicationPayment.screenshot_url,
        admin_notes: applicationPayment.admin_notes,
        zelle_status: 'approved',
        reviewed_by: applicationPayment.admin_approved_by,
        reviewed_at: applicationPayment.admin_approved_at,
        payment_method: 'zelle',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (paidFeeTypes.has('scholarship')) {
      const scholarshipPayment = userZellePayments.find((p: any) => p.fee_type_global === 'scholarship' || p.fee_type === 'scholarship_fee');
      paymentRecords.push({
        id: `zelle-${scholarshipPayment.id}-scholarship`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'scholarship',
        amount: Math.round(parseFloat(scholarshipPayment.amount) * 100),
        status: 'paid',
        payment_date: individualPaymentDates.get(scholarshipPayment.user_id)?.get('scholarship') || scholarshipPayment.admin_approved_at || scholarshipPayment.created_at,
        created_at: scholarshipPayment.created_at,
        payment_proof_url: scholarshipPayment.screenshot_url,
        admin_notes: scholarshipPayment.admin_notes,
        zelle_status: 'approved',
        reviewed_by: scholarshipPayment.admin_approved_by,
        reviewed_at: scholarshipPayment.admin_approved_at,
        payment_method: 'zelle',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (paidFeeTypes.has('i20_control_fee')) {
      const i20Payment = userZellePayments.find((p: any) => p.fee_type_global === 'i20_control_fee' || p.fee_type === 'i20_control_fee');
      paymentRecords.push({
        id: `zelle-${i20Payment.id}-i20`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'i20_control_fee',
        amount: Math.round(parseFloat(i20Payment.amount) * 100),
        status: 'paid',
        payment_date: individualPaymentDates.get(i20Payment.user_id)?.get('i20_control') || i20Payment.admin_approved_at || i20Payment.created_at,
        created_at: i20Payment.created_at,
        payment_proof_url: i20Payment.screenshot_url,
        admin_notes: i20Payment.admin_notes,
        zelle_status: 'approved',
        reviewed_by: i20Payment.admin_approved_by,
        reviewed_at: i20Payment.admin_approved_at,
        payment_method: 'zelle',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }
  });

  // Stripe → registros (para usuários sem application e sem Zelle)
  stripeUsers?.forEach((stripeUser: any) => {
    if (!stripeUser) return;
    const studentName = stripeUser.full_name || 'Unknown Student';
    const studentEmail = stripeUser.email || '';
    if (!studentName) return;

    const hasApplication = applications?.some(app => (app as any).user_profiles?.user_id === (stripeUser as any).user_id);
    if (hasApplication) return;
    const hasZellePayment = zellePayments?.some((payment: any) => payment.user_profiles?.user_id === stripeUser.user_id);
    if (hasZellePayment) return;

    const dependents = Number(stripeUser?.dependents) || 0;
    const userOverrides = overridesMap[stripeUser?.user_id] || {};
    const realPaid = realPaymentAmounts?.get(stripeUser?.user_id);
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
        console.log(`[PaymentManagement] Valor de selection_process muito discrepante para ${studentName} (${studentEmail}): ${realPaid.selection_process} (esperado ~${expectedSelectionProcessWithDeps}), usando cálculo fixo`);
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
        console.log(`[PaymentManagement] Valor de i20_control muito discrepante para ${studentName} (${studentEmail}): ${realPaid.i20_control} (esperado ~${expectedI20Control}), usando cálculo fixo`);
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
        console.log(`[PaymentManagement] Valor de scholarship muito discrepante para ${studentName} (${studentEmail}): ${realPaid.scholarship} (esperado ~${expectedScholarship}), usando cálculo fixo`);
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

    // Application Fee - Prioridade: valor real pago (se razoável) > cálculo fixo
    let applicationFee: number;
    const expectedApplicationFee = getFeeAmount('application_fee');
    const expectedApplicationFeeWithDeps = dependents > 0
      ? expectedApplicationFee + (dependents * 100) // $100 por dependente
      : expectedApplicationFee;
    
    if (realPaid?.application !== undefined && realPaid.application > 0) {
      // Verificar se o valor está razoável (dentro de 50% do esperado)
      if (isValueReasonable(realPaid.application, expectedApplicationFeeWithDeps)) {
        applicationFee = Math.round(realPaid.application * 100);
      } else {
        // Valor muito discrepante, usar cálculo fixo
        console.log(`[PaymentManagement] Valor de application muito discrepante para ${studentName} (${studentEmail}): ${realPaid.application} (esperado ~${expectedApplicationFeeWithDeps}), usando cálculo fixo`);
        applicationFee = Math.round(expectedApplicationFee * 100);
        if (systemType === 'legacy' && dependents > 0) {
          applicationFee += dependents * 10000; // $100 por dependente
        }
      }
    } else {
      applicationFee = Math.round(expectedApplicationFee * 100);
      if (systemType === 'legacy' && dependents > 0) {
        applicationFee += dependents * 10000; // $100 por dependente
      }
    }

    if (stripeUser.has_paid_selection_process_fee) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-selection`,
        student_id: stripeUser.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'selection_process',
        amount: selectionProcessFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(stripeUser.user_id)?.get('selection_process') || stripeUser.last_payment_date || stripeUser.created_at,
        created_at: stripeUser.created_at,
        payment_method: stripeUser.selection_process_fee_payment_method || 'manual',
        seller_referral_code: stripeUser.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (stripeUser.is_application_fee_paid) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-application`,
        student_id: stripeUser.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'application',
        amount: applicationFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(stripeUser.user_id)?.get('application') || stripeUser.last_payment_date || stripeUser.created_at,
        created_at: stripeUser.created_at,
        payment_method: 'manual',
        seller_referral_code: stripeUser.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (stripeUser.is_scholarship_fee_paid) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-scholarship`,
        student_id: stripeUser.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'scholarship',
        amount: scholarshipFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(stripeUser.user_id)?.get('scholarship') || stripeUser.last_payment_date || stripeUser.created_at,
        created_at: stripeUser.created_at,
        payment_method: 'manual',
        seller_referral_code: stripeUser.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (stripeUser.has_paid_i20_control_fee) {
      paymentRecords.push({
        id: `stripe-${stripeUser.user_id}-i20`,
        student_id: stripeUser.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'i20_control_fee',
        amount: i20ControlFee,
        status: 'paid',
        payment_date: individualPaymentDates.get(stripeUser.user_id)?.get('i20_control') || stripeUser.last_payment_date || stripeUser.created_at,
        created_at: stripeUser.created_at,
        payment_method: stripeUser.i20_control_fee_payment_method || 'manual',
        seller_referral_code: stripeUser.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }
  });

  // Stats
  const totalPayments = paymentRecords.length;
  const paidPayments = paymentRecords.filter(p => p.status === 'paid').length;
  const pendingPayments = paymentRecords.filter(p => p.status === 'pending').length;
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const totalRevenue = paidRecords.reduce((sum, p) => sum + p.amount, 0);
  const manualRevenue = paidRecords
    .filter(p => (p.payment_method || '').toLowerCase() === 'manual')
    .reduce((sum, p) => sum + p.amount, 0);

  const stats: PaymentStats = {
    totalRevenue,
    totalPayments,
    paidPayments,
    pendingPayments,
    monthlyGrowth: 0,
    manualRevenue,
  };

  return { paymentRecords, stats };
}


