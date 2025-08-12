import React from 'react';
import { FileText, Shield, Lock, Globe, User, AlertTriangle, CheckCircle, Clock, Mail, Phone, MapPin, Building, Scale, Gavel } from 'lucide-react';
import SmartChat from '../components/SmartChat';

const TermsOfService: React.FC = () => (
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
            <div className="p-8 space-y-12">
        
        {/* Introduction */}
        <section id="acceptance" className="scroll-mt-8">
          <div className="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 text-[#05294E] mr-3" />
              1. ACCEPTANCE OF TERMS
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. 
              If you do not agree to any part of these terms, you should not use our services.
            </p>
          </div>
        </section>

        {/* Service Description */}
        <section id="service-description" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Building className="h-6 w-6 text-gray-600 mr-3" />
              2. SERVICE DESCRIPTION
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Email Hub */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 text-gray-600 mr-2" />
                2.1 Email Hub for Universities
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Secure Gmail OAuth 2.0 integration
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Professional institutional interface
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Organized tab system (Inbox, Sent, etc.)
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Real-time email counts
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Smart forwarding functionality
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Integrated composer & search
                </li>
              </ul>
            </div>

            {/* Scholarship Management */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 text-gray-600 mr-2" />
                2.2 Scholarship Management
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Create and manage scholarships
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Student application process
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Document status management
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Integrated payment system
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* License */}
        <section id="license" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="h-6 w-6 text-gray-600 mr-3" />
              3. LICENSE GRANT
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Limited License</h3>
              <p className="text-gray-700 text-sm">
                We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use 
                the Matrícula USA platform in accordance with these Terms.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Restrictions</h3>
              <p className="text-gray-700 mb-3 text-sm">You agree not to:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Use for illegal purposes
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Access unauthorized systems
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Interfere with operation
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Share credentials
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Third Party Dependencies */}
        <section id="third-party" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Globe className="h-6 w-6 text-gray-600 mr-3" />
              4. THIRD-PARTY DEPENDENCIES
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <Globe className="h-5 w-5 text-gray-600 mr-2" />
                4.1 Google APIs
              </h3>
              <p className="text-gray-700 mb-3">
                The "Email Hub" functionality depends on Google APIs and is subject to Google's Terms of Service. 
                By using this functionality, you agree to comply with:
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <a href="https://policies.google.com/terms" className="text-gray-700 hover:text-[#05294E] hover:underline">Google Terms of Service</a>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <a href="https://policies.google.com/privacy" className="text-gray-700 hover:text-[#05294E] hover:underline">Google Privacy Policy</a>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-gray-700 hover:text-[#05294E] hover:underline">Google API Services User Data Policy</a>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Other Providers</h3>
              <p className="text-gray-700 mb-3">Our platform also uses:</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm font-medium text-gray-900">Supabase</div>
                  <div className="text-xs text-gray-600">Data storage & auth</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm font-medium text-gray-900">Stripe</div>
                  <div className="text-xs text-gray-600">Payment processing</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm font-medium text-gray-900">Vercel/Netlify</div>
                  <div className="text-xs text-gray-600">Application hosting</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intellectual Property */}
        <section id="intellectual-property" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="h-6 w-6 text-[#05294E] mr-3" />
              5. INTELLECTUAL PROPERTY
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">5.1 Platform Ownership</h3>
              <p className="text-gray-700 text-sm">
                The Matrícula USA platform, including its code, design, features, and content, is the exclusive 
                property of Matrícula USA and is protected by intellectual property laws.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">5.2 Customer Data</h3>
              <p className="text-gray-700 text-sm mb-3">All customer data, including:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Email content
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Personal information
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Submitted documents
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Application history
                </li>
              </ul>
              <p className="text-gray-700 text-sm mt-3">
                Remains the exclusive property of the customer. Matrícula USA acts only as a processor of this data.
              </p>
            </div>
          </div>
        </section>

        {/* Responsibilities */}
        <section id="responsibilities" className="scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <User className="h-6 w-6 text-gray-600 mr-3" />
              6. RESPONSIBILITIES
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 User Responsibilities</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Provide true and accurate information
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Maintain security of credentials
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Use the platform responsibly
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Comply with applicable laws
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Matrícula USA Responsibilities</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Maintain platform operation
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Protect user data according to Privacy Policy
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Provide adequate technical support
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Notify about significant changes
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Quick Facts Grid */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* Limitation of Liability */}
          <div id="liability" className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-gray-600 mr-2" />
              7. LIMITATION OF LIABILITY
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Data loss due to technical failures
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Temporary service interruptions
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Indirect or consequential damages
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Actions of third parties
              </div>
            </div>
          </div>

          {/* Suspension & Termination */}
          <div id="suspension" className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="h-5 w-5 text-gray-600 mr-2" />
              8. SUSPENSION & TERMINATION
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Violation of Terms
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Abusive platform use
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Payment failures
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Account termination rights
              </div>
            </div>
          </div>

          {/* Additional Sections */}
          <div className="space-y-6">
            <div id="modifications" className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                <Clock className="h-4 w-4 text-gray-600 mr-2" />
                9. MODIFICATIONS
              </h4>
              <p className="text-gray-700 text-sm">
                We reserve the right to modify these Terms. Significant changes communicated 30 days in advance.
              </p>
            </div>

            <div id="governing-law" className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                <Scale className="h-4 w-4 text-gray-600 mr-2" />
                10. GOVERNING LAW
              </h4>
              <p className="text-gray-700 text-sm">
                Governed by State laws, United States. Disputes resolved in local courts.
              </p>
            </div>
          </div>
        </section>

        {/* Legal Sections */}
        <section className="space-y-6">
          <div id="arbitration" className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Gavel className="h-5 w-5 text-gray-600 mr-2" />
              11. ARBITRATION
            </h3>
            <p className="text-gray-700 text-sm">
              Any disputes arising from these Terms will be resolved through binding arbitration in accordance with 
              the American Arbitration Association rules.
            </p>
          </div>

          <div id="general-provisions" className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 text-gray-600 mr-2" />
              12. GENERAL PROVISIONS
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-900">Entire Agreement</div>
                <div className="text-xs text-gray-600">Complete agreement between parties</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-900">Waiver</div>
                <div className="text-xs text-gray-600">Failure to exercise right ≠ waiver</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-900">Severability</div>
                <div className="text-xs text-gray-600">Invalid provisions don't affect others</div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-8">
          <div className="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="h-6 w-6 text-[#05294E] mr-3" />
              13. CONTACT
            </h2>
            <p className="text-gray-700 mb-6">
              For questions about these Terms:
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

export default TermsOfService; 