export function createAffiliateUIHandlers(params: {
  setSelectedAffiliateRequest: (req: any) => void;
  setShowAffiliateRejectModal: (v: boolean) => void;
  setShowAffiliateMarkPaidModal: (v: boolean) => void;
  setAffiliateAdminNotes: (v: string) => void;
  setShowAffiliateNotesModal: (v: boolean) => void;
}) {
  const {
    setSelectedAffiliateRequest,
    setShowAffiliateRejectModal,
    setShowAffiliateMarkPaidModal,
    setAffiliateAdminNotes,
    setShowAffiliateNotesModal,
  } = params;

  const openAffiliateRejectModal = (request: any) => {
    setSelectedAffiliateRequest(request);
    setShowAffiliateRejectModal(true);
  };

  const openAffiliateMarkPaidModal = (request: any) => {
    setSelectedAffiliateRequest(request);
    setShowAffiliateMarkPaidModal(true);
  };

  const openAffiliateNotesModal = (request: any) => {
    setSelectedAffiliateRequest(request);
    setAffiliateAdminNotes(request?.admin_notes || '');
    setShowAffiliateNotesModal(true);
  };

  return { openAffiliateRejectModal, openAffiliateMarkPaidModal, openAffiliateNotesModal };
}


