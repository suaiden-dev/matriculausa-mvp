import React from 'react';
import { XCircle } from 'lucide-react';

type AffiliateAddNotesModalProps = {
  isOpen: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

const AffiliateAddNotesModal: React.FC<AffiliateAddNotesModalProps> = ({
  isOpen,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any administrative notes or comments..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!notes.trim() || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding Notes...' : 'Add Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AffiliateAddNotesModal);


