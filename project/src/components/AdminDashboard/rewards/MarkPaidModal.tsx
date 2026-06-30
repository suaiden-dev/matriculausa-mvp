import React from 'react';

interface Props {
  paymentReference: string;
  onReferenceChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const MarkPaidModal: React.FC<Props> = ({ paymentReference, onReferenceChange, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Mark Payout as Paid</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="paymentReference" className="block text-sm font-medium text-slate-700 mb-2">
          Payment Reference (Optional)
        </label>
        <input
          type="text"
          id="paymentReference"
          value={paymentReference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="Enter payment reference, transaction ID, or any notes..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
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
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
        >
          Mark as Paid
        </button>
      </div>
    </div>
  </div>
);

export default MarkPaidModal;
