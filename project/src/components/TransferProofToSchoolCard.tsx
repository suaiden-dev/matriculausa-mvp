import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, FileText, ExternalLink } from 'lucide-react';

interface TransferProofToSchoolCardProps {
  applicationId: string;
  proofUrl?: string | null;
  proofAt?: string | null;
  proofStatus?: string | null;
  userId: string;
  onUploaded: () => void;
}

const BASE = 'studentDashboard.documentRequests.forms';

const TransferProofToSchoolCard: React.FC<TransferProofToSchoolCardProps> = ({
  applicationId,
  proofUrl,
  proofAt,
  proofStatus,
  userId,
  onUploaded,
}) => {
  const { t } = useTranslation('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, '_');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const sanitized = sanitizeFileName(file.name);
      const storagePath = `transfer-proof-to-school/${userId}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(storagePath);

      const fileUrl = publicData.publicUrl;

      const { error: dbError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_proof_to_school_url: fileUrl,
          transfer_proof_to_school_at: new Date().toISOString(),
          transfer_proof_to_school_status: 'submitted',
        })
        .eq('id', applicationId);

      if (dbError) throw dbError;

      onUploaded();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isSubmitted = proofStatus === 'submitted' || proofStatus === 'viewed';

  return (
    <div className="bg-white rounded-xl mb-3 max-w-3xl mx-auto p-4 sm:p-6 outline outline-1 outline-slate-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {t(`${BASE}.transferProofToSchool.title`) || 'Comprovante de Envio para Escola Atual'}
          </h3>
          <p className="text-sm text-slate-600">
            {t(`${BASE}.transferProofToSchool.description`) || 'Você já enviou o Transfer Form para sua escola atual? Anexe o comprovante.'}
          </p>
        </div>
      </div>

      {isSubmitted && proofUrl ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 outline outline-1 outline-green-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-semibold text-sm">
                {t(`${BASE}.transferProofToSchool.submitted`) || 'Comprovante enviado'}
              </p>
              {proofAt && (
                <p className="text-green-700 text-xs mt-0.5">
                  {t(`${BASE}.transferProofToSchool.submittedAt`) || 'Enviado em'}{' '}
                  {new Date(proofAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>

          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            {t(`${BASE}.transferProofToSchool.viewProof`) || 'Visualizar Comprovante'}
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-700 hover:bg-indigo-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {uploading
              ? (t(`${BASE}.uploading`) || 'Enviando...')
              : (t(`${BASE}.transferProofToSchool.uploadButton`) || 'Anexar Comprovante')}
          </button>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TransferProofToSchoolCard;
