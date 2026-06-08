import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { clearAgencyCache } from '../components/AuthRedirect';

const AgencyTermsAndConditions: React.FC = () => {
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
        .eq('term_type', 'agency_terms')
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
              Agency Partnership Agreement
            </h2>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">1. B2B Agency Partnership</h3>
            <p class="text-gray-600 mb-4">
              By joining Matrícula USA as a partner agency, you agree to act as an official student recruitment partner. We provide the technology infrastructure, support, and university partnerships to assist your clients with their educational goals in the United States.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Commission Rules</h3>
            <p class="text-gray-600 mb-4">
              Commissions are configured per agency and per fee type (selection process, application, placement, reinstatement, control fee) under your account settings. All commissions will be paid in accordance with the established rules approved by the administration.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Student Privacy and Data Sharing</h3>
            <p class="text-gray-600 mb-4">
              You are responsible for obtaining proper consent from students before registering their information or uploading documents to the Matrícula USA platform. Student data must be used strictly for their application processes.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Professional Ethics</h3>
            <p class="text-gray-600 mb-4">
              Partner agencies must represent Matrícula USA and its partner universities truthfully, transparently, and professionally. Providing false information or making unauthorized guarantees to students regarding visas or admissions is strictly prohibited.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
            <p class="text-gray-600 mb-4">
              By confirming your agency participation on the Matrícula USA platform, your agency acknowledges that it has read, understood, and agrees to all the terms above.
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
              Agency Partnership Agreement
            </h2>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">1. B2B Agency Partnership</h3>
            <p class="text-gray-600 mb-4">
              By joining Matrícula USA as a partner agency, you agree to act as an official student recruitment partner. We provide the technology infrastructure, support, and university partnerships to assist your clients with their educational goals in the United States.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Commission Rules</h3>
            <p class="text-gray-600 mb-4">
              Commissions are configured per agency and per fee type (selection process, application, placement, reinstatement, control fee) under your account settings. All commissions will be paid in accordance with the established rules approved by the administration.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Student Privacy and Data Sharing</h3>
            <p class="text-gray-600 mb-4">
              You are responsible for obtaining proper consent from students before registering their information or uploading documents to the Matrícula USA platform. Student data must be used strictly for their application processes.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Professional Ethics</h3>
            <p class="text-gray-600 mb-4">
              Partner agencies must represent Matrícula USA and its partner universities truthfully, transparently, and professionally. Providing false information or making unauthorized guarantees to students regarding visas or admissions is strictly prohibited.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
            <p class="text-gray-600 mb-4">
              By confirming your agency participation on the Matrícula USA platform, your agency acknowledges that it has read, understood, and agrees to all the terms above.
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

    if (user && user.role !== 'affiliate_admin') {
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
      const { data: agency, error } = await supabase
        .from('affiliate_admins')
        .select('terms_accepted, onboarding_completed, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking terms:', error);
        return;
      }

      if (agency && agency.terms_accepted) {
        // User already accepted terms, redirect to appropriate page
        if (agency.onboarding_completed) {
          if (agency.is_active) {
            navigate('/agency/dashboard');
          } else {
            navigate('/agency/pending-approval');
          }
        } else {
          navigate('/agency/onboarding');
        }
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
      // Record acceptance of agency terms
      const agencyTerms = await getLatestActiveTerm('agency_terms');
      if (agencyTerms) {
        await recordTermAcceptance(agencyTerms.id, 'agency_terms');
      }

      // Check if agency record exists
      const { data: existingAgency, error: checkError } = await supabase
        .from('affiliate_admins')
        .select('id, terms_accepted, onboarding_completed, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingAgency) {
        // Update existing record to accept terms
        const { error: updateError } = await supabase
          .from('affiliate_admins')
          .update({ 
            terms_accepted: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Invalidate cache so AuthRedirect fetches fresh state after navigation
        clearAgencyCache(user.id);

        // Redirect based on onboarding status
        if (existingAgency.onboarding_completed) {
          if (existingAgency.is_active) {
            navigate('/agency/dashboard');
          } else {
            navigate('/agency/pending-approval');
          }
        } else {
          navigate('/agency/onboarding');
        }
      } else {
        // Create new agency record if it doesn't exist
        const { error: insertError } = await supabase
          .from('affiliate_admins')
          .insert({
            user_id: user.id,
            company_name: user.name || 'New Agency',
            terms_accepted: true,
            onboarding_completed: false,
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        // Invalidate cache so AuthRedirect fetches fresh state after navigation
        clearAgencyCache(user.id);

        // Redirect to onboarding setup
        navigate('/agency/onboarding');
      }
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
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <img src="/logo.png.png" alt="Matrícula USA" className="h-12 w-auto mb-4" />
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Agency Terms and Conditions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please review and accept our terms to activate your B2B partner agency profile on Matrícula USA platform.
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
                I have read and agree to the Agency Terms and Conditions. I confirm that I am authorized to bind my agency to this agreement and that all information provided will be accurate and up-to-date.
              </label>
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
                Please read and accept the terms to continue with your agency registration.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyTermsAndConditions;
