import React from 'react';

interface Props {
  rejectReason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const RejectModal: React.FC<Props> = ({ rejectReason, onReasonChange, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Reject Payout Request</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="rejectReason" className="block text-sm font-medium text-slate-700 mb-2">
          Reason for rejection
        </label>
        <textarea
          id="rejectReason"
          value={rejectReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Enter the reason for rejecting this payout request..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
          rows={3}
        />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!rejectReason.trim()}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reject Request
        </button>
      </div>
    </div>
  </div>
);

export default RejectModal;
