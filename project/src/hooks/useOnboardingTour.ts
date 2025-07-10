import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../stores/applicationStore';
import { useAuth } from './useAuth';

export const useOnboardingTour = () => {
  const { cart } = useCartStore();
  
  // Usar try-catch para evitar erro quando useAuth não está disponível
  let userProfile = null;
  try {
    const auth = useAuth();
    userProfile = auth.userProfile;
  } catch (error) {
    // useAuth não está disponível ainda, isso é normal durante a inicialização
    console.log('useAuth not available yet, continuing without user profile');
  }
  
  const [runTour, setRunTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Verificar se o tour deve ser executado
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldRunTour = params.get('tour') === 'start' || 
                         localStorage.getItem('onboardingTourCompleted') !== 'true';
    
    if (shouldRunTour) {
      setRunTour(true);
    }
  }, []);

  // Função para pausar o tour
  const pauseTour = useCallback(() => {
    setRunTour(false);
  }, []);

  // Função para retomar o tour
  const resumeTour = useCallback(() => {
    setRunTour(true);
  }, []);

  // Função para finalizar o tour
  const finishTour = useCallback(() => {
    setRunTour(false);
    localStorage.setItem('onboardingTourCompleted', 'true');
  }, []);

  // Função para reiniciar o tour
  const restartTour = useCallback(() => {
    localStorage.removeItem('onboardingTourCompleted');
    setRunTour(true);
    setCurrentStep(0);
  }, []);

  // Função para determinar o próximo passo baseado no estado atual
  const getNextStep = useCallback(() => {
    // Se não há bolsas selecionadas, ir para seleção de bolsas
    if (cart.length === 0) {
      return 1; // Step de seleção de bolsas
    }

    // Se há bolsas mas documentos não foram aprovados, ir para upload
    if (cart.length > 0 && userProfile?.documents_status !== 'approved') {
      return 5; // Step de upload de documentos
    }

    // Se documentos foram aprovados, ir para pagamento
    if (userProfile?.documents_status === 'approved') {
      return 7; // Step de pagamento
    }

    return currentStep + 1;
  }, [cart.length, userProfile?.documents_status, currentStep]);

  // Função para verificar se um elemento está visível
  const isElementVisible = useCallback((selector: string): boolean => {
    const element = document.querySelector(selector);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && 
                     rect.left >= 0 && 
                     rect.bottom <= window.innerHeight && 
                     rect.right <= window.innerWidth;
    
    return isVisible;
  }, []);

  // Função para aguardar um elemento ficar visível
  const waitForElement = useCallback((selector: string, timeout = 5000): Promise<Element | null> => {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout para evitar espera infinita
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }, []);

  // Função para scroll para um elemento
  const scrollToElement = useCallback((selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  return {
    runTour,
    currentStep,
    setRunTour,
    setCurrentStep,
    pauseTour,
    resumeTour,
    finishTour,
    restartTour,
    getNextStep,
    isElementVisible,
    waitForElement,
    scrollToElement,
    cartLength: cart.length,
    documentsStatus: userProfile?.documents_status
  };
}; 