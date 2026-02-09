import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Clock, Eye, AlertCircle, X, Edit2, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TermAcceptance } from './types';
import RejectDocumentModal from './RejectDocumentModal';

interface IdentityPhotoVerificationCardProps {
  termAcceptance: TermAcceptance | null;
  onApprove: (acceptanceId: string) => Promise<void>;
  onReject: (acceptanceId: string, reason: string) => Promise<void>;
  onUpdateRejectionReason?: (acceptanceId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

/**
 * IdentityPhotoVerificationCard - Displays identity photo for admin verification
 * Allows admin to approve or reject the identity photo with reason
 */
const IdentityPhotoVerificationCard: React.FC<IdentityPhotoVerificationCardProps> = ({
  termAcceptance,
  onApprove,
  onReject,
  onUpdateRejectionReason,
  isProcessing = false,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isEditingReason, setIsEditingReason] = useState(false);
  const [editedReason, setEditedReason] = useState('');
  const [isSavingReason, setIsSavingReason] = useState(false);

  // Fechar modal com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPhotoModal) {
        setShowPhotoModal(false);
      }
    };

    if (showPhotoModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showPhotoModal]);

  // Carregar signed URL da foto
  useEffect(() => {
    const loadPhotoUrl = async () => {
      // If prop has no path, try fetching acceptance row directly to get the path
      let path = termAcceptance?.identity_photo_path;
      if (!path && termAcceptance?.id) {
        try {
          const { data: accRow, error: accError } = await supabase
            .from('comprehensive_term_acceptance')
            .select('identity_photo_path, identity_photo_name, identity_photo_status, identity_photo_rejection_reason')
            .eq('id', termAcceptance.id)
            .maybeSingle();

          if (!accError && accRow && accRow.identity_photo_path) {
            path = accRow.identity_photo_path;
          }
        } catch (err) {
          console.error('Erro ao buscar acceptance para photo path:', err);
        }
      }

      if (!path) {
        setPhotoUrl(null);
        return;
      }

      setLoadingPhoto(true);
      try {
        // Criar signed URL válida por 1 hora
        const { data, error } = await supabase.storage
          .from('identity-photos')
          .createSignedUrl(path, 3600);

        if (error) {
          console.error('Erro ao gerar signed URL:', error);
          setPhotoUrl(null);
        } else {
          setPhotoUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Erro ao carregar foto:', error);
        setPhotoUrl(null);
      } finally {
        setLoadingPhoto(false);
      }
    };

    loadPhotoUrl();
  }, [termAcceptance?.identity_photo_path]);

  // Se não há acceptance, não renderizar; caso não tenha foto, exibimos o card e tentamos buscar a foto
  if (!termAcceptance) {
    return null;
  }

  const status = termAcceptance.identity_photo_status || 'pending';
  const rejectionReason = termAcceptance.identity_photo_rejection_reason;

  // Inicializar editedReason quando rejectionReason mudar
  useEffect(() => {
    if (rejectionReason) {
      setEditedReason(rejectionReason);
    }
  }, [rejectionReason]);

  const handleStartEditReason = () => {
    setEditedReason(rejectionReason || '');
    setIsEditingReason(true);
  };

  const handleCancelEditReason = () => {
    setEditedReason(rejectionReason || '');
    setIsEditingReason(false);
  };

  const handleSaveEditReason = async () => {
    if (!termAcceptance?.id || !onUpdateRejectionReason) return;
    
    if (!editedReason.trim()) {
      alert('Rejection reason cannot be empty');
      return;
    }

    setIsSavingReason(true);
    try {
      await onUpdateRejectionReason(termAcceptance.id, editedReason.trim());
      setIsEditingReason(false);
    } catch (error: any) {
      console.error('Error updating rejection reason:', error);
      alert('Error updating rejection reason: ' + (error?.message || 'Unknown error occurred. Please try again.'));
      // Não fechar o modo de edição em caso de erro, para que o usuário possa tentar novamente
    } finally {
      setIsSavingReason(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        );
    }
  };

  const handleReject = async (reason: string) => {
    if (!termAcceptance?.id) return;
    
    try {
      await onReject(termAcceptance.id, reason);
      setShowRejectModal(false);
    } catch (error: any) {
      console.error('Error rejecting identity photo:', error);
      alert('Error rejecting identity photo: ' + (error?.message || 'Unknown error occurred. Please try again.'));
      // Não fechar o modal em caso de erro, para que o usuário possa tentar novamente
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {/* Header melhorado */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#05294E]/10 rounded-lg">
              <Camera className="w-5 h-5 text-[#05294E]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Identity Photo Verification
              </h3>

            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-5">
          {/* Preview da foto - Melhorado */}
          <div className="relative">
            {loadingPhoto ? (
              <div className="w-full h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-[#05294E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm text-slate-500">Loading photo...</p>
                </div>
              </div>
            ) : photoUrl ? (
              <div 
                className="relative group cursor-pointer overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-all hover:border-[#05294E] hover:shadow-lg"
                onClick={() => setShowPhotoModal(true)}
              >
                <div className="aspect-[4/3] w-full flex items-center justify-center p-4">
                  <img
                    src={photoUrl}
                    alt="Identity photo"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
                {/* Overlay com ícone de zoom */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-xl flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Eye className="w-6 h-6 text-[#05294E]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 text-slate-400">
                <AlertCircle className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">Photo not available</p>
              </div>
            )}
          </div>

          {/* Motivo da rejeição (se rejeitado) - Melhorado com edição */}
          {status === 'rejected' && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-red-900">Rejection Reason</p>
                    {!isEditingReason && onUpdateRejectionReason && (
                      <button
                        onClick={handleStartEditReason}
                        disabled={isProcessing}
                        className="text-red-600 hover:text-red-800 transition-colors p-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit rejection reason"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {isEditingReason ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedReason}
                        onChange={(e) => setEditedReason(e.target.value)}
                        disabled={isSavingReason || isProcessing}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm text-red-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                        rows={4}
                        placeholder="Enter rejection reason..."
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEditReason}
                          disabled={isSavingReason || isProcessing || !editedReason.trim()}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSavingReason ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEditReason}
                          disabled={isSavingReason || isProcessing}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">
                      {rejectionReason || 'No rejection reason provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação (apenas se pending) - Melhorados */}
          {status === 'pending' && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
              <button
                onClick={() => termAcceptance.id && onApprove(termAcceptance.id)}
                disabled={isProcessing}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de rejeição */}
      <RejectDocumentModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={handleReject}
        documentType="Identity Photo"
      />

      {/* Modal para visualizar foto em tamanho maior - Melhorado */}
      {showPhotoModal && photoUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-opacity duration-200"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-6xl max-h-[95vh] w-full flex flex-col">
            {/* Header do modal */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3 text-white">
                <Camera className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Identity Photo - Full View</h3>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2.5 transition-colors group"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            {/* Container da imagem */}
            <div className="relative flex-1 bg-black/50 rounded-xl p-4 flex items-center justify-center min-h-0">
              <img
                src={photoUrl}
                alt="Identity photo - full size"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Footer com informações */}
            {termAcceptance.identity_photo_name && (
              <div className="mt-4 px-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-sm text-center">
                  <span className="font-medium">File:</span> {termAcceptance.identity_photo_name}
                </div>
              </div>
            )}

            {/* Instrução de fechar */}
            <div className="mt-3 text-center text-white/70 text-xs">
              Click outside or press ESC to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IdentityPhotoVerificationCard;

