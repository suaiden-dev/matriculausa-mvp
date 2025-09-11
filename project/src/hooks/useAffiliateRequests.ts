import { useState, useEffect, useRef } from 'react';
import { AffiliatePaymentRequest } from '../types/payment';
import { AffiliatePaymentRequestService } from '../services/AffiliatePaymentRequestService';
import { supabase } from '../lib/supabase';

export const useAffiliateRequests = () => {
  const [affiliateRequests, setAffiliateRequests] = useState<AffiliatePaymentRequest[]>([]);
  const [loadingAffiliateRequests, setLoadingAffiliateRequests] = useState(false);
  const [affiliateActionLoading, setAffiliateActionLoading] = useState(false);
  const [selectedAffiliateRequest, setSelectedAffiliateRequest] = useState<AffiliatePaymentRequest | null>(null);
  const [showAffiliateDetails, setShowAffiliateDetails] = useState(false);
  
  // Estados para modais de affiliate
  const [showAffiliateRejectModal, setShowAffiliateRejectModal] = useState(false);
  const [showAffiliateMarkPaidModal, setShowAffiliateMarkPaidModal] = useState(false);
  const [showAffiliateNotesModal, setShowAffiliateNotesModal] = useState(false);
  const [affiliateRejectReason, setAffiliateRejectReason] = useState('');
  const [affiliatePaymentReference, setAffiliatePaymentReference] = useState('');
  const [affiliateAdminNotes, setAffiliateAdminNotes] = useState('');

  const hasLoadedAffiliateRequests = useRef(false);

  const loadAffiliateRequests = async () => {
    try {
      setLoadingAffiliateRequests(true);
      const data = await AffiliatePaymentRequestService.listAllPaymentRequests();
      setAffiliateRequests(data);
    } catch (error: any) {
      console.error('Error loading affiliate payment requests (admin):', error);
      setAffiliateRequests([]);
    } finally {
      setLoadingAffiliateRequests(false);
    }
  };

  // Admin actions for Affiliate Requests
  const approveAffiliateRequest = async (id: string, userId: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminApprove(id, userId);
      await loadAffiliateRequests();
    } catch (error) {
      console.error('Error approving affiliate request:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const rejectAffiliateRequest = async (id: string, userId: string, reason?: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminReject(id, userId, reason || affiliateRejectReason);
      await loadAffiliateRequests();
      setShowAffiliateRejectModal(false);
      setAffiliateRejectReason('');
    } catch (error) {
      console.error('Error rejecting affiliate request:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const markAffiliateRequestPaid = async (id: string, userId: string, reference?: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminMarkPaid(id, userId, reference || affiliatePaymentReference);
      await loadAffiliateRequests();
      setShowAffiliateMarkPaidModal(false);
      setAffiliatePaymentReference('');
    } catch (error) {
      console.error('Error marking affiliate request as paid:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const addAffiliateAdminNotes = async (id: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminAddNotes(id, affiliateAdminNotes);
      await loadAffiliateRequests();
      setShowAffiliateNotesModal(false);
      setAffiliateAdminNotes('');
    } catch (error) {
      console.error('Error adding affiliate notes:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  // Helper functions for affiliate modals
  const openAffiliateRejectModal = (request: AffiliatePaymentRequest) => {
    setSelectedAffiliateRequest(request);
    setShowAffiliateRejectModal(true);
  };

  const openAffiliateMarkPaidModal = (request: AffiliatePaymentRequest) => {
    setSelectedAffiliateRequest(request);
    setShowAffiliateMarkPaidModal(true);
  };

  const openAffiliateNotesModal = (request: AffiliatePaymentRequest) => {
    setSelectedAffiliateRequest(request);
    setAffiliateAdminNotes(request.admin_notes || '');
    setShowAffiliateNotesModal(true);
  };

  // Força recarregamento
  const forceRefresh = () => {
    hasLoadedAffiliateRequests.current = false;
    loadAffiliateRequests();
    hasLoadedAffiliateRequests.current = true;
  };

  // Realtime updates for Affiliate Requests
  useEffect(() => {
    const channel = supabase
      .channel('adm_affiliate_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_payment_requests' }, () => {
        loadAffiliateRequests();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedAffiliateRequests.current) {
      loadAffiliateRequests();
      hasLoadedAffiliateRequests.current = true;
    }
  }, []);

  return {
    // Estados
    affiliateRequests,
    loadingAffiliateRequests,
    affiliateActionLoading,
    selectedAffiliateRequest,
    setSelectedAffiliateRequest,
    showAffiliateDetails,
    setShowAffiliateDetails,

    // Estados de modais
    showAffiliateRejectModal,
    setShowAffiliateRejectModal,
    showAffiliateMarkPaidModal,
    setShowAffiliateMarkPaidModal,
    showAffiliateNotesModal,
    setShowAffiliateNotesModal,
    affiliateRejectReason,
    setAffiliateRejectReason,
    affiliatePaymentReference,
    setAffiliatePaymentReference,
    affiliateAdminNotes,
    setAffiliateAdminNotes,

    // Funções
    loadAffiliateRequests,
    approveAffiliateRequest,
    rejectAffiliateRequest,
    markAffiliateRequestPaid,
    addAffiliateAdminNotes,
    openAffiliateRejectModal,
    openAffiliateMarkPaidModal,
    openAffiliateNotesModal,
    forceRefresh,
  };
};
