import React from 'react';
import { Shield, Lock, Eye, FileText, Mail, Phone, MapPin, CheckCircle, Clock, AlertTriangle, Globe, User } from 'lucide-react';
import SmartChat from '../components/SmartChat';

const PrivacyPolicy: React.FC = () => (
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
            <div className="p-8 space-y-12">
        
        {/* Introduction */}
        <section id="introduction" className="scroll-mt-8">
          <div className="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="h-6 w-6 text-[#05294E] mr-3" />
              1. INTRODUCTION
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              Matrícula USA ("we", "our", "us") is committed to protecting the privacy and personal data of our users. 
              This Privacy Policy describes how we collect, use, store, and protect your information when you use our 
              Email Hub platform for universities.
            </p>
          </div>
        </section>

        {/* Data Collected */}
        <section id="data-collected" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="h-6 w-6 text-gray-600 mr-3" />
              2. DATA COLLECTED AND ACCESSED
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* User Account Data */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 text-gray-600 mr-2" />
                2.1 User Account Data
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Full name
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Email address
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Phone number
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Country of origin
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Academic profile
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Payment information (Stripe)
                </li>
              </ul>
            </div>

            {/* Gmail Data */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Mail className="h-5 w-5 text-gray-600 mr-2" />
                2.2 Gmail Data (Email Hub)
              </h3>
              <p className="text-gray-600 text-sm">
                When you connect your Gmail account, we access:
              </p>
              
              <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">gmail.readonly Permission:</h4>
                <div className="text-xs text-gray-700 space-y-1">
                  <div>• Email list and metadata</div>
                  <div>• Complete email content</div>
                  <div>• Read status and organization</div>
                </div>
              </div>

              <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">gmail.send Permission:</h4>
                <div className="text-xs text-gray-700 space-y-1">
                  <div>• Send emails via Gmail API</div>
                  <div>• Forward existing emails</div>
                  <div>• Reply to emails</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How We Use */}
        <section id="how-we-use" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="h-6 w-6 text-gray-600 mr-3" />
              3. HOW WE USE YOUR INFORMATION
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Primary Email Hub Functionality</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Email Viewing:</strong> We display complete email content to facilitate institutional management</li>
                <li><strong>Category Organization:</strong> We organize emails into tabs (Inbox, Sent, Starred, etc.) with real-time counts</li>
                <li><strong>Smart Forwarding:</strong> We allow forwarding emails with complete content preserved</li>
                <li><strong>New Email Composition:</strong> Integrated interface for creating and sending new institutional emails</li>
                <li><strong>Search and Filters:</strong> Search functionality to locate specific emails</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Other Uses</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Scholarship and application management</li>
                <li>Payment processing</li>
                <li>User communication</li>
                <li>Platform improvement</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="h-6 w-6 text-[#05294E] mr-3" />
              4. DATA SECURITY
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                4.1 Encryption and Storage
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm">
                <li><strong>OAuth Tokens:</strong> We store Gmail access and refresh tokens encrypted using AES-GCM with PBKDF2-derived keys</li>
                <li><strong>Sensitive Data:</strong> All sensitive data is encrypted before storage in Supabase</li>
                <li><strong>Transmission:</strong> All communications are protected by HTTPS/TLS</li>
              </ul>
            </div>

            <div className="border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                4.2 Security Measures
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm">
                <li>Secure OAuth 2.0 authentication</li>
                <li>Access tokens with automatic expiration</li>
                <li>Automatic token renewal for expired tokens</li>
                <li>Detailed logs for security auditing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Google Compliance */}
        <section id="google-compliance" className="scroll-mt-8">
          <div className="border-l-4 border-red-500 bg-red-50 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              5. GOOGLE COMPLIANCE
            </h2>
          
          <div className="border border-red-300 p-6 bg-red-50 rounded-lg">
            <h3 className="text-xl font-semibold text-red-900 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              IMPORTANT
            </h3>
            <p className="text-red-800 mb-4">
              The use and transfer of information received from Google APIs to any other app by Matrícula USA will 
              adhere to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements.
            </p>
            <ul className="list-disc list-inside text-red-800 space-y-2">
              <li>We use only necessary permissions (gmail.readonly and gmail.send)</li>
              <li>We do not share Gmail data with third parties</li>
              <li>We do not use Gmail data for advertising or profile analysis</li>
              <li>We respect all Google API usage policies</li>
            </ul>
          </div>
          </div>
        </section>

        {/* User Rights */}
        <section id="user-rights" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 text-gray-600 mr-3" />
              6. YOUR RIGHTS (CCPA/State Laws)
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Eye className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Access & Portability</h3>
              </div>
              <ul className="text-gray-700 space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Request access to all your personal data
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Receive data in machine-readable format
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Correction & Update</h3>
              </div>
              <ul className="text-gray-700 space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Correct inaccurate personal data
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Update profile information anytime
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <AlertTriangle className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Deletion</h3>
              </div>
              <ul className="text-gray-700 space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Request deletion of personal data
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Disconnect Gmail account anytime
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Delete platform account
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Lock className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Consent Withdrawal</h3>
              </div>
              <ul className="text-gray-700 space-y-2 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Withdraw Gmail data consent
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Disconnect integrations
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="border-l-4 border-gray-400 p-6 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">7. DATA RETENTION</h2>
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Account Data:</strong> Kept while your account is active</li>
            <li><strong>OAuth Tokens:</strong> Stored until you disconnect or delete your account</li>
            <li><strong>Security Logs:</strong> Kept for 12 months for auditing</li>
            <li><strong>Payment Data:</strong> Kept as required by law</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section className="border-l-4 border-gray-400 p-6 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Shield className="h-5 w-5 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">8. DATA SHARING</h2>
          </div>
          <p className="text-gray-700 mb-4">
            We do not sell, rent, or share your personal data with third parties, except:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Essential service providers (Supabase, Stripe, Google)</li>
            <li>When required by law</li>
            <li>With your explicit consent</li>
          </ul>
        </section>

        {/* Children's Privacy */}
        <section className="border-l-4 border-gray-400 p-6 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Shield className="h-5 w-5 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">9. CHILDREN'S PRIVACY</h2>
          </div>
          <p className="text-gray-700">
            Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        {/* International Transfers */}
        <section className="border-l-4 border-gray-400 p-6 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">10. INTERNATIONAL DATA TRANSFERS</h2>
          </div>
          <p className="text-gray-700">
            Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-8">
          <div className="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="h-6 w-6 text-[#05294E] mr-3" />
              11. CONTACT
            </h2>
            <p className="text-gray-700 mb-6">
              To exercise your rights or clarify questions about this policy:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <Mail className="h-8 w-8 text-[#05294E] mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">Email</div>
                <div className="text-sm text-gray-600">info@matriculausa.com</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <Phone className="h-8 w-8 text-[#05294E] mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">Phone</div>
                <div className="text-sm text-gray-600">+1 (213) 676-2544</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <MapPin className="h-8 w-8 text-[#05294E] mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">Address</div>
                <div className="text-sm text-gray-600">Los Angeles, CA, USA</div>
              </div>
            </div>
          </div>
        </section>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Floating Support Buttons */}
    <SmartChat />
  </div>
);

export default PrivacyPolicy; 