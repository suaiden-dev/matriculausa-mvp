import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Languages, RefreshCw, Download, Search, ExternalLink, CheckCircle,
  Clock, AlertCircle, FileText, RotateCcw, Eye, X, FileDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranslationOrder {
  id: string;
  user_id: string;
  original_filename: string | null;
  document_type: string;
  document_url: string | null;
  source_language: string;
  target_language: string;
  page_count: number;
  total_price: number;
  payment_method: string | null;
  payment_status: string;
  payment_reference: string | null;
  translation_status: string;
  alpha_project_number: number | null;
  alpha_project_status: string | null;
  alpha_synced_at: string | null;
  certified_file_url: string | null;
  certified_files: { name: string; url: string }[] | null;
  certified_at: string | null;
  resubmit_upload_id: string | null;
  resubmitted_at: string | null;
  document_request_upload_id: string | null;
  created_at: string;
  // joined
  student_name: string;
  student_email: string;
}

type Tab = 'all' | 'in_progress' | 'finalized' | 'awaiting_payment';
type CertFile = { name: string; url: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  stripe: 'Cartão',
  zelle: 'Zelle',
  parcelow: 'Parcelow',
};

function paymentMethodLabel(m: string | null) {
  if (!m) return '—';
  return PAYMENT_METHOD_LABEL[m] || m;
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  zelle: 'bg-purple-100 text-purple-700',
  stripe: 'bg-blue-100 text-blue-700',
  parcelow: 'bg-indigo-100 text-indigo-700',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
  processing: 'bg-amber-100 text-amber-700',
};

const TX_NOT_SENT = '__not_sent__';
const TX_SENT = '__sent__';
const TX_FIXED = [TX_NOT_SENT, TX_SENT, 'Em Tradução', 'Em Revisão', 'Em Certificação', 'Finalizado', 'Cancelado'];

function txStateKey(o: TranslationOrder): string {
  if (!o.alpha_project_number) return TX_NOT_SENT;
  const ts = o.translation_status;
  if (!ts || ts === 'N/A' || ts === 'N\\A' || ts === 'Em Análise' || ts === 'Rascunho' || ts === 'pending')
    return TX_SENT;
  return ts;
}

const TX_LABELS: Record<string, string> = {
  [TX_NOT_SENT]: 'Não enviado',
  [TX_SENT]: 'Enviado',
  'Em Tradução': 'Em Tradução',
  'Em Revisão': 'Em Revisão',
  'Em Certificação': 'Em Certificação',
  'Finalizado': 'Concluído',
  'Cancelado': 'Cancelado',
};

function txDisplay(key: string) {
  return TX_LABELS[key] ?? key;
}

function txBadgeClass(key: string) {
  if (key === TX_NOT_SENT) return null;
  if (key === 'Cancelado') return 'bg-red-50 text-red-700';
  if (key === 'Finalizado') return 'bg-green-100 text-green-700';
  return 'bg-blue-50 text-blue-700';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isAwaitingPayment(o: TranslationOrder) {
  return o.payment_status !== 'paid' && !!o.payment_reference;
}
function isInProgress(o: TranslationOrder) {
  return (
    o.payment_status === 'paid' &&
    !!o.alpha_project_number &&
    !o.certified_file_url &&
    o.translation_status?.toLowerCase() !== 'cancelado'
  );
}
function isFinalized(o: TranslationOrder) {
  return !!o.certified_file_url;
}

// cert expiry
function certMsRemaining(o: TranslationOrder): number {
  const base = o.certified_at ?? o.created_at;
  return new Date(base).getTime() + 60 * 24 * 60 * 60 * 1000 - Date.now();
}
function formatCertCountdown(ms: number): string {
  if (ms <= 0) return 'Expirado';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  return parts.join(' ') + ' restantes';
}

function certFileType(name: string): 'pdf' | 'image' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'other';
}

async function downloadCertFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj; a.download = name; a.click();
    URL.revokeObjectURL(obj);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function exportCsv(rows: TranslationOrder[]) {
  const headers = [
    'Aluno', 'Email', 'Arquivo', 'Tipo', 'Idiomas', 'Páginas', 'Valor (USD)',
    'Método', 'Status Pagamento', 'Alpha #', 'Status Tradução', 'Data', 'ID',
  ];
  function esc(v: unknown) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }
  const lines = rows.map((r) => [
    r.student_name, r.student_email, r.original_filename ?? '',
    r.document_type, `${r.source_language} → ${r.target_language}`,
    r.page_count, Number(r.total_price).toFixed(2),
    paymentMethodLabel(r.payment_method), r.payment_status,
    r.alpha_project_number ?? '', txDisplay(txStateKey(r)),
    formatDateFull(r.created_at), r.id,
  ].map(esc).join(','));
  const csv = '﻿' + [headers.map(esc).join(','), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `translations-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── CertCountdown ────────────────────────────────────────────────────────────

const CertCountdown: React.FC<{ order: TranslationOrder }> = ({ order }) => {
  const [ms, setMs] = useState(() => certMsRemaining(order));
  useEffect(() => {
    const id = setInterval(() => setMs(certMsRemaining(order)), 60000);
    return () => clearInterval(id);
  }, [order.certified_at, order.created_at]);
  if (ms <= 0) return <p className="mt-1 text-[10px] font-medium text-red-500">Link expirado</p>;
  const days = Math.floor(ms / 86400000);
  const color = days <= 7 ? 'text-red-500' : days <= 14 ? 'text-amber-500' : 'text-green-600';
  return <p className={`mt-1 text-[10px] font-medium ${color}`}>{formatCertCountdown(ms)}</p>;
};

// ─── CertModal (PDF/image viewer) ────────────────────────────────────────────

const CertModal: React.FC<{ file: CertFile; onClose: () => void }> = ({ file, onClose }) => {
  const kind = certFileType(file.name);
  const [downloading, setDownloading] = useState(false);
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileDown className="h-4 w-4 shrink-0 text-green-600" />
            <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-3 shrink-0">
            <button
              onClick={async () => { setDownloading(true); await downloadCertFile(file.url, file.name); setDownloading(false); }}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? '…' : 'Download'}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 min-h-0">
          {kind === 'pdf' && <iframe src={file.url} title={file.name} className="w-full h-full min-h-[75vh] border-0" />}
          {kind === 'image' && (
            <div className="flex items-center justify-center p-4 min-h-[55vh]">
              <img src={file.url} alt={file.name} className="max-w-full max-h-[80vh] rounded-lg object-contain shadow" />
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
};

// ─── Field helper ─────────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <div className="mt-0.5 text-sm text-gray-800">{value ?? '—'}</div>
  </div>
);

// ─── OrderModal ───────────────────────────────────────────────────────────────

const OrderModal: React.FC<{ order: TranslationOrder; onClose: () => void }> = ({ order: o, onClose }) => {
  const [certViewFile, setCertViewFile] = useState<CertFile | null>(null);
  const txKey = txStateKey(o);
  const certFiles: CertFile[] = o.certified_files && Array.isArray(o.certified_files) && o.certified_files.length > 0
    ? o.certified_files
    : o.certified_file_url
    ? [{ name: o.original_filename ?? 'traduzido.pdf', url: o.certified_file_url }]
    : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center overflow-y-auto bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-t-2xl bg-white shadow-2xl sm:my-8 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{o.original_filename ?? o.document_type}</h2>
            {o.original_filename && <p className="text-xs text-gray-400 mt-0.5">{o.document_type}</p>}
            <p className="mt-0.5 font-mono text-xs text-gray-400">{o.id.slice(0, 20)}…</p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 sm:max-h-[80vh]">
          <div className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">

            {/* ── LEFT ── */}
            <div className="divide-y divide-gray-50">

              {/* Informações do documento */}
              <section className="pb-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Informações do Documento</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Idiomas" value={`${o.source_language} → ${o.target_language}`} />
                  <Field label="Páginas" value={o.page_count} />
                  <Field label="Tipo" value={o.document_type} />
                  <Field label="Valor" value={`$${Number(o.total_price).toFixed(2)}`} />
                </div>
              </section>

              {/* Aluno */}
              <section className="py-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Aluno</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome" value={o.student_name} />
                  <Field label="Email" value={o.student_email} />
                  <Field label="User ID" value={<span className="font-mono text-xs text-gray-500">{o.user_id.slice(0, 16)}…</span>} />
                </div>
              </section>

              {/* Timeline */}
              <section className="py-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Timeline</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Criado em" value={formatDateFull(o.created_at)} />
                  {o.alpha_project_number && <Field label="Alpha #" value={`#${o.alpha_project_number}`} />}
                  {o.alpha_synced_at && <Field label="Última sync" value={formatDateFull(o.alpha_synced_at)} />}
                  {o.certified_at && <Field label="Certificado em" value={formatDateFull(o.certified_at)} />}
                  {o.resubmit_upload_id && (
                    <Field label="Resubmetido" value={
                      <span className="inline-flex items-center gap-1 text-teal-600 font-semibold text-xs">
                        <RotateCcw className="h-3 w-3" /> Auto-resubmetido
                      </span>
                    } />
                  )}
                </div>
                {o.alpha_project_number && (
                  <div className="mt-3">
                    <Field label="Status Alpha" value={
                      txKey !== TX_NOT_SENT ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${txBadgeClass(txKey) ?? 'bg-blue-50 text-blue-700'}`}>
                          {txDisplay(txKey)}
                        </span>
                      ) : '—'
                    } />
                  </div>
                )}
              </section>
            </div>

            {/* ── RIGHT ── */}
            <div className="divide-y divide-gray-50 sm:border-l sm:border-gray-50 sm:pl-8">

              {/* Pagamento */}
              <section className="pb-5 sm:pt-0">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pagamento</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor" value={`$${Number(o.total_price).toFixed(2)}`} />
                  <Field label="Método" value={
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_METHOD_COLORS[o.payment_method ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                      {paymentMethodLabel(o.payment_method)}
                    </span>
                  } />
                  <Field label="Status" value={
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[o.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.payment_status === 'paid' ? 'Pago' : o.payment_reference ? 'Processando' : 'Pendente'}
                    </span>
                  } />
                  {o.payment_reference && <Field label="Referência" value={<span className="font-mono text-xs">{o.payment_reference}</span>} />}
                </div>
              </section>

              {/* Documento original */}
              <section className="py-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Documento Original</h3>
                {o.document_url ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 shrink-0 text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{o.original_filename ?? 'documento'}</p>
                        <p className="text-xs text-gray-400">{o.document_type}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a href={o.document_url} target="_blank" rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#05294E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#041d38] transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" /> Ver
                      </a>
                      <a href={o.document_url} download
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Documento não disponível.</p>
                )}
              </section>

              {/* Documentos traduzidos */}
              <section className="py-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Documentos Traduzidos</h3>
                {certFiles.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {certFiles.map((f, i) => (
                      <div key={i} className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                        <div className="flex items-center gap-3 mb-2.5">
                          <FileDown className="h-7 w-7 shrink-0 text-green-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-800">{f.name}</p>
                            <p className="text-xs text-gray-400">Traduzido pela Alpha Translations</p>
                            <CertCountdown order={o} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setCertViewFile(f)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors">
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </button>
                          <button onClick={() => downloadCertFile(f.url, f.name)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors">
                            <Download className="h-3.5 w-3.5" /> Baixar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-400">Nenhum documento traduzido ainda.</p>
                    {o.alpha_project_number && (
                      <p className="mt-1.5 text-xs text-gray-500">
                        Status: <span className="font-semibold text-gray-700">{txDisplay(txStateKey(o))}</span>
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
      {certViewFile && <CertModal file={certViewFile} onClose={() => setCertViewFile(null)} />}
    </div>,
    document.body,
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const TranslationsManagement: React.FC = () => {
  const [orders, setOrders] = useState<TranslationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalOrder, setModalOrder] = useState<TranslationOrder | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [txFilter, setTxFilter] = useState('all');
  const [payStatusFilter, setPayStatusFilter] = useState('all');
  const [payMethodFilter, setPayMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('translation_orders')
        .select(
          'id,user_id,original_filename,document_type,document_url,source_language,target_language,page_count,total_price,payment_method,payment_status,payment_reference,translation_status,alpha_project_number,alpha_project_status,alpha_synced_at,certified_file_url,certified_files,certified_at,resubmit_upload_id,resubmitted_at,document_request_upload_id,created_at'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ordersData || ordersData.length === 0) { setOrders([]); return; }

      const userIds = [...new Set(ordersData.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id,full_name,email')
        .in('user_id', userIds);

      const profileMap: Record<string, { full_name: string; email: string }> = {};
      for (const p of profiles || []) profileMap[p.user_id] = p;

      setOrders(ordersData.map((o: any) => ({
        ...o,
        student_name: profileMap[o.user_id]?.full_name || '—',
        student_email: profileMap[o.user_id]?.email || '—',
      })));
    } catch (err: any) {
      console.error('Error fetching translations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [search, txFilter, payStatusFilter, payMethodFilter, dateFrom, dateTo, tab]);

  // ── Sync ───────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fitpynguasqqutuhzifx.supabase.co';
      await fetch(`${supabaseUrl}/functions/v1/sync-alpha-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      await fetchOrders();
    } finally {
      setSyncing(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const tabFiltered = orders.filter((o) => {
    if (tab === 'in_progress') return isInProgress(o);
    if (tab === 'finalized') return isFinalized(o);
    if (tab === 'awaiting_payment') return isAwaitingPayment(o);
    return true;
  });

  const txExtra = [...new Set(tabFiltered.map(txStateKey))].filter((k) => !TX_FIXED.includes(k)).sort();
  const txOptions = ['all', ...TX_FIXED, ...txExtra];

  const filtered = tabFiltered.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !o.student_name.toLowerCase().includes(q) &&
        !o.student_email.toLowerCase().includes(q) &&
        !(o.original_filename ?? '').toLowerCase().includes(q) &&
        !String(o.alpha_project_number ?? '').includes(q)
      ) return false;
    }
    if (txFilter !== 'all' && txStateKey(o) !== txFilter) return false;
    if (payStatusFilter !== 'all' && o.payment_status !== payStatusFilter) return false;
    if (payMethodFilter !== 'all' && (o.payment_method ?? '') !== payMethodFilter) return false;
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(o.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilterCount = [
    txFilter !== 'all', payStatusFilter !== 'all', payMethodFilter !== 'all', dateFrom, dateTo,
  ].filter(Boolean).length;

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalAll = orders.length;
  const totalInProgress = orders.filter(isInProgress).length;
  const totalFinalized = orders.filter(isFinalized).length;
  const totalAwaiting = orders.filter(isAwaitingPayment).length;
  const totalRevenue = filtered.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_price), 0);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: totalAll },
    { id: 'in_progress', label: 'Em Andamento', count: totalInProgress },
    { id: 'finalized', label: 'Finalizadas', count: totalFinalized },
    { id: 'awaiting_payment', label: 'Aguard. Pagamento', count: totalAwaiting },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl flex items-center gap-2">
            <Languages className="h-5 w-5 text-[#05294E]" />
            Gerenciar Traduções
          </h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe pedidos, status Alpha e documentos traduzidos.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:px-4"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Sincronizando…' : 'Sincronizar com Alpha'}</span>
          </button>
          <button
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[#05294E] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#041d38] disabled:opacity-40 disabled:cursor-not-allowed sm:px-4"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Pedidos" value={totalAll} icon={<FileText className="h-5 w-5 text-slate-500" />} color="bg-slate-50 border-slate-200" />
        <StatCard label="Em Andamento" value={totalInProgress} icon={<Clock className="h-5 w-5 text-blue-500" />} color="bg-blue-50 border-blue-200" />
        <StatCard label="Finalizadas" value={totalFinalized} icon={<CheckCircle className="h-5 w-5 text-green-500" />} color="bg-green-50 border-green-200" />
        <StatCard label="Aguard. Pagamento" value={totalAwaiting} icon={<AlertCircle className="h-5 w-5 text-amber-500" />} color="bg-amber-50 border-amber-200" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-[#05294E] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aluno, arquivo, #Alpha…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#05294E] focus:ring-2 focus:ring-[#05294E]/10"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Translation status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status Tradução</label>
            <select value={txFilter} onChange={(e) => setTxFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#05294E]">
              {txOptions.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'Todos' : txDisplay(s)}</option>
              ))}
            </select>
          </div>
          {/* Payment status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status Pagamento</label>
            <select value={payStatusFilter} onChange={(e) => setPayStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#05294E]">
              <option value="all">Todos</option>
              <option value="paid">Pago</option>
              <option value="unpaid">Pendente</option>
              <option value="processing">Processando</option>
            </select>
          </div>
          {/* Payment method */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Método</label>
            <select value={payMethodFilter} onChange={(e) => setPayMethodFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#05294E]">
              <option value="all">Todos</option>
              <option value="stripe">Cartão</option>
              <option value="zelle">Zelle</option>
              <option value="parcelow">Parcelow</option>
            </select>
          </div>
          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#05294E]" />
          </div>
          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#05294E]" />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={() => { setTxFilter('all'); setPayStatusFilter('all'); setPayMethodFilter('all'); setDateFrom(''); setDateTo(''); }}
            className="flex items-center gap-1 self-start text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtros ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Summary line */}
      {!loading && (
        <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
          <span>Exibindo {filtered.length} de {orders.length} pedido{orders.length !== 1 ? 's' : ''}</span>
          {totalRevenue > 0 && (
            <span className="font-semibold text-green-600">
              Total recebido: ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="hidden grid-cols-[1.2fr_1.4fr_0.8fr_0.8fr_1fr_1fr_0.8fr_0.4fr] gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 lg:grid">
          <span>Aluno</span>
          <span>Documento</span>
          <span>Idiomas</span>
          <span>Alpha</span>
          <span>Status Tradução</span>
          <span>Pagamento</span>
          <span>Data</span>
          <span></span>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 animate-pulse">
                <div className="space-y-2 flex-1"><div className="h-3 w-32 rounded bg-gray-100" /><div className="h-3 w-48 rounded bg-gray-100" /></div>
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Languages className="h-12 w-12 text-gray-200" />
            <p className="mt-3 text-sm text-gray-400">Nenhuma tradução encontrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map((order) => (
              <OrderGridRow key={order.id} order={order} onOpen={() => setModalOrder(order)} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-xs text-gray-400">
            Página {safePage} de {totalPages} · {filtered.length} pedidos
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${safePage === p ? 'bg-[#05294E] text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {p}
                  </button>
                )
              )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOrder && <OrderModal order={modalOrder} onClose={() => setModalOrder(null)} />}
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className={`border rounded-2xl p-4 flex items-center gap-3 ${color}`}>
    <div className="shrink-0">{icon}</div>
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  </div>
);

// ─── OrderGridRow ─────────────────────────────────────────────────────────────

const OrderGridRow: React.FC<{ order: TranslationOrder; onOpen: () => void }> = ({ order: o, onOpen }) => {
  const txKey = txStateKey(o);
  const badgeClass = txBadgeClass(txKey);
  const certFiles: { name: string; url: string }[] =
    o.certified_files && Array.isArray(o.certified_files) && o.certified_files.length > 0
      ? o.certified_files
      : o.certified_file_url
      ? [{ name: o.original_filename ?? 'traduzido.pdf', url: o.certified_file_url }]
      : [];

  return (
    <>
      {/* Mobile */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 lg:hidden hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={onOpen}>
        <div className="min-w-0 space-y-1.5 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{o.original_filename ?? o.document_type}</p>
          <p className="text-xs text-gray-500">{o.student_name !== '—' ? o.student_name : o.student_email}</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-semibold text-gray-800">${Number(o.total_price).toFixed(2)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_METHOD_COLORS[o.payment_method ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
              {paymentMethodLabel(o.payment_method)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[o.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
              {o.payment_status === 'paid' ? 'Pago' : 'Pendente'}
            </span>
            {txKey !== TX_NOT_SENT && badgeClass && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{txDisplay(txKey)}</span>
            )}
            {certFiles.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                <FileDown className="h-3 w-3" /> Certificado
              </span>
            )}
          </div>
        </div>
        <button className="shrink-0 mt-0.5 text-gray-400 hover:text-[#05294E] transition-colors">
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop */}
      <div
        className="hidden grid-cols-[1.2fr_1.4fr_0.8fr_0.8fr_1fr_1fr_0.8fr_0.4fr] items-center gap-3 px-6 py-4 lg:grid hover:bg-gray-50/60 transition-colors cursor-pointer"
        onClick={onOpen}
      >
        {/* Aluno */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{o.student_name !== '—' ? o.student_name : o.student_email}</p>
          <p className="text-xs text-gray-400 truncate">{o.student_name !== '—' ? o.student_email : ''}</p>
        </div>

        {/* Documento */}
        <div className="min-w-0">
          <p className="text-sm text-gray-800 truncate">{o.original_filename ?? o.document_type}</p>
          {o.original_filename && <p className="text-xs text-gray-400 truncate">{o.document_type}</p>}
        </div>

        {/* Idiomas */}
        <span className="text-xs text-gray-600 whitespace-nowrap">{o.source_language} → {o.target_language}</span>

        {/* Alpha */}
        <div>
          {o.alpha_project_number ? (
            <span className="font-mono text-xs font-bold text-gray-700">#{o.alpha_project_number}</span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
          {o.alpha_synced_at && <p className="text-[10px] text-gray-400 mt-0.5">sync {formatDate(o.alpha_synced_at)}</p>}
        </div>

        {/* Status Tradução */}
        <div className="flex flex-col gap-1 items-start">
          {txKey === TX_NOT_SENT ? (
            <span className="text-xs text-gray-400">Não enviado</span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass ?? 'bg-blue-50 text-blue-700'}`}>
              {txDisplay(txKey)}
            </span>
          )}
          {certFiles.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              <FileDown className="h-3 w-3 shrink-0" /> Certificado
            </span>
          )}
          {o.resubmit_upload_id && (
            <span className="inline-flex items-center gap-1 text-[10px] text-teal-600 font-semibold">
              <RotateCcw className="h-3 w-3" /> Auto-resubmetido
            </span>
          )}
        </div>

        {/* Pagamento */}
        <div className="flex flex-col gap-1 items-start">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[o.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
            {o.payment_status === 'paid' ? 'Pago' : o.payment_reference ? 'Processando' : 'Pendente'}
          </span>
          <span className="text-xs text-gray-400">{paymentMethodLabel(o.payment_method)} · ${Number(o.total_price).toFixed(2)}</span>
        </div>

        {/* Data */}
        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(o.created_at)}</span>

        {/* Ver */}
        <button className="flex items-center text-gray-400 hover:text-[#05294E] transition-colors" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </>
  );
};

export default TranslationsManagement;
