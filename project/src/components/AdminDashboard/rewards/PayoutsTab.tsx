import React, { useState, useEffect } from 'react';
import { formatActivityDate, getPayoutStatusConfig, getPayoutMethodConfig, getRangeStart } from '../../../utils/rewardsUtils';
import PaginationControls from './PaginationControls';
import RejectModal from './RejectModal';
import MarkPaidModal from './MarkPaidModal';

interface Props {
  payouts: any[];
  loadingPayouts: boolean;
  showRejectModal: boolean;
  setShowRejectModal: (v: boolean) => void;
  showMarkPaidModal: boolean;
  setShowMarkPaidModal: (v: boolean) => void;
  selectedPayoutId: string | null;
  setSelectedPayoutId: (v: string | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  paymentReference: string;
  setPaymentReference: (v: string) => void;
  approve: (id: string) => void;
  markPaid: (id: string, reference?: string) => void;
  reject: (id: string, reason: string) => void;
}

const STATUS_PILLS = ['all', 'pending', 'approved', 'paid', 'rejected'] as const;
type StatusPill = typeof STATUS_PILLS[number];

const PayoutsTab: React.FC<Props> = ({
  payouts, loadingPayouts,
  showRejectModal, setShowRejectModal,
  showMarkPaidModal, setShowMarkPaidModal,
  selectedPayoutId, setSelectedPayoutId,
  rejectReason, setRejectReason,
  paymentReference, setPaymentReference,
  approve, markPaid, reject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusPill>('all');
  const [payoutFilters, setPayoutFilters] = useState({ method: 'all', dateRange: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, payoutFilters.method, payoutFilters.dateRange]);

  const filteredPayouts = payouts.filter(request => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (request.universities?.name && request.universities.name.toLowerCase().includes(searchLower)) ||
      (request.payout_invoices?.[0]?.invoice_number && request.payout_invoices[0].invoice_number.toLowerCase().includes(searchLower)) ||
      (request.id && request.id.toLowerCase().includes(searchLower)) ||
      (request.payout_method && request.payout_method.toLowerCase().includes(searchLower)) ||
      (request.status && request.status.toLowerCase().includes(searchLower));
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesMethod = payoutFilters.method === 'all' || request.payout_method === payoutFilters.method;
    const matchesDateRange = payoutFilters.dateRange === 'all' ||
      (request.created_at && new Date(request.created_at) >= getRangeStart(payoutFilters.dateRange));
    return matchesSearch && matchesStatus && matchesMethod && matchesDateRange;
  });

  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayouts = filteredPayouts.slice(startIndex, endIndex);

  const statusCount = (s: string) => payouts.filter(r => r.status === s).length;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#1A1A2E]">Payout Requests</h3>
        <p className="text-sm text-slate-500 mt-0.5">Approve, mark as paid, or reject payment requests from universities</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {/* Status pill row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_PILLS.map(s => {
            const count = s === 'all' ? payouts.length : statusCount(s);
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#05294E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className={`tabular-nums px-1 py-0.5 rounded text-[9px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + secondary filters */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search university, invoice, ID..."
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500">Method:</label>
            <select value={payoutFilters.method} onChange={(e) => setPayoutFilters(prev => ({ ...prev, method: e.target.value }))} className="px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-[#05294E] focus:border-transparent">
              <option value="all">All</option>
              <option value="zelle">Zelle</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500">Period:</label>
            <select value={payoutFilters.dateRange} onChange={(e) => setPayoutFilters(prev => ({ ...prev, dateRange: e.target.value }))} className="px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-[#05294E] focus:border-transparent">
              <option value="all">All Time</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 tabular-nums ml-auto">
            {filteredPayouts.length} of {payouts.length}
          </span>
        </div>
      </div>

      {/* Table */}
      {loadingPayouts ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E] mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Loading payout requests...</p>
          </div>
        </div>
      ) : filteredPayouts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">
            {payouts.length === 0 ? 'No payout requests' : 'No requests match your filters'}
          </p>
          <p className="text-xs text-slate-400">
            {payouts.length === 0
              ? 'When a university requests a reward payout, it will appear here'
              : 'Try adjusting the status filter or search term'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['University', 'Invoice', 'Amount', 'Method', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPayouts.map((request: any) => {
                  const statusConfig = getPayoutStatusConfig(request.status);
                  const methodConfig = getPayoutMethodConfig(request.payout_method);
                  const StatusIcon = statusConfig.icon;
                  const MethodIcon = methodConfig.icon;
                  return (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="text-sm font-medium text-[#1A1A2E]">{request.universities?.name || 'University not found'}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-600">
                        {request.payout_invoices?.[0]?.invoice_number || request.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold tabular-nums text-[#1A1A2E]">{request.amount_coins} coins</div>
                        <div className="text-xs tabular-nums text-slate-400">${Number(request.amount_usd).toFixed(2)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`p-1.5 rounded-lg ${methodConfig.bgColor}`}>
                            <MethodIcon className={`h-3.5 w-3.5 ${methodConfig.color}`} />
                          </div>
                          <span className="text-xs text-slate-600 capitalize">{String(request.payout_method).replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">{formatActivityDate(request.created_at)}</td>
                      <td className="px-5 py-4">
                        {request.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => approve(request.id)} className="bg-[#05294E] hover:bg-[#102336] text-white text-xs font-medium py-1.5 px-2.5 rounded-md transition-colors flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Approve
                            </button>
                            <button onClick={() => { setSelectedPayoutId(request.id); setRejectReason(''); setShowRejectModal(true); }} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium py-1.5 px-2.5 rounded-md transition-colors flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              Reject
                            </button>
                          </div>
                        )}
                        {request.status === 'approved' && (
                          <button onClick={() => { setSelectedPayoutId(request.id); setPaymentReference(''); setShowMarkPaidModal(true); }} className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-2.5 rounded-md transition-colors flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Mark as Paid
                          </button>
                        )}
                        {(request.status === 'paid' || request.status === 'rejected' || request.status === 'cancelled') && (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredPayouts.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={filteredPayouts.length}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[5, 10, 20, 50]}
          itemLabel="results"
          onPrev={() => setCurrentPage(p => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          onPageClick={setCurrentPage}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
        />
      )}

      {showRejectModal && (
        <RejectModal
          rejectReason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={() => selectedPayoutId && reject(selectedPayoutId, rejectReason || 'No reason provided')}
          onCancel={() => { setShowRejectModal(false); setSelectedPayoutId(null); setRejectReason(''); }}
        />
      )}

      {showMarkPaidModal && (
        <MarkPaidModal
          paymentReference={paymentReference}
          onReferenceChange={setPaymentReference}
          onConfirm={() => selectedPayoutId && markPaid(selectedPayoutId, paymentReference || undefined)}
          onCancel={() => { setShowMarkPaidModal(false); setSelectedPayoutId(null); setPaymentReference(''); }}
        />
      )}
    </div>
  );
};

export default PayoutsTab;
