import React, { useState } from 'react';
import { CreditCard, CheckCircle, XCircle, Edit3, Save, X, AlertCircle } from 'lucide-react';
import { StudentRecord } from './types';
import { supabase } from '../../../lib/supabase';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';

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
  onEnableInstallment?: () => Promise<void>;
  onDisableInstallment?: () => Promise<void>;
  onToggleVisaStatus?: () => Promise<void>;
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
    onEnableInstallment,
    onDisableInstallment,
    onEditPaymentMethod,
    onUpdatePaymentMethod,
    onCancelPaymentMethod,
    onPaymentMethodChange,
    formatFeeAmount,
    getFeeAmount,
    overridesRefreshKey = 0,
  } = props;

  const [savingInstallment, setSavingInstallment] = useState(false);

  // ✅ Buscar affiliate admin email do aluno para verificar se é do Brant
  const [studentAffiliateAdminEmail, setStudentAffiliateAdminEmail] = React.useState<string | null>(null);
  const [loadingAffiliateCheck, setLoadingAffiliateCheck] = React.useState<boolean>(true);

  // ✅ Buscar overrides diretamente do banco para garantir valores atualizados (evita cache do hook)
  const [currentOverrides, setCurrentOverrides] = React.useState<{
    selection_process_fee?: number;
    application_fee?: number;
    scholarship_fee?: number;
    i20_control_fee?: number;
    placement_fee?: number;
    ds160_package_fee?: number;
    i539_cos_package_fee?: number;
  } | null>(null);
  const [loadingOverrides, setLoadingOverrides] = React.useState<boolean>(true);

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
          .select('selection_process_fee, application_fee, scholarship_fee, i20_control_fee, placement_fee, ds160_package_fee, i539_cos_package_fee, updated_at')
          .eq('user_id', student.user_id)
          .maybeSingle();

        if (overrideError && overrideError.code !== 'PGRST116') {
          console.error('❌ [PaymentStatusCard] Erro ao buscar overrides:', overrideError);
        }

        if (!overrideError && overrideData) {
          setCurrentOverrides({
            selection_process_fee: overrideData.selection_process_fee != null ? Number(overrideData.selection_process_fee) : undefined,
            application_fee: overrideData.application_fee != null ? Number(overrideData.application_fee) : undefined,
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

  // ✅ Debug: Log quando editingFees mudar
  React.useEffect(() => {
    console.log('🔍 [PaymentStatusCard] editingFees mudou:', editingFees);
    if (editingFees) {
      console.log('✅ [PaymentStatusCard] Valores de editingFees:', {
        selection_process: editingFees.selection_process,
        scholarship: editingFees.scholarship,
        i20_control: editingFees.i20_control,
        placement: editingFees.placement,
        ds160_package: editingFees.ds160_package,
        i539_cos_package: editingFees.i539_cos_package
      });
    } else {
      console.log('ℹ️ [PaymentStatusCard] editingFees é null/undefined');
    }
  }, [editingFees]);

  // This is a simplified version - full implementation would include all fee types
  return (
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
                        // Se está marcado como pago mas não temos realPaidAmounts, mostrar skeleton
                        return (
                          <div className="animate-pulse flex items-center gap-2">
                            <div className="h-4 w-20 bg-slate-200 rounded"></div>
                          </div>
                        );
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
                            <option value="manual">Outside</option>
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

                    return (
                      <div className="animate-pulse flex items-center gap-2">
                        <div className="h-4 w-20 bg-slate-200 rounded"></div>
                      </div>
                    );
                  })()}
                </dd>
              ) : (
                <div className="mt-1">
                  <dd className="text-sm font-semibold text-slate-700 flex items-center">
                    {(() => {
                      if (loadingOverrides) {
                        return (
                          <div className="animate-pulse flex items-center gap-2">
                            <div className="h-4 w-20 bg-slate-200 rounded"></div>
                          </div>
                        );
                      }

                      // ✅ PRIORIDADE 1: Override (Migma/Manual)
                      if (currentOverrides?.application_fee !== undefined && currentOverrides?.application_fee !== null) {
                        return formatFeeAmount(currentOverrides.application_fee, true);
                      }

                      const activeApp = student.all_applications?.find((app: any) => app.status !== 'rejected');
                      const scholarship = activeApp?.scholarships ? (Array.isArray(activeApp.scholarships) ? activeApp.scholarships[0] : activeApp.scholarships) : null;

                      if (scholarship?.application_fee_amount) {
                        let amount = Number(scholarship.application_fee_amount);
                        if (dependents > 0 && (userSystemType || 'legacy') === 'legacy') {
                          amount += dependents * 100;
                        }
                        return formatFeeAmount(amount, true);
                      }

                      return 'Varies by scholarship';
                    })()}
                    {currentOverrides?.application_fee !== undefined && (
                      <span className="ml-2 text-xs text-blue-500 font-semibold">(custom)</span>
                    )}
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
                            <option value="manual">Outside</option>
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
        {(() => {
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
                            const apps = student.all_applications || [];
                            const app = apps.find((a: any) => a.status === 'enrolled') ||
                                        apps.find((a: any) => a.status === 'approved') ||
                                        apps[0];
                            const sch = app?.scholarships
                              ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships)
                              : null;
                            if (sch?.annual_value_with_scholarship) {
                              const customAmt = sch.placement_fee_amount ? Number(sch.placement_fee_amount) : null;
                              return getPlacementFee(Number(sch.annual_value_with_scholarship), customAmt);
                            }
                            return null;
                          };

                          if (student?.is_placement_fee_paid) {
                            // When installment partial: show total = paid so far + pending balance
                            if (isInstallmentPartial) {
                              const paid = (realPaidAmounts?.placement && realPaidAmounts.placement > 0)
                                ? realPaidAmounts.placement
                                : (calcTotalFee() ?? 0) / 2;
                              const total = paid + pendingBalance;
                              return formatFeeAmount(total, true);
                            }
                            // Fully paid: show what was paid
                            if (realPaidAmounts?.placement != null && realPaidAmounts.placement > 0) {
                              return formatFeeAmount(realPaidAmounts.placement, true);
                            }
                            // Fallback for old manual payments with no individual_fee_payments record
                            const total = calcTotalFee();
                            if (total != null) return formatFeeAmount(total, true);
                            return formatFeeAmount(0, true);
                          }

                          // Not paid: always show the expected total fee
                          const total = calcTotalFee();
                          if (total != null) return formatFeeAmount(total, true);
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
                        <div className="flex items-center space-x-2">
                          {isInstallmentPartial ? (
                            <>
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                              <span className="text-sm font-medium text-amber-600">1/2 Paid</span>
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                2nd installment pending: ${pendingBalance.toFixed(0)}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium text-green-600">Paid</span>
                            </>
                          )}
                        </div>
                        {isPlatformAdmin && !editingFees && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'placement' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => onPaymentMethodChange(e.target.value)}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="manual">Outside</option>
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
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                        {isPlatformAdmin && (() => {
                          const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                          const installmentEnabled = !!(student as any).placement_fee_installment_enabled;
                          return (
                            <div className="flex flex-col gap-2">
                              {approvedApp && (
                                <button
                                  onClick={() => onMarkAsPaid('placement')}
                                  className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Mark as Paid</span>
                                </button>
                              )}
                              {/* Toggle de parcelamento */}
                              {onEnableInstallment && onDisableInstallment && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-600">Installment (50%)</span>
                                  <button
                                    onClick={async () => {
                                      setSavingInstallment(true);
                                      try {
                                        if (installmentEnabled) {
                                          await onDisableInstallment();
                                        } else {
                                          await onEnableInstallment();
                                        }
                                      } finally {
                                        setSavingInstallment(false);
                                      }
                                    }}
                                    disabled={savingInstallment}
                                    title={installmentEnabled ? 'Desabilitar parcelamento' : 'Habilitar parcelamento — aluno paga 50% agora e 50% em 30 dias'}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                                      installmentEnabled ? 'bg-amber-500' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                                        installmentEnabled ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                  <span className={`text-xs font-bold ${installmentEnabled ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {savingInstallment ? '...' : installmentEnabled ? 'ON' : 'OFF'}
                                  </span>
                                </div>
                              )}
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
                              return (
                                <div className="animate-pulse flex items-center gap-2">
                                  <div className="h-4 w-20 bg-slate-200 rounded"></div>
                                </div>
                              );
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
                                  <option value="manual">Outside</option>
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
                              return (
                                <div className="animate-pulse flex items-center gap-2">
                                  <div className="h-4 w-20 bg-slate-200 rounded"></div>
                                </div>
                              );
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
                                  <option value="manual">Outside</option>
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
        {student.student_process_type === 'transfer' && student.visa_transfer_active !== true && (() => {
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
                                <option value="manual">Outside</option>
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



        {/* DS-160 Package — apenas para alunos initial (F-1 Visa Required) */}
        {student.student_process_type === 'initial' && (() => {
          const isPaid = !!student.has_paid_ds160_package;
          return (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">DS-160 Package</dt>
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
                                <option value="manual">Outside</option>
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
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Not Paid</span>
                      </div>
                      {isPlatformAdmin && (
                        <button
                          onClick={() => onMarkAsPaid('ds160_package')}
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

        {/* I-539 COS Package — apenas para alunos change_of_status */}
        {student.student_process_type === 'change_of_status' && (() => {
          const isPaid = !!student.has_paid_i539_cos_package;
          return (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">I-539 COS Package</dt>
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
                                <option value="manual">Outside</option>
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
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Not Paid</span>
                      </div>
                      {isPlatformAdmin && (
                        <button
                          onClick={() => onMarkAsPaid('i539_cos_package')}
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
      </div>
    </div>
  );
});


PaymentStatusCard.displayName = 'PaymentStatusCard';

export default PaymentStatusCard;

