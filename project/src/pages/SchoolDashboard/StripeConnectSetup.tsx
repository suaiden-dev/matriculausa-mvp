import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Shield,
  DollarSign,
  Info,
  Settings,
  Building
} from 'lucide-react';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

interface StripeConnectStatus {
  is_connected: boolean;
  account_id?: string;
  account_name?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_completed: boolean;
}

const StripeConnectSetup: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (university) {
      fetchStripeConnectStatus();
    }
  }, [university]);

  const fetchStripeConnectStatus = async () => {
    if (!university) return;

    try {
      const { data, error } = await supabase
        .from('university_fee_configurations')
        .select('*')
        .eq('university_id', university.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Stripe Connect status:', error);
        return;
      }

      if (data) {
        setConnectStatus({
          is_connected: !!data.stripe_connect_account_id,
          account_id: data.stripe_connect_account_id,
          account_name: data.stripe_account_name,
          charges_enabled: data.stripe_charges_enabled || false,
          payouts_enabled: data.stripe_payouts_enabled || false,
          requirements_completed: data.stripe_requirements_completed || false
        });
      } else {
        setConnectStatus({
          is_connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements_completed: false
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  };

  const initiateStripeConnect = async () => {
    if (!university) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('initiate-stripe-connect', {
        body: {
          university_id: university.id,
          return_url: `${window.location.origin}/school/dashboard/stripe-connect/callback`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Unable to get Stripe authorization URL');
      }
    } catch (error: any) {
      setError(error.message || 'Error connecting with Stripe');
    } finally {
      setLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    if (!university) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-stripe-connect-status', {
        body: { university_id: university.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchStripeConnectStatus();
    } catch (error: any) {
      setError(error.message || 'Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const disconnectStripe = async () => {
    if (!university || !connectStatus?.is_connected) return;

    if (!confirm('Are you sure you want to disconnect your Stripe account? This will disable automatic transfers.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('disconnect-stripe-connect', {
        body: { university_id: university.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchStripeConnectStatus();
    } catch (error: any) {
      setError(error.message || 'Error disconnecting Stripe');
    } finally {
      setLoading(false);
    }
  };

  if (!university) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to access Stripe Connect"
      description="Finish setting up your university profile to connect with Stripe and receive payments"
    >
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Stripe Connect Setup
              </h1>
            </div>
            <p className="text-slate-600 text-sm sm:text-base max-w-3xl">
              Connect your Stripe account to automatically receive application fee payments and manage your financial operations securely.
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 mb-6 sm:mb-8">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Connection Status
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Monitor your Stripe account integration status
                  </p>
                </div>
                <button
                  onClick={refreshStripeStatus}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              {connectStatus?.is_connected ? (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <span className="text-green-800 font-semibold">
                        Stripe Account Connected
                      </span>
                      <p className="text-green-700 text-sm">
                        Your account is successfully integrated with Stripe
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Building className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Account ID</span>
                      </div>
                      <p className="text-sm text-slate-600 font-mono bg-white px-3 py-2 rounded border">
                        {connectStatus.account_id}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Account Status</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Charges</span>
                          <div className="flex items-center space-x-2">
                            {connectStatus.charges_enabled ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className={`text-sm font-medium ${
                              connectStatus.charges_enabled ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {connectStatus.charges_enabled ? 'Enabled' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Transfers</span>
                          <div className="flex items-center space-x-2">
                            {connectStatus.payouts_enabled ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className={`text-sm font-medium ${
                              connectStatus.payouts_enabled ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {connectStatus.payouts_enabled ? 'Enabled' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={disconnectStripe}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                    >
                      Disconnect Account
                    </button>
                    <a
                      href="https://dashboard.stripe.com/connect/accounts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Stripe Dashboard</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CreditCard className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">
                    No Stripe Account Connected
                  </h3>
                  <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm sm:text-base">
                    Connect your Stripe account to automatically receive application fee payments. 
                    You will be redirected to Stripe to authorize the connection securely.
                  </p>
                  <button
                    disabled
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-400 text-white font-medium rounded-lg cursor-not-allowed opacity-60"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span>Under Development</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 mb-6 sm:mb-8">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Integration Benefits
              </h2>
              <p className="text-slate-500 text-sm">
                Why connect your Stripe account with our platform
              </p>
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Automatic Transfers</h3>
                  <p className="text-sm text-slate-600">
                    Receive application fees directly to your bank account without manual intervention
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Secure Integration</h3>
                  <p className="text-sm text-slate-600">
                    Your Stripe account, your data, complete control over your financial operations
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Info className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Full Transparency</h3>
                  <p className="text-sm text-slate-600">
                    Track all payments and transactions in your Stripe dashboard with real-time updates
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700 font-medium">Error</span>
              </div>
              <p className="text-red-600 mt-2 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default StripeConnectSetup;
