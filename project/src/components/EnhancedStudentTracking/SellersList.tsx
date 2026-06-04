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

  const STAGES = [
    { key: 'registered',  label: 'Cadastro'    },
    { key: 'selection',   label: 'Seleção'     },
    { key: 'documents',   label: 'Documentos'  },
    { key: 'application', label: 'Candidatura' },
  ];

  const getStudentStageIndex = (student: any): number => {
    if (student.has_paid_selection_process_fee) return 3;
    const step = student.onboarding_current_step;
    const docs = student.documents_status;
    if (step === 'identity_verification' || step === 'documents_upload' ||
        docs === 'under_review' || docs === 'approved') return 2;
    if (step === 'selection_survey' || step === 'selection_fee' || step != null) return 1;
    return 0;
  };

  const getStageMessage = (student: any, stageIndex: number, pendente: number): string => {
    const firstName = student.full_name?.split(' ')[0] || 'O cliente';
    switch (stageIndex) {
      case 0: return `${firstName} se cadastrou. Incentive-o a iniciar o processo de seleção.`;
      case 1: return `Na etapa de seleção. Ajude-o a pagar a taxa para avançar.`;
      case 2:
        return student.documents_status === 'under_review'
          ? 'Documentos em análise. Aguardando aprovação da equipe.'
          : student.documents_status === 'rejected'
          ? 'Documentos rejeitados. O aluno precisa reenviar.'
          : 'Documentos aprovados. Avancando para candidatura.';
      case 3:
        if (pendente > 0) {
          const nextFee = !student.is_application_fee_paid ? 'Application Fee'
            : student.placement_fee_flow && !student.is_placement_fee_paid ? 'Placement Fee'
            : !student.has_paid_i20_control_fee ? 'Control Fee'
            : 'próxima taxa';
          return `Aguardando ${nextFee} para liberar ${formatCurrency(pendente)}.`;
        }
        return 'Todas as etapas concluidas.';
      default: return '';
    }
  };

  const renderPipeline = (student: any, disponivel: number, pendente: number) => {
    const currentStage = getStudentStageIndex(student);
    const message = getStageMessage(student, currentStage, pendente);
    return (
      <div className="flex flex-col gap-2 min-w-[260px]">
        {/* Pipeline */}
        <div className="flex items-center gap-0">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentStage;
            const isCurrent = index === currentStage;
            const isPending = index > currentStage;

            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-200'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                    title={stage.label}
                  >
                    {isCompleted ? '✓' : String(index + 1)}
                  </div>
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isCompleted ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-slate-300'
                  }`}>
                    {stage.label}
                  </span>
                </div>
                {index < STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-3 mx-0.5 ${
                    index < currentStage ? 'bg-emerald-400' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Message */}
        <span className="text-xs font-medium whitespace-normal leading-snug text-slate-500">
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
                    <div className="text-sm font-medium text-slate-900">{sellerName}</div>
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

                {/* Pipeline */}
                <td className="px-6 py-4">
                  {renderPipeline(student, disponivel, pendente)}
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
