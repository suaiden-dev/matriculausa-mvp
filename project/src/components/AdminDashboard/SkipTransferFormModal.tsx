import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SkipTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  studentName: string;
}

/**
 * SkipTransferFormModal - Modal for mandatory justification when skipping the Transfer Form step
 */
const SkipTransferFormModal: React.FC<SkipTransferFormModalProps> = ({
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
      console.error('Error skipping transfer form:', error);
      toast.error('Erro ao pular etapa: ' + (error?.message || 'Erro desconhecido.'));
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
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <h3 className="text-lg font-bold">Pular Etapa: Transfer Form</h3>
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
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed">
              Você está prestes a pular a etapa de <span className="font-bold text-slate-900">Transfer Form</span> para o aluno <span className="font-bold text-slate-900">{studentName}</span>.
              Esta ação exige uma justificativa que será salva nas notas administrativas e no histórico do estudante.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-slate-700">
                Justificativa <span className="text-red-500">*</span>
              </label>
              <span className={`text-[10px] font-medium ${reason.length > 0 ? 'text-slate-500' : 'text-blue-500'}`}>
                {reason.length > 0 ? 'Caracteres: ' + reason.length : 'Obrigatório'}
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-slate-50 min-h-[120px]"
              placeholder="Por que você está pulando esta etapa para este estudante?"
              autoFocus
              disabled={isProcessing}
            />

            {/* Sugestões de motivos */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Motivos Comuns</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Enviado fora da plataforma",
                  "Dispensado pela universidade",
                  "Processado manualmente",
                  "Caso especial / urgência",
                  "Transferência concluída no SEVIS"
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setReason(sug)}
                    disabled={isProcessing}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      reason === sug 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
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
              Esta nota será adicionada em Notas do Admin e ficará visível para a equipe.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all disabled:opacity-50 border border-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !reason.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center border border-blue-700/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Pular Etapa'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

export default SkipTransferFormModal;
