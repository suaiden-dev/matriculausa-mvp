import React, { useState, useEffect } from 'react';
import { XCircle, AlertCircle, DollarSign, Loader2 } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../../../../lib/supabase';

type CreateUniversityPaymentModalProps = {
  isOpen: boolean;
  universities: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (data: {
    universityId: string;
    amount: number;
    payoutMethod: 'zelle' | 'bank_transfer' | 'stripe';
    payoutDetails: Record<string, any>;
  }) => Promise<void>;
  loading?: boolean;
};

const CreateUniversityPaymentModal: React.FC<CreateUniversityPaymentModalProps> = ({
  isOpen,
  universities,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'zelle' | 'bank_transfer' | 'stripe'>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Calcular saldo disponível quando uma universidade for selecionada
  useEffect(() => {
    const calculateUniversityBalance = async () => {
      if (!selectedUniversityId) {
        setAvailableBalance(null);
        return;
      }

      try {
        setLoadingBalance(true);
        
        // 1. Buscar todas as bolsas da universidade
        const { data: scholarships, error: scholarshipsError } = await supabase
          .from('scholarships')
          .select('id, application_fee_amount')
          .eq('university_id', selectedUniversityId);

        if (scholarshipsError) {
          console.error('Error fetching scholarships:', scholarshipsError);
          setAvailableBalance(0);
          return;
        }

        const scholarshipIds = (scholarships || []).map(s => s.id);
        if (scholarshipIds.length === 0) {
          setAvailableBalance(0);
          return;
        }

        // 2. Buscar aplicações pagas (excluindo Current Students Scholarship)
        const { data: paidApplications, error: paidAppsError } = await supabase
          .from('scholarship_applications')
          .select(`
            id,
            student_id,
            scholarship_id,
            is_application_fee_paid,
            scholarships!inner (
              id,
              title,
              application_fee_amount
            )
          `)
          .eq('is_application_fee_paid', true)
          .in('scholarship_id', scholarshipIds)
          .neq('scholarships.title', 'Current Students Scholarship');

        if (paidAppsError) {
          console.error('Error fetching paid applications:', paidAppsError);
          setAvailableBalance(0);
          return;
        }

        // 3. Buscar dados dos estudantes para calcular dependentes
        const studentIds = Array.from(new Set((paidApplications || []).map((a: any) => a.student_id).filter(Boolean)));
        let studentsMap: Record<string, any> = {};
        if (studentIds.length > 0) {
          const { data: students } = await supabase
            .from('user_profiles')
            .select('id, dependents, system_type')
            .in('id', studentIds);
          (students || []).forEach((s: any) => { studentsMap[s.id] = s; });
        }

        // 4. Calcular totalRevenue (mesma lógica do useUniversityFinancialData)
        const totalRevenue = (paidApplications || []).reduce((sum: number, app: any) => {
          const scholarship = app.scholarships;
          const feeAmount = scholarship?.application_fee_amount;
          if (feeAmount) {
            const numericFee = typeof feeAmount === 'string' ? parseFloat(feeAmount) : feeAmount;
            const student = studentsMap[app.student_id];
            const deps = Number(student?.dependents) || 0;
            const systemType = (student?.system_type as any) || 'legacy';
            const withDeps = systemType === 'legacy' && deps > 0 ? numericFee + deps * 100 : numericFee;
            return sum + withDeps;
          }
          return sum;
        }, 0);

        // 5. Buscar payment requests de TODAS as universidades do mesmo usuário (mesma lógica do dashboard da universidade)
        // Primeiro, buscar o user_id da universidade selecionada
        const { data: selectedUniversity, error: universityError } = await supabase
          .from('universities')
          .select('user_id')
          .eq('id', selectedUniversityId)
          .single();

        if (universityError || !selectedUniversity?.user_id) {
          console.error('Error fetching university user_id:', universityError);
          setAvailableBalance(0);
          return;
        }

        // Buscar todas as universidades do mesmo usuário
        const { data: userUniversities, error: userUnisError } = await supabase
          .from('universities')
          .select('id')
          .eq('user_id', selectedUniversity.user_id);

        if (userUnisError) {
          console.error('Error fetching user universities:', userUnisError);
          setAvailableBalance(0);
          return;
        }

        const universityIds = (userUniversities || []).map(u => u.id);
        console.log('🔍 [Modal] Fetching payment requests for universities:', {
          selectedUniversityId,
          userUniversities: universityIds,
          user_id: selectedUniversity.user_id
        });

        // Buscar payment requests de todas as universidades do usuário
        const { data: paymentRequests, error: requestsError } = await supabase
          .from('university_payout_requests')
          .select('status, amount_usd')
          .in('university_id', universityIds)
          .eq('request_type', 'university_payment');

        console.log('📊 [Modal] Payment requests query result:', {
          selectedUniversityId,
          universityIds,
          paymentRequests,
          requestsError,
          count: paymentRequests?.length || 0
        });

        if (requestsError) {
          console.error('Error fetching payment requests:', requestsError);
          setAvailableBalance(0);
          return;
        }

        // 6. Calcular totalPaidOut, totalApproved e totalPending (mesma lógica do dashboard da universidade)
        const totalPaidOut = (paymentRequests || [])
          .filter((r: any) => r.status === 'paid')
          .reduce((sum: number, r: any) => sum + Number(r.amount_usd || 0), 0);

        const totalApproved = (paymentRequests || [])
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + Number(r.amount_usd || 0), 0);

        const totalPending = (paymentRequests || [])
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + Number(r.amount_usd || 0), 0);

        // Debug logs
        console.log('💰 [Modal] Balance Calculation:', {
          totalRevenue,
          paymentRequests: paymentRequests || [],
          totalPaidOut,
          totalApproved,
          totalPending,
          totalDeducted: totalPaidOut + totalApproved + totalPending
        });

        // 7. Calcular availableBalance (mesma fórmula do dashboard da universidade)
        // availableBalance = totalRevenue - totalPaidOut - totalApproved - totalPending
        const balance = Math.max(0, totalRevenue - totalPaidOut - totalApproved - totalPending);
        setAvailableBalance(balance);

      } catch (error: any) {
        console.error('Error calculating university balance:', error);
        setAvailableBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };

    calculateUniversityBalance();
  }, [selectedUniversityId]);

  if (!isOpen) return null;

  const isPayoutDetailsValid = () => {
    if (payoutMethod === 'bank_transfer') {
      return payoutDetails.bank_name && 
             payoutDetails.account_name && 
             payoutDetails.routing_number && 
             payoutDetails.account_number;
    }
    if (payoutMethod === 'zelle') {
      return (payoutDetails.zelle_email || payoutDetails.zelle_phone) && 
             !(payoutDetails.zelle_email && payoutDetails.zelle_phone);
    }
    if (payoutMethod === 'stripe') {
      return payoutDetails.stripe_email;
    }
    return true;
  };

  const isFormValid = () => {
    const hasValidFields = selectedUniversityId && 
           amount > 0 && 
           isPayoutDetailsValid();
    
    // Verificar se o valor não excede o saldo disponível
    if (hasValidFields && availableBalance !== null) {
      return amount <= availableBalance;
    }
    
    return hasValidFields;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      if (availableBalance !== null && amount > availableBalance) {
        setError(`Cannot register payment: Amount ($${amount.toFixed(2)}) exceeds available balance ($${availableBalance.toFixed(2)})`);
      } else {
        setError('Please fill in all required fields');
      }
      return;
    }

    setError(null);
    try {
      await onSubmit({
        universityId: selectedUniversityId,
        amount,
        payoutMethod,
        payoutDetails,
      });
      // Reset form on success
      setSelectedUniversityId('');
      setAmount(0);
      setPayoutMethod('zelle');
      setPayoutDetails({});
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Register Payment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              University <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedUniversityId}
              onChange={(e) => setSelectedUniversityId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a university</option>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>
            
            {/* Exibir saldo disponível quando uma universidade for selecionada */}
            {selectedUniversityId && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Available Balance:</span>
                  </div>
                  {loadingBalance ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Calculating...</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-blue-600">
                      {availableBalance !== null 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(availableBalance)
                        : '$0.00'}
                    </span>
                  )}
                </div>
                {availableBalance !== null && availableBalance < amount && amount > 0 && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ Requested amount (${amount.toFixed(2)}) exceeds available balance (${availableBalance.toFixed(2)}). Payment cannot be registered.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount in USD"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={payoutMethod}
              onChange={(e) => {
                setPayoutMethod(e.target.value as 'zelle' | 'bank_transfer' | 'stripe');
                setPayoutDetails({});
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="zelle">Zelle</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          {/* Dynamic fields based on payout method */}
          {payoutMethod === 'zelle' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zelle Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Zelle email"
                  value={payoutDetails.zelle_email || ''}
                  onChange={(e) => setPayoutDetails({
                    ...payoutDetails,
                    zelle_email: e.target.value,
                    zelle_phone: '',
                  })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">OR use phone number below (not both)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zelle Phone <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  international
                  defaultCountry="US"
                  addInternationalOption={false}
                  value={payoutDetails.zelle_phone || ''}
                  onChange={(value) => {
                    setPayoutDetails({
                      ...payoutDetails,
                      zelle_phone: value || '',
                      zelle_email: '',
                    });
                  }}
                  style={{
                    '--PhoneInputCountryFlag-height': '1.2em',
                    '--PhoneInputCountrySelectArrow-opacity': '0.8',
                    '--PhoneInput-color--focus': '#2563eb'
                  }}
                  className={`phone-input-custom w-full pl-4 pr-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-sm ${
                    !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={payoutDetails.account_name || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, account_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {payoutMethod === 'bank_transfer' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Bank name"
                  value={payoutDetails.bank_name || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, bank_name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !payoutDetails.bank_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={payoutDetails.account_name || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, account_name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !payoutDetails.account_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Routing number"
                  value={payoutDetails.routing_number || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, routing_number: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !payoutDetails.routing_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Account number"
                  value={payoutDetails.account_number || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, account_number: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !payoutDetails.account_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SWIFT / IBAN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="SWIFT / IBAN"
                  value={payoutDetails.swift || payoutDetails.iban || ''}
                  onChange={(e) => setPayoutDetails({
                    ...payoutDetails,
                    swift: e.target.value,
                    iban: e.target.value,
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {payoutMethod === 'stripe' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Stripe email"
                  value={payoutDetails.stripe_email || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, stripe_email: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !payoutDetails.stripe_email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Account ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Stripe account ID"
                  value={payoutDetails.stripe_account_id || ''}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, stripe_account_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isFormValid() && !loading
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Registering...' : 'Register Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CreateUniversityPaymentModal);

