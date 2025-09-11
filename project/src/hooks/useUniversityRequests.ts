import { useState, useEffect, useRef } from 'react';
import { UniversityPaymentRequest } from '../types/payment';
import { UniversityPaymentRequestService } from '../services/UniversityPaymentRequestService';

export const useUniversityRequests = () => {
  const [universityRequests, setUniversityRequests] = useState<UniversityPaymentRequest[]>([]);
  const [loadingUniversityRequests, setLoadingUniversityRequests] = useState(false);
  const [universityRequestsViewMode, setUniversityRequestsViewMode] = useState<'grid' | 'list'>('list');
  const [adminBalance, setAdminBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UniversityPaymentRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  // Estados para modais de ações
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const hasLoadedUniversityRequests = useRef(false);

  const loadUniversityPaymentRequests = async () => {
    try {
      setLoadingUniversityRequests(true);
      const data = await UniversityPaymentRequestService.listAllPaymentRequests();
      setUniversityRequests(data);
    } catch (error: any) {
      console.error('Error loading university payment requests:', error);
    } finally {
      setLoadingUniversityRequests(false);
    }
  };

  const loadAdminBalance = async () => {
    try {
      setLoadingBalance(true);
      // Calcular saldo baseado em todos os pagamentos recebidos menos os pagamentos feitos
      const totalRevenue = universityRequests.reduce((sum, r) => sum + r.amount_usd, 0);
      const totalPaidOut = universityRequests
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount_usd, 0);
      const availableBalance = totalRevenue - totalPaidOut;
      setAdminBalance(availableBalance);
    } catch (error: any) {
      console.error('Error loading admin balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const approveUniversityRequest = async (id: string, userId: string) => {
    try {
      await UniversityPaymentRequestService.adminApprove(id, userId);
      await loadUniversityPaymentRequests();
      // Recarregar saldo do admin também
      await loadAdminBalance();
    } catch (error: any) {
      console.error('Error approving request:', error);
    }
  };

  const rejectUniversityRequest = async (id: string, userId: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminReject(id, userId, rejectReason);
      await loadUniversityPaymentRequests();
      // Recarregar saldo do admin também
      await loadAdminBalance();
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const markUniversityRequestAsPaid = async (id: string, userId: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminMarkPaid(id, userId, paymentReference);
      await loadUniversityPaymentRequests();
      await loadAdminBalance();
      setShowMarkPaidModal(false);
      setPaymentReference('');
    } catch (error: any) {
      console.error('Error marking as paid:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const addAdminNotes = async (id: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminAddNotes(id, adminNotes);
      await loadUniversityPaymentRequests();
      setShowAddNotesModal(false);
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error adding notes:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Funções auxiliares para abrir modais
  const openRejectModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowRejectModal(true);
  };

  const openMarkPaidModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowMarkPaidModal(true);
  };

  const openAddNotesModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowAddNotesModal(true);
  };

  // Força recarregamento
  const forceRefresh = () => {
    hasLoadedUniversityRequests.current = false;
    loadUniversityPaymentRequests();
    hasLoadedUniversityRequests.current = true;
  };

  useEffect(() => {
    if (!hasLoadedUniversityRequests.current) {
      loadUniversityPaymentRequests();
      hasLoadedUniversityRequests.current = true;
    }
  }, []);

  useEffect(() => {
    if (universityRequests.length > 0) {
      loadAdminBalance();
    }
  }, [universityRequests]);

  return {
    // Estados
    universityRequests,
    loadingUniversityRequests,
    universityRequestsViewMode,
    setUniversityRequestsViewMode,
    adminBalance,
    loadingBalance,
    selectedRequest,
    setSelectedRequest,
    showRequestDetails,
    setShowRequestDetails,

    // Estados de modais
    showRejectModal,
    setShowRejectModal,
    showMarkPaidModal,
    setShowMarkPaidModal,
    showAddNotesModal,
    setShowAddNotesModal,
    rejectReason,
    setRejectReason,
    paymentReference,
    setPaymentReference,
    adminNotes,
    setAdminNotes,
    actionLoading,

    // Funções
    loadUniversityPaymentRequests,
    approveUniversityRequest,
    rejectUniversityRequest,
    markUniversityRequestAsPaid,
    addAdminNotes,
    openRejectModal,
    openMarkPaidModal,
    openAddNotesModal,
    forceRefresh,
  };
};
