import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Languages, Plus, Clock, Loader2, FileDown, Download, X, RefreshCw, Upload, CheckCircle, ChevronDown, ExternalLink } from 'lucide-react';
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
  batchUploads?: PendingTranslationUpload[];
}

function getFileName(url: string): string {
  const withoutQuery = url.split('?')[0];
  const parts = withoutQuery.split('/');
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

// ── Badges ────────────────────────────────────────────────────────────────────

const BADGE = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200';

type TxStyle = { dot: string; pill: string; label: string };

function txStyle(status: string, t: (k: string) => string): TxStyle {
  const s = (status || '').toLowerCase().trim();
  if (s === 'finalizado' || s === 'completed') return {
    dot: 'bg-green-400',
    pill: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    label: t('translationsPage.statusCompleted') || 'Concluído',
  };
  if (s === 'cancelado' || s === 'cancelled') return {
    dot: 'bg-red-400',
    pill: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    label: t('translationsPage.statusCancelled') || 'Cancelado',
  };
  if (s === 'n/a' || s === 'em análise' || s === 'em analise' || s === 'rascunho') return {
    dot: 'bg-blue-400',
    pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    label: t('translationsPage.statusSent') || 'Enviado',
  };
  if (s) return {
    dot: 'bg-purple-400',
    pill: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    label: t('translationsPage.statusInProgress') || 'Em Tradução',
  };
  return { dot: 'bg-gray-300', pill: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', label: '—' };
}

// Pill badge with dot — matches Lush style
function TxBadge({ order, t }: { order: TranslationOrder; t: (k: string) => string }) {
  if (order.payment_status !== 'paid') return <span className="text-gray-400 text-xs">—</span>;
  const { dot, pill, label } = txStyle(order.translation_status, t);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// Certified file download button — separate column
function CertFileBtn({ order, onView }: { order: TranslationOrder; onView: (url: string, name: string) => void }) {
  if (!order.certified_file_url) return <span className="text-gray-400 text-xs">—</span>;
  const name = getFileName(order.certified_file_url);
  return (
    <button
      onClick={() => onView(order.certified_file_url!, name)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
    >
      <FileDown className="h-3.5 w-3.5 shrink-0" />
      Ver arquivo
    </button>
  );
}

// ── Payment cell: badge + retry buttons + cancel ──────────────────────────────

function PaymentCell({ order, t, onZelleProof, onCancelOrder }: {
  order: TranslationOrder;
  t: (k: string) => string;
  onZelleProof?: (orderId: string, amount: number) => void;
  onCancelOrder?: (orderId: string) => void;
}) {
  const isPaid = order.payment_status === 'paid';
  const isZellePending = order.payment_method === 'zelle' && !!order.payment_reference && !isPaid;
  const [stripeLoading, setStripeLoading] = useState(false);
  const [parcelowLoading, setParcelowLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleStripeRetry = async () => {
    setStripeLoading(true);
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
      setStripeLoading(false);
    }
  };

  const handleParcelowRetry = async () => {
    setParcelowLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parcelow-checkout-translation', {
        body: { translation_order_id: order.id, amount: order.total_price },
      });
      if (error || !data?.checkout_url) throw new Error(error?.message || 'Erro');
      window.location.href = data.checkout_url;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao iniciar pagamento');
      setParcelowLoading(false);
    }
  };

  if (isPaid) return <span className={BADGE}>{t('translationsPage.paid') || 'Pago'}</span>;

  if (isZellePending) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" />
        Processing
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-gray-700">Cancelar pedido?</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onCancelOrder?.(order.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Cancelar
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Manter
          </button>
        </div>
      </div>
    );
  }

  const payBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#16304f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const cancelBtn = 'inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors';

  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
        {t('translationsPage.unpaid') || 'Não pago'}
      </span>
      {order.payment_method === 'stripe' && (
        <button onClick={handleStripeRetry} disabled={stripeLoading} className={payBtn}>
          {stripeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
          {stripeLoading ? 'Aguarde…' : 'Pagar com cartão'}
        </button>
      )}
      {order.payment_method === 'zelle' && onZelleProof && (
        <button onClick={() => onZelleProof(order.id, order.total_price)} className={payBtn}>
          <Upload className="w-3 h-3" />
          Enviar comprovante
        </button>
      )}
      {order.payment_method === 'parcelow' && (
        <button onClick={handleParcelowRetry} disabled={parcelowLoading} className={payBtn}>
          {parcelowLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
          {parcelowLoading ? 'Aguarde…' : 'Continuar pagamento'}
        </button>
      )}
      {onCancelOrder && (
        <button onClick={() => setConfirming(true)} className={cancelBtn}>
          <X className="w-3 h-3" />
          Cancelar pedido
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

  useEffect(() => {
    fetchOrders();
    fetchPendingUploads();
  }, [fetchOrders, fetchPendingUploads]);

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

  const groupedPending = useMemo(() => {
    const groups: Record<string, { requestId: string; requestTitle: string; uploads: PendingTranslationUpload[] }> = {};
    const standalone: PendingTranslationUpload[] = [];
    for (const upload of trulyPendingUploads) {
      if (upload.document_request_id) {
        if (!groups[upload.document_request_id]) {
          groups[upload.document_request_id] = {
            requestId: upload.document_request_id,
            requestTitle: upload.document_requests?.title ?? 'Documento',
            uploads: [],
          };
        }
        groups[upload.document_request_id].uploads.push(upload);
      } else {
        standalone.push(upload);
      }
    }
    return { groups: Object.values(groups), standalone };
  }, [trulyPendingUploads]);

  const unpaidOrders = useMemo(() => orders.filter(o => o.payment_status !== 'paid' && !(o.payment_method === 'zelle' && o.payment_reference)), [orders]);
  const paidOrders = useMemo(() => orders.filter(o => o.payment_status === 'paid' || (o.payment_method === 'zelle' && o.payment_reference)), [orders]);

  const groupedAllOrders = useMemo(() => {
    const refMap = new Map<string, TranslationOrder[]>();
    for (const o of orders) {
      if (o.payment_reference) {
        const arr = refMap.get(o.payment_reference) || [];
        arr.push(o);
        refMap.set(o.payment_reference, arr);
      }
    }
    const seen = new Set<string>();
    const groups: { key: string; orders: TranslationOrder[]; isBatch: boolean }[] = [];
    for (const o of orders) {
      if (o.payment_reference) {
        if (!seen.has(o.payment_reference)) {
          seen.add(o.payment_reference);
          const ords = refMap.get(o.payment_reference)!;
          groups.push({ key: o.payment_reference, orders: ords, isBatch: ords.length > 1 });
        }
      } else {
        groups.push({ key: o.id, orders: [o], isBatch: false });
      }
    }
    return groups;
  }, [orders]);

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const toggleBatch = (key: string) => setExpandedBatches(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const totalPending = trulyPendingUploads.length;

  const handleCancelOrder = async (orderId: string) => {
    const { error } = await supabase.from('translation_orders').delete().eq('id', orderId);
    if (error) {
      toast.error('Erro ao cancelar pedido');
    } else {
      toast.success('Pedido cancelado');
      fetchOrders();
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

  const openModalForGroup = (group: { requestId: string; uploads: PendingTranslationUpload[] }) => {
    setQuoteModal({
      open: true,
      requestId: group.requestId,
      rejectionOrigin: true,
      batchUploads: group.uploads,
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
            {orders.length > 0 && !loading && (
              <p className="mt-0.5 text-sm text-gray-500">
                {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
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

        {/* Pending section: only rejected uploads that need translation */}
        {totalPending > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden border-l-4 border-l-amber-400 divide-y divide-gray-100">
            <div className="flex items-center gap-2 px-4 py-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-gray-700">
                {totalPending}{' '}
                {totalPending === 1 ? 'documento para traduzir' : 'documentos para traduzir'}
              </span>
            </div>

            {/* Pending uploads grouped by document_request — ONE button per group */}
            {groupedPending.groups.map((group) => (
              <div key={group.requestId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{group.requestTitle}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {group.uploads.length} {group.uploads.length === 1 ? 'documento' : 'documentos'} para traduzir
                  </p>
                </div>
                <button
                  onClick={() => openModalForGroup(group)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <Languages className="w-3.5 h-3.5" />
                  Traduzir ({group.uploads.length})
                </button>
              </div>
            ))}

            {/* Standalone uploads (no document_request) */}
            {groupedPending.standalone.map((upload) => (
              <div key={upload.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {cleanFileName(upload.file_url)}
                  </p>
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
          </div>
        )}

        {/* Orders card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : orders.length === 0 ? (
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
                      <th className="px-6 py-3 text-left">Arquivo</th>
                      <th className="px-6 py-3 text-left">Data</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {groupedAllOrders.map((group) => {
                      if (!group.isBatch) {
                        const o = group.orders[0];
                        return (
                          <tr
                            key={o.id}
                            className={o.payment_status !== 'paid' && !(o.payment_method === 'zelle' && o.payment_reference) ? 'border-l-2 border-l-amber-300 bg-amber-50/20' : 'hover:bg-gray-50/70 transition-colors'}
                          >
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900 truncate max-w-[200px]">{o.original_filename}</p>
                              <p className="mt-0.5 text-xs text-gray-400">
                                {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                                {' · '}{o.source_language} → {o.target_language}{' · '}{o.page_count}p
                              </p>
                              {o.alpha_project_number && (
                                <span className="mt-1 inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 tracking-wide">#{o.alpha_project_number}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <PaymentCell
                                  order={o}
                                  t={t}
                                  onZelleProof={(id, amount) => setQuoteModal({ open: true, resumeOrderId: id, resumeAmount: amount })}
                                  onCancelOrder={handleCancelOrder}
                                />
                                <span className="text-[11px] text-gray-400">
                                  {o.payment_method === 'stripe' ? 'Cartão' : o.payment_method === 'zelle' ? 'Zelle' : o.payment_method === 'parcelow' ? 'Parcelow' : o.payment_method}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <TxBadge order={o} t={t} />
                            </td>
                            <td className="px-6 py-4">
                              <CertFileBtn order={o} onView={(url, name) => setCertModal({ url, name })} />
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(o.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {(() => { const { total, showFee } = displayAmount(o); return (
                                <>
                                  <p className="font-bold text-gray-900">{fmt(total)}</p>
                                  {showFee ? <p className="text-[10px] text-gray-400">base {fmt(o.total_price)} + taxas</p>
                                           : <p className="text-[10px] text-gray-400">{o.page_count} × ${o.price_per_page}</p>}
                                </>
                              ); })()}
                            </td>
                          </tr>
                        );
                      }

                      // Batch group
                      const isExpanded = expandedBatches.has(group.key);
                      const batchTotal = group.orders.reduce((s, o) => s + (o.amount_paid ?? o.total_price), 0);
                      const payMethod = group.orders[0].payment_method;
                      const payLabel = payMethod === 'stripe' ? 'Cartão' : payMethod === 'zelle' ? 'Zelle' : payMethod === 'parcelow' ? 'Parcelow' : payMethod;
                      const finalizedCount = group.orders.filter(o => (o.translation_status || '').toLowerCase() === 'finalizado').length;
                      const cancelledCount = group.orders.filter(o => (o.translation_status || '').toLowerCase() === 'cancelado').length;
                      const sentToAlphaCount = group.orders.filter(o => o.alpha_project_number && (o.translation_status || '').toLowerCase() !== 'cancelado').length;
                      const batchN = group.orders.length;

                      return (
                        <React.Fragment key={group.key}>
                          {/* Batch summary row */}
                          <tr
                            className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                            onClick={() => toggleBatch(group.key)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                <div>
                                  <p className="font-semibold text-gray-900">{group.orders.length} documentos</p>
                                  <p className="mt-0.5 text-xs text-gray-400">Pagamento único</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={BADGE}>{t('translationsPage.paid') || 'Pago'}</span>
                                <span className="text-[11px] text-gray-400">{payLabel}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {finalizedCount === batchN ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                                  Todos finalizados
                                </span>
                              ) : finalizedCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                                  {finalizedCount}/{batchN} finalizados
                                </span>
                              ) : cancelledCount === batchN ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                                  Todos cancelados
                                </span>
                              ) : cancelledCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                                  {cancelledCount}/{batchN} cancelados
                                </span>
                              ) : sentToAlphaCount === batchN ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                                  Enviados
                                </span>
                              ) : sentToAlphaCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                                  {sentToAlphaCount}/{batchN} enviados
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-gray-400">—</span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(group.orders[0].created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="font-bold text-gray-900">{fmt(batchTotal)}</p>
                              <p className="text-[10px] text-gray-400">{group.orders.length} docs</p>
                            </td>
                          </tr>

                          {/* Individual rows (expanded) */}
                          {isExpanded && group.orders.map((o) => (
                            <tr key={o.id} className="bg-blue-50/20 border-l-2 border-l-blue-200">
                              <td className="px-6 py-3 pl-14">
                                <p className="text-sm text-gray-800 truncate max-w-[200px]">{o.original_filename}</p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                  {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                                  {' · '}{o.page_count}p
                                </p>
                                {o.alpha_project_number && (
                                  <span className="mt-0.5 inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">#{o.alpha_project_number}</span>
                                )}
                              </td>
                              <td className="px-6 py-3" />
                              <td className="px-6 py-3">
                                <TxBadge order={o} t={t} />
                              </td>
                              <td className="px-6 py-3">
                                <CertFileBtn order={o} onView={(url, name) => setCertModal({ url, name })} />
                              </td>
                              <td className="px-6 py-3" />
                              <td className="px-6 py-3 text-right">
                                <p className="text-sm text-gray-700">{fmt(o.amount_paid ?? o.total_price)}</p>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="divide-y divide-gray-100 md:hidden">
                {groupedAllOrders.map((group) => {
                  if (!group.isBatch) {
                    const o = group.orders[0];
                    return (
                      <div
                        key={o.id}
                        className={`px-4 py-4 space-y-2.5 ${o.payment_status !== 'paid' && !(o.payment_method === 'zelle' && o.payment_reference) ? 'border-l-2 border-l-amber-300 bg-amber-50/20' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{o.original_filename}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                              {' · '}{o.source_language} → {o.target_language}
                            </p>
                            {o.alpha_project_number && (
                              <p className="mt-0.5 text-[10px] font-mono text-gray-300">#{o.alpha_project_number}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-gray-900 text-sm">{fmt(o.amount_paid ?? o.total_price)}</p>
                            {o.amount_paid && o.amount_paid !== o.total_price
                              ? <p className="text-[10px] text-gray-400">base {fmt(o.total_price)} + taxas</p>
                              : <p className="text-[10px] text-gray-400">{o.page_count}p × ${o.price_per_page}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <PaymentCell
                            order={o}
                            t={t}
                            onZelleProof={(id, amount) => setQuoteModal({ open: true, resumeOrderId: id, resumeAmount: amount })}
                            onCancelOrder={handleCancelOrder}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-gray-400">
                              {o.payment_method === 'stripe' ? 'Cartão' : o.payment_method === 'zelle' ? 'Zelle' : o.payment_method === 'parcelow' ? 'Parcelow' : o.payment_method}
                            </span>
                            <TxBadge order={o} t={t} />
                          </div>
                        </div>
                        {o.certified_file_url && (
                          <CertFileBtn order={o} onView={(url, name) => setCertModal({ url, name })} />
                        )}
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                    );
                  }

                  // Batch group (mobile)
                  const isExpanded = expandedBatches.has(group.key);
                  const batchTotal = group.orders.reduce((s, o) => s + (o.amount_paid ?? o.total_price), 0);
                  const payMethod = group.orders[0].payment_method;
                  const payLabel = payMethod === 'stripe' ? 'Cartão' : payMethod === 'zelle' ? 'Zelle' : payMethod === 'parcelow' ? 'Parcelow' : payMethod;
                  const mFinalizedCount = group.orders.filter(o => (o.translation_status || '').toLowerCase() === 'finalizado').length;
                  const mCancelledCount = group.orders.filter(o => (o.translation_status || '').toLowerCase() === 'cancelado').length;
                  const mSentCount = group.orders.filter(o => o.alpha_project_number && (o.translation_status || '').toLowerCase() !== 'cancelado').length;
                  const mBatchN = group.orders.length;

                  return (
                    <div key={group.key}>
                      {/* Batch summary row */}
                      <div
                        className="px-4 py-4 space-y-2 cursor-pointer hover:bg-blue-50/30 transition-colors"
                        onClick={() => toggleBatch(group.key)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{group.orders.length} documentos</p>
                              <p className="text-xs text-gray-400">Pagamento único</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-gray-900 text-sm">{fmt(batchTotal)}</p>
                            <p className="text-[10px] text-gray-400">{group.orders.length} docs</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-6">
                          <span className={BADGE}>{t('translationsPage.paid') || 'Pago'}</span>
                          {mFinalizedCount === mBatchN ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />Todos finalizados
                            </span>
                          ) : mFinalizedCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />{mFinalizedCount}/{mBatchN} finalizados
                            </span>
                          ) : mCancelledCount === mBatchN ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />Todos cancelados
                            </span>
                          ) : mCancelledCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />{mCancelledCount}/{mBatchN} cancelados
                            </span>
                          ) : mSentCount === mBatchN ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />Enviados
                            </span>
                          ) : mSentCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />{mSentCount}/{mBatchN} enviados
                            </span>
                          ) : null}
                          <span className="text-xs text-gray-400">{new Date(group.orders[0].created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Expanded individual items */}
                      {isExpanded && (
                        <div className="bg-blue-50/20 border-l-2 border-l-blue-200 divide-y divide-blue-100/50">
                          {group.orders.map((o) => (
                            <div key={o.id} className="px-4 py-3 pl-8 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-gray-800 truncate">{o.original_filename}</p>
                                  <p className="text-xs text-gray-400">
                                    {o.is_bank_statement ? t('translationQuoteModal.docType_bank_statement') : t(DOC_TYPE_LABELS[o.document_type] || o.document_type)}
                                    {' · '}{o.page_count}p
                                    {o.alpha_project_number && <span className="font-mono ml-1">#{o.alpha_project_number}</span>}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700 shrink-0">{fmt(o.amount_paid ?? o.total_price)}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <TxBadge order={o} t={t} />
                                {o.certified_file_url && (
                                  <CertFileBtn order={o} onView={(url, name) => setCertModal({ url, name })} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
        resumeOrderId={quoteModal.resumeOrderId}
        resumeAmount={quoteModal.resumeAmount}
        batchUploads={quoteModal.batchUploads}
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
