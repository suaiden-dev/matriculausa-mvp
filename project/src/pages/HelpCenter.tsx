import React, { useState } from 'react';
import { User, FileText, CreditCard, UploadCloud, CheckCircle, HelpCircle, MessageCircle, Search, BookOpen, Phone, Mail, Clock, ChevronRight } from 'lucide-react';
import SmartChat from '../components/SmartChat';

const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

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
              Help Center
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Find quick answers and detailed guidance for all your questions
            </p>
            
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              />
            </div>

            {/* Stats */}
            <div className="flex justify-center items-center space-x-8 mt-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>24/7 support</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
                <span>Quick response</span>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Main Topics</h2>
              <p className="text-gray-600">Find help organized by category</p>
            </div>
            
            <div className="grid gap-4">
              {[
                {
                  icon: User,
                  title: "Creating your profile",
                  description: "Step-by-step guidance to set up your academic and personal information.",
                  category: "Setup"
                },
                {
                  icon: FileText,
                  title: "Understanding the application process",
                  description: "Learn how to apply, track your progress, and what to expect at each stage.",
                  category: "Application"
                },
                {
                  icon: CreditCard,
                  title: "Paying fees",
                  description: "How to pay, check payment status, and understand non-refundable fees.",
                  category: "Payment"
                },
                {
                  icon: UploadCloud,
                  title: "Uploading documents",
                  description: "Tips for uploading transcripts, IDs, and other required files.",
                  category: "Documents"
                },
                {
                  icon: CheckCircle,
                  title: "Tracking your application",
                  description: "Monitor your status and next steps after submission.",
                  category: "Status"
                }
              ].map((item, index) => (
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

                    {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need help?</h3>
              
              <div className="space-y-3">
                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#05294E] hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Smart Assistant</p>
                    <p className="text-sm text-gray-600">AI-powered help</p>
                  </div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>

                <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#05294E] hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">WhatsApp Support</p>
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
                <h3 className="text-lg font-semibold">Quick Support</h3>
              </div>
              
              <p className="text-blue-100 mb-4 text-sm">
                Use the floating buttons for instant help - Smart Assistant and WhatsApp are available 24/7.
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

export default HelpCenter; 