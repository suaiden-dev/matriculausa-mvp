import React from 'react';
import { CreditCard, CheckCircle, XCircle, Edit3, Save, X } from 'lucide-react';
import { StudentRecord } from './types';

interface PaymentStatusCardProps {
  student: StudentRecord;
  fees: {
    selection_process: number;
    application: number;
    scholarship: number;
    i20_control: number;
  };
  realPaidAmounts: Record<string, number>;
  editingFees: any;
  editingPaymentMethod: string | null;
  newPaymentMethod: string;
  savingPaymentMethod: boolean;
  savingFees: boolean;
  isPlatformAdmin: boolean;
  dependents: number;
  hasOverride: (feeType: string) => boolean;
  userSystemType?: 'legacy' | 'simplified' | null;
  userFeeOverrides?: {
    selection_process_fee?: number;
    application_fee?: number;
    scholarship_fee?: number;
    i20_control_fee?: number;
  } | null;
  hasMatriculaRewardsDiscount?: boolean;
  onStartEditFees: () => void;
  onSaveEditFees: () => Promise<void>;
  onCancelEditFees: () => void;
  onResetFees: () => Promise<void>;
  onEditFeesChange: (fees: any) => void;
  onMarkAsPaid: (feeType: string) => void;
  onEditPaymentMethod: (feeType: string) => void;
  onUpdatePaymentMethod: (feeType: string) => Promise<void>;
  onCancelPaymentMethod: () => void;
  onPaymentMethodChange: (method: string) => void;
  formatFeeAmount: (amount: number) => string;
  getFeeAmount: (feeType: string) => number;
}

/**
 * PaymentStatusCard - Displays and manages payment status for all fees
 * Shows Selection Process, Application, Scholarship, and I-20 Control fees
 */
const PaymentStatusCard: React.FC<PaymentStatusCardProps> = React.memo((props) => {
  const {
    student,
    fees,
    realPaidAmounts,
    editingFees,
    editingPaymentMethod,
    newPaymentMethod,
    savingPaymentMethod,
    savingFees,
    isPlatformAdmin,
    dependents,
    hasOverride,
    userSystemType,
    userFeeOverrides,
    hasMatriculaRewardsDiscount,
    onStartEditFees,
    onSaveEditFees,
    onCancelEditFees,
    onResetFees,
    onEditFeesChange,
    onMarkAsPaid,
    onEditPaymentMethod,
    onUpdatePaymentMethod,
    onCancelPaymentMethod,
    onPaymentMethodChange,
    formatFeeAmount,
    getFeeAmount,
  } = props;

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
                {(hasOverride('selection_process') || hasOverride('scholarship_fee') || hasOverride('i20_control_fee')) && (
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
                    value={editingFees.selection_process}
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
                    // Se o pagamento já foi feito E temos o valor bruto pago (gross_amount_usd), mostrar o valor REAL pago
                    // Este valor inclui as taxas do Stripe, mostrando o que o aluno realmente pagou
                    if (student?.has_paid_selection_process_fee && realPaidAmounts?.selection_process) {
                      return formatFeeAmount(realPaidAmounts.selection_process);
                    }
                    
                    // Caso contrário, calcular valor esperado (para exibição antes do pagamento)
                    const hasCustomOverride = hasOverride('selection_process');
                    
                    // IMPORTANTE: Não usar getFeeAmount diretamente aqui porque ele pode retornar
                    // realPaymentAmounts se existir, mesmo que o aluno não tenha pago ainda
                    // Vamos calcular manualmente baseado no system_type, Matricula Rewards e overrides
                    let base: number;
                    
                    if (hasCustomOverride && userFeeOverrides?.selection_process_fee !== undefined) {
                      // Se tem override, usar o valor do override diretamente (sem adicionar dependents)
                      base = userFeeOverrides.selection_process_fee;
                    } else {
                      // Verificar se o usuário aplicou desconto do Matricula Rewards
                      // Pode vir de seller_referral_code OU de used_referral_codes/affiliate_referrals
                      const hasMatrFromSellerCode = student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code);
                      const hasMatrDiscount = hasMatriculaRewardsDiscount || hasMatrFromSellerCode;
                      
                      if (hasMatrDiscount) {
                        // Se tem desconto do Matricula Rewards, sempre usar $350 (que é $400 - $50)
                        base = 350;
                      } else {
                        // Se não tem override, calcular baseado no system_type
                        const systemType = userSystemType || 'legacy';
                        if (systemType === 'simplified') {
                          base = 350;
                        } else {
                          base = 400; // legacy
                        }
                      }
                      // Adicionar dependents * 150 apenas se não for override
                      base = base + dependents * 150;
                    }
                    
                    return formatFeeAmount(base);
                  })()}
                  {hasOverride('selection_process') && <span className="ml-2 text-xs text-blue-500">(custom)</span>}
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
                    // Se o pagamento já foi feito E temos o valor bruto pago (gross_amount_usd), mostrar o valor REAL pago
                    // Este valor inclui as taxas do Stripe, mostrando o que o aluno realmente pagou
                    if (realPaidAmounts?.application) {
                      return formatFeeAmount(realPaidAmounts.application);
                    }
                    
                    // Caso contrário, usar valor da bolsa ou valor padrão
                    const paidApplication = student.all_applications?.find((app: any) => app.is_application_fee_paid);
                    if (paidApplication?.scholarships) {
                      const scholarship = Array.isArray(paidApplication.scholarships)
                        ? paidApplication.scholarships[0]
                        : paidApplication.scholarships;
                      let baseAmount = scholarship?.application_fee_amount 
                        ? Number(scholarship.application_fee_amount) 
                        : getFeeAmount('application_fee');
                      return formatFeeAmount(baseAmount);
                    }
                    return formatFeeAmount(getFeeAmount('application_fee'));
                  })()}
                </dd>
              ) : (
                <div className="mt-1">
                  <dd className="text-sm font-semibold text-slate-700">Varies by scholarship</dd>
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
                    value={editingFees.scholarship}
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
                    // Se o pagamento já foi feito E temos o valor bruto pago (gross_amount_usd), mostrar o valor REAL pago
                    // Este valor inclui as taxas do Stripe, mostrando o que o aluno realmente pagou
                    if (student?.is_scholarship_fee_paid && realPaidAmounts?.scholarship) {
                      return formatFeeAmount(realPaidAmounts.scholarship);
                    }
                    
                    // Caso contrário, mostrar valor esperado
                    return formatFeeAmount(getFeeAmount('scholarship_fee'));
                  })()}
                  {hasOverride('scholarship_fee') && (
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
                    value={editingFees.i20_control}
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
                    // Se o pagamento já foi feito E temos o valor bruto pago (gross_amount_usd), mostrar o valor REAL pago
                    // Este valor inclui as taxas do Stripe, mostrando o que o aluno realmente pagou
                    if (student?.has_paid_i20_control_fee && realPaidAmounts?.i20_control) {
                      return formatFeeAmount(realPaidAmounts.i20_control);
                    }
                    
                    // Caso contrário, mostrar valor esperado
                    return formatFeeAmount(getFeeAmount('i20_control_fee'));
                  })()}
                  {hasOverride('i20_control_fee') && (
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
      </div>
    </div>
  );
});

PaymentStatusCard.displayName = 'PaymentStatusCard';

export default PaymentStatusCard;

