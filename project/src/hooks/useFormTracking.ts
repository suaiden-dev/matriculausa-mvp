/**
 * useFormTracking
 *
 * Hook para rastreamento anônimo de progresso em formulários via GA4.
 * Envia apenas o nome do campo e do formulário — nenhum valor pessoal.
 *
 * Eventos disparados:
 *  - form_field_filled  : usuário preencheu e saiu de um campo (onBlur)
 *  - form_step_reached  : usuário avançou para uma nova etapa
 *  - form_submitted     : formulário foi enviado com sucesso
 *  - form_abandoned     : usuário saiu da página sem completar (beforeunload)
 */

const isGtagAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.gtag === 'function';

const sendEvent = (eventName: string, params: Record<string, string | number>) => {
  if (!isGtagAvailable()) return;
  window.gtag('event', eventName, params);
};

interface UseFormTrackingOptions {
  /** Nome identificador do formulário. Ex: 'auth_register', 'quick_registration' */
  formName: string;
}

interface UseFormTrackingReturn {
  /** Chame no onBlur de cada campo para registrar que foi preenchido */
  trackFieldFilled: (fieldName: string) => void;
  /** Chame ao avançar de etapa no formulário multi-step */
  trackStepReached: (step: number, stepName?: string) => void;
  /** Chame ao submeter/concluir o formulário com sucesso */
  trackFormSubmitted: () => void;
}

export const useFormTracking = ({ formName }: UseFormTrackingOptions): UseFormTrackingReturn => {

  const trackFieldFilled = (fieldName: string) => {
    sendEvent('form_field_filled', {
      form_name: formName,
      field_name: fieldName,
    });
  };

  const trackStepReached = (step: number, stepName = '') => {
    sendEvent('form_step_reached', {
      form_name: formName,
      step_number: step,
      step_name: stepName,
    });
  };

  const trackFormSubmitted = () => {
    sendEvent('form_submitted', {
      form_name: formName,
    });
  };

  return {
    trackFieldFilled,
    trackStepReached,
    trackFormSubmitted,
  };
};
