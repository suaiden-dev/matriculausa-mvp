import React from 'react';
import { User } from 'lucide-react';

interface SellersListProps {
  filteredSellers: any[];
  filteredStudents: any[];
  expandedSellers: Set<string>;
  expandedStudents: Set<string>;
  onToggleSellerExpansion: (sellerId: string) => void;
  onToggleStudentExpansion: (studentId: string) => void;
  onViewStudentDetails: (studentId: string, profileId: string) => void;
  blackCouponUsers?: Set<string>;
  commissions?: any[];
  commissionRules?: any;
}

const SellersList: React.FC<SellersListProps> = ({
  filteredSellers,
  filteredStudents,
  onViewStudentDetails,
  commissions = [],
  commissionRules = {}
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const renderProgressStepper = (student: any, disponivel: number, pendente: number) => {
    // Conditions per applicationFlowStages.ts
    const isTransferInactiveVisa = student.student_process_type === 'transfer' && student.visa_transfer_active === false;
    const isI20Applicable =
      student.student_process_type === 'initial' ||
      student.student_process_type === 'change_of_status' ||
      isTransferInactiveVisa;
    const isPlacementApplicable = !!student.placement_fee_flow;
    const isReinstatementApplicable = student.student_process_type === 'transfer' && student.visa_transfer_active === false;

    // Placement or Scholarship — mutually exclusive
    // placement_fee_flow=true → Placement Fee path; false → Scholarship Fee path
    const placementOrScholarshipPaid = isPlacementApplicable
      ? !!student.is_placement_fee_paid
      : !!student.is_scholarship_fee_paid;

    const steps = [
      { label: 'Reg.', tooltip: 'Registered', active: true, skip: false },
      { label: 'Sel.', tooltip: 'Selection Process Fee', active: !!student.has_paid_selection_process_fee, skip: false },
      { label: 'App.', tooltip: 'Application Fee', active: !!student.is_application_fee_paid, skip: false },
      {
        label: isPlacementApplicable ? 'Plac.' : 'Schol.',
        tooltip: isPlacementApplicable ? 'Placement Fee' : 'Scholarship Fee',
        active: placementOrScholarshipPaid,
        skip: false
      },
      {
        label: 'Rein.',
        tooltip: 'Reinstatement Fee',
        active: !!student.has_paid_reinstatement_package,
        skip: !isReinstatementApplicable
      },
      {
        label: 'Ctrl.',
        tooltip: 'I-20 Control Fee',
        active: !!student.has_paid_i20_control_fee || !!student.has_paid_ds160_package || !!student.has_paid_i539_cos_package,
        skip: !isI20Applicable
      },
      {
        label: 'Com.',
        tooltip: 'Commission released',
        active: disponivel > 0,
        skip: false
      }
    ];

    // Dynamic status message
    let message = '';
    const firstName = student.full_name?.split(' ')[0] || 'The client';

    if (!student.has_paid_selection_process_fee) {
      message = `${firstName} registered. Help them pay the Selection Process Fee.`;
    } else if (!student.is_application_fee_paid) {
      message = `Selection Process Fee paid. Awaiting Application Fee payment to release ${formatCurrency(pendente)}.`;
    } else if (!placementOrScholarshipPaid) {
      const feeLabel = isPlacementApplicable ? 'Placement Fee' : 'Scholarship Fee';
      message = `Application Fee paid. Awaiting ${feeLabel} payment to release ${formatCurrency(pendente)}.`;
    } else if (isReinstatementApplicable && !student.has_paid_reinstatement_package) {
      message = `Placement Fee paid. Awaiting Reinstatement Fee payment to release ${formatCurrency(pendente)}.`;
    } else if (isI20Applicable && !(student.has_paid_i20_control_fee || student.has_paid_ds160_package || student.has_paid_i539_cos_package)) {
      message = `Awaiting I-20 Control Fee payment to release ${formatCurrency(pendente)}.`;
    } else {
      message = `Commission of ${formatCurrency(disponivel)} released!`;
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
        {steps.filter(step => !step.skip).map((step, index) => (
            <span 
              key={index}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all duration-200 ${
                step.active 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
              title={`${step.tooltip}: ${step.active ? 'Completed' : 'Pending'}`}
            >
              {step.label}
            </span>
          ))}
        </div>
        <span className="text-xs text-slate-600 font-medium mt-1.5 block whitespace-normal">
          {message}
        </span>
      </div>
    );
  };

  // Helper para calcular comissões do aluno (pendente e disponível)
  const getStudentCommissions = (student: any) => {
    const studentId = student.profile_id || student.id || student.user_id;
    // Comissões reais gravadas no banco (Disponível)
    const studentComms = commissions.filter(c => c.student_id === studentId);
    const disponivel = studentComms.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    // Calcular potencial pendente
    let pendente = 0;
    const dependents = student.dependents || 0;
    const isSimplified = student.system_type === 'simplified';
    const rules = commissionRules || {};

    const calculateRuleComm = (ruleKey: string, defaultFeeAmount: number) => {
      const rule = rules[ruleKey];
      if (!rule || rule.enabled === false) return 0;
      if (rule.type === 'fixed') {
        return Number(rule.value) || 0;
      } else if (rule.type === 'percentage') {
        const pct = (Number(rule.value) || 0) / 100;
        return defaultFeeAmount * pct;
      }
      return 0;
    };

    const baseSelection = isSimplified ? 350 : 400;
    const selectionFeeAmount = isSimplified ? baseSelection : baseSelection + dependents * 150;
    const scholarshipFeeAmount = isSimplified ? 550 : 900;
    const i20FeeAmount = 900;
    const applicationFeeAmount = 100;

    // Condições idênticas ao stepper
    const isTransferInactiveVisa = student.student_process_type === 'transfer' && student.visa_transfer_active === false;
    const isI20Applicable =
      student.student_process_type === 'initial' ||
      student.student_process_type === 'change_of_status' ||
      isTransferInactiveVisa;
    const isPlacementApplicable = !!student.placement_fee_flow;
    const isReinstatementApplicable = student.student_process_type === 'transfer' && student.visa_transfer_active === false;

    const placementOrScholarshipPaid = isPlacementApplicable
      ? !!student.is_placement_fee_paid
      : !!student.is_scholarship_fee_paid;

    const i20Paid = !!student.has_paid_i20_control_fee || !!student.has_paid_ds160_package || !!student.has_paid_i539_cos_package;

    if (!student.has_paid_selection_process_fee) {
      pendente += calculateRuleComm('selection_process', selectionFeeAmount);
    }
    if (!student.is_application_fee_paid) {
      pendente += calculateRuleComm('application', applicationFeeAmount);
    }
    if (!placementOrScholarshipPaid) {
      if (isPlacementApplicable) {
        pendente += calculateRuleComm('placement', scholarshipFeeAmount);
      } else {
        pendente += calculateRuleComm('scholarship', scholarshipFeeAmount);
      }
    }
    if (isReinstatementApplicable && !student.has_paid_reinstatement_package) {
      pendente += calculateRuleComm('reinstatement', 500);
    }
    if (isI20Applicable && !i20Paid) {
      pendente += calculateRuleComm('i20_control', i20FeeAmount);
    }

    return { disponivel, pendente };
  };

  if (filteredStudents.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No students found</h3>
        <p className="text-slate-500">
          Try adjusting the search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Seller
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Progress
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {filteredStudents.map((student) => {
            const { disponivel, pendente } = getStudentCommissions(student);
            
            // Buscar nome do vendedor se disponível, senão fallback do referral code
            const sellerName = student.seller_name || 
              filteredSellers.find(s => s.referral_code === student.seller_referral_code)?.name || 
              student.seller_referral_code || 
              'Unassigned';

            return (
              <tr 
                key={student.id} 
                className="hover:bg-slate-50/70 transition-colors"
              >
                {/* Cliente */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      student.has_paid_selection_process_fee ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {student.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-slate-900">{student.full_name || 'No name'}</div>
                      <div className="text-xs text-slate-500">{student.email}</div>
                    </div>
                  </div>
                </td>

                {/* Vendedor */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-slate-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{sellerName}</div>
                      {student.seller_referral_code && (
                        <div className="text-xs text-slate-400 font-mono">{student.seller_referral_code}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Valor Pendente */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-700">
                    {formatCurrency(pendente)}
                  </span>
                </td>

                {/* Valor Disponível */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-bold ${disponivel > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {formatCurrency(disponivel)}
                  </span>
                </td>

                {/* Progresso Stepper */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderProgressStepper(student, disponivel, pendente)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onViewStudentDetails(student.student_id || student.user_id, student.profile_id || student.id)}
                    className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-all duration-200"
                  >
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SellersList;
