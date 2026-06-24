import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, CheckCircle, XCircle, Edit3, Save, X, AlertCircle, Clock } from 'lucide-react';
import { StudentRecord } from './types';
import { supabase } from '../../../lib/supabase';
import { INSTALLMENT_CONFIG, InstallmentPlan, SupportedInstallmentFeeType, computeInstallmentAmounts } from '../../../config/installmentConfig';

interface PaymentStatusCardProps {
  student: StudentRecord;
  realPaidAmounts: Record<string, number>;
  loadingPaidAmounts?: Record<string, boolean>;
  editingFees: any;
  editingPaymentMethod: string | null;
  newPaymentMethod: string;
  savingPaymentMethod: boolean;
  savingFees: boolean;
  isPlatformAdmin: boolean;
  dependents: number;
  hasOverride: (feeType: string) => boolean;
  userSystemType?: 'legacy' | 'simplified' | null;
  hasMatriculaRewardsDiscount?: boolean;
  onStartEditFees: () => void;
  onSaveEditFees: () => Promise<void>;
  onCancelEditFees: () => void;
  onResetFees: () => Promise<void>;
  onEditFeesChange: (fees: any) => void;
  onMarkAsPaid: (feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control' | 'placement' | 'ds160_package' | 'i539_cos_package' | 'reinstatement_package') => void;
  onEditPaymentMethod: (feeType: string) => void;
  onUpdatePaymentMethod: (feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control' | 'placement' | 'ds160_package' | 'i539_cos_package' | 'reinstatement_package' | string) => Promise<void>;
  onCancelPaymentMethod: () => void;
  onPaymentMethodChange: (method: string) => void;
  formatFeeAmount: (amount: number | string, forceDollars?: boolean) => string;
  getFeeAmount: (feeType: string) => number;
  overridesRefreshKey?: number;
  /** @deprecated use onSetInstallmentPlan */
  onEnableInstallment?: () => Promise<void>;
  /** @deprecated use onSetInstallmentPlan */
  onDisableInstallment?: () => Promise<void>;
  onSetInstallmentPlan?: (feeType: SupportedInstallmentFeeType, totalInstallments: number | null) => Promise<void>;
  installmentPlans?: Record<string, InstallmentPlan | null>;
  onToggleVisaStatus?: () => Promise<void>;
  hideSelectionFee?: boolean;
}

/**
 * PaymentStatusCard - Displays and manages payment status for all fees
 * Shows Selection Process, Application, Scholarship, and I-20 Control fees
 */
const PaymentStatusCard: React.FC<PaymentStatusCardProps> = React.memo((props) => {
  const {
    student,
    realPaidAmounts,
    loadingPaidAmounts = {},
    editingFees,
    editingPaymentMethod,
    newPaymentMethod,
    savingPaymentMethod,
    savingFees,
    isPlatformAdmin,
    dependents,
    hasOverride,
    userSystemType,
    hasMatriculaRewardsDiscount,
    onStartEditFees,
    onSaveEditFees,
    onCancelEditFees,
    onResetFees,
    onEditFeesChange,
    onMarkAsPaid,
    onSetInstallmentPlan,
    installmentPlans = {},
    onEditPaymentMethod,
    onUpdatePaymentMethod,
    onCancelPaymentMethod,
    onPaymentMethodChange,
    formatFeeAmount,
    getFeeAmount,
    overridesRefreshKey = 0,
    hideSelectionFee = false,
  } = props;

  const [savingInstallment, setSavingInstallment] = useState(false);
  const [cancelPlanFeeType, setCancelPlanFeeType] = useState<SupportedInstallmentFeeType | null>(null);
  const [pendingInstallmentFeeType, setPendingInstallmentFeeType] = useState<SupportedInstallmentFeeType | null>(null);
  const [pendingInstallmentN, setPendingInstallmentN] = useState<number | null>(null);

  // ✅ Buscar affiliate admin email do aluno para verificar se é do Brant
  const [studentAffiliateAdminEmail, setStudentAffiliateAdminEmail] = React.useState<string | null>(null);
  const [loadingAffiliateCheck, setLoadingAffiliateCheck] = React.useState<boolean>(true);

  // ✅ Buscar overrides diretamente do banco para garantir valores atualizados (evita cache do hook)
  const [currentOverrides, setCurrentOverrides] = React.useState<{
    selection_process_fee?: number;
    scholarship_fee?: number;
    i20_control_fee?: number;
    placement_fee?: number;
    ds160_package_fee?: number;
    i539_cos_package_fee?: number;
  } | null>(null);
  const [loadingOverrides, setLoadingOverrides] = React.useState<boolean>(true);

  // Valor real da placement fee — mesma lógica do calcTotalFee inline, mas acessível no modal
  const placementFeeTotalAmount = React.useMemo(() => {
    if (currentOverrides?.placement_fee != null) return Number(currentOverrides.placement_fee);
    if ((student as any).placement_fee_amount) return Number((student as any).placement_fee_amount);
    const apps = student.all_applications || [];
    const selectedId = (student as any).selected_application_id;
    const app = (selectedId && apps.find((a: any) => a.id === selectedId)) ||
                apps.find((a: any) => a.status === 'enrolled') ||
                apps.find((a: any) => a.status === 'approved');
    const sch = app?.scholarships ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships) : null;
    if (sch?.placement_fee_amount) return Number(sch.placement_fee_amount);
    return getFeeAmount('placement_fee');
  }, [currentOverrides, student, getFeeAmount]);

  React.useEffect(() => {
    const fetchStudentAffiliateAdmin = async () => {
      if (!student?.seller_referral_code) {
        setStudentAffiliateAdminEmail(null);
        setLoadingAffiliateCheck(false);
        return;
      }

      try {
        const { data: result, error } = await supabase.rpc('get_affiliate_admin_email_by_seller_code', {
          seller_code: student.seller_referral_code
        });

        if (!error && result && result.length > 0 && result[0]?.email) {
          setStudentAffiliateAdminEmail(result[0].email);
        } else {
          setStudentAffiliateAdminEmail(null);
        }
      } catch (error) {
        console.error('Error fetching student affiliate admin email:', error);
        setStudentAffiliateAdminEmail(null);
      } finally {
        setLoadingAffiliateCheck(false);
      }
    };

    fetchStudentAffiliateAdmin();
  }, [student?.seller_referral_code]);

  // ✅ Buscar overrides diretamente do banco
  React.useEffect(() => {
    const fetchOverrides = async () => {
      if (!student?.user_id) {
        setCurrentOverrides(null);
        setLoadingOverrides(false);
        return;
      }

      try {
        const { data: overrideData, error: overrideError } = await supabase
          .from('user_fee_overrides')
          .select('selection_process_fee, scholarship_fee, i20_control_fee, placement_fee, ds160_package_fee, i539_cos_package_fee, updated_at')
          .eq('user_id', student.user_id)
          .maybeSingle();

        if (overrideError && overrideError.code !== 'PGRST116') {
          console.error('❌ [PaymentStatusCard] Erro ao buscar overrides:', overrideError);
        }

        if (!overrideError && overrideData) {
          setCurrentOverrides({
            selection_process_fee: overrideData.selection_process_fee != null ? Number(overrideData.selection_process_fee) : undefined,
            scholarship_fee: overrideData.scholarship_fee != null ? Number(overrideData.scholarship_fee) : undefined,
            i20_control_fee: overrideData.i20_control_fee != null ? Number(overrideData.i20_control_fee) : undefined,
            placement_fee: overrideData.placement_fee != null ? Number(overrideData.placement_fee) : undefined,
            ds160_package_fee: overrideData.ds160_package_fee != null ? Number(overrideData.ds160_package_fee) : undefined,
            i539_cos_package_fee: overrideData.i539_cos_package_fee != null ? Number(overrideData.i539_cos_package_fee) : undefined,
          });
        } else {
          setCurrentOverrides(null);
        }
      } catch (error) {
        console.error('❌ [PaymentStatusCard] Erro ao buscar overrides:', error);
        setCurrentOverrides(null);
      } finally {
        setLoadingOverrides(false);
      }
    };

    fetchOverrides();
  }, [student?.user_id, overridesRefreshKey]); // ✅ Adicionar overridesRefreshKey como dependência

  // ✅ Verificar se é do affiliate admin "contato@brantimmigration.com"
  const isBrantImmigrationAffiliate = studentAffiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
  const getFeeTotalAmount = (feeType: SupportedInstallmentFeeType): number => {
    if (feeType === 'placement_fee') return placementFeeTotalAmount;
    if (feeType === 'ds160_package') {
      return currentOverrides?.ds160_package_fee != null
        ? Number(currentOverrides.ds160_package_fee)
        : 1800;
    }
    if (feeType === 'i539_cos_package') {
      return currentOverrides?.i539_cos_package_fee != null
        ? Number(currentOverrides.i539_cos_package_fee)
        : 1800;
    }
    return getFeeAmount(feeType);
  };

  const renderInstallmentSelector = (feeType: SupportedInstallmentFeeType) => {
    if (!onSetInstallmentPlan) return null;
    const activePlan = installmentPlans?.[feeType] ?? null;
    const options = INSTALLMENT_CONFIG.INSTALLMENT_OPTIONS[feeType];
    const totalAmount = getFeeTotalAmount(feeType);

    return (
      <div className="flex flex-col gap-1.5 mt-2">
        <span className="text-xs font-semibold text-slate-600">Installment plan</span>
        {activePlan && activePlan.status === 'active' ? (
          <div className="flex flex-col gap-1">
            {/* Progresso do plano ativo */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {activePlan.installments_paid}/{activePlan.total_installments} paid
              </span>
              <span className="text-xs text-slate-500">
                ${Math.max(0, totalAmount - activePlan.amount_paid).toFixed(0)} remaining
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="w-32 bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(activePlan.installments_paid / activePlan.total_installments) * 100}%` }}
              />
            </div>
            <button
              onClick={() => setCancelPlanFeeType(feeType)}
              disabled={savingInstallment}
              className="text-xs text-red-500 hover:text-red-700 underline w-fit disabled:opacity-50 text-left"
            >
              {savingInstallment ? 'Saving...' : 'Cancel plan'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 italic">No plan</span>
            {options.map((n) => (
              <button
                key={n}
                onClick={() => {
                  setPendingInstallmentFeeType(feeType);
                  setPendingInstallmentN(n);
                }}
                disabled={savingInstallment}
                className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md font-semibold disabled:opacity-50 transition-colors"
              >
                {savingInstallment ? '...' : `${n}×`}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const effectiveProcessType = React.useMemo(() => {
    if (student.student_process_type) return student.student_process_type;
    const apps = student.all_applications || [];
    const appWithType =
      apps.find((app: any) => (app.status === 'enrolled' || app.status === 'approved') && app.student_process_type) ||
      apps.find((app: any) => app.student_process_type);
    return appWithType?.student_process_type ?? null;
  }, [student.student_process_type, student.all_applications]);

  const hasInstallmentPlanFor = (feeType: SupportedInstallmentFeeType) => Boolean(installmentPlans?.[feeType]);
  const isInstallmentPlanComplete = (feeType: SupportedInstallmentFeeType) => {
    const plan = installmentPlans?.[feeType] ?? null;
    return !!plan && (plan.status === 'completed' || plan.installments_paid >= plan.total_installments);
  };
  const isPackageFeePaid = (
    feeType: 'ds160_package' | 'i539_cos_package',
    legacyPaidFlag: boolean | undefined,
  ) => {
    const plan = installmentPlans?.[feeType] ?? null;
    if (plan && plan.status === 'active' && plan.installments_paid < plan.total_installments) {
      return false;
    }
    return isInstallmentPlanComplete(feeType) || !!legacyPaidFlag;
  };
  const isTransferInactiveVisa = effectiveProcessType === 'transfer' && student.visa_transfer_active !== true;
  const shouldShowTransferI539Package =
    isTransferInactiveVisa ||
    (effectiveProcessType === 'transfer' && hasInstallmentPlanFor('i539_cos_package'));
  const shouldShowDs160Package =
    (student.source !== 'migma' && effectiveProcessType === 'initial') ||
    hasInstallmentPlanFor('ds160_package');
  const shouldShowCosI539Package =
    !shouldShowTransferI539Package &&
    (
      (student.source !== 'migma' && effectiveProcessType === 'change_of_status') ||
      (effectiveProcessType !== 'initial' && hasInstallmentPlanFor('i539_cos_package'))
    );

  // This is a simplified version - full implementation would include all fee types
  return (
    <>
    {/* Cancel Installment Plan Modal */}
    {cancelPlanFeeType !== null && onSetInstallmentPlan && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Cancel {INSTALLMENT_CONFIG.FEE_TYPE_LABELS[cancelPlanFeeType]} installment plan?
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                The current plan will be cancelled. The student will need a new plan to continue paying in installments. Payments already made are preserved.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setCancelPlanFeeType(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Keep plan
            </button>
            <button
              onClick={async () => {
                const targetFee = cancelPlanFeeType;
                setCancelPlanFeeType(null);
                setSavingInstallment(true);
                try { await onSetInstallmentPlan(targetFee, null); }
                finally { setSavingInstallment(false); }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Cancel plan
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {pendingInstallmentN !== null && pendingInstallmentFeeType !== null && onSetInstallmentPlan && (() => {
      const totalAmount = getFeeTotalAmount(pendingInstallmentFeeType);
      const amounts = computeInstallmentAmounts(totalAmount, pendingInstallmentN);
      const label = INSTALLMENT_CONFIG.FEE_TYPE_LABELS[pendingInstallmentFeeType];
      return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Create {pendingInstallmentN}× installment plan?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  The {label.toLowerCase()} of <span className="font-semibold text-slate-700">{formatFeeAmount(totalAmount, true)}</span> will be split into {pendingInstallmentN} installments:
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
              {amounts.map((amt, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-slate-600">
                    {i === 0 ? '1st installment' : i === 1 ? '2nd installment' : `${i + 1}th installment`}
                    {i === 0 && <span className="ml-1.5 text-xs text-amber-600 font-medium">(due at checkout)</span>}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{formatFeeAmount(amt, true)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              The student's onboarding will show the installment amounts in sequence. Each payment is processed individually.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setPendingInstallmentN(null);
                  setPendingInstallmentFeeType(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const n = pendingInstallmentN;
                  const targetFee = pendingInstallmentFeeType;
                  setPendingInstallmentN(null);
                  setPendingInstallmentFeeType(null);
                  setSavingInstallment(true);
                  try { await onSetInstallmentPlan(targetFee, n); }
                  finally { setSavingInstallment(false); }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                Confirm {pendingInstallmentN}× plan
              </button>
            </div>
          </div>
        </div>,
        document.body
      );
    })()}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r from-[#05294E] rounded-t-2xl to-[#0a4a7a] px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <CreditCard className="w-6 h-6 mr-3" />
          Payment Status
        </h2>
        {isPlatformAdmin && (
          <div className="flex items-center space-x-2">
            {editingFees ? (
              <>
                <button
                  onClick={onSaveEditFees}
                  className="px-3 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingFees ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={onCancelEditFees}
                  className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onStartEditFees}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg flex items-center space-x-1"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Fees</span>
                </button>
                {(hasOverride('selection_process') || hasOverride('scholarship_fee') || hasOverride('i20_control_fee') || hasOverride('placement_fee') || hasOverride('ds160_package_fee') || hasOverride('i539_cos_package_fee')) && (
                  <button
                    onClick={onResetFees}
                    disabled={savingFees}
                    className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="p-6 space-y-4">
        {/* Selection Process Fee */}
        {!hideSelectionFee && (
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-600">Selection Process Fee</dt>
                <dd className="text-sm text-slate-500 mt-1">Required to start applications</dd>
                {editingFees ? (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={editingFees.selection_process ?? ''}
                      onChange={(e) =>
                        onEditFeesChange({ ...editingFees, selection_process: Number(e.target.value) })
                      }
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ) : (
                  <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                    {(() => {
                      // ✅ CORREÇÃO: Se está carregando o valor correto, verificando affiliate admin ou overrides, mostrar skeleton
                      if (loadingPaidAmounts?.selection_process || loadingAffiliateCheck || loadingOverrides) {
                        return (
                          <div className="animate-pulse flex items-center gap-2">
                            <div className="h-4 w-20 bg-slate-200 rounded"></div>
                          </div>
                        );
                      }

                      // ✅ CORREÇÃO: Se o pagamento já foi feito, SEMPRE tentar mostrar o valor REAL pago
                      // Priorizar realPaidAmounts mesmo que seja 0 (pode ser um pagamento de valor zero)
                      if (student?.has_paid_selection_process_fee) {
                        if (realPaidAmounts?.selection_process !== undefined && realPaidAmounts?.selection_process !== null) {
                          console.log('[PaymentStatusCard] Selection Process Fee - Usando valor real pago:', realPaidAmounts.selection_process);
                          return formatFeeAmount(realPaidAmounts.selection_process);
                        } else {
                          // Fallback se estiver pago mas sem registro individual
                          const base = (userSystemType || 'legacy') === 'simplified' ? 350 : 400;
                          const amount = (userSystemType || 'legacy') === 'simplified' ? base : base + (dependents * 150);
                          return formatFeeAmount(currentOverrides?.selection_process_fee || amount);
                        }
                      }

                      // Caso contrário, calcular valor esperado (para exibição antes do pagamento)
                      // ✅ PRIORIDADE 1: Verificar override primeiro (busca direta do banco, sem cache)
                      if (currentOverrides?.selection_process_fee !== undefined && currentOverrides?.selection_process_fee !== null) {
                        // Se tem override, usar o valor do override diretamente
                        return formatFeeAmount(currentOverrides.selection_process_fee);
                      }

                      // ✅ PRIORIDADE 2: Se for do affiliate admin "contato@brantimmigration.com", usar valores fixos
                      if (isBrantImmigrationAffiliate) {
                        // Selection Process: $400 base + $150 por dependente
                        const selectionProcessAmount = 400 + (dependents * 150);
                        return formatFeeAmount(selectionProcessAmount);
                      }

                      // Caso contrário, calcular normalmente
                      const hasMatrFromSellerCode = student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code);
                      const hasMatrDiscount = hasMatriculaRewardsDiscount || hasMatrFromSellerCode;

                      let base: number;
                      const systemType = userSystemType || 'legacy';
                      const isNewProcess = student?.student_process_type === 'initial' || 
                                          student?.student_process_type === 'change_of_status' || 
                                          student?.student_process_type === 'transfer' || 
                                          student?.student_process_type === 'resident';

                      if (hasMatrDiscount) {
                        base = 350; // $400 - $50 desconto
                      } else if (isNewProcess) {
                        base = 400; // Novos processos sempre 400
                      } else {
                        base = systemType === 'simplified' ? 350 : 400;
                      }

                      return formatFeeAmount(base);
                    })()}
                    {currentOverrides?.selection_process_fee !== undefined && <span className="ml-2 text-xs text-blue-500">(custom)</span>}
                  </dd>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {student.has_paid_selection_process_fee ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Paid</span>
                    </div>
                    {isPlatformAdmin && (
                      <div className="flex flex-col gap-3">
                        {editingPaymentMethod === 'selection_process' ? (
                          <div className="flex flex-col gap-3">
                            <select
                              value={newPaymentMethod}
                              onChange={(e) => onPaymentMethodChange(e.target.value)}
                              className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                              disabled={savingPaymentMethod}
                            >
                              <option value="stripe">Stripe</option>
                              <option value="zelle">Zelle</option>
                              <option value="parcelow">Parcelow</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onUpdatePaymentMethod('selection_process')}
                                disabled={savingPaymentMethod}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                              >
                                <Save className="w-4 h-4" />
                                <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                              </button>
                              <button
                                onClick={onCancelPaymentMethod}
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                              >
                                <X className="w-4 h-4" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onEditPaymentMethod('selection_process');
                              onPaymentMethodChange((student.selection_process_fee_payment_method as string) || 'manual');
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit Method</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Not Paid</span>
                    </div>
                    {isPlatformAdmin && (
                      <button
                        onClick={() => onMarkAsPaid('selection_process')}
                        className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark as Paid</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Fee */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
              <dd className="text-sm text-slate-500 mt-1">Paid after scholarship approval</dd>
              {student.is_application_fee_paid ? (
                <dd className="text-sm font-semibold text-slate-700 mt-1">
                  {(() => {
                    if (loadingPaidAmounts?.application) {
                      return (
                        <div className="animate-pulse flex items-center gap-2">
                          <div className="h-4 w-20 bg-slate-200 rounded"></div>
                        </div>
                      );
                    }

                    if (realPaidAmounts?.application !== undefined && realPaidAmounts?.application !== null) {
                      return formatFeeAmount(realPaidAmounts.application, true);
                    }

                    // Fallback se estiver pago mas não tivermos o registro individual (comum em pagamentos antigos)
                    const activeApp = student.all_applications?.find((app: any) => app.status !== 'rejected');
                    const scholarship = activeApp?.scholarships ? (Array.isArray(activeApp.scholarships) ? activeApp.scholarships[0] : activeApp.scholarships) : null;
                    const expectedAmount = scholarship?.application_fee_amount || (student as any).application_fee_amount || 100;
                    let finalExpected = Number(expectedAmount);
                    if (dependents > 0 && (userSystemType || 'legacy') === 'legacy' && student.source !== 'migma') {
                      finalExpected += dependents * 100;
                    }
                    
                    return formatFeeAmount(finalExpected, true);
                  })()}
                </dd>
              ) : (
                <div className="mt-1">
                  <dd className="text-sm font-semibold text-slate-700">
                    {(() => {
                      const activeApp = student.all_applications?.find((app: any) => app.status !== 'rejected');
                      const scholarship = activeApp?.scholarships ? (Array.isArray(activeApp.scholarships) ? activeApp.scholarships[0] : activeApp.scholarships) : null;

                      if (scholarship?.application_fee_amount) {
                        let amount = Number(scholarship.application_fee_amount);
                        if (dependents > 0 && (userSystemType || 'legacy') === 'legacy' && student.source !== 'migma') {
                          amount += dependents * 100;
                        }
                        return formatFeeAmount(amount, true);
                      }

                      return 'Varies by scholarship';
                    })()}
                  </dd>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {student.is_application_fee_paid ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Paid</span>
                  </div>
                  {isPlatformAdmin && (
                    <div className="flex flex-col gap-3">
                      {editingPaymentMethod === 'application' ? (
                        <div className="flex flex-col gap-3">
                          <select
                            value={newPaymentMethod}
                            onChange={(e) => onPaymentMethodChange(e.target.value)}
                            className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                            disabled={savingPaymentMethod}
                          >
                            <option value="stripe">Stripe</option>
                            <option value="zelle">Zelle</option>
                            <option value="parcelow">Parcelow</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdatePaymentMethod('application')}
                              disabled={savingPaymentMethod}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                            >
                              <Save className="w-4 h-4" />
                              <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                              onClick={onCancelPaymentMethod}
                              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            onEditPaymentMethod('application');
                            const paidApp = student.all_applications?.find((app: any) => app.is_application_fee_paid);
                            onPaymentMethodChange((paidApp?.application_fee_payment_method as string) || 'manual');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit Method</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Not Paid</span>
                  </div>
                  {isPlatformAdmin && (() => {
                    const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                    return approvedApp && (
                      <button
                        onClick={() => onMarkAsPaid('application')}
                        className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark as Paid</span>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flag de fluxo do aluno: se placement_fee_flow, mostrar Placement Fee em vez de Scholarship + I-20 */}
        {student.source !== 'migma' && (() => {
          const isPlacementFeeFlow = !!(student as any).placement_fee_flow;

          if (isPlacementFeeFlow) {
            // Novo fluxo: mostrar Placement Fee
            const isPaid = !!(student as any).is_placement_fee_paid;
            const pendingBalance = (student as any).placement_fee_pending_balance ?? 0;
            const isInstallmentPartial = isPaid && pendingBalance > 0;
            return (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">Placement Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Paid after application fee</dd>
                    {editingFees ? (
                      <div className="mt-2 text-slate-400 italic text-sm">
                        <input
                          type="number"
                          value={editingFees.placement ?? ''}
                          onChange={(e) =>
                            onEditFeesChange({ ...editingFees, placement: Number(e.target.value) })
                          }
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                        {(() => {
                          if (loadingPaidAmounts?.placement || loadingAffiliateCheck || loadingOverrides) {
                            return (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                              </div>
                            );
                          }
 
                          // Helper: calculate the expected TOTAL placement fee from scholarship data
                          const calcTotalFee = (): number | null => {
                            if (currentOverrides?.placement_fee != null) {
                              return Number(currentOverrides.placement_fee);
                            }

                            // Try direct value from student object first (common in Seller Dashboard)
                            if ((student as any).placement_fee_amount) {
                              return Number((student as any).placement_fee_amount);
                            }

                            const apps = student.all_applications || [];
                            const selectedId = (student as any).selected_application_id;
                            const app = (selectedId && apps.find((a: any) => a.id === selectedId)) ||
                                        apps.find((a: any) => a.status === 'enrolled') ||
                                        apps.find((a: any) => a.status === 'approved');
                            const sch = app?.scholarships
                              ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships)
                              : null;

                            if (sch?.placement_fee_amount) {
                              return Number(sch.placement_fee_amount);
                            }

                            return null;
                          };

                          if (student?.is_placement_fee_paid) {
                            // When installment partial: show the full scholarship placement fee as total
                            if (isInstallmentPartial) {
                              const total = calcTotalFee();
                              if (total != null && total > 0) return formatFeeAmount(total, true);
                              // fallback: paid so far + pending balance
                              const paid = (realPaidAmounts?.placement && realPaidAmounts.placement > 0)
                                ? realPaidAmounts.placement
                                : 0;
                              return formatFeeAmount(paid + pendingBalance, true);
                            }
                            // Fully paid: show what was paid
                            if (realPaidAmounts?.placement != null && realPaidAmounts.placement > 0) {
                              return formatFeeAmount(realPaidAmounts.placement, true);
                            }
                            // Fallback for old manual payments with no individual_fee_payments record
                            const total = calcTotalFee();
                            if (total != null && total > 0) return formatFeeAmount(total, true);
                            
                            // Reasonable fallback based on flow
                            return formatFeeAmount(2100, true);
                          }

                          // Not paid: always show the full total fee
                          const total = calcTotalFee();
                          if (total != null) {
                            return formatFeeAmount(total, true);
                          }
                          return 'N/A';
                        })()}
                        {currentOverrides?.placement_fee !== undefined && (
                          <span className="ml-2 text-xs text-blue-500">(custom)</span>
                        )}
                      </dd>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {isPaid ? (
                      <div className="flex flex-col gap-3">
                        <div className="w-full">
                          {isInstallmentPartial ? (
                            <div className="flex flex-col gap-2.5 w-full">
                              <div className="flex items-center justify-between w-full gap-4">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                  <span className="text-sm font-semibold text-amber-700">
                                    {installmentPlans?.['placement_fee']?.installments_paid ?? 1}/{installmentPlans?.['placement_fee']?.total_installments ?? 2} Paid
                                  </span>
                                </div>
                                {student.placement_fee_due_date && (
                                  <div className="text-xs bg-amber-50 border border-amber-200/60 text-amber-800 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Due: <span className="font-bold text-amber-900">{new Date(student.placement_fee_due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></span>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs bg-amber-50 border border-amber-200/60 text-amber-800 px-3 py-2 rounded-lg font-medium leading-relaxed w-full">
                                Installment {(installmentPlans?.['placement_fee']?.installments_paid ?? 1) + 1} of {installmentPlans?.['placement_fee']?.total_installments ?? 2} pending: <span className="font-bold">${pendingBalance.toFixed(0)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <span className="text-sm font-semibold text-green-700">Paid</span>
                              {installmentPlans?.['placement_fee']?.total_installments && installmentPlans['placement_fee'].total_installments > 1 && (
                                <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-lg font-semibold">
                                  {installmentPlans['placement_fee'].total_installments}x installments
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isPlatformAdmin && !editingFees && (
                          <div className="flex flex-col gap-3 items-end">
                            {editingPaymentMethod === 'placement' ? (
                              <div className="flex flex-col gap-3 items-end">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => onPaymentMethodChange(e.target.value)}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                  <option value="parcelow">Parcelow</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onUpdatePaymentMethod('placement')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={onCancelPaymentMethod}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  onEditPaymentMethod('placement');
                                  const paidApp = student.all_applications?.find((app: any) => app.is_placement_fee_paid);
                                  onPaymentMethodChange((paidApp?.placement_fee_payment_method as string) || 'manual');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          <span className="text-sm font-semibold text-red-700">Not Paid</span>
                          {student.placement_fee_due_date && (
                            <span className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200/60 rounded-lg px-2.5 py-1" title="Due Date">
                              Due: {new Date(student.placement_fee_due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const plan = installmentPlans?.['placement_fee'] ?? null;
                          if (!plan) return null;
                          // Only show when the fee amount is actually derivable from scholarship data
                          const apps = student.all_applications || [];
                          const selId = (student as any).selected_application_id;
                          const app = (selId && apps.find((a: any) => a.id === selId)) || apps.find((a: any) => a.status === 'enrolled') || apps.find((a: any) => a.status === 'approved');
                          const sch = app?.scholarships ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships) : null;
                          const feeKnown = currentOverrides?.placement_fee != null || (student as any).placement_fee_amount || sch?.placement_fee_amount || sch?.annual_value_with_scholarship;
                          if (!feeKnown) return null;
                          const n = plan.total_installments;
                          const perInstallment = n > 0 ? formatFeeAmount(placementFeeTotalAmount / n, true) : '—';
                          return (
                            <div className="pl-7">
                              <span className="inline-block text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg font-semibold">
                                {n}× installments — {perInstallment} each
                              </span>
                            </div>
                          );
                        })()}
                        {isPlatformAdmin && (() => {
                          const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved' || app.status === 'enrolled');
                          return (
                            <div className="flex flex-col gap-2 items-end">
                              {approvedApp && (
                                <button
                                  onClick={() => onMarkAsPaid('placement')}
                                  className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Mark as Paid</span>
                                </button>
                              )}
                              {/* Seletor de parcelamento dinâmico — só exibir quando há application aprovada */}
                              {approvedApp && renderInstallmentSelector('placement_fee')}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Fluxo legado: mostrar Scholarship Fee + I-20 Control Fee
          return (
            <>
              {/* Scholarship Fee */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">Scholarship Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Paid after application fee</dd>
                    {editingFees ? (
                      <div className="mt-2">
                        <input
                          type="number"
                          value={editingFees.scholarship ?? ''}
                          onChange={(e) =>
                            onEditFeesChange({ ...editingFees, scholarship: Number(e.target.value) })
                          }
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                        {(() => {
                          if (loadingPaidAmounts?.scholarship || loadingAffiliateCheck || loadingOverrides) {
                            return (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                              </div>
                            );
                          }

                          if (student?.is_scholarship_fee_paid) {
                            if (realPaidAmounts?.scholarship !== undefined && realPaidAmounts?.scholarship !== null) {
                              return formatFeeAmount(realPaidAmounts.scholarship, true);
                            } else {
                              // Fallback se estiver pago mas sem registro individual
                              const expectedScholarshipFee = (student as any).scholarship_fee_amount || 900;
                              return formatFeeAmount(expectedScholarshipFee, true);
                            }
                          }

                          if (currentOverrides?.scholarship_fee !== undefined && currentOverrides?.scholarship_fee !== null) {
                            return formatFeeAmount(currentOverrides.scholarship_fee, true);
                          }

                          if (isBrantImmigrationAffiliate) {
                            return formatFeeAmount(900, true);
                          }

                          // Tentar buscar valor da aplicação
                          const activeApp = student.all_applications?.find((app: any) => app.status !== 'rejected');
                          const scholarship = activeApp?.scholarships ? (Array.isArray(activeApp.scholarships) ? activeApp.scholarships[0] : activeApp.scholarships) : null;

                          if (scholarship?.scholarship_fee_amount) {
                            return formatFeeAmount(Number(scholarship.scholarship_fee_amount), true);
                          }

                          // Caso contrário
                          return formatFeeAmount(getFeeAmount('scholarship_fee'), true);
                        })()}
                        {currentOverrides?.scholarship_fee !== undefined && (
                          <span className="ml-2 text-xs text-blue-500">(custom)</span>
                        )}
                      </dd>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {student.is_scholarship_fee_paid ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'scholarship' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => onPaymentMethodChange(e.target.value)}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                  <option value="parcelow">Parcelow</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onUpdatePaymentMethod('scholarship')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={onCancelPaymentMethod}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  onEditPaymentMethod('scholarship');
                                  const paidApp = student.all_applications?.find((app: any) => app.is_scholarship_fee_paid);
                                  onPaymentMethodChange((paidApp?.scholarship_fee_payment_method as string) || 'manual');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                        {isPlatformAdmin && (() => {
                          const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                          return approvedApp && (
                            <button
                              onClick={() => onMarkAsPaid('scholarship')}
                              className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark as Paid</span>
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* I-20 Control Fee */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">I-20 Control Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Final step for enrollment</dd>
                    {editingFees ? (
                      <div className="mt-2">
                        <input
                          type="number"
                          value={editingFees.i20_control ?? ''}
                          onChange={(e) =>
                            onEditFeesChange({ ...editingFees, i20_control: Number(e.target.value) })
                          }
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                        {(() => {
                          // Se está carregando, mostrar skeleton
                          if (loadingPaidAmounts?.i20_control || loadingAffiliateCheck || loadingOverrides) {
                            return (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                              </div>
                            );
                          }

                          if (student?.has_paid_i20_control_fee) {
                            if (realPaidAmounts?.i20_control !== undefined && realPaidAmounts?.i20_control !== null) {
                              return formatFeeAmount(realPaidAmounts.i20_control, true);
                            } else {
                              // Fallback se estiver pago mas sem registro individual
                              const expectedI20Fee = currentOverrides?.i20_control_fee || 900;
                              return formatFeeAmount(expectedI20Fee, true);
                            }
                          }

                          if (currentOverrides?.i20_control_fee !== undefined && currentOverrides?.i20_control_fee !== null) {
                            return formatFeeAmount(currentOverrides.i20_control_fee);
                          }

                          if (isBrantImmigrationAffiliate) {
                            return formatFeeAmount(900);
                          }

                          return formatFeeAmount(getFeeAmount('i20_control_fee'));
                        })()}
                        {currentOverrides?.i20_control_fee !== undefined && (
                          <span className="ml-2 text-xs text-blue-500">(custom)</span>
                        )}
                      </dd>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {student.has_paid_i20_control_fee ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'i20_control' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => onPaymentMethodChange(e.target.value)}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                  <option value="parcelow">Parcelow</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onUpdatePaymentMethod('i20_control')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={onCancelPaymentMethod}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  onEditPaymentMethod('i20_control');
                                  onPaymentMethodChange((student.i20_control_fee_payment_method as string) || 'manual');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <button
                            onClick={() => onMarkAsPaid('i20_control')}
                            className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark as Paid</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Reinstatement Fee — apenas para alunos transfer com visto inativo */}
        {isTransferInactiveVisa && (() => {
          const isPaid = !!student.has_paid_reinstatement_package;
          return (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">Reinstatement Fee</dt>
                  <dd className="text-sm text-slate-500 mt-1">Required for transfer students with inactive visa</dd>
                  <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                    {isPaid && realPaidAmounts?.reinstatement_package !== undefined && realPaidAmounts?.reinstatement_package !== null
                      ? formatFeeAmount(realPaidAmounts.reinstatement_package, true)
                      : formatFeeAmount(500, true)}
                  </dd>
                </div>
                <div className="flex flex-col gap-3">
                  {isPaid ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Paid</span>
                      </div>
                      {isPlatformAdmin && (
                        <div className="flex flex-col gap-3">
                          {editingPaymentMethod === 'reinstatement_package' ? (
                            <div className="flex flex-col gap-3">
                              <select
                                value={newPaymentMethod}
                                onChange={(e) => onPaymentMethodChange(e.target.value)}
                                className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                disabled={savingPaymentMethod}
                              >
                                <option value="stripe">Stripe</option>
                                <option value="zelle">Zelle</option>
                                <option value="parcelow">Parcelow</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdatePaymentMethod('reinstatement_package')}
                                  disabled={savingPaymentMethod}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                  onClick={onCancelPaymentMethod}
                                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                onEditPaymentMethod('reinstatement_package');
                                onPaymentMethodChange(student.reinstatement_package_payment_method || 'manual');
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>Edit Method</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Not Paid</span>
                      </div>
                      {isPlatformAdmin && (
                        <button
                          onClick={() => onMarkAsPaid('reinstatement_package')}
                          className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark as Paid</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}



        {/* I-539 Package ($1800) — reinstatement students (transfer + inactive visa) */}
        {shouldShowTransferI539Package && (() => {
          const isPaid = isPackageFeePaid('i539_cos_package', student.has_paid_i539_cos_package);
          return (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">Control Fee</dt>
                  <dd className="text-sm text-slate-500 mt-1">Required for transfer students with inactive visa</dd>
                  <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                    {isPaid && realPaidAmounts?.i539_cos_package !== undefined && realPaidAmounts?.i539_cos_package !== null
                      ? formatFeeAmount(realPaidAmounts.i539_cos_package, true)
                      : currentOverrides?.i539_cos_package_fee !== undefined && currentOverrides?.i539_cos_package_fee !== null
                        ? formatFeeAmount(currentOverrides.i539_cos_package_fee)
                        : formatFeeAmount(1800)}
                    {currentOverrides?.i539_cos_package_fee !== undefined && (
                      <span className="ml-2 text-xs text-blue-500">(custom)</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-3">
                  {isPaid ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Paid</span>
                        {installmentPlans?.['i539_cos_package']?.total_installments && installmentPlans['i539_cos_package'].total_installments > 1 && (
                          <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-lg font-semibold">
                            {installmentPlans['i539_cos_package'].total_installments}x installments
                          </span>
                        )}
                      </div>
                      {isPlatformAdmin && (
                        <button
                          onClick={() => {
                            onEditPaymentMethod('i539_cos_package');
                            onPaymentMethodChange((student as any).i539_cos_package_payment_method || 'manual');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit Method</span>
                        </button>
                      )}
                    </div>
                  ) : (() => {
                    const activePlan = installmentPlans?.['i539_cos_package'] ?? null;
                    const hasInstallmentPlan = activePlan && activePlan.status === 'active';
                    const installmentsPaid = activePlan?.installments_paid ?? 0;
                    const isPartial = hasInstallmentPlan && installmentsPaid > 0;

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="w-full">
                          {isPartial ? (
                            <div className="flex flex-col gap-2.5 w-full">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                <span className="text-sm font-semibold text-amber-700">
                                  {installmentsPaid}/{activePlan.total_installments} Paid
                                </span>
                              </div>
                              <div className="text-xs bg-amber-50 border border-amber-200/60 text-amber-800 px-3 py-2 rounded-lg font-medium leading-relaxed w-full">
                                Installment {installmentsPaid + 1} of {activePlan.total_installments} pending: <span className="font-bold">${computeInstallmentAmounts(getFeeTotalAmount('i539_cos_package'), activePlan.total_installments)[installmentsPaid]?.toFixed(0)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="text-sm font-medium text-red-600">Not Paid</span>
                            </div>
                          )}
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-2 items-end">
                            <button
                              onClick={() => onMarkAsPaid('i539_cos_package')}
                              className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark as Paid</span>
                            </button>
                            {renderInstallmentSelector('i539_cos_package')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DS-160 Package — apenas para alunos initial (F-1 Visa Required) */}
        {shouldShowDs160Package && (() => {
          const isPaid = isPackageFeePaid('ds160_package', student.has_paid_ds160_package);
          return (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">Control Fee</dt>
                  <dd className="text-sm text-slate-500 mt-1">Required for initial F-1 visa students</dd>
                  {editingFees ? (
                    <div className="mt-2">
                      <input
                        type="number"
                        value={editingFees.ds160_package ?? ''}
                        onChange={(e) =>
                          onEditFeesChange({ ...editingFees, ds160_package: Number(e.target.value) })
                        }
                        className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  ) : (
                    <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                      {(() => {
                        if (loadingOverrides) {
                          return (
                            <div className="animate-pulse flex items-center gap-2">
                              <div className="h-4 w-20 bg-slate-200 rounded"></div>
                            </div>
                          );
                        }
                        if (isPaid) {
                          return realPaidAmounts?.ds160_package !== undefined && realPaidAmounts?.ds160_package !== null
                            ? formatFeeAmount(realPaidAmounts.ds160_package, true)
                            : formatFeeAmount(1800, true);
                        }
                        if (currentOverrides?.ds160_package_fee !== undefined && currentOverrides?.ds160_package_fee !== null) {
                          return formatFeeAmount(currentOverrides.ds160_package_fee, true);
                        }
                        return formatFeeAmount(1800, true);
                      })()}
                      {currentOverrides?.ds160_package_fee !== undefined && (
                        <span className="ml-2 text-xs text-blue-500">(custom)</span>
                      )}
                    </dd>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {isPaid ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Paid</span>
                        {installmentPlans?.['ds160_package']?.total_installments && installmentPlans['ds160_package'].total_installments > 1 && (
                          <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-lg font-semibold">
                            {installmentPlans['ds160_package'].total_installments}x installments
                          </span>
                        )}
                      </div>
                      {isPlatformAdmin && (
                        <div className="flex flex-col gap-3">
                          {editingPaymentMethod === 'ds160_package' ? (
                            <div className="flex flex-col gap-3">
                              <select
                                value={newPaymentMethod}
                                onChange={(e) => onPaymentMethodChange(e.target.value)}
                                className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                disabled={savingPaymentMethod}
                              >
                                <option value="stripe">Stripe</option>
                                <option value="zelle">Zelle</option>
                                <option value="parcelow">Parcelow</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdatePaymentMethod('ds160_package')}
                                  disabled={savingPaymentMethod}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                  onClick={onCancelPaymentMethod}
                                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                onEditPaymentMethod('ds160_package');
                                onPaymentMethodChange((student.ds160_package_payment_method as string) || 'manual');
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>Edit Method</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (() => {
                    const activePlan = installmentPlans?.['ds160_package'] ?? null;
                    const hasInstallmentPlan = activePlan && activePlan.status === 'active';
                    const installmentsPaid = activePlan?.installments_paid ?? 0;
                    const isPartial = hasInstallmentPlan && installmentsPaid > 0;

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="w-full">
                          {isPartial ? (
                            <div className="flex flex-col gap-2.5 w-full">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                <span className="text-sm font-semibold text-amber-700">
                                  {installmentsPaid}/{activePlan.total_installments} Paid
                                </span>
                              </div>
                              <div className="text-xs bg-amber-50 border border-amber-200/60 text-amber-800 px-3 py-2 rounded-lg font-medium leading-relaxed w-full">
                                Installment {installmentsPaid + 1} of {activePlan.total_installments} pending: <span className="font-bold">${computeInstallmentAmounts(getFeeTotalAmount('ds160_package'), activePlan.total_installments)[installmentsPaid]?.toFixed(0)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="text-sm font-medium text-red-600">Not Paid</span>
                            </div>
                          )}
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-2 items-end">
                            <button
                              onClick={() => onMarkAsPaid('ds160_package')}
                              className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark as Paid</span>
                            </button>
                            {renderInstallmentSelector('ds160_package')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })()}

        {/* I-539 COS Package — apenas para alunos change_of_status */}
        {shouldShowCosI539Package && (() => {
          const isPaid = isPackageFeePaid('i539_cos_package', student.has_paid_i539_cos_package);
          return (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">Control Fee</dt>
                  <dd className="text-sm text-slate-500 mt-1">Required for change of status students</dd>
                  {editingFees ? (
                    <div className="mt-2">
                      <input
                        type="number"
                        value={editingFees.i539_cos_package ?? ''}
                        onChange={(e) =>
                          onEditFeesChange({ ...editingFees, i539_cos_package: Number(e.target.value) })
                        }
                        className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  ) : (
                    <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                      {(() => {
                        if (loadingOverrides) {
                          return (
                            <div className="animate-pulse flex items-center gap-2">
                              <div className="h-4 w-20 bg-slate-200 rounded"></div>
                            </div>
                          );
                        }
                        if (isPaid) {
                          return realPaidAmounts?.i539_cos_package !== undefined && realPaidAmounts?.i539_cos_package !== null
                            ? formatFeeAmount(realPaidAmounts.i539_cos_package, true)
                            : formatFeeAmount(1800, true);
                        }
                        if (currentOverrides?.i539_cos_package_fee !== undefined && currentOverrides?.i539_cos_package_fee !== null) {
                          return formatFeeAmount(currentOverrides.i539_cos_package_fee, true);
                        }
                        return formatFeeAmount(1800, true);
                      })()}
                      {currentOverrides?.i539_cos_package_fee !== undefined && (
                        <span className="ml-2 text-xs text-blue-500">(custom)</span>
                      )}
                    </dd>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {isPaid ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Paid</span>
                        {installmentPlans?.['i539_cos_package']?.total_installments && installmentPlans['i539_cos_package'].total_installments > 1 && (
                          <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-lg font-semibold">
                            {installmentPlans['i539_cos_package'].total_installments}x installments
                          </span>
                        )}
                      </div>
                      {isPlatformAdmin && (
                        <div className="flex flex-col gap-3">
                          {editingPaymentMethod === 'i539_cos_package' ? (
                            <div className="flex flex-col gap-3">
                              <select
                                value={newPaymentMethod}
                                onChange={(e) => onPaymentMethodChange(e.target.value)}
                                className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                disabled={savingPaymentMethod}
                              >
                                <option value="stripe">Stripe</option>
                                <option value="zelle">Zelle</option>
                                <option value="parcelow">Parcelow</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdatePaymentMethod('i539_cos_package')}
                                  disabled={savingPaymentMethod}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                  onClick={onCancelPaymentMethod}
                                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                onEditPaymentMethod('i539_cos_package');
                                onPaymentMethodChange((student.i539_cos_package_payment_method as string) || 'manual');
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>Edit Method</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (() => {
                    const activePlan = installmentPlans?.['i539_cos_package'] ?? null;
                    const hasInstallmentPlan = activePlan && activePlan.status === 'active';
                    const installmentsPaid = activePlan?.installments_paid ?? 0;
                    const isPartial = hasInstallmentPlan && installmentsPaid > 0;

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="w-full">
                          {isPartial ? (
                            <div className="flex flex-col gap-2.5 w-full">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                <span className="text-sm font-semibold text-amber-700">
                                  {installmentsPaid}/{activePlan.total_installments} Paid
                                </span>
                              </div>
                              <div className="text-xs bg-amber-50 border border-amber-200/60 text-amber-800 px-3 py-2 rounded-lg font-medium leading-relaxed w-full">
                                Installment {installmentsPaid + 1} of {activePlan.total_installments} pending: <span className="font-bold">${computeInstallmentAmounts(getFeeTotalAmount('i539_cos_package'), activePlan.total_installments)[installmentsPaid]?.toFixed(0)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="text-sm font-medium text-red-600">Not Paid</span>
                            </div>
                          )}
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-2 items-end">
                            <button
                              onClick={() => onMarkAsPaid('i539_cos_package')}
                              className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark as Paid</span>
                            </button>
                            {renderInstallmentSelector('i539_cos_package')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
    </>
  );
});


PaymentStatusCard.displayName = 'PaymentStatusCard';

export default PaymentStatusCard;

