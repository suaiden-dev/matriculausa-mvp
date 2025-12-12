import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RejectDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  documentType: string;
}

/**
 * RejectDocumentModal - Modal for rejecting a document with reason
 */
const RejectDocumentModal: React.FC<RejectDocumentModalProps> = ({
  isOpen,
  onClose,
  onReject,
  documentType,
}) => {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setIsProcessing(true);
    try {
      await onReject(reason);
      setReason('');
      onClose();
    } catch (error: any) {
      console.error('Error rejecting document:', error);
      alert('Error rejecting document: ' + (error?.message || 'Unknown error occurred. Please try again.'));
      // Não fechar o modal em caso de erro, para que o usuário possa tentar novamente
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Reject Document</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting the {documentType} document.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
            rows={4}
            placeholder="Enter rejection reason..."
          />
          <div className="flex items-center space-x-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !reason.trim()}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Reject Document'}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectDocumentModal;

