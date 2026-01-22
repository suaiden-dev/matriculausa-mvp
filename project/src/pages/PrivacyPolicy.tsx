import React, { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import SmartChat from '../components/SmartChat';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';

const PrivacyPolicy: React.FC = () => {
  const { getLatestActiveTerm } = useTermsAcceptance();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrivacyPolicy = async () => {
      try {
        setLoading(true);
        const term = await getLatestActiveTerm('privacy_policy');
        
        if (term && term.content) {
          setContent(term.content);
        } else {
          setError('Privacy Policy not found');
        }
      } catch (err) {
        console.error('Error loading Privacy Policy:', err);
        setError('Failed to load Privacy Policy');
      } finally {
        setLoading(false);
      }
    };

    loadPrivacyPolicy();
  }, [getLatestActiveTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#05294E] rounded-lg mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Your privacy and data security are our top priorities
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
                <nav className="space-y-2">
                  <a href="#introduction" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">1. Introduction</a>
                  <a href="#data-collected" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">2. Data Collected</a>
                  <a href="#how-we-use" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">3. How We Use</a>
                  <a href="#security" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">4. Data Security</a>
                  <a href="#google-compliance" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">5. Google Compliance</a>
                  <a href="#user-rights" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">6. Your Rights</a>
                  <a href="#data-retention" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">7. Data Retention</a>
                  <a href="#data-sharing" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">8. Data Sharing</a>
                  <a href="#children-privacy" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">9. Children's Privacy</a>
                  <a href="#international" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">10. International Transfers</a>
                  <a href="#contact" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">11. Contact</a>
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-8">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#05294E]" />
                    <span className="ml-3 text-gray-600">Loading Privacy Policy...</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {!loading && !error && content && (
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Support Buttons */}
      <SmartChat />
    </div>
  );
};

export default PrivacyPolicy;
