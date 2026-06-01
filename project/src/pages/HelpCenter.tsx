import React, { useState } from 'react';
import { User, FileText, CreditCard, UploadCloud, CheckCircle, Search, Phone, Mail } from 'lucide-react';
import SmartChat from '../components/SmartChat';
import { useTranslation } from 'react-i18next';

const HelpCenter: React.FC = () => {
  const { t } = useTranslation(['help', 'common', 'home', 'contact']);
  const [searchQuery, setSearchQuery] = useState('');

  const topics = [
    {
      icon: User,
      title: t('help:mainTopics.items.profile.title'),
      description: t('help:mainTopics.items.profile.description'),
      category: t('help:mainTopics.items.profile.category')
    },
    {
      icon: FileText,
      title: t('help:mainTopics.items.application.title'),
      description: t('help:mainTopics.items.application.description'),
      category: t('help:mainTopics.items.application.category')
    },
    {
      icon: CreditCard,
      title: t('help:mainTopics.items.payment.title'),
      description: t('help:mainTopics.items.payment.description'),
      category: t('help:mainTopics.items.payment.category')
    },
    {
      icon: UploadCloud,
      title: t('help:mainTopics.items.documents.title'),
      description: t('help:mainTopics.items.documents.description'),
      category: t('help:mainTopics.items.documents.category')
    },
    {
      icon: CheckCircle,
      title: t('help:mainTopics.items.status.title'),
      description: t('help:mainTopics.items.status.description'),
      category: t('help:mainTopics.items.status.category')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#05294E] via-[#0A3D70] to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              {t('help:header.title')}
            </h1>
            
            <p className="text-xl text-blue-100 max-w-2xl mx-auto font-light leading-relaxed mb-8">
              {t('help:header.description')}
            </p>
            
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('help:header.searchPlaceholder')}
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('help:mainTopics.title')}
              </h2>
              <p className="text-gray-600">
                {t('help:mainTopics.description')}
              </p>
            </div>
            
            <div className="grid gap-4">
              {topics.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-[#05294E] hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#05294E] transition-colors duration-200">
                        <item.icon className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors duration-200" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#05294E] transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Still have questions? Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-12">
            {t('home.about.cta.questions') || 'Still have questions?'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Contact us (Email) */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              <a href="mailto:info@matriculausa.com" className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{t('methods.email.title') || 'Contact us'}</span>
                </div>
                <span className="text-gray-400 text-sm font-semibold group-hover:text-blue-600 transition-colors">&gt;</span>
              </a>
              <div className="p-6">
                <p className="text-gray-900 text-base leading-relaxed">
                  {t('home.faq.footerContact') || "Got a detailed question? Shoot us an email and we'll get things smoothed out."}
                </p>
              </div>
            </div>

            {/* Card 2: Call us (WhatsApp) */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              <a href="tel:+12136762544" className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{t('methods.phone.title') || 'Call us'}</span>
                </div>
                <span className="text-gray-400 text-sm font-semibold group-hover:text-blue-600 transition-colors">&gt;</span>
              </a>
              <div className="p-6">
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

export default HelpCenter;