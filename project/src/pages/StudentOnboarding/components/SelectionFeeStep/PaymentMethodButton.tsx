import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentMethod } from './types';
import PayerAlternativeForm, { PayerInfo } from '../../../../components/PayerAlternativeForm';

interface PaymentMethodButtonProps {
  method: {
    id: PaymentMethod;
    name: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    requiresVerification?: boolean;
  };
  isSelected: boolean;
  isProcessing: boolean;
  isDisabled: boolean;
  cardAmountWithFees: number;
  pixAmountWithFees: number;
  computedBasePrice: number;
  exchangeRate: number | null;
  isBlocked: boolean;
  pendingPayment: any;
  onCheckout: (methodId: PaymentMethod) => void;
  payerInfo: PayerInfo | null;
  onPayerInfoChange: (info: PayerInfo | null) => void;
  t: (key: string) => string;
}

export const PaymentMethodButton: React.FC<PaymentMethodButtonProps> = ({
  method,
  isSelected,
  isProcessing,
  isDisabled,
  cardAmountWithFees,
  pixAmountWithFees,
  computedBasePrice,
  exchangeRate,
  isBlocked,
  pendingPayment,
  onCheckout,
  onPayerInfoChange,
  t,
}) => {
  const Icon = method.icon;

  return (
    <div className="w-full flex flex-col">
      <button
        onClick={() => onCheckout(method.id)}
        disabled={isDisabled}
        className={`w-full px-4 py-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${
          isSelected
            ? 'border-blue-100 bg-blue-50 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
            : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
        } ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'}`}
      >
        <div className="flex items-center gap-3 sm:gap-5 relative z-10">
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 transition-transform duration-500 group-hover/method:scale-110 shadow-sm">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-700" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col w-full">
              <div className="flex items-end justify-between w-full">
                <h4 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
                  {method.name}
                </h4>

                <div className="flex items-end gap-3 flex-shrink-0">
                  {method.id === 'stripe' && cardAmountWithFees > 0 && (
                    <span className="text-gray-900 text-lg font-black">
                      ${cardAmountWithFees.toFixed(2)}
                    </span>
                  )}
                  {method.id === 'parcelow' && computedBasePrice > 0 && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-900 mb-0.5 block uppercase tracking-widest leading-tight">
                        {t('selectionFeeStep.main.parcelowInstallments')}
                      </span>
                      <span className="text-gray-900 text-lg font-black">
                        ${computedBasePrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {method.id === 'pix' && pixAmountWithFees > 0 && exchangeRate && (
                    <span className="text-gray-900 text-lg font-black">
                      R$ {pixAmountWithFees.toFixed(2)}
                    </span>
                  )}
                  {method.id === 'zelle' && computedBasePrice > 0 && (
                    <span className="text-gray-900 text-lg font-black">
                      ${computedBasePrice.toFixed(2)}
                    </span>
                  )}

                  {isProcessing && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {isSelected && !isProcessing && (
                    <div className="bg-blue-500 rounded-full p-1 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-1">
                {method.id === 'stripe' && (
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide leading-tight">
                    {t('selectionFeeStep.main.processingFees.card')}
                  </span>
                )}
                {method.id === 'pix' && (
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide leading-tight">
                    {t('selectionFeeStep.main.processingFees.pix')}
                  </span>
                )}
                {method.id === 'parcelow' && (
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide leading-tight">
                    {t('selectionFeeStep.main.processingFees.parcelow')}
                  </span>
                )}
                {method.id === 'zelle' && (
                  <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wide leading-tight">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {t('selectionFeeStep.main.processingFees.zelle')}
                  </span>
                )}
              </div>

              {isDisabled && isBlocked && pendingPayment && method.id !== 'zelle' && (
                <div className="mt-3 flex items-center space-x-2 bg-amber-50 border border-amber-100 w-fit px-2 py-1 rounded-lg">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                    {t('selectionFeeStep.main.zelleUnavailable')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>

      {method.id === 'parcelow' && isSelected && (
        <div className="mt-4 animate-fadeIn relative z-0">
          <div className="bg-white border border-gray-100 rounded-2xl p-1 shadow-sm">
            <PayerAlternativeForm
              onPayerInfoChange={onPayerInfoChange}
              onPayButtonClick={() => onCheckout('parcelow')}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      )}
    </div>
  );
};
