import React, { useState } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DropStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  studentName: string;
}

/**
 * DropStudentModal - Modal for mandatory justification when dropping a student
 */
const DropStudentModal: React.FC<DropStudentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  studentName,
}) => {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setIsProcessing(true);
    try {
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (error: any) {
      console.error('Error dropping student:', error);
      toast.error('Error dropping student: ' + (error?.message || 'Unknown error occurred. Please try again.'));
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
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-800">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold">Confirm Drop Student</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-amber-400 hover:text-amber-600 transition-colors p-1 hover:bg-amber-100 rounded-full"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed">
              You are about to mark <span className="font-bold text-slate-900">{studentName}</span> as <span className="font-bold text-amber-700">Dropped</span>. 
              This action requires a justification that will be saved in the student's internal history.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-slate-700">
                Justification <span className="text-red-500">*</span>
              </label>
              <span className={`text-[10px] font-medium ${reason.length > 0 ? 'text-slate-500' : 'text-amber-500'}`}>
                {reason.length > 0 ? 'Characters: ' + reason.length : 'Required'}
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none bg-slate-50 min-h-[120px]"
              placeholder="Why is this student being dropped? (e.g., No contact, withdrew, financial issues...)"
              autoFocus
              disabled={isProcessing}
            />

            {/* Sugestões de motivos */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Common Reasons</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Withdrawal",
                  "No contact",
                  "Financial issues",
                  "Change of plans",
                  "Not qualified",
                  "Visa denied",
                  "Found another option",
                  "Incorrect profile data"
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setReason(sug)}
                    disabled={isProcessing}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      reason === sug 
                        ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              This note will be added to Admin Notes and visible to all administrators.
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
              onClick={handleSubmit}
              disabled={isProcessing || !reason.trim()}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-200 transition-all disabled:opacity-50 flex items-center justify-center border border-amber-700/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Drop Student'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Shield icon since I forgot to import it from lucide-react if needed
const Shield = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

export default DropStudentModal;
