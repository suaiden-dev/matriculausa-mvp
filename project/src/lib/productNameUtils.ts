import { TFunction } from 'react-i18next';

/**
 * Obtém o nome traduzido de um produto baseado no tipo de taxa
 */
export const getTranslatedProductName = (feeType: string, t: TFunction): string => {
  const productNameMap: { [key: string]: string } = {
    'selection_process': t('productNames.selectionProcessFee'),
    'application_fee': t('productNames.applicationFee'),
    'scholarship_fee': t('productNames.scholarshipFee'),
    'enrollment_fee': t('productNames.collegeEnrollmentFee'),
    'i20_control_fee': t('productNames.i20ControlFee'),
  };

  return productNameMap[feeType] || t('productNames.applicationFee');
};

/**
 * Obtém o nome traduzido de um produto baseado no productId do Stripe
 */
export const getTranslatedProductNameByProductId = (productId: string, t: TFunction): string => {
  const productIdMap: { [key: string]: string } = {
    'selectionProcess': t('productNames.selectionProcessFee'),
    'applicationFee': t('productNames.applicationFee'),
    'scholarshipFee': t('productNames.scholarshipFee'),
    'controlFee': t('productNames.i20ControlFee'),
  };

  return productIdMap[productId] || t('productNames.applicationFee');
};
