import React, { useEffect, useState } from 'react';
import { XCircle, CreditCard, Mail, User } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

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

  // Reset state when modal closes or request changes
  useEffect(() => {
    if (!isOpen) {
      setAdminDetails({});
    }
  }, [isOpen]);

  // Fetch admin details when request is loaded
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Affiliate Payment Request Details</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><XCircle className="h-6 w-6" /></button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Affiliate</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-lg font-semibold">Affiliate Request</p>
                <p className="text-gray-600">ID: {selectedRequest.referrer_user_id}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Amount:</span><span className="font-semibold">${selectedRequest.amount_usd.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Method:</span><span className="font-semibold capitalize">{selectedRequest.payout_method.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      selectedRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-gray-600">Created:</span><span>{new Date(selectedRequest.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {selectedRequest.payout_details ? (
                  <div className="space-y-2">
                    {Object.entries(selectedRequest.payout_details as Record<string, any>).map(([key, value]) => (
                      <div key={key} className="flex justify-between"><span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span><span className="font-medium">{String(value)}</span></div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-gray-500">No payment details available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Log - Histórico de ações dos admins */}
            {(selectedRequest.approved_by || selectedRequest.rejected_by || selectedRequest.paid_by) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Activity Log</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {selectedRequest.approved_by && (
                    <div className="flex items-start space-x-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Approved by Admin</p>

                        {adminDetails.approver ? (
                          <div className="mt-1 mb-1">
                            <p className="text-sm font-semibold text-slate-800 flex items-center">
                              <User className="w-3 h-3 mr-1 text-slate-500" />
                              {adminDetails.approver.name}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1 text-slate-400" />
                              {adminDetails.approver.email}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mt-0.5">Admin ID: {selectedRequest.approved_by}</p>
                        )}

                        {selectedRequest.approved_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(selectedRequest.approved_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.rejected_by && (
                    <div className="flex items-start space-x-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Rejected by Admin</p>

                        {adminDetails.rejecter ? (
                          <div className="mt-1 mb-1">
                            <p className="text-sm font-semibold text-slate-800 flex items-center">
                              <User className="w-3 h-3 mr-1 text-slate-500" />
                              {adminDetails.rejecter.name}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1 text-slate-400" />
                              {adminDetails.rejecter.email}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mt-0.5">Admin ID: {selectedRequest.rejected_by}</p>
                        )}

                        {selectedRequest.rejected_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(selectedRequest.rejected_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.paid_by && (
                    <div className="flex items-start space-x-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Marked as Paid by Admin</p>

                        {adminDetails.payer ? (
                          <div className="mt-1 mb-1">
                            <p className="text-sm font-semibold text-slate-800 flex items-center">
                              <User className="w-3 h-3 mr-1 text-slate-500" />
                              {adminDetails.payer.name}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1 text-slate-400" />
                              {adminDetails.payer.email}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mt-0.5">Admin ID: {selectedRequest.paid_by}</p>
                        )}

                        {selectedRequest.paid_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(selectedRequest.paid_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        {selectedRequest.payment_reference && (
                          <p className="text-xs text-gray-600 mt-1">
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
                <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4"><p className="text-gray-700">{selectedRequest.admin_notes}</p></div>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-4 border-t">
              <button onClick={() => openAffiliateNotesModal(selectedRequest)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Add Notes</button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button onClick={() => { approveAffiliateRequest(selectedRequest.id); onClose(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => { openAffiliateRejectModal(selectedRequest); onClose(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                </>
              )}
              {selectedRequest.status === 'approved' && (
                <button onClick={() => { openAffiliateMarkPaidModal(selectedRequest); onClose(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark as Paid</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
