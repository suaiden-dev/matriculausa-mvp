import React, { useState, useEffect, useCallback } from 'react';
import {
  Languages,
  RefreshCw,
  Download,
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranslationOrder {
  id: string;
  user_id: string;
  original_filename: string | null;
  document_type: string;
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

function translationStatusBadge(status: string) {
  const s = status?.toLowerCase();
  if (s === 'finalizado') return 'bg-green-100 text-green-700 ring-green-600/20';
  if (s === 'cancelado') return 'bg-red-100 text-red-700 ring-red-600/20';
  if (s === 'em tradução' || s === 'em revisão' || s === 'em certificação')
    return 'bg-blue-100 text-blue-700 ring-blue-600/20';
  if (s === 'em análise') return 'bg-amber-100 text-amber-700 ring-amber-600/20';
  return 'bg-slate-100 text-slate-600 ring-slate-500/20';
}

function paymentStatusBadge(status: string) {
  if (status === 'paid') return 'bg-green-100 text-green-700';
  return 'bg-amber-100 text-amber-700';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
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

// ─── Component ────────────────────────────────────────────────────────────────

const TranslationsManagement: React.FC = () => {
  const [orders, setOrders] = useState<TranslationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('translation_orders')
        .select(
          'id,user_id,original_filename,document_type,source_language,target_language,page_count,total_price,payment_method,payment_status,payment_reference,translation_status,alpha_project_number,alpha_project_status,alpha_synced_at,certified_file_url,certified_files,certified_at,resubmit_upload_id,resubmitted_at,document_request_upload_id,created_at'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch profiles
      const userIds = [...new Set(ordersData.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id,full_name,email')
        .in('user_id', userIds);

      const profileMap: Record<string, { full_name: string; email: string }> = {};
      for (const p of profiles || []) {
        profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
      }

      const merged: TranslationOrder[] = ordersData.map((o: any) => ({
        ...o,
        student_name: profileMap[o.user_id]?.full_name || '—',
        student_email: profileMap[o.user_id]?.email || '—',
      }));

      setOrders(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Sync with Alpha ────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fitpynguasqqutuhzifx.supabase.co';
      await fetch(`${supabaseUrl}/functions/v1/sync-alpha-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      await fetchOrders();
    } finally {
      setSyncing(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.student_name.toLowerCase().includes(q) ||
      o.student_email.toLowerCase().includes(q) ||
      o.original_filename?.toLowerCase().includes(q) ||
      String(o.alpha_project_number || '').includes(q);

    if (!matchesSearch) return false;

    if (tab === 'in_progress') return isInProgress(o);
    if (tab === 'finalized') return isFinalized(o);
    if (tab === 'awaiting_payment') return isAwaitingPayment(o);
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalAll = orders.length;
  const totalInProgress = orders.filter(isInProgress).length;
  const totalFinalized = orders.filter(isFinalized).length;
  const totalAwaiting = orders.filter(isAwaitingPayment).length;

  // ── Tabs config ────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: totalAll },
    { id: 'in_progress', label: 'Em Andamento', count: totalInProgress },
    { id: 'finalized', label: 'Finalizadas', count: totalFinalized },
    { id: 'awaiting_payment', label: 'Aguard. Pagamento', count: totalAwaiting },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Languages className="h-6 w-6 text-[#05294E]" />
            Gerenciar Traduções
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe pedidos, status Alpha e documentos traduzidos.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#05294E] text-white text-sm font-semibold hover:bg-[#041d38] disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando…' : 'Sincronizar com Alpha'}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Pedidos"
          value={totalAll}
          icon={<FileText className="h-5 w-5 text-slate-500" />}
          color="bg-slate-50 border-slate-200"
        />
        <StatCard
          label="Em Andamento"
          value={totalInProgress}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          color="bg-blue-50 border-blue-200"
        />
        <StatCard
          label="Finalizadas"
          value={totalFinalized}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          color="bg-green-50 border-green-200"
        />
        <StatCard
          label="Aguard. Pagamento"
          value={totalAwaiting}
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
          color="bg-amber-50 border-amber-200"
        />
      </div>

      {/* Tab bar + search */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex gap-1 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-[#05294E] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno, arquivo, #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Languages className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma tradução encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Aluno', 'Documento', 'Idiomas', 'Alpha', 'Status Tradução', 'Pagamento', 'Data', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className={`border rounded-2xl p-4 flex items-center gap-3 ${color}`}>
    <div className="shrink-0">{icon}</div>
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  </div>
);

// ─── OrderRow ─────────────────────────────────────────────────────────────────

const OrderRow: React.FC<{ order: TranslationOrder }> = ({ order: o }) => {
  const finalized = isFinalized(o);
  const inProgress = isInProgress(o);
  const awaiting = isAwaitingPayment(o);

  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      {/* Aluno */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate max-w-[140px]">{o.student_name}</p>
            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{o.student_email}</p>
          </div>
        </div>
      </td>

      {/* Documento */}
      <td className="px-4 py-3">
        <p className="text-slate-800 font-medium truncate max-w-[160px]">
          {o.original_filename || o.document_type}
        </p>
        <p className="text-[11px] text-slate-400">{o.document_type}</p>
      </td>

      {/* Idiomas */}
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
        <span className="text-xs">
          {o.source_language} → {o.target_language}
        </span>
      </td>

      {/* Alpha */}
      <td className="px-4 py-3">
        {o.alpha_project_number ? (
          <span className="font-mono text-xs font-bold text-slate-700">
            #{o.alpha_project_number}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
        {o.alpha_synced_at && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            sync {formatDate(o.alpha_synced_at)}
          </p>
        )}
      </td>

      {/* Status Tradução */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${translationStatusBadge(
            o.translation_status
          )}`}
        >
          {finalized && <CheckCircle className="h-3 w-3" />}
          {inProgress && <Clock className="h-3 w-3" />}
          {o.translation_status}
        </span>
        {o.resubmit_upload_id && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-teal-600 font-semibold">
            <RotateCcw className="h-3 w-3" />
            Auto-resubmetido
          </div>
        )}
      </td>

      {/* Pagamento */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-flex self-start rounded-md px-2 py-0.5 text-xs font-semibold ${paymentStatusBadge(
              o.payment_status
            )}`}
          >
            {o.payment_status === 'paid' ? 'Pago' : awaiting ? 'Processando' : 'Pendente'}
          </span>
          <span className="text-[11px] text-slate-400">
            {paymentMethodLabel(o.payment_method)} · ${Number(o.total_price).toFixed(2)}
          </span>
        </div>
      </td>

      {/* Data */}
      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
        {formatDate(o.created_at)}
      </td>

      {/* Ações */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {o.certified_file_url && (
            <a
              href={o.certified_file_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Baixar documento traduzido"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar
            </a>
          )}
          {o.certified_files && Array.isArray(o.certified_files) && o.certified_files.length > 1 && (
            <span className="text-[11px] text-slate-400">
              +{o.certified_files.length - 1} arquivo(s)
            </span>
          )}
          {o.document_request_upload_id && (
            <a
              href={`/admin/dashboard/users`}
              title="Ver solicitação original"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
};

export default TranslationsManagement;
