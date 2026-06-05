import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, CreditCard, Mail, User, Building2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';

interface AffiliateRequestDetailsModalProps {
  isOpen: boolean;
  selectedRequest: any;
  onClose: () => void;
  openAffiliateNotesModal: (request: any) => void;
  approveAffiliateRequest: (id: string) => void;
  openAffiliateRejectModal: (request: any) => void;
  openAffiliateMarkPaidModal: (request: any) => void;
}

export function AffiliateRequestDetailsModal(props: AffiliateRequestDetailsModalProps) {
  const { isOpen, selectedRequest, onClose, openAffiliateNotesModal, approveAffiliateRequest, openAffiliateRejectModal, openAffiliateMarkPaidModal } = props;

  const [adminDetails, setAdminDetails] = useState<{
    approver?: { name: string; email: string };
    rejecter?: { name: string; email: string };
    payer?: { name: string; email: string };
  }>({});

  useEffect(() => {
    if (!isOpen) {
      setAdminDetails({});
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchAdminDetails = async () => {
      if (!selectedRequest) return;

      const idsToFetch = [
        selectedRequest.approved_by,
        selectedRequest.rejected_by,
        selectedRequest.paid_by
      ].filter(id => id);

      if (idsToFetch.length === 0) return;

      try {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', idsToFetch);

        if (profiles) {
          const details: any = {};

          const approverProfile = profiles.find(p => p.user_id === selectedRequest.approved_by);
          if (approverProfile) {
            details.approver = { name: approverProfile.full_name, email: approverProfile.email };
          }

          const rejecterProfile = profiles.find(p => p.user_id === selectedRequest.rejected_by);
          if (rejecterProfile) {
            details.rejecter = { name: rejecterProfile.full_name, email: rejecterProfile.email };
          }

          const payerProfile = profiles.find(p => p.user_id === selectedRequest.paid_by);
          if (payerProfile) {
            details.payer = { name: payerProfile.full_name, email: payerProfile.email };
          }

          setAdminDetails(details);
        }
      } catch (error) {
        console.error('Error fetching admin details:', error);
      }
    };

    if (isOpen && selectedRequest) {
      fetchAdminDetails();
    }
  }, [isOpen, selectedRequest]);

  if (!isOpen || !selectedRequest) return null;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-2xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Affiliate Payment Request</p>
            <h3 className="text-xl font-semibold text-white">
              {selectedRequest.company_name || selectedRequest.user_full_name || 'Affiliate'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Affiliate info */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {selectedRequest.company_name || selectedRequest.user_full_name || 'Affiliate'}
                </p>
                {selectedRequest.company_name && selectedRequest.user_full_name && (
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedRequest.user_full_name}
                  </p>
                )}
                {selectedRequest.user_email && (
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedRequest.user_email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Request details */}
          <div>
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Details</h4>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Amount</span>
                <span className="text-lg font-bold text-slate-900">${selectedRequest.amount_usd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Method</span>
                <span className="text-sm font-semibold text-slate-800 capitalize">{selectedRequest.payout_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[selectedRequest.status] || 'bg-slate-100 text-slate-800'}`}>
                  {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Created</span>
                <span className="text-sm text-slate-700">{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div>
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Details</h4>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              {selectedRequest.payout_details ? (
                <div className="space-y-2">
                  {Object.entries(selectedRequest.payout_details as Record<string, any>).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <span className="text-sm text-slate-500 capitalize shrink-0">{key.replace(/_/g, ' ')}</span>
                      {key === 'stripe_payment_link' && typeof value === 'string' && value.startsWith('http') ? (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 underline truncate">{value}</a>
                      ) : (
                        <span className="text-sm font-medium text-slate-800 text-right">{String(value)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No payment details available</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity log */}
          {(selectedRequest.approved_by || selectedRequest.rejected_by || selectedRequest.paid_by) && (
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity Log</h4>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                {selectedRequest.approved_by && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">Approved by Admin</p>
                      {adminDetails.approver ? (
                        <div className="mt-1">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {adminDetails.approver.name}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {adminDetails.approver.email}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">Admin ID: {selectedRequest.approved_by}</p>
                      )}
                      {selectedRequest.approved_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(selectedRequest.approved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedRequest.rejected_by && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">Rejected by Admin</p>
                      {adminDetails.rejecter ? (
                        <div className="mt-1">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {adminDetails.rejecter.name}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {adminDetails.rejecter.email}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">Admin ID: {selectedRequest.rejected_by}</p>
                      )}
                      {selectedRequest.rejected_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(selectedRequest.rejected_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedRequest.paid_by && (
                  <div className="flex items-start space-x-3 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">Marked as Paid by Admin</p>
                      {adminDetails.payer ? (
                        <div className="mt-1">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {adminDetails.payer.name}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {adminDetails.payer.email}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">Admin ID: {selectedRequest.paid_by}</p>
                      )}
                      {selectedRequest.paid_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(selectedRequest.paid_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {selectedRequest.payment_reference && (
                        <p className="text-xs text-slate-500 mt-1">
                          Reference: <span className="font-mono">{selectedRequest.payment_reference}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedRequest.admin_notes && (
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin Notes</h4>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-700">{selectedRequest.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
            <button
              onClick={() => openAffiliateNotesModal(selectedRequest)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              Add Notes
            </button>
            {selectedRequest.status === 'pending' && (
              <>
                <button
                  onClick={() => { approveAffiliateRequest(selectedRequest.id); onClose(); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => { openAffiliateRejectModal(selectedRequest); onClose(); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            {selectedRequest.status === 'approved' && (
              <button
                onClick={() => { openAffiliateMarkPaidModal(selectedRequest); onClose(); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
