import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Building2,
  Users,
  CreditCard,
  ArrowUpRight,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface PendingPaymentsSummaryProps {
  universityRequestsCount?: number;
  affiliateRequestsCount?: number;
  zellePaymentsCount?: number;
  universityRequestsAmount?: number;
  affiliateRequestsAmount?: number;
  zellePaymentsAmount?: number;
  loading?: boolean;
}

const PendingPaymentsSummary: React.FC<PendingPaymentsSummaryProps> = ({
  universityRequestsCount = 0,
  affiliateRequestsCount = 0,
  zellePaymentsCount = 0,
  universityRequestsAmount = 0,
  affiliateRequestsAmount = 0,
  zellePaymentsAmount = 0,
  loading = false,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalPending = universityRequestsCount + affiliateRequestsCount + zellePaymentsCount;
  const totalAmount = universityRequestsAmount + affiliateRequestsAmount + zellePaymentsAmount;

  const paymentTypes = [
    {
      title: 'University Payment Requests',
      icon: Building2,
      count: universityRequestsCount,
      amount: universityRequestsAmount,
      color: 'blue',
      link: '/admin/dashboard/payments?tab=university-requests',
      description: 'University payout requests awaiting approval',
    },
    {
      title: 'Affiliate Payment Requests',
      icon: Users,
      count: affiliateRequestsCount,
      amount: affiliateRequestsAmount,
      color: 'purple',
      link: '/admin/dashboard/payments?tab=affiliate-requests',
      description: 'Affiliate commissions awaiting payout',
    },
    {
      title: 'Zelle Payment Verifications',
      icon: CreditCard,
      count: zellePaymentsCount,
      amount: zellePaymentsAmount,
      color: 'orange',
      link: '/admin/dashboard/payments?tab=zelle',
      description: 'Zelle payments awaiting verification',
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Se não há pagamentos pendentes, não exibe nada ou exibe uma mensagem muito discreta
  if (totalPending === 0) {
    return null; // Ou mostrar uma mensagem muito pequena se preferir
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pending Payment Approvals</h3>
              <p className="text-sm text-slate-600">
                {totalPending} payment{totalPending !== 1 ? 's' : ''} requiring approval • {formatCurrency(totalAmount)} total
              </p>
            </div>
          </div>
          <Link
            to="/admin/dashboard/payments"
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Review All
          </Link>
        </div>
      </div>

      {/* Payment Types List */}
      <div className="p-6 space-y-4">
        {paymentTypes.map((type, index) => {
          const Icon = type.icon;
          const hasItems = type.count > 0;

          if (!hasItems) return null; // Só mostra tipos que têm itens pendentes

          return (
            <Link
              key={index}
              to={type.link}
              className="group flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-300 bg-gradient-to-r from-white to-slate-50"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${
                  type.color === 'blue' ? 'from-blue-500 to-blue-600' :
                  type.color === 'purple' ? 'from-purple-500 to-purple-600' :
                  'from-orange-500 to-orange-600'
                } rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">{type.title}</h4>
                  <p className="text-sm text-slate-600">{type.description}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end space-x-3 mb-2">
                  <div className={`px-3 py-1 ${
                    type.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                    type.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                    'bg-orange-100 text-orange-700'
                  } rounded-full text-sm font-medium`}>
                    {type.count} pending
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatCurrency(type.amount)}
                  </div>
                </div>
                <div className="flex items-center justify-end text-xs text-slate-500 uppercase tracking-wide font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  Requires Action
                  <ArrowUpRight className="h-4 w-4 ml-2 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default PendingPaymentsSummary;
