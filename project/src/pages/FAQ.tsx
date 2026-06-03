import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Phone, Mail } from 'lucide-react';
import { useTranslationWithFees } from '../hooks/useTranslationWithFees';
import { useDynamicFees } from '../hooks/useDynamicFees';
import SmartChat from '../components/SmartChat';

const FAQ: React.FC = () => {
  const { t } = useTranslationWithFees(['home', 'common', 'dashboard', 'contact']);
  const { selectionProcessFee, scholarshipFee, i20ControlFee } = useDynamicFees();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<number[]>([]);



  const faqItems = [
    {
      q: t('howItWorks.faq.q1.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q1.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q2.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q2.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'General'
    },
    {
      q: t('howItWorks.faq.q3.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q3.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q4.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q4.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q5.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q5.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q6.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q6.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q7.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q7.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q8.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q8.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q9.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q9.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q10.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q10.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q11.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q11.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Payment'
    },
    {
      q: t('howItWorks.faq.q12.question', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      a: t('howItWorks.faq.q12.answer', { selectionProcessFee, scholarshipFee, i20ControlFee }),
      category: 'Support'
    }
  ];

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const filteredItems = faqItems.filter(item =>
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section (Hero Banner) */}
      <div className="bg-gradient-to-r from-[#05294E] via-[#0A3D70] to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              {t('home.faq.title')}
            </h1>
            
            <p className="text-xl text-blue-100 max-w-2xl mx-auto font-light leading-relaxed mb-8">
              {t('home.faq.subtitle')}
            </p>
            
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div>
          {/* Main Content */}
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('home.faq.badge')}</h2>
              <p className="text-gray-600">
                {t('home.faq.questionsFound', { count: filteredItems.length }) || (filteredItems.length !== 1 ? `${filteredItems.length} questions found` : `${filteredItems.length} question found`)}
                {searchQuery && ` ${t('common.for') || 'for'} "${searchQuery}"`}
              </p>
            </div>
            
            <div className="space-y-4">
              {filteredItems.map((item, index) => {
                const isExpanded = expandedItems.includes(index);
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-[#05294E] transition-colors"
                  >
                    <button
                      onClick={() => toggleItem(index)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">
                            {item.q}
                          </h3>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {t('common.' + item.category.toLowerCase()) || item.category}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 pb-4 border-t border-gray-100">
                        <div 
                          className="text-gray-600 text-sm leading-relaxed pt-4"
                          dangerouslySetInnerHTML={{ __html: item.a }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('common.noResults') || 'No questions found'}</h3>
                <p className="text-gray-600">{t('common.tryAdjustingFilters') || 'Try adjusting your search terms or browse all questions.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Still have questions? Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-12">
            {t('home.about.cta.questions') || 'Still have questions?'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Contact us (Email) */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm">
              <a href="mailto:info@matriculausa.com" className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{t('methods.email.title') || 'Contact us'}</span>
                </div>
                <span className="text-gray-400 text-sm font-semibold group-hover:text-blue-600 transition-colors">&gt;</span>
              </a>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <p className="text-gray-900 text-base leading-relaxed">
                  {t('home.faq.footerContact') || "Got a detailed question? Shoot us an email and we'll get things smoothed out."}
                </p>
              </div>
            </div>

            {/* Card 2: Call us */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm">
              <a href="tel:+12136762544" className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{t('methods.phone.title') || 'Call us'}</span>
                </div>
                <span className="text-gray-400 text-sm font-semibold group-hover:text-blue-600 transition-colors">&gt;</span>
              </a>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <p className="text-gray-900 text-base leading-relaxed">
                  {t('home.faq.whatsappCardDesc') || 'Get instant help through WhatsApp messaging available 24/7'}
                </p>
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

export default FAQ; 