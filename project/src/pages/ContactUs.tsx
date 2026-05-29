import React from 'react';
import { Mail, Phone, MapPin, MessageSquare, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartChat from '../components/SmartChat';

const ContactUs: React.FC = () => {
  const { t } = useTranslation('contact');

  const contactMethods = [
    {
      icon: Mail,
      title: t('methods.email.title'),
      value: 'info@matriculausa.com',
      description: t('methods.email.description'),
      link: 'mailto:info@matriculausa.com'
    },
    {
      icon: Phone,
      title: t('methods.phone.title'),
      value: '+1 (213) 676-2544',
      description: t('methods.phone.description'),
      link: 'tel:+12136762544'
    },
    {
      icon: MapPin,
      title: t('methods.location.title'),
      value: t('methods.location.value'),
      description: t('methods.location.description'),
      link: 'https://maps.google.com/?q=Los+Angeles,+CA,+USA'
    },
    {
      icon: MessageSquare,
      title: t('methods.whatsapp.title'),
      value: t('methods.whatsapp.value'),
      description: t('methods.whatsapp.description'),
      link: 'https://wa.me/12136762544'
    },
    {
      icon: List,
      title: t('methods.faq.title'),
      value: '',
      description: t('methods.faq.description'),
      link: '/faq'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section (Hero Banner) */}
      <div className="bg-gradient-to-r from-[#05294E] via-[#0A3D70] to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              {t('title')}
            </h1>
            
            <p className="text-xl text-blue-100 max-w-2xl mx-auto font-light leading-relaxed">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-2 gap-3 px-4 sm:px-6 lg:px-8">
          {contactMethods.map((method, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-4 md:p-6"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-3">
                  {method.link ? (
                    <a
                      href={method.link}
                      className="group flex items-center space-x-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200"
                    >
                      <method.icon className="h-5 w-5 text-gray-900 group-hover:text-blue-600 transition-colors duration-200 flex-shrink-0" />
                      <span>{method.title} &gt;</span>
                    </a>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <method.icon className="h-5 w-5 text-gray-900 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {method.title} &gt;
                      </h3>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-900 text-base leading-relaxed flex-grow">
                  {method.description}
                  {method.value && (
                    <>
                      {' '}
                      {method.link && (method.link.startsWith('mailto:') || method.link.startsWith('tel:')) ? (
                        <a
                          href={method.link}
                          className="block mt-2 font-semibold text-blue-600 hover:text-blue-800 underline break-all w-fit"
                        >
                          {method.value}
                        </a>
                      ) : (
                        <span className="font-semibold text-gray-900 break-all">{method.value}</span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Support Buttons */}
      <SmartChat />
    </div>
  );
};

export default ContactUs;
 