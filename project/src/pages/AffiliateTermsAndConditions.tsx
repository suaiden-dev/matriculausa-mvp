import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, FileText, Shield, Users } from 'lucide-react';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const AffiliateTermsAndConditions: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsContent, setTermsContent] = useState<string>('');
  const [loadingTerms, setLoadingTerms] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { recordTermAcceptance, getLatestActiveTerm } = useTermsAcceptance();

  // Load terms content from database
  const loadTermsContent = async () => {
    try {
      setLoadingTerms(true);
      const { data, error } = await supabase
        .from('application_terms')
        .select('content')
        .eq('term_type', 'affiliate_terms')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading terms:', error);
        // Fallback to default content if no terms found
        setTermsContent(`
          <div class="prose prose-gray max-w-none">
            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <svg class="h-5 w-5 mr-2 text-[#05294E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              Matrícula USA Affiliate Program Agreement
            </h2>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">1. Affiliate Program Participation</h3>
            <p class="text-gray-600 mb-4">
              By participating in the Matrícula USA affiliate program, you agree to promote our platform and services to potential students ethically and professionally.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Referral Codes and Links</h3>
            <p class="text-gray-600 mb-4">
              You will be provided with a unique referral link and code. You are responsible for the distribution of your referral code. Under no circumstances should you engage in spamming or misleading advertising.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Rewards and Commissions</h3>
            <p class="text-gray-600 mb-4">
              Affiliates earn Matrícula Coins and/or cash rewards for every successful student enrollment who registers using their referral code. Rewards are subject to verification and approval.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Intellectual Property</h3>
            <p class="text-gray-600 mb-4">
              You are granted a limited, non-exclusive, non-transferable license to use the Matrícula USA logo and promotional assets solely for marketing purposes under this program.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
            <p class="text-gray-600 mb-4">
              By confirming your participation as an affiliate, you acknowledge that you have read, understood, and agree to all the terms above.
            </p>
          </div>
        `);
        return;
      }

      if (data && data.length > 0 && data[0].content) {
        setTermsContent(data[0].content);
      } else {
        // No active terms found, use fallback content
        setTermsContent(`
          <div class="prose prose-gray max-w-none">
            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <svg class="h-5 w-5 mr-2 text-[#05294E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              Matrícula USA Affiliate Program Agreement
            </h2>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">1. Affiliate Program Participation</h3>
            <p class="text-gray-600 mb-4">
              By participating in the Matrícula USA affiliate program, you agree to promote our platform and services to potential students ethically and professionally.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Referral Codes and Links</h3>
            <p class="text-gray-600 mb-4">
              You will be provided with a unique referral link and code. You are responsible for the distribution of your referral code. Under no circumstances should you engage in spamming or misleading advertising.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Rewards and Commissions</h3>
            <p class="text-gray-600 mb-4">
              Affiliates earn Matrícula Coins and/or cash rewards for every successful student enrollment who registers using their referral code. Rewards are subject to verification and approval.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Intellectual Property</h3>
            <p class="text-gray-600 mb-4">
              You are granted a limited, non-exclusive, non-transferable license to use the Matrícula USA logo and promotional assets solely for marketing purposes under this program.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
            <p class="text-gray-600 mb-4">
              By confirming your participation as an affiliate, you acknowledge that you have read, understood, and agree to all the terms above.
            </p>
          </div>
        `);
      }
    } catch (error) {
      console.error('Error loading terms content:', error);
    } finally {
      setLoadingTerms(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated and has the right role
    if (!user && !authLoading) {
      navigate('/login');
      return;
    }

    if (user && user.role !== 'affiliate') {
      navigate('/');
      return;
    }

    // Load terms content and check if user already accepted terms
    if (user) {
      loadTermsContent();
      checkExistingTermsAcceptance();
    }
  }, [user, authLoading, navigate]);

  const checkExistingTermsAcceptance = async () => {
    if (!user) return;

    try {
      const { data: affiliateCode, error } = await supabase
        .from('affiliate_codes')
        .select('terms_accepted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking terms:', error);
        return;
      }

      if (affiliateCode && affiliateCode.terms_accepted) {
        // User already accepted terms, redirect to dashboard
        navigate('/affiliate/dashboard');
      }
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
    }
  };

  const handleAccept = async () => {
    if (!user || !accepted) return;

    setLoading(true);
    setError('');

    try {
      // Record acceptance of affiliate terms
      const affiliateTerms = await getLatestActiveTerm('affiliate_terms');
      if (affiliateTerms) {
        await recordTermAcceptance(affiliateTerms.id, 'affiliate_terms');
      }

      // Record acceptance of terms of service and privacy policy for completeness
      const termsOfService = await getLatestActiveTerm('terms_of_service');
      const privacyPolicy = await getLatestActiveTerm('privacy_policy');
      
      if (termsOfService) {
        await recordTermAcceptance(termsOfService.id, 'terms_of_service');
      }
      
      if (privacyPolicy) {
        await recordTermAcceptance(privacyPolicy.id, 'privacy_policy');
      }

      // Check if affiliate record exists
      const { data: existingCode, error: checkError } = await supabase
        .from('affiliate_codes')
        .select('id, terms_accepted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCode) {
        // Update existing record to accept terms
        const { error: updateError } = await supabase
          .from('affiliate_codes')
          .update({ 
            terms_accepted: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new affiliate code record if it doesn't exist
        // Call RPC function to generate unique code for the user
        const { error: rpcError } = await supabase
          .rpc('create_affiliate_code_for_user', { user_id_param: user.id });

        if (rpcError) throw rpcError;

        // Update terms_accepted on the newly created record
        const { error: updateError } = await supabase
          .from('affiliate_codes')
          .update({ 
            terms_accepted: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // Redirect to affiliate dashboard
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      console.error('Error accepting terms:', error);
      setError(`Error accepting terms: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img src="/logo.png.png" alt="Matrícula USA" className="h-12 w-auto cursor-pointer" onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }} />
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center bg-[#05294E] rounded-full px-6 py-2 mb-4">
            <FileText className="h-5 w-5 mr-2 text-white" />
            <span className="text-sm font-medium text-white">Affiliate Agreement</span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Terms and Conditions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please review and accept our terms to become a partner affiliate on Matrícula USA platform.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Terms Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8 max-h-[400px] md:max-h-[480px] overflow-y-auto">
            {loadingTerms ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
                <span className="ml-3 text-gray-600">Loading terms...</span>
              </div>
            ) : (
              <div 
                className="prose prose-sm prose-gray max-w-none [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: termsContent }}
              />
            )}
          </div>

          {/* Acceptance Section */}
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  id="terms-acceptance"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="h-4 w-4 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E]"
                />
              </div>
              <label htmlFor="terms-acceptance" className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to the Affiliate Terms and Conditions. I confirm that I agree to abide by the program rules and that all information provided will be accurate.
              </label>
            </div>

            {/* Benefits Highlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                Earn rewards for referrals
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2 text-blue-600" />
                Secure platform and tracking
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 mr-2 text-[#05294E]" />
                Real-time dashboard analytics
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAccept}
                disabled={!accepted || loading}
                className={`flex-1 flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                  accepted && !loading
                    ? 'bg-[#05294E] text-white hover:bg-[#05294E]/90 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept and Continue
                  </>
                )}
              </button>
              
              <button
                onClick={() => navigate('/')}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {!accepted && (
              <div className="mt-4 flex items-center text-xs text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                Please read and accept the terms to continue.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateTermsAndConditions;
