import React, { useState } from 'react';
import { X, RotateCcw, RefreshCw, CheckCircle } from 'lucide-react';

interface RestoreStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  studentName: string;
}

/**
 * RestoreStudentModal - Stylized modal for confirming student restoration from dropped status
 */
const RestoreStudentModal: React.FC<RestoreStudentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  studentName,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error: any) {
      console.error('Error restoring student:', error);
      // O erro já é tratado pelo mutation/toast no pai geralmente
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-blue-800">
            <RotateCcw className="w-6 h-6" />
            <h3 className="text-lg font-bold">Restore Student</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-blue-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-100 rounded-full"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-2">Are you sure?</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              You are about to restore <span className="font-bold text-slate-900">{studentName}</span> to the active pipeline.
              They will be moved back to their previous stage.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              This action will be logged in the student's activity history.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all disabled:opacity-50 border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center border border-blue-700/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Now'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreStudentModal;
