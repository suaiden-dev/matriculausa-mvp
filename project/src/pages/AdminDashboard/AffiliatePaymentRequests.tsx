import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, CreditCard, DollarSign, Clock } from 'lucide-react';
import { AffiliatePaymentRequestService, type AffiliatePaymentRequest } from '../../services/AffiliatePaymentRequestService';
import { useAuth } from '../../hooks/useAuth';

const AffiliatePaymentRequests: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<AffiliatePaymentRequest[]>([]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AffiliatePaymentRequestService.listAllPaymentRequests();
      setRequests(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const handleApprove = async (id: string) => {
    try {
      await AffiliatePaymentRequestService.adminApprove(id, user!.id);
      await loadRequests();
      setSuccess('Request approved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to approve');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason (optional):') || '';
    try {
      await AffiliatePaymentRequestService.adminReject(id, user!.id, reason);
      await loadRequests();
      setSuccess('Request rejected');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to reject');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const reference = window.prompt('Payment reference (optional):') || undefined;
    try {
      await AffiliatePaymentRequestService.adminMarkPaid(id, user!.id, reference);
      await loadRequests();
      setSuccess('Request marked as paid');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to mark as paid');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Affiliate Payment Requests</h2>
          <button
            onClick={loadRequests}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No affiliate payment requests</h3>
            <p className="text-gray-500">Requests submitted by affiliates will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affiliate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{r.user?.full_name || r.user?.email || r.referrer_user_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-semibold">{formatCurrency(r.amount_usd)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">{r.payout_method.replace('_',' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        r.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'paid' ? 'bg-green-100 text-green-800' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={()=>handleApprove(r.id)} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Approve</button>
                          <button onClick={()=>handleReject(r.id)} className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700">Reject</button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={()=>handleMarkPaid(r.id)} className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {success && (
        <div className="fixed top-4 right-4 p-3 bg-green-600 text-white rounded-lg shadow">{success}</div>
      )}
      {error && (
        <div className="fixed top-4 right-4 p-3 bg-red-600 text-white rounded-lg shadow">{error}</div>
      )}
    </div>
  );
};

export default AffiliatePaymentRequests;


