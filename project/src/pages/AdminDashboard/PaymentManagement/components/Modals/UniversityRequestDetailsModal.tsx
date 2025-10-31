import React from 'react';
import { XCircle, CreditCard } from 'lucide-react';

interface UniversityRequestDetailsModalProps {
  isOpen: boolean;
  selectedRequest: any;
  onClose: () => void;
  openAddNotesModal: (id: string) => void;
  approveUniversityRequest: (id: string) => void;
  openRejectModal: (id: string) => void;
  openMarkPaidModal: (id: string) => void;
}

export function UniversityRequestDetailsModal(props: UniversityRequestDetailsModalProps) {
  const { isOpen, selectedRequest, onClose, openAddNotesModal, approveUniversityRequest, openRejectModal, openMarkPaidModal } = props;
  if (!isOpen || !selectedRequest) return null;
  const details = selectedRequest.payout_details_preview as Record<string, any> | undefined;
  const method = String(selectedRequest.payout_method || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><XCircle className="h-6 w-6" /></button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">University</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-lg font-semibold">{selectedRequest.university?.name}</p>
                <p className="text-gray-600">{selectedRequest.university?.location}</p>
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
                {details ? (
                  method === 'zelle' ? (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Zelle Information</h5>
                      <div className="space-y-2">
                        {details.email && (<div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-medium">{details.email}</span></div>)}
                        {details.phone && (<div className="flex justify-between"><span className="text-gray-600">Phone:</span><span className="font-medium">{details.phone}</span></div>)}
                        {details.name && (<div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-medium">{details.name}</span></div>)}
                        {!details.email && !details.phone && !details.name && (
                          <div className="text-sm text-gray-600">
                            <p className="mb-2">Available fields:</p>
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span><span className="font-medium">{String(value)}</span></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : method === 'bank_transfer' ? (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Bank Transfer Information</h5>
                      <div className="space-y-2">
                        {details.bank_name && (<div className="flex justify-between"><span className="text-gray-600">Bank Name:</span><span className="font-medium">{details.bank_name}</span></div>)}
                        {details.account_number && (<div className="flex justify-between"><span className="text-gray-600">Account Number:</span><span className="font-medium font-mono">{details.account_number}</span></div>)}
                        {details.routing_number && (<div className="flex justify-between"><span className="text-gray-600">Routing Number:</span><span className="font-medium font-mono">{details.routing_number}</span></div>)}
                        {details.account_type && (<div className="flex justify-between"><span className="text-gray-600">Account Type:</span><span className="font-medium capitalize">{details.account_type}</span></div>)}
                        {!details.bank_name && !details.account_number && !details.routing_number && !details.account_type && (
                          <div className="text-sm text-gray-600">
                            <p className="mb-2">Available fields:</p>
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span><span className="font-medium">{String(value)}</span></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : method === 'stripe' ? (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Stripe Information</h5>
                      <div className="space-y-2">
                        {details.stripe_email && (<div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-medium">{details.stripe_email}</span></div>)}
                        {details.account_id && (<div className="flex justify-between"><span className="text-gray-600">Account ID:</span><span className="font-medium font-mono">{details.account_id}</span></div>)}
                        {details.customer_id && (<div className="flex justify-between"><span className="text-gray-600">Customer ID:</span><span className="font-medium font-mono">{details.customer_id}</span></div>)}
                        {details.stripe_account_id && (<div className="flex justify-between"><span className="text-gray-600">Stripe Account ID:</span><span className="font-medium font-mono">{details.stripe_account_id}</span></div>)}
                        {!details.stripe_email && !details.account_id && !details.customer_id && !details.stripe_account_id && (
                          <div className="text-sm text-gray-600">
                            <p className="mb-2">Available fields:</p>
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span><span className="font-medium">{String(value)}</span></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900 capitalize">{method.replace('_', ' ')} Information</h5>
                      <div className="space-y-2">
                        {Object.entries(details).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
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
              <button onClick={() => openAddNotesModal(selectedRequest.id)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Add Notes</button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button onClick={() => { approveUniversityRequest(selectedRequest.id); onClose(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => { openRejectModal(selectedRequest.id); onClose(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                </>
              )}
              {selectedRequest.status === 'approved' && (
                <button onClick={() => { openMarkPaidModal(selectedRequest.id); onClose(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark as Paid</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


