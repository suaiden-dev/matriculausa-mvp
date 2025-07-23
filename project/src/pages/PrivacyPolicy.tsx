import React from 'react';

const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-[#05294E] flex flex-col items-center py-16 px-4">
    <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Privacy Policy</h1>
    <div className="bg-white/90 rounded-2xl shadow-xl p-8 max-w-2xl w-full border-l-4 border-[#D0151C]">

      {/* Content */}
      <div className="bg-white shadow-sm border border-gray-200 p-8 space-y-8">
        
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. INTRODUCTION</h2>
          <p className="text-gray-700 leading-relaxed">
            Matrícula USA ("we", "our", "us") is committed to protecting the privacy and personal data of our users. 
            This Privacy Policy describes how we collect, use, store, and protect your information when you use our 
            Email Hub platform for universities.
          </p>
        </section>

        {/* Data Collected */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. DATA COLLECTED AND ACCESSED</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 User Account Data</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Country of origin</li>
                <li>Academic profile (study level, field of interest, GPA, English proficiency)</li>
                <li>Payment information (through Stripe)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Gmail Data (Email Hub)</h3>
              <p className="text-gray-700 mb-4">
                Based on our platform's code analysis, when you connect your Gmail account, we access the following data:
              </p>
              
              <div className="border border-gray-200 p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">gmail.readonly Permission:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Email list (ID, threadId, sender, recipient, subject)</li>
                  <li>Complete email content (text and HTML body)</li>
                  <li>Email metadata (date, priority, attachments, labels)</li>
                  <li>Email count by category (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                  <li>Email read status</li>
                  <li>Thread/conversation information</li>
                </ul>
              </div>

              <div className="border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-2">gmail.send Permission:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Ability to send emails through Gmail API</li>
                  <li>Ability to forward existing emails</li>
                  <li>Ability to reply to emails</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How We Use */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. HOW WE USE YOUR INFORMATION</h2>
          
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
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. DATA SECURITY</h2>
          
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
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. GOOGLE COMPLIANCE</h2>
          
          <div className="border border-gray-300 p-6 bg-gray-50">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">IMPORTANT</h3>
            <p className="text-gray-700 mb-4">
              The use and transfer of information received from Google APIs to any other app by Matrícula USA will 
              adhere to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements.
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>We use only necessary permissions (gmail.readonly and gmail.send)</li>
              <li>We do not share Gmail data with third parties</li>
              <li>We do not use Gmail data for advertising or profile analysis</li>
              <li>We respect all Google API usage policies</li>
            </ul>
          </div>
        </section>

        {/* User Rights */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. YOUR RIGHTS (CCPA/State Laws)</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Access and Portability</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Request access to all your personal data</li>
                <li>Receive your data in a structured, machine-readable format</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Correction and Update</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Correct inaccurate or incomplete personal data</li>
                <li>Update your profile information at any time</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.3 Deletion</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Request deletion of your personal data</li>
                <li>Disconnect your Gmail account at any time</li>
                <li>Delete your platform account</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.4 Consent Withdrawal</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Withdraw consent for Gmail data usage</li>
                <li>Disconnect third-party integrations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. DATA RETENTION</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Account Data:</strong> Kept while your account is active</li>
            <li><strong>OAuth Tokens:</strong> Stored until you disconnect or delete your account</li>
            <li><strong>Security Logs:</strong> Kept for 12 months for auditing</li>
            <li><strong>Payment Data:</strong> Kept as required by law</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. DATA SHARING</h2>
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
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. CHILDREN'S PRIVACY</h2>
          <p className="text-gray-700">
            Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        {/* International Transfers */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. INTERNATIONAL DATA TRANSFERS</h2>
          <p className="text-gray-700">
            Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. CONTACT</h2>
          <p className="text-gray-700 mb-4">
            To exercise your rights or clarify questions about this policy:
          </p>
          <div className="border border-gray-200 p-4">
            <p className="text-gray-700"><strong>Email:</strong> info@matriculausa.com</p>
            <p className="text-gray-700"><strong>Phone:</strong> +1 (213) 676-2544</p>
            <p className="text-gray-700"><strong>Address:</strong> Los Angeles - CA - USA</p>
          </div>
        </section>

        {/* Legal Disclaimer */}
        <div className="border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            <strong>LEGAL DISCLAIMER:</strong> This document was generated as a starting point and does not replace 
            legal consultation from a qualified professional. We recommend review by a specialized attorney before implementation.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy; 