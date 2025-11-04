export function createZelleUIHandlers(params: {
  zellePayments: any[];
  setSelectedZellePayment: (p: any) => void;
  setShowZelleReviewModal: (v: boolean) => void;
  setZelleAdminNotes: (v: string) => void;
  setShowZelleNotesModal: (v: boolean) => void;
  setSelectedZelleProofUrl: (v: string) => void;
  setSelectedZelleProofFileName: (v: string) => void;
  setShowZelleProofModal: (v: boolean) => void;
  onAfterReview?: () => void;
}) {
  const {
    zellePayments,
    setSelectedZellePayment,
    setShowZelleReviewModal,
    setZelleAdminNotes,
    setShowZelleNotesModal,
    setSelectedZelleProofUrl,
    setSelectedZelleProofFileName,
    setShowZelleProofModal,
    onAfterReview,
  } = params;

  const openZelleReviewModal = (paymentId: string) => {
    const payment = zellePayments.find((p) => p.id === paymentId);
    setSelectedZellePayment(payment || null);
    setShowZelleReviewModal(true);
  };

  const handleZelleReviewSuccess = () => {
    onAfterReview?.();
    setShowZelleReviewModal(false);
    setSelectedZellePayment(null as any);
  };

  const openZelleNotesModal = (paymentId: string) => {
    const payment = zellePayments.find((p) => p.id === paymentId);
    if (payment) {
      setSelectedZellePayment(payment);
      setZelleAdminNotes(payment.admin_notes || '');
      setShowZelleNotesModal(true);
    }
  };

  const openZelleProofModal = (paymentId: string, supabaseUrl?: string) => {
    const payment = zellePayments.find((p) => p.id === paymentId);
    if (payment && payment.payment_proof_url) {
      let fullUrl = payment.payment_proof_url;
      if (!payment.payment_proof_url.startsWith('http') && supabaseUrl) {
        fullUrl = `${supabaseUrl}/storage/v1/object/public/zelle_comprovantes/${payment.payment_proof_url}`;
      }
      setSelectedZelleProofUrl(fullUrl);
      setSelectedZelleProofFileName(`Zelle Payment Proof - ${payment.student_name}`);
      setShowZelleProofModal(true);
    }
  };

  return { openZelleReviewModal, handleZelleReviewSuccess, openZelleNotesModal, openZelleProofModal };
}


