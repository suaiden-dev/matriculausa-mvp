import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Languages, Plus, Clock, Loader2, FileDown, Download, X, RefreshCw, Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { TranslationQuoteModal } from '../../components/TranslationQuoteModal';

const DOC_TYPE_LABELS: Record<string, string> = {
  certified: 'translationQuoteModal.docType_certified',
  notarized: 'translationQuoteModal.docType_notarized',
};

interface TranslationOrder {
  id: string;
  original_filename: string;
  document_type: string;
  source_language: string;
  target_language: string;
  page_count: number;
  price_per_page: number;
  total_price: number;
  payment_method: string;
  payment_status: string;
  translation_status: string;
  created_at: string;
  certified_file_url?: string | null;
  document_request_upload_id?: string | null;
  amount_paid?: number | null;
  is_bank_statement?: boolean | null;
  alpha_project_number?: number | null;
  payment_reference?: string | null;
}

interface PendingTranslationUpload {
  id: string;
  file_url: string;
  reviewed_at: string | null;
  document_request_id: string | null;
  document_requests: { title: string } | null;
}

interface ModalState {
  open: boolean;
  uploadId?: string;
  storagePath?: string;
  fileName?: string;
  file?: File;
  requestId?: string;
  documentRequestUploadId?: string;
  rejectionOrigin?: boolean;
  resumeOrderId?: string;
  resumeAmount?: number;
}

function getFileName(url: string): string {
  const parts = url.split('/');
  return decodeURIComponent(parts[parts.length - 1]);
}

function cleanFileName(url: string): string {
  return getFileName(url).replace(/^\d+_/, '');
}

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function displayAmount(o: TranslationOrder): { total: number; showFee: boolean } {
  if (o.amount_paid) return { total: o.amount_paid, showFee: o.amount_paid !== o.total_price };
  return { total: o.total_price, showFee: false };
}

// ── Certified file helpers ────────────────────────────────────────────────────

function fileType(name: string): 'pdf' | 'image' | 'other' {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'other';
}

async function triggerDownload(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ── Certified file modal (Lush-style) ─────────────────────────────────────────

function CertModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const kind = fileType(name);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await triggerDownload(url, name);
    setDownloading(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileDown className="h-4 w-4 shrink-0 text-green-600" />
            <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? '…' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 min-h-0">
          {kind === 'pdf' && (
            <iframe src={url} title={name} className="w-full h-full min-h-[70vh] border-0" />
          )}
          {kind === 'image' && (
            <div className="flex items-center justify-center p-4 min-h-[50vh]">
              <img
                src={url}
                alt={name}
                className="max-w-full max-h-[75vh] rounded-lg object-contain shadow"
              />
            </div>
          )}
          {kind === 'other' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
              <FileDown className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Preview não disponível para este tipo de arquivo.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const BADGE = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200';

// Alpha translation_status raw values: "N/A", "Em Análise", "Rascunho", "Finalizado", "Cancelado"
function translationLabel(status: string, t: (k: string) => string): string {
  const s = (status || '').toLowerCase().trim();
  if (s === 'finalizado' || s === 'completed') return t('translationsPage.statusCompleted') || 'Concluído';
  if (s === 'cancelado' || s === 'cancelled') return t('translationsPage.statusCancelled') || 'Cancelado';
  if (s === 'n/a' || s === 'em análise' || s === 'em analise' || s === 'rascunho')
    return t('translationsPage.statusSent') || 'Enviado';
  if (s) return t('translationsPage.statusInProgress') || 'Em Tradução';
  return '—';
}

// ── Payment cell: badge + Stripe retry if needed ──────────────────────────────

function PaymentCell({ order, t, onZelleProof }: {
  order: TranslationOrder;
  t: (k: string) => string;
  onZelleProof?: (orderId: string, amount: number) => void;
}) {
  const isPaid = order.payment_status === 'paid';
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const baseUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('stripe-checkout-translation', {
        body: {
          translation_order_id: order.id,
          success_url: `${baseUrl}/student/dashboard/translations?payment=success&order=${order.id}`,
          cancel_url: `${baseUrl}/student/dashboard/translations?payment=cancelled`,
        },
      });
      if (error || !data?.session_url) throw new Error(error?.message || 'Erro');
      window.location.href = data.session_url;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao iniciar pagamento');
      setLoading(false);
    }
  };

  if (isPaid) return <span className={BADGE}>{t('translationsPage.paid') || 'Pago'}</span>;

  return (
    <div className="flex flex-col gap-1.5">
      <span className={BADGE}>{t('translationsPage.unpaid') || 'Não pago'}</span>
      {order.payment_method === 'stripe' && (
        <button
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e3a5f] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {loading ? '…' : t('translationsPage.payWithCard') || 'Pagar com Cartão →'}
        </button>
      )}
      {order.payment_method === 'zelle' && onZelleProof && (
        <button
          onClick={() => onZelleProof(order.id, order.total_price)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e3a5f] hover:underline"
        >
          <Upload className="w-3 h-3" />
          Enviar Comprovante →
        </button>
      )}
    </div>
  );
}

// ── Translation cell: badge + "Ver documento" when file is ready ──────────────

function TranslationCell({
  order,
  t,
  onView,
}: {
  order: TranslationOrder;
  t: (k: string) => string;
  onView: (url: string, name: string) => void;
}) {
  if (order.payment_status !== 'paid') return null;

  const hasCert = !!order.certified_file_url;
  const certName = hasCert ? getFileName(order.certified_file_url!) : '';

  return (
    <div className="flex flex-col gap-1.5">
      <span className={BADGE}>{translationLabel(order.translation_status, t)}</span>
      {hasCert && (
        <button
          onClick={() => onView(order.certified_file_url!, certName)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 hover:underline"
        >
          <FileDown className="w-3 h-3 shrink-0" />
          {t('translationsPage.viewDocument') || 'Ver documento →'}
        </button>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-5">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-44 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-60 animate-pulse rounded bg-gray-50" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-md bg-gray-100" />
          <div className="hidden md:block h-6 w-16 animate-pulse rounded-md bg-gray-100" />
          <div className="hidden md:block h-3 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-12 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const Translations: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'payment']);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [orders, setOrders] = useState<TranslationOrder[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingTranslationUpload[]>([]);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quoteModal, setQuoteModal] = useState<ModalState>({ open: false });
  const [certModal, setCertModal] = useState<{ url: string; name: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('translation_orders')
      .select(
        'id,original_filename,document_type,is_bank_statement,source_language,target_language,page_count,price_per_page,total_price,payment_method,payment_status,translation_status,created_at,certified_file_url,document_request_upload_id,amount_paid,alpha_project_number,payment_reference'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, [user?.id]);

  const fetchPendingUploads = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('document_request_uploads')
      .select('id,file_url,reviewed_at,document_request_id,document_requests(title)')
      .eq('uploaded_by', user.id)
      .eq('needs_translation', true)
      .eq('status', 'rejected');
    setPendingUploads((data as PendingTranslationUpload[]) || []);
  }, [user?.id]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('translation_disclaimer_accepted')
      .eq('user_id', user.id)
      .single();
    setDisclaimerAccepted(data?.translation_disclaimer_accepted ?? false);
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
    fetchPendingUploads();
    fetchProfile();
  }, [fetchOrders, fetchPendingUploads, fetchProfile]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success(
        t('translationsPage.paymentSuccess') || 'Pagamento confirmado! Sua tradução foi iniciada.'
      );
      fetchOrders();
      setSearchParams({}, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast(t('translationsPage.paymentCancelled') || 'Pagamento cancelado.');
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasPending = orders.some(
      (o) =>
        o.payment_status !== 'paid' ||
        (o.translation_status !== 'completed' &&
          (o.translation_status || '').toLowerCase() !== 'finalizado')
    );
    if (!hasPending) return;
    const id = setInterval(fetchOrders, 30_000);
    return () => clearInterval(id);
  }, [orders, fetchOrders]);

  useEffect(() => {
    const nav = location.state as { uploadId?: string; storagePath?: string; fileName?: string; requestId?: string } | null;
    if (nav?.uploadId) {
      setQuoteModal({
        open: true,
        uploadId: nav.uploadId,
        storagePath: nav.storagePath,
        fileName: nav.fileName,
        requestId: nav.requestId,
        documentRequestUploadId: nav.uploadId,
        rejectionOrigin: true,
      });
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedUploadIds = useMemo(
    () => new Set(orders.map((o) => o.document_request_upload_id).filter(Boolean)),
    [orders]
  );
  const trulyPendingUploads = useMemo(
    () => pendingUploads.filter((u) => !orderedUploadIds.has(u.id)),
    [pendingUploads, orderedUploadIds]
  );
  const unpaidOrders = useMemo(() => orders.filter(o => o.payment_status !== 'paid' && !(o.payment_method === 'zelle' && o.payment_reference)), [orders]);
  const paidOrders = useMemo(() => orders.filter(o => o.payment_status === 'paid' || (o.payment_method === 'zelle' && o.payment_reference)), [orders]);
  const totalPending = trulyPendingUploads.length + unpaidOrders.length;

  const handleDisclaimerAccepted = useCallback(
    async (dontShowAgain: boolean) => {
      setDisclaimerAccepted(true);
      if (dontShowAgain && user?.id) {
        await supabase
          .from('user_profiles')
          .update({ translation_disclaimer_accepted: true })
          .eq('user_id', user.id);
      }
    },
    [user?.id]
  );

  const [stripeRetrying, setStripeRetrying] = useState<string | null>(null);
  const handleStripeRetry = async (orderId: string) => {
    setStripeRetrying(orderId);
    try {
      const baseUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('stripe-checkout-translation', {
        body: {
          translation_order_id: orderId,
          success_url: `${baseUrl}/student/dashboard/translations?payment=success&order=${orderId}`,
          cancel_url: `${baseUrl}/student/dashboard/translations?payment=cancelled`,
        },
      });
      if (error || !data?.session_url) throw new Error(error?.message || 'Erro');
      window.location.href = data.session_url;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao iniciar pagamento');
      setStripeRetrying(null);
    }
  };

  const openModalForUpload = (upload: PendingTranslationUpload) => {
    setQuoteModal({
      open: true,
      uploadId: upload.id,
      storagePath: upload.file_url,
      fileName: getFileName(upload.file_url),
      requestId: upload.document_request_id || undefined,
      documentRequestUploadId: upload.id,
      rejectionOrigin: true,
    });
  };

  return (
    <div className="space-y-6 pt-6 sm:pt-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {t('translationsPage.title')}
            </h1>
            {paidOrders.length > 0 && !loading && (
              <p className="mt-0.5 text-sm text-gray-500">
                {paidOrders.length} {paidOrders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setRefreshing(true);
                await fetchOrders();
                setRefreshing(false);
              }}
              disabled={refreshing}
              title="Atualizar status"
              className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setQuoteModal({ open: true })}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1e3a5f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#16304f] transition-colors sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('translationsPage.newTranslation')}</span>
            </button>
          </div>
        </div>

        {/* Pending section: uploads awaiting translation + unpaid orders */}
        {totalPending > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden border-l-4 border-l-amber-400 divide-y divide-gray-100">
            <div className="flex items-center gap-2 px-4 py-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-gray-700">
                {totalPending}{' '}
                {totalPending === 1 ? 'pedido pendente' : 'pedidos pendentes'}
              </span>
            </div>

            {/* Pending uploads (rejected docs needing translation) */}
            {trulyPendingUploads.map((upload) => (
              <div key={upload.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.document_requests?.title ?? cleanFileName(upload.file_url)}
                  </p>
                  {upload.document_requests?.title && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {cleanFileName(upload.file_url)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openModalForUpload(upload)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <Languages className="w-3.5 h-3.5" />
                  {t('translationsPage.pendingBannerCta')}
                </button>
              </div>
            ))}

            {/* Unpaid orders: started but payment not completed */}
            {unpaidOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {o.original_filename}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                    {' · '}
                    {fmt(o.total_price)}
                    {' · '}
                    {o.payment_method === 'zelle' ? 'Zelle' : o.payment_method === 'stripe' ? 'Cartão' : o.payment_method}
                  </p>
                </div>
                {o.payment_method === 'zelle' && o.payment_reference ? (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                    {t('payment:zelleWaiting.messages.under_review') || 'Processando Pagamento'}
                  </span>
                ) : o.payment_method === 'zelle' && (
                  <button
                    onClick={() => setQuoteModal({ open: true, resumeOrderId: o.id, resumeAmount: o.total_price })}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Enviar comprovante
                  </button>
                )}
                {o.payment_method === 'stripe' && (
                  <button
                    onClick={() => handleStripeRetry(o.id)}
                    disabled={stripeRetrying === o.id}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                  >
                    {stripeRetrying === o.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Plus className="w-3.5 h-3.5" />}
                    Pagar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Orders card — paid orders only */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : paidOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                <Languages className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">{t('translationsPage.noOrders')}</p>
              <p className="mt-1 text-xs text-gray-400 max-w-xs">{t('translationsPage.noOrdersDesc')}</p>
              <button
                onClick={() => setQuoteModal({ open: true })}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16304f] transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('translationsPage.newTranslation')}
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-6 py-3 text-left">Documento</th>
                      <th className="px-6 py-3 text-left">Pagamento</th>
                      <th className="px-6 py-3 text-left">Tradução</th>
                      <th className="px-6 py-3 text-left">Data</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paidOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 truncate max-w-[220px]">
                            {o.original_filename}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                            {' · '}
                            {o.source_language} → {o.target_language}
                            {' · '}
                            {o.page_count}p
                          </p>
                          {o.alpha_project_number && (
                            <p className="mt-1 text-[10px] font-mono text-gray-300">#{o.alpha_project_number}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {o.payment_status === 'paid' ? (
                              <span className={BADGE}>{t('translationsPage.paid') || 'Pago'}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                <Clock className="w-3 h-3 animate-pulse" />
                                Processando
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400">
                              {o.payment_method === 'stripe' ? 'Cartão' : o.payment_method === 'zelle' ? 'Zelle' : o.payment_method === 'parcelow' ? 'Parcelow' : o.payment_method}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <TranslationCell
                            order={o}
                            t={t}
                            onView={(url, name) => setCertModal({ url, name })}
                          />
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(() => { const { total, showFee } = displayAmount(o); return (
                            <>
                              <p className="font-bold text-gray-900">{fmt(total)}</p>
                              {showFee
                                ? <p className="text-[10px] text-gray-400">base {fmt(o.total_price)} + taxas</p>
                                : <p className="text-[10px] text-gray-400">{o.page_count} × ${o.price_per_page}</p>
                              }
                            </>
                          ); })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="divide-y divide-gray-100 md:hidden">
                {paidOrders.map((o) => (
                  <div key={o.id} className="px-4 py-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {o.original_filename}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                          {' · '}
                          {o.source_language} → {o.target_language}
                        </p>
                        {o.alpha_project_number && (
                          <p className="mt-0.5 text-[10px] font-mono text-gray-300">#{o.alpha_project_number}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-gray-900 text-sm">
                          {fmt(o.amount_paid ?? o.total_price)}
                        </p>
                        {o.amount_paid && o.amount_paid !== o.total_price ? (
                          <p className="text-[10px] text-gray-400">base {fmt(o.total_price)} + taxas</p>
                        ) : (
                          <p className="text-[10px] text-gray-400">{o.page_count}p × ${o.price_per_page}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        {o.payment_status === 'paid' ? (
                          <span className={BADGE}>{t('translationsPage.paid') || 'Pago'}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Processando
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 ml-0.5">
                          {o.payment_method === 'stripe' ? 'Cartão' : o.payment_method === 'zelle' ? 'Zelle' : o.payment_method === 'parcelow' ? 'Parcelow' : o.payment_method}
                        </span>
                      </div>
                      <TranslationCell
                        order={o}
                        t={t}
                        onView={(url, name) => setCertModal({ url, name })}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Certified file viewer modal */}
      {certModal && (
        <CertModal
          url={certModal.url}
          name={certModal.name}
          onClose={() => setCertModal(null)}
        />
      )}

      {/* Translation Quote Modal */}
      <TranslationQuoteModal
        open={quoteModal.open}
        uploadId={quoteModal.uploadId}
        storagePath={quoteModal.storagePath}
        file={quoteModal.file}
        fileName={quoteModal.fileName}
        requestId={quoteModal.requestId}
        studentId={user?.id || ''}
        documentRequestUploadId={quoteModal.documentRequestUploadId}
        rejectionOrigin={quoteModal.rejectionOrigin}
        disclaimerAccepted={disclaimerAccepted}
        onDisclaimerAccepted={handleDisclaimerAccepted}
        resumeOrderId={quoteModal.resumeOrderId}
        resumeAmount={quoteModal.resumeAmount}
        onClose={() => { setQuoteModal({ open: false }); fetchOrders(); }}
        onOrderCreated={() => {
          setQuoteModal({ open: false });
          fetchOrders();
          fetchPendingUploads();
        }}
      />
    </div>
  );
};

export default Translations;
