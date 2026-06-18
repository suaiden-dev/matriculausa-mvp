import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { countPagesFromFile, countPagesFromUrl } from '../lib/pdf-pages';
import {
  StripeIcon,
  ZelleIcon,
} from '../pages/StudentOnboarding/components/SelectionFeeStep/PaymentIcons';

const ParcelowBadge = ({ className }: { className?: string }) => {
  const [imgError, setImgError] = React.useState(false);
  return (
    <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden border border-gray-100`}>
      {imgError ? (
        <span className="text-[11px] font-black text-emerald-700 tracking-tighter">PARC</span>
      ) : (
        <img src="/parcelow_share.webp" alt="" onError={() => setImgError(true)} className="w-full h-full object-contain p-0.5" />
      )}
    </div>
  );
};

const DOC_TYPES = [
  { id: 'certified',      pricePerPage: 15, descKey: 'translationQuoteModal.docType_certified_desc' },
  { id: 'notarized',      pricePerPage: 20, descKey: 'translationQuoteModal.docType_notarized_desc' },
  { id: 'bank_statement', pricePerPage: 25, descKey: 'translationQuoteModal.docType_bank_statement_desc' },
] as const;
type DocType = typeof DOC_TYPES[number]['id'];
type PaymentMethod = 'stripe' | 'zelle' | 'parcelow';

const SOURCE_LANGUAGES = [
  'Português (Brasil)',
  'Espanhol (América Latina)',
  'Francês',
  'Outro',
];

const STRIPE_RATE = 0.039;
const STRIPE_FIXED = 0.30;

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export interface TranslationQuoteModalProps {
  open: boolean;
  uploadId?: string;
  storagePath?: string;
  file?: File;
  requestId?: string;
  fileName?: string;
  studentId: string;
  documentRequestUploadId?: string;
  rejectionOrigin?: boolean;
  disclaimerAccepted?: boolean;
  onDisclaimerAccepted?: (dontShowAgain: boolean) => void;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export const TranslationQuoteModal: React.FC<TranslationQuoteModalProps> = ({
  open,
  uploadId,
  storagePath,
  file,
  requestId,
  fileName,
  studentId,
  documentRequestUploadId,
  rejectionOrigin = false,
  disclaimerAccepted = true,
  onDisclaimerAccepted,
  onClose,
  onOrderCreated,
}) => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pages, setPages] = useState<number | null>(null);
  const [countingPages, setCountingPages] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState(SOURCE_LANGUAGES[0]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [docType, setDocType] = useState<DocType>('certified');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'configure' | 'disclaimer'>('configure');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [standaloneFile, setStandaloneFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const isStandaloneMode = !fileName && !file && !storagePath;
  const activeFile = standaloneFile || file || null;
  const activeFileName = fileName || standaloneFile?.name || '';

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setPages(null);
    setError(null);
    setFileError('');
    setSelectedMethod(null);
    setStep('configure');
    setDontShowAgain(false);
    setStandaloneFile(null);

    if (file) {
      setCountingPages(true);
      countPagesFromFile(file).then(n => setPages(n)).catch(() => setPages(1)).finally(() => setCountingPages(false));
    } else if (storagePath) {
      setCountingPages(true);
      supabase.storage.from('document-attachments').createSignedUrl(storagePath, 3600).then(({ data }) => {
        if (!data?.signedUrl) { setPages(1); return; }
        return countPagesFromUrl(data.signedUrl).then(n => setPages(n)).catch(() => setPages(1));
      }).finally(() => setCountingPages(false));
    }
  }, [open, file, storagePath]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFileError('');
    if (selected.size > 25 * 1024 * 1024) {
      setFileError('Arquivo muito grande (máx 25 MB)');
      return;
    }
    setStandaloneFile(selected);
    setPages(null);
    setCountingPages(true);
    try {
      const n = await countPagesFromFile(selected);
      setPages(n);
    } catch {
      setPages(1);
    } finally {
      setCountingPages(false);
    }
    e.target.value = '';
  };

  if (!open) return null;

  const pageCount = pages ?? 1;
  const pricePerPage = DOC_TYPES.find(d => d.id === docType)!.pricePerPage;
  const total = pageCount * pricePerPage;
  const stripeTotal = Math.round(((total + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100) / 100;
  const stripeFee = Math.round((stripeTotal - total) * 100) / 100;

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    if (!disclaimerAccepted) { setStep('disclaimer'); return; }
    await doSubmit();
  };

  const doSubmit = async () => {
    if (!selectedMethod) return;
    setSubmitting(true);
    setError(null);
    try {
      let finalStoragePath = storagePath || '';
      const finalFileName = fileName || standaloneFile?.name || '';

      if (!storagePath && standaloneFile) {
        const ext = standaloneFile.name.split('.').pop();
        const path = `translations/${studentId}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('document-attachments').upload(path, standaloneFile);
        if (uploadError) throw uploadError;
        finalStoragePath = uploadData.path;
      }

      const { data, error: insertError } = await supabase
        .from('translation_orders')
        .insert({
          user_id: studentId,
          upload_id: uploadId || null,
          document_request_id: requestId || null,
          document_request_upload_id: documentRequestUploadId || null,
          rejection_origin: rejectionOrigin,
          document_url: finalStoragePath,
          original_filename: finalFileName,
          document_type: docType,
          source_language: sourceLanguage,
          target_language: 'Inglês',
          original_document_type: 'other',
          page_count: pageCount,
          price_per_page: pricePerPage,
          total_price: total,
          status: 'pending',
          payment_method: selectedMethod,
          payment_status: 'unpaid',
          translation_status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (selectedMethod === 'stripe') {
        const baseUrl = window.location.origin;
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          'stripe-checkout-translation',
          {
            body: {
              translation_order_id: data.id,
              success_url: `${baseUrl}/student/dashboard/translations?payment=success&order=${data.id}`,
              cancel_url: `${baseUrl}/student/dashboard/translations?payment=cancelled`,
            },
          },
        );
        if (checkoutError || !checkoutData?.session_url) {
          throw new Error(checkoutError?.message || t('translationQuoteModal.errorFallback'));
        }
        window.location.href = checkoutData.session_url;
        return;
      }

      onOrderCreated(data.id);
      onClose();
      toast.success(
        (ti) => (
          <span>
            {t('translationsPage.orderConfirmed')}{' '}
            <button onClick={() => { toast.dismiss(ti.id); navigate('/student/dashboard/translations'); }} className="underline font-bold ml-1">→</button>
          </span>
        ),
        { duration: 6000 },
      );
    } catch (e: any) {
      setError(e.message || t('translationQuoteModal.errorFallback'));
      setStep('configure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisclaimerAccept = async () => {
    if (onDisclaimerAccepted) onDisclaimerAccepted(dontShowAgain);
    await doSubmit();
  };

  const canSubmit = selectedMethod && !submitting && !countingPages && (!isStandaloneMode || !!standaloneFile);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[95dvh] flex flex-col overflow-hidden shadow-2xl rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t('translationQuoteModal.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('translationQuoteModal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 'disclaimer' ? (
            <div className="p-5 space-y-5">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">{t('translationsPage.disclaimerTitle')}</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{t('translationsPage.disclaimerBody')}</p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={e => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f]"
                />
                <span className="text-sm text-gray-600">{t('translationsPage.disclaimerDontShowAgain')}</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setStep('configure')} disabled={submitting} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {t('translationsPage.disclaimerBack')}
                </button>
                <button onClick={handleDisclaimerAccept} disabled={submitting} className="flex-1 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? t('translationQuoteModal.processing') : t('translationsPage.disclaimerAccept')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">

              {/* File upload zone (standalone) or file info (pre-loaded) */}
              {isStandaloneMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Documento</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center transition hover:border-[#1e3a5f]/40 hover:bg-blue-50/30"
                  >
                    <Upload className="mb-2 h-6 w-6 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">
                      {standaloneFile ? standaloneFile.name : 'Clique para enviar o documento'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">PDF, DOCX, DOC, JPG, PNG — máx 25 MB</p>
                    {standaloneFile && (
                      <p className="mt-1 text-xs text-gray-400">{formatBytes(standaloneFile.size)}</p>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                  {fileError && <p className="mt-1.5 text-xs text-red-500">{fileError}</p>}
                  {standaloneFile && (
                    <button
                      type="button"
                      onClick={() => { setStandaloneFile(null); setPages(null); }}
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" /> Remover arquivo
                    </button>
                  )}
                </div>
              ) : (
                activeFileName && (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{activeFileName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {countingPages
                          ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Contando páginas...</span>
                          : t('translationQuoteModal.pageDetected', { count: pageCount })}
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Page count (standalone, after file selected) */}
              {isStandaloneMode && standaloneFile && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {countingPages
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Contando páginas...</>
                    : <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> {t('translationQuoteModal.pageDetected', { count: pageCount })}</>}
                </div>
              )}

              {/* Document type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('translationQuoteModal.documentType')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_TYPES.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDocType(d.id)}
                      className={`flex flex-col items-start rounded-xl border-2 p-3 text-left transition ${
                        docType === d.id
                          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className={`text-[11px] font-semibold leading-tight ${docType === d.id ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                        {t(`translationQuoteModal.docType_${d.id}`)}
                      </p>
                      <p className={`text-base font-bold mt-1.5 ${docType === d.id ? 'text-[#1e3a5f]' : 'text-gray-700'}`}>
                        ${d.pricePerPage}
                        <span className="text-[10px] font-normal text-gray-400">/pág</span>
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('translationQuoteModal.documentLanguage')}</label>
                <select
                  value={sourceLanguage}
                  onChange={e => setSourceLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                >
                  {SOURCE_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Price summary */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('translationQuoteModal.total')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{pageCount} pág × ${pricePerPage}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {countingPages ? '...' : `$${total.toFixed(2)}`}
                  </p>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('translationQuoteModal.paymentMethod')}</label>
                <div className="space-y-2">
                  {([
                    {
                      id: 'stripe' as const,
                      label: 'Cartão de crédito / débito',
                      note: `+$${stripeFee.toFixed(2)} taxa Stripe`,
                      amount: stripeTotal,
                      Icon: StripeIcon,
                    },
                    {
                      id: 'zelle' as const,
                      label: 'Zelle',
                      note: t('translationQuoteModal.zelleNoFeeNote') || 'Sem taxa',
                      amount: total,
                      Icon: ZelleIcon,
                    },
                    {
                      id: 'parcelow' as const,
                      label: 'Parcelow',
                      note: t('translationQuoteModal.parcelowInstallmentsNote') || '12× sem juros',
                      amount: total,
                      Icon: ParcelowBadge,
                    },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                        selectedMethod === m.id
                          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-100 shadow-sm shrink-0 overflow-hidden">
                        <m.Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.note}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">
                        {countingPages ? '...' : `$${m.amount.toFixed(2)}`}
                      </p>
                      {selectedMethod === m.id && (
                        <CheckCircle className="w-4 h-4 text-[#1e3a5f] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'configure' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="w-full px-4 py-3 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? t('translationQuoteModal.processing')
                : selectedMethod
                  ? t('translationQuoteModal.orderButton', { total: (selectedMethod === 'stripe' ? stripeTotal : total).toFixed(2) })
                  : 'Selecione um método de pagamento'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
