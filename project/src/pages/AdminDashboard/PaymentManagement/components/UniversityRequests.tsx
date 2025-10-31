import React from 'react';
import { Building2, Clock, CheckCircle2, DollarSign, Shield, Grid3X3, List, Eye, CheckCircle, XCircle } from 'lucide-react';

type UniversityRequest = any;

export interface UniversityRequestsProps {
  universityRequests: UniversityRequest[];
  loadingUniversityRequests: boolean;
  adminBalance: number;
  loadingBalance?: boolean;
  universityRequestsViewMode: 'grid' | 'list';
  setUniversityRequestsViewMode: (mode: 'grid' | 'list') => void;
  setSelectedRequest: (request: UniversityRequest) => void;
  setShowRequestDetails: (v: boolean) => void;
  approveUniversityRequest: (id: string) => void;
  openRejectModal: (id: string) => void;
  openMarkPaidModal: (id: string) => void;
}

function UniversityRequestsBase(props: UniversityRequestsProps) {
  const {
    universityRequests,
    loadingUniversityRequests,
    adminBalance,
    universityRequestsViewMode,
    setUniversityRequestsViewMode,
    setSelectedRequest,
    setShowRequestDetails,
    approveUniversityRequest,
    openRejectModal,
    openMarkPaidModal,
    loadingBalance,
  } = props;

  return (
    <div className="space-y-6">
      {/* Stats Cards for University Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{universityRequests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {universityRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {universityRequests.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${universityRequests.reduce((sum, r) => sum + r.amount_usd, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {loadingBalance ? (
                  <span className="inline-block animate-pulse bg-gray-200 h-6 w-20 rounded" />
                ) : (
                  `$${adminBalance.toLocaleString()}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* University Requests List */}
      <div className="bg-white rounded-xl shadow border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">University Payment Requests</h2>
              <p className="text-gray-600 mt-1">Manage payment requests from universities</p>
            </div>
            <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
              <button onClick={() => setUniversityRequestsViewMode('grid')} className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${universityRequestsViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Grid view"><Grid3X3 className="h-4 w-4" /></button>
              <button onClick={() => setUniversityRequestsViewMode('list')} className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${universityRequestsViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="List view"><List className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {loadingUniversityRequests ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : universityRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests found</h3>
            <p className="text-gray-500">University payment requests will appear here when they are submitted</p>
          </div>
        ) : (
          <div className="p-6">
            {universityRequestsViewMode === 'grid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {universityRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRequestDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {request.university?.name || 'Unknown University'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {request.user?.full_name || request.user?.email || 'Unknown User'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'paid' ? 'bg-green-100 text-green-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        ${request.amount_usd.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {request.payout_method.replace('_', ' ')}
                      </p>
                    </div>

                    <div className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); approveUniversityRequest(request.id); }}
                          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openRejectModal(request.id); }}
                          className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); openMarkPaidModal(request.id); }}
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Mark as Paid
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {universityRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-gray-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{request.university?.name || 'Unknown University'}</div>
                                <div className="text-sm text-gray-500">{request.user?.full_name || request.user?.email || 'Unknown User'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900"><div className="font-medium">${request.amount_usd.toLocaleString()}</div></div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 capitalize">{request.payout_method.replace('_', ' ')}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'paid' ? 'bg-green-100 text-green-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => { setSelectedRequest(request); setShowRequestDetails(true); }} className="text-blue-600 hover:text-blue-900 flex items-center gap-1"><Eye size={16} />Details</button>
                              {request.status === 'pending' && (<>
                                <button onClick={() => approveUniversityRequest(request.id)} className="text-green-600 hover:text-green-900 flex items-center gap-1"><CheckCircle size={16} />Approve</button>
                                <button onClick={() => openRejectModal(request.id)} className="text-red-600 hover:text-red-900 flex items-center gap-1"><XCircle size={16} />Reject</button>
                              </>)}
                              {request.status === 'approved' && (
                                <button onClick={() => openMarkPaidModal(request.id)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1"><DollarSign size={16} />Mark Paid</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const UniversityRequests = React.memo(UniversityRequestsBase);
export default UniversityRequests;


