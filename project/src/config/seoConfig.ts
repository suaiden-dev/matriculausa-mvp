export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  ogType: 'website' | 'article' | 'profile';
  structuredData?: object;
}

export const seoConfig: Record<string, SEOConfig> = {
  // Home Page
  '/': {
    title: 'Matrícula USA - International Student Scholarship Platform',
    description: 'Connect with top American universities, access exclusive scholarships, and get personalized support throughout your journey to studying in the USA. Start your American education journey today.',
    keywords: 'study in USA, international students, American universities, scholarships, student visa, F1 visa, university admissions, study abroad, USA education',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Matrícula USA",
      "url": "https://matriculausa.com",
      "logo": "https://matriculausa.com/logo.png.png",
      "description": "Leading digital platform connecting international students to American universities and scholarships",
      "sameAs": [
        "https://www.facebook.com/matriculausa",
        "https://www.instagram.com/matriculausa",
        "https://www.linkedin.com/company/matriculausa"
      ]
    }
  },

  // About Page
  '/about': {
    title: 'About Matrícula USA - Empowering International Education',
    description: 'Learn about Matrícula USA\'s mission to connect international students with American universities. Discover our story, values, and commitment to making education accessible.',
    keywords: 'about Matrícula USA, international education platform, study abroad mission, American universities partner',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About Matrícula USA",
      "description": "Learn about Matrícula USA's mission to connect international students with American universities"
    }
  },

  // Scholarships Page
  '/scholarships': {
    title: 'Exclusive Scholarships for International Students - Matrícula USA',
    description: 'Discover exclusive scholarships available only through Matrícula USA. Find financial aid opportunities specifically designed for international students studying in the USA.',
    keywords: 'scholarships for international students, USA scholarships, study abroad funding, financial aid, exclusive scholarships',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Exclusive Scholarships for International Students",
      "description": "Discover exclusive scholarships available only through Matrícula USA"
    }
  },

  // Universities Page
  '/schools': {
    title: 'Partner Universities in USA - Matrícula USA',
    description: 'Explore our network of partner universities across the United States. Find accredited institutions offering programs for international students.',
    keywords: 'USA universities, partner universities, accredited universities, study in USA, American colleges',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Partner Universities in USA",
      "description": "Explore our network of partner universities across the United States"
    }
  },

  // How It Works Page
  '/how-it-works': {
    title: 'How Matrícula USA Works - Your Path to American Education',
    description: 'Understand the step-by-step process of how Matrícula USA helps international students connect with American universities and secure scholarships.',
    keywords: 'how to study in USA, application process, university application steps, study abroad process',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Study in USA with Matrícula USA",
      "description": "Step-by-step process to study in American universities"
    }
  },

  // Contact Page
  '/contact': {
    title: 'Contact Matrícula USA - Get Support for Your Education Journey',
    description: 'Get in touch with our team for personalized support with your American education journey. We\'re here to help you succeed.',
    keywords: 'contact Matrícula USA, study abroad support, international student help, education consultation',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact Matrícula USA",
      "description": "Get support for your American education journey"
    }
  },

  // FAQ Page
  '/faq': {
    title: 'Frequently Asked Questions - Matrícula USA',
    description: 'Find answers to common questions about studying in the USA, scholarships, visas, and the Matrícula USA platform.',
    keywords: 'FAQ, frequently asked questions, study abroad questions, USA education FAQ, visa questions',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "name": "Frequently Asked Questions",
      "description": "Common questions about studying in the USA and Matrícula USA"
    }
  },

  // Privacy Policy
  '/privacy-policy': {
    title: 'Privacy Policy - Matrícula USA',
    description: 'Learn how Matrícula USA protects and handles your personal information. Read our comprehensive privacy policy.',
    keywords: 'privacy policy, data protection, personal information, GDPR compliance',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy",
      "description": "How Matrícula USA protects your personal information"
    }
  },

  // Terms of Service
  '/terms-of-service': {
    title: 'Terms of Service - Matrícula USA',
    description: 'Read the terms and conditions governing your use of the Matrícula USA platform and services.',
    keywords: 'terms of service, terms and conditions, user agreement, platform terms',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Terms of Service",
      "description": "Terms and conditions for using Matrícula USA"
    }
  },

  // For Universities Page
  '/for-universities': {
    title: 'For Universities - Partner with Matrícula USA',
    description: 'Join our network of partner universities and connect with qualified international students. Expand your global reach with Matrícula USA.',
    keywords: 'partner universities, university partnerships, international student recruitment, higher education partnerships',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "For Universities",
      "description": "Partner with Matrícula USA to connect with international students"
    }
  },

  // Support Center
  '/support': {
    title: 'Support Center - Get Help with Matrícula USA',
    description: 'Access comprehensive support resources, tutorials, and help articles to make the most of your Matrícula USA experience.',
    keywords: 'support center, help center, customer support, study abroad help, platform support',
    ogType: 'website',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Support Center",
      "description": "Get help and support for your Matrícula USA experience"
    }
  }
};

// Function to get SEO config for a specific path
export const getSEOConfig = (path: string): SEOConfig => {
  // Remove trailing slash for consistency
  const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  
  // Try exact match first
  if (seoConfig[cleanPath]) {
    return seoConfig[cleanPath];
  }
  
  // Try with trailing slash
  if (seoConfig[cleanPath + '/']) {
    return seoConfig[cleanPath + '/'];
  }
  
  // Return default config if no match found
  return seoConfig['/'];
};

// Function to generate structured data for universities
export const generateUniversityStructuredData = (university: any) => {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": university.name,
    "description": university.description,
    "url": university.website,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": university.location?.split(',')[0] || '',
      "addressRegion": university.location?.split(',')[1] || '',
      "addressCountry": "US"
    },
    "sameAs": university.social_media || []
  };
};

// Function to generate structured data for scholarships
export const generateScholarshipStructuredData = (scholarship: any) => {
  return {
    "@context": "https://schema.org",
    "@type": "Scholarship",
    "name": scholarship.title,
    "description": scholarship.description,
    "amount": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": scholarship.amount
    },
    "eligibilityCriteria": scholarship.requirements?.join(', '),
    "applicationDeadline": scholarship.deadline
  };
};
