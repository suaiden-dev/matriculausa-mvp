import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  Save,
  ArrowLeft,
  Shield,
  DollarSign,
  Banknote,
  User,
  MapPin,
  FileText
} from 'lucide-react';
import { useUniversity } from '../../context/UniversityContext';
import { useAuth } from '../../hooks/useAuth';
import BankAccountValidator from '../../components/BankAccountValidator';

interface BankAccountForm {
  routing_number: string;
  account_number: string;
  account_type: 'checking' | 'savings';
  bank_name: string;
  account_holder_name: string;
  account_holder_address: string;
  tax_id: string;
}

const PaymentMethodConfiguration: React.FC = () => {
  const { user } = useAuth();
  const { university, loading, refreshUniversity } = useUniversity();
  
  const [selectedMethod, setSelectedMethod] = useState<'stripe_connect' | 'bank_transfer'>('stripe_connect');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountForm>({
    routing_number: '',
    account_number: '',
    account_type: 'checking',
    bank_name: '',
    account_holder_name: '',
    account_holder_address: '',
    tax_id: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<BankAccountForm>>({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    if (university?.default_payment_method) {
      setSelectedMethod(university.default_payment_method);
    }
  }, [university]);

  const validateBankForm = (): boolean => {
    const errors: Partial<BankAccountForm> = {};
    
    if (!bankAccountForm.routing_number) {
      errors.routing_number = 'Routing number is required';
    } else if (!/^\d{9}$/.test(bankAccountForm.routing_number)) {
      errors.routing_number = 'Routing number must be exactly 9 digits';
    }
    
    if (!bankAccountForm.account_number) {
      errors.account_number = 'Account number is required';
    }
    
    if (!bankAccountForm.bank_name) {
      errors.bank_name = 'Bank name is required';
    }
    
    if (!bankAccountForm.account_holder_name) {
      errors.account_holder_name = 'Account holder name is required';
    }
    
    if (!bankAccountForm.account_holder_address) {
      errors.account_holder_address = 'Account holder address is required';
    }
    
    if (bankAccountForm.tax_id && !/^(\d{9}|\d{3}-\d{2}-\d{4})$/.test(bankAccountForm.tax_id)) {
      errors.tax_id = 'Tax ID must be a valid EIN (9 digits) or SSN (XXX-XX-XXXX format)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBankFormChange = (field: keyof BankAccountForm, value: string) => {
    setBankAccountForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveConfiguration = async () => {
    if (selectedMethod === 'bank_transfer' && !isFormValid) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Here you would make API calls to save the configuration
      // For now, we'll simulate the process
      
      if (selectedMethod === 'bank_transfer') {
        // Save bank account information
        console.log('Saving bank account:', bankAccountForm);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update university payment method
      console.log('Updating payment method to:', selectedMethod);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMessage({
        type: 'success',
        text: 'Payment method configuration updated successfully!'
      });

      // Refresh university data
      await refreshUniversity();
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save configuration. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Payment Method Configuration</h1>
            <p className="text-slate-600 mt-2">
              Configure how your university receives payments from students
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {university && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Building className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">{university.name}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Current Method</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 capitalize">
                {university.default_payment_method?.replace('_', ' ') || 'Not configured'}
              </p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-slate-700">Status</span>
              </div>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Processing Time</span>
              </div>
              <p className="text-lg font-semibold text-slate-900">1-3 business days</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Choose Payment Method</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Connect Option */}
          <div 
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
              selectedMethod === 'stripe_connect' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setSelectedMethod('stripe_connect')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedMethod('stripe_connect')}
            aria-label="Select Stripe Connect payment method"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedMethod === 'stripe_connect' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-slate-300'
              }`}>
                {selectedMethod === 'stripe_connect' && (
                  <div className="w-full h-full rounded-full bg-white scale-75"></div>
                )}
              </div>
              <CreditCard className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Stripe Connect</h3>
            </div>
            
            <p className="text-slate-600 mb-4">
              Receive payments directly to your Stripe account with automatic transfers and real-time tracking.
            </p>
            
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Instant payment processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Automatic transfers</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Real-time dashboard</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Lower fees for high volume</span>
              </div>
            </div>
          </div>

          {/* Bank Transfer Option */}
          <div 
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
              selectedMethod === 'bank_transfer' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setSelectedMethod('bank_transfer')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedMethod('bank_transfer')}
            aria-label="Select Bank Transfer payment method"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedMethod === 'bank_transfer' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-slate-300'
              }`}>
                {selectedMethod === 'bank_transfer' && (
                  <div className="w-full h-full rounded-full bg-white scale-75"></div>
                )}
              </div>
              <Banknote className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-900">Bank Transfer</h3>
            </div>
            
            <p className="text-slate-600 mb-4">
              Receive payments via direct bank transfer to your US bank account with manual processing.
            </p>
            
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No third-party fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Direct to your bank</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Full control over transfers</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Manual processing required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Form */}
      {selectedMethod === 'bank_transfer' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Banknote className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-900">US Bank Account Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Routing Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Routing Number (ABA) *
              </label>
              <input
                type="text"
                value={bankAccountForm.routing_number}
                onChange={(e) => handleBankFormChange('routing_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.routing_number ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="123456789"
                maxLength={9}
              />
              {formErrors.routing_number && (
                <p className="text-red-500 text-sm mt-1">{formErrors.routing_number}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                9-digit routing number found on your checks or bank statement
              </p>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Number *
              </label>
              <input
                type="text"
                value={bankAccountForm.account_number}
                onChange={(e) => handleBankFormChange('account_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.account_number ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="1234567890"
              />
              {formErrors.account_number && (
                <p className="text-red-500 text-sm mt-1">{formErrors.account_number}</p>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Type *
              </label>
              <select
                value={bankAccountForm.account_type}
                onChange={(e) => handleBankFormChange('account_type', e.target.value as 'checking' | 'savings')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Select account type"
              >
                <option value="checking">Checking Account</option>
                <option value="savings">Savings Account</option>
              </select>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bank Name *
              </label>
              <input
                type="text"
                value={bankAccountForm.bank_name}
                onChange={(e) => handleBankFormChange('bank_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.bank_name ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="e.g., Chase Bank, Bank of America"
              />
              {formErrors.bank_name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.bank_name}</p>
              )}
            </div>

            {/* Account Holder Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Holder Name *
              </label>
              <input
                type="text"
                value={bankAccountForm.account_holder_name}
                onChange={(e) => handleBankFormChange('account_holder_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.account_holder_name ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="University Name or Legal Entity Name"
              />
              {formErrors.account_holder_name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.account_holder_name}</p>
              )}
            </div>

            {/* Tax ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax ID (EIN/SSN)
              </label>
              <input
                type="text"
                value={bankAccountForm.tax_id}
                onChange={(e) => handleBankFormChange('tax_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.tax_id ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="12-3456789 or 123-45-6789"
              />
              {formErrors.tax_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.tax_id}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                EIN for businesses, SSN for individuals (optional)
              </p>
            </div>
          </div>

          {/* Account Holder Address */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Account Holder Address *
            </label>
            <textarea
              value={bankAccountForm.account_holder_address}
              onChange={(e) => handleBankFormChange('account_holder_address', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.account_holder_address ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="Full address including street, city, state, and ZIP code"
            />
            {formErrors.account_holder_address && (
              <p className="text-red-500 text-sm mt-1">{formErrors.account_holder_address}</p>
            )}
          </div>

          {/* Bank Account Validator */}
          <div className="mt-6">
            <BankAccountValidator
              routingNumber={bankAccountForm.routing_number}
              accountNumber={bankAccountForm.account_number}
              taxId={bankAccountForm.tax_id}
              onValidationChange={(isValid, errors) => {
                setIsFormValid(isValid);
                // Update form errors based on validation
                const newErrors: Partial<BankAccountForm> = {};
                errors.forEach(error => {
                  if (error.includes('Routing Number')) {
                    newErrors.routing_number = error;
                  } else if (error.includes('Account Number')) {
                    newErrors.account_number = error;
                  } else if (error.includes('Tax ID')) {
                    newErrors.tax_id = error;
                  }
                });
                setFormErrors(prev => ({ ...prev, ...newErrors }));
              }}
            />
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-3">
          <Shield className="h-6 w-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Security & Privacy</h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              All bank account information is encrypted and stored securely. We use industry-standard 
              encryption protocols to protect your sensitive financial data. Your information is only 
              used for processing payments and is never shared with third parties.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSaveConfiguration}
          disabled={isLoading || (selectedMethod === 'bank_transfer' && !isFormValid)}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          message.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodConfiguration;
