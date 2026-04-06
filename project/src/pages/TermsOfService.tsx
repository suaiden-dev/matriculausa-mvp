import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import SmartChat from '../components/SmartChat';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';

const TermsOfService: React.FC = () => {
  const { getLatestActiveTerm } = useTermsAcceptance();
  const [content, setContent] = useState<string>('');
  const [sections, setSections] = useState<{ id: string; text: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTerms = async () => {
      try {
        setLoading(true);
        const term = await getLatestActiveTerm('terms_of_service');
        
        if (term && term.content) {
          // Process content to extract sections and ensure IDs exist
          const parser = new DOMParser();
          const doc = parser.parseFromString(term.content, 'text/html');
          const headers = doc.querySelectorAll('h2');
          
          const extractedSections: { id: string; text: string }[] = [];
          
          headers.forEach((header, index) => {
            let id = header.id;
            const text = header.textContent || '';
            
            if (!id) {
              // Generate ID from text if it doesn't exist
              id = text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
              
              if (!id) id = `section-${index + 1}`;
              header.id = id;
            }
            
            extractedSections.push({ id, text });
          });
          
          setSections(extractedSections);
          setContent(doc.body.innerHTML);
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
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Terms of Service
            </h1>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
                <nav className="space-y-2">
                  {sections.length > 0 ? (
                    sections.map((section) => (
                      <a 
                        key={section.id}
                        href={`#${section.id}`} 
                        className="block text-sm text-gray-600 hover:text-[#05294E] hover:font-medium transition-colors"
                      >
                        {section.text}
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No sections found</p>
                  )}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6">
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
                  <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
                )}
              </div>
            </div>
          </div>

          {/* Right Spacer to center content */}
          <div className="hidden lg:block lg:col-span-2"></div>
        </div>
      </div>

      {/* Floating Support Buttons */}
      <SmartChat />
    </div>
  );
};

export default TermsOfService;
