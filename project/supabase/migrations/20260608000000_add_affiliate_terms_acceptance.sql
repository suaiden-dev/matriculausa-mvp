-- Migration: Add terms_accepted column to affiliate_codes and seed default affiliate terms

-- Add terms_accepted column to public.affiliate_codes if it doesn't exist
ALTER TABLE public.affiliate_codes 
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false;

-- Insert default affiliate terms if they don't exist
INSERT INTO public.application_terms (title, content, term_type, version) VALUES
(
  'Affiliate Terms and Conditions',
  '<div class="prose prose-gray max-w-none">
    <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
      <svg class="h-5 w-5 mr-2 text-[#05294E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      Matrícula USA Affiliate Program Agreement
    </h2>
    
    <h3 class="text-lg font-semibold text-gray-800 mb-3">1. Affiliate Program Participation</h3>
    <p class="text-gray-600 mb-4">
      By participating in the Matrícula USA affiliate program, you agree to promote our platform and services to potential students ethically and professionally.
    </p>
    
    <h3 class="text-lg font-semibold text-gray-800 mb-3">2. Referral Codes and Links</h3>
    <p class="text-gray-600 mb-4">
      You will be provided with a unique referral link and code. You are responsible for the distribution of your referral code. Under no circumstances should you engage in spamming or misleading advertising.
    </p>
    
    <h3 class="text-lg font-semibold text-gray-800 mb-3">3. Rewards and Commissions</h3>
    <p class="text-gray-600 mb-4">
      Affiliates earn Matrícula Coins and/or cash rewards for every successful student enrollment who registers using their referral code. Rewards are subject to verification and approval.
    </p>
    
    <h3 class="text-lg font-semibold text-gray-800 mb-3">4. Intellectual Property</h3>
    <p class="text-gray-600 mb-4">
      You are granted a limited, non-exclusive, non-transferable license to use the Matrícula USA logo and promotional assets solely for marketing purposes under this program.
    </p>
    
    <h3 class="text-lg font-semibold text-gray-800 mb-3">Agreement Acceptance</h3>
    <p class="text-gray-600 mb-4">
      By confirming your participation as an affiliate, you acknowledge that you have read, understood, and agree to all the terms above.
    </p>
  </div>',
  'affiliate_terms',
  1
)
ON CONFLICT DO NOTHING;
