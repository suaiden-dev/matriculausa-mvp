/**
 * Cache Invalidation Utilities
 * 
 * Centraliza eventos de invalidação de cache para Student Dashboard
 */

import { QueryClient } from '@tanstack/react-query';
import { 
  invalidateStudentDashboardProfile,
  invalidateStudentDashboardApplications,
  invalidateStudentDashboardDocuments,
  invalidateStudentDashboardFees,
  invalidateStudentDashboardCoupons,
  invalidateStudentDashboardAll
} from '../lib/queryKeys';
import { requestCache } from '../lib/requestCache';

/**
 * Eventos de invalidação de cache
 */
export enum CacheInvalidationEvent {
  // Profile events
  PROFILE_UPDATED = 'profile_updated',
  
  // Payment events
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  
  // Document events
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_STATUS_CHANGED = 'document_status_changed',
  
  // Application events
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  
  // Fee events
  FEE_OVERRIDE_UPDATED = 'fee_override_updated',
  COUPON_APPLIED = 'coupon_applied',
  COUPON_REMOVED = 'coupon_removed',
  
  // Identity photo events
  IDENTITY_PHOTO_UPLOADED = 'identity_photo_uploaded',
  IDENTITY_PHOTO_STATUS_CHANGED = 'identity_photo_status_changed',
  
  // Scholarship events
  SCHOLARSHIP_UPDATED = 'scholarship_updated',
}

/**
 * Dispatcher de eventos de invalidação
 */
export class CacheInvalidationDispatcher {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Invalida cache baseado no tipo de evento
   */
  invalidate(event: CacheInvalidationEvent): void {
    console.log(`[CacheInvalidation] Evento: ${event}`);

    switch (event) {
      case CacheInvalidationEvent.PROFILE_UPDATED:
        this.invalidateProfile();
        break;

      case CacheInvalidationEvent.PAYMENT_COMPLETED:
        this.invalidatePayment();
        break;

      case CacheInvalidationEvent.PAYMENT_FAILED:
        // Não precisa invalidar tanto quanto sucesso
        invalidateStudentDashboardFees(this.queryClient);
        break;

      case CacheInvalidationEvent.DOCUMENT_UPLOADED:
      case CacheInvalidationEvent.DOCUMENT_STATUS_CHANGED:
        this.invalidateDocuments();
        break;

      case CacheInvalidationEvent.APPLICATION_SUBMITTED:
      case CacheInvalidationEvent.APPLICATION_STATUS_CHANGED:
        this.invalidateApplications();
        break;

      case CacheInvalidationEvent.FEE_OVERRIDE_UPDATED:
        invalidateStudentDashboardFees(this.queryClient);
        requestCache.invalidateAll('student_fees_config');
        requestCache.invalidateAll('user_fee_overrides');
        break;

      case CacheInvalidationEvent.COUPON_APPLIED:
      case CacheInvalidationEvent.COUPON_REMOVED:
        this.invalidateCoupons();
        break;

      case CacheInvalidationEvent.IDENTITY_PHOTO_UPLOADED:
      case CacheInvalidationEvent.IDENTITY_PHOTO_STATUS_CHANGED:
        requestCache.invalidateAll('identity_photo_status');
        this.queryClient.invalidateQueries({ queryKey: ['student-dashboard', 'identity-photo'] });
        break;

      case CacheInvalidationEvent.SCHOLARSHIP_UPDATED:
        requestCache.invalidateAll('scholarships_list');
        this.queryClient.invalidateQueries({ queryKey: ['student-dashboard', 'scholarships'] });
        break;

      default:
        console.warn(`[CacheInvalidation] Evento desconhecido: ${event}`);
    }
  }

  /**
   * Invalida cache de perfil
   */
  private invalidateProfile(): void {
    invalidateStudentDashboardProfile(this.queryClient);
    requestCache.invalidateAll('user_profiles');
  }

  /**
   * Invalida cache de pagamento (afeta múltiplas áreas)
   */
  private invalidatePayment(): void {
    // Profile (atualiza flags de pagamento)
    this.invalidateProfile();
    
    // Fees (valores pagos)
    invalidateStudentDashboardFees(this.queryClient);
    requestCache.invalidateAll('student_fees_config');
    requestCache.invalidateAll('student_paid_amounts');
    
    // Applications (atualiza application fee flags)
    this.invalidateApplications();
    
    // Coupons (pode ter sido usado)
    this.invalidateCoupons();
  }

  /**
   * Invalida cache de documentos
   */
  private invalidateDocuments(): void {
    invalidateStudentDashboardDocuments(this.queryClient);
    requestCache.invalidateAll('student_documents');
  }

  /**
   * Invalida cache de aplicações
   */
  private invalidateApplications(): void {
    invalidateStudentDashboardApplications(this.queryClient);
    requestCache.invalidateAll('scholarship_applications');
  }

  /**
   * Invalida cache de cupons
   */
  private invalidateCoupons(): void {
    invalidateStudentDashboardCoupons(this.queryClient);
    requestCache.invalidateAll('promotional_coupon_usage');
  }

  /**
   * Invalida todo o cache (uso emergencial)
   */
  invalidateAll(): void {
    console.log('[CacheInvalidation] Invalidando TODO o cache');
    invalidateStudentDashboardAll(this.queryClient);
    requestCache.clear();
  }
}

/**
 * Helper para criar dispatcher em componentes
 */
export function createCacheInvalidationDispatcher(queryClient: QueryClient): CacheInvalidationDispatcher {
  return new CacheInvalidationDispatcher(queryClient);
}

/**
 * Dispatch de evento customizado para componentes que não têm acesso ao queryClient
 * (ex: success pages que podem estar fora do dashboard)
 */
export function dispatchCacheInvalidationEvent(event: CacheInvalidationEvent): void {
  console.log(`[CacheInvalidation] Dispatching browser event: ${event}`);
  
  window.dispatchEvent(new CustomEvent('cache-invalidation', {
    detail: { event }
  }));
}

/**
 * Hook de listener para eventos de invalidação de cache
 * Deve ser usado em componentes root do dashboard
 */
export function setupCacheInvalidationListener(queryClient: QueryClient): () => void {
  const dispatcher = new CacheInvalidationDispatcher(queryClient);

  const handleInvalidation = (e: CustomEvent) => {
    const { event } = e.detail;
    if (event) {
      dispatcher.invalidate(event);
    }
  };

  window.addEventListener('cache-invalidation', handleInvalidation as EventListener);

  return () => {
    window.removeEventListener('cache-invalidation', handleInvalidation as EventListener);
  };
}
