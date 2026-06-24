import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Upload, Loader2, AlertCircle, CheckCircle, Copy, Check, Clock } from 'lucide-react';
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
  { id: 'certified', label: 'Tradução Certificada', pricePerPage: 15, bankSurcharge: 10 },
  { id: 'notarized', label: 'Tradução Juramentada', pricePerPage: 25, bankSurcharge: 5 },
] as const;
type DocType = 'certified' | 'notarized';
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

function getFileNameFromUrl(url: string): string {
  const withoutQuery = url.split('?')[0];
  const parts = withoutQuery.split('/');
  return decodeURIComponent(parts[parts.length - 1]).replace(/^\d+_/, '');
}

export interface BatchUpload {
  id: string;
  file_url: string;
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
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  /** Resume an existing Zelle unpaid order — skips configure and goes straight to proof upload */
  resumeOrderId?: string;
  resumeAmount?: number;
  /** Batch mode: multiple uploads from the same document_request */
  batchUploads?: BatchUpload[];
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
  onClose,
  onOrderCreated,
  resumeOrderId,
  resumeAmount,
  batchUploads,
}) => {
  const { t } = useTranslation(['dashboard', 'payment']);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pages, setPages] = useState<number | null>(null);
  const [countingPages, setCountingPages] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState(SOURCE_LANGUAGES[0]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [docType, setDocType] = useState<DocType>('certified');
  const [isBankStatement, setIsBankStatement] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'batch-select' | 'configure' | 'zelle-payment' | 'zelle-sent'>('configure');
  const [standaloneFile, setStandaloneFile] = useState<File | null>(null);
  const [zelleFile, setZelleFile] = useState<File | null>(null);
  const [zelleOrderId, setZelleOrderId] = useState<string | null>(null);
  const [zelleOrderIds, setZelleOrderIds] = useState<string[]>([]);
  const zelleFileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkedRequestId, setLinkedRequestId] = useState<string>('');
  const [availableRequests, setAvailableRequests] = useState<Array<{
    id: string;
    title: string;
    context: string;
  }>>([]);

  const [cpfInput, setCpfInput] = useState('');

  // Batch state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchConfig, setBatchConfig] = useState<Record<string, {
    docType: DocType;
    isBankStatement: boolean;
    pageCount: number;
  }>>({});
  const [batchSourceLanguage, setBatchSourceLanguage] = useState(SOURCE_LANGUAGES[0]);
  const [batchCountingIds, setBatchCountingIds] = useState<Set<string>>(new Set());

  const isBatchMode = !!batchUploads?.length;
  const isStandaloneMode = !fileName && !file && !storagePath && !isBatchMode;
  const activeFile = standaloneFile || file || null;
  const activeFileName = fileName || standaloneFile?.name || '';

  // Pre-fill CPF from profile
  useEffect(() => {
    if (!open || !studentId) return;
    supabase.from('user_profiles').select('cpf_document').eq('user_id', studentId).single()
      .then(({ data }) => { if (data?.cpf_document) setCpfInput(data.cpf_document); });
  }, [open, studentId]);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setPages(null);
    setError(null);
    setFileError('');
    setSelectedMethod(null);
    setStandaloneFile(null);
    setZelleFile(null);
    setLinkedRequestId('');
    setIsBankStatement(false);
    setZelleOrderIds([]);

    if (batchUploads?.length) {
      setSelectedIds(new Set(batchUploads.map(u => u.id)));
      const initConfig: Record<string, { docType: DocType; isBankStatement: boolean; pageCount: number }> = {};
      for (const u of batchUploads) {
        initConfig[u.id] = { docType: 'certified', isBankStatement: false, pageCount: 1 };
      }
      setBatchConfig(initConfig);
      setBatchSourceLanguage(SOURCE_LANGUAGES[0]);
      setZelleOrderId(null);
      setStep('batch-select');

      const counting = new Set(batchUploads.map(u => u.id));
      setBatchCountingIds(counting);

      for (const u of batchUploads) {
        supabase.storage.from('document-attachments').createSignedUrl(u.file_url, 3600).then(({ data }) => {
          if (!data?.signedUrl) {
            setBatchCountingIds(prev => {
              const next = new Set(prev);
              next.delete(u.id);
              return next;
            });
            return;
          }
          return countPagesFromUrl(data.signedUrl)
            .then(n => {
              setBatchConfig(prev => {
                if (!prev[u.id]) return prev;
                return {
                  ...prev,
                  [u.id]: {
                    ...prev[u.id],
                    pageCount: n
                  }
                };
              });
            })
            .catch((err) => {
              console.error(`[TranslationQuoteModal] Error counting pages for upload ${u.id}:`, err);
            })
            .finally(() => {
              setBatchCountingIds(prev => {
                const next = new Set(prev);
                next.delete(u.id);
                return next;
              });
            });
        });
      }
      return;
    }

    if (resumeOrderId) {
      setZelleOrderId(resumeOrderId);
      setStep('zelle-payment');
    } else {
      setZelleOrderId(null);
      setStep('configure');
    }

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
  }, [open, file, storagePath, resumeOrderId, batchUploads]);

  // Fetch document requests for the student (only in standalone mode)
  useEffect(() => {
    if (!open || !studentId) return;

    const fetchRequests = async () => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', studentId)
        .maybeSingle();

      if (!profile?.id) return;

      const { data: apps } = await supabase
        .from('scholarship_applications')
        .select('id, student_process_type, scholarships(title, university_id, level)')
        .eq('student_id', profile.id)
        .neq('status', 'rejected');

      const appIds = (apps || []).map((a: any) => a.id);
      const items: Array<{ id: string; title: string; context: string }> = [];

      if (appIds.length > 0) {
        const { data: appReqs } = await supabase
          .from('document_requests')
          .select('id, title, scholarship_application_id')
          .in('scholarship_application_id', appIds)
          .neq('status', 'closed');

        (appReqs || []).forEach((r: any) => {
          const app = (apps || []).find((a: any) => a.id === r.scholarship_application_id);
          const scholarship = Array.isArray(app?.scholarships) ? app.scholarships[0] : app?.scholarships;
          items.push({ id: r.id, title: r.title, context: scholarship?.title || 'Bolsa' });
        });
      }

      const universityIds = [...new Set((apps || []).flatMap((a: any) => {
        const s = Array.isArray(a.scholarships) ? a.scholarships[0] : a.scholarships;
        return s?.university_id ? [s.university_id] : [];
      }))];
      const studentProcessTypes = [...new Set((apps || []).map((a: any) => a.student_process_type).filter(Boolean))];

      if (universityIds.length > 0) {
        const uniFilter = universityIds.map((id: string) => `university_id.eq.${id}`).join(',') + ',university_id.is.null';
        const { data: globalReqs } = await supabase
          .from('document_requests')
          .select('id, title, applicable_student_types')
          .eq('is_global', true)
          .or(uniFilter)
          .neq('status', 'closed');

        (globalReqs || []).forEach((r: any) => {
          const types: string[] = r.applicable_student_types || [];
          if (types.length === 0) return;
          if (studentProcessTypes.length > 0) {
            const passes = studentProcessTypes.some((t: string) => types.includes(t) || types.includes('all'));
            if (!passes) return;
          }
          items.push({ id: r.id, title: r.title, context: 'Global' });
        });
      }

      setAvailableRequests(items);
    };

    fetchRequests();
  }, [open, studentId]);

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
  const selectedDocType = DOC_TYPES.find(d => d.id === docType)!;
  const pricePerPage = selectedDocType.pricePerPage + (isBankStatement === true ? selectedDocType.bankSurcharge : 0);
  const total = pageCount * pricePerPage;
  const stripeTotal = Math.round(((total + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100) / 100;
  const stripeFee = Math.round((stripeTotal - total) * 100) / 100;

  // Batch totals
  const batchTotal = (() => {
    if (!isBatchMode) return 0;
    return [...selectedIds].reduce((sum, id) => {
      const cfg = batchConfig[id];
      if (!cfg) return sum;
      const dt = DOC_TYPES.find(d => d.id === cfg.docType)!;
      return sum + cfg.pageCount * (dt.pricePerPage + (cfg.isBankStatement ? dt.bankSurcharge : 0));
    }, 0);
  })();
  const batchStripeTotal = Math.round(((batchTotal + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100) / 100;
  const batchStripeFee = Math.round((batchStripeTotal - batchTotal) * 100) / 100;

  const effectiveAmount = resumeAmount ?? (isBatchMode ? batchTotal : total);

  const isAnySelectedCounting = isBatchMode && [...selectedIds].some(id => batchCountingIds.has(id));

  const cpfValid = selectedMethod !== 'parcelow' || cpfInput.replace(/\D/g, '').length >= 11;
  const canSubmit = isBatchMode
    ? (selectedMethod !== null && !submitting && !isAnySelectedCounting && cpfValid)
    : (selectedMethod && !submitting && !countingPages && (!isStandaloneMode || !!standaloneFile) && isBankStatement !== null && cpfValid);

  const saveCpfIfNeeded = async () => {
    if (selectedMethod !== 'parcelow') return;
    const clean = cpfInput.replace(/\D/g, '');
    if (clean.length >= 11) {
      await supabase.from('user_profiles').update({ cpf_document: cpfInput }).eq('user_id', studentId);
    }
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    await saveCpfIfNeeded();
    await doSubmit();
  };

  const doSubmitBatch = async () => {
    if (!selectedMethod) return;
    await saveCpfIfNeeded();
    setSubmitting(true);
    setError(null);
    try {
      const selected = (batchUploads || []).filter(u => selectedIds.has(u.id));
      const createdIds: string[] = [];

      for (const upload of selected) {
        const cfg = batchConfig[upload.id];
        const dt = DOC_TYPES.find(d => d.id === cfg.docType)!;
        const ppp = dt.pricePerPage + (cfg.isBankStatement ? dt.bankSurcharge : 0);
        const orderTotal = cfg.pageCount * ppp;

        const { data, error: insertErr } = await supabase
          .from('translation_orders')
          .insert({
            user_id: studentId,
            document_request_id: requestId || null,
            document_request_upload_id: upload.id,
            rejection_origin: true,
            document_url: upload.file_url,
            original_filename: getFileNameFromUrl(upload.file_url),
            document_type: cfg.docType,
            original_document_type: cfg.docType,
            is_bank_statement: cfg.isBankStatement,
            source_language: batchSourceLanguage,
            target_language: 'Inglês',
            page_count: cfg.pageCount,
            price_per_page: ppp,
            total_price: orderTotal,
            status: 'pending',
            payment_method: selectedMethod,
            payment_status: 'unpaid',
            translation_status: 'pending',
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        createdIds.push(data.id);
      }

      if (selectedMethod === 'zelle') {
        setZelleOrderIds(createdIds);
        setStep('zelle-payment');
        setSubmitting(false);
        return;
      }

      if (selectedMethod === 'stripe') {
        const baseUrl = window.location.origin;
        const { data: checkout, error: checkoutErr } = await supabase.functions.invoke(
          'stripe-checkout-translation-batch',
          {
            body: {
              translation_order_ids: createdIds,
              success_url: `${baseUrl}/student/dashboard/translations?payment=success`,
              cancel_url: `${baseUrl}/student/dashboard/translations?payment=cancelled`,
            },
          }
        );
        if (checkoutErr || !checkout?.session_url) throw new Error(checkoutErr?.message || t('translationQuoteModal.errorFallback'));
        window.location.href = checkout.session_url;
        return;
      }

      if (selectedMethod === 'parcelow') {
        const { data: checkout, error: checkoutErr } = await supabase.functions.invoke(
          'parcelow-checkout-translation-batch',
          { body: { translation_order_ids: createdIds, amount: batchTotal } }
        );
        if (checkoutErr || !checkout?.checkout_url) throw new Error(checkoutErr?.message || t('translationQuoteModal.errorFallback'));
        window.location.href = checkout.checkout_url;
        return;
      }
    } catch (e: any) {
      setError(e.message || t('translationQuoteModal.errorFallback'));
      setStep('configure');
    } finally {
      setSubmitting(false);
    }
  };

  const doSubmit = async () => {
    if (isBatchMode) { await doSubmitBatch(); return; }
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
          document_request_id: requestId || linkedRequestId || null,
          document_request_upload_id: documentRequestUploadId || null,
          rejection_origin: rejectionOrigin,
          document_url: finalStoragePath,
          original_filename: finalFileName,
          document_type: docType,
          original_document_type: docType,
          is_bank_statement: isBankStatement === true,
          source_language: sourceLanguage,
          target_language: 'Inglês',
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

      if (selectedMethod === 'zelle') {
        setZelleOrderId(data.id);
        setStep('zelle-payment');
        setSubmitting(false);
        return;
      }

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

      if (selectedMethod === 'parcelow') {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          'parcelow-checkout-translation',
          { body: { translation_order_id: data.id, amount: total } },
        );
        if (checkoutError || !checkoutData?.checkout_url) {
          throw new Error(checkoutError?.message || t('translationQuoteModal.errorFallback'));
        }
        window.location.href = checkoutData.checkout_url;
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

  const copyEmail = () => {
    navigator.clipboard.writeText('pay@matriculausa.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZelleBack = async () => {
    if (resumeOrderId) { onClose(); return; }
    if (isBatchMode && zelleOrderIds.length > 0) {
      for (const id of zelleOrderIds) {
        await supabase.from('translation_orders').delete().eq('id', id);
      }
      setZelleOrderIds([]);
    } else if (zelleOrderId) {
      await supabase.from('translation_orders').delete().eq('id', zelleOrderId);
    }
    setZelleOrderId(null);
    setZelleFile(null);
    setError(null);
    setStep('configure');
  };

  const handleZelleSubmit = async () => {
    const effectiveOrderIds = isBatchMode ? zelleOrderIds : (zelleOrderId ? [zelleOrderId] : []);
    if (!zelleFile || effectiveOrderIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const ext = zelleFile.name.split('.').pop() || 'jpg';
      const filePath = `zelle-payments/${studentId}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, zelleFile);
      if (uploadError) throw uploadError;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const imageUrl = `${supabaseUrl}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;

      const primaryOrderId = effectiveOrderIds[0];

      const { error: fnError } = await supabase.functions.invoke('create-zelle-payment', {
        body: {
          fee_type: 'translation',
          amount: effectiveAmount,
          comprovante_url: imageUrl,
          metadata: {
            translation_order_id: primaryOrderId,
            ...(effectiveOrderIds.length > 1 && { batch_order_ids: effectiveOrderIds.join(',') }),
          },
        },
      });
      if (fnError) throw fnError;

      for (const orderId of effectiveOrderIds) {
        await supabase
          .from('translation_orders')
          .update({ payment_reference: imageUrl })
          .eq('id', orderId);
      }

      setStep('zelle-sent');
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar comprovante.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (step === 'zelle-payment') {
      if (isBatchMode && zelleOrderIds.length > 0) {
        try {
          for (const id of zelleOrderIds) {
            await supabase.from('translation_orders').delete().eq('id', id);
          }
        } catch (err) {
          console.error('Error deleting batch orders on close:', err);
        }
      } else if (zelleOrderId && !resumeOrderId) {
        try {
          await supabase.from('translation_orders').delete().eq('id', zelleOrderId);
        } catch (err) {
          console.error('Error deleting unpaid order on close:', err);
        }
      }
    }
    onClose();
  };

  const footerAmount = isBatchMode
    ? (selectedMethod === 'stripe' ? batchStripeTotal : batchTotal)
    : (selectedMethod === 'stripe' ? stripeTotal : total);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:rounded-2xl sm:max-w-4xl max-h-[95dvh] flex flex-col overflow-hidden shadow-2xl rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {step === 'batch-select'
                ? 'Selecionar documentos'
                : step === 'zelle-payment' || step === 'zelle-sent'
                ? 'Pagamento via Zelle'
                : t('translationQuoteModal.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'batch-select'
                ? 'Configure e selecione os documentos a traduzir'
                : step === 'zelle-payment'
                ? 'Envie o comprovante para confirmar sua tradução'
                : step === 'zelle-sent'
                ? 'Comprovante recebido!'
                : t('translationQuoteModal.subtitle')}
            </p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── BATCH SELECT step ── */}
          {step === 'batch-select' && (
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-500">Selecione os documentos que deseja traduzir e configure cada um.</p>

              <div className="space-y-2">
                {(batchUploads || []).map(upload => {
                  const cfg = batchConfig[upload.id];
                  const isSelected = selectedIds.has(upload.id);
                  const dt = cfg ? DOC_TYPES.find(d => d.id === cfg.docType)! : DOC_TYPES[0];
                  const ppp = cfg ? dt.pricePerPage + (cfg.isBankStatement ? dt.bankSurcharge : 0) : 0;
                  const price = cfg ? cfg.pageCount * ppp : 0;
                  const fName = getFileNameFromUrl(upload.file_url);

                  return (
                    <div
                      key={upload.id}
                      className={`rounded-xl border p-4 transition-all duration-200 ${
                        isSelected 
                          ? 'border-[#1e3a5f]/20 bg-[#1e3a5f]/[0.02] shadow-sm' 
                          : 'border-gray-100 bg-white hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Left: Checkbox + Filename + Price */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(upload.id);
                              else next.delete(upload.id);
                              setSelectedIds(next);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] shrink-0 cursor-pointer focus:ring-[#1e3a5f]/20"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700 truncate" title={fName}>{fName}</p>
                          </div>
                          {isSelected && (
                            <span className="text-sm font-bold text-[#1e3a5f] shrink-0 md:hidden">
                              ${price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Right: Configs (visible only if selected) */}
                        {isSelected && cfg && (
                          <div className="flex flex-wrap items-center gap-4 shrink-0 ml-7 md:ml-0">
                            {/* Segmented Control for Doc Type */}
                            <div className="flex p-0.5 rounded-lg bg-gray-100/80 border border-gray-200/30">
                              {DOC_TYPES.map(d => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => setBatchConfig(prev => ({ ...prev, [upload.id]: { ...prev[upload.id], docType: d.id } }))}
                                  className={`py-1 px-2.5 rounded-md text-[11px] font-semibold transition-all ${
                                    cfg.docType === d.id
                                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                                      : 'text-gray-500 hover:text-gray-800'
                                  }`}
                                >
                                  {d.id === 'certified' ? 'Certificada' : 'Juramentada'} (${d.pricePerPage}/pág)
                                </button>
                              ))}
                            </div>

                            {/* Extrato? (Pills) */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-gray-400">Extrato?</span>
                              <div className="flex p-0.5 rounded-lg bg-gray-100/80 border border-gray-200/30">
                                <button
                                  type="button"
                                  onClick={() => setBatchConfig(prev => ({ ...prev, [upload.id]: { ...prev[upload.id], isBankStatement: true } }))}
                                  className={`py-0.5 px-2 rounded-md text-[10px] font-bold transition-all ${
                                    cfg.isBankStatement
                                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                                      : 'text-gray-500 hover:text-gray-800'
                                  }`}
                                >Sim</button>
                                <button
                                  type="button"
                                  onClick={() => setBatchConfig(prev => ({ ...prev, [upload.id]: { ...prev[upload.id], isBankStatement: false } }))}
                                  className={`py-0.5 px-2 rounded-md text-[10px] font-bold transition-all ${
                                    !cfg.isBankStatement
                                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                                      : 'text-gray-500 hover:text-gray-800'
                                  }`}
                                >Não</button>
                              </div>
                            </div>

                            {/* Pages */}
                            <div className="flex items-center gap-1 min-w-[70px] justify-end">
                              <span className="text-[11px] text-gray-400">Páginas:</span>
                              {batchCountingIds.has(upload.id) ? (
                                <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  ...
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-gray-700">{cfg.pageCount}</span>
                              )}
                            </div>

                            {/* Price (Desktop only) */}
                            <span className="text-sm font-bold text-[#1e3a5f] shrink-0 min-w-[50px] text-right hidden md:inline">
                              ${price.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Source language */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Idioma dos documentos</label>
                <select
                  value={batchSourceLanguage}
                  onChange={e => setBatchSourceLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                >
                  {SOURCE_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Subtotal */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Subtotal</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedIds.size} {selectedIds.size === 1 ? 'documento' : 'documentos'} selecionado{selectedIds.size !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">${batchTotal.toFixed(2)}</p>
              </div>
            </div>
          )}

          {step === 'configure' ? (
            <div className="p-4 space-y-4">

              {/* Batch mode: show compact summary at top */}
              {isBatchMode && (
                <div className="flex items-center gap-3 rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e3a5f]">
                      {selectedIds.size} {selectedIds.size === 1 ? 'documento' : 'documentos'} selecionado{selectedIds.size !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Idioma: {batchSourceLanguage}</p>
                  </div>
                  <p className="text-xl font-bold text-[#1e3a5f]">${batchTotal.toFixed(2)}</p>
                </div>
              )}

              {/* File upload zone (standalone only) */}
              {!isBatchMode && isStandaloneMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Documento</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-center transition hover:border-[#1e3a5f]/40 hover:bg-blue-50/30"
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
              )}

              {/* File info (pre-loaded, single mode) */}
              {!isBatchMode && !isStandaloneMode && activeFileName && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{activeFileName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {countingPages
                        ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Contando páginas...</span>
                        : t('translationQuoteModal.pageDetected', { count: pageCount })}
                    </p>
                  </div>
                </div>
              )}

              {/* Page count (standalone, after file selected) */}
              {!isBatchMode && isStandaloneMode && standaloneFile && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {countingPages
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Contando páginas...</>
                    : <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> {t('translationQuoteModal.pageDetected', { count: pageCount })}</>}
                </div>
              )}

              {/* Document type (single mode only) */}
              {!isBatchMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('translationQuoteModal.documentType')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DOC_TYPES.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDocType(d.id)}
                        className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 text-left transition ${
                          docType === d.id
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-xs font-semibold leading-tight ${docType === d.id ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                          {d.label}
                        </p>
                        <p className={`text-sm font-bold ml-2 shrink-0 ${docType === d.id ? 'text-[#1e3a5f]' : 'text-gray-600'}`}>
                          ${d.pricePerPage}<span className="text-[10px] font-normal text-gray-400">/pág</span>
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2.5">
                    <p className="text-xs font-medium text-gray-700 mb-1.5">
                      É um extrato bancário?
                      <span className="ml-1 text-gray-400 font-normal">
                        (se sim: +${selectedDocType.bankSurcharge}/pág)
                      </span>
                      {isBankStatement === null && (
                        <span className="ml-1.5 text-red-400 text-[11px]">* obrigatório</span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBankStatement(true)}
                        className={`flex-1 py-1.5 rounded-lg border-2 text-sm font-semibold transition ${
                          isBankStatement === true
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBankStatement(false)}
                        className={`flex-1 py-1.5 rounded-lg border-2 text-sm font-semibold transition ${
                          isBankStatement === false
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Source language (single mode only) */}
              {!isBatchMode && (
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
              )}

              {/* Link to document request (single standalone only) */}
              {!isBatchMode && !requestId && !documentRequestUploadId && availableRequests.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vincular a um pedido de documento
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                    Quando a tradução for entregue, o documento traduzido será enviado automaticamente para o pedido selecionado.
                  </p>
                  <select
                    value={linkedRequestId}
                    onChange={e => setLinkedRequestId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  >
                    <option value="">Não vincular</option>
                    {availableRequests.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.context} · {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price summary (single mode only) */}
              {!isBatchMode && (
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
              )}

              {/* Payment method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('translationQuoteModal.paymentMethod')}</label>
                <div className="space-y-1.5">
                  {([
                    {
                      id: 'stripe' as const,
                      label: 'Cartão de crédito / débito',
                      note: `+$${(isBatchMode ? batchStripeFee : stripeFee).toFixed(2)} taxa Stripe`,
                      amount: isBatchMode ? batchStripeTotal : stripeTotal,
                      Icon: StripeIcon,
                    },
                    {
                      id: 'zelle' as const,
                      label: 'Zelle',
                      note: t('translationQuoteModal.zelleNoFeeNote') || 'Sem taxa',
                      amount: isBatchMode ? batchTotal : total,
                      Icon: ZelleIcon,
                    },
                    // Parcelow temporariamente desabilitado — sandbox com problemas
                    // {
                    //   id: 'parcelow' as const,
                    //   label: 'Parcelow',
                    //   note: t('translationQuoteModal.parcelowInstallmentsNote') || '12× sem juros',
                    //   amount: isBatchMode ? batchTotal : total,
                    //   Icon: ParcelowBadge,
                    // },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-left transition ${
                        selectedMethod === m.id
                          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-100 shadow-sm shrink-0 overflow-hidden">
                        <m.Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900">{m.label}</p>
                        <p className="text-[11px] text-gray-400 leading-tight">{m.note}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">
                        {(isBatchMode ? false : countingPages) ? '...' : `$${m.amount.toFixed(2)}`}
                      </p>
                      {selectedMethod === m.id && (
                        <CheckCircle className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod === 'parcelow' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">CPF <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={cpfInput}
                    onChange={e => setCpfInput(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                  />
                  <p className="text-[11px] text-gray-400">Necessário para pagamento parcelado</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          ) : null}

          {/* ── ZELLE PAYMENT step ── */}
          {step === 'zelle-payment' && (
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">
                  1 — Realize a transferência do valor para o destinatário informado abaixo.
                </p>
                <p className="text-sm text-gray-500">
                  2 — Envie o comprovante da sua transferência no campo de upload abaixo.{' '}
                  <span className="text-red-500 font-bold">*</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600">Email do Destinatário</p>
                  <div className="flex items-center justify-between gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-mono font-bold text-gray-800 truncate">pay@matriculausa.com</span>
                    <div className="relative shrink-0">
                      <button
                        onClick={copyEmail}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#1e3a5f]"
                        title="Copiar email"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {copied && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap">
                          Copiado!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600">Valor do Pagamento</p>
                  <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                    <span className="text-sm font-black text-gray-900">${effectiveAmount.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              <div className="border border-red-400 bg-red-50 rounded-xl px-3 py-2.5">
                <p className="text-sm font-semibold text-red-700">Importante:</p>
                <p className="text-sm text-red-700 mt-0.5">
                  <span className="font-bold">*</span> O envio do comprovante é obrigatório e necessário para dar continuidade à sua tradução.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Comprovante de pagamento <span className="text-red-500">*</span>
                </p>
                <div
                  onClick={() => zelleFileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                    zelleFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-[#1e3a5f] hover:bg-gray-50'
                  }`}
                >
                  {zelleFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium truncate max-w-[220px]">{zelleFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-sm text-gray-500">Arraste ou clique para selecionar</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP — máx 10 MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={zelleFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 10 * 1024 * 1024) setZelleFile(f);
                    e.target.value = '';
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── ZELLE SENT step ── */}
          {step === 'zelle-sent' && (
            <div className="p-6 flex flex-col items-center text-center gap-4 py-10 bg-gradient-to-br from-amber-50/30 to-orange-50/10">
              <div className="relative w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-200 shadow-inner">
                <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-black text-amber-800 uppercase tracking-tight">
                  {t('payment:zelleWaiting.messages.under_review') || 'Processando Pagamento'}
                </p>
                <p className="text-sm text-amber-700/90 font-medium leading-relaxed max-w-xs mt-2 mx-auto">
                  {t('payment:zelleWaiting.details.under_review') || 'Seu comprovante foi recebido e está em análise. Nossa equipe o revisará em breve.'}
                </p>
              </div>
              <div className="flex justify-center space-x-1.5 mt-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        {/* ── Footers ── */}
        {step === 'batch-select' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setStep('configure')}
              disabled={selectedIds.size === 0 || isAnySelectedCounting}
              className="w-full px-4 py-3 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAnySelectedCounting 
                ? 'Contando páginas...' 
                : `Continuar (${selectedIds.size} ${selectedIds.size === 1 ? 'documento' : 'documentos'}) →`}
            </button>
          </div>
        )}

        {step === 'configure' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            {isBatchMode && (
              <button
                onClick={() => setStep('batch-select')}
                disabled={submitting}
                className="w-full mb-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ← Voltar
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="w-full px-4 py-3 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? t('translationQuoteModal.processing')
                : selectedMethod
                  ? t('translationQuoteModal.orderButton', { total: footerAmount.toFixed(2) })
                  : 'Selecione um método de pagamento'}
            </button>
          </div>
        )}

        {step === 'zelle-payment' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-2">
            {!resumeOrderId && (
              <button
                onClick={handleZelleBack}
                disabled={submitting}
                className="px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ← Voltar
              </button>
            )}
            <button
              onClick={handleZelleSubmit}
              disabled={!zelleFile || submitting}
              className="flex-1 px-4 py-3 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Enviando...' : 'Confirmar Pagamento →'}
            </button>
          </div>
        )}

        {step === 'zelle-sent' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
