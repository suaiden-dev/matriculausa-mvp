import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: object;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Matrícula USA - International Student Scholarship Platform',
  description = 'Connect with top American universities, access exclusive scholarships, and get personalized support throughout your journey to studying in the USA. Start your American education journey today.',
  keywords = 'study in USA, international students, American universities, scholarships, student visa, F1 visa, university admissions, study abroad, USA education',
  canonicalUrl,
  ogImage = '/logo.png.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noIndex = false,
  noFollow = false,
  structuredData
}) => {
  const fullTitle = title.includes('Matrícula USA') ? title : `${title} | Matrícula USA`;
  const fullCanonicalUrl = canonicalUrl || window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={`${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Matrícula USA" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@matriculausa" />
      
      {/* Additional Meta Tags */}
      <meta name="author" content="Matrícula USA" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#3B82F6" />
      
      {/* Structured Data / Schema Markup */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Favicon and App Icons */}
      <link rel="icon" type="image/png" href="/favicon-branco.png" />
      <link rel="apple-touch-icon" href="/favicon-branco.png" />
    </Helmet>
  );
};

export default SEOHead;
