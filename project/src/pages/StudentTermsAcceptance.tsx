import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scroll, GraduationCap } from 'lucide-react';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import Header from '../components/Header';

const StudentTermsAcceptance: React.FC = () => {
  const navigate = useNavigate();
  const { recordTermAcceptance, getLatestActiveTerm } = useTermsAcceptance();
  
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasScrolledToBottomPrivacy, setHasScrolledToBottomPrivacy] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const termsContentRef = useRef<HTMLDivElement>(null);
  const privacyContentRef = useRef<HTMLDivElement>(null);

  // Handle scroll in terms content
  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setHasScrolledToBottom(isAtBottom);
    }
  };

  // Handle scroll in privacy modal
  const handlePrivacyScroll = () => {
    if (privacyContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = privacyContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setHasScrolledToBottomPrivacy(isAtBottom);
    }
  };

  // Handle terms acceptance and show privacy policy
  const handleTermsAccept = () => {
    if (hasScrolledToBottom) {
      setShowPrivacyPolicy(true);
      setHasScrolledToBottomPrivacy(false);
      // Scroll to top when showing privacy policy
      setTimeout(() => {
        if (privacyContentRef.current) {
          privacyContentRef.current.scrollTop = 0;
        }
      }, 100);
    }
  };

  // Handle privacy acceptance
  const handlePrivacyAccept = async () => {
    if (hasScrolledToBottomPrivacy) {
      setLoading(true);
      setError('');
      
      try {
        // Get the latest active terms
        let termsOfServiceTerm = await getLatestActiveTerm('terms_of_service');
        let privacyPolicyTerm = await getLatestActiveTerm('privacy_policy');
        
        // If no active terms exist, create default ones
        if (!termsOfServiceTerm) {
          console.log('No active terms of service found, creating default term');
          const defaultTermsTerm = {
            id: 'default-terms-of-service',
            title: 'Terms of Service',
            content: 'By accepting these terms, you agree to our terms of service.',
            term_type: 'terms_of_service' as const,
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          termsOfServiceTerm = defaultTermsTerm;
        }
        
        if (!privacyPolicyTerm) {
          console.log('No active privacy policy found, creating default term');
          const defaultPrivacyTerm = {
            id: 'default-privacy-policy',
            title: 'Privacy Policy',
            content: 'By accepting this policy, you agree to our privacy policy.',
            term_type: 'privacy_policy' as const,
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          privacyPolicyTerm = defaultPrivacyTerm;
        }
        
        // Record acceptance of both terms of service and privacy policy
        if (termsOfServiceTerm) {
          await recordTermAcceptance(termsOfServiceTerm.id, 'terms_of_service');
        }
        
        if (privacyPolicyTerm) {
          await recordTermAcceptance(privacyPolicyTerm.id, 'privacy_policy');
        }
        
        setShowPrivacyPolicy(false);
        // Redirect to dashboard after successful acceptance
        navigate('/student/dashboard/');
      } catch (error) {
        console.error('Error recording term acceptance:', error);
        setError('Error recording term acceptance. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img 
              src="/favicon-branco.png" 
              alt="Matrícula USA" 
              className="h-12 sm:h-16 w-auto"
            />
          </div>
          <div className="bg-[#05294E] w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-3 sm:mb-4 px-4">
            Accept Terms of Use
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto px-4">
            To continue using the platform, you need to accept our terms of use and privacy policy.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6 max-w-2xl mx-auto">
            <div className="font-medium text-red-800 mb-1">Error</div>
            {error}
          </div>
        )}

        {/* Terms Content */}
        <div className="bg-slate-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-slate-200 mx-4 sm:mx-0">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
              {showPrivacyPolicy ? 'Privacy Policy' : 'Terms of Use and Privacy Policy'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              {showPrivacyPolicy 
                ? 'Please read the privacy policy below carefully before accepting'
                : 'Please read the terms below carefully before accepting'
              }
            </p>
          </div>

          {/* Content */}
          <div 
            ref={showPrivacyPolicy ? privacyContentRef : termsContentRef}
            onScroll={showPrivacyPolicy ? handlePrivacyScroll : handleTermsScroll}
            className="bg-white rounded-xl p-6 max-h-96 overflow-y-auto border border-slate-200 mb-6"
          >
            <div className="prose prose-slate max-w-none">
              {!showPrivacyPolicy ? (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Terms of Use</h3>
              
              {/* 1. ACCEPTANCE OF TERMS */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">1. ACCEPTANCE OF TERMS</h4>
                <p className="text-slate-700 mb-4">
                  By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. If you do not agree to any part of these terms, you should not use our services.
                </p>
              </div>

              {/* 2. SERVICE DESCRIPTION */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">2. SERVICE DESCRIPTION</h4>
                <p className="text-slate-700 mb-4">
                  Matrícula USA is a SaaS (Software as a Service) platform that offers:
                </p>
                
                <div className="space-y-4 mb-4">
                  <div className="border border-slate-200 p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-900 mb-2">2.1 Email Hub for Universities</h5>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
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

                  <div className="border border-slate-200 p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-900 mb-2">2.2 Scholarship Management</h5>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Creation and management of scholarships</li>
                      <li>Student application process</li>
                      <li>Document and application status management</li>
                      <li>Integrated payment system</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. LICENSE GRANT */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">3. LICENSE GRANT</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">3.1 Limited License</h5>
                    <p className="text-slate-700">
                      We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the Matrícula USA platform in accordance with these Terms.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">3.2 Restrictions</h5>
                    <p className="text-slate-700 mb-2">You agree not to:</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                      <li>Use the platform for illegal or unauthorized purposes</li>
                      <li>Attempt to access unauthorized systems or data</li>
                      <li>Interfere with platform operation</li>
                      <li>Share access credentials</li>
                      <li>Use the platform for spam or malicious content</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 4. THIRD-PARTY DEPENDENCIES */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">4. THIRD-PARTY DEPENDENCIES</h4>
                <div className="space-y-4">
                  <div className="border border-slate-300 p-4 bg-slate-50 rounded-lg">
                    <h5 className="font-semibold text-slate-900 mb-2">4.1 Google APIs</h5>
                    <p className="text-slate-700 mb-2">
                      The "Email Hub" functionality depends on Google APIs and is subject to Google's Terms of Service. By using this functionality, you agree to comply with:
                    </p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Google Terms of Service</li>
                      <li>Google Privacy Policy</li>
                      <li>Google API Services User Data Policy</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">4.2 Other Providers</h5>
                    <p className="text-slate-700 mb-2">Our platform also uses:</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                      <li>Supabase: For data storage and authentication</li>
                      <li>Stripe: For payment processing</li>
                      <li>Vercel/Netlify: For application hosting</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 5. INTELLECTUAL PROPERTY */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">5. INTELLECTUAL PROPERTY</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-900 mb-2">5.1 Platform Ownership</h5>
                    <p className="text-slate-700 text-sm">
                      The Matrícula USA platform, including its code, design, features, and content, is the exclusive property of Matrícula USA and is protected by intellectual property laws.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-900 mb-2">5.2 Customer Data</h5>
                    <p className="text-slate-700 text-sm mb-2">All customer data, including:</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Email content</li>
                      <li>Personal information</li>
                      <li>Submitted documents</li>
                      <li>Application history</li>
                    </ul>
                    {/* <p className="text-slate-700 text-sm mt-2">
                      Remains the exclusive property of the customer. Matrícula USA acts only as a processor of this data.
                    </p> */}
                    <p className="text-slate-700 text-sm mt-2">
                      It is important to note that, although the data is customer property, Matrícula USA maintains the right to process and analyze this data to provide the contracted services, always in compliance with our Privacy Policy and applicable data protection laws.
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. RESPONSIBILITIES */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">6. RESPONSIBILITIES</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">6.1 User Responsibilities</h5>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Provide true and accurate information</li>
                      <li>Maintain security of credentials</li>
                      <li>Use the platform responsibly</li>
                      <li>Comply with applicable laws</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">6.2 Matrícula USA Responsibilities</h5>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Maintain platform operation</li>
                      <li>Protect user data according to our Privacy Policy</li>
                      <li>Provide adequate technical support</li>
                      <li>Notify about significant changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 7. LIMITATION OF LIABILITY */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">7. LIMITATION OF LIABILITY</h4>
                <p className="text-slate-700 mb-2">Matrícula USA will not be liable for:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                  <li>Data loss due to technical failures</li>
                  <li>Temporary service interruptions</li>
                  <li>Indirect or consequential damages</li>
                  <li>Actions of third parties (Google, Stripe, etc.)</li>
                </ul>
              </div>

              {/* 8. SUSPENSION AND TERMINATION */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">8. SUSPENSION AND TERMINATION</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">8.1 Suspension</h5>
                    <p className="text-slate-700 mb-2">We may suspend your access if:</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                      <li>You violate these Terms</li>
                      <li>You use the platform abusively</li>
                      <li>You fail to make due payments</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">8.2 Termination</h5>
                    <p className="text-slate-700 mb-2">You may terminate your account at any time. After termination:</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                      <li>Your data will be deleted according to our Privacy Policy</li>
                      <li>Gmail integrations will be disconnected</li>
                      <li>Platform access will be revoked</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 9. MODIFICATIONS */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">9. MODIFICATIONS</h4>
                <p className="text-slate-700">
                  We reserve the right to modify these Terms at any time. Significant changes will be communicated 30 days in advance.
                </p>
              </div>

              {/* 10. GOVERNING LAW */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">10. GOVERNING LAW</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">10.1 Jurisdiction</h5>
                    <p className="text-slate-700">
                      These Terms are governed by the laws of the State of California, United States.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">10.2 Dispute Resolution</h5>
                    <p className="text-slate-700">
                      Any disputes will be resolved in the courts of Los Angeles County, California, with express waiver of any other venue, no matter how privileged.
                    </p>
                  </div>
                </div>
              </div>

              {/* 11. ARBITRATION */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">11. ARBITRATION</h4>
                <p className="text-slate-700">
                  Any disputes arising from these Terms will be resolved through binding arbitration in accordance with the American Arbitration Association rules.
                </p>
              </div>

              {/* 12. GENERAL PROVISIONS */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">12. GENERAL PROVISIONS</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">12.1 Entire Agreement</h5>
                    <p className="text-slate-700">
                      These Terms constitute the complete agreement between the parties.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">12.2 Waiver</h5>
                    <p className="text-slate-700">
                      Failure to exercise any right does not constitute waiver.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">12.3 Severability</h5>
                    <p className="text-slate-700">
                      If any provision is found invalid, the remaining provisions will remain in effect.
                    </p>
                  </div>
                </div>
              </div>

              {/* 13. CONTACT */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">13. CONTACT</h4>
                <p className="text-slate-700 mb-2">For questions about these Terms:</p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800"><strong>Email:</strong> info@matriculausa.com</p>
                  <p className="text-blue-800"><strong>Phone:</strong> +1 (213) 676-2544</p>
                  <p className="text-blue-800"><strong>Address:</strong> Los Angeles - CA - USA</p>
                </div>
              </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Privacy Policy</h3>
                  
                  {/* 1. INTRODUCTION */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">1. INTRODUCTION</h4>
                    <p className="text-slate-700 mb-4">
                      Matrícula USA ("we", "our", "us") is committed to protecting the privacy and personal data of our users. This Privacy Policy describes how we collect, use, store, and protect your information when you use our Email Hub platform for universities.
                    </p>
                  </div>

                  {/* 2. DATA COLLECTED AND ACCESSED */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">2. DATA COLLECTED AND ACCESSED</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">2.1 User Account Data</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                          <li>Full name</li>
                          <li>Email address</li>
                          <li>Phone number</li>
                          <li>Country of origin</li>
                          <li>Academic profile (study level, field of interest, GPA, English proficiency)</li>
                          <li>Payment information (through Stripe)</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">2.2 Gmail Data (Email Hub)</h5>
                        <p className="text-slate-700 mb-2">
                          Based on our platform's code analysis, when you connect your Gmail account, we access the following data:
                        </p>
                        
                        <div className="border border-slate-200 p-4 mb-4">
                          <h6 className="font-semibold text-slate-900 mb-2">gmail.readonly Permission:</h6>
                          <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                            <li>Email list (ID, threadId, sender, recipient, subject)</li>
                            <li>Complete email content (text and HTML body)</li>
                            <li>Email metadata (date, priority, attachments, labels)</li>
                            <li>Email count by category (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                            <li>Email read status</li>
                            <li>Thread/conversation information</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 p-4">
                          <h6 className="font-semibold text-slate-900 mb-2">gmail.send Permission:</h6>
                          <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                            <li>Ability to send emails through Gmail API</li>
                            <li>Ability to forward existing emails</li>
                            <li>Ability to reply to emails</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. HOW WE USE YOUR INFORMATION */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">3. HOW WE USE YOUR INFORMATION</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">3.1 Primary Email Hub Functionality</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                          <li>Email Viewing: We display complete email content to facilitate institutional management</li>
                          <li>Category Organization: We organize emails into tabs (Inbox, Sent, Starred, etc.) with real-time counts</li>
                          <li>Smart Forwarding: We allow forwarding emails with complete content preserved</li>
                          <li>New Email Composition: Integrated interface for creating and sending new institutional emails</li>
                          <li>Search and Filters: Search functionality to locate specific emails</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">3.2 Other Uses</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                          <li>Scholarship and application management</li>
                          <li>Payment processing</li>
                          <li>User communication</li>
                          <li>Platform improvement</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 4. DATA SECURITY */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">4. DATA SECURITY</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border border-slate-200 p-4">
                        <h5 className="font-semibold text-slate-900 mb-2">4.1 Encryption and Storage</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>OAuth Tokens: We store Gmail access and refresh tokens encrypted using AES-GCM with PBKDF2-derived keys</li>
                          <li>Sensitive Data: All sensitive data is encrypted before storage in Supabase</li>
                          <li>Transmission: All communications are protected by HTTPS/TLS</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-4">
                        <h5 className="font-semibold text-slate-900 mb-2">4.2 Security Measures</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Secure OAuth 2.0 authentication</li>
                          <li>Access tokens with automatic expiration</li>
                          <li>Automatic token renewal for expired tokens</li>
                          <li>Detailed logs for security auditing</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 5. GOOGLE COMPLIANCE */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">5. GOOGLE COMPLIANCE</h4>
                    <div className="border border-slate-300 p-4 bg-slate-50 rounded-lg">
                      <h5 className="font-semibold text-slate-900 mb-2">IMPORTANT</h5>
                      <p className="text-slate-700 mb-2">
                        The use and transfer of information received from Google APIs to any other app by Matrícula USA will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
                      </p>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                        <li>We use only necessary permissions (gmail.readonly and gmail.send)</li>
                        <li>We do not share Gmail data with third parties</li>
                        <li>We do not use Gmail data for advertising or profile analysis</li>
                        <li>We respect all Google API usage policies</li>
                      </ul>
                    </div>
                  </div>

                  {/* 6. YOUR RIGHTS */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">6. YOUR RIGHTS (CCPA/State Laws)</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">6.1 Access and Portability</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Request access to all your personal data</li>
                          <li>Receive your data in a structured, machine-readable format</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">6.2 Correction and Update</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Correct inaccurate or incomplete personal data</li>
                          <li>Update your profile information at any time</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">6.3 Deletion</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Request deletion of your personal data</li>
                          <li>Disconnect your Gmail account at any time</li>
                          <li>Delete your platform account</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-900 mb-2">6.4 Consent Withdrawal</h5>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Withdraw consent for Gmail data usage</li>
                          <li>Disconnect third-party integrations</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 7. DATA RETENTION */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">7. DATA RETENTION</h4>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Account Data: Kept while your account is active</li>
                      <li>OAuth Tokens: Stored until you disconnect or delete your account</li>
                      <li>Security Logs: Kept for 12 months for auditing</li>
                      <li>Payment Data: Kept as required by law</li>
                    </ul>
                  </div>

                  {/* 8. DATA SHARING */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">8. DATA SHARING</h4>
                    <p className="text-slate-700 mb-2">
                      We do not sell, rent, or share your personal data with third parties, except:
                    </p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>Essential service providers (Supabase, Stripe, Google)</li>
                      <li>When required by law</li>
                      <li>With your explicit consent</li>
                    </ul>
                  </div>

                  {/* 9. CHILDREN'S PRIVACY */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">9. CHILDREN'S PRIVACY</h4>
                    <p className="text-slate-700">
                      Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
                    </p>
                  </div>

                  {/* 10. INTERNATIONAL DATA TRANSFERS */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">10. INTERNATIONAL DATA TRANSFERS</h4>
                    <p className="text-slate-700">
                      Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
                    </p>
                  </div>

                  {/* 11. CONTACT */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">11. CONTACT</h4>
                    <p className="text-slate-700 mb-2">
                      To exercise your rights or clarify questions about this policy:
                    </p>
                    <div className="border border-slate-200 p-4">
                      <p className="text-slate-700"><strong>Email:</strong> info@matriculausa.com</p>
                      <p className="text-slate-700"><strong>Phone:</strong> +1 (213) 676-2544</p>
                      <p className="text-slate-700"><strong>Address:</strong> Los Angeles - CA - USA</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Scroll indicator */}
            {(!showPrivacyPolicy && !hasScrolledToBottom) && (
              <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                <span className="text-amber-800 font-medium">
                  Scroll down to read all terms
                </span>
              </div>
            )}
            {(showPrivacyPolicy && !hasScrolledToBottomPrivacy) && (
              <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                <span className="text-amber-800 font-medium">
                  Scroll down to read the entire policy
                </span>
              </div>
            )}
          </div>

          {/* Accept Button */}
          <div className="flex justify-center">
            {!showPrivacyPolicy ? (
              <button
                onClick={handleTermsAccept}
                disabled={!hasScrolledToBottom}
                className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                  hasScrolledToBottom
                    ? 'bg-[#05294E] text-white hover:bg-[#041f3a] shadow-lg'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {hasScrolledToBottom ? 'Accept Terms and Continue' : 'Read all terms first'}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowPrivacyPolicy(false);
                    // Scroll to top when going back to terms
                    setTimeout(() => {
                      if (termsContentRef.current) {
                        termsContentRef.current.scrollTop = 0;
                      }
                    }, 100);
                  }}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Back to Terms
                </button>
                <button
                  onClick={handlePrivacyAccept}
                  disabled={!hasScrolledToBottomPrivacy || loading}
                  className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                    hasScrolledToBottomPrivacy && !loading
                      ? 'bg-[#05294E] text-white hover:bg-[#041f3a] shadow-lg'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    hasScrolledToBottomPrivacy ? 'Accept and Continue' : 'Read the entire policy first'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


      </div>
    </div>
  );
};

export default StudentTermsAcceptance;
