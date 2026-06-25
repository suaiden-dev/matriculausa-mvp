import { useState, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Application, UserProfile, Scholarship } from '../types';

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

export const useApplicationProgress = (
  application: ApplicationDetails | null,
  allStudentApplications: any[],
  setApplication: React.Dispatch<React.SetStateAction<ApplicationDetails | null>>,
  setAllStudentApplications: React.Dispatch<React.SetStateAction<any[]>>,
  applicationId: string | undefined,
) => {
  const { user } = useAuth();

  // Application Progress State
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [approvingApplication, setApprovingApplication] = useState<Record<string, boolean>>({});
  const [pendingRejectAppId, setPendingRejectAppId] = useState<string | null>(null);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [pendingApproveAppId, setPendingApproveAppId] = useState<string | null>(null);

  const allSteps = [
    { key: 'selection_fee', label: 'Selection Process Fee' },
    { key: 'apply', label: 'Application' },
    { key: 'review', label: 'Admissions Review' },
    { key: 'application_fee', label: 'Application Fee' },
    { key: 'placement_fee', label: 'Placement Fee' },
    { key: 'reinstatement_fee', label: 'Reinstatement Fee' },
    { key: 'ds160_package', label: 'Control Fee' },
    { key: 'i539_cos_package', label: 'Control Fee' },
    { key: 'scholarship_fee', label: 'Scholarship Fee' },
    { key: 'i20_fee', label: 'I-20 Control Fee' },
    { key: 'acceptance_letter', label: 'Acceptance Letter' },
    { key: 'transfer_form', label: 'Transfer Form' },
    { key: 'enrollment', label: 'Enrolled' }
  ];

  const steps = useMemo(() => {
    return allSteps.filter(step => {
      if (!application) return false;
      const processType = application.student_process_type || application.user_profiles?.student_process_type;
      const isTransferInactive = processType === 'transfer' && (application.user_profiles as any)?.visa_transfer_active === false;

      if (step.key === 'transfer_form') return processType === 'transfer';
      if (step.key === 'ds160_package') return processType === 'initial';
      if (step.key === 'i539_cos_package') return processType === 'change_of_status';

      if (step.key === 'reinstatement_fee') return isTransferInactive;
      if (isTransferInactive && ['scholarship_fee', 'i20_fee'].includes(step.key)) return false;

      const placementFeeFlow = (application.user_profiles as any)?.placement_fee_flow;
      if (placementFeeFlow) {
        return !['scholarship_fee', 'i20_fee'].includes(step.key);
      } else {
        return step.key !== 'placement_fee';
      }
    });
  }, [application]);

  const getStepStatus = useCallback((step: { key: string; label: string }) => {
    if (!application) return 'pending';
    const profile: any = application.user_profiles;

    switch (step.key) {
      case 'selection_fee':
        return profile?.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return 'completed';
      case 'review':
        if (application.status === 'enrolled' || application.status === 'approved') return 'completed';
        if (application.status === 'rejected') return 'rejected';
        if (application.status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return application.is_application_fee_paid ? 'completed' : 'pending';
      case 'placement_fee':
        return profile?.is_placement_fee_paid ? 'completed' : 'pending';
      case 'reinstatement_fee':
        return profile?.has_paid_reinstatement_package ? 'completed' : 'pending';
      case 'ds160_package':
        return profile?.has_paid_ds160_package ? 'completed' : 'pending';
      case 'i539_cos_package':
        return profile?.has_paid_i539_cos_package ? 'completed' : 'pending';
      case 'scholarship_fee':
        return application.is_scholarship_fee_paid || profile?.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'i20_fee':
        return profile?.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (application.acceptance_letter_status === 'approved' || application.acceptance_letter_status === 'sent') return 'completed';
        return 'pending';
      case 'transfer_form':
        const processType = application.student_process_type || profile?.student_process_type;
        if (processType !== 'transfer') return 'skipped';
        const tfStatus = (application as any).transfer_form_status;
        return tfStatus === 'approved' || tfStatus === 'sent' ? 'completed' : 'pending';
      case 'enrollment':
        return application.status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  }, [application]);

  const getCurrentStep = useCallback(() => {
    if (!application) return null;

    for (let i = 0; i < steps.length; i++) {
      const status = getStepStatus(steps[i]);
      if (status === 'in_progress' || status === 'pending') {
        return { step: steps[i], index: i, status };
      }
    }
    return { step: steps[steps.length - 1], index: steps.length - 1, status: 'completed' };
  }, [application, steps, getStepStatus]);

  const handleApproveApplication = async (appId?: string) => {
    if (!application) return;
    const targetAppId = appId || application.id;

    try {
      setApprovingApplication(prev => ({ ...prev, [targetAppId]: true }));

      const { error } = await supabase
        .from('scholarship_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', targetAppId);

      if (error) throw error;

      if (targetAppId === application.id) {
        setApplication(prev => prev ? ({
          ...prev,
          status: 'approved'
        } as any) : prev);
      }

      setAllStudentApplications(prev =>
        prev.map((a: any) => a.id === targetAppId ? { ...a, status: 'approved' } : a)
      );

      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Application Approved",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name || 'Student',
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your application for <strong>${(allStudentApplications.find((a: any) => a.id === targetAppId) || application)?.scholarships?.title || 'your scholarship'}</strong> has been approved by the university. You can now proceed with the next steps in your dashboard.`
          };

          await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });
        }
      } catch (webhookErr) {
        console.error('Error sending approval webhook:', webhookErr);
      }

      toast.success('Application approved successfully!');
    } catch (err: any) {
      console.error('Error approving application:', err);
      toast.error(`Failed to approve application: ${err.message}`);
    } finally {
      setApprovingApplication(prev => ({ ...prev, [targetAppId]: false }));
    }
  };

  const rejectStudent = async (rejectStudentReason: string, onSuccess?: () => void) => {
    const targetAppId = pendingRejectAppId || applicationId;
    try {
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', targetAppId);

      if (targetAppId === application?.id) {
        setApplication(prev => prev ? ({
          ...prev,
          status: 'rejected'
        } as any) : prev);
      }

      setAllStudentApplications(prev =>
        prev.map((a: any) => a.id === targetAppId ? { ...a, status: 'rejected', notes: rejectStudentReason || null } : a)
      );

      const allRejected = allStudentApplications.every((a: any) =>
        a.id === targetAppId ? true : a.status === 'rejected'
      );
      if (allRejected) {
        await supabase
          .from('user_profiles')
          .update({ documents_status: 'rejected' })
          .eq('user_id', application!.user_profiles.user_id);
      }

      setPendingRejectAppId(null);
      toast.success('Application rejected.');
      onSuccess?.();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application.');
    }
  };

  return {
    isProgressExpanded, setIsProgressExpanded,
    approvingApplication,
    pendingRejectAppId, setPendingRejectAppId,
    showApproveConfirmModal, setShowApproveConfirmModal,
    pendingApproveAppId, setPendingApproveAppId,
    steps, getStepStatus, getCurrentStep,
    handleApproveApplication,
    rejectStudent,
  };
};
