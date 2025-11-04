export function createUniversityUIHandlers(params: {
  universityRequests: any[];
  setSelectedRequest: (req: any) => void;
  setShowRejectModal: (v: boolean) => void;
  setShowMarkPaidModal: (v: boolean) => void;
  setShowAddNotesModal: (v: boolean) => void;
}) {
  const { universityRequests, setSelectedRequest, setShowRejectModal, setShowMarkPaidModal, setShowAddNotesModal } = params;

  const openRejectModal = (id: string) => {
    const request = universityRequests.find((r) => r.id === id);
    setSelectedRequest(request || null);
    setShowRejectModal(true);
  };

  const openMarkPaidModal = (id: string) => {
    const request = universityRequests.find((r) => r.id === id);
    setSelectedRequest(request || null);
    setShowMarkPaidModal(true);
  };

  const openAddNotesModal = (id: string) => {
    const request = universityRequests.find((r) => r.id === id);
    setSelectedRequest(request || null);
    setShowAddNotesModal(true);
  };

  return { openRejectModal, openMarkPaidModal, openAddNotesModal };
}


