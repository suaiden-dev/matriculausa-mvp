import React, { useEffect, useState } from 'react';
import { PayoutService } from '../../services/PayoutService';
import { useAuth } from '../../hooks/useAuth';
import type { UniversityPayoutRequest } from '../../types';
import { CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react';

const AdminPayoutRequests: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<UniversityPayoutRequest[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await PayoutService.listAllPayouts();
      setRequests(data as any);
    } catch (e: any) {
      setError(e.message || 'Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    try { await PayoutService.adminApprove(id, user!.id); await load(); } catch(e:any){ setError(e.message); }
  };
  const markPaid = async (id: string) => {
    const ref = prompt('Payment reference (optional)') || undefined;
    try { await PayoutService.adminMarkPaid(id, user!.id, ref); await load(); } catch(e:any){ setError(e.message); }
  };
  const reject = async (id: string) => {
    const reason = prompt('Reason to reject') || 'No reason';
    try { await PayoutService.adminReject(id, user!.id, reason); await load(); } catch(e:any){ setError(e.message); }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Payout Requests</h1>
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">University</th>
              <th className="py-2 px-4">Amount</th>
              <th className="py-2 px-4">Method</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-2 px-4">{r.id.slice(0,8)}</td>
                <td className="py-2 px-4">{(r as any).universities?.name || '-'}</td>
                <td className="py-2 px-4">{r.amount_coins} coins (${Number(r.amount_usd).toFixed(2)})</td>
                <td className="py-2 px-4 capitalize">{r.payout_method.replace('_',' ')}</td>
                <td className="py-2 px-4 capitalize">{r.status}</td>
                <td className="py-2 px-4">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2 px-4 text-right space-x-2">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={()=>approve(r.id)} className="px-3 py-1 rounded-lg bg-blue-600 text-white">Approve</button>
                      <button onClick={()=>reject(r.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Reject</button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={()=>markPaid(r.id)} className="px-3 py-1 rounded-lg bg-green-600 text-white">Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayoutRequests;
