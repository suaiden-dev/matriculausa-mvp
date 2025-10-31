import React from 'react';
import { XCircle } from 'lucide-react';

type AffiliateRejectModalProps = {
  isOpen: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

const AffiliateRejectModal: React.FC<AffiliateRejectModalProps> = ({
  isOpen,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Reject Affiliate Payment Request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Please provide a reason for rejecting this affiliate payment request..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!reason.trim() || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AffiliateRejectModal);


