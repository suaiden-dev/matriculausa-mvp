import React from 'react';
import { XCircle, CreditCard } from 'lucide-react';

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
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
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


