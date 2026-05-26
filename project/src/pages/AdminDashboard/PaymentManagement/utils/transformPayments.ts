import type { PaymentRecord, PaymentStats } from '../data/types';
import type { PlacementInstallmentRow } from '../../../../utils/paymentConverter';

interface TransformInputs {
  applications: any[];
  zellePayments: any[];
  stripeUsers: any[];
  overridesMap: Record<string, any>;
  userSystemTypesMap: Map<string, string>;
  individualPaymentDates: Map<string, Map<string, string>>;
  getFeeAmount: (key: 'i20_control_fee' | 'application_fee') => number;
  realPaymentAmounts?: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number; placement?: number; ds160_package?: number; i539_cos_package?: number; reinstatement_package?: number }>;
  placementInstallmentRows?: Map<string, PlacementInstallmentRow[]>;
  placementInstallmentPlans?: Map<string, number>;
  individualFeePayments?: any[];
}

function createPaymentRecordsForFee({
  student,
  feeType,
  canonicalFeeType,
  fallbackAmount,
  fallbackDate,
  fallbackMethod,
  baseRecord,
  individualFeePayments,
  paymentRecords,
}: {
  student: any;
  feeType: string;
  canonicalFeeType: string;
  fallbackAmount: number;
  fallbackDate: string;
  fallbackMethod: string;
  baseRecord: Omit<PaymentRecord, 'id' | 'amount' | 'payment_date' | 'payment_method' | 'installment_number' | 'total_installments'>;
  individualFeePayments?: any[];
  paymentRecords: PaymentRecord[];
}) {
  const userPhysicalPayments = (individualFeePayments || []).filter((p) => {
    if (p.user_id !== student.user_id) return false;
    const typeNormalized = p.fee_type === 'selection_process_fee' || p.fee_type === 'selection_process' ? 'selection_process' :
                           p.fee_type === 'application_fee' || p.fee_type === 'application' ? 'application' :
                           p.fee_type === 'scholarship_fee' || p.fee_type === 'scholarship' ? 'scholarship' :
                           p.fee_type === 'i20_control' || p.fee_type === 'i20_control_fee' ? 'i20_control_fee' :
                           p.fee_type === 'placement_fee' || p.fee_type === 'placement' ? 'placement' :
                           p.fee_type === 'reinstatement' || p.fee_type === 'reinstatement_fee' || p.fee_type === 'reinstatement_package' ? 'reinstatement_fee' :
                           p.fee_type === 'ds160_package' || p.fee_type === 'i539_cos_package' || p.fee_type === 'i539_package' ? 'control_fee' : p.fee_type;
    return typeNormalized === feeType;
  });

  if (userPhysicalPayments.length > 0) {
    const sortedPhysicals = [...userPhysicalPayments].sort((a, b) => 
      new Date(a.payment_date || 0).getTime() - new Date(b.payment_date || 0).getTime()
    );
    sortedPhysicals.forEach((p, idx) => {
      paymentRecords.push({
        ...baseRecord,
        id: p.id,
        amount: Math.round(Number(p.amount) * 100),
        payment_date: p.payment_date || fallbackDate,
        payment_method: p.payment_method || fallbackMethod,
        installment_number: sortedPhysicals.length > 1 ? idx + 1 : undefined,
        total_installments: sortedPhysicals.length > 1 ? sortedPhysicals.length : undefined,
      } as PaymentRecord);
    });
  } else {
    paymentRecords.push({
      ...baseRecord,
      id: `${student.user_id}-${canonicalFeeType}`,
      amount: fallbackAmount,
      payment_date: fallbackDate,
      payment_method: fallbackMethod,
    } as PaymentRecord);
  }
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
  placementInstallmentRows,
  placementInstallmentPlans,
  individualFeePayments,
}: TransformInputs): { paymentRecords: PaymentRecord[]; stats: PaymentStats } {
  const paymentRecords: PaymentRecord[] = [];

  // Mapas para evitar duplicação de taxas globais
  const globalFeesProcessed: { [userId: string]: { 
    selection_process: boolean; 
    i20_control: boolean; 
    application_fee: boolean; 
    placement_fee: boolean;
    ds160_package: boolean;
    i539_cos_package: boolean;
    reinstatement_fee: boolean;
  } } = {};

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



    // Selection Process Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let selectionProcessFee: number;
    const expectedSelectionProcess = systemType === 'simplified' ? 350 : 400;

    if (realPaid?.selection_process !== undefined && realPaid?.selection_process !== null) {
      // ✅ PRIORIDADE: Valor real pago (inclui $0 registrado pelo admin)
      selectionProcessFee = Math.round(realPaid.selection_process * 100);
    } else if (student.selection_process_fee_payment_method === 'coupon') {
      // Cupom 100% OFF — nenhum valor real pago
      selectionProcessFee = 0;
    } else if (userOverrides.selection_process_fee !== undefined) {
      selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
    } else {
      selectionProcessFee = Math.round((expectedSelectionProcess + dependentCost) * 100);
    }

    // I-20 Control Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let i20ControlFee: number;
    const expectedI20Control = getFeeAmount('i20_control_fee');
    
    if (realPaid?.i20_control !== undefined && realPaid.i20_control > 0) {
      // ✅ PRIORIDADE: Valor real pago (Auditável)
      i20ControlFee = Math.round(realPaid.i20_control * 100);
    } else if (userOverrides.i20_control_fee !== undefined) {
      i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
    } else {
      i20ControlFee = Math.round(expectedI20Control * 100);
    }

    // Scholarship Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let scholarshipFee: number;
    const expectedScholarship = systemType === 'simplified' ? 900 : 900;
    
    if (realPaid?.scholarship !== undefined && realPaid.scholarship > 0) {
      // ✅ PRIORIDADE: Valor real pago (Auditável)
      scholarshipFee = Math.round(realPaid.scholarship * 100);
    } else if (userOverrides.scholarship_fee !== undefined) {
      scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
    } else {
      scholarshipFee = Math.round(expectedScholarship * 100);
    }

    // Application Fee - Prioridade: valor real pago (se razoável) > scholarship.application_fee_amount > cálculo fixo
    let applicationFee: number;


    
    if (realPaid?.application !== undefined && realPaid.application > 0) {
      // ✅ PRIORIDADE: Valor real pago (Auditável)
      applicationFee = Math.round(realPaid.application * 100);
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
      createPaymentRecordsForFee({
        student,
        feeType: 'selection_process',
        canonicalFeeType: 'selection',
        fallbackAmount: selectionProcessFee,
        fallbackDate: individualPaymentDates.get(student.user_id)?.get('selection_process') || student.last_payment_date || app.paid_at || app.created_at,
        fallbackMethod: student.selection_process_fee_payment_method || 'manual',
        baseRecord: {
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          field_of_study: scholarship?.field_of_study || null,
          fee_type: 'selection_process',
          status: 'paid',
          created_at: app.created_at,
          seller_referral_code: student.seller_referral_code,
          scholarships_ids: scholarship.id ? [scholarship.id] : [],
        },
        individualFeePayments,
        paymentRecords,
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false, placement_fee: false, ds160_package: false, i539_cos_package: false, reinstatement_fee: false };
      globalFeesProcessed[student.user_id].selection_process = true;
    }

    // Application Fee (global)
    if (app.is_application_fee_paid && !globalFeesProcessed[student.user_id]?.application_fee) {
      createPaymentRecordsForFee({
        student,
        feeType: 'application',
        canonicalFeeType: 'application',
        fallbackAmount: applicationFee,
        fallbackDate: individualPaymentDates.get(student.user_id)?.get('application') || student.last_payment_date || app.paid_at || app.created_at,
        fallbackMethod: app.application_fee_payment_method || 'manual',
        baseRecord: {
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          field_of_study: scholarship?.field_of_study || null,
          fee_type: 'application',
          status: 'paid',
          created_at: app.created_at,
          seller_referral_code: student.seller_referral_code,
          scholarships_ids: scholarship.id ? [scholarship.id] : [],
        },
        individualFeePayments,
        paymentRecords,
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false, placement_fee: false, ds160_package: false, i539_cos_package: false, reinstatement_fee: false };
      globalFeesProcessed[student.user_id].application_fee = true;
    }

    // Scholarship Fee (não criar para bolsa específica ignorada nem para placement_fee_flow)
    if (app.is_scholarship_fee_paid && scholarship.id !== '31c9b8e6-af11-4462-8494-c79854f3f66e' && !student.placement_fee_flow) {
      createPaymentRecordsForFee({
        student,
        feeType: 'scholarship',
        canonicalFeeType: 'scholarship',
        fallbackAmount: scholarshipFee,
        fallbackDate: individualPaymentDates.get(student.user_id)?.get('scholarship') || student.last_payment_date || app.paid_at || app.created_at,
        fallbackMethod: app.scholarship_fee_payment_method || 'manual',
        baseRecord: {
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          field_of_study: scholarship?.field_of_study || null,
          fee_type: 'scholarship',
          status: 'paid',
          created_at: app.created_at,
          seller_referral_code: student.seller_referral_code,
          scholarships_ids: scholarship.id ? [scholarship.id] : [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    // I-20 Control (global)
    if (student.has_paid_i20_control_fee && !globalFeesProcessed[student.user_id]?.i20_control && !student.placement_fee_flow) {
      createPaymentRecordsForFee({
        student,
        feeType: 'i20_control_fee',
        canonicalFeeType: 'i20',
        fallbackAmount: i20ControlFee,
        fallbackDate: individualPaymentDates.get(student.user_id)?.get('i20_control') || student.last_payment_date || app.paid_at || app.created_at,
        fallbackMethod: student.i20_control_fee_payment_method || 'manual',
        baseRecord: {
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          field_of_study: scholarship?.field_of_study || null,
          fee_type: 'i20_control_fee',
          status: 'paid',
          created_at: app.created_at,
          seller_referral_code: student.seller_referral_code,
          scholarships_ids: scholarship.id ? [scholarship.id] : [],
        },
        individualFeePayments,
        paymentRecords,
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false, placement_fee: false, ds160_package: false, i539_cos_package: false, reinstatement_fee: false };
      globalFeesProcessed[student.user_id].i20_control = true;
    }

    // ✅ NOVO: DS-160 Package Fee
    if (student.has_paid_ds160_package && !globalFeesProcessed[student.user_id]?.ds160_package) {
      let ds160PackageFeeAmount: number;
      if (realPaid?.ds160_package !== undefined && realPaid.ds160_package > 0) {
        ds160PackageFeeAmount = Math.round(realPaid.ds160_package * 100);
      } else if (userOverrides.ds160_package_fee !== undefined) {
        ds160PackageFeeAmount = Math.round(userOverrides.ds160_package_fee * 100);
      } else {
        ds160PackageFeeAmount = 180000; // $1800.00 fallback
      }

      createPaymentRecordsForFee({
        student,
        feeType: 'control_fee',
        canonicalFeeType: 'ds160',
        fallbackAmount: ds160PackageFeeAmount,
        fallbackDate: individualPaymentDates.get(student.user_id)?.get('ds160_package') || student.last_payment_date || app.paid_at || app.created_at,
        fallbackMethod: student.ds160_package_payment_method || 'manual',
        baseRecord: {
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          field_of_study: scholarship?.field_of_study || null,
          fee_type: 'control_fee',
          status: 'paid',
          created_at: app.created_at,
          seller_referral_code: student.seller_referral_code,
          scholarships_ids: scholarship.id ? [scholarship.id] : [],
        },
        individualFeePayments,
        paymentRecords,
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false, placement_fee: false, ds160_package: false, i539_cos_package: false, reinstatement_fee: false };
      globalFeesProcessed[student.user_id].ds160_package = true;
    }

    // ✅ NOVO: I-539 COS Package Fee
    if (student.has_paid_i539_cos_package && !globalFeesProcessed[student.user_id]?.i539_cos_package) {
      let i539CosPackageFeeAmount: number;
      if (realPaid?.i539_cos_package !== undefined && realPaid.i539_cos_package > 0) {
        i539CosPackageFeeAmount = Math.round(realPaid.i539_cos_package * 100);
      } else if (userOverrides.i539_cos_package_fee !== undefined) {
        i539CosPackageFeeAmount = Math.round(userOverrides.i539_cos_package_fee * 100);
      } else {
        i539CosPackageFeeAmount = 180000; // $1800.00 fallback
      }

      createPaymentRecordsForFee({
        student,
        feeType: 'control_fee',
        canonicalFeeType: 'i539',
        fallbackAmount: i539CosPackageFeeAmount,
        fallbackDate: individualPaymentDates.get(student.user_id)?.get('i539_cos_package') || student.last_payment_date || app.paid_at || app.created_at,
        fallbackMethod: student.i539_cos_package_payment_method || 'manual',
        baseRecord: {
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          field_of_study: scholarship?.field_of_study || null,
          fee_type: 'control_fee',
          status: 'paid',
          created_at: app.created_at,
          seller_referral_code: student.seller_referral_code,
          scholarships_ids: scholarship.id ? [scholarship.id] : [],
        },
        individualFeePayments,
        paymentRecords,
      });
      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false, placement_fee: false, ds160_package: false, i539_cos_package: false, reinstatement_fee: false };
      globalFeesProcessed[student.user_id].i539_cos_package = true;
    }

    // Placement Fee (novo fluxo)
    if (student.placement_fee_flow && student.is_placement_fee_paid && !globalFeesProcessed[student.user_id]?.placement_fee) {
      const installmentRows = placementInstallmentRows?.get(student.user_id) || [];

      if (installmentRows.length > 1) {
        // Multiple installment payments — create one row per payment
        const planTotal = placementInstallmentPlans?.get(student.user_id) ?? installmentRows.length;
        installmentRows.forEach((row, idx) => {
          const rowAmount = Math.round((row.gross_amount_usd ?? row.amount) * 100);
          paymentRecords.push({
            id: `${student.user_id}-placement-${idx + 1}`,
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: university.id,
            university_name: universityName,
            scholarship_id: scholarship.id,
            scholarship_title: scholarshipTitle,
            field_of_study: scholarship?.field_of_study || null,
            fee_type: 'placement',
            amount: rowAmount,
            status: 'paid',
            payment_date: row.payment_date || individualPaymentDates.get(student.user_id)?.get('placement') || student.last_payment_date || app.paid_at || app.created_at,
            created_at: app.created_at,
            payment_method: (row.payment_method as any) || student.placement_fee_payment_method || 'manual',
            seller_referral_code: student.seller_referral_code,
            scholarships_ids: scholarship.id ? [scholarship.id] : [],
            installment_number: idx + 1,
            total_installments: planTotal,
          } as PaymentRecord);
        });
      } else {
        // Single payment — original behavior
        let placementFeeAmount: number;
        if (installmentRows.length === 1) {
          placementFeeAmount = Math.round((installmentRows[0].gross_amount_usd ?? installmentRows[0].amount) * 100);
        } else if (realPaid?.placement !== undefined && realPaid.placement > 0) {
          placementFeeAmount = Math.round(realPaid.placement * 100);
        } else if (userOverrides.placement_fee !== undefined) {
          placementFeeAmount = Math.round(userOverrides.placement_fee * 100);
        } else if (scholarship?.placement_fee_amount) {
          placementFeeAmount = Math.round(Number(scholarship.placement_fee_amount) * 100);
        } else {
          placementFeeAmount = 145000;
        }

        createPaymentRecordsForFee({
          student,
          feeType: 'placement',
          canonicalFeeType: 'placement',
          fallbackAmount: placementFeeAmount,
          fallbackDate: individualPaymentDates.get(student.user_id)?.get('placement') || student.last_payment_date || app.paid_at || app.created_at,
          fallbackMethod: student.placement_fee_payment_method || 'manual',
          baseRecord: {
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: university.id,
            university_name: universityName,
            scholarship_id: scholarship.id,
            scholarship_title: scholarshipTitle,
            field_of_study: scholarship?.field_of_study || null,
            fee_type: 'placement',
            status: 'paid',
            created_at: app.created_at,
            seller_referral_code: student.seller_referral_code,
            scholarships_ids: scholarship.id ? [scholarship.id] : [],
          },
          individualFeePayments,
          paymentRecords,
        });
      }

      if (!globalFeesProcessed[student.user_id]) globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false, placement_fee: false, ds160_package: false, i539_cos_package: false, reinstatement_fee: false };
      globalFeesProcessed[student.user_id].placement_fee = true;
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
      if (payment.fee_type === 'application_fee' || payment.fee_type === 'application') return 'application';
      if (payment.fee_type === 'selection_process_fee' || payment.fee_type === 'selection_process') return 'selection_process';
      if (payment.fee_type === 'scholarship_fee' || payment.fee_type === 'scholarship') return 'scholarship';
      if (payment.fee_type === 'i20_control_fee' || payment.fee_type === 'i20_control') return 'i20_control_fee';
      if (payment.fee_type === 'placement_fee' || payment.fee_type === 'placement') return 'placement';
      if (payment.fee_type === 'ds160_package') return 'ds160_package';
      if (payment.fee_type === 'i539_cos_package') return 'i539_cos_package';
      if (payment.fee_type === 'reinstatement_package' || payment.fee_type === 'reinstatement_fee') return 'reinstatement_fee';
      return payment.fee_type_global;
    }));

    if (paidFeeTypes.has('selection_process')) {
      const selectionPayment = userZellePayments.find((p: any) => 
        p.fee_type_global === 'selection_process' || 
        p.fee_type === 'selection_process_fee' || 
        p.fee_type === 'selection_process'
      );
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
      const applicationPayment = userZellePayments.find((p: any) => 
        p.fee_type_global === 'application' || 
        p.fee_type === 'application_fee' || 
        p.fee_type === 'application'
      );
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

    if (paidFeeTypes.has('scholarship') && !student.placement_fee_flow) {
      const scholarshipPayment = userZellePayments.find((p: any) => 
        p.fee_type_global === 'scholarship' || 
        p.fee_type === 'scholarship_fee' || 
        p.fee_type === 'scholarship'
      );
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

    if (paidFeeTypes.has('i20_control_fee') && !student.placement_fee_flow) {
      const i20Payment = userZellePayments.find((p: any) => 
        p.fee_type_global === 'i20_control_fee' || 
        p.fee_type === 'i20_control_fee' || 
        p.fee_type === 'i20_control'
      );
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

    if (paidFeeTypes.has('ds160_package')) {
      const ds160Payment = userZellePayments.find((p: any) => p.fee_type_global === 'ds160_package' || p.fee_type === 'ds160_package');
      paymentRecords.push({
        id: `zelle-${ds160Payment.id}-ds160`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'control_fee',
        amount: Math.round(parseFloat(ds160Payment.amount) * 100),
        status: 'paid',
        payment_date: individualPaymentDates.get(ds160Payment.user_id)?.get('ds160_package') || ds160Payment.admin_approved_at || ds160Payment.created_at,
        created_at: ds160Payment.created_at,
        payment_proof_url: ds160Payment.screenshot_url,
        admin_notes: ds160Payment.admin_notes,
        zelle_status: 'approved',
        reviewed_by: ds160Payment.admin_approved_by,
        reviewed_at: ds160Payment.admin_approved_at,
        payment_method: 'zelle',
        seller_referral_code: student.seller_referral_code,
        scholarships_ids: [],
      } as PaymentRecord);
    }

    if (paidFeeTypes.has('i539_cos_package')) {
      const i539Payment = userZellePayments.find((p: any) => p.fee_type_global === 'i539_cos_package' || p.fee_type === 'i539_cos_package');
      paymentRecords.push({
        id: `zelle-${i539Payment.id}-i539`,
        student_id: student.id,
        student_name: studentName,
        student_email: studentEmail,
        university_id: '00000000-0000-0000-0000-000000000000',
        university_name: 'No University Selected',
        scholarship_id: '00000000-0000-0000-0000-000000000000',
        scholarship_title: 'No Scholarship Selected',
        field_of_study: null,
        fee_type: 'control_fee',
        amount: Math.round(parseFloat(i539Payment.amount) * 100),
        status: 'paid',
        payment_date: individualPaymentDates.get(i539Payment.user_id)?.get('i539_cos_package') || i539Payment.admin_approved_at || i539Payment.created_at,
        created_at: i539Payment.created_at,
        payment_proof_url: i539Payment.screenshot_url,
        admin_notes: i539Payment.admin_notes,
        zelle_status: 'approved',
        reviewed_by: i539Payment.admin_approved_by,
        reviewed_at: i539Payment.admin_approved_at,
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



    // Selection Process Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let selectionProcessFee: number;
    const expectedSelectionProcess = systemType === 'simplified' ? 350 : 400;

    if (realPaid?.selection_process !== undefined && realPaid?.selection_process !== null) {
      // ✅ PRIORIDADE: Valor real pago (inclui $0 registrado pelo admin)
      selectionProcessFee = Math.round(realPaid.selection_process * 100);
    } else if (stripeUser.selection_process_fee_payment_method === 'coupon') {
      // Cupom 100% OFF — nenhum valor real pago
      selectionProcessFee = 0;
    } else if (userOverrides.selection_process_fee !== undefined) {
      selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
    } else {
      selectionProcessFee = Math.round((expectedSelectionProcess + dependentCost) * 100);
    }

    // I-20 Control Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let i20ControlFee: number;
    const expectedI20Control = getFeeAmount('i20_control_fee');
    
    if (realPaid?.i20_control !== undefined && realPaid.i20_control > 0) {
      // ✅ PRIORIDADE: Valor real pago (Auditável)
      i20ControlFee = Math.round(realPaid.i20_control * 100);
    } else if (userOverrides.i20_control_fee !== undefined) {
      i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
    } else {
      i20ControlFee = Math.round(expectedI20Control * 100);
    }

    // Scholarship Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let scholarshipFee: number;
    const expectedScholarship = systemType === 'simplified' ? 900 : 900;
    
    if (realPaid?.scholarship !== undefined && realPaid.scholarship > 0) {
      // ✅ PRIORIDADE: Valor real pago (Auditável)
      scholarshipFee = Math.round(realPaid.scholarship * 100);
    } else if (userOverrides.scholarship_fee !== undefined) {
      scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
    } else {
      scholarshipFee = Math.round(expectedScholarship * 100);
    }

    // Application Fee - Prioridade: valor real pago (se razoável) > cálculo fixo
    let applicationFee: number;
    const expectedApplicationFee = getFeeAmount('application_fee');

    
    if (realPaid?.application !== undefined && realPaid.application > 0) {
      // ✅ PRIORIDADE: Valor real pago (Auditável)
      applicationFee = Math.round(realPaid.application * 100);
    } else {
      applicationFee = Math.round(expectedApplicationFee * 100);
      if (systemType === 'legacy' && dependents > 0) {
        applicationFee += dependents * 10000; // $100 por dependente
      }
    }

    // Placement Fee - Prioridade: valor real pago (se razoável) > override > cálculo fixo
    let placementFee: number;
    const expectedPlacementValue = 1450;
    
    if (realPaid?.placement !== undefined && realPaid.placement > 0) {
      placementFee = Math.round(realPaid.placement * 100);
    } else if (userOverrides.placement_fee !== undefined) {
      placementFee = Math.round(userOverrides.placement_fee * 100);
    } else {
      placementFee = expectedPlacementValue * 100;
    }

    if (stripeUser.has_paid_selection_process_fee) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'selection_process',
        canonicalFeeType: 'selection',
        fallbackAmount: selectionProcessFee,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('selection_process') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: stripeUser.selection_process_fee_payment_method || 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'selection_process',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.is_application_fee_paid) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'application',
        canonicalFeeType: 'application',
        fallbackAmount: applicationFee,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('application') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'application',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.is_scholarship_fee_paid && !stripeUser.placement_fee_flow) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'scholarship',
        canonicalFeeType: 'scholarship',
        fallbackAmount: scholarshipFee,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('scholarship') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'scholarship',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.has_paid_i20_control_fee && !stripeUser.placement_fee_flow) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'i20_control_fee',
        canonicalFeeType: 'i20',
        fallbackAmount: i20ControlFee,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('i20_control') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: stripeUser.i20_control_fee_payment_method || 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'i20_control_fee',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.is_placement_fee_paid && stripeUser.placement_fee_flow) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'placement',
        canonicalFeeType: 'placement',
        fallbackAmount: placementFee,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('placement') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: stripeUser.placement_fee_payment_method || 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'placement',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.has_paid_ds160_package) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'control_fee',
        canonicalFeeType: 'ds160',
        fallbackAmount: ds160PackageAmount,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('ds160_package') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: stripeUser.ds160_package_payment_method || 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'control_fee',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.has_paid_i539_cos_package) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'control_fee',
        canonicalFeeType: 'i539',
        fallbackAmount: i539CosPackageAmount,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('i539_cos_package') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: stripeUser.i539_cos_package_payment_method || 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'control_fee',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
    }

    if (stripeUser.has_paid_reinstatement_package) {
      createPaymentRecordsForFee({
        student: stripeUser,
        feeType: 'reinstatement_fee',
        canonicalFeeType: 'reinstatement',
        fallbackAmount: reinstatementPackageAmount,
        fallbackDate: individualPaymentDates.get(stripeUser.user_id)?.get('reinstatement_package') || stripeUser.last_payment_date || stripeUser.created_at,
        fallbackMethod: stripeUser.reinstatement_package_payment_method || 'manual',
        baseRecord: {
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          field_of_study: null,
          fee_type: 'reinstatement_fee',
          status: 'paid',
          created_at: stripeUser.created_at,
          seller_referral_code: stripeUser.seller_referral_code,
          scholarships_ids: [],
        },
        individualFeePayments,
        paymentRecords,
      });
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


