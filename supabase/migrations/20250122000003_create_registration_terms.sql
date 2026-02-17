-- =====================================================
-- Migration: Create Registration Terms (terms_of_service and privacy_policy)
-- =====================================================
-- Cria os termos de registro que são necessários para o sistema de aceite automático
-- O conteúdo é EXATAMENTE igual ao das páginas hardcoded TermsOfService.tsx e PrivacyPolicy.tsx
-- para que quando migrarmos para buscar do banco, fique idêntico
-- =====================================================

DO $$
DECLARE
  terms_exists boolean;
  privacy_exists boolean;
  terms_id uuid;
  privacy_id uuid;
BEGIN
  -- Verificar se Terms of Service ativo existe
  SELECT EXISTS(
    SELECT 1 FROM public.application_terms 
    WHERE term_type = 'terms_of_service' 
    AND is_active = true
  ) INTO terms_exists;

  -- Criar Terms of Service se não existir
  IF NOT terms_exists THEN
    INSERT INTO public.application_terms (
      title,
      content,
      term_type,
      version,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      'Terms of Service',
      '<div class="space-y-12">
        
        <section id="acceptance" class="scroll-mt-8">
          <div class="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              1. ACCEPTANCE OF TERMS
            </h2>
            <p class="text-gray-700 leading-relaxed text-lg">
              By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. 
              If you do not agree to any part of these terms, you should not use our services.
            </p>
          </div>
        </section>

        <section id="service-description" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              2. SERVICE DESCRIPTION
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                2.1 Email Hub for Universities
              </h3>
              <ul class="space-y-3 text-gray-700">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Secure Gmail OAuth 2.0 integration
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Professional institutional interface
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Organized tab system (Inbox, Sent, etc.)
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Real-time email counts
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Smart forwarding functionality
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Integrated composer & search
                </li>
              </ul>
            </div>

            <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                2.2 Scholarship Management
              </h3>
              <ul class="space-y-3 text-gray-700">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Create and manage scholarships
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Student application process
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Document status management
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Integrated payment system
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="license" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              3. LICENSE GRANT
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">3.1 Limited License</h3>
              <p class="text-gray-700 text-sm">
                We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use 
                the Matrícula USA platform in accordance with these Terms.
              </p>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">3.2 Restrictions</h3>
              <p class="text-gray-700 mb-3 text-sm">You agree not to:</p>
              <ul class="space-y-2 text-sm text-gray-700">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Use for illegal purposes
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Access unauthorized systems
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Interfere with operation
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Share credentials
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="third-party" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              4. THIRD-PARTY DEPENDENCIES
            </h2>
          </div>
          
          <div class="space-y-6">
            <div class="bg-gray-50 border border-gray-200 p-6 rounded-lg">
              <h3 class="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                4.1 Google APIs
              </h3>
              <p class="text-gray-700 mb-3">
                The "Email Hub" functionality depends on Google APIs and is subject to Google''s Terms of Service. 
                By using this functionality, you agree to comply with:
              </p>
              <div class="space-y-2 text-sm text-gray-700">
                <div class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <a href="https://policies.google.com/terms" class="text-gray-700 hover:text-[#05294E] hover:underline">Google Terms of Service</a>
                </div>
                <div class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <a href="https://policies.google.com/privacy" class="text-gray-700 hover:text-[#05294E] hover:underline">Google Privacy Policy</a>
                </div>
                <div class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  <a href="https://developers.google.com/terms/api-services-user-data-policy" class="text-gray-700 hover:text-[#05294E] hover:underline">Google API Services User Data Policy</a>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 border border-gray-200 p-6 rounded-lg">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">4.2 Other Providers</h3>
              <p class="text-gray-700 mb-3">Our platform also uses:</p>
              <div class="grid md:grid-cols-3 gap-4">
                <div class="text-center p-3 bg-white rounded border">
                  <div class="text-sm font-medium text-gray-900">Supabase</div>
                  <div class="text-xs text-gray-600">Data storage & auth</div>
                </div>
                <div class="text-center p-3 bg-white rounded border">
                  <div class="text-sm font-medium text-gray-900">Stripe</div>
                  <div class="text-xs text-gray-600">Payment processing</div>
                </div>
                <div class="text-center p-3 bg-white rounded border">
                  <div class="text-sm font-medium text-gray-900">Vercel/Netlify</div>
                  <div class="text-xs text-gray-600">Application hosting</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="intellectual-property" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              5. INTELLECTUAL PROPERTY
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 class="text-xl font-semibold text-[#05294E] mb-3">5.1 Platform Ownership</h3>
              <p class="text-gray-700 text-sm">
                The Matrícula USA platform, including its code, design, features, and content, is the exclusive 
                property of Matrícula USA and is protected by intellectual property laws.
              </p>
            </div>

            <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 class="text-xl font-semibold text-[#05294E] mb-3">5.2 Customer Data</h3>
              <p class="text-gray-700 text-sm mb-3">All customer data, including:</p>
              <ul class="space-y-2 text-sm text-gray-700">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Email content
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Personal information
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Submitted documents
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Application history
                </li>
              </ul>
              <p class="text-gray-700 text-sm mt-3">
                Remains the exclusive property of the customer. Matrícula USA acts only as a processor of this data.
              </p>
            </div>
          </div>
        </section>

        <section id="responsibilities" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              6. RESPONSIBILITIES
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">6.1 User Responsibilities</h3>
              <ul class="space-y-2 text-gray-700">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Provide true and accurate information
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Maintain security of credentials
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Use the platform responsibly
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Comply with applicable laws
                </li>
              </ul>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">6.2 Matrícula USA Responsibilities</h3>
              <ul class="space-y-2 text-gray-700">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Maintain platform operation
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Protect user data according to Privacy Policy
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Provide adequate technical support
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-[#05294E] rounded-full mr-3 mt-2"></div>
                  Notify about significant changes
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="grid md:grid-cols-3 gap-6">
          <div id="liability" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              7. LIMITATION OF LIABILITY
            </h3>
            <div class="space-y-2 text-sm text-gray-700">
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Data loss due to technical failures
              </div>
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Temporary service interruptions
              </div>
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Indirect or consequential damages
              </div>
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Actions of third parties
              </div>
            </div>
          </div>

          <div id="suspension" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              8. SUSPENSION & TERMINATION
            </h3>
            <div class="space-y-2 text-sm text-gray-700">
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Violation of Terms
              </div>
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Abusive platform use
              </div>
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Payment failures
              </div>
              <div class="flex items-start">
                <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                Account termination rights
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div id="modifications" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
                9. MODIFICATIONS
              </h4>
              <p class="text-gray-700 text-sm">
                We reserve the right to modify these Terms. Significant changes communicated 30 days in advance.
              </p>
            </div>

            <div id="governing-law" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
                10. GOVERNING LAW
              </h4>
              <p class="text-gray-700 text-sm">
                Governed by State laws, United States. Disputes resolved in local courts.
              </p>
            </div>
          </div>
        </section>

        <section class="space-y-6">
          <div id="arbitration" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              11. ARBITRATION
            </h3>
            <p class="text-gray-700 text-sm">
              Any disputes arising from these Terms will be resolved through binding arbitration in accordance with 
              the American Arbitration Association rules.
            </p>
          </div>

          <div id="general-provisions" class="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              12. GENERAL PROVISIONS
            </h3>
            <div class="grid md:grid-cols-3 gap-4">
              <div class="text-center p-3 bg-white rounded border">
                <div class="text-sm font-medium text-gray-900">Entire Agreement</div>
                <div class="text-xs text-gray-600">Complete agreement between parties</div>
              </div>
              <div class="text-center p-3 bg-white rounded border">
                <div class="text-sm font-medium text-gray-900">Waiver</div>
                <div class="text-xs text-gray-600">Failure to exercise right ≠ waiver</div>
              </div>
              <div class="text-center p-3 bg-white rounded border">
                <div class="text-sm font-medium text-gray-900">Severability</div>
                <div class="text-xs text-gray-600">Invalid provisions don''t affect others</div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" class="scroll-mt-8">
          <div class="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              13. CONTACT
            </h2>
            <p class="text-gray-700 mb-6">
              For questions about these Terms:
            </p>
            <div class="grid md:grid-cols-3 gap-4">
              <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div class="text-sm font-medium text-gray-900">Email</div>
                <div class="text-sm text-gray-600">info@matriculausa.com</div>
              </div>
              <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div class="text-sm font-medium text-gray-900">Phone</div>
                <div class="text-sm text-gray-600">+1 (213) 676-2544</div>
              </div>
              <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div class="text-sm font-medium text-gray-900">Address</div>
                <div class="text-sm text-gray-600">Los Angeles, CA, USA</div>
              </div>
            </div>
          </div>
        </section>
      </div>',
      'terms_of_service',
      1,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO terms_id;
    RAISE NOTICE '✅ Terms of Service criado com ID: %', terms_id;
  ELSE
    RAISE NOTICE 'ℹ️ Terms of Service já existe (ativo)';
  END IF;

  -- Verificar se Privacy Policy ativa existe
  SELECT EXISTS(
    SELECT 1 FROM public.application_terms 
    WHERE term_type = 'privacy_policy' 
    AND is_active = true
  ) INTO privacy_exists;

  -- Criar Privacy Policy se não existir
  IF NOT privacy_exists THEN
    INSERT INTO public.application_terms (
      title,
      content,
      term_type,
      version,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      'Privacy Policy',
      '<div class="space-y-12">
        
        <section id="introduction" class="scroll-mt-8">
          <div class="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              1. INTRODUCTION
            </h2>
            <p class="text-gray-700 leading-relaxed text-lg">
              Matrícula USA ("we", "our", "us") is committed to protecting the privacy and personal data of our users. 
              This Privacy Policy describes how we collect, use, store, and protect your information when you use our 
              Email Hub platform for universities.
            </p>
          </div>
        </section>

        <section id="data-collected" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              2. DATA COLLECTED AND ACCESSED
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                2.1 User Account Data
              </h3>
              <ul class="space-y-3 text-gray-700">
                <li class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Full name
                </li>
                <li class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Email address
                </li>
                <li class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Phone number
                </li>
                <li class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Country of origin
                </li>
                <li class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Academic profile
                </li>
                <li class="flex items-center">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Payment information (Stripe)
                </li>
              </ul>
            </div>

            <div class="space-y-4">
              <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                2.2 Gmail Data (Email Hub)
              </h3>
              <p class="text-gray-600 text-sm">
                When you connect your Gmail account, we access:
              </p>
              
              <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
                <h4 class="font-semibold text-gray-900 mb-2 text-sm">gmail.readonly Permission:</h4>
                <div class="text-xs text-gray-700 space-y-1">
                  <div>• Email list and metadata</div>
                  <div>• Complete email content</div>
                  <div>• Read status and organization</div>
                </div>
              </div>

              <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
                <h4 class="font-semibold text-gray-900 mb-2 text-sm">gmail.send Permission:</h4>
                <div class="text-xs text-gray-700 space-y-1">
                  <div>• Send emails via Gmail API</div>
                  <div>• Forward existing emails</div>
                  <div>• Reply to emails</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-we-use" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              3. HOW WE USE YOUR INFORMATION
            </h2>
          </div>
          
          <div class="space-y-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 mb-3">3.1 Primary Email Hub Functionality</h3>
              <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Email Viewing:</strong> We display complete email content to facilitate institutional management</li>
                <li><strong>Category Organization:</strong> We organize emails into tabs (Inbox, Sent, Starred, etc.) with real-time counts</li>
                <li><strong>Smart Forwarding:</strong> We allow forwarding emails with complete content preserved</li>
                <li><strong>New Email Composition:</strong> Integrated interface for creating and sending new institutional emails</li>
                <li><strong>Search and Filters:</strong> Search functionality to locate specific emails</li>
              </ul>
            </div>

            <div>
              <h3 class="text-xl font-semibold text-gray-900 mb-3">3.2 Other Uses</h3>
              <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Scholarship and application management</li>
                <li>Payment processing</li>
                <li>User communication</li>
                <li>Platform improvement</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="security" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              4. DATA SECURITY
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="border border-gray-200 p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">
                4.1 Encryption and Storage
              </h3>
              <ul class="list-disc list-inside text-gray-700 space-y-2 text-sm">
                <li><strong>OAuth Tokens:</strong> We store Gmail access and refresh tokens encrypted using AES-GCM with PBKDF2-derived keys</li>
                <li><strong>Sensitive Data:</strong> All sensitive data is encrypted before storage in Supabase</li>
                <li><strong>Transmission:</strong> All communications are protected by HTTPS/TLS</li>
              </ul>
            </div>

            <div class="border border-gray-200 p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-3">
                4.2 Security Measures
              </h3>
              <ul class="list-disc list-inside text-gray-700 space-y-2 text-sm">
                <li>Secure OAuth 2.0 authentication</li>
                <li>Access tokens with automatic expiration</li>
                <li>Automatic token renewal for expired tokens</li>
                <li>Detailed logs for security auditing</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="google-compliance" class="scroll-mt-8">
          <div class="border-l-4 border-red-500 bg-red-50 p-6 rounded-r-lg">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              5. GOOGLE COMPLIANCE
            </h2>
          
            <div class="border border-red-300 p-6 bg-red-50 rounded-lg">
              <h3 class="text-xl font-semibold text-red-900 mb-3 flex items-center">
                IMPORTANT
              </h3>
              <p class="text-red-800 mb-4">
                The use and transfer of information received from Google APIs to any other app by Matrícula USA will 
                adhere to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements.
              </p>
              <ul class="list-disc list-inside text-red-800 space-y-2">
                <li>We use only necessary permissions (gmail.readonly and gmail.send)</li>
                <li>We do not share Gmail data with third parties</li>
                <li>We do not use Gmail data for advertising or profile analysis</li>
                <li>We respect all Google API usage policies</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="user-rights" class="scroll-mt-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              6. YOUR RIGHTS (CCPA/State Laws)
            </h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Access & Portability</h3>
              <ul class="text-gray-700 space-y-2 text-sm">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Request access to all your personal data
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Receive data in machine-readable format
                </li>
              </ul>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Correction & Update</h3>
              <ul class="text-gray-700 space-y-2 text-sm">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Correct inaccurate personal data
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Update profile information anytime
                </li>
              </ul>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Deletion</h3>
              <ul class="text-gray-700 space-y-2 text-sm">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Request deletion of personal data
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Disconnect Gmail account anytime
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Delete platform account
                </li>
              </ul>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Consent Withdrawal</h3>
              <ul class="text-gray-700 space-y-2 text-sm">
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Withdraw Gmail data consent
                </li>
                <li class="flex items-start">
                  <div class="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
                  Disconnect integrations
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="border-l-4 border-gray-400 p-6 bg-gray-50">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">7. DATA RETENTION</h2>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Account Data:</strong> Kept while your account is active</li>
            <li><strong>OAuth Tokens:</strong> Stored until you disconnect or delete your account</li>
            <li><strong>Security Logs:</strong> Kept for 12 months for auditing</li>
            <li><strong>Payment Data:</strong> Kept as required by law</li>
          </ul>
        </section>

        <section class="border-l-4 border-gray-400 p-6 bg-gray-50">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">8. DATA SHARING</h2>
          <p class="text-gray-700 mb-4">
            We do not sell, rent, or share your personal data with third parties, except:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-2">
            <li>Essential service providers (Supabase, Stripe, Google)</li>
            <li>When required by law</li>
            <li>With your explicit consent</li>
          </ul>
        </section>

        <section class="border-l-4 border-gray-400 p-6 bg-gray-50">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">9. CHILDREN''S PRIVACY</h2>
          <p class="text-gray-700">
            Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section class="border-l-4 border-gray-400 p-6 bg-gray-50">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">10. INTERNATIONAL DATA TRANSFERS</h2>
          <p class="text-gray-700">
            Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        <section id="contact" class="scroll-mt-8">
          <div class="border-l-4 border-[#05294E] bg-gray-50 p-6 rounded-r-lg">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              11. CONTACT
            </h2>
            <p class="text-gray-700 mb-6">
              To exercise your rights or clarify questions about this policy:
            </p>
            <div class="grid md:grid-cols-3 gap-4">
              <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div class="text-sm font-medium text-gray-900">Email</div>
                <div class="text-sm text-gray-600">info@matriculausa.com</div>
              </div>
              <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div class="text-sm font-medium text-gray-900">Phone</div>
                <div class="text-sm text-gray-600">+1 (213) 676-2544</div>
              </div>
              <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div class="text-sm font-medium text-gray-900">Address</div>
                <div class="text-sm text-gray-600">Los Angeles, CA, USA</div>
              </div>
            </div>
          </div>
        </section>
      </div>',
      'privacy_policy',
      1,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO privacy_id;
    RAISE NOTICE '✅ Privacy Policy criada com ID: %', privacy_id;
  ELSE
    RAISE NOTICE 'ℹ️ Privacy Policy já existe (ativa)';
  END IF;
END $$;
