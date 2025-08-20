import React, { useEffect, useState } from 'react';
import { PayoutService } from '../../services/PayoutService';
import { useAuth } from '../../hooks/useAuth';
import type { UniversityPayoutRequest } from '../../types';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  Building2, 
  CreditCard, 
  Banknote, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  FileText
} from 'lucide-react';

const AdminPayoutRequests: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<UniversityPayoutRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UniversityPayoutRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
    try { 
      await PayoutService.adminApprove(id, user!.id); 
      await load(); 
    } catch(e:any){ 
      setError(e.message); 
    }
  };

  const markPaid = async (id: string) => {
    const ref = prompt('Payment reference (optional)') || undefined;
    try { 
      await PayoutService.adminMarkPaid(id, user!.id, ref); 
      await load(); 
    } catch(e:any){ 
      setError(e.message); 
    }
  };

  const reject = async (id: string) => {
    const reason = prompt('Reason to reject') || 'No reason';
    try { 
      await PayoutService.adminReject(id, user!.id, reason); 
      await load(); 
    } catch(e:any){ 
      setError(e.message); 
    }
  };

  const formatPaymentDetails = (details: any, method: string) => {
    if (!details) return null;
    
    const formatKey = (key: string) => {
      return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatValue = (key: string, value: any) => {
      // Mask sensitive data
      if (key.includes('account_number') || key.includes('routing_number') || key.includes('iban') || key.includes('swift')) {
        return String(value).replace(/./g, '*');
      }
      return String(value);
    };

    return (
      <div className="space-y-2">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center text-sm">
            <span className="font-medium text-slate-600">{formatKey(key)}:</span>
            <span className="text-slate-800 font-mono text-xs bg-slate-100 px-2 py-1 rounded">
              {formatValue(key, value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          bgColor: 'bg-yellow-50'
        };
      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          bgColor: 'bg-blue-50'
        };
      case 'paid':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-200',
          bgColor: 'bg-green-50'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-800 border-red-200',
          bgColor: 'bg-red-50'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          bgColor: 'bg-gray-50'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const getMethodConfig = (method: string) => {
    switch (method) {
      case 'zelle':
        return {
          icon: CreditCard,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100'
        };
      case 'bank_transfer':
        return {
          icon: Banknote,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      case 'stripe':
        return {
          icon: CreditCard,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      default:
        return {
          icon: CreditCard,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading payout requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payout Requests</h1>
          <p className="text-slate-600 mt-2">
            Manage university payment requests
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="text-sm text-blue-600 font-medium">
              Total: {requests.length} requests
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'approved', 'paid', 'rejected'].map((status) => {
          const count = requests.filter(r => r.status === status).length;
          const config = getStatusConfig(status);
          const Icon = config.icon;
          
          return (
            <div key={status} className={`bg-white border border-slate-200 rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 capitalize">
                                      {status === 'pending' ? 'Pending' :
                  status === 'approved' ? 'Approved' :
                  status === 'paid' ? 'Paid' : 'Rejected'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                </div>
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Requests Grid */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No requests found
          </h3>
          <p className="text-slate-600">
            University payout requests will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((request) => {
            const statusConfig = getStatusConfig(request.status);
            const methodConfig = getMethodConfig(request.payout_method);
            const StatusIcon = statusConfig.icon;
            const MethodIcon = methodConfig.icon;
            
            return (
              <div 
                key={request.id} 
                className={`bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer`}
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetails(true);
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                          {request.status === 'pending' ? 'Pending' :
                  request.status === 'approved' ? 'Approved' :
                  request.status === 'paid' ? 'Paid' :
                  request.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">ID</div>
                    <div className="font-mono text-sm text-slate-700">{request.id.slice(0, 8)}</div>
                  </div>
                </div>

                {/* University Info */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {(request as any).universities?.name || 'University not found'}
                    </h3>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-yellow-100">
                        <DollarSign className="h-4 w-4 text-yellow-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">Amount</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        {request.amount_coins} coins
                      </div>
                      <div className="text-sm text-slate-600">
                        ${Number(request.amount_usd).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg ${methodConfig.bgColor}`}>
                      <MethodIcon className={`h-4 w-4 ${methodConfig.color}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Method</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800 capitalize">
                    {request.payout_method.replace('_', ' ')}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {formatDate(request.created_at)}
                  </span>
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex space-x-2 pt-4 border-t border-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        approve(request.id);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                                              <span>Approve</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reject(request.id);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                                              <span>Reject</span>
                    </button>
                  </div>
                )}

                {request.status === 'approved' && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markPaid(request.id);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Paid</span>
                    </button>
                  </div>
                )}

                {/* View Details Button */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRequest(request);
                      setShowDetails(true);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Request Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-slate-600"
                                      title="Close modal"
                  aria-label="Close details modal"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Request ID</label>
                  <p className="text-sm text-slate-900 font-mono">{selectedRequest.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {(() => {
                      const config = getStatusConfig(selectedRequest.status);
                      const Icon = config.icon;
                      return (
                        <>
                          <div className={`p-1.5 rounded-lg ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium capitalize">{selectedRequest.status}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* University Info */}
              <div>
                <label className="text-sm font-medium text-slate-600">University</label>
                <p className="text-sm text-slate-900 mt-1">
                                      {(selectedRequest as any).universities?.name || 'University not found'}
                </p>
              </div>

              {/* Amount */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-sm font-medium text-slate-600">Request Amount</label>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedRequest.amount_coins} coins
                  </div>
                  <div className="text-lg text-slate-600">
                    ${Number(selectedRequest.amount_usd).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium text-slate-600">Payment Method</label>
                <div className="flex items-center space-x-2 mt-1">
                  {(() => {
                    const config = getMethodConfig(selectedRequest.payout_method);
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <span className="text-sm font-medium capitalize">
                          {selectedRequest.payout_method.replace('_', ' ')}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Payment Details */}
              {selectedRequest.payout_details_preview && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Payment Details</label>
                  <div className="mt-2 bg-slate-50 rounded-lg p-4">
                    {formatPaymentDetails(selectedRequest.payout_details_preview, selectedRequest.payout_method)}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Criada em</label>
                  <p className="text-sm text-slate-900 mt-1">
                    {formatDate(selectedRequest.created_at)}
                  </p>
                </div>
                {selectedRequest.updated_at && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Atualizada em</label>
                    <p className="text-sm text-slate-900 mt-1">
                      {formatDate(selectedRequest.updated_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Notas do Administrador</label>
                  <p className="text-sm text-slate-900 mt-1 bg-slate-50 rounded-lg p-3">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex space-x-3">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        approve(selectedRequest.id);
                        setShowDetails(false);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => {
                        reject(selectedRequest.id);
                        setShowDetails(false);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Reject Request
                    </button>
                  </>
                )}
                
                {selectedRequest.status === 'approved' && (
                  <button
                    onClick={() => {
                      markPaid(selectedRequest.id);
                      setShowDetails(false);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Marcar como Pago
                  </button>
                )}

                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayoutRequests;
