import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface BankAccountValidatorProps {
  routingNumber: string;
  accountNumber: string;
  taxId: string;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

const BankAccountValidator: React.FC<BankAccountValidatorProps> = ({
  routingNumber,
  accountNumber,
  taxId,
  onValidationChange
}) => {
  const [validationResults, setValidationResults] = useState<{
    routingNumber: { isValid: boolean; message: string };
    accountNumber: { isValid: boolean; message: string };
    taxId: { isValid: boolean; message: string };
  }>({
    routingNumber: { isValid: false, message: '' },
    accountNumber: { isValid: false, message: '' },
    taxId: { isValid: true, message: '' }
  });

  useEffect(() => {
    validateRoutingNumber(routingNumber);
  }, [routingNumber]);

  useEffect(() => {
    validateAccountNumber(accountNumber);
  }, [accountNumber]);

  useEffect(() => {
    if (taxId) {
      validateTaxId(taxId);
    } else {
      setValidationResults(prev => ({
        ...prev,
        taxId: { isValid: true, message: '' }
      }));
    }
  }, [taxId]);

  useEffect(() => {
    const allValid = Object.values(validationResults).every(result => result.isValid);
    const errors = Object.values(validationResults)
      .filter(result => !result.isValid && result.message)
      .map(result => result.message);
    
    onValidationChange(allValid, errors);
  }, [validationResults, onValidationChange]);

  const validateRoutingNumber = (routingNumber: string) => {
    if (!routingNumber) {
      setValidationResults(prev => ({
        ...prev,
        routingNumber: { isValid: false, message: 'Routing number is required' }
      }));
      return;
    }

    if (!/^\d{9}$/.test(routingNumber)) {
      setValidationResults(prev => ({
        ...prev,
        routingNumber: { isValid: false, message: 'Routing number must be exactly 9 digits' }
      }));
      return;
    }

    // ABA routing number validation algorithm
    const digits = routingNumber.split('').map(Number);
    const checksum = 
      (3 * digits[0] + 7 * digits[1] + digits[2] + 
       3 * digits[3] + 7 * digits[4] + digits[5] + 
       3 * digits[6] + 7 * digits[7] + digits[8]) % 10;

    if (checksum === 0) {
      setValidationResults(prev => ({
        ...prev,
        routingNumber: { isValid: true, message: 'Valid routing number' }
      }));
    } else {
      setValidationResults(prev => ({
        ...prev,
        routingNumber: { isValid: false, message: 'Invalid routing number checksum' }
      }));
    }
  };

  const validateAccountNumber = (accountNumber: string) => {
    if (!accountNumber) {
      setValidationResults(prev => ({
        ...prev,
        accountNumber: { isValid: false, message: 'Account number is required' }
      }));
      return;
    }

    if (accountNumber.length < 4) {
      setValidationResults(prev => ({
        ...prev,
        accountNumber: { isValid: false, message: 'Account number must be at least 4 digits' }
      }));
      return;
    }

    if (accountNumber.length > 17) {
      setValidationResults(prev => ({
        ...prev,
        accountNumber: { isValid: false, message: 'Account number cannot exceed 17 digits' }
      }));
      return;
    }

    if (!/^\d+$/.test(accountNumber)) {
      setValidationResults(prev => ({
        ...prev,
        accountNumber: { isValid: false, message: 'Account number must contain only digits' }
      }));
      return;
    }

    setValidationResults(prev => ({
      ...prev,
      accountNumber: { isValid: true, message: 'Valid account number' }
    }));
  };

  const validateTaxId = (taxId: string) => {
    if (!taxId) {
      setValidationResults(prev => ({
        ...prev,
        taxId: { isValid: true, message: '' }
      }));
      return;
    }

    // EIN format: XX-XXXXXXX (9 digits with optional dash)
    const einPattern = /^\d{2}-\d{7}$/;
    // SSN format: XXX-XX-XXXX (9 digits with dashes)
    const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
    // 9 digits without dashes
    const nineDigitsPattern = /^\d{9}$/;

    if (einPattern.test(taxId) || ssnPattern.test(taxId) || nineDigitsPattern.test(taxId)) {
      setValidationResults(prev => ({
        ...prev,
        taxId: { isValid: true, message: 'Valid tax ID format' }
      }));
    } else {
      setValidationResults(prev => ({
        ...prev,
        taxId: { isValid: false, message: 'Tax ID must be in EIN (XX-XXXXXXX) or SSN (XXX-XX-XXXX) format' }
      }));
    }
  };

  const getValidationIcon = (isValid: boolean) => {
    if (isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getValidationColor = (isValid: boolean) => {
    return isValid ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Bank Account Validation</p>
            <p>We validate your bank account information in real-time to ensure accuracy and prevent errors.</p>
          </div>
        </div>
      </div>

      {/* Routing Number Validation */}
      <div className="flex items-center space-x-3">
        {getValidationIcon(validationResults.routingNumber.isValid)}
        <div className="flex-1">
          <span className={`text-sm font-medium ${getValidationColor(validationResults.routingNumber.isValid)}`}>
            Routing Number: {validationResults.routingNumber.message || 'Enter routing number'}
          </span>
        </div>
      </div>

      {/* Account Number Validation */}
      <div className="flex items-center space-x-3">
        {getValidationIcon(validationResults.accountNumber.isValid)}
        <div className="flex-1">
          <span className={`text-sm font-medium ${getValidationColor(validationResults.accountNumber.isValid)}`}>
            Account Number: {validationResults.accountNumber.message || 'Enter account number'}
          </span>
        </div>
      </div>

      {/* Tax ID Validation */}
      {taxId && (
        <div className="flex items-center space-x-3">
          {getValidationIcon(validationResults.taxId.isValid)}
          <div className="flex-1">
            <span className={`text-sm font-medium ${getValidationColor(validationResults.taxId.isValid)}`}>
              Tax ID: {validationResults.taxId.message || 'Valid tax ID format'}
            </span>
          </div>
        </div>
      )}

      {/* Overall Status */}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center space-x-3">
          {Object.values(validationResults).every(result => result.isValid) ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          <span className={`text-sm font-medium ${
            Object.values(validationResults).every(result => result.isValid) 
              ? 'text-green-600' 
              : 'text-yellow-600'
          }`}>
            {Object.values(validationResults).every(result => result.isValid)
              ? 'All bank account information is valid'
              : 'Please fix validation errors above'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default BankAccountValidator;
