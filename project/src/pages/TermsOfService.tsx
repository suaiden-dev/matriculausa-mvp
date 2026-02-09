import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import SmartChat from '../components/SmartChat';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';

const TermsOfService: React.FC = () => {
  const { getLatestActiveTerm } = useTermsAcceptance();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTerms = async () => {
      try {
        setLoading(true);
        const term = await getLatestActiveTerm('terms_of_service');
        
        if (term && term.content) {
          setContent(term.content);
        } else {
          setError('Terms of Service not found');
        }
      } catch (err) {
        console.error('Error loading Terms of Service:', err);
        setError('Failed to load Terms of Service');
      } finally {
        setLoading(false);
      }
    };

    loadTerms();
  }, [getLatestActiveTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#05294E] rounded-lg mb-6">
              <FileText className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Our platform terms and conditions for users and institutions
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
                  <a href="#acceptance" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">1. Acceptance of Terms</a>
                  <a href="#service-description" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">2. Service Description</a>
                  <a href="#license" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">3. License Grant</a>
                  <a href="#third-party" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">4. Third-Party Dependencies</a>
                  <a href="#intellectual-property" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">5. Intellectual Property</a>
                  <a href="#responsibilities" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">6. Responsibilities</a>
                  <a href="#liability" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">7. Limitation of Liability</a>
                  <a href="#suspension" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">8. Suspension & Termination</a>
                  <a href="#modifications" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">9. Modifications</a>
                  <a href="#governing-law" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">10. Governing Law</a>
                  <a href="#arbitration" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">11. Arbitration</a>
                  <a href="#general-provisions" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">12. General Provisions</a>
                  <a href="#contact" className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors">13. Contact</a>
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
                    <span className="ml-3 text-gray-600">Loading Terms of Service...</span>
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

export default TermsOfService;
