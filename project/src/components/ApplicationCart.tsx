import React, { useState } from 'react';
import { X, ShoppingCart, DollarSign, Calendar, Building } from 'lucide-react';
import { useApplicationStore } from '../stores/applicationStore';
import { StripeCheckout } from './StripeCheckout';

interface ApplicationCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApplicationCart: React.FC<ApplicationCartProps> = ({ isOpen, onClose }) => {
  const { selectedScholarships, removeScholarship, clearScholarships, getSelectedCount } = useApplicationStore();
  const [showCheckout, setShowCheckout] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCheckoutSuccess = () => {
    // Limpar o carrinho após o pagamento bem-sucedido
    clearScholarships();
    onClose();
    // Redirecionar para a página de sucesso ou dashboard
    window.location.href = '/checkout/success';
  };

  const handleCheckoutError = (error: string) => {
    console.error('Checkout error:', error);
    // Aqui você pode adicionar uma notificação de erro
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">Application Cart</h2>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
              {getSelectedCount()} {getSelectedCount() === 1 ? 'scholarship' : 'scholarships'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedScholarships.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">Your cart is empty</h3>
              <p className="text-slate-500">Add scholarships to your cart to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedScholarships.map((scholarship) => {
                const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                return (
                  <div key={scholarship.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {scholarship.isExclusive && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                              Exclusive
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {scholarship.fieldOfStudy}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
                          {scholarship.title}
                        </h3>
                        
                        <div className="flex items-center text-sm text-slate-600 mb-2">
                          <Building className="h-4 w-4 mr-2" />
                          {scholarship.schoolName}
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center text-green-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="font-bold">{formatAmount(scholarship.amount)}</span>
                          </div>
                          <div className="flex items-center text-slate-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeScholarship(scholarship.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors ml-4"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedScholarships.length > 0 && (
          <div className="p-6 border-t border-slate-200">
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-full text-sm font-medium"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {showCheckout && (
        <StripeCheckout
          productId="APPLICATION_FEE"
          buttonText="Pay Application Fee"
          className="flex-1 py-3 px-4"
          paymentType="application_fee"
          onSuccess={handleCheckoutSuccess}
          onError={handleCheckoutError}
        />
      )}
    </div>
  );
};

export default ApplicationCart; 