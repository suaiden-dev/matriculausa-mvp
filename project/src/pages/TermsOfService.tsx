import React from 'react';

const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Terms of Service</h1>
    <div className="bg-white/90 rounded-2xl shadow-xl p-8 max-w-2xl w-full border-l-4 border-[#D0151C]">
      {/* Content */}
      <div className="bg-white shadow-sm border border-gray-200 p-8 space-y-8">
        
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. ACCEPTANCE OF TERMS</h2>
          <p className="text-gray-700 leading-relaxed">
            By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. 
            If you do not agree to any part of these terms, you should not use our services.
          </p>
        </section>

        {/* Service Description */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. SERVICE DESCRIPTION</h2>
          <p className="text-gray-700 mb-4">
            Matrícula USA is a SaaS (Software as a Service) platform that offers:
          </p>
          
          <div className="space-y-6">
            <div className="border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                2.1 Email Hub for Universities
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Secure integration with Gmail accounts through OAuth 2.0</li>
                <li>Professional interface for institutional email management</li>
                <li>Organized tab system (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                <li>Real-time email counts</li>
                <li>Smart forwarding functionality</li>
                <li>Integrated composer for new emails</li>
                <li>Advanced search and filters</li>
                <li>Responsive interface for all devices</li>
              </ul>
            </div>

            <div className="border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                2.2 Scholarship Management
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Creation and management of scholarships</li>
                <li>Student application process</li>
                <li>Document and application status management</li>
                <li>Integrated payment system</li>
              </ul>
            </div>
          </div>
        </section>

        {/* License */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. LICENSE GRANT</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Limited License</h3>
              <p className="text-gray-700">
                We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use 
                the Matrícula USA platform in accordance with these Terms.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Restrictions</h3>
              <p className="text-gray-700 mb-3">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Use the platform for illegal or unauthorized purposes</li>
                <li>Attempt to access unauthorized systems or data</li>
                <li>Interfere with platform operation</li>
                <li>Share access credentials</li>
                <li>Use the platform for spam or malicious content</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Third Party Dependencies */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">4. THIRD-PARTY DEPENDENCIES</h2>
          
          <div className="space-y-6">
            <div className="border border-gray-300 p-6 bg-gray-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                4.1 Google APIs
              </h3>
              <p className="text-gray-700 mb-3">
                The "Email Hub" functionality depends on Google APIs and is subject to Google's Terms of Service. 
                By using this functionality, you agree to comply with:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><a href="https://policies.google.com/terms" className="text-blue-600 hover:underline">Google Terms of Service</a></li>
                <li><a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline">Google Privacy Policy</a></li>
                <li><a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:underline">Google API Services User Data Policy</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Other Providers</h3>
              <p className="text-gray-700 mb-3">Our platform also uses:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Supabase:</strong> For data storage and authentication</li>
                <li><strong>Stripe:</strong> For payment processing</li>
                <li><strong>Vercel/Netlify:</strong> For application hosting</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">5. INTELLECTUAL PROPERTY</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">5.1 Platform Ownership</h3>
              <p className="text-slate-700 text-sm">
                The Matrícula USA platform, including its code, design, features, and content, is the exclusive 
                property of Matrícula USA and is protected by intellectual property laws.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">5.2 Customer Data</h3>
              <p className="text-slate-700 text-sm mb-3">All customer data, including:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                <li>Email content</li>
                <li>Personal information</li>
                <li>Submitted documents</li>
                <li>Application history</li>
              </ul>
              <p className="text-slate-700 text-sm mt-3">
                Remains the exclusive property of the customer. Matrícula USA acts only as a processor of this data.
              </p>
            </div>
          </div>
        </section>

        {/* Responsibilities */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">6. RESPONSIBILITIES</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">6.1 User Responsibilities</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Provide true and accurate information</li>
                <li>Maintain security of credentials</li>
                <li>Use the platform responsibly</li>
                <li>Comply with applicable laws</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">6.2 Matrícula USA Responsibilities</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Maintain platform operation</li>
                <li>Protect user data according to our Privacy Policy</li>
                <li>Provide adequate technical support</li>
                <li>Notify about significant changes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">7. LIMITATION OF LIABILITY</h2>
          <p className="text-slate-700 mb-4">
            Matrícula USA will not be liable for:
          </p>
          <ul className="list-disc list-inside text-slate-700 space-y-2">
            <li>Data loss due to technical failures</li>
            <li>Temporary service interruptions</li>
            <li>Indirect or consequential damages</li>
            <li>Actions of third parties (Google, Stripe, etc.)</li>
          </ul>
        </section>

        {/* Suspension and Termination */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">8. SUSPENSION AND TERMINATION</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">8.1 Suspension</h3>
              <p className="text-slate-700 mb-3">We may suspend your access if:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                <li>You violate these Terms</li>
                <li>You use the platform abusively</li>
                <li>You fail to make due payments</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">8.2 Termination</h3>
              <p className="text-slate-700 mb-3">
                You may terminate your account at any time. After termination:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                <li>Your data will be deleted according to our Privacy Policy</li>
                <li>Gmail integrations will be disconnected</li>
                <li>Platform access will be revoked</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Modifications */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">9. MODIFICATIONS</h2>
          <p className="text-slate-700">
            We reserve the right to modify these Terms at any time. Significant changes will be communicated 30 days in advance.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">10. GOVERNING LAW</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">10.1 Jurisdiction</h3>
              <p className="text-slate-700">
                These Terms are governed by the laws of the State of [State], United States.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">10.2 Dispute Resolution</h3>
              <p className="text-slate-700">
                Any disputes will be resolved in the courts of [County], [State], with express waiver of any other venue, 
                no matter how privileged.
              </p>
            </div>
          </div>
        </section>

        {/* Arbitration */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">11. ARBITRATION</h2>
          <p className="text-slate-700">
            Any disputes arising from these Terms will be resolved through binding arbitration in accordance with 
            the American Arbitration Association rules.
          </p>
        </section>

        {/* General Provisions */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">12. GENERAL PROVISIONS</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">12.1 Entire Agreement</h3>
              <p className="text-slate-700">
                These Terms constitute the complete agreement between the parties.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">12.2 Waiver</h3>
              <p className="text-slate-700">
                Failure to exercise any right does not constitute waiver.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#05294E] mb-3">12.3 Severability</h3>
              <p className="text-slate-700">
                If any provision is found invalid, the remaining provisions will remain in effect.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-bold text-[#05294E] mb-4">13. CONTACT</h2>
          <p className="text-slate-700 mb-4">
            For questions about these Terms:
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800"><strong>Email:</strong> info@matriculausa.com</p>
            <p className="text-blue-800"><strong>Phone:</strong> +1 (213) 676-2544</p>
            <p className="text-blue-800"><strong>Address:</strong> Los Angeles - CA - USA</p>
          </div>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService; 