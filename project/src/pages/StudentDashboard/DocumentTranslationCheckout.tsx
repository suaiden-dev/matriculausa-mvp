import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Minus,
  Plus
} from 'lucide-react';
import './DocumentTranslationCheckout.css';

// Prices per page in USD
const PRICE_PER_PAGE_BANK_STATEMENT = 25;
const PRICE_PER_PAGE_CERTIFIED = 20;

interface TranslationDocument {
  type: string; // passport, diploma, funds_proof
  source_language: string;
  document_url: string;
  label?: string;
  page_count?: number; // Optional count from analysis
}

interface TranslationState {
  documentsNeedingTranslation: TranslationDocument[];
  docUrls: Record<string, string>;
}

const DocumentTranslationCheckout: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State from navigation
  const state = location.state as TranslationState | null;

  // Page counts per document
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [isDetectingPages, setIsDetectingPages] = useState<Record<string, boolean>>({});
  const [selectedPayment, setSelectedPayment] = useState<'stripe_card' | 'stripe_pix' | 'zelle' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualReviewWarning, setShowManualReviewWarning] = useState(false);

  // Helper to detect PDF page count using Supabase Storage or direct URL
  const detectPdfPages = async (pathOrUrl: string, docType: string): Promise<number | null> => {
    console.log(`[detectPdfPages] [${docType}] Starting detection for: ${pathOrUrl}`);
    try {
      if (!pathOrUrl) return null;
      
      let buffer: ArrayBuffer;
      
      // Check if it's a full URL or a storage path
      if (pathOrUrl.startsWith('http')) {
        const response = await fetch(pathOrUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        buffer = await response.arrayBuffer();
      } else {
        // It's a storage path, download from Supabase
        const { data, error: downloadError } = await supabase.storage
          .from('student-documents')
          .download(pathOrUrl);
          
        if (downloadError) {
          console.warn(`[detectPdfPages] [${docType}] Supabase download error:`, downloadError);
          const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(pathOrUrl);
          const response = await fetch(publicUrl);
          if (!response.ok) throw new Error(`Fallback fetch failed: ${response.status}`);
          buffer = await response.arrayBuffer();
        } else {
          buffer = await data.arrayBuffer();
        }
      }

      console.log(`[detectPdfPages] [${docType}] File downloaded, size: ${buffer.byteLength} bytes`);

      try {
        // Load pdf-lib dynamically for 100% reliable page counting
        const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        console.log(`[detectPdfPages] [${docType}] PDF-LIB detected: ${count} pages`);
        return count;
      } catch (pdfLibError) {
        console.warn(`[detectPdfPages] [${docType}] pdf-lib failed, falling back to regex:`, pdfLibError);
        
        // Fallback to binary-safe regex if pdf-lib fails
        const content = new TextDecoder('latin1').decode(buffer);
        
        // Method 1: Standard /Type /Page scan
        const pageTypeRegex = /\/Type\s*\/Page\b/gi;
        const pageMatches = content.match(pageTypeRegex);
        if (pageMatches && pageMatches.length > 0) {
          console.log(`[detectPdfPages] [${docType}] Regex Method 1 found ${pageMatches.length} pages`);
          return pageMatches.length;
        }
        
        // Method 2: Exhaustive /Count scan
        const countRegex = /\/Count\s*(\d+)/gi;
        let match;
        let maxCount = 0;
        while ((match = countRegex.exec(content)) !== null) {
          const val = parseInt(match[1], 10);
          if (val > maxCount && val < 500) maxCount = val;
        }
        if (maxCount > 0) {
          console.log(`[detectPdfPages] [${docType}] Regex Method 2 found max /Count: ${maxCount}`);
          return maxCount;
        }
      }
      
      console.warn(`[detectPdfPages] [${docType}] All detection methods failed`);
      return null;
    } catch (err) {
      console.error(`[detectPdfPages] [${docType}] Error:`, err);
      return null;
    }
  };

  // Initialize page counts and auto-detect
  useEffect(() => {
    if (state?.documentsNeedingTranslation && Object.keys(pageCounts).length === 0) {
      console.log('[TranslationCheckout] Initializing auto-detection for:', state.documentsNeedingTranslation.map(d => d.type));
      
      const initial: Record<string, number> = {};
      const detecting: Record<string, boolean> = {};
      
      state.documentsNeedingTranslation.forEach(doc => {
        initial[doc.type] = doc.page_count || 1;
        detecting[doc.type] = !doc.page_count; // Only detect if count wasn't provided
      });
      
      setPageCounts(initial);
      setIsDetectingPages(detecting);

      // Auto-detect pages for each document without count
      state.documentsNeedingTranslation.forEach(async (doc) => {
        if (doc.page_count) {
          console.log(`[TranslationCheckout] Using provided page count for ${doc.type}: ${doc.page_count}`);
          return;
        }

        const url = doc.document_url || state.docUrls?.[doc.type];
        if (url) {
          const count = await detectPdfPages(url, doc.type);
          if (count) {
            console.log(`[TranslationCheckout] UPDATING page count for ${doc.type} to: ${count}`);
            setPageCounts(prev => ({ ...prev, [doc.type]: count }));
          }
        }
        setIsDetectingPages(prev => ({ ...prev, [doc.type]: false }));
      });
    }
  }, [state]);

  if (!state?.documentsNeedingTranslation || state.documentsNeedingTranslation.length === 0) {
    return (
      <div className="translation-checkout-container">
        <div className="translation-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            {t('studentDashboard.documentTranslation.noDocuments', 'No documents need translation')}
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            {t('studentDashboard.documentTranslation.noDocumentsDesc', 'All your documents appear to be in English. Go back to continue your application.')}
          </p>
          <button
            className="translation-back-btn"
            onClick={() => navigate('/student/dashboard/documents-and-scholarship-choice')}
          >
            <ChevronLeft /> {t('studentDashboard.documentTranslation.backToDocuments', 'Back to Documents')}
          </button>
        </div>
      </div>
    );
  }

  const documents = state.documentsNeedingTranslation;

  const getDocLabel = (type: string): string => {
    switch (type) {
      case 'passport': return t('studentDashboard.documentTranslation.docPassport', 'Passport');
      case 'diploma': return t('studentDashboard.documentTranslation.docDiploma', 'Diploma / Degree');
      case 'funds_proof': return t('studentDashboard.documentTranslation.docFundsProof', 'Bank Statement');
      default: return type;
    }
  };

  const getPricePerPage = (type: string): number => {
    return type === 'funds_proof' ? PRICE_PER_PAGE_BANK_STATEMENT : PRICE_PER_PAGE_CERTIFIED;
  };

  const getDocTotal = (type: string): number => {
    return getPricePerPage(type) * (pageCounts[type] || 1);
  };

  const grandTotal = documents.reduce((sum, doc) => sum + getDocTotal(doc.type), 0);

  // Stripe Fee Calculation Logic (replicated from Edge Function for UI consistency)
  const calculateGrossTotal = () => {
    if (!selectedPayment || selectedPayment === 'zelle') return grandTotal;
    
    // Default to card logic for card/pix USD base
    const STRIPE_PERCENTAGE = 0.039; // 3.9%
    const STRIPE_FIXED_FEE = 0.30;   // $0.30
    
    if (selectedPayment === 'stripe_card') {
      const gross = (grandTotal + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE);
      return Math.round(gross * 100) / 100;
    }
    
    // For PIX, the Edge Function converts to BRL. 
    // Usually displayed in USD on this summary unless explicitly BRL.
    // Keeping simple 3.9% logic for summary consistency or flat if preferred.
    // Following same logic as card for simplified USD display.
    const gross = (grandTotal + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE);
    return Math.round(gross * 100) / 100;
  };

  const finalTotal = calculateGrossTotal();
  const stripeFee = finalTotal - grandTotal;

  const updatePageCount = (type: string, delta: number) => {
    setPageCounts(prev => ({
      ...prev,
      [type]: Math.max(1, (prev[type] || 1) + delta)
    }));
  };

  const handleSubmit = async () => {
    if (!selectedPayment || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create translation orders for each document
      const orders = documents.map(doc => ({
        user_id: user.id,
        document_type: 'certificado',
        source_language: doc.source_language || 'Unknown',
        target_language: 'en',
        document_url: doc.document_url || state.docUrls?.[doc.type] || '',
        original_document_type: doc.type,
        page_count: pageCounts[doc.type] || 1,
        price_per_page: getPricePerPage(doc.type),
        total_price: getDocTotal(doc.type),
        status: 'pending',
        payment_method: selectedPayment,
      }));

      const { data: insertedOrders, error: insertError } = await supabase
        .from('translation_orders')
        .insert(orders)
        .select();

      if (insertError) throw insertError;

      // Submit to TFOE webhook
      const orderIds = (insertedOrders || []).map((o: any) => o.id);
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) throw new Error('Not authenticated');

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const tfoeApiUrl = `${SUPABASE_URL}/functions/v1/submit-tfoe-translation`;

        console.log('[DocumentTranslationCheckout] Submitting to TFOE:', orderIds);

        const tfoeResponse = await fetch(tfoeApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            translation_order_ids: orderIds,
          }),
        });

        const tfoeResult = await tfoeResponse.json();

        if (!tfoeResponse.ok || !tfoeResult.success) {
          console.error('[DocumentTranslationCheckout] TFOE submission failed:', tfoeResult);
          throw new Error(tfoeResult.error || 'Failed to submit documents to translation service');
        }

        console.log('[DocumentTranslationCheckout] TFOE submission successful:', tfoeResult);
      } catch (tfoeError: any) {
        console.error('[DocumentTranslationCheckout] TFOE error:', tfoeError);
        // Don't block payment flow if TFOE fails - log and continue
        // Admin can manually resubmit if needed
        console.warn('[DocumentTranslationCheckout] Continuing with payment despite TFOE error');
      }

      // Now handle payment based on method
      if (selectedPayment === 'zelle') {
        const zelleUrl = `/student/dashboard/zelle-payment?fee_type=translation&amount=${grandTotal}&translation_order_ids=${orderIds.join(',')}`;
        navigate(zelleUrl);
        return;
      }

      // Stripe checkout (card or pix)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Not authenticated');

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${SUPABASE_URL}/functions/v1/stripe-checkout-translation-fee`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: grandTotal,
          payment_method: selectedPayment === 'stripe_pix' ? 'pix' : 'stripe',
          success_url: `${window.location.origin}/student/dashboard/documents-and-scholarship-choice?translation_paid=true`,
          cancel_url: `${window.location.origin}/student/dashboard/document-translation`,
          metadata: {
            fee_type: 'translation_fee',
            translation_order_ids: orderIds.join(','),
            total_pages: Object.values(pageCounts).reduce((a, b) => a + b, 0),
            document_types: documents.map(d => d.type).join(','),
          },
        }),
      });

      const result = await response.json();

      if (result.session_url) {
        window.location.href = result.session_url;
      } else {
        throw new Error(result.error || 'Could not create checkout session');
      }
    } catch (err: any) {
      console.error('Translation order error:', err);
      setError(err.message || 'Failed to process. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkipToManualReview = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      await supabase
        .from('user_profiles')
        .update({
          documents_status: 'under_review',
        })
        .eq('user_id', user.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        await supabase.rpc('log_student_action', {
          p_student_id: profile.id,
          p_action_type: 'manual_review_opt_in',
          p_action_description: 'Student opted for manual review instead of translation',
          p_performed_by: user.id,
          p_performed_by_type: 'student',
          p_metadata: { documents: documents.map(d => d.type) }
        });
      }

      navigate('/student/dashboard/applications', { state: { showManualReviewMessage: true } });
    } catch (err) {
      console.error('Manual review opt-in error:', err);
      setError('Could not process your request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="translation-checkout-container">
      <button
        className="translation-back-btn"
        onClick={() => navigate('/student/dashboard/documents-and-scholarship-choice')}
      >
        <ChevronLeft /> {t('studentDashboard.documentTranslation.backToDocuments', 'Back to Documents')}
      </button>

      <div className="translation-header">
        <h1>{t('studentDashboard.documentTranslation.title', 'Translation Required')}</h1>
        <p>
          {t('studentDashboard.documentTranslation.subtitle', 'Some of your documents need to be translated to English. Order a certified translation below to continue your application.')}
        </p>
      </div>

      <div className="translation-card">
        <div className="translation-card-title">
          {t('studentDashboard.documentTranslation.documentsTitle', 'Documents to Translate')}
        </div>

        {documents.map((doc) => (
          <div key={doc.type}>
            <div className="translation-doc-row">
              <div className="translation-doc-info">
                <div>
                  <div className="translation-doc-label">{getDocLabel(doc.type)}</div>
                  <div className="translation-doc-language">
                    {doc.source_language || t('studentDashboard.documentTranslation.unknownLanguage', 'Non-English')} → English
                  </div>
                </div>
              </div>
              <span>EN</span>
            </div>

            <div className="translation-page-count">
              <label>
                {t('studentDashboard.documentTranslation.pageCount', 'Number of pages:')}
              </label>
              {isDetectingPages[doc.type] ? (
                <div className="translation-detecting">
                  <div className="translation-spinner mini" />
                  <span>{t('studentDashboard.documentTranslation.detecting', 'Detecting pages...')}</span>
                </div>
              ) : (
                <div className="translation-page-count-controls">
                  <button
                    className="translation-page-count-btn"
                    onClick={() => updatePageCount(doc.type, -1)}
                    disabled={(pageCounts[doc.type] || 1) <= 1}
                  >
                    <Minus style={{ width: 14, height: 14 }} />
                  </button>
                  <span className="translation-page-count-value">{pageCounts[doc.type] || 1}</span>
                  <button
                    className="translation-page-count-btn"
                    onClick={() => updatePageCount(doc.type, 1)}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
              <span className="translation-price-badge">
                ${getPricePerPage(doc.type)}/{t('studentDashboard.documentTranslation.perPage', 'page')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="translation-card translation-price-card">
        <div className="translation-card-title">
          {t('studentDashboard.documentTranslation.priceTitle', 'Price Summary')}
        </div>

        {documents.map((doc) => (
          <div className="translation-price-row" key={doc.type} style={{ borderBottom: 'none' }}>
            <span className="translation-price-label">
              {getDocLabel(doc.type)} ({pageCounts[doc.type] || 1} {(pageCounts[doc.type] || 1) === 1 ? 'page' : 'pages'})
            </span>
            <span className="translation-price-value">${getDocTotal(doc.type).toFixed(2)}</span>
          </div>
        ))}

        <div className="translation-price-total" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, paddingTop: 12 }}>
          <span className="translation-price-total-label">
            {t('studentDashboard.documentTranslation.subtotal', 'Subtotal')}
          </span>
          <span className="translation-price-total-value" style={{ fontSize: '1.4em' }}>${grandTotal.toFixed(2)}</span>
        </div>

        {selectedPayment && selectedPayment !== 'zelle' && (
          <div className="translation-price-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
            <span className="translation-price-label" style={{ opacity: 0.8, fontSize: '0.9em' }}>
              {t('studentDashboard.documentTranslation.processingFee', 'Processing Fee (Stripe)')}
            </span>
            <span className="translation-price-value" style={{ opacity: 0.8, fontSize: '0.9em' }}>+${stripeFee.toFixed(2)}</span>
          </div>
        )}

        <div className="translation-price-total" style={{ borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: 8, paddingTop: 12 }}>
          <span className="translation-price-total-label" style={{ fontSize: '1.2em', fontWeight: 700 }}>
            {t('studentDashboard.documentTranslation.total', 'Total')}
          </span>
          <span className="translation-price-total-value" style={{ fontSize: '1.8em', fontWeight: 800, color: '#10b981' }}>
            ${finalTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="translation-card">
        <div className="translation-card-title">
          {t('studentDashboard.documentTranslation.paymentTitle', 'Payment Method')}
        </div>

        <div className="translation-payment-methods">
          <div
            className={`translation-payment-option ${selectedPayment === 'stripe_card' ? 'selected' : ''}`}
            onClick={() => setSelectedPayment('stripe_card')}
          >
            <span className="translation-payment-option-label">
              {t('studentDashboard.documentTranslation.payCard', 'Credit Card')}
            </span>
            <span className="translation-payment-option-desc">Visa, Mastercard, Amex</span>
          </div>

          <div
            className={`translation-payment-option ${selectedPayment === 'stripe_pix' ? 'selected' : ''}`}
            onClick={() => setSelectedPayment('stripe_pix')}
          >
            <span className="translation-payment-option-label">PIX</span>
            <span className="translation-payment-option-desc">
              {t('studentDashboard.documentTranslation.payPixDesc', 'Brazilian instant transfer')}
            </span>
          </div>

          <div
            className={`translation-payment-option ${selectedPayment === 'zelle' ? 'selected' : ''}`}
            onClick={() => setSelectedPayment('zelle')}
          >
            <span className="translation-payment-option-label">Zelle</span>
            <span className="translation-payment-option-desc">
              {t('studentDashboard.documentTranslation.payZelleDesc', 'US bank transfer')}
            </span>
          </div>
        </div>

        {selectedPayment === 'zelle' && (
          <div className="translation-zelle-info">
            <h4>{t('studentDashboard.documentTranslation.zelleNote', 'Zelle Payment Instructions')}</h4>
            <p>
              {t('studentDashboard.documentTranslation.zelleNoteDesc', 'After clicking "Order Translation", you will be redirected to our Zelle payment page where you can upload your payment receipt.')}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="translation-error-banner">
          {error}
        </div>
      )}

      <button
        className="translation-cta-btn"
        disabled={!selectedPayment || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? (
          <>
            <div className="translation-spinner" />
            {t('studentDashboard.documentTranslation.processing', 'Processing...')}
          </>
        ) : (
          <>
            {t('studentDashboard.documentTranslation.orderBtn', 'Order Translation')} — ${finalTotal.toFixed(2)}
          </>
        )}
      </button>

      <div className="translation-info-note">
        <p>
          {t('studentDashboard.documentTranslation.infoNote', 'Your certified translation will be delivered digitally and automatically attached to your application. All translations are submitted as "certificado" type. Processing time: 3-5 business days.')}
        </p>
      </div>

      <div className="translation-manual-review-section">
        {!showManualReviewWarning ? (
          <button 
            className="translation-skip-btn"
            onClick={() => setShowManualReviewWarning(true)}
          >
            {t('studentDashboard.documentTranslation.skipToManual', 'Skip translation and send for manual review')}
          </button>
        ) : (
          <div className="translation-manual-warning-card">
            <div className="translation-warning-header">
              <span>{t('studentDashboard.documentTranslation.warningTitle', 'Submission Warning')}</span>
            </div>
            <p>
              {t('studentDashboard.documentTranslation.warningDesc', 'If you proceed, your current documents (not in English) will be sent as-is for administration review. Note: Documents not in English are almost always rejected, which will delay your application process significantly.')}
            </p>
            <div className="translation-warning-actions">
              <button 
                className="translation-warning-cancel"
                onClick={() => setShowManualReviewWarning(false)}
              >
                {t('common.cancel', 'Go Back to Translation')}
              </button>
              <button 
                className="translation-warning-confirm"
                onClick={handleSkipToManualReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.processing', 'Processing...') : (
                  <>
                    {t('studentDashboard.documentTranslation.confirmManual', 'Submit Original Documents for Review')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTranslationCheckout;
