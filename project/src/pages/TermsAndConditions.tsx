import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Shield, Users, AlertCircle } from 'lucide-react';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const TermsAndConditions: React.FC = () => {
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
        .eq('term_type', 'university_terms')
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
              University Partnership Agreement
            </h2>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">1. Platform Partnership</h3>
            <p class="text-gray-600 mb-4">
              By joining Matrícula USA, your institution agrees to participate in our international student recruitment platform. We provide the technology infrastructure to connect qualified international students with your academic programs.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Scholarship Management</h3>
            <p class="text-gray-600 mb-4">
              Institutions may create and manage scholarship opportunities through our platform. All scholarship information must be accurate and up to date. Institutions are responsible for honoring all scholarship commitments published on the platform.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Student Data Protection</h3>
            <p class="text-gray-600 mb-4">
              Student information shared through the Matrícula USA platform is confidential. Institutions must comply with applicable privacy laws and use student data solely for admissions and scholarship evaluation purposes.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Quality Standards</h3>
            <p class="text-gray-600 mb-4">
              Partner institutions must maintain valid accreditation and meet the quality standards required by Matrícula USA. We reserve the right to review and approve institutional profiles before they become publicly visible.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">5. Platform Fees</h3>
            <p class="text-gray-600 mb-4">
              Institutions may be subject to platform fees based on successful student placements. The fee structure will be communicated separately and confirmed in writing.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">6. Intellectual Property</h3>
            <p class="text-gray-600 mb-4">
              Institutions retain ownership of their institutional information and logos. Matrícula USA retains ownership of the platform technology, including the student matching algorithms.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">7. Termination</h3>
            <p class="text-gray-600 mb-4">
              Either party may terminate this agreement with 30 (thirty) days written notice. Upon termination, the institution will be removed from the platform, but must honor all existing commitments to students who have already enrolled.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">8. Price Exclusivity</h3>
            <p class="text-gray-600 mb-4">
              The partner institution agrees to offer exclusive pricing conditions to the Matrícula USA platform. It is not permitted to advertise or sell scholarships at lower prices outside the platform. Any similar scholarship programs offered elsewhere must be priced at least 20% higher than the scholarship published on Matrícula USA.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
            <p class="text-gray-600 mb-4">
              By confirming your participation on the Matrícula USA platform, your institution acknowledges that it has read, understood, and agrees to all the terms above.
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
              University Partnership Agreement
            </h2>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">1. Platform Partnership</h3>
            <p class="text-gray-600 mb-4">
              By joining Matrícula USA, your institution agrees to participate in our international student recruitment platform. We provide the technology infrastructure to connect qualified international students with your academic programs.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Scholarship Management</h3>
            <p class="text-gray-600 mb-4">
              Institutions may create and manage scholarship opportunities through our platform. All scholarship information must be accurate and up to date. Institutions are responsible for honoring all scholarship commitments published on the platform.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Student Data Protection</h3>
            <p class="text-gray-600 mb-4">
              Student information shared through the Matrícula USA platform is confidential. Institutions must comply with applicable privacy laws and use student data solely for admissions and scholarship evaluation purposes.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Quality Standards</h3>
            <p class="text-gray-600 mb-4">
              Partner institutions must maintain valid accreditation and meet the quality standards required by Matrícula USA. We reserve the right to review and approve institutional profiles before they become publicly visible.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">5. Platform Fees</h3>
            <p class="text-gray-600 mb-4">
              Institutions may be subject to platform fees based on successful student placements. The fee structure will be communicated separately and confirmed in writing.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">6. Intellectual Property</h3>
            <p class="text-gray-600 mb-4">
              Institutions retain ownership of their institutional information and logos. Matrícula USA retains ownership of the platform technology, including the student matching algorithms.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">7. Termination</h3>
            <p class="text-gray-600 mb-4">
              Either party may terminate this agreement with 30 (thirty) days written notice. Upon termination, the institution will be removed from the platform, but must honor all existing commitments to students who have already enrolled.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">8. Price Exclusivity</h3>
            <p class="text-gray-600 mb-4">
              The partner institution agrees to offer exclusive pricing conditions to the Matrícula USA platform. It is not permitted to advertise or sell scholarships at lower prices outside the platform. Any similar scholarship programs offered elsewhere must be priced at least 20% higher than the scholarship published on Matrícula USA.
            </p>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
            <p class="text-gray-600 mb-4">
              By confirming your participation on the Matrícula USA platform, your institution acknowledges that it has read, understood, and agrees to all the terms above.
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

    if (user && user.role !== 'school') {
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
      const { data: university, error } = await supabase
        .from('universities')
        .select('terms_accepted, profile_completed')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking terms:', error);
        return;
      }

      if (university && university.terms_accepted) {
        // User already accepted terms, redirect to appropriate page
        if (university.profile_completed) {
          navigate('/school/dashboard');
        } else {
          navigate('/school/setup-profile');
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
      // Record acceptance of university terms
      const universityTerms = await getLatestActiveTerm('university_terms');
      if (universityTerms) {
        await recordTermAcceptance(universityTerms.id, 'university_terms');
      }
      
      // Record acceptance of terms of service and privacy policy
      const termsOfService = await getLatestActiveTerm('terms_of_service');
      const privacyPolicy = await getLatestActiveTerm('privacy_policy');
      
      if (termsOfService) {
        await recordTermAcceptance(termsOfService.id, 'terms_of_service');
      }
      
      if (privacyPolicy) {
        await recordTermAcceptance(privacyPolicy.id, 'privacy_policy');
      }

      // Check if university record exists
      const { data: existingUniversity, error: checkError } = await supabase
        .from('universities')
        .select('id, terms_accepted, profile_completed')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUniversity) {
        // Update existing record to accept terms
        const { error: updateError } = await supabase
          .from('universities')
          .update({ 
            terms_accepted: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Redirect based on profile completion status
        if (existingUniversity.profile_completed) {
          navigate('/school/dashboard');
        } else {
          navigate('/school/setup-profile');
        }
      } else {
        // Create new university record if it doesn't exist
        const { error: insertError } = await supabase
          .from('universities')
          .insert({
            name: user.name || 'New University', // Temporary name
            user_id: user.id,
            terms_accepted: true,
            profile_completed: false,
            is_approved: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        // Redirect to profile setup
        navigate('/school/setup-profile');
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-[#05294E] rounded-full px-6 py-2 mb-6">
            <FileText className="h-5 w-5 mr-2 text-white" />
            <span className="text-sm font-medium text-white">Partnership Agreement</span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms and Conditions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please review and accept our terms to become a partner university on Matrícula USA platform.
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
          <div className="p-8 max-h-96 overflow-y-auto">
            {loadingTerms ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
                <span className="ml-3 text-gray-600">Loading terms...</span>
              </div>
            ) : (
              <div 
                className="prose prose-gray max-w-none"
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
                I have read and agree to the Terms and Conditions. I confirm that I am authorized to bind my institution to this agreement and that all information provided will be accurate and up-to-date.
              </label>
            </div>

            {/* Benefits Highlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                Access to qualified international students
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2 text-blue-600" />
                Secure platform and data protection
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 mr-2 text-[#05294E]" />
                AI-powered student matching
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
                onClick={() => navigate('/dashboard')}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {!accepted && (
              <div className="mt-4 flex items-center text-xs text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                Please read and accept the terms to continue with your university registration.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;