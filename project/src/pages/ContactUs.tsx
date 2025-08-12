import React from 'react';
import { Mail, Phone, MapPin, MessageCircle, Clock, CheckCircle, MapPinIcon, Building, Globe, MessageSquare } from 'lucide-react';
import SmartChat from '../components/SmartChat';

const ContactUs: React.FC = () => {
  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      value: 'info@matriculausa.com',
      description: 'Send us an email and we\'ll respond within 24 hours',
      category: 'Primary',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      value: '+1 (213) 676-2544',
      description: 'Call us Monday to Friday, 9 AM - 6 PM PST',
      category: 'Direct',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      icon: MapPin,
      title: 'Office Location',
      value: 'Los Angeles, CA, USA',
      description: 'Visit our headquarters in sunny California',
      category: 'Physical',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Support',
      value: 'Available 24/7',
      description: 'Get instant help through WhatsApp messaging',
      category: 'Instant',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      icon: Globe,
      title: 'Online Support',
      value: 'Smart Assistant',
      description: 'AI-powered help available anytime',
      category: 'AI',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#05294E] rounded-lg mb-6">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Contact Us
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Get in touch with our team. We're here to help you succeed.
            </p>

            {/* Stats */}
            <div className="flex justify-center items-center space-x-8 mt-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>24/7 support</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Quick response</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
                <span>Expert team</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-4">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Contact Methods</h2>
              <p className="text-gray-600">Choose the best way to reach our team</p>
            </div>
            
            <div className="grid gap-4">
              {contactMethods.map((method, index) => (
                <div
                  key={index}
                  className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-[#05294E] hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 ${method.bgColor} rounded-lg flex items-center justify-center group-hover:bg-[#05294E] transition-colors duration-200`}>
                        <method.icon className={`h-6 w-6 ${method.textColor} group-hover:text-white transition-colors duration-200`} />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#05294E] transition-colors">
                          {method.title}
                        </h3>
                        <span className={`text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded`}>
                          {method.category}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {method.description}
                      </p>
                      <div className="text-lg font-semibold text-[#05294E]">
                        {method.value}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Support Buttons */}
      <SmartChat />
    </div>
  );
};

export default ContactUs; 