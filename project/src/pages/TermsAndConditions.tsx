import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Shield, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const TermsAndConditions: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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

    // Check if user already accepted terms
    if (user) checkExistingTermsAcceptance();
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
          window.location.href = '/school/termsandconditions';
        } else {
          window.location.href = '/school/setup-profile';
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
          window.location.href = '/school/termsandconditions';
        } else {
          window.location.href = '/school/setup-profile';
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
        window.location.href = '/school/setup-profile';
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
            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-[#05294E]" />
                University Partnership Agreement
              </h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">1. Platform Partnership</h3>
              <p className="text-gray-600 mb-4">
                By joining Matrícula USA, your institution agrees to participate in our international student recruitment platform. We provide technology infrastructure to connect qualified international students with your academic programs.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">2. Scholarship Management</h3>
              <p className="text-gray-600 mb-4">
                Universities can create and manage scholarship opportunities through our platform. All scholarship information must be accurate and current. Universities are responsible for honoring published scholarship commitments.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Student Data Protection</h3>
              <p className="text-gray-600 mb-4">
                Student information shared through our platform is confidential. Universities must comply with applicable privacy laws and use student data solely for admissions and scholarship evaluation purposes.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">4. Quality Standards</h3>
              <p className="text-gray-600 mb-4">
                Partner universities must maintain accreditation and meet our quality standards. We reserve the right to review and approve university profiles before they become publicly visible.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">5. Platform Fees</h3>
              <p className="text-gray-600 mb-4">
                Universities may be subject to platform fees based on successful student placements. Fee structures will be communicated separately and agreed upon in writing.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">6. Intellectual Property</h3>
              <p className="text-gray-600 mb-4">
                Universities retain ownership of their institutional information and logos. Matrícula USA retains ownership of platform technology and student matching algorithms.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">7. Termination</h3>
              <p className="text-gray-600 mb-4">
                Either party may terminate this agreement with 30 days written notice. Upon termination, universities will no longer appear on the platform, but existing student commitments must be honored.
              </p>
            </div>
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