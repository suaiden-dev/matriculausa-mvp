import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, MessageCircle, Phone, Mail, CheckCircle, Clock } from 'lucide-react';
import { useTranslationWithFees } from '../hooks/useTranslationWithFees';
import SmartChat from '../components/SmartChat';

const FAQ: React.FC = () => {
  const { t } = useTranslationWithFees();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const faqItems = [
    {
      q: t('home.faq.questions.q1.question'),
      a: t('home.faq.questions.q1.answer'),
      category: 'General'
    },
    {
      q: t('home.faq.questions.q2.question'),
      a: t('home.faq.questions.q2.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q3.question'),
      a: t('home.faq.questions.q3.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q4.question'),
      a: t('home.faq.questions.q4.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q5.question'),
      a: t('home.faq.questions.q5.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q6.question'),
      a: t('home.faq.questions.q6.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q7.question'),
      a: t('home.faq.questions.q7.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q8.question'),
      a: t('home.faq.questions.q8.answer'),
      category: 'Support'
    },
    {
      q: t('home.faq.questions.q9.question'),
      a: t('home.faq.questions.q9.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q10.question'),
      a: t('home.faq.questions.q10.answer'),
      category: 'Payment'
    },
    {
      q: t('home.faq.questions.q11.question'),
      a: t('home.faq.questions.q11.answer'),
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
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#05294E] rounded-lg mb-6">
              <HelpCircle className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('home.faq.title')}
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              {t('home.faq.subtitle')}
            </p>
            
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              />
            </div>

            {/* Stats */}
            <div className="flex justify-center items-center space-x-8 mt-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>24/7 {t('common.support') || 'support'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
                <span>Quick answers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('home.faq.badge')}</h2>
              <p className="text-gray-600">
                {filteredItems.length} question{filteredItems.length !== 1 ? 's' : ''} found
                {searchQuery && ` for "${searchQuery}"`}
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
                            {item.category}
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
                        <p className="text-gray-600 text-sm leading-relaxed pt-4">
                          {item.a}
                        </p>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                <p className="text-gray-600">Try adjusting your search terms or browse all questions.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('studentDashboard.matriculaRewards.helpSupport')}</h3>
              
              <div className="space-y-3">
                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#05294E] hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{t('studentDashboard.matriculaRewards.smartAssistant')}</p>
                    <p className="text-sm text-gray-600">AI-powered help</p>
                  </div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#05294E] hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">WhatsApp {t('common.support') || 'Support'}</p>
                    <p className="text-sm text-gray-600">Direct messaging</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Contact Note */}
            <div className="bg-[#05294E] rounded-lg p-6 text-white">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Still have questions?</h3>
              </div>
              
              <p className="text-blue-100 mb-4 text-sm">
                Use the floating buttons for instant help or contact us directly at info@matriculausa.com
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  <span>Instant AI responses</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-blue-400 mr-2" />
                  <span>24/7 availability</span>
                </div>
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