import React from 'react';
import { PaymentMethodSelectorDrawer } from './PaymentMethodSelectorDrawer';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { useAuth } from '../hooks/useAuth';

interface I20ControlFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaymentMethod: 'stripe' | 'zelle' | 'pix' | null;
  onPaymentMethodSelect: (method: 'stripe' | 'zelle' | 'pix') => void;
}

export const I20ControlFeeModal: React.FC<I20ControlFeeModalProps> = ({
  isOpen,
  onClose,
  selectedPaymentMethod,
  onPaymentMethodSelect,
}) => {
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { i20ControlFee, hasSellerPackage } = useDynamicFees();
  
  // Calculate the amount
  const amount = hasSellerPackage && i20ControlFee 
    ? parseFloat(i20ControlFee.replace('$', '')) 
    : getFeeAmount('i20_control_fee');

  return (
    <PaymentMethodSelectorDrawer
      isOpen={isOpen}
      onClose={onClose}
      selectedMethod={selectedPaymentMethod}
      onMethodSelect={onPaymentMethodSelect}
      feeType="i20_control_fee"
      amount={amount}
    />
  );
};
